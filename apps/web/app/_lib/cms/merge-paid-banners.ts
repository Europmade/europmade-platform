import type { StorefrontLocale } from "../i18n/locales"
import type { StorefrontAdCreative } from "../storefront-ads"
import type { LiveAdSlot } from "../advertising-live-slots"
import { CTA_LABELS_NL } from "../advertising-public"

/**
 * Paid seller campaign wins the first homepage slot when live this week.
 * Otherwise keep platform CMS banners. Never inject mock ads.
 */
export function mergePaidHomepageBanners(
  platform: StorefrontAdCreative[],
  paid: LiveAdSlot[],
  _locale: StorefrontLocale
): StorefrontAdCreative[] {
  const seller = paid[0]
  if (!seller) return platform
  const paidCreative: StorefrontAdCreative = {
    id: String(seller.id),
    position: 1,
    location: "homepage",
    title: seller.headline || seller.name,
    headline: seller.headline || seller.name,
    description: seller.subline || "",
    ctaLabel: CTA_LABELS_NL[seller.cta_key] || "Bekijk",
    href: seller.destination_url || "/",
    linkType: "external",
    imageSrc: seller.image_url || "",
    imageAlt: seller.headline || seller.name,
    status: "Actief",
    source: "seller",
  }
  const rest = platform.filter((b) => b.position !== 1)
  return [paidCreative, ...rest]
}
