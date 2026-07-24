"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { api, type LocaleInfo } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { applyLocaleChange, getLocaleCookie, syncLocaleFromUser } from "@/lib/locale-client";
import { defaultLocale, type AppLocale } from "@/i18n/config";
import { FALLBACK_LOCALES } from "@/lib/locale-catalog";
import { LocalePickerList } from "@/components/LocalePickerList";
import { btnPrimary, btnSecondary } from "@/components/ui";

export function LanguagePickerModal() {
  const t = useTranslations("localePicker");
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const [locales, setLocales] = useState<LocaleInfo[]>(FALLBACK_LOCALES);
  const [selected, setSelected] = useState<AppLocale>("hi-IN");
  const [saving, setSaving] = useState(false);

  const open = !!user && user.preferredLocale == null;

  useEffect(() => {
    if (!open) return;
    api.getLocales().then(setLocales).catch(() => setLocales(FALLBACK_LOCALES));
  }, [open]);

  if (!open) return null;

  async function persistLocale(locale: AppLocale) {
    setSaving(true);
    try {
      const updated = await api.updateLocale(locale);
      setUser({
        ...user!,
        preferredLocale: updated.preferredLocale ?? locale,
      });
      applyLocaleChange(locale);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" data-testid="language-picker-modal">
      <div className="w-full max-w-md bg-[var(--surface)] rounded-2xl border border-[var(--border)] shadow-2xl p-6 space-y-4">
        <div className="text-center">
          <h2 className="text-xl font-bold text-[var(--text-primary)]">{t("title")}</h2>
          <p className="text-sm text-[var(--text-secondary)] mt-1">{t("subtitle")}</p>
          <p className="text-xs text-[var(--text-tertiary)] mt-2">{t("groupedByState")}</p>
        </div>

        <LocalePickerList locales={locales} selected={selected} onSelect={setSelected} />

        <div className="flex flex-col gap-2">
          <button
            type="button"
            disabled={saving}
            onClick={() => persistLocale(selected)}
            className={`${btnPrimary} w-full`}
            data-testid="language-picker-confirm"
          >
            {saving ? "..." : t("confirm")}
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => persistLocale(defaultLocale)}
            className={`${btnSecondary} w-full text-sm`}
            data-testid="language-picker-english"
          >
            {t("continueEnglish")}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Sync locale cookie on hydrate when no cookie exists yet (e.g. first visit after login redirect). */
export function LocaleSync() {
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (!user?.preferredLocale) return;
    if (getLocaleCookie() !== null) return;
    syncLocaleFromUser(user.preferredLocale);
  }, [user?.preferredLocale]);

  return null;
}
