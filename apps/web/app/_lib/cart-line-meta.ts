/**
 * Frontend-only display metadata for cart lines.
 * Cart API returns offer_id/seller_id/prices; product presentation is cached here.
 */

export type CartLineMeta = {
  offer_id: string
  product_id: string
  slug: string
  title: string
  seller_id: string
  seller_name: string
  verified: boolean
  delivery: string
  stock: string
  returns: string
  color?: string
  size?: string
  variant?: string
  image_hue?: number
}

const STORAGE_KEY = "em_cart_line_meta_v1"

function readAll(): Record<string, CartLineMeta> {
  if (typeof window === "undefined") return {}
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, CartLineMeta>
    return parsed && typeof parsed === "object" ? parsed : {}
  } catch {
    return {}
  }
}

function writeAll(map: Record<string, CartLineMeta>) {
  if (typeof window === "undefined") return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
}

export function rememberCartLineMeta(meta: CartLineMeta) {
  const all = readAll()
  all[meta.offer_id] = meta
  writeAll(all)
}

export function getCartLineMeta(offerId: string): CartLineMeta | null {
  return readAll()[offerId] ?? null
}

export function getCartLineMetaMap(
  offerIds: string[]
): Record<string, CartLineMeta> {
  const all = readAll()
  const out: Record<string, CartLineMeta> = {}
  for (const id of offerIds) {
    if (all[id]) out[id] = all[id]
  }
  return out
}

export function fallbackCartLineMeta(
  offerId: string,
  sellerId: string
): CartLineMeta {
  return {
    offer_id: offerId,
    product_id: "",
    slug: "",
    title: `Product ${offerId.slice(-8)}`,
    seller_id: sellerId,
    seller_name: `Verkoper ${sellerId.slice(-6)}`,
    verified: true,
    delivery: "2–4 werkdagen",
    stock: "Op voorraad",
    returns: "30 dagen retour",
    image_hue: hashHue(offerId),
  }
}

export function hashHue(seed: string): number {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 360
  return h
}
