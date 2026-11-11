/**
 * Automatic category banner from brands that already have products here.
 * Copy comes from titles and descriptions. Missing logo, type or image means no banner.
 */

export type CategoryBannerSource = {
  brand?: string | null
  brandSlug?: string | null
  brandLogoUrl?: string | null
  brandPagePublished?: boolean
  imageUrl?: string | null
  slug?: string | null
  title?: string | null
  description?: string | null
  testCatalog?: boolean
}

export type CategoryBannerScene = "kitchen" | "laundry"

export type CategoryBrandBanner = {
  brandName: string
  brandSlug: string | null
  logoUrl: string
  scene: CategoryBannerScene
  headline: string
  subline: string
  productSlug: string | null
  productCount: number
  day: string
  index: number
  total: number
  reason: string
}

export type CategoryPlacementAd =
  | { kind: "sponsored"; reason: string }
  | { kind: "brand"; reason: string }
  | { kind: "none"; reason: string }

const TYPES: Array<{ pattern: RegExp; label: string; scene: CategoryBannerScene }> = [
  { pattern: /inbouwvaatwasser|vaatwasser|dishwasher/i, label: "vaatwasser", scene: "kitchen" },
  { pattern: /wasdroger|tumble dryer/i, label: "wasdroger", scene: "laundry" },
  { pattern: /wasmachine|washing machine/i, label: "wasmachine", scene: "laundry" },
  { pattern: /\boven\b/i, label: "oven", scene: "kitchen" },
  { pattern: /koelkast|refrigerator/i, label: "koelkast", scene: "kitchen" },
]

function stableIndex(seed: string, count: number): number {
  let hash = 0
  for (let i = 0; i < seed.length; i += 1) {
    hash = (Math.imul(hash, 33) + seed.charCodeAt(i)) >>> 0
  }
  return hash % count
}

function clean(value: string | null | undefined): string {
  return String(value ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
}

function seriesOf(text: string): string | null {
  const match = text.match(/serie[s]?\s*(\d+)/i)
  return match ? `Serie ${match[1]}` : null
}

function typeOf(text: string): { label: string; scene: CategoryBannerScene } | null {
  return TYPES.find((row) => row.pattern.test(text)) ?? null
}

function plural(label: string, count: number): string {
  if (count === 1) return label
  if (label === "vaatwasser") return "vaatwassers"
  if (label === "wasmachine") return "wasmachines"
  if (label === "wasdroger") return "wasdrogers"
  if (label === "koelkast") return "koelkasten"
  return `${label}s`
}

function sublineFromDescription(description: string): string {
  const plain = clean(description)
  if (!plain) return ""
  const afterIs = plain.split(/\s+is\s+/i)[1]
  const source = (afterIs || plain).split(/[.!?]|\s+en\s+/i)[0] ?? plain
  let line = source.replace(/^\s*(een|de|het)\s+/i, "").trim()
  if (!line) return ""
  line = line.charAt(0).toUpperCase() + line.slice(1)
  line = line.replace(/(\d)\s*cm\b/gi, "$1 cm")
  if (line.length > 110) line = `${line.slice(0, 107).replace(/\s+\S*$/, "")}…`
  else if (!/[.!?…]$/.test(line)) line = `${line}.`
  return line
}

function sharedMeasure(titles: string[]): string | null {
  const measures = titles.map((title) => title.match(/(\d+(?:[.,]\d+)?)\s*kg\b/i)?.[1] ?? null)
  if (measures.length > 0 && measures.every((value) => value && value === measures[0])) {
    return `${measures[0]?.replace(".", ",")} kg`
  }
  const widths = titles.map((title) => title.match(/(\d+)\s*cm\b/i)?.[1] ?? null)
  if (widths.length > 0 && widths.every((value) => value && value === widths[0])) {
    return `${widths[0]} cm`
  }
  return null
}

type Focus = {
  name: string
  slug: string | null
  published: boolean
  logoUrl: string
  count: number
  sellable: boolean
  described: boolean
  series: string | null
  label: string
  scene: CategoryBannerScene
  headline: string
  subline: string
  productSlug: string | null
  score: number
}

function focusFor(name: string, products: readonly CategoryBannerSource[]): Focus | null {
  const logoUrl = products.map((product) => clean(product.brandLogoUrl)).find(Boolean) ?? ""
  if (!logoUrl) return null
  const known = products.flatMap((product) => {
    const text = `${clean(product.title)} ${clean(product.description)}`
    const kind = typeOf(text)
    if (!kind) return []
    return [{ product, kind, series: seriesOf(text), description: clean(product.description) }]
  })
  if (known.length === 0) return null
  const described = known.filter((row) => row.description)
  const pool = described.length > 0 ? described : known
  const seriesCounts = new Map<string, number>()
  for (const row of pool) {
    const key = row.series ?? ""
    seriesCounts.set(key, (seriesCounts.get(key) ?? 0) + 1)
  }
  const series = [...seriesCounts.entries()].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))[0]?.[0] || null
  const seriesPool = pool.filter((row) => (row.series ?? "") === (series ?? ""))
  const lead = seriesPool.find((row) => row.description) ?? seriesPool[0]
  if (!lead) return null
  const describedLead = Boolean(lead.description)
  const builtIn = /inbouw|geïntegreerd|geintegreerd/i.test(`${lead.product.title ?? ""} ${lead.product.description ?? ""}`)
  const label = builtIn && lead.kind.label === "vaatwasser"
    ? describedLead ? "inbouwvaatwasser" : "inbouwvaatwassers"
    : plural(lead.kind.label, describedLead ? 1 : seriesPool.length)
  const headline = [series, label].filter(Boolean).join(" ")
  const descriptionLine = sublineFromDescription(lead.description)
  const measure = sharedMeasure(seriesPool.map((row) => clean(row.product.title)))
  const subline =
    descriptionLine ||
    (measure ? `${label.charAt(0).toUpperCase()}${label.slice(1)} van ${measure}.` : `${seriesPool.length} ${label} in deze categorie.`)
  const sellable = products.some((product) => product.testCatalog !== true)
  return {
    name,
    slug: products.map((product) => clean(product.brandSlug)).find(Boolean) || null,
    published: products.some((product) => product.brandPagePublished === true),
    logoUrl,
    count: products.length,
    sellable,
    described: described.length > 0,
    series,
    label,
    scene: lead.kind.scene,
    headline,
    subline,
    productSlug: clean(lead.product.slug) || null,
    score: (described.length > 0 ? 50 : 0) + (sellable ? 20 : 0) + products.length,
  }
}

