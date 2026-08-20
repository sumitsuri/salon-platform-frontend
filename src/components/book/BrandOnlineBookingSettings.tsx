"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, Copy, ExternalLink, Globe, Pencil } from "lucide-react";
import { useTranslations } from "next-intl";
import { api, type Branch, type Tenant } from "@/lib/api";
import { buildPublicBookUrl, productionBookBaseUrl } from "@/lib/book-routes";
import { AlertBanner, btnSecondary } from "@/components/ui";

function CompactSwitch({
  checked,
  disabled,
  onChange,
  ariaLabel,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] focus-visible:ring-offset-2 disabled:cursor-not-allowed ${
        checked ? "bg-[var(--brand)]" : "bg-[var(--border)]"
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform duration-200 ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

function SettingsSwitch({
  checked,
  disabled,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <label
      className={`flex items-center justify-between gap-4 py-3 ${disabled ? "opacity-50" : "cursor-pointer"}`}
    >
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-[var(--text-primary)]">{label}</span>
        {description ? (
          <span className="mt-0.5 block text-xs leading-relaxed text-[var(--text-secondary)]">{description}</span>
        ) : null}
      </span>
      <CompactSwitch checked={checked} disabled={disabled} onChange={onChange} ariaLabel={label} />
    </label>
  );
}

function CopyLinkBar({ url, copiedLabel }: { url: string; copiedLabel: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const display = url.replace(/^https?:\/\//, "");

  return (
    <div className="flex items-center gap-2 rounded-xl bg-[var(--surface-muted)]/60 px-3 py-2.5">
      <p className="min-w-0 flex-1 truncate font-mono text-xs text-[var(--text-primary)]" title={url}>
        {display}
      </p>
      <button
        type="button"
        onClick={() => void copy()}
        className={`${btnSecondary} h-8 shrink-0 px-2.5 text-xs`}
        aria-label={copied ? copiedLabel : "Copy link"}
      >
        {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
      </button>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className={`${btnSecondary} h-8 shrink-0 px-2.5`}
        aria-label="Open link"
      >
        <ExternalLink className="h-3.5 w-3.5" />
      </a>
    </div>
  );
}

export function BrandOnlineBookingSettings({
  tenant,
  branches,
  loading,
  onEditBrand,
}: {
  tenant?: Tenant | null;
  branches: Branch[];
  loading?: boolean;
  onEditBrand?: () => void;
}) {
  const t = useTranslations("admin.organization");
  const queryClient = useQueryClient();
  const [brandEnabled, setBrandEnabled] = useState(tenant?.onlineBookingEnabled === true);
  const [brandSaved, setBrandSaved] = useState(false);

  useEffect(() => {
    setBrandEnabled(tenant?.onlineBookingEnabled === true);
  }, [tenant?.onlineBookingEnabled]);

  const activeBranches = useMemo(
    () => branches.filter((b) => b.status !== "INACTIVE"),
    [branches]
  );

  const homeBookUrl = tenant?.slug ? `${productionBookBaseUrl()}/book/${tenant.slug}/` : null;

  const enabledBranchCount = activeBranches.filter(
    (b) => brandEnabled && b.onlineBookingEnabled === true
  ).length;

  const brandDirty = tenant != null && brandEnabled !== (tenant.onlineBookingEnabled === true);

  const saveBrandMutation = useMutation({
    mutationFn: (enabled: boolean) => api.updateTenant({ onlineBookingEnabled: enabled }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant"] });
      queryClient.invalidateQueries({ queryKey: ["branches"] });
      setBrandSaved(true);
      setTimeout(() => setBrandSaved(false), 2000);
    },
  });

  const bulkMutation = useMutation({
    mutationFn: (enabled: boolean) => api.bulkUpdateBranchOnlineBooking({ enabled }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["branches"] }),
  });

  const branchMutation = useMutation({
    mutationFn: ({ branchId, enabled }: { branchId: string; enabled: boolean }) =>
      api.updateBranch(branchId, { onlineBookingEnabled: enabled }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["branches"] }),
  });

  function setBrand(next: boolean) {
    setBrandEnabled(next);
    saveBrandMutation.mutate(next);
  }

  const pending = saveBrandMutation.isPending || bulkMutation.isPending || branchMutation.isPending;
  const error = saveBrandMutation.error || bulkMutation.error || branchMutation.error;

  if (loading) {
    return (
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
        <p className="text-sm text-[var(--text-secondary)]">{t("loadingBrand")}</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
      {/* Header */}
      <div className="border-b border-[var(--border)] px-4 py-4 sm:px-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {tenant && onEditBrand ? (
              <button
                type="button"
                onClick={onEditBrand}
                className="group mb-2 flex items-center gap-1.5 text-left touch-manipulation"
              >
                <span className="truncate text-base font-bold text-[var(--text-primary)] group-hover:text-[var(--brand-text)]">
                  {tenant.name}
                </span>
                <Pencil className="h-3.5 w-3.5 shrink-0 text-[var(--text-tertiary)] opacity-0 transition group-hover:opacity-100" />
              </button>
            ) : null}
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 shrink-0 text-[var(--brand)]" aria-hidden />
              <h2 className="text-sm font-bold text-[var(--text-primary)]">{t("onlineBookingAdminTitle")}</h2>
            </div>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">{t("onlineBookingAdminSubtitleShort")}</p>
          </div>
          <div
            className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold tabular-nums ${
              brandEnabled && enabledBranchCount > 0
                ? "bg-emerald-500/15 text-emerald-800"
                : "bg-stone-500/10 text-stone-600"
            }`}
          >
            {t("onlineBookingBranchCount", { enabled: enabledBranchCount, total: activeBranches.length })}
          </div>
        </div>
      </div>

      <div className="divide-y divide-[var(--border)]">
        {/* Master switch */}
        <div className="px-4 sm:px-5">
          <SettingsSwitch
            checked={brandEnabled}
            disabled={pending}
            onChange={setBrand}
            label={t("onlineBookingBrandEnabledShort")}
            description={t("onlineBookingBrandEnabledHintShort")}
          />
          {brandSaved ? (
            <p className="pb-2 text-xs font-medium text-emerald-700">{t("onlineBookingSaved")}</p>
          ) : brandDirty && saveBrandMutation.isPending ? (
            <p className="pb-2 text-xs text-[var(--text-tertiary)]">{t("onlineBookingSaving")}</p>
          ) : null}
        </div>

        {/* Share link */}
        {homeBookUrl ? (
          <div className="space-y-2 px-4 py-4 sm:px-5">
            <p className="text-xs font-semibold text-[var(--text-secondary)]">{t("onlineBookingShareLink")}</p>
            <CopyLinkBar url={homeBookUrl} copiedLabel={t("onlineBookingLinkCopied")} />
            <p className="text-[11px] text-[var(--text-tertiary)]">{t("onlineBookingShareLinkHint")}</p>
          </div>
        ) : null}

        {/* Branches */}
        <div className="px-4 py-4 sm:px-5">
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
              {t("onlineBookingBranches")}
            </p>
            <div className="flex items-center gap-3 text-xs font-semibold">
              <button
                type="button"
                disabled={!brandEnabled || pending}
                onClick={() => bulkMutation.mutate(true)}
                className="text-[var(--brand-text)] disabled:opacity-40 touch-manipulation"
              >
                {t("onlineBookingEnableAll")}
              </button>
              <span className="text-[var(--border)]" aria-hidden>
                ·
              </span>
              <button
                type="button"
                disabled={pending}
                onClick={() => bulkMutation.mutate(false)}
                className="text-[var(--text-secondary)] disabled:opacity-40 touch-manipulation"
              >
                {t("onlineBookingDisableAll")}
              </button>
            </div>
          </div>

          {!brandEnabled ? (
            <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
              {t("onlineBookingBrandOffBanner")}
            </p>
          ) : null}

          {activeBranches.length === 0 ? (
            <p className="text-sm text-[var(--text-secondary)]">{t("noBranchesTitle")}</p>
          ) : (
            <ul className="space-y-1">
              {activeBranches.map((branch) => {
                const branchOn = branch.onlineBookingEnabled === true;
                const live = brandEnabled && branchOn;
                return (
                  <li
                    key={branch.id}
                    className={`flex items-center gap-3 rounded-xl px-2 py-1.5 ${
                      brandEnabled ? "hover:bg-[var(--surface-muted)]/50" : "opacity-55"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`h-2 w-2 shrink-0 rounded-full ${live ? "bg-emerald-500" : "bg-stone-300"}`}
                          aria-hidden
                        />
                        <p className="truncate text-sm font-medium text-[var(--text-primary)]">{branch.name}</p>
                        <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide text-[var(--text-tertiary)]">
                          {branch.code}
                        </span>
                      </div>
                    </div>
                    {tenant?.slug && branch.code && live ? (
                      <BranchLinkCopy
                        url={buildPublicBookUrl(tenant.slug, branch.code)}
                        copiedLabel={t("onlineBookingLinkCopied")}
                      />
                    ) : null}
                    <CompactSwitch
                      checked={live}
                      disabled={!brandEnabled || pending}
                      onChange={(next) => branchMutation.mutate({ branchId: branch.id, enabled: next })}
                      ariaLabel={t("onlineBookingToggleBranch", { name: branch.name })}
                    />
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {error ? (
        <div className="border-t border-[var(--border)] px-4 py-3 sm:px-5">
          <AlertBanner variant="error">{(error as Error).message}</AlertBanner>
        </div>
      ) : null}
    </div>
  );
}

function BranchLinkCopy({ url, copiedLabel }: { url: string; copiedLabel: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      title={url}
      onClick={async () => {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="hidden sm:flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--text-tertiary)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)] touch-manipulation"
      aria-label={copied ? copiedLabel : "Copy branch link"}
    >
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}
