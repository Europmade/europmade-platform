import { getCatalogProduct } from "./catalog-api"

const UNKNOWN_PRODUCT_TITLE = "Onbekend product"

/**
 * Product-id from an affiliate target_url (`/product/{id}`), without query/ref.
 */
export function productIdFromAffiliateTarget(targetUrl: string): string | null {
  const raw = targetUrl.trim()
  if (!raw) return null
  let path = raw
  try {
    if (/^https?:\/\//i.test(raw)) {
      path = new URL(raw).pathname
    }
  } catch {
    path = raw.split("?")[0] ?? raw
  }
  const pathOnly = (path.split("?")[0] ?? path).replace(/\/+$/, "")
  const match = pathOnly.match(/\/product\/([^/]+)$/i)
  if (!match?.[1]) return null
  try {
    return decodeURIComponent(match[1])
  } catch {
    return match[1]
  }
}

/** Publieke storefront-PDP (zelfde routing als `app/product/[slug]`). */
export function publicProductHref(productId: string): string {
  return `/product/${encodeURIComponent(productId)}`
}

export { UNKNOWN_PRODUCT_TITLE }

/**
 * Resolve catalog titles for unique product-ids found in target URLs.
 * Failures become missing map entries (UI shows UNKNOWN_PRODUCT_TITLE).
 */
export async function resolveAffiliateProductTitles(
  targetUrls: string[]
): Promise<Map<string, string>> {
  const ids = [
    ...new Set(
      targetUrls
        .map((url) => productIdFromAffiliateTarget(url))
        .filter((id): id is string => Boolean(id))
    ),
  ]
  const resolved = await Promise.all(
    ids.map(async (id) => {
      try {
        const detail = await getCatalogProduct(id)
        const title = detail.product?.title?.trim() ?? ""
        return [id, title] as const
      } catch {
        return [id, ""] as const
      }
    })
  )
  const map = new Map<string, string>()
  for (const [id, title] of resolved) {
    if (title) map.set(id, title)
  }
  return map
}

export function titleForAffiliateTarget(
  targetUrl: string,
  titles: Map<string, string>,
  unknownTitle = UNKNOWN_PRODUCT_TITLE
): string {
  const id = productIdFromAffiliateTarget(targetUrl)
  if (!id) return unknownTitle
  return titles.get(id)?.trim() || unknownTitle
}
