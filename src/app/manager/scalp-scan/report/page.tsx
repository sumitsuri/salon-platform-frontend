"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { api } from "@/lib/api";
import { ScalpScanReportView } from "@/components/manager/scalp-scan/ScalpScanReportView";
import { AntrahqLoading } from "@/components/brand/AntrahqLoading";
import { btnSecondary, PageHeader, PageLoader } from "@/components/ui";

function ReportContent() {
  const t = useTranslations("manager.scalpScan");
  const id = useSearchParams().get("id") ?? "";

  const { data, isLoading, isError } = useQuery({
    queryKey: ["scalp-scan", id],
    queryFn: () => api.getScalpScan(id),
    enabled: !!id,
  });

  if (!id) {
    return <p className="text-sm text-[var(--text-secondary)]">{t("missingId")}</p>;
  }

  if (isLoading) return <PageLoader />;
  if (isError || !data) {
    return <p className="text-sm text-[var(--text-secondary)]">{t("loadFailed")}</p>;
  }

  return (
    <div className="dashboard-page-flow max-w-2xl">
      <PageHeader
        title={t("reportTitle")}
        subtitle={data.customerName}
        action={
          <Link href="/manager/scalp-scan" className={btnSecondary}>
            {t("backToHub")}
          </Link>
        }
      />
      <ScalpScanReportView session={data} />
    </div>
  );
}

export default function ScalpScanReportPage() {
  return (
    <Suspense fallback={<AntrahqLoading label="Loading..." />}>
      <ReportContent />
    </Suspense>
  );
}
