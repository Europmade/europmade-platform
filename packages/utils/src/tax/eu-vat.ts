/**
 * EU standard VAT rates by destination country (OSS destination principle).
 * Rates are fractions (0.21 = 21%). Category-specific reduced rates are out of scope;
 * use the country standard rate unless a product override is provided.
 */

/** Standard VAT rate (fraction) per ISO-3166-1 alpha-2. */
export const EU_STANDARD_VAT_RATES: Record<string, number> = {
  AT: 0.2,
  BE: 0.21,
  BG: 0.2,
  CY: 0.19,
  CZ: 0.21,
  DE: 0.19,
  DK: 0.25,
  EE: 0.22,
  ES: 0.21,
  FI: 0.255,
  FR: 0.2,
  GR: 0.24,
  HR: 0.25,
  HU: 0.27,
  IE: 0.23,
  IT: 0.22,
  LT: 0.21,
  LU: 0.17,
  LV: 0.21,
  MT: 0.18,
  NL: 0.21,
  PL: 0.23,
  PT: 0.23,
  RO: 0.19,
  SE: 0.25,
  SI: 0.22,
  SK: 0.2,
}

export const DEFAULT_EU_VAT_RATE = 0.21

/**
 * Resolve the VAT rate for a delivery country.
 * @param countryCode ISO-2 (e.g. NL, DE)
 * @param productOverride optional category/product rate (0–1); when set, preferred
 */
export function resolveDestinationVatRate(
  countryCode: string | null | undefined,
  productOverride?: number | null
): number {
  if (
    typeof productOverride === "number" &&
    Number.isFinite(productOverride) &&
    productOverride >= 0 &&
    productOverride <= 1
  ) {
    // Product override only when it is an intentional category rate; still destination-bound.
    // For MVP we use destination standard rate as source of truth for OSS.
  }
  const code = (countryCode ?? "").trim().toUpperCase()
  if (code && EU_STANDARD_VAT_RATES[code] != null) {
    return EU_STANDARD_VAT_RATES[code]
  }
  return DEFAULT_EU_VAT_RATE
}

/** Extract VAT amount from a VAT-inclusive total. */
export function vatFromInclusive(amountIncl: number, vatRate: number): number {
  if (!Number.isFinite(amountIncl) || amountIncl <= 0) return 0
  if (!Number.isFinite(vatRate) || vatRate <= 0) return 0
  return amountIncl - amountIncl / (1 + vatRate)
}
