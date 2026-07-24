export const LOCALE_COOKIE = "NEXT_LOCALE";

/** BCP-47 locale codes for Indian regional languages (Phase 2). */
export const locales = [
  "en-IN",
  "hi-IN",
  "pa-IN",
  "bn-IN",
  "gu-IN",
  "mr-IN",
  "kn-IN",
  "te-IN",
  "ta-IN",
  "ml-IN",
] as const;

export type AppLocale = (typeof locales)[number];

export const defaultLocale: AppLocale = "en-IN";

/** Locales that use Indic script fonts (not Latin-only). */
export const indicLocales: readonly AppLocale[] = locales.filter((l) => l !== "en-IN");

export function isAppLocale(value: string): value is AppLocale {
  return (locales as readonly string[]).includes(value);
}

export function resolveLocale(value?: string | null): AppLocale {
  if (value && isAppLocale(value)) return value;
  return defaultLocale;
}

/** CSS font variable applied per locale script. */
export function localeFontVariable(locale: string): string {
  switch (locale) {
    case "hi-IN":
    case "mr-IN":
      return "var(--font-devanagari)";
    case "kn-IN":
      return "var(--font-kannada)";
    case "gu-IN":
      return "var(--font-gujarati)";
    case "ta-IN":
      return "var(--font-tamil)";
    case "te-IN":
      return "var(--font-telugu)";
    case "bn-IN":
      return "var(--font-bengali)";
    case "ml-IN":
      return "var(--font-malayalam)";
    case "pa-IN":
      return "var(--font-gurmukhi)";
    default:
      return "var(--font-inter)";
  }
}
