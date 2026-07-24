"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

export function SidebarBrandFooter({ collapsed }: { collapsed?: boolean }) {
  const t = useTranslations("brand");
  if (collapsed) return null;

  return (
    <div className={cn("px-3 py-2 border-t border-[var(--border)] shrink-0")}>
      <p className="text-[10px] font-bold text-[var(--brand-text)] tracking-wide">Pravaah</p>
      <p className="text-[10px] text-[var(--text-tertiary)] leading-snug mt-0.5 line-clamp-2">{t("taglineShort")}</p>
    </div>
  );
}
