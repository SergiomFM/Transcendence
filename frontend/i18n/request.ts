import { getRequestConfig } from "next-intl/server";
import { cookies, headers } from "next/headers";

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const headerStore = await headers();

  // Try to get locale from cookie first, then header, then default to 'en'
  let locale =
    cookieStore.get("locale")?.value ||
    headerStore.get("accept-language")?.split(",")[0]?.split("-")[0] ||
    "en";

  // Validate locale
  const supportedLocales = ["en", "pt", "cv"];
  if (!supportedLocales.includes(locale)) {
    locale = "en";
  }

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
