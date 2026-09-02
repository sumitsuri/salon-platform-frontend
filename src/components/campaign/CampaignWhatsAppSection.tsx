"use client";

import { useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { AlertCircle, ExternalLink } from "lucide-react";
import { api } from "@/lib/api";
import { WhatsAppBubblePreview } from "@/components/whatsapp/WhatsAppBubblePreview";
import { PageLoader } from "@/components/ui";
import { cn } from "@/lib/utils";

const PROMO_CODE = "PROMO_CAMPAIGN" as const;

export function useCampaignWhatsAppPromoTemplate() {
  const { data: templates = [] } = useQuery({
    queryKey: ["whatsapp-templates-campaign"],
    queryFn: () => api.getWhatsAppTemplates({ category: "MARKETING" }),
    staleTime: 60_000,
  });
  return templates.find((tpl) => tpl.code === PROMO_CODE);
}

/** One-line delivery template status — no preview, no long copy. */
export function CampaignWhatsAppStatusStrip({ messagingReady }: { messagingReady: boolean }) {
  const t = useTranslations("admin.campaigns");
  const promoTemplate = useCampaignWhatsAppPromoTemplate();
  const templateActive = promoTemplate?.active ?? false;
  const hasIssue = !messagingReady || !templateActive;

  return (
    <div className={cn("campaign-wa-status-strip", hasIssue && "campaign-wa-status-strip--warn")}>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-[var(--text-primary)] truncate">
          {t("whatsAppDeliveryLabel")} · {promoTemplate?.msg91TemplateName ?? "—"}
        </p>
        {hasIssue ? (
          <p className="text-[11px] text-amber-800 dark:text-amber-200 mt-0.5 line-clamp-2">
            {!messagingReady ? t("sendDisabledMessaging") : t("whatsAppTemplateDisabled")}
          </p>
        ) : (
          <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5">{t("whatsAppDeliveryHint")}</p>
        )}
      </div>
      <Link
        href="/admin/whatsapp-templates"
        className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-[var(--brand-text)] shrink-0"
      >
        {t("whatsAppTemplateLink")}
        <ExternalLink className="h-3 w-3" />
      </Link>
      {hasIssue ? <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" aria-hidden /> : null}
    </div>
  );
}

/** Compact WhatsApp bubble for the sticky preview dock. */
export function CampaignWhatsAppMessagePreview({
  offerText,
  active,
}: {
  offerText: string;
  active: boolean;
}) {
  const t = useTranslations("admin.campaigns");
  const tCommon = useTranslations("common");

  const preview = useMutation({
    mutationFn: () =>
      api.previewWhatsAppTemplate(PROMO_CODE, {
        variableOverrides: {
          offerText: offerText.trim() || "20% off this weekend!",
        },
      }),
  });

  useEffect(() => {
    if (!active || !offerText.trim()) return;
    const timer = setTimeout(() => preview.mutate(), 250);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, offerText]);

  if (!active) return null;

  return (
    <div className="campaign-preview-dock-inner">
      <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] mb-2">
        {t("previewMessage")}
      </p>
      {preview.isPending && !preview.data ? (
        <PageLoader label={tCommon("loading")} />
      ) : preview.data ? (
        <WhatsAppBubblePreview bodyText={preview.data.bodyText} compact />
      ) : null}
    </div>
  );
}
