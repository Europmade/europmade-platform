/**
 * Premium product photography placeholders (PNG studio shots).
 * Seller-uploaded transparent PNG/WebP replace these in production.
 * Generic unbranded products only — no unverifiable brand claims.
 */

export type ProductMockKind =
  | "vacuum"
  | "coffee"
  | "watch"
  | "chair"
  | "headphones"
  | "cookware"
  | "garden"
  | "laptop"
  | "backpack"
  | "lamp"
  | "accessory"
  | "fashion"
  | "food"
  | "sports"

const KINDS: ProductMockKind[] = [
  "vacuum",
  "coffee",
  "watch",
  "chair",
  "headphones",
  "cookware",
  "garden",
  "laptop",
  "backpack",
  "lamp",
  "accessory",
  "fashion",
  "food",
  "sports",
]

/** Category slug → studio product photo. */
export const CATEGORY_PRODUCT_KIND: Record<string, ProductMockKind> = {
  tuin: "garden",
  elektronica: "headphones",
  mode: "fashion",
  wonen: "chair",
  sport: "sports",
  voeding: "food",
  keuken: "cookware",
  outdoor: "garden",
}

/** Campaign slug → studio product photo. */
export const CAMPAIGN_PRODUCT_KIND: Record<string, ProductMockKind> = {
  "back-to-school": "laptop",
  zomerdeals: "chair",
  "black-friday": "headphones",
  "weekend-deals": "watch",
  kerstcadeaus: "accessory",
  "nieuwe-europese-merken": "coffee",
}

function hashSeed(seed: string): number {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  return h
}

/** Map listing slug / title keywords → mock kind. */
export function resolveProductMockKind(seed: string): ProductMockKind {
  const s = seed.toLowerCase()
  if (/(stofzuiger|vacuum|zuiger)/.test(s)) return "vacuum"
  if (/(koffie|coffee|espresso)/.test(s)) return "coffee"
  if (/(horloge|watch|uurwerk)/.test(s)) return "watch"
  if (/(stoel|chair|fauteuil|furniture)/.test(s)) return "chair"
  if (/(koptelefoon|headphone|earbud|headset)/.test(s)) return "headphones"
  if (/(pan|cook|keuken|pot|skillet)/.test(s)) return "cookware"
  if (/(tuin|garden|maaier|robot|schaar|spade|tool)/.test(s)) return "garden"
  if (/(laptop|notebook|school)/.test(s)) return "laptop"
  if (/(rugzak|backpack|tas)/.test(s)) return "backpack"
  if (/(lamp|licht)/.test(s)) return "lamp"
  if (/(mode|fashion|trui|kleding)/.test(s)) return "fashion"
  if (/(voeding|food|pasta|olijfolie)/.test(s)) return "food"
  if (/(sport|schoen|sneaker|running)/.test(s)) return "sports"
  if (CAMPAIGN_PRODUCT_KIND[s]) return CAMPAIGN_PRODUCT_KIND[s]!
  if (CATEGORY_PRODUCT_KIND[s]) return CATEGORY_PRODUCT_KIND[s]!
  return KINDS[hashSeed(seed || "product") % KINDS.length]!
}

/**
 * Static studio product photo URL (cacheable + lazy-loadable).
 */
export function productMockupSrc(
  seed: string,
  kind?: ProductMockKind
): string {
  const resolved = kind ?? resolveProductMockKind(seed)
  return `/placeholders/products/${resolved}.png`
}

/** @deprecated Prefer productMockupSrc */
export function productMockupDataUri(
  seed: string,
  _hue?: number,
  kind?: ProductMockKind
): string {
  return productMockupSrc(seed, kind)
}

export function bannerProductMockupDataUri(
  _hue: number,
  kind: ProductMockKind = "coffee"
): string {
  return productMockupSrc(`banner-${kind}`, kind)
}

export function manufacturerLogoSrc(
  brand: "verdetech" | "atelier" = "verdetech"
): string {
  return `/placeholders/logos/${brand}.svg`
}

/** @deprecated Prefer manufacturerLogoSrc */
export function manufacturerLogoDataUri(
  name: string,
  _hue?: number
): string {
  const key = name.toLowerCase().includes("atelier") ? "atelier" : "verdetech"
  return manufacturerLogoSrc(key)
}

/**
 * Soft studio shadow for photoreal product shots (no hue-rotate — photos stay natural).
 */
export function productPhotoShadowClass(): string {
  return "drop-shadow-[0_12px_24px_rgba(15,23,42,0.12)]"
}

/** @deprecated No-op kept for call-site compatibility — do not tint photos. */
export function productMockHueFilter(_hue: number): string {
  return "none"
}
