/**
 * Storefront advertenties — CMP-033.
 * Banners kunnen linken naar product, categorie, partner, collectie of externe URL.
 * Extra copy-velden zijn frontend/CMS-klaar (geen backend).
 */

export type AdPosition = 1 | 2

export type BannerLinkType =
  | "product"
  | "category"
  | "partner"
  | "collection"
  | "external"

export type StorefrontAdCreative = {
  id: string
  position: AdPosition
  location: "homepage" | "category" | "search" | "product"
  title: string
  /** Grote kop op de banner. */
  headline: string
  description: string
  ctaLabel: string
  href: string
  linkType: BannerLinkType
  imageSrc: string
  imageAlt: string
  status: "Actief" | "Gepland" | "Afgerond"
  /** CSS background for campaign panel (CMS). */
  background?: string
  /** Optional manufacturer logo URL. */
  logoSrc?: string | null
  /** Optional production country label (category banners). */
  productionCountryLabel?: string | null
  /** Optional Verified™ badge on banner (CMS). */
  showVerifiedBadge?: boolean
  activeFrom?: string | null
  activeTo?: string | null
  /** Paid seller campaign vs platform CMS banner. */
  source?: "platform" | "seller"
}

const PUBLISHED_ADS: StorefrontAdCreative[] = [
  {
    id: "ban_01",
    position: 1,
    location: "homepage",
    title: "Zomer Hero — Europese makers",
    headline: "Europese tuin, rechtstreeks van de makers",
    description:
      "Vergelijk Verified™ aanbieders en kies de beste totale deal — nooit gesponsord.",
    ctaLabel: "Ontdek tuin",
    href: "/categorie/tuin",
    linkType: "category",
    imageSrc: "",
    imageAlt: "Advertentie: Europese tuinproducten",
    status: "Actief",
    background:
      "linear-gradient(135deg, #f4f7f2 0%, #e6efe4 45%, #d8e8d6 100%)",
  },
  {
    id: "ban_02",
    position: 2,
    location: "homepage",
    title: "Partner spotlight VerdeTech",
    headline: "Partner spotlight: VerdeTech",
    description:
      "EU Verified assortiment van een Nederlandse producent — ontdek hun collectie.",
    ctaLabel: "Bekijk partner",
    href: "/merk/verdetech",
    linkType: "partner",
    imageSrc: "",
    imageAlt: "Advertentie: Partner VerdeTech",
    status: "Actief",
    background:
      "linear-gradient(135deg, #f3f6fb 0%, #e4ebf6 45%, #d4e0f0 100%)",
  },
  {
    id: "ban_cat_01",
    position: 1,
    location: "category",
    title: "Collectie robotmaaiers",
    headline: "Collectie robotmaaiers",
    description: "Vergelijk Europese merken op prijs, levertijd en reviews.",
    ctaLabel: "Bekijk collectie",
    href: "/zoeken?q=robotmaaier&collectie=robotmaaiers",
    linkType: "collection",
    imageSrc: "",
    imageAlt: "Advertentie: Collectie robotmaaiers",
    status: "Actief",
    background:
      "linear-gradient(135deg, #f5f6f8 0%, #e8ebf0 45%, #dce2ea 100%)",
  },
]

export function resolveBannerHref(
  ad: Pick<StorefrontAdCreative, "href" | "linkType">
): string {
  return ad.href
}

export function resolveStorefrontAd(options: {
  position: AdPosition
  location?: StorefrontAdCreative["location"]
}): StorefrontAdCreative | null {
  const location = options.location ?? "homepage"
  return (
    PUBLISHED_ADS.find(
      (ad) =>
        ad.status === "Actief" &&
        ad.position === options.position &&
        ad.location === location
    ) ?? null
  )
}
