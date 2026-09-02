"use client";

import { useTranslations } from "next-intl";
import { Lightbulb } from "lucide-react";
import { RecommendationsResponse } from "@/lib/api";
import { recommendationsToSpotlightItems } from "@/lib/insights-utils";
import { SpotlightDeck, SpotlightSection } from "@/components/SpotlightDeck";
import { PanelShell, PageLoader } from "@/components/enterprise-ui";

interface RecommendationsPanelProps {
  data?: RecommendationsResponse;
  loading?: boolean;
  variant?: "ceo" | "manager";
  compact?: boolean;
}

export function RecommendationsPanel({
  data,
  loading,
  variant = "ceo",
  compact = false,
}: RecommendationsPanelProps) {
  const t = useTranslations("components.recommendationsPanel");
  const items = recommendationsToSpotlightItems(data);

  if (compact) {
    if (loading) {
      return (
        <SpotlightSection title={t("title")} icon={Lightbulb} iconVariant="metrics">
          <SpotlightDeck items={[]} loading revealHint={t("revealHint")} />
        </SpotlightSection>
      );
    }

    if (items.length === 0) {
      return (
        <SpotlightSection title={t("title")} icon={Lightbulb} iconVariant="metrics">
          <p className="px-3 pb-3 pt-2 text-xs text-[var(--text-secondary)]">{t("empty")}</p>
        </SpotlightSection>
      );
    }

    return (
      <SpotlightSection title={t("title")} icon={Lightbulb} iconVariant="metrics" count={items.length}>
        <SpotlightDeck items={items} revealHint={t("revealHint")} />
      </SpotlightSection>
    );
  }

  if (loading) {
    return (
      <PanelShell title={t("title")} icon={Lightbulb} accent="brand">
        <PageLoader label={t("loading")} />
      </PanelShell>
    );
  }

  if (items.length === 0) {
    return (
      <PanelShell title={t("title")} icon={Lightbulb} accent="brand">
        <p className="text-sm text-[var(--text-secondary)]">{t("empty")}</p>
      </PanelShell>
    );
  }

  return (
    <PanelShell
      title={t("title")}
      subtitle={variant === "manager" ? t("managerSubtitle") : t("ceoSubtitle")}
      icon={Lightbulb}
      accent="brand"
      padding={false}
    >
      <SpotlightDeck items={items} revealHint={t("revealHint")} className="px-4 pb-4 pt-3" />
    </PanelShell>
  );
}
