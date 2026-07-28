"use client";

import { NextIntlClientProvider } from "next-intl";
import { useEffect, useState } from "react";
import { defaultLocale, localeFontVariable, resolveLocale, type AppLocale } from "@/i18n/config";
import { getLocaleCookie } from "@/lib/locale-client";
import enMessages from "../../messages/en-IN.json";

type Messages = Record<string, unknown>;

function deepMerge(base: Messages, override: Messages): Messages {
  const result: Messages = { ...base };
  for (const key of Object.keys(override)) {
    const baseVal = base[key];
    const overrideVal = override[key];
    if (
      overrideVal &&
      typeof overrideVal === "object" &&
      !Array.isArray(overrideVal) &&
      baseVal &&
      typeof baseVal === "object" &&
      !Array.isArray(baseVal)
    ) {
      result[key] = deepMerge(baseVal as Messages, overrideVal as Messages);
    } else if (overrideVal !== undefined) {
      result[key] = overrideVal;
    }
  }
  return result;
}

export function ClientIntlShell({
  children,
  initialLocale,
  initialMessages,
}: {
  children: React.ReactNode;
  initialLocale: AppLocale;
  initialMessages: Messages;
}) {
  const [locale, setLocale] = useState<AppLocale>(initialLocale);
  const [messages, setMessages] = useState<Messages>(initialMessages);

  useEffect(() => {
    const cookieLocale = resolveLocale(getLocaleCookie() ?? defaultLocale);
    if (cookieLocale === locale) return;

    if (cookieLocale === defaultLocale) {
      setLocale(cookieLocale);
      setMessages(enMessages as Messages);
      document.documentElement.lang = cookieLocale;
      document.body.style.fontFamily = `${localeFontVariable(cookieLocale)}, system-ui, sans-serif`;
      return;
    }

    import(`../../messages/${cookieLocale}.json`)
      .then((mod) => {
        setLocale(cookieLocale);
        setMessages(deepMerge(enMessages as Messages, mod.default as Messages));
        document.documentElement.lang = cookieLocale;
        const font = localeFontVariable(cookieLocale);
        document.body.style.fontFamily = `${font}, system-ui, sans-serif`;
      })
      .catch(() => undefined);
  }, [locale]);

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}
