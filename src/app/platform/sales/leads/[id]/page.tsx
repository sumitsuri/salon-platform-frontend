"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { salesApi, ActivityType, LeadStage } from "@/modules/sales/api/salesApi";
import { PipelineStepper } from "@/modules/sales/components/PipelineStepper";
import { StageActionPanel } from "@/modules/sales/components/StageActionPanel";
import { LeadPricingSection } from "@/modules/sales/components/LeadPricingSection";
import { UseCaseMultiSelect } from "@/modules/sales/components/UseCaseMultiSelect";
import { ACTIVITY_SUGGESTIONS, STAGE_LABELS, isTerminalStage } from "@/modules/sales/lib/stage-utils";
import {
  parseUseCases,
  formatUseCases,
  mergeNotesWithCustomUseCases,
  extractCustomUseCasesFromNotes,
  stripCustomUseCasesFromNotes,
  PREDEFINED_USE_CASES,
} from "@/modules/sales/lib/use-cases";
import { formatFinalPaidPrice, monthlyRevenueFromFields, pricingFieldsFromLead } from "@/modules/sales/lib/pricing";
import {
  PageHeader,
  Card,
  AlertBanner,
  DetailField,
  SideSheet,
  inputClass,
  selectClass,
  btnPrimary,
  btnSecondary,
  StatusBadge,
} from "@/components/ui";
import { useAuthStore } from "@/lib/auth-store";
import { useSetPageBreadcrumbs } from "@/lib/breadcrumb-context";
import {
  invalidateSalesLeadLists,
  salesQueryKeys,
} from "@/modules/sales/lib/query-keys";

