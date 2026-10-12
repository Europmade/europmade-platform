/**
 * Zoekterm voor een bestaand Product Cloud-product.
 * GTIN/EAN is de identifierwaarde, geen apart productveld.
 */
import { draftProductSummary } from "./content-provider"
export function catalogIdentifierValues(query: string): string[] {
  const compact = query.trim().replace(/\s+/g, "")
  if (!compact) return []
  const values = new Set<string>()
  if (/^\d{8,14}$/.test(compact)) values.add(compact)
  if (/^[0-9A-Za-z-]{4,64}$/.test(compact)) values.add(compact)
  return [...values]
}

export function catalogProductHref(productId: string): string {
  const id = productId.trim()
  if (!id) return ""
  return `/product/${encodeURIComponent(id)}`
}

/** Zelfde productblok als de nieuwsbriefzoeker. Alleen catalogusvelden. */
export function presentCatalogProduct(row: {
  product_id?: string
  title?: string
  description?: string
  product?: { id?: string }
  media_items?: Array<{ storage_reference?: string; media_type?: string }>
}): {
  id: string
  title: string
  description: string
  image_url: string
  href: string
} | null {
  const id = row.product_id || row.product?.id || ""
  const title = row.title?.trim() || ""
  if (!id || !title) return null
  const media = row.media_items ?? []
  const image =
    media.find((item) => item.media_type === "Hoofdafbeelding" && item.storage_reference) ??
    media.find((item) => item.storage_reference)
  const url = image?.storage_reference?.trim() || ""
  return {
    id,
    title,
    description: draftProductSummary(row.description ?? ""),
    image_url: url && (/^https?:\/\//i.test(url) || url.startsWith("/")) ? url : "",
    href: catalogProductHref(id),
  }
}
