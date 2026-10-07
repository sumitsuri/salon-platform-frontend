"use client";

import { useTranslations } from "next-intl";
import { AlertCircle, Sparkles } from "lucide-react";
import type { ScanAnalysisMeta } from "@/lib/api";
import { cn } from "@/lib/utils";

export function ScanAnalysisMetaBanner({ meta }: { meta?: ScanAnalysisMeta | null }) {
  const t = useTranslations("manager.scanAnalysis");
  if (!meta) return null;

  const low = meta.confidence === "LOW";
  const medium = meta.confidence === "MEDIUM";

  return (
    <div
      className={cn(
        "rounded-xl border px-3 py-2.5 text-xs leading-relaxed",
        low && "border-amber-300 bg-amber-50 text-amber-950",
        medium && "border-sky-200 bg-sky-50/80 text-sky-950",
        !low && !medium && "border-[var(--border)] bg-[var(--surface-muted)]/50 text-[var(--text-secondary)]",
      )}
    >
      <p className="flex items-center gap-2 font-semibold">
        {meta.method === "LLM_ASSISTED" ? (
          <Sparkles className="h-3.5 w-3.5 shrink-0" aria-hidden />
        ) : (
          <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden />
        )}
        {t("confidenceLabel", { level: meta.confidence ?? "MEDIUM" })}
        {meta.staffInputUsed ? ` · ${t("staffUsed")}` : ` · ${t("staffMissing")}`}
      </p>
      {meta.retakeHint && <p className="mt-1 pl-5">{meta.retakeHint}</p>}
      {meta.qualityIssues && meta.qualityIssues.length > 0 && (
        <ul className="mt-1 list-disc pl-8">
          {meta.qualityIssues.map((issue) => (
            <li key={issue}>{issue}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
