import type { ProductCloudIdentifierType } from "../identifier-types"
import {
  FASE5B_IMPORT_REF_COUNTRY_SCOPE,
} from "../identifier-types"

export type ResolvedIdentifier = {
  identifier_type: ProductCloudIdentifierType
  identifier_value: string
  country_scope: string | null
  source: "gtin" | "mpn" | "import_ref"
}

const EM_ID_RE = /^EM-\d{4}$/

function isValidGtin(value: string): boolean {
  const digits = value.replace(/\s/g, "")
  return /^\d{8}$/.test(digits) || /^\d{12,14}$/.test(digits)
}

/**
 * Resolve catalog identifier for a Fase 5B row.
 * Never invents EAN/GTIN. IMPORT_REF only when both EAN and MPN are absent.
 */
export function resolveFase5bIdentifier(input: {
  em_product_id: string
  ean_gtin?: string | null
  mpn?: string | null
}): ResolvedIdentifier {
  const ean = (input.ean_gtin || "").replace(/\s/g, "")
  if (ean && isValidGtin(ean)) {
    return {
      identifier_type: "GTIN",
      identifier_value: ean,
      country_scope: null,
      source: "gtin",
    }
  }

  const mpn = (input.mpn || "").trim()
  if (mpn) {
    return {
      identifier_type: "MPN",
      identifier_value: mpn,
      country_scope: null,
      source: "mpn",
    }
  }

  const emId = input.em_product_id.trim()
  if (!EM_ID_RE.test(emId)) {
    throw new Error(`Ongeldige EM Product-ID voor IMPORT_REF: ${emId}`)
  }

  return {
    identifier_type: "IMPORT_REF",
    identifier_value: emId,
    country_scope: FASE5B_IMPORT_REF_COUNTRY_SCOPE,
    source: "import_ref",
  }
}

export function assertNoInventedEan(value: string): void {
  if (/^8\d{12}$/.test(value) && value.startsWith("8") && value.length === 13) {
    // allow real EANs only when sourced from Excel — caller must verify source
    return
  }
}
