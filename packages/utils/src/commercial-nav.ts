/**
 * Commerciële storefront-hoofdnavigatie (Fase 5, tabblad 01_Categorie-doel).
 *
 * Dit is GEEN Product Cloud-taxonomie en GEEN vervanging van pc_category.
 * Bestaande pc_category-records blijven intact; deze lijst groepeert ze
 * alleen voor consumentennavigatie (fase5b-category-mapping.json leidend).
 *
 * Samengestelde groepen krijgen een eigen listing-slug die géén pc_category is.
 */

export type CommercialNavLabel = {
  nl: string
  en: string
  de: string
  fr: string
}

export type CommercialNavGroup = {
  /** Storefront path segment: /categorie/{key} */
  key: string
  label: CommercialNavLabel
  /**
   * Existing pc_category.slug values (mapping + documented hyphen aliases).
   * Never invent names; only slugs that already exist in Product Cloud / mapping.
   */
  pcSlugs: string[]
  /**
   * Optional Product Cloud product id kept for ranking snapshots only.
   * Storefront nav icons are admin-managed CMS media, never product photos.
   */
  featuredProductId?: string
}

/** Max once per 14 days; not realtime. */
export const COMMERCIAL_NAV_RANK_INTERVAL_DAYS = 14

/** Visitor ranking only when enough anonymous category sessions exist. */
export const COMMERCIAL_NAV_VISITOR_MIN_TOTAL = 50
export const COMMERCIAL_NAV_VISITOR_MIN_CATEGORIES = 6
export const COMMERCIAL_NAV_VISITOR_MIN_PER_CATEGORY = 5

export type CommercialNavSortMode = "product_count" | "visitors"

export const COMMERCIAL_NAV_GROUPS: CommercialNavGroup[] = [
  {
    key: "elektronica",
    label: {
      nl: "Elektronica",
      en: "Electronics",
      de: "Elektronik",
      fr: "Électronique",
    },
    pcSlugs: ["elektronica"],
  },
  {
    key: "verlichting",
    label: {
      nl: "Verlichting",
      en: "Lighting",
      de: "Beleuchtung",
      fr: "Éclairage",
    },
    pcSlugs: ["verlichting"],
  },
  {
    key: "huishouden",
    label: {
      nl: "Huishouden",
      en: "Household",
      de: "Haushalt",
      fr: "Maison",
    },
    pcSlugs: ["huishouden"],
  },
  {
    key: "keuken",
    label: {
      nl: "Keuken",
      en: "Kitchen",
      de: "Küche",
      fr: "Cuisine",
    },
    pcSlugs: ["keuken"],
  },
  {
    key: "wonen",
    label: {
      nl: "Wonen",
      en: "Home",
      de: "Wohnen",
      fr: "Habitat",
    },
    pcSlugs: ["wonen"],
  },
  {
    key: "kleding",
    label: {
      nl: "Kleding",
      en: "Clothing",
      de: "Kleidung",
      fr: "Vêtements",
    },
    pcSlugs: ["kleding", "mode"],
  },
  {
    key: "schoenen-lederwaren",
    label: {
      nl: "Schoenen & Lederwaren",
      en: "Shoes & Leather goods",
      de: "Schuhe & Lederwaren",
      fr: "Chaussures & Maroquinerie",
    },
    pcSlugs: ["schoenen", "tassen-en-accessoires", "tassen-accessoires"],
  },
  {
    key: "sport-outdoor",
    label: {
      nl: "Sport & Outdoor",
      en: "Sport & Outdoor",
      de: "Sport & Outdoor",
      fr: "Sport & Outdoor",
    },
    pcSlugs: ["sport", "outdoor"],
  },
  {
    key: "gereedschap-tuin",
    label: {
      nl: "Gereedschap & Tuin",
      en: "Tools & Garden",
      de: "Werkzeug & Garten",
      fr: "Outils & Jardin",
    },
    pcSlugs: ["tuin", "klus-en-gereedschap", "klus-gereedschap"],
  },
  {
    key: "kantoor-papierwaren",
    label: {
      nl: "Kantoor & Papierwaren",
      en: "Office & Stationery",
      de: "Büro & Papierwaren",
      fr: "Bureau & Papeterie",
    },
    pcSlugs: ["kantoor", "boeken-media", "ambacht"],
  },
  {
    key: "badkamer-verzorging",
    label: {
      nl: "Badkamer & Verzorging",
      en: "Bathroom & Personal care",
      de: "Bad & Pflege",
      fr: "Salle de bain & Soins",
    },
    pcSlugs: ["badkamer", "beauty-en-verzorging", "beauty-verzorging"],
  },
  {
    key: "speelgoed-kind",
    label: {
      nl: "Speelgoed & Kind",
      en: "Toys & Kids",
      de: "Spielzeug & Kind",
      fr: "Jouets & Enfant",
    },
    pcSlugs: ["speelgoed", "baby-en-kind", "baby-kind"],
  },
  {
    key: "huisdieren",
    label: {
      nl: "Huisdieren",
      en: "Pets",
      de: "Haustiere",
      fr: "Animaux",
    },
    pcSlugs: ["dieren"],
  },
]

export function findCommercialNavGroup(
  keyOrSlug: string
): CommercialNavGroup | null {
  const needle = keyOrSlug.trim().toLowerCase()
  if (!needle) return null
  return COMMERCIAL_NAV_GROUPS.find((g) => g.key === needle) ?? null
}

/** Catalog `category=` value: existing pc slugs, comma-separated. */
export function commercialCatalogCategoryParam(keyOrSlug: string): string | null {
  const group = findCommercialNavGroup(keyOrSlug)
  if (group) return group.pcSlugs.join(",")
  return null
}

export function isCommercialNavKey(slug: string): boolean {
  return COMMERCIAL_NAV_GROUPS.some((g) => g.key === slug.trim().toLowerCase())
}

export function pickCommercialNavLabel(
  group: CommercialNavGroup,
  locale?: string | null
): string {
  const loc = locale === "en" || locale === "de" || locale === "fr" ? locale : "nl"
  return group.label[loc] || group.label.nl
}

export function sortCommercialNavByProductCount<
  T extends { key: string; product_count: number },
>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    if (b.product_count !== a.product_count) return b.product_count - a.product_count
    return a.key.localeCompare(b.key)
  })
}

export function applyCommercialNavOrder<T extends { key: string }>(
  rows: T[],
  orderedKeys: string[]
): T[] {
  const map = new Map(rows.map((row) => [row.key, row]))
  const out: T[] = []
  for (const key of orderedKeys) {
    const hit = map.get(key)
    if (!hit) continue
    out.push(hit)
    map.delete(key)
  }
  for (const row of rows) {
    if (map.has(row.key)) out.push(row)
  }
  return out
}

export function visitorRankingReady(
  counts: Record<string, number>
): boolean {
  const values = COMMERCIAL_NAV_GROUPS.map((g) => counts[g.key] ?? 0)
  const total = values.reduce((sum, n) => sum + n, 0)
  const readyCats = values.filter(
    (n) => n >= COMMERCIAL_NAV_VISITOR_MIN_PER_CATEGORY
  ).length
  return (
    total >= COMMERCIAL_NAV_VISITOR_MIN_TOTAL &&
    readyCats >= COMMERCIAL_NAV_VISITOR_MIN_CATEGORIES
  )
}

export function commercialNavFeaturedProductId(key: string): string | null {
  const group = findCommercialNavGroup(key)
  const id = group?.featuredProductId?.trim()
  return id || null
}
