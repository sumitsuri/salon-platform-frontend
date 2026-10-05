"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Microscope, Plus } from "lucide-react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { formatTenantDateTime, getTenantLocaleKit } from "@/lib/tenant-locale";
import { PageHeader, btnPrimary, Card, EmptyState, PageLoader } from "@/components/ui";

export default function ManagerScalpScanHubPage() {
  const t = useTranslations("manager.scalpScan");
  const branchId = useAuthStore((s) => s.user?.branchId) || "";
  const localeKit = getTenantLocaleKit();

  const { data, isLoading } = useQuery({
    queryKey: ["scalp-scans", branchId],
    queryFn: () => api.listScalpScans({ branchId, page: 0, size: 20 }),
    enabled: !!branchId,
  });

  const items = data?.content ?? [];

  return (
    <div className="dashboard-page-flow">
      <PageHeader
        title={t("title")}
        subtitle={t("subtitle")}
        action={
          <Link href="/manager/scalp-scan/new" className={`${btnPrimary} min-h-11 inline-flex gap-2`}>
            <Plus className="h-4 w-4" aria-hidden />
            {t("newScan")}
          </Link>
        }
      />

      <Card className="border-[var(--brand)]/15 bg-[var(--brand-light)]/20 p-4">
        <div className="flex gap-3">
          <Microscope className="h-8 w-8 shrink-0 text-[var(--brand-text)]" aria-hidden />
          <div className="min-w-0 text-sm leading-relaxed text-[var(--text-secondary)]">
            <p className="font-semibold text-[var(--text-primary)]">{t("heroTitle")}</p>
            <p className="mt-1">{t("heroBody")}</p>
          </div>
        </div>
      </Card>

      {isLoading ? (
        <PageLoader />
      ) : items.length === 0 ? (
        <EmptyState title={t("emptyTitle")} description={t("emptyDesc")} />
      ) : (
        <ul className="space-y-2">
          {items.map((scan) => (
            <li key={scan.id}>
              <Link
                href={
                  scan.status === "COMPLETE"
                    ? `/manager/scalp-scan/report?id=${scan.id}`
                    : `/manager/scalp-scan/new?sessionId=${scan.id}`
                }
                className="block rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 shadow-sm transition hover:border-[var(--brand)]/40"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-[var(--text-primary)]">{scan.customerName}</p>
                    <p className="text-xs text-[var(--text-secondary)]">
                      {formatTenantDateTime(scan.createdAt, localeKit)}
                      {scan.status === "COMPLETE" && scan.scalpHealthScore != null
                        ? ` · ${t("healthShort", { score: scan.scalpHealthScore })}`
                        : ` · ${t("draft")}`}
                    </p>
                  </div>
                  {scan.primaryConcernCode && (
                    <span className="shrink-0 rounded-full bg-[var(--surface-muted)] px-2 py-0.5 text-[10px] font-bold uppercase text-[var(--text-secondary)]">
                      {t(`concerns.${scan.primaryConcernCode}`, { defaultValue: scan.primaryConcernCode })}
                    </span>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
