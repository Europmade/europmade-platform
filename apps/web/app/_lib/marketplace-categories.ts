/**
 * Tijdelijke compatibility mapping van de 30 EuropMade-slugs (Blueprint H14.8).
 *
 * Canonieke taxonomie = `pc_category` (ADR-0042). Deze lijst is geen bron van
 * waarheid voor bestaan/404; die komt uit Product Cloud.
 * Nav, SSG-params, affiliate-filters en i18n-labels mogen deze 30 slugs blijven
 * gebruiken zodat bestaande routes niet breken als de store-API even wegvalt.
 */

export type MarketplaceCategory = {
  slug: string
  label: string
  /** Toon op Homepage-sectie "Populaire categorieën". */
  popular?: boolean
}

export const MARKETPLACE_CATEGORIES: MarketplaceCategory[] = [
  { slug: "tuin", label: "Tuin", popular: true },
  { slug: "elektronica", label: "Elektronica", popular: true },
  { slug: "kleding", label: "Kleding", popular: true },
  { slug: "mode", label: "Mode" },
  { slug: "wonen", label: "Wonen", popular: true },
  { slug: "sport", label: "Sport", popular: true },
  { slug: "voeding", label: "Voeding", popular: true },
  { slug: "keuken", label: "Keuken" },
  { slug: "huishouden", label: "Huishouden" },
  { slug: "beauty-verzorging", label: "Beauty & Verzorging" },
  { slug: "baby-kind", label: "Baby & Kind" },
  { slug: "speelgoed", label: "Speelgoed" },
  { slug: "dieren", label: "Dieren" },
  { slug: "klus-gereedschap", label: "Klus & Gereedschap" },
  { slug: "auto-motor", label: "Auto & Motor" },
  { slug: "kantoor", label: "Kantoor" },
  { slug: "boeken-media", label: "Boeken & Media" },
  { slug: "gezondheid", label: "Gezondheid" },
  { slug: "verlichting", label: "Verlichting" },
  { slug: "badkamer", label: "Badkamer" },
  { slug: "slaapkamer", label: "Slaapkamer" },
  { slug: "outdoor", label: "Outdoor" },
  { slug: "duurzaam", label: "Duurzaam" },
  { slug: "cadeaus", label: "Cadeaus" },
  { slug: "juwelen-horloges", label: "Juwelen & Horloges" },
  { slug: "tassen-accessoires", label: "Tassen & Accessoires" },
  { slug: "schoenen", label: "Schoenen" },
  { slug: "plant-bloem", label: "Plant & Bloem" },
  { slug: "feest-seizoen", label: "Feest & Seizoen" },
  { slug: "ambacht", label: "Ambacht" },
  { slug: "algemeen", label: "Algemeen" },
]

export function findMarketplaceCategory(slug: string): MarketplaceCategory | null {
  return MARKETPLACE_CATEGORIES.find((c) => c.slug === slug) ?? null
}

export const POPULAR_MARKETPLACE_CATEGORIES = MARKETPLACE_CATEGORIES.filter(
  (c) => c.popular
)

export const CANONICAL_STOREFRONT_SLUGS = MARKETPLACE_CATEGORIES.map(
  (c) => c.slug
)

/** Nav-set: alleen de 30 slugs die al als `pc_category` bestaan; anders compatibility-fallback. */
export function canonicalNavCategories(
  productCloud: Array<{ slug: string | null; name: string }> | null
): MarketplaceCategory[] {
  if (!productCloud) return MARKETPLACE_CATEGORIES
  const bySlug = new Map(
    productCloud
      .filter((c): c is { slug: string; name: string } => Boolean(c.slug))
      .map((c) => [c.slug, c])
  )
  const fromPc = MARKETPLACE_CATEGORIES.map((c) => {
    const hit = bySlug.get(c.slug)
    if (!hit) return null
    return { ...c, label: hit.name || c.label }
  }).filter((c): c is MarketplaceCategory => c != null)
  return fromPc.length > 0 ? fromPc : MARKETPLACE_CATEGORIES
}
