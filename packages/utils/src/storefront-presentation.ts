export type BannerFit = "cover" | "contain"
export type BannerTone = "white" | "black"

export type BannerPresentation = {
  fit: BannerFit
  positionX: number
  positionY: number
  scale: number
  textColor: BannerTone
  buttonColor: BannerTone
}

export const DEFAULT_BANNER_PRESENTATION: BannerPresentation = {
  fit: "cover",
  positionX: 50,
  positionY: 50,
  scale: 1,
  textColor: "white",
  buttonColor: "white",
}

function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min
  return Math.min(max, Math.max(min, value))
}

function tone(value: unknown, fallback: BannerTone): BannerTone {
  return value === "white" || value === "black" ? value : fallback
}

export type ConfiguredBrandCard = {
  slug: string
  name: string
  description?: string
  image?: string | null
  logo?: string | null
  country?: string
}

export type BrandLogoPosition = "left" | "center" | "right"

export type BrandCardPresentation = {
  logoSize: number
  logoPosition: BrandLogoPosition
  textColor: string
  overlayStrength: number
}

const BRAND_TEXT_COLOR = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/

export function parseBrandCardPresentation(raw: unknown): BrandCardPresentation {
  const source =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {}
  const position = source.logoPosition
  const color = typeof source.textColor === "string" ? source.textColor.trim() : ""
  return {
    logoSize: clamp(Number(source.logoSize ?? 96), 48, 160),
    logoPosition:
      position === "center" || position === "right" || position === "left"
        ? position
        : "left",
    textColor: BRAND_TEXT_COLOR.test(color) ? color : "#111827",
    overlayStrength: clamp(Number(source.overlayStrength ?? 62), 0, 100),
  }
}

function filled(value: string | null | undefined): string {
  return typeof value === "string" ? value.trim() : ""
}

/**
 * Keep exactly the brands configured in the CMS.
 * A matching catalog record may fill a missing image, logo or name.
 * Catalog brands that are not configured are never added.
 */
export function selectConfiguredBrandSpotlights<T extends ConfiguredBrandCard>(
  configured: T[],
  catalog: ConfiguredBrandCard[] = []
): T[] {
  const bySlug = new Map(
    catalog
      .filter((row) => filled(row.slug))
      .map((row) => [filled(row.slug), row])
  )
  const out: T[] = []
  for (const item of configured) {
    const slug = filled(item.slug)
    const name = filled(item.name)
    const image = filled(item.image)
    const logo = filled(item.logo)
    if (!slug && !name && !image && !logo) continue
    const hit = slug ? bySlug.get(slug) : undefined
    out.push({
      ...item,
      slug,
      name: name || filled(hit?.name),
      description: filled(item.description) || filled(hit?.description),
      image: image || filled(hit?.image) || null,
      logo: logo || filled(hit?.logo) || null,
      country: filled(item.country) || filled(hit?.country),
    })
  }
  return out
}

export function parseBannerPresentation(
  raw: unknown,
  fallback: BannerPresentation = DEFAULT_BANNER_PRESENTATION
): BannerPresentation {
  const source =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {}
  const fit = source.fit === "contain" ? "contain" : source.fit === "cover" ? "cover" : fallback.fit
  return {
    fit,
    positionX: clamp(Number(source.positionX ?? fallback.positionX), 0, 100),
    positionY: clamp(Number(source.positionY ?? fallback.positionY), 0, 100),
    scale: clamp(Number(source.scale ?? fallback.scale), 1, 2),
    textColor: tone(source.textColor, fallback.textColor),
    buttonColor: tone(source.buttonColor, fallback.buttonColor),
  }
}

export function bannerImageStyle(presentation: BannerPresentation): {
  objectFit: BannerFit
  objectPosition: string
  transform: string
  transformOrigin: string
} {
  const position = `${presentation.positionX}% ${presentation.positionY}%`
  return {
    objectFit: presentation.fit,
    objectPosition: position,
    transform: `scale(${presentation.scale})`,
    transformOrigin: position,
  }
}

export type CategoryFilterControl = {
  attributeKey: string
  visible: boolean
  label: string | null
  sortOrder: number
}

export function applyCategoryFilterControls<T extends { attributeKey: string; label: string }>(
  groups: T[],
  controls: CategoryFilterControl[]
): T[] {
  if (controls.length === 0) return groups
  const byKey = new Map(controls.map((control) => [control.attributeKey, control]))
  return groups
    .filter((group) => byKey.get(group.attributeKey)?.visible !== false)
    .map((group) => {
      const control = byKey.get(group.attributeKey)
      const label = control?.label?.trim()
      return label ? { ...group, label } : group
    })
    .sort((a, b) => {
      const left = byKey.get(a.attributeKey)?.sortOrder
      const right = byKey.get(b.attributeKey)?.sortOrder
      if (left == null && right == null) return 0
      if (left == null) return 1
      if (right == null) return -1
      return left - right
    })
}

export type CategoryFactInput = {
  title: string
  productCount: number
  brands: string[]
  attributes: string[]
}

export type CategoryCopySuggestion = {
  usps: Array<{ title: string; body: string }>
  faq: Array<{ question: string; answer: string }>
}

const BLOCKED_CLAIM =
  /garant|keurmerk|certific|herkomst|gemaakt in|made in|biologisch|organic|warranty|certified/i

function uniqueNames(values: string[]) {
  const seen = new Set<string>()
  const out: string[] = []
  for (const value of values) {
    const name = value.trim()
    const key = name.toLocaleLowerCase("nl")
    if (!name || seen.has(key)) continue
    seen.add(key)
    out.push(name)
  }
  return out
}

/**
 * Voorstellen alleen uit meegegeven feiten. Geen garanties, keurmerken of herkomst.
 */
export function suggestCategoryCopy(facts: CategoryFactInput): CategoryCopySuggestion {
  const title = facts.title.trim()
  const brands = uniqueNames(facts.brands).slice(0, 8)
  const attributes = uniqueNames(facts.attributes).slice(0, 8)
  const count = Number.isFinite(facts.productCount)
    ? Math.max(0, Math.floor(facts.productCount))
    : 0
  const usps: CategoryCopySuggestion["usps"] = []
  const faq: CategoryCopySuggestion["faq"] = []

  if (title && count > 0) {
    usps.push({
      title: "Aanbod",
      body: `${count} producten in ${title}.`,
    })
    faq.push({
      question: `Hoeveel producten staan er in ${title}?`,
      answer: `Er staan ${count} producten in ${title}.`,
    })
  }
  if (title && brands.length > 0) {
    const list = brands.join(", ")
    usps.push({
      title: "Merken",
      body: `Merken in ${title}: ${list}.`,
    })
    faq.push({
      question: `Welke merken staan in ${title}?`,
      answer: `In ${title} staan deze merken: ${list}.`,
    })
  }
  if (attributes.length > 0) {
    const list = attributes.join(", ")
    usps.push({
      title: "Filters",
      body: `Je kunt filteren op ${list}.`,
    })
    faq.push({
      question: "Waar kan ik in deze categorie op filteren?",
      answer: `De filters horen bij deze productgegevens: ${list}.`,
    })
  }

  return {
    usps: usps.filter((item) => !BLOCKED_CLAIM.test(`${item.title} ${item.body}`)),
    faq: faq.filter((item) => !BLOCKED_CLAIM.test(`${item.question} ${item.answer}`)),
  }
}
