"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown, Sparkles, Target } from "lucide-react";
import type { CampaignCriteriaItem } from "@/lib/campaign-filter-summary";
import { cn } from "@/lib/utils";

export function CampaignCriteriaSummary({
  templateName,
  templateGoal,
  criteria,
  hint,
}: {
  templateName?: string;
  templateGoal?: string;
  criteria: CampaignCriteriaItem[];
  hint?: string;
}) {
  const t = useTranslations("admin.campaigns");
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="campaign-criteria-summary">
      <button
        type="button"
        className="campaign-criteria-summary-trigger"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        <span className="campaign-criteria-summary-icon" aria-hidden>
          <Target className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1 text-left">
          <span className="block text-sm font-bold text-[var(--text-primary)]">
            {templateName ?? t("audienceCriteriaTitle")}
          </span>
          <span className="block text-xs text-[var(--text-secondary)] mt-0.5">
            {hint ?? t("audienceCriteriaHint", { count: criteria.length })}
          </span>
        </span>
        <ChevronDown
          className={cn("h-4 w-4 shrink-0 text-[var(--text-tertiary)] transition-transform", expanded && "rotate-180")}
        />
      </button>

      {expanded ? (
        <div className="campaign-criteria-summary-body">
          {templateGoal ? (
            <div className="flex items-start gap-2 mb-3">
              <Sparkles className="h-3.5 w-3.5 shrink-0 text-[var(--brand-text)] mt-0.5" />
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{templateGoal}</p>
            </div>
          ) : null}
          <ul className="campaign-criteria-chip-list">
            {criteria.map((item) => (
              <li key={item.id} className={cn("campaign-criteria-chip", item.tone && `campaign-criteria-chip--${item.tone}`)}>
                <span className="campaign-criteria-chip-label">{item.label}</span>
                <span className="campaign-criteria-chip-value">{item.value}</span>
              </li>
            ))}
          </ul>
          <p className="text-[10px] text-[var(--text-tertiary)] mt-3 leading-relaxed">{t("audienceCriteriaLocked")}</p>
        </div>
      ) : null}
    </div>
  );
}
