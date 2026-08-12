import Link from "next/link"
import {
  DEFAULT_STOREFRONT_LOCALE,
  type StorefrontLocale,
} from "../../_lib/i18n/locales"
import { t, type StorefrontMessageKey } from "../../_lib/i18n/messages"

type FooterCol = {
  titleKey: StorefrontMessageKey
  links: Array<{ labelKey: StorefrontMessageKey; href: string }>
}

const FOOTER_COLUMNS: FooterCol[] = [
  {
    titleKey: "footerColEuropMade",
    links: [
      { labelKey: "footerAbout", href: "/over" },
      { labelKey: "footerWhyBuy", href: "/waarom-kopen" },
      { labelKey: "footerMadeInEurope", href: "/made-in-europe" },
      { labelKey: "footerContact", href: "/klantenservice" },
      { labelKey: "footerCareers", href: "/werken-bij" },
    ],
  },
  {
    titleKey: "footerColCustomers",
    links: [
      { labelKey: "footerOrdering", href: "/klantenservice#bestellen" },
      { labelKey: "footerShipping", href: "/klantenservice#verzenden" },
      { labelKey: "footerReturns", href: "/klantenservice#retour" },
    ],
  },
  {
    titleKey: "footerColPartners",
    links: [
      { labelKey: "footerSell", href: "/waarom-verkopen" },
      { labelKey: "footerWhySell", href: "/waarom-verkopen" },
      { labelKey: "footerAffiliate", href: "/affiliate" },
    ],
  },
  {
    titleKey: "footerColLegal",
    links: [
      { labelKey: "footerPrivacy", href: "/juridisch/privacybeleid" },
      { labelKey: "footerCookies", href: "/cookie-preferences" },
      { labelKey: "footerTerms", href: "/juridisch/algemene-voorwaarden" },
    ],
  },
]

/**
 * CMP-002 Footer — locale-aware link labels (brand/product names unchanged).
 */
export function SiteFooter({
  locale = DEFAULT_STOREFRONT_LOCALE,
}: {
  locale?: StorefrontLocale
}) {
  const currency = "€"
  return (
    <footer role="contentinfo" className="border-t border-wf-200 bg-white">
      <div className="grid gap-4 px-4 py-4 tablet:grid-cols-2 tablet:gap-5 tablet:px-8 desktop:grid-cols-4">
        {FOOTER_COLUMNS.map((col) => (
          <div key={col.titleKey}>
            <h2 className="mb-1.5 text-[12px] font-bold tracking-tight text-wf-900">
              {t(col.titleKey, locale)}
            </h2>
            <ul className="space-y-1">
              {col.links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-[11.5px] text-wf-600 transition hover:text-wf-900 hover:underline"
                  >
                    {t(link.labelKey, locale)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-wf-200 px-4 py-2.5 text-[11px] text-wf-500 tablet:px-8">
        <p>© EuropMade</p>
        <p aria-label="Current locale">
          {locale.toUpperCase()} · {currency}
        </p>
      </div>
    </footer>
  )
}
