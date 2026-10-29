"use client";

import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { ArrowLeft, Gift, Loader2, PackageOpen, Percent, Save } from "lucide-react";
import { api, type Branch, type FestiveOffer, type OfferBlockType, type OfferStudioInfo } from "@/lib/api";
import { cn } from "@/lib/utils";
import { AlertBanner, SegmentedControl, btnPrimary, btnSecondary, inputClass } from "@/components/ui";
import { BlockEditor, IncludedServicesInput } from "./BlockEditors";
import { PosterPanel } from "./PosterPanel";
import {
  MAX_BLOCKS,
  draftFingerprint,
  newBlock,
  toInput,
  validateDraft,
  type OfferDraft,
} from "./offer-form";

const STYLE_SWATCH: Record<string, string> = {
  FESTIVE_MAROON_GOLD: "linear-gradient(135deg,#4a0e1c,#8b1a2f 60%,#f4d58d)",
  ROYAL_PURPLE_GOLD: "linear-gradient(135deg,#2b1239,#5a1e6b 60%,#f4d58d)",
  CREAM_FLORAL: "linear-gradient(135deg,#fbf1e4,#f3d9c4 60%,#7a1230)",
  MODERN_MINIMAL: "linear-gradient(135deg,#fafafa,#ececec 60%,#b8860b)",
};

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5 space-y-3 shadow-sm">
      <div>
        <h2 className="text-sm font-bold text-[var(--text-primary)]">{title}</h2>
        {hint ? <p className="mt-0.5 text-xs text-[var(--text-secondary)]">{hint}</p> : null}
      </div>
      {children}
    </section>
  );
}

function Field({ label, hint, children, className }: { label: string; hint?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">{label}</label>
      {children}
      {hint ? <p className="mt-1 text-[11px] text-[var(--text-tertiary)]">{hint}</p> : null}
    </div>
  );
}

