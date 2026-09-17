"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { ScratchCardFlow } from "@/components/scratch/ScratchCardFlow";
import { PageLoader } from "@/components/ui";

function ScratchFlowContent() {
  const t = useTranslations("scratch");
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  if (!token) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[var(--surface-muted)] p-6">
        <p className="text-sm text-red-600">{t("invalidLink")}</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--surface-muted)] p-4 sm:p-8 flex items-start justify-center">
      <div className="w-full max-w-md">
        <ScratchCardFlow token={token} showRedemptionCode />
      </div>
    </main>
  );
}

export default function ScratchPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <ScratchFlowContent />
    </Suspense>
  );
}
