import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { defaultLocale, resolveLocale } from "./config";

async function loadMessages(locale: string) {
  const en = (await import("../../messages/en-IN.json")).default;

  if (locale === "en-IN") {
    return en;
  }

  const localized = (await import(`../../messages/${locale}.json`)).default;
  // Regional files are complete; deep-merge en-IN only for any future keys added before translation catch-up.
  return deepMerge(en, localized);
}

function deepMerge<T extends Record<string, unknown>>(base: T, override: Record<string, unknown>): T {
  const result = { ...base } as Record<string, unknown>;
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
      result[key] = deepMerge(baseVal as Record<string, unknown>, overrideVal as Record<string, unknown>);
    } else if (overrideVal !== undefined) {
      result[key] = overrideVal;
    }
  }
  return result as T;
}

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const locale = resolveLocale(cookieStore.get("NEXT_LOCALE")?.value);
  return {
    locale,
    messages: await loadMessages(locale),
  };
});
