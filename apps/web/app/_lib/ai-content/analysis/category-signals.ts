/**
 * Category signal analysis — drives unique AI copy (not blank templates).
 */

import type { ListingProduct } from "../../listing-products"
import type { ResolvedCategoryFilterGroup } from "../../cms/resolve-category"
import type {
  AiContentAnalysisContext,
  AiContentFilterSignal,
  AiContentSignalProduct,
} from "../types"

/** Focus topics derived from category taxonomy + catalog — e.g. laptops ≠ TVs. */
const FOCUS_BY_SLUG: Record<string, string[]> = {
  elektronica: [
    "processor",
    "geheugen",
    "scherm",
    "batterij",
    "gewicht",
    "draadloos",
    "bluetooth",
    "USB-C",
    "energieklasse",
  ],
  tuin: [
    "maaibreedte",
    "accu",
    "oppervlakte",
    "elektrisch",
    "onderhoud",
    "weerbestendigheid",
    "geluidsniveau",
  ],
  wonen: ["materiaal", "kleur", "binnen/buiten", "afmetingen", "duurzaamheid"],
  mode: ["maat", "materiaal", "pasvorm", "seizoen", "onderhoud", "herkomst"],
  voeding: [
    "biologisch",
    "vegan",
    "glutenvrij",
    "herkomst",
    "houdbaarheid",
    "smaakprofiel",
  ],
  sport: ["pasvorm", "demping", "ademendheid", "gebruik", "duurzaamheid"],
  keuken: ["materiaal", "hittebestendigheid", "onderhoud", "veiligheid"],
  schoenen: ["maat", "materiaal", "zool", "comfort", "weer"],
  outdoor: ["weerbestendigheid", "gewicht", "pakbaarheid", "duurzaamheid"],
  verlichting: ["lichtsterkte", "energieklasse", "montage", "kleurtemperatuur"],
  huishouden: ["zuigkracht", "filter", "geluid", "onderhoud", "accu"],
  kantoor: ["ergonomie", "aansluitingen", "ruisonderdrukking", "draagbaarheid"],
}

const DEFAULT_FOCUS = [
  "kwaliteit",
  "herkomst",
  "Verified™",
  "prijs-kwaliteit",
  "duurzaamheid",
  "garantie",
]

function toSignalProduct(p: ListingProduct): AiContentSignalProduct {
  return {
    title: p.title,
    brand: p.brand,
    seller: p.seller,
    countryCode: p.countryCode,
    countryLabel: p.countryLabel,
    verified: p.verified,
    features: p.features,
    keywords: p.keywords,
    priceCents: p.priceCents,
    rating: p.rating,
  }
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))]
}

/**
 * Infer extra focus topics from product titles/features (subcategory awareness).
 */
function inferFocusFromProducts(
  products: ListingProduct[],
  base: string[]
): string[] {
  const hay = products
    .map((p) =>
      [p.title, ...p.features, ...p.keywords].join(" ").toLowerCase()
    )
    .join(" ")
  const extras: string[] = []
  const rules: [RegExp, string][] = [
    [/laptop|notebook/, "processor"],
    [/laptop|notebook/, "geheugen"],
    [/laptop|notebook/, "batterij"],
    [/koptelefoon|headphone|headset/, "ruisonderdrukking"],
    [/koptelefoon|headphone/, "bluetooth"],
    [/robotmaaier|maaier/, "maaibreedte"],
    [/robotmaaier|maaier/, "accu"],
    [/stoel|fauteuil/, "ergonomie"],
    [/stofzuiger|vacuum/, "zuigkracht"],
    [/lamp|verlicht/, "lichtsterkte"],
  ]
  for (const [re, topic] of rules) {
    if (re.test(hay) && !base.includes(topic) && !extras.includes(topic)) {
      extras.push(topic)
    }
  }
  return [...base, ...extras].slice(0, 10)
}

export function analyzeCategorySignals(input: {
  slug: string
  label: string
  products: ListingProduct[]
  filterGroups?: ResolvedCategoryFilterGroup[]
  relatedCategorySlugs?: string[]
  relatedCategoryLabels?: string[]
}): AiContentAnalysisContext {
  const products = input.products.map(toSignalProduct)
  const brands = unique(products.map((p) => p.brand))
  const producers = unique(products.map((p) => p.seller))
  const productionCountries = unique(products.map((p) => p.countryLabel))
  const verifiedCount = products.filter((p) => p.verified).length
  const verifiedRatio =
    products.length === 0 ? 1 : verifiedCount / products.length

  const filters: AiContentFilterSignal[] = (input.filterGroups ?? []).map(
    (g) => ({
      attributeKey: g.attributeKey,
      label: g.label,
      values: g.options.map((o) => o.label),
    })
  )

  const filterTopics = filters.flatMap((f) => [f.label, ...f.values.slice(0, 3)])
  const baseFocus = FOCUS_BY_SLUG[input.slug] ?? DEFAULT_FOCUS
  const focusTopics = unique([
    ...inferFocusFromProducts(input.products, baseFocus),
    ...filterTopics,
  ]).slice(0, 12)

  return {
    entityType: "category",
    entityId: input.slug,
    label: input.label,
    parentLabel: null,
    products,
    filters,
    relatedCategorySlugs: input.relatedCategorySlugs ?? [],
    relatedCategoryLabels: input.relatedCategoryLabels ?? [],
    focusTopics,
    productionCountries,
    brands,
    producers,
    verifiedRatio,
    productCount: products.length,
  }
}
