/**
 * Offer sales lifecycle helpers (Commerce Cloud).
 * Independent of Product Cloud publication_status.
 */

export type OfferSalesStatus = "active" | "paused"

export function normalizeSellerSku(
  sku: string | null | undefined
): string | null {
  if (sku == null) return null
  const trimmed = String(sku).trim()
  return trimmed.length === 0 ? null : trimmed
}
