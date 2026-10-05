"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { api } from "@/lib/api";
import { FaceScanReportView } from "@/components/manager/face-scan/FaceScanReportView";
import { AntrahqLoading } from "@/components/brand/AntrahqLoading";
import { btnSecondary, PageHeader, PageLoader } from "@/components/ui";

function ReportContent() {
  const t = useTranslations("manager.faceScan");
  const id = useSearchParams().get("id") ?? "";

  const { data, isLoading, isError } = useQuery({
    queryKey: ["face-scan", id],
    queryFn: () => api.getFaceScan(id),
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
          <Link href="/manager/face-scan" className={btnSecondary}>
            {t("backToHub")}
          </Link>
        }
      />
      <FaceScanReportView session={data} />
    </div>
  );
}

export default function FaceScanReportPage() {
  return (
    <Suspense fallback={<AntrahqLoading label="Loading..." />}>
      <ReportContent />
    </Suspense>
  );
}
