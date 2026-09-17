import { getRequestConfig } from "next-intl/server";
import { appTimeZone, defaultLocale } from "./config";
import { loadMessages } from "./load-messages";

export default getRequestConfig(async () => {
  const locale = defaultLocale;
  return {
    locale,
    timeZone: appTimeZone,
    messages: await loadMessages(locale),
  };
});