export function OfferEditor({
  initialOffer,
  initialDraft,
  studio,
  branches,
  onBack,
}: {
  initialOffer: FestiveOffer | null;
  initialDraft: OfferDraft;
  studio: OfferStudioInfo | undefined;
  branches: Branch[];
  onBack: () => void;
}) {
  const t = useTranslations("admin.offerStudio");
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<OfferDraft>(initialDraft);
  const [saved, setSaved] = useState<FestiveOffer | null>(initialOffer);
  const [savedFingerprint, setSavedFingerprint] = useState<string | null>(
    initialOffer ? draftFingerprint(initialDraft) : null
  );
  const [savedCaption, setSavedCaption] = useState<string>(initialOffer?.caption ?? "");
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"design" | "poster">("design");

  const dirty = savedFingerprint === null || draftFingerprint(draft) !== savedFingerprint;
  const captionDirty = !!saved && draft.captionEdited && draft.caption.trim() !== savedCaption.trim();
  const canSave = dirty || captionDirty;

  const occasionById = useMemo(() => new Map((studio?.occasions ?? []).map((o) => [o.id, o])), [studio]);
  const set = (patch: Partial<OfferDraft>) => setDraft((d) => ({ ...d, ...patch }));

  const save = useMutation({
    mutationFn: () => {
      const input = toInput(draft);
      return saved ? api.updateFestiveOffer(saved.id, input) : api.createFestiveOffer(input);
    },
    onSuccess: (offer) => {
      setError("");
      setSaved(offer);
      setSavedFingerprint(draftFingerprint(draft));
      setSavedCaption(offer.caption);
      setDraft((d) => ({ ...d, caption: offer.caption, captionEdited: false }));
      void queryClient.invalidateQueries({ queryKey: ["festive-offers"] });
    },
    onError: (e) => setError(e instanceof Error ? e.message : t("saveFailed")),
  });

  const resetCaption = useMutation({
    mutationFn: () => api.updateFestiveOffer(saved!.id, { ...toInput({ ...draft, captionEdited: false }), caption: undefined }),
    onSuccess: (offer) => {
      setSaved(offer);
      setSavedCaption(offer.caption);
      setDraft((d) => ({ ...d, caption: offer.caption, captionEdited: false }));
      void queryClient.invalidateQueries({ queryKey: ["festive-offers"] });
    },
    onError: (e) => setError(e instanceof Error ? e.message : t("saveFailed")),
  });

  function submit() {
    const problem = validateDraft(draft, { needBranch: t("needBranch"), needOffer: t("needOffer") });
    if (problem) {
      setError(problem);
      setTab("design");
      return;
    }
    setError("");
    save.mutate();
  }

  function changeOccasion(id: string) {
    const prev = occasionById.get(draft.occasion);
    const next = occasionById.get(id);
    set({
      occasion: id,
      headline: !draft.headline.trim() || draft.headline === prev?.suggestedHeadline ? (next?.suggestedHeadline ?? draft.headline) : draft.headline,
      tagline: !draft.tagline.trim() || draft.tagline === prev?.suggestedTagline ? (next?.suggestedTagline ?? "") : draft.tagline,
    });
  }

  function changeBranch(id: string) {
    const prev = branches.find((b) => b.id === draft.branchId);
    const next = branches.find((b) => b.id === id);
    set({
      branchId: id,
      address: !draft.address.trim() || draft.address === (prev?.address ?? "") ? (next?.address ?? "") : draft.address,
      phone: !draft.phone.trim() || draft.phone === (prev?.phone ?? "") ? (next?.phone ?? "") : draft.phone,
    });
  }

  const addBlock = (type: OfferBlockType) => set({ blocks: [...draft.blocks, newBlock(type)] });
  const canAddBlock = draft.blocks.length < MAX_BLOCKS;

  const addButtons: { type: OfferBlockType; label: string; hint: string; icon: typeof Percent }[] = [
    { type: "SPEND_PERCENT", label: t("addSpend"), hint: t("addSpendHint"), icon: Percent },
    { type: "PACKAGE", label: t("addPackage"), hint: t("addPackageHint"), icon: PackageOpen },
    { type: "FREE_WITH_SPEND", label: t("addFree"), hint: t("addFreeHint"), icon: Gift },
  ];

  return (
    <div className="space-y-4" data-testid="offer-editor">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--brand-text)] hover:underline touch-manipulation">
          <ArrowLeft className="h-4 w-4" />
          {t("backToList")}
        </button>
        <div className="flex items-center gap-3">
          {canSave && saved && <span className="text-xs text-amber-700 dark:text-amber-400">{t("unsaved")}</span>}
          {!canSave && saved && <span className="text-xs text-emerald-700 dark:text-emerald-400">{t("saved")}</span>}
          <button type="button" className={btnPrimary} disabled={save.isPending || !canSave} onClick={submit} data-testid="offer-save">
            {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {save.isPending ? t("saving") : saved ? t("saveChanges") : t("save")}
          </button>
        </div>
      </div>

      {error && <AlertBanner variant="error">{error}</AlertBanner>}

      <div className="hub:hidden">
        <SegmentedControl
          value={tab}
          onChange={setTab}
          options={[
            { id: "design", label: t("designTab") },
            { id: "poster", label: t("posterTitle") },
          ]}
        />
      </div>

      <div className="grid gap-4 hub:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] items-start">
        <div className={cn("space-y-4 min-w-0", tab !== "design" && "max-hub:hidden")}>
          <Section title={t("occasion")}>
            <div className="flex flex-wrap gap-2">
              {(studio?.occasions ?? []).map((o) => (
                <button
                  key={o.id}
                  type="button"
                  aria-pressed={draft.occasion === o.id}
                  onClick={() => changeOccasion(o.id)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-xs sm:text-sm font-medium transition touch-manipulation min-h-10",
                    draft.occasion === o.id
                      ? "border-[var(--brand)] bg-[var(--brand-light)] text-[var(--brand-text)]"
                      : "border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] hover:bg-[var(--surface-muted)]"
                  )}
                >
                  <span aria-hidden>{o.emoji}</span>
                  {o.label}
                </button>
              ))}
            </div>
          </Section>

          <Section title={t("headlineSection")}>
            <Field label={t("headline")}>
              <input className={inputClass} value={draft.headline} maxLength={120} onChange={(e) => set({ headline: e.target.value })} />
            </Field>
            <Field label={t("tagline")}>
              <input className={inputClass} value={draft.tagline} maxLength={160} onChange={(e) => set({ tagline: e.target.value })} />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={t("validUntil")} hint={t("validHint")}>
                <input type="date" className={inputClass} value={draft.validUntil} onChange={(e) => set({ validUntil: e.target.value })} />
              </Field>
              <Field label={t("terms")}>
                <input className={inputClass} value={draft.terms} maxLength={400} onChange={(e) => set({ terms: e.target.value })} />
              </Field>
            </div>
          </Section>

          <Section title={t("offersSection")} hint={t("offersHint")}>
            <div className="space-y-3">
              {draft.blocks.map((b, i) => (
                <BlockEditor
                  key={b.key}
                  block={b}
                  index={i}
                  onChange={(next) => set({ blocks: draft.blocks.map((x) => (x.key === b.key ? next : x)) })}
                  onRemove={() => set({ blocks: draft.blocks.filter((x) => x.key !== b.key) })}
                />
              ))}
            </div>
            {canAddBlock && (
              <div className="grid gap-2 sm:grid-cols-3">
                {addButtons.map((a) => (
                  <button
                    key={a.type}
                    type="button"
                    onClick={() => addBlock(a.type)}
                    className="flex items-start gap-2.5 rounded-xl border border-dashed border-[var(--border-brand)] bg-[var(--surface)] p-3 text-left hover:bg-[var(--gradient-brand-soft)] transition touch-manipulation"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--brand-light)] text-[var(--brand-text)]">
                      <a.icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-[var(--text-primary)]">+ {a.label}</span>
                      <span className="block text-xs text-[var(--text-secondary)]">{a.hint}</span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </Section>

          <Section title={t("look")}>
            <div className="grid gap-2 sm:grid-cols-2">
              {(studio?.styles ?? []).map((s) => (
                <button
                  key={s.id}
                  type="button"
                  aria-pressed={draft.style === s.id}
                  onClick={() => set({ style: s.id })}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border p-2.5 text-left transition touch-manipulation",
                    draft.style === s.id ? "border-[var(--brand)] bg-[var(--brand-light)]" : "border-[var(--border)] hover:bg-[var(--surface-muted)]"
                  )}
                >
                  <span className="h-12 w-9 shrink-0 rounded-md border border-black/10" style={{ background: STYLE_SWATCH[s.id] }} />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-[var(--text-primary)]">{s.label}</span>
                    <span className="block text-xs text-[var(--text-secondary)]">{s.description}</span>
                  </span>
                </button>
              ))}
            </div>
            <div className="pt-1">
              <p className="text-xs font-semibold text-[var(--text-secondary)] mb-1.5">{t("format")}</p>
              <SegmentedControl
                value={draft.format}
                onChange={(v) => set({ format: v })}
                options={(studio?.formats ?? []).map((f) => ({ id: f.id, label: f.label }))}
              />
            </div>
          </Section>

          <Section title={t("branchSection")}>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={t("branch")}>
                <select className={inputClass} value={draft.branchId} onChange={(e) => changeBranch(e.target.value)}>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={t("brandName")}>
                <input className={inputClass} value={draft.brandName} maxLength={80} onChange={(e) => set({ brandName: e.target.value })} />
              </Field>
              <Field label={t("address")} className="sm:col-span-2">
                <input className={inputClass} value={draft.address} maxLength={200} onChange={(e) => set({ address: e.target.value })} />
              </Field>
              <Field label={t("phone")}>
                <input className={inputClass} inputMode="tel" value={draft.phone} maxLength={25} onChange={(e) => set({ phone: e.target.value })} />
              </Field>
            </div>
          </Section>

          <Section title={t("included")} hint={t("includedHint")}>
            <IncludedServicesInput value={draft.included} onChange={(v) => set({ included: v })} />
          </Section>

          <Section title={t("extra")} hint={t("extraHint")}>
            <textarea
              rows={2}
              maxLength={400}
              className={cn(inputClass, "min-h-0")}
              value={draft.extraDirection}
              onChange={(e) => set({ extraDirection: e.target.value })}
            />
          </Section>

          <div className="flex justify-end">
            <button type="button" className={btnSecondary} onClick={onBack}>
              {t("backToList")}
            </button>
          </div>
        </div>

        <aside className={cn("min-w-0 hub:sticky hub:top-4", tab !== "poster" && "max-hub:hidden")}>
          <Section title={t("posterTitle")}>
            <PosterPanel
              offer={saved}
              dirty={dirty}
              studio={studio}
              headline={draft.headline}
              caption={draft.caption}
              onCaptionChange={(v) => set({ caption: v, captionEdited: true })}
              onResetCaption={() => resetCaption.mutate()}
              resettingCaption={resetCaption.isPending}
            />
          </Section>
        </aside>
      </div>
    </div>
  );
}
