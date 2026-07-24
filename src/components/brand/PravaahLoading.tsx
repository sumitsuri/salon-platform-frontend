"use client";

import { useTranslations } from "next-intl";
import { PravaahLogo } from "./PravaahLogo";

export function PravaahLoading({ label }: { label?: string }) {
  const t = useTranslations("common");
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--app-bg)] gap-4 px-4">
      <PravaahLogo size="md" variant="dark" className="pravaah-loading-pulse" />
      <div className="w-8 h-8 rounded-full border-2 border-[var(--brand)] border-t-transparent animate-spin" />
      <p className="text-sm text-[var(--text-secondary)]">{label ?? t("loading")}</p>
    </div>
  );
}
