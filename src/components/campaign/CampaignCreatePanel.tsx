"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { ArrowLeft, Check, Eye, EyeOff, Save, Users } from "lucide-react";
import { api, type CampaignChannel, type CampaignTemplate } from "@/lib/api";
import {
  applyCampaignTemplate,
  buildCampaignPayload,
  emptyCampaignForm,
  type CampaignFormState,
} from "@/lib/campaign-form";
import { buildCriteriaFromForm } from "@/lib/campaign-filter-summary";
import { CampaignAudiencePreview } from "@/components/campaign/CampaignAudiencePreview";
import { CampaignCriteriaSummary } from "@/components/campaign/CampaignCriteriaSummary";
import { CampaignFormFields } from "@/components/campaign/CampaignFormFields";
import { CampaignTemplateLibraryPanel } from "@/components/campaign/CampaignTemplateLibraryPanel";
import { CampaignWhatsAppMessagePreview, CampaignWhatsAppStatusStrip } from "@/components/campaign/CampaignWhatsAppSection";
import { btnPrimary, btnSecondary, inputClass, PageLoader, selectClass } from "@/components/ui";
import { DashboardWidgetCard } from "@/components/enterprise-ui";
import { cn } from "@/lib/utils";

const CREATE_STEPS = ["category", "template", "message", "audience", "review"] as const;
type CreateStep = (typeof CREATE_STEPS)[number];

const AUTO_ADVANCE_STEPS: CreateStep[] = ["category", "template"];

async function loadCampaignFilterOptions() {
  const names = new Set<string>();
  const societies = new Set<string>();
  const phones = new Set<string>();
  let page = 0;
  let totalPages = 1;

  while (page < totalPages && page < 30) {
    const res = await api.listCustomers({ page, size: 100 });
    totalPages = res.totalPages;
    for (const c of res.content) {
      if (c.name?.trim()) names.add(c.name.trim());
      if (c.society?.trim()) societies.add(c.society.trim());
      if (c.phone?.trim()) phones.add(c.phone.trim());
    }
    page += 1;
  }

  const sortLabels = (values: Set<string>) =>
    [...values]
      .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }))
      .map((value) => ({ value, label: value }));

  return {
    names: sortLabels(names),
    societies: sortLabels(societies),
    phones: sortLabels(phones),
  };
}

