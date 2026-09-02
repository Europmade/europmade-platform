import { randomBytes } from "node:crypto"
import type { ProductCloudIdentifierType } from "./identifier-types"
import { isValidGtin, normalizeGtinDigits } from "./gtin-validation"

/** Internal placeholder while seller builds a concept without EAN/GTIN yet. */
export const CONCEPT_DRAFT_COUNTRY_SCOPE = "CONCEPT_DRAFT"

export function isConceptDraftIdentifier(
  identifier_type: string | null | undefined,
  identifier_value: string | null | undefined,
  country_scope?: string | null
): boolean {
  if (identifier_type !== "IMPORT_REF") return false
  if (country_scope === CONCEPT_DRAFT_COUNTRY_SCOPE) return true
  return (identifier_value || "").startsWith("DRAFT-")
}

export function generateConceptDraftIdentifier(): {
  identifier_type: ProductCloudIdentifierType
  identifier_value: string
  country_scope: string
} {
  return {
    identifier_type: "IMPORT_REF",
    identifier_value: `DRAFT-${randomBytes(6).toString("hex").toUpperCase()}`,
    country_scope: CONCEPT_DRAFT_COUNTRY_SCOPE,
  }
}

export function resolveCatalogGtinValue(
  identifier_type: string | null | undefined,
  identifier_value: string | null | undefined,
  country_scope?: string | null
): string | null {
  if (!identifier_value) return null
  if (isConceptDraftIdentifier(identifier_type, identifier_value, country_scope)) {
    return null
  }
  if (identifier_type === "GTIN" && isValidGtin(identifier_value)) {
    return normalizeGtinDigits(identifier_value)
  }
  return null
}
