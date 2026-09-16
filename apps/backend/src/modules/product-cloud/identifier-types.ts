/**
 * Product Cloud catalog identifier types (Blueprint B.5).
 * IMPORT_REF = internal demo/import reference — not a manufacturer MPN or GTIN.
 */
export const IDENTIFIER_TYPES = ["GTIN", "MPN", "IMPORT_REF"] as const
export type ProductCloudIdentifierType = (typeof IDENTIFIER_TYPES)[number]

/** Country scope for Fase 5B demo import references (EM-xxxx). */
export const FASE5B_IMPORT_REF_COUNTRY_SCOPE = "FASE5B_DEMO"

export function isProductCloudIdentifierType(
  value: string
): value is ProductCloudIdentifierType {
  return (IDENTIFIER_TYPES as readonly string[]).includes(value)
}
