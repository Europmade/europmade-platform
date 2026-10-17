import { mergeSellerOverPlatform } from "@europmade/utils"
import type { StorefrontLocale } from "../i18n/locales"
import type { StorefrontAdCreative } from "../storefront-ads"
import type { LiveAdSlot } from "../advertising-live-slots"
import { CTA_LABELS_NL } from "../advertising-public"

/**
 * A live seller campaign replaces the platform banner on that placement.
 * When nothing is live, the platform banners stay as they are.
 */
export function mergePaidHomepageBanners(
  platform: StorefrontAdCreative[],
  paid: LiveAdSlot[],
  _locale: StorefrontLocale
): StorefrontAdCreative[] {
  const seller = paid[0]
  if (!seller) return platform
  const presentation = seller.banner_presentation
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
    imageFit: "cover",
    imagePosition: presentation
      ? `${presentation.imagePositionX}% ${presentation.imagePositionY}%`
      : "50% 50%",
    textColor: presentation?.textColor,
    buttonColor: presentation?.textColor,
    logoSrc: seller.logo_url,
    designKey: seller.design_key,
    overlayAlign: presentation?.overlayAlign,
    logoScale: presentation?.logoScale,
    previewOnly: Boolean(seller.preview),
    productIds: seller.product_ids ?? [],
    status: "Actief",
    source: "seller",
  }
  return mergeSellerOverPlatform(platform, paidCreative)
}