function CampaignWizardProgress({
  steps,
  currentIndex,
  onStepClick,
}: {
  steps: { id: CreateStep; label: string }[];
  currentIndex: number;
  onStepClick: (step: CreateStep) => void;
}) {
  const t = useTranslations("admin.campaigns");

  return (
    <div className="campaign-wizard-progress">
      <p className="campaign-wizard-progress-label">
        {t("stepProgress", { current: currentIndex + 1, total: steps.length })}
      </p>
      <div
        className="campaign-wizard-progress-track campaign-wizard-progress-track--5"
        role="list"
        aria-label={t("createCampaignTitle")}
      >
        {steps.map((step, index) => {
          const done = index < currentIndex;
          const active = index === currentIndex;
          const upcoming = index > currentIndex;
          return (
            <button
              key={step.id}
              type="button"
              role="listitem"
              disabled={upcoming}
              onClick={() => !upcoming && onStepClick(step.id)}
              className={cn(
                "campaign-wizard-progress-step",
                done && "campaign-wizard-progress-step--done",
                active && "campaign-wizard-progress-step--active",
                upcoming && "campaign-wizard-progress-step--upcoming",
              )}
              aria-current={active ? "step" : undefined}
            >
              <span className="campaign-wizard-progress-dot">
                {done ? <Check className="w-3 h-3" /> : index + 1}
              </span>
              <span className="campaign-wizard-progress-name">{step.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function CampaignCreatePanel({
  onBack,
  onCreated,
  embedded = false,
  onStepMetaChange,
  onRegisterSheetBack,
  messagingReady = false,
}: {
  onBack: () => void;
  onCreated: (campaignId: string) => void;
  embedded?: boolean;
  onStepMetaChange?: (meta: { step: CreateStep; subtitle: string }) => void;
  onRegisterSheetBack?: (handler: () => void) => void;
  messagingReady?: boolean;
}) {
  const t = useTranslations("admin.campaigns");
  const queryClient = useQueryClient();
  const [step, setStep] = useState<CreateStep>("category");
  const [activeCategory, setActiveCategory] = useState("");
  const [form, setForm] = useState<CampaignFormState>(emptyCampaignForm);
  const [debouncedPayload, setDebouncedPayload] = useState(() => buildCampaignPayload(emptyCampaignForm));
  const [showPreviewList, setShowPreviewList] = useState(false);
  const [showMessagePreview, setShowMessagePreview] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedPayload(buildCampaignPayload(form)), 400);
    return () => clearTimeout(timer);
  }, [form]);

  const { data: templateLibrary, isLoading: templatesLoading } = useQuery({
    queryKey: ["campaign-template-library"],
    queryFn: () => api.getCampaignTemplateLibrary(),
    staleTime: 10 * 60_000,
  });

  useEffect(() => {
    if (templateLibrary?.categories[0] && !activeCategory) {
      setActiveCategory(templateLibrary.categories[0].code);
    }
  }, [templateLibrary, activeCategory]);

  const { data: filterOptions, isLoading: filtersLoading } = useQuery({
    queryKey: ["campaign-filter-options"],
    queryFn: loadCampaignFilterOptions,
    staleTime: 5 * 60_000,
  });

  const { data: branches } = useQuery({
    queryKey: ["branches"],
    queryFn: () => api.getBranches(),
  });

  const { data: catalogServices } = useQuery({
    queryKey: ["catalog-services-campaign"],
    queryFn: () => api.getCatalogServices(),
  });

  const { data: catalogCategories } = useQuery({
    queryKey: ["catalog-categories-campaign"],
    queryFn: () => api.getCategories(),
  });

  const branchOptions = useMemo(
    () => (branches ?? []).map((b) => ({ value: b.id, label: b.name })),
    [branches],
  );

  const serviceOptions = useMemo(
    () =>
      (catalogServices ?? [])
        .filter((s) => s.active)
        .map((s) => ({ value: s.id, label: s.name }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [catalogServices],
  );

  const categoryOptions = useMemo(
    () =>
      (catalogCategories ?? [])
        .filter((c) => c.active)
        .map((c) => ({ value: c.id, label: c.name }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [catalogCategories],
  );

  const serviceLabelMap = useMemo(
    () => Object.fromEntries(serviceOptions.map((o) => [o.value, o.label])),
    [serviceOptions],
  );
  const categoryLabelMap = useMemo(
    () => Object.fromEntries(categoryOptions.map((o) => [o.value, o.label])),
    [categoryOptions],
  );

  const selectedGrowthTemplate = useMemo(() => {
    if (!form.templateId || !templateLibrary) return undefined;
    return templateLibrary.categories.flatMap((c) => c.templates).find((tpl) => tpl.id === form.templateId);
  }, [form.templateId, templateLibrary]);

  const criteriaItems = useMemo(
    () =>
      buildCriteriaFromForm(form, {
        branchLabel: branchOptions.find((b) => b.value === form.filterBranchId)?.label,
        serviceLabels: serviceLabelMap,
        categoryLabels: categoryLabelMap,
      }),
    [form, branchOptions, serviceLabelMap, categoryLabelMap],
  );

  const canPreview = !!debouncedPayload.name && !!debouncedPayload.messageText;

  const { data: preview, isFetching: previewLoading } = useQuery({
    queryKey: ["campaign-create-preview", debouncedPayload],
    queryFn: () => api.previewCampaign(debouncedPayload),
    enabled: canPreview,
  });

  const create = useMutation({
    mutationFn: () => api.createCampaign(buildCampaignPayload(form)),
    onSuccess: async (campaign) => {
      await queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      setError("");
      onCreated(campaign.id);
    },
    onError: (e: Error) => setError(e.message),
  });

  const stepIndex = CREATE_STEPS.indexOf(step);
  const isFirstStep = stepIndex === 0;
  const isLastStep = stepIndex === CREATE_STEPS.length - 1;
  const isAutoAdvanceStep = AUTO_ADVANCE_STEPS.includes(step);

  const stepLabels = useMemo(
    () => [
      { id: "category" as const, label: t("stepCategory") },
      { id: "template" as const, label: t("stepTemplate") },
      { id: "message" as const, label: t("stepMessage") },
      { id: "audience" as const, label: t("stepAudience") },
      { id: "review" as const, label: t("stepReview") },
    ],
    [t],
  );

  const stepDescriptions: Record<CreateStep, string> = useMemo(
    () => ({
      category: t("stepCategoryDesc"),
      template: t("stepTemplateDesc"),
      message: t("stepMessageDesc"),
      audience: t("stepAudienceDesc"),
      review: t("stepReviewDesc"),
    }),
    [t],
  );

  function updateField<K extends keyof CampaignFormState>(key: K, value: CampaignFormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleCategorySelect(code: string) {
    setActiveCategory(code);
    setStep("template");
  }

  function handleTemplateSelect(template: CampaignTemplate) {
    setForm(applyCampaignTemplate(template));
    setActiveCategory(template.category);
    setError("");
    setStep("message");
  }

  function handleStartBlank() {
    setForm(emptyCampaignForm);
    setStep("message");
  }

  const messageStepValid = !!form.name.trim() && !!form.messageText.trim();
  const fromTemplate = !!form.templateId;

  function canGoToStep(target: CreateStep): boolean {
    const targetIndex = CREATE_STEPS.indexOf(target);
    if (targetIndex <= stepIndex) return true;
    if (target === "template") return stepIndex >= 0;
    if (target === "message") return true;
    if (target === "audience") return messageStepValid;
    if (target === "review") return messageStepValid;
    return false;
  }

  function goToStep(target: CreateStep) {
    if (canGoToStep(target)) setStep(target);
  }

  function goNext() {
    if (!isLastStep) setStep(CREATE_STEPS[stepIndex + 1]);
  }

  function goPrev() {
    if (isFirstStep) onBack();
    else setStep(CREATE_STEPS[stepIndex - 1]);
  }

  const canSave = messageStepValid && !create.isPending;
  const matchCount = preview?.matchingCustomers ?? 0;

  useEffect(() => {
    setShowMessagePreview(false);
  }, [step]);

  useEffect(() => {
    onStepMetaChange?.({ step, subtitle: stepDescriptions[step] });
  }, [step, onStepMetaChange, stepDescriptions]);

  useEffect(() => {
    onRegisterSheetBack?.(() => {
      if (stepIndex === 0) onBack();
      else setStep(CREATE_STEPS[stepIndex - 1]);
    });
  }, [onRegisterSheetBack, stepIndex, onBack]);

  const showStepHint = !embedded || (step !== "message" && step !== "audience");

  const stepContent = (
    <>
      <CampaignWizardProgress steps={stepLabels} currentIndex={stepIndex} onStepClick={goToStep} />
      {showStepHint ? <p className="text-sm text-[var(--text-secondary)]">{stepDescriptions[step]}</p> : null}

      <div className="campaign-create-step-panel">
        {step === "category" &&
          (templatesLoading ? (
            <PageLoader label={t("loadingTemplates")} />
          ) : templateLibrary ? (
            <CampaignTemplateLibraryPanel
              library={templateLibrary}
              step="category"
              activeCategory={activeCategory}
              onCategorySelect={handleCategorySelect}
              onTemplateSelect={handleTemplateSelect}
              onStartBlank={handleStartBlank}
            />
          ) : null)}

        {step === "template" &&
          (templatesLoading || !templateLibrary ? (
            <PageLoader label={t("loadingTemplates")} />
          ) : (
            <CampaignTemplateLibraryPanel
              library={templateLibrary}
              step="template"
              activeCategory={activeCategory}
              selectedTemplateId={form.templateId}
              onCategorySelect={handleCategorySelect}
              onTemplateSelect={handleTemplateSelect}
            />
          ))}

        {step === "message" && (
          <div className="campaign-message-step space-y-3">
            <input
              placeholder={t("campaignName")}
              value={form.name}
              onChange={(e) => updateField("name", e.target.value)}
              className={inputClass}
            />
            <textarea
              placeholder={form.channel === "WHATSAPP" ? t("messageWhatsapp") : t("messageSms")}
              value={form.messageText}
              onChange={(e) => updateField("messageText", e.target.value)}
              className={`${inputClass} campaign-message-textarea`}
              rows={3}
            />
            {fromTemplate ? (
              <p className="text-xs font-semibold text-[var(--text-secondary)]">{t("whatsapp")}</p>
            ) : (
              <select
                value={form.channel}
                onChange={(e) => updateField("channel", e.target.value as CampaignChannel)}
                className={selectClass}
              >
                <option value="WHATSAPP">{t("whatsapp")}</option>
                <option value="SMS">{t("sms")}</option>
              </select>
            )}
            {form.channel === "WHATSAPP" ? (
              <CampaignWhatsAppStatusStrip messagingReady={messagingReady} />
            ) : null}
          </div>
        )}

        {step === "audience" &&
          (fromTemplate ? (
            <CampaignCriteriaSummary
              templateName={selectedGrowthTemplate?.name ?? form.name}
              templateGoal={selectedGrowthTemplate?.goal}
              criteria={criteriaItems}
            />
          ) : (
            <CampaignFormFields
              form={form}
              onChange={updateField}
              filterOptions={filterOptions}
              filtersLoading={filtersLoading}
              branchOptions={branchOptions}
              serviceOptions={serviceOptions}
              categoryOptions={categoryOptions}
              collapsible
            />
          ))}

        {step === "review" && (
          <div className="space-y-3">
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)]/50 p-3 space-y-2 text-sm">
              <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-tertiary)]">{t("reviewSummary")}</p>
              <div>
                <p className="text-[10px] uppercase tracking-wide text-[var(--text-tertiary)]">{t("campaignName")}</p>
                <p className="font-semibold text-[var(--text-primary)]">{form.name || "—"}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wide text-[var(--text-tertiary)]">{t("messagePreview")}</p>
                <p className="text-[var(--text-secondary)] whitespace-pre-wrap text-xs line-clamp-3">{form.messageText || "—"}</p>
              </div>
              {fromTemplate ? (
                <CampaignCriteriaSummary
                  templateName={selectedGrowthTemplate?.name}
                  templateGoal={selectedGrowthTemplate?.goal}
                  criteria={criteriaItems}
                />
              ) : null}
            </div>

            {canPreview && (
              <div className="campaign-create-cohort-chip w-fit">
                <Users className="w-3.5 h-3.5 shrink-0" />
                {previewLoading ? t("counting") : t("customersMatch", { count: matchCount })}
              </div>
            )}

            {canPreview && matchCount > 0 && preview && (
              <div className="campaign-detail-collapsible">
                <button
                  type="button"
                  className="campaign-detail-collapsible-trigger"
                  onClick={() => setShowPreviewList((v) => !v)}
                >
                  {showPreviewList ? t("hideAudiencePreview") : t("showAudiencePreview")}
                </button>
                {showPreviewList ? (
                  <div className="campaign-detail-collapsible-body">
                    <CampaignAudiencePreview
                      customers={preview.customers}
                      totalCount={preview.matchingCustomers}
                      truncated={preview.previewTruncated}
                      channel={form.channel}
                      variant="plain"
                    />
                  </div>
                ) : null}
              </div>
            )}

            <p className="text-xs text-[var(--text-tertiary)]">{t("saveWithoutAudienceHint")}</p>
          </div>
        )}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
    </>
  );

  const showPreviewToggle = step === "message" && form.channel === "WHATSAPP";
  const showPreviewDock = showPreviewToggle && showMessagePreview && !!form.messageText.trim();

  const footer = (
    <div
      className={cn(
        "campaign-create-footer",
        embedded && "campaign-create-footer--embedded",
        showPreviewToggle && "campaign-create-footer--actions",
      )}
    >
      <button type="button" onClick={goPrev} className={btnSecondary}>
        {isFirstStep ? (
          <>
            <ArrowLeft className="w-4 h-4" />
            {embedded ? t("backToCampaigns") : t("prevStep")}
          </>
        ) : (
          t("prevStep")
        )}
      </button>

      {showPreviewToggle ? (
        <button
          type="button"
          onClick={() => setShowMessagePreview((v) => !v)}
          className={cn(btnSecondary, "campaign-create-preview-btn")}
          disabled={!form.messageText.trim()}
        >
          {showMessagePreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          {showMessagePreview ? t("hideMessagePreview") : t("previewMessage")}
        </button>
      ) : null}

      {!isAutoAdvanceStep ? (
        <div className="campaign-create-footer-primary">
          {canPreview && step === "audience" ? (
            <span className="campaign-create-cohort-chip hidden sm:inline-flex">
              <Users className="w-3.5 h-3.5 shrink-0" />
              {previewLoading ? "…" : t("customersMatch", { count: matchCount })}
            </span>
          ) : null}

          {isLastStep ? (
            <button type="button" disabled={!canSave} onClick={() => create.mutate()} className={btnPrimary}>
              <Save className="w-4 h-4" />
              {create.isPending ? t("saving") : t("saveCampaign")}
            </button>
          ) : (
            <button
              type="button"
              onClick={goNext}
              disabled={step === "message" && !messageStepValid}
              className={btnPrimary}
            >
              {t("nextStep")}
            </button>
          )}
        </div>
      ) : (
        <p className="flex-1 text-xs text-[var(--text-tertiary)] text-right">{t("autoAdvanceHint")}</p>
      )}
    </div>
  );

  const stickyFoot = (
    <div className="campaign-create-sticky-foot">
      {showPreviewDock ? (
        <div className="campaign-preview-dock">
          <CampaignWhatsAppMessagePreview offerText={form.messageText} active />
        </div>
      ) : null}
      {footer}
    </div>
  );

  if (embedded) {
    return (
      <div className="campaign-create-shell campaign-create-shell--embedded">
        <div className="campaign-create-scroll">{stepContent}</div>
        {stickyFoot}
      </div>
    );
  }

  return (
    <div className="campaign-create-shell">
      <button type="button" onClick={onBack} className={`${btnSecondary} w-fit`}>
        <ArrowLeft className="w-4 h-4" />
        {t("backToCampaigns")}
      </button>

      <DashboardWidgetCard>
        <div className="p-4 sm:p-5 space-y-4 min-w-0">
          <div>
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">{t("createCampaignTitle")}</h2>
          </div>
          {stepContent}
        </div>
      </DashboardWidgetCard>

      {stickyFoot}
    </div>
  );
}
