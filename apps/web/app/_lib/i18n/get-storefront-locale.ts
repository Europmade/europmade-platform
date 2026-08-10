import { cookies, headers } from "next/headers"
import { resolveStorefrontLocale } from "./detect-locale"
import { LOCALE_COOKIE, type StorefrontLocale } from "./locales"

/**
 * Server-only: resolve storefront locale.
 * Priority: valid `em_storefront_locale` cookie → Accept-Language → NL.
 * Auto-detection is not persisted (manual switcher owns cookie/localStorage).
 */
export async function getStorefrontLocaleFromCookies(): Promise<StorefrontLocale> {
  const cookieStore = await cookies()
  const headerStore = await headers()
  return resolveStorefrontLocale({
    cookieValue: cookieStore.get(LOCALE_COOKIE)?.value,
    acceptLanguage: headerStore.get("accept-language"),
  })
}
