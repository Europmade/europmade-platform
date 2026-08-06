/**
 * Storefront advertenties — CMP-033.
 * Banners kunnen linken naar product, categorie, partner, collectie of externe URL.
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
  /** Resolved navigation target. */
  href: string
  linkType: BannerLinkType
  imageSrc: string
  imageAlt: string
  status: "Actief" | "Gepland" | "Afgerond"
}

function svgBanner(text: string, dark = true) {
  const bg = dark
    ? `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#1a1a1a"/><stop offset="1" stop-color="#4a4a4a"/></linearGradient></defs><rect width="1160" height="120" fill="url(#g)"/>`
    : `<rect width="1160" height="90" fill="#f0f0f0"/><rect x="1" y="1" width="1158" height="88" fill="none" stroke="#999" stroke-dasharray="6 4"/>`
  const fill = dark ? "#fff" : "#333"
  return (
    "data:image/svg+xml," +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="1160" height="${dark ? 120 : 90}" viewBox="0 0 1160 ${dark ? 120 : 90}">${bg}<text x="48" y="${dark ? 70 : 52}" fill="${fill}" font-family="system-ui,sans-serif" font-size="${dark ? 28 : 20}" font-weight="700">${text}</text></svg>`
    )
  )
}

/**
 * Gepubliceerde creatives — gekoppeld aan actieve bannerlocaties.
 * Wanneer advertentieplatform-API live is: vervang door API-response met dezelfde shape.
 */
const PUBLISHED_ADS: StorefrontAdCreative[] = [
  {
    id: "ban_01",
    position: 1,
    location: "homepage",
    title: "Zomer Hero — Europese makers",
    href: "/categorie/tuin",
    linkType: "category",
    imageSrc: svgBanner("Europese tuin — ontdek Verified™ makers"),
    imageAlt: "Advertentie: Europese tuinproducten",
    status: "Actief",
  },
  {
    id: "ban_02",
    position: 2,
    location: "homepage",
    title: "Partner spotlight VerdeTech",
    href: "/partner/verdetech",
    linkType: "partner",
    imageSrc: svgBanner("Partner: VerdeTech — EU Verified assortiment", false),
    imageAlt: "Advertentie: Partner VerdeTech",
    status: "Actief",
  },
  {
    id: "ban_cat_01",
    position: 1,
    location: "category",
    title: "Collectie robotmaaiers",
    href: "/zoeken?q=robotmaaier&collectie=robotmaaiers",
    linkType: "collection",
    imageSrc:
      "data:image/svg+xml," +
      encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" width="1160" height="100" viewBox="0 0 1160 100"><rect width="1160" height="100" fill="#222"/><text x="40" y="58" fill="#fff" font-family="system-ui,sans-serif" font-size="22" font-weight="700">Collectie robotmaaiers — vergelijken op EuropMade</text></svg>`
      ),
    imageAlt: "Advertentie: Collectie robotmaaiers",
    status: "Actief",
  },
]

/** Resolve banner destination — supports product/category/partner/collection/external. */
export function resolveBannerHref(ad: Pick<StorefrontAdCreative, "href" | "linkType">): string {
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