export default function SalesLeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const isAdmin = useAuthStore((s) => s.user?.role === "PLATFORM_SUPER_ADMIN");
  const [error, setError] = useState("");
  const [activityType, setActivityType] = useState<ActivityType>("VISIT");
  const [activityNotes, setActivityNotes] = useState("");
  const [convertOpen, setConvertOpen] = useState(false);
  const [convertForm, setConvertForm] = useState({
    tenantSlug: "",
    adminName: "",
    adminEmail: "",
    adminPassword: "",
    planTier: "Growth",
    projectedMrr: 4999,
  });
  const [editingUseCases, setEditingUseCases] = useState(false);
  const [selectedUseCases, setSelectedUseCases] = useState<string[]>([]);
  const [customUseCases, setCustomUseCases] = useState("");
  const [leadNotes, setLeadNotes] = useState("");

  const { data: lead, isLoading } = useQuery({
    queryKey: salesQueryKeys.lead(id),
    queryFn: () => salesApi.getLead(id),
  });

  const { data: activities = [] } = useQuery({
    queryKey: ["sales-activities", id],
    queryFn: () => salesApi.listActivities(id),
    enabled: !!id,
  });

  const breadcrumbs = useMemo(
    () =>
      lead
        ? [
            { label: "My Pipeline", href: "/platform/sales" },
            { label: lead.businessName },
          ]
        : null,
    [lead?.id, lead?.businessName]
  );
  useSetPageBreadcrumbs(breadcrumbs);

  useEffect(() => {
    if (lead?.stage && ACTIVITY_SUGGESTIONS[lead.stage]) {
      setActivityType(ACTIVITY_SUGGESTIONS[lead.stage]!);
    }
  }, [lead?.stage]);

  useEffect(() => {
    if (lead) {
      setSelectedUseCases(parseUseCases(lead.useCase));
      setCustomUseCases(extractCustomUseCasesFromNotes(lead.notes));
      setLeadNotes(stripCustomUseCasesFromNotes(lead.notes));
    }
  }, [lead?.id, lead?.useCase, lead?.notes]);

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: [...salesQueryKeys.lead(id)] });
    queryClient.invalidateQueries({ queryKey: ["sales-activities", id] });
    await invalidateSalesLeadLists(queryClient);
    await queryClient.invalidateQueries({ queryKey: [...salesQueryKeys.pipelineAnalytics] });
    queryClient.invalidateQueries({ queryKey: ["sales-my-analytics"] });
  };

  const stageMutation = useMutation({
    mutationFn: ({
      stage,
      notes,
      lostReason,
    }: {
      stage: LeadStage;
      notes?: string;
      lostReason?: string;
    }) => salesApi.updateStage(id, stage, notes, lostReason),
    onSuccess: invalidate,
    onError: (e: Error) => setError(e.message),
  });

  const activityMutation = useMutation({
    mutationFn: () => salesApi.addActivity(id, activityType, activityNotes),
    onSuccess: () => {
      setActivityNotes("");
      invalidate();
    },
    onError: (e: Error) => setError(e.message),
  });

  const convertMutation = useMutation({
    mutationFn: () => salesApi.convertLead(id, convertForm),
    onSuccess: invalidate,
    onError: (e: Error) => setError(e.message),
  });

  const updateLeadMutation = useMutation({
    mutationFn: (payload: Parameters<typeof salesApi.updateLead>[1]) =>
      salesApi.updateLead(id, payload),
    onSuccess: () => {
      setEditingUseCases(false);
      invalidate();
    },
    onError: (e: Error) => setError(e.message),
  });

  const openConvert = () => {
    const fields = lead ? pricingFieldsFromLead(lead) : null;
    setConvertForm((f) => ({
      ...f,
      projectedMrr: fields ? monthlyRevenueFromFields(fields) || f.projectedMrr : f.projectedMrr,
    }));
    setConvertOpen(true);
  };

  const { data: useCaseOptions = PREDEFINED_USE_CASES as unknown as string[] } = useQuery({
    queryKey: ["sales-use-cases"],
    queryFn: () => salesApi.listUseCases(),
  });

  if (isLoading || !lead) {
    return <Card className="p-8 text-center text-sm">Loading lead…</Card>;
  }

  const canConvert =
    isAdmin &&
    lead.stage !== "WON" &&
    lead.stage !== "LOST" &&
    ["PITCHED", "INTERESTED", "FREE_TRIAL"].includes(lead.stage);

  return (
    <div className="space-y-4">
      <Link
        href="/platform/sales"
        className="inline-flex items-center gap-1 text-sm text-violet-600 hover:underline"
      >
        <ArrowLeft className="h-4 w-4" /> Back to my pipeline
      </Link>

      <PageHeader
        title={lead.businessName}
        subtitle={`${lead.contactName} · ${lead.phone}${lead.localityName ? ` · ${lead.localityName}` : ""}`}
        action={<StatusBadge status={lead.stage} />}
      />

      {error && <AlertBanner variant="error">{error}</AlertBanner>}

      <Card className="p-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
          Pipeline progress
        </p>
        <PipelineStepper current={lead.stage} />
      </Card>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="space-y-3 p-4 lg:col-span-2">
          <h3 className="font-semibold">Lead details</h3>
          <DetailField label="Type" value={lead.leadType.replace("_", " ")} />
          <DetailField label="Source" value={lead.source.replace("_", " ")} />
          <DetailField label="Locality" value={lead.localityName || "—"} />
          <LeadPricingSection lead={lead} updateLeadMutation={updateLeadMutation} />
          <div>
            <div className="mb-1 flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wide text-[var(--ink-muted)]">
                Use cases
              </p>
              {!isTerminalStage(lead.stage) && !editingUseCases && (
                <button
                  type="button"
                  className="text-xs text-violet-600 hover:underline"
                  onClick={() => setEditingUseCases(true)}
                >
                  Edit
                </button>
              )}
            </div>
            {editingUseCases ? (
              <div className="space-y-2">
                <UseCaseMultiSelect
                  options={useCaseOptions}
                  selected={selectedUseCases}
                  onChange={setSelectedUseCases}
                />
                <textarea
                  className={inputClass}
                  rows={2}
                  placeholder="Other use cases (not in list)"
                  value={customUseCases}
                  onChange={(e) => setCustomUseCases(e.target.value)}
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    className={btnPrimary}
                    disabled={updateLeadMutation.isPending}
                    onClick={() =>
                      updateLeadMutation.mutate({
                        useCase: formatUseCases(selectedUseCases),
                        notes: mergeNotesWithCustomUseCases(leadNotes, customUseCases),
                      })
                    }
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    className={btnSecondary}
                    onClick={() => {
                      setEditingUseCases(false);
                      setSelectedUseCases(parseUseCases(lead.useCase));
                      setCustomUseCases(extractCustomUseCasesFromNotes(lead.notes));
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-sm">
                {lead.useCase || "—"}
                {extractCustomUseCasesFromNotes(lead.notes) && (
                  <span className="mt-1 block text-xs text-[var(--ink-muted)]">
                    + {extractCustomUseCasesFromNotes(lead.notes)}
                  </span>
                )}
              </p>
            )}
          </div>
          <DetailField label="Expected branches" value={String(lead.expectedBranches)} />
          {!isAdmin && <DetailField label="Assigned to" value="You" />}
          {isAdmin && (
            <DetailField label="Assigned rep" value={lead.assignedRepName || "—"} />
          )}
          {lead.trialIntentAt && (
            <DetailField
              label="Trial intent"
              value={new Date(lead.trialIntentAt).toLocaleString()}
            />
          )}
          {lead.lostReason && <DetailField label="Lost reason" value={lead.lostReason} />}
          {lead.notes && <DetailField label="Notes" value={lead.notes} />}
        </Card>

        <Card className="p-4 lg:col-span-3">
          <h3 className="mb-3 font-semibold">Next step</h3>
          <StageActionPanel
            currentStage={lead.stage}
            activityCount={activities.length}
            isPending={stageMutation.isPending}
            onAdvance={(stage, notes, lostReason) =>
              stageMutation.mutate({ stage, notes, lostReason })
            }
          />
          {lead.stage === "FREE_TRIAL" && !isAdmin && (
            <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
              Trial intent recorded. Move to Won when the customer subscribes, or wait for admin
              to provision the account.
            </p>
          )}
          {lead.stage === "WON" && (
            <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
              This lead is won
              {lead.convertedAt
                ? ` — closed ${new Date(lead.convertedAt).toLocaleDateString()}`
                : ""}
              .
            </p>
          )}
          {canConvert && (
            <div className="mt-4 border-t border-[var(--border)] pt-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
                Admin action
              </p>
              <button type="button" className={btnPrimary} onClick={openConvert}>
                Convert to tenant ({STAGE_LABELS.WON})
              </button>
            </div>
          )}
        </Card>
      </div>

      <Card className="space-y-3 p-4">
        <h3 className="font-semibold">Activity log</h3>
        <p className="text-xs text-[var(--ink-muted)]">
          Log every visit, call, or pitch before moving stages — required for pipeline accuracy.
        </p>
        <div className="flex flex-wrap gap-2">
          <select
            className={selectClass}
            value={activityType}
            onChange={(e) => setActivityType(e.target.value as ActivityType)}
          >
            <option value="VISIT">Visit</option>
            <option value="CALL">Call</option>
            <option value="WHATSAPP">WhatsApp</option>
            <option value="PITCH">Pitch</option>
            <option value="DEMO">Demo</option>
            <option value="NOTE">Note</option>
          </select>
          <input
            className={`${inputClass} min-w-[200px] flex-1`}
            placeholder="What happened?"
            value={activityNotes}
            onChange={(e) => setActivityNotes(e.target.value)}
          />
          <button
            type="button"
            className={btnPrimary}
            disabled={activityMutation.isPending}
            onClick={() => activityMutation.mutate()}
          >
            Log activity
          </button>
        </div>
        <ul className="divide-y divide-[var(--border)]">
          {activities.map((a) => (
            <li key={a.id} className="py-2 text-sm">
              <span className="font-medium">{a.activityType}</span>
              {a.notes && <span className="text-[var(--ink-muted)]"> — {a.notes}</span>}
              <span className="ml-2 text-xs text-[var(--ink-muted)]">
                {a.createdAt ? new Date(a.createdAt).toLocaleString() : ""}
              </span>
            </li>
          ))}
          {activities.length === 0 && (
            <li className="py-4 text-sm text-[var(--ink-muted)]">
              No activities yet — log your first visit or call above.
            </li>
          )}
        </ul>
      </Card>

      <SideSheet
        open={convertOpen}
        onClose={() => setConvertOpen(false)}
        title="Convert to tenant"
        subtitle="Creates a new brand account and marks this lead as Won"
        footer={
          <>
            <button type="button" className={btnSecondary} onClick={() => setConvertOpen(false)}>
              Cancel
            </button>
            <button
              type="button"
              className={btnPrimary}
              disabled={convertMutation.isPending}
              onClick={() => convertMutation.mutate()}
            >
              {convertMutation.isPending ? "Converting…" : "Create tenant & close lead"}
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <input
            className={inputClass}
            placeholder="Tenant slug (e.g. mystic-wellness)"
            value={convertForm.tenantSlug}
            onChange={(e) => setConvertForm({ ...convertForm, tenantSlug: e.target.value })}
          />
          <input
            className={inputClass}
            placeholder="Admin name"
            value={convertForm.adminName}
            onChange={(e) => setConvertForm({ ...convertForm, adminName: e.target.value })}
          />
          <input
            className={inputClass}
            placeholder="Admin email"
            value={convertForm.adminEmail}
            onChange={(e) => setConvertForm({ ...convertForm, adminEmail: e.target.value })}
          />
          <input
            className={inputClass}
            placeholder="Temporary password"
            type="password"
            value={convertForm.adminPassword}
            onChange={(e) => setConvertForm({ ...convertForm, adminPassword: e.target.value })}
          />
          <input
            className={inputClass}
            type="number"
            placeholder="Monthly MRR equivalent (₹)"
            value={convertForm.projectedMrr}
            onChange={(e) =>
              setConvertForm({ ...convertForm, projectedMrr: Number(e.target.value) })
            }
          />
          <p className="text-xs text-[var(--ink-muted)]">
            Pre-filled from final paid price:{" "}
            {formatFinalPaidPrice(lead.finalPaidAmount ?? lead.quotedAmount, lead.billingPeriod)}
          </p>
        </div>
      </SideSheet>
    </div>
  );
}
