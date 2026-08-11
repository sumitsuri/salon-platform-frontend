"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { api } from "@/lib/api";
import { RegistrationCardPanel } from "@/components/customer/RegistrationCardPanel";
import { PageLoader } from "@/components/ui";

function PublicPassContent() {
  const t = useTranslations("manager.walkIn");
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const { data: card, isLoading, isError } = useQuery({
    queryKey: ["public-pass", token],
    queryFn: () => api.getPublicPassCard(token),
    enabled: !!token,
  });

  if (!token) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[var(--surface-muted)] p-6">
        <p className="text-sm text-red-600">{t("passNotFound")}</p>
      </main>
    );
  }

  if (isLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[var(--surface-muted)] p-6">
        <p className="text-sm text-[var(--text-secondary)]">{t("loadingPass")}</p>
      </main>
    );
  }

  if (isError || !card) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[var(--surface-muted)] p-6">
        <p className="text-sm text-red-600">{t("passNotFound")}</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--surface-muted)] p-4 sm:p-8 flex items-start justify-center">
      <div className="w-full max-w-md">
        <RegistrationCardPanel card={card} />
      </div>
    </main>
  );
}

export default function PublicPassPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <PublicPassContent />
    </Suspense>
  );
}
