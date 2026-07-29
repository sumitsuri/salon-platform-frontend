import { getRequestConfig } from "next-intl/server";
import { defaultLocale } from "./config";
import { loadMessages } from "./load-messages";

export default getRequestConfig(async () => {
  const locale = defaultLocale;
  return {
    locale,
    timeZone: "Asia/Kolkata",
    messages: await loadMessages(locale),
  };
});
