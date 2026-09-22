/**
 * European ownership (EU-eigendom) — company/manufacturer-level claim.
 * Orthogonal to Made in Europe / product_origin production scoring (ADR-0044).
 */

export const EUROPEAN_OWNERSHIP_BANDS = [
  "eu_0",
  "eu_1_25",
  "eu_26_50",
  "eu_51_75",
  "eu_76_99",
  "eu_100",
  "unknown",
] as const

export type EuropeanOwnershipBand = (typeof EUROPEAN_OWNERSHIP_BANDS)[number]

export const EUROPEAN_OWNERSHIP_SOURCES = [
  "brand_producer",
  "factory",
  "reseller",
  "other",
] as const

export type EuropeanOwnershipSource =
  (typeof EUROPEAN_OWNERSHIP_SOURCES)[number]

/** Public / seller-facing Dutch statuses (verification lifecycle). */
export const EUROPEAN_OWNERSHIP_STATUSES = [
  "Niet opgegeven",
  "Opgegeven door aanbieder",
  "Bewijs aangeleverd",
  "Geverifieerd door EuropMade",
  "Bewijs opgevraagd",
  "Afgewezen",
] as const

export type EuropeanOwnershipStatus =
  (typeof EUROPEAN_OWNERSHIP_STATUSES)[number]

export const EUROPEAN_OWNERSHIP_BAND_LABELS: Record<
  EuropeanOwnershipBand,
  string
> = {
  eu_0: "0%",
  eu_1_25: "1–25%",
  eu_26_50: "26–50%",
  eu_51_75: "51–75%",
  eu_76_99: "76–99%",
  eu_100: "100%",
  unknown: "Niet bekend",
}

export const EUROPEAN_OWNERSHIP_SOURCE_LABELS: Record<
  EuropeanOwnershipSource,
  string
> = {
  brand_producer: "Merk/producent",
  factory: "Fabriek",
  reseller: "Reseller",
  other: "Andere",
}

export function isEuropeanOwnershipBand(
  value: unknown
): value is EuropeanOwnershipBand {
  return (
    typeof value === "string" &&
    (EUROPEAN_OWNERSHIP_BANDS as readonly string[]).includes(value)
  )
}

export function isEuropeanOwnershipSource(
  value: unknown
): value is EuropeanOwnershipSource {
  return (
    typeof value === "string" &&
    (EUROPEAN_OWNERSHIP_SOURCES as readonly string[]).includes(value)
  )
}

export function statusAfterSellerSubmit(hasEvidence: boolean): EuropeanOwnershipStatus {
  return hasEvidence ? "Bewijs aangeleverd" : "Opgegeven door aanbieder"
}

export function statusAfterAdminDecision(
  decision: "approve" | "request_info" | "reject"
): EuropeanOwnershipStatus {
  if (decision === "approve") return "Geverifieerd door EuropMade"
  if (decision === "request_info") return "Bewijs opgevraagd"
  return "Afgewezen"
}

/** Statuses that may be shown on the storefront badge. */
export function isPublicOwnershipStatus(
  status: EuropeanOwnershipStatus | string | null | undefined
): boolean {
  return (
    status === "Opgegeven door aanbieder" ||
    status === "Bewijs aangeleverd" ||
    status === "Geverifieerd door EuropMade" ||
    status === "Bewijs opgevraagd"
  )
}

/**
 * Storefront: only show a band when seller has made a claim (incl. "Niet bekend").
 * Rejected claims are not shown as fact to customers.
 */
export function isStorefrontVisibleStatus(
  status: EuropeanOwnershipStatus | string | null | undefined
): boolean {
  return (
    status === "Opgegeven door aanbieder" ||
    status === "Bewijs aangeleverd" ||
    status === "Geverifieerd door EuropMade"
  )
}
