"use client";

import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { api, type WhatsAppTemplate, type WhatsAppTemplatePreview } from "@/lib/api";
import { WhatsAppBubblePreview } from "@/components/whatsapp/WhatsAppBubblePreview";
import { DetailField, PageLoader, SideSheet, StatusBadge, inputClass } from "@/components/ui";

export function WhatsAppTemplatePreviewSheet({
  template,
  onClose,
  initialOverrides,
}: {
  template: WhatsAppTemplate | null;
  onClose: () => void;
  initialOverrides?: Record<string, string>;
}) {
  const t = useTranslations("admin.whatsappTemplates");
  const tCommon = useTranslations("common");
  const [overrides, setOverrides] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!template) return;
    const next: Record<string, string> = {};
    for (const v of template.variables) {
      next[v.key] = initialOverrides?.[v.key] ?? v.sampleValue;
    }
    setOverrides(next);
  }, [template, initialOverrides]);

  const preview = useMutation({
    mutationFn: () =>
      api.previewWhatsAppTemplate(template!.code, {
        variableOverrides: overrides,
      }),
  });

  useEffect(() => {
    if (!template) return;
    const timer = setTimeout(() => preview.mutate(), 350);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template?.code, overrides]);

  const data: WhatsAppTemplatePreview | undefined = preview.data;

  return (
    <SideSheet
      open={!!template}
      onClose={onClose}
      wide
      title={template?.displayName ?? t("previewTitle")}
      subtitle={template ? `${template.msg91TemplateName} · ${t(`category.${template.category}`)}` : undefined}
    >
      {template && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2 items-center">
            <StatusBadge status={template.wired ? "COMPLETED" : "DRAFT"} />
            <span className="text-xs text-[var(--text-secondary)]">
              {template.active ? t("activeLabel") : t("inactiveLabel")}
            </span>
            {!template.wired && (
              <span className="text-xs text-amber-700 dark:text-amber-300">{t("plannedBadge")}</span>
            )}
          </div>

          <DetailField label={t("trigger")} value={template.triggerDescription} />

          <div>
            <p className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-2">
              {t("sampleVariables")}
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {template.variables.map((v) => (
                <label key={v.key} className="block space-y-1">
                  <span className="text-xs text-[var(--text-secondary)]">
                    {v.label} <span className="text-[var(--text-tertiary)]">{`{{${v.metaIndex}}}`}</span>
                  </span>
                  <input
                    className={inputClass}
                    value={overrides[v.key] ?? ""}
                    onChange={(e) => setOverrides((prev) => ({ ...prev, [v.key]: e.target.value }))}
                  />
                </label>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-2">
              {t("customerPreview")}
            </p>
            {preview.isPending && !data ? (
              <PageLoader label={tCommon("loading")} />
            ) : data ? (
              <WhatsAppBubblePreview
                bodyText={data.bodyText}
                headerPreview={data.headerPreview}
                hasDocumentHeader={data.hasDocumentHeader}
              />
            ) : null}
          </div>

          {data?.metaNote && (
            <p className="text-xs text-[var(--text-secondary)] rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2">
              {data.metaNote}
            </p>
          )}
        </div>
      )}
    </SideSheet>
  );
}