/** The best-documented brand with a logo. Equal scores rotate by UTC day. */
export function selectCategoryBrandBanner(
  products: readonly CategoryBannerSource[],
  categorySlug: string,
  now: Date
): CategoryBrandBanner | null {
  const groups = new Map<string, CategoryBannerSource[]>()
  for (const product of products) {
    const name = clean(product.brand)
    if (!name) continue
    const key = name.toLocaleLowerCase("nl")
    const list = groups.get(key) ?? []
    list.push(product)
    groups.set(key, list)
  }
  const ready = [...groups.entries()]
    .map(([key, rows]) => focusFor(rows.find((row) => clean(row.brand)) ? clean(rows[0]?.brand) : key, rows))
    .filter((row): row is Focus => Boolean(row))
    .sort((left, right) => right.score - left.score || left.name.localeCompare(right.name, "nl"))
  if (ready.length === 0) return null
  const best = ready[0]!.score
  const tied = ready.filter((row) => row.score === best)
  const day = now.toISOString().slice(0, 10)
  const index = stableIndex(`${categorySlug.trim().toLowerCase()}|${day}`, tied.length)
  const picked = tied[index]!
  const slug =
    picked.published && picked.slug && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(picked.slug)
      ? picked.slug
      : null
  const reason = `${picked.name} heeft een logo en ${picked.count} product${picked.count === 1 ? "" : "en"} in deze categorie. Tekst uit ${picked.described ? "de productomschrijving" : "de producttitel"}. ${picked.series ?? "Geen serie"}. Rotatie ${index + 1} van ${tied.length} op ${day}.`
  return {
    brandName: picked.name,
    brandSlug: slug,
    logoUrl: picked.logoUrl,
    scene: picked.scene,
    headline: picked.headline,
    subline: picked.subline,
    productSlug: picked.productSlug,
    productCount: picked.count,
    day,
    index,
    total: tied.length,
    reason,
  }
}

/** A live paid campaign hides the automatic brand banner. Neither means no banner. */
export function chooseCategoryPlacementAd(
  hasLiveCampaign: boolean,
  hasBrand: boolean
): CategoryPlacementAd {
  if (hasLiveCampaign) {
    return {
      kind: "sponsored",
      reason: "Actieve goedgekeurde campagne voor deze categorie of een subcategorie. De standaard merkbanner wordt onderdrukt.",
    }
  }
  if (hasBrand) {
    return {
      kind: "brand",
      reason: "Geen actieve betaalde campagne. Standaard merkbanner uit gekoppelde producten.",
    }
  }
  return {
    kind: "none",
    reason: "Geen actieve betaalde campagne en geen merk met logo en herkenbare producten in deze categorie.",
  }
}
