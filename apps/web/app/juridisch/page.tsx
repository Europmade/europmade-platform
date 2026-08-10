import type { Metadata } from "next"
import {
  ContentNav,
  ContentPage,
} from "../_components/marketplace/content-page"
import { getStorefrontLocaleFromCookies } from "../_lib/i18n/get-storefront-locale"
import { t, type StorefrontMessageKey } from "../_lib/i18n/messages"

export const metadata: Metadata = {
  title: "Juridisch — EuropMade",
  description:
    "Voorwaarden, privacy, retouren, betalingen en overige juridische informatie.",
}

const LINKS: Array<{ href: string; labelKey: StorefrontMessageKey }> = [
  { href: "/juridisch/algemene-voorwaarden", labelKey: "legalTerms" },
  { href: "/juridisch/verzending", labelKey: "legalShipping" },
  { href: "/juridisch/retourneren", labelKey: "legalReturns" },
  { href: "/juridisch/betaalmethoden", labelKey: "legalPayments" },
  { href: "/juridisch/disclaimer", labelKey: "legalDisclaimer" },
  { href: "/juridisch/privacybeleid", labelKey: "legalPrivacy" },
  { href: "/juridisch/copyright", labelKey: "legalCopyright" },
  { href: "/juridisch/garanties", labelKey: "legalWarranty" },
  { href: "/juridisch/terugbetalingsbeleid", labelKey: "legalRefund" },
  { href: "/juridisch/contact", labelKey: "legalContact" },
]

export default async function JuridischIndexPage() {
  const locale = await getStorefrontLocaleFromCookies()
  const items = LINKS.map((link) => ({
    href: link.href,
    label: t(link.labelKey, locale),
  }))

  return (
    <ContentPage title={t("legalIndexTitle", locale)}>
      <p>{t("legalIndexIntro", locale)}</p>
      <ContentNav items={items} ariaLabel={t("onThisPage", locale)} />
    </ContentPage>
  )
}
