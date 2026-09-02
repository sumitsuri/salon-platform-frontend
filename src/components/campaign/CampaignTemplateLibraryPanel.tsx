"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Check, ChevronRight, Sparkles } from "lucide-react";
import type { CampaignTemplate, CampaignTemplateLibrary } from "@/lib/api";
import { cn } from "@/lib/utils";
import { CAMPAIGN_CATEGORY_VISUAL } from "@/components/campaign/campaign-template-meta";
import { btnSecondarySm } from "@/components/ui";

type Props = {
  library: CampaignTemplateLibrary;
  step: "category" | "template";
  activeCategory: string;
  selectedTemplateId?: string;
  onCategorySelect: (categoryCode: string) => void;
  onTemplateSelect: (template: CampaignTemplate) => void;
  onStartBlank?: () => void;
};

export function CampaignTemplateLibraryPanel({
  library,
  step,
  activeCategory,
  selectedTemplateId,
  onCategorySelect,
  onTemplateSelect,
  onStartBlank,
}: Props) {
  const t = useTranslations("admin.campaigns");

  const category = useMemo(
    () => library.categories.find((c) => c.code === activeCategory) ?? library.categories[0],
    [library.categories, activeCategory],
  );

  const categoryVisual = category ? CAMPAIGN_CATEGORY_VISUAL[category.code] : null;
  const CategoryIcon = categoryVisual?.icon;

  if (step === "category") {
    return (
      <div className="space-y-4 min-w-0" data-testid="campaign-category-step">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[var(--text-primary)]">{t("pickCategoryStep")}</p>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">{t("stepCategoryDesc")}</p>
          </div>
          {onStartBlank ? (
            <button type="button" onClick={onStartBlank} className={btnSecondarySm}>
              {t("startFromScratch")}
            </button>
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {library.categories.map((cat) => {
            const visual = CAMPAIGN_CATEGORY_VISUAL[cat.code];
            const Icon = visual.icon;
            return (
              <button
                key={cat.code}
                type="button"
                onClick={() => onCategorySelect(cat.code)}
                className={cn(
                  "flex flex-col items-start gap-2 rounded-xl border p-3 text-left transition-all touch-manipulation min-h-[5.5rem]",
                  "shadow-sm hover:shadow-md border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border-brand)]",
                )}
              >
                <span className={cn("flex h-9 w-9 items-center justify-center rounded-lg shrink-0", visual.tileBg)}>
                  <Icon className={cn("h-4 w-4", visual.tileIcon)} aria-hidden />
                </span>
                <span className="text-xs font-bold leading-snug text-[var(--text-primary)] line-clamp-2">{cat.label}</span>
                <span className="text-[10px] font-semibold text-[var(--text-tertiary)]">
                  {t("templateCountLabel", { count: cat.templates.length })}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 min-w-0" data-testid="campaign-template-step">
      {category && categoryVisual && CategoryIcon ? (
        <div
          className={cn(
            "flex items-start gap-3 rounded-xl border border-[var(--border-brand)] p-3.5",
            categoryVisual.cardBg,
          )}
        >
          <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", categoryVisual.tileBg)}>
            <CategoryIcon className={cn("h-5 w-5", categoryVisual.tileIcon)} aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-bold text-[var(--text-primary)]">{category.label}</p>
            <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">{category.description}</p>
          </div>
        </div>
      ) : null}

      <div className="space-y-2">
        <p className="text-sm font-semibold text-[var(--text-primary)]">
          {t("pickTemplateStep", { count: category?.templates.length ?? 0 })}
        </p>
        <p className="text-xs text-[var(--text-secondary)]">{t("stepTemplatePickHint")}</p>

        <div className="max-h-[min(24rem,55vh)] overflow-y-auto overscroll-y-contain rounded-xl border border-[var(--border)] bg-[var(--surface-muted)]/30 p-2">
          <div className="space-y-2">
            {category?.templates.map((template) => {
              const selected = selectedTemplateId === template.id;
              const visual = categoryVisual ?? CAMPAIGN_CATEGORY_VISUAL.WINBACK;
              return (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => onTemplateSelect(template)}
                  className={cn(
                    "w-full flex items-stretch gap-3 rounded-xl border p-3.5 text-left transition-all touch-manipulation",
                    "shadow-sm hover:shadow-md",
                    selected
                      ? "border-[var(--brand)] bg-[var(--brand-light)] ring-2 ring-[var(--brand-ring)]"
                      : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border-brand)]",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl self-start",
                      visual.cardBg,
                    )}
                  >
                    <Sparkles className={cn("h-4 w-4", visual.cardIcon)} aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-bold leading-snug text-[var(--text-primary)]">{template.name}</p>
                      {selected ? (
                        <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--brand)] text-white">
                          <Check className="h-3 w-3" strokeWidth={3} aria-hidden />
                        </span>
                      ) : (
                        <ChevronRight className="h-4 w-4 shrink-0 self-center text-[var(--text-tertiary)]" aria-hidden />
                      )}
                    </div>
                    <p className="text-xs leading-relaxed text-[var(--text-secondary)]">{template.description}</p>
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1",
                        visual.badge,
                      )}
                    >
                      {template.goal}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
