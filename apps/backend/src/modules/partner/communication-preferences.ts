/**
 * Vrijwillige EuropMade-communicatie op het bestaande seller-account.
 * Transactionele meldingen staan hier niet in en kunnen niet worden uitgezet.
 */
export const SELLER_VOLUNTARY_KEYS = [
  "platform_updates",
  "seller_tips",
  "product_opportunities",
  "seller_campaigns",
  "europmade_news",
] as const

export type SellerVoluntaryKey = (typeof SELLER_VOLUNTARY_KEYS)[number]

export type SellerCommunicationPreferences = Record<SellerVoluntaryKey, boolean>

export function emptySellerCommunicationPreferences(): SellerCommunicationPreferences {
  return {
    platform_updates: false,
    seller_tips: false,
    product_opportunities: false,
    seller_campaigns: false,
    europmade_news: false,
  }
}

export function planSellerCommunicationPreferences(
  input: unknown
): SellerCommunicationPreferences {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Communicatievoorkeuren zijn onvolledig.")
  }
  const row = input as Record<string, unknown>
  const next = emptySellerCommunicationPreferences()
  for (const key of SELLER_VOLUNTARY_KEYS) {
    if (typeof row[key] !== "boolean") {
      throw new Error("Communicatievoorkeuren zijn onvolledig.")
    }
    next[key] = row[key] === true
  }
  return next
}
