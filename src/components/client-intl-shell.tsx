"use client";

import { NextIntlClientProvider } from "next-intl";
import { useEffect, useState } from "react";
import { defaultLocale, localeFontVariable, resolveLocale, type AppLocale } from "@/i18n/config";
import { getLocaleCookie } from "@/lib/locale-client";

type Messages = Record<string, unknown>;

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

    import(`../../messages/${cookieLocale}.json`)
      .then((mod) => {
        setLocale(cookieLocale);
        setMessages(mod.default as Messages);
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
