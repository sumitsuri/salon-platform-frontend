"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Copy, ExternalLink, Link2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { api, type Branch, type Tenant } from "@/lib/api";
import { buildPublicBookUrl } from "@/lib/book-routes";
import { btnSecondary, inputClass } from "@/components/ui";

export function OnlineBookingPanel({
  branch,
  tenant,
  compact = false,
}: {
  branch: Branch;
  tenant?: Pick<Tenant, "slug"> | null;
  compact?: boolean;
}) {
  const t = useTranslations("manager.schedule");
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);
  const [enabled, setEnabled] = useState(branch.onlineBookingEnabled === true);
  const [minLead, setMinLead] = useState(String(branch.onlineBookingMinLeadMinutes ?? 60));
  const [maxAdvance, setMaxAdvance] = useState(String(branch.onlineBookingMaxAdvanceDays ?? 30));
  const [slotMinutes, setSlotMinutes] = useState(String(branch.onlineBookingSlotMinutes ?? 15));

  useEffect(() => {
    setEnabled(branch.onlineBookingEnabled === true);
    setMinLead(String(branch.onlineBookingMinLeadMinutes ?? 60));
    setMaxAdvance(String(branch.onlineBookingMaxAdvanceDays ?? 30));
    setSlotMinutes(String(branch.onlineBookingSlotMinutes ?? 15));
  }, [branch]);

  const tenantSlug = tenant?.slug ?? branch.tenantSlug;
  const bookUrl = useMemo(() => {
    if (!tenantSlug || !branch.code) return null;
    return buildPublicBookUrl(tenantSlug, branch.code);
  }, [tenantSlug, branch.code]);

  const saveMutation = useMutation({
    mutationFn: () =>
      api.updateBranch(branch.id, {
        onlineBookingEnabled: enabled,
        onlineBookingMinLeadMinutes: Number(minLead) || 60,
        onlineBookingMaxAdvanceDays: Number(maxAdvance) || 30,
        onlineBookingSlotMinutes: Number(slotMinutes) || 15,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branch", branch.id] });
      queryClient.invalidateQueries({ queryKey: ["branches"] });
    },
  });

  async function copyLink() {
    if (!bookUrl) return;
    await navigator.clipboard.writeText(bookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const brandEnabled = branch.onlineBookingBrandEnabled === true;
  const live = branch.onlineBookingEffective === true;

  return (
    <div
      className={`rounded-2xl border border-[var(--border)] bg-[var(--surface)] ${compact ? "px-3 py-3" : "px-4 py-4"} space-y-3`}
    >
      {!brandEnabled ? (
        <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">{t("onlineBookingBrandDisabled")}</p>
      ) : null}
      {!live && brandEnabled && !enabled ? (
        <p className="rounded-xl bg-stone-100 px-3 py-2 text-xs text-stone-700">{t("onlineBookingBranchDisabled")}</p>
      ) : null}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-sm font-bold text-[var(--text-primary)]">
            <Link2 className="h-4 w-4 text-[var(--brand)] shrink-0" aria-hidden />
            {t("onlineBookingTitle")}
          </p>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            {bookUrl ? t("onlineBookingSubtitle") : t("onlineBookingLinkPending")}
          </p>
        </div>
        {bookUrl ? (
          <a
            href={bookUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--brand-text)] shrink-0"
          >
            {t("previewLink")}
            <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          </a>
        ) : null}
      </div>

      {bookUrl ? (
        <div className="flex gap-2">
          <input readOnly value={bookUrl} className={`${inputClass} text-xs font-mono flex-1 min-w-0`} />
          <button type="button" onClick={() => void copyLink()} className={`${btnSecondary} shrink-0 px-3`}>
            <Copy className="h-4 w-4" aria-hidden />
            <span className="sr-only">{t("copyBookingLink")}</span>
          </button>
        </div>
      ) : (
        <p className="rounded-xl bg-[var(--surface-muted)] px-3 py-2 text-xs text-[var(--text-secondary)]">
          {t("onlineBookingLinkPending")}
        </p>
      )}
      {copied ? <p className="text-xs text-emerald-700 dark:text-emerald-400">{t("linkCopied")}</p> : null}

      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="mt-1" />
        <span>
          <span className="font-medium">{t("onlineBookingEnabled")}</span>
          <span className="mt-0.5 block text-xs text-[var(--text-secondary)]">
            {bookUrl ? t("onlineBookingEnabledHint", { url: bookUrl }) : t("onlineBookingEnabledHintGeneric")}
          </span>
        </span>
      </label>

      {!compact ? (
        <div className="grid grid-cols-3 gap-2">
          <label className="block text-xs">
            <span className="font-semibold text-[var(--text-secondary)]">{t("minLeadMinutes")}</span>
            <input
              type="number"
              min={15}
              className={`${inputClass} mt-1`}
              value={minLead}
              onChange={(e) => setMinLead(e.target.value)}
            />
          </label>
          <label className="block text-xs">
            <span className="font-semibold text-[var(--text-secondary)]">{t("maxAdvanceDays")}</span>
            <input
              type="number"
              min={1}
              max={90}
              className={`${inputClass} mt-1`}
              value={maxAdvance}
              onChange={(e) => setMaxAdvance(e.target.value)}
            />
          </label>
          <label className="block text-xs">
            <span className="font-semibold text-[var(--text-secondary)]">{t("slotMinutes")}</span>
            <input
              type="number"
              min={5}
              step={5}
              className={`${inputClass} mt-1`}
              value={slotMinutes}
              onChange={(e) => setSlotMinutes(e.target.value)}
            />
          </label>
        </div>
      ) : null}

      <button
        type="button"
        className={`${btnSecondary} w-full min-h-10 touch-manipulation`}
        disabled={saveMutation.isPending}
        onClick={() => saveMutation.mutate()}
      >
        {saveMutation.isPending ? t("savingSettings") : t("saveBookingSettings")}
      </button>
      {saveMutation.error ? (
        <p className="text-xs text-red-600">{(saveMutation.error as Error).message}</p>
      ) : null}
    </div>
  );
}
