/**
 * Helpers to build / validate Productbeheerder assignment payloads (ADR-0046).
 */

import {
  formatProductManagerLabel,
  normalizeProductManagerKind,
  type ProductManagerKind,
} from "./catalog-edit-auth"

export type ProductManagerAssignment = {
  kind: ProductManagerKind
  seller_id: string | null
  label: string
}

export type ProductManagerCandidate =
  | {
      kind: "seller"
      seller_id: string
      label: string
    }
  | {
      kind: "brand_owner"
      seller_id: string | null
      brand_id: string
      brand_name: string | null
      label: string
    }
  | {
      kind: "none"
      seller_id: null
      label: string
    }

export function buildProductManagerSnapshot(input: {
  kind?: string | null
  seller_id?: string | null
  seller_name?: string | null
  brand_id?: string | null
  brand_name?: string | null
}): ProductManagerAssignment & {
  brand_id: string | null
  brand_name: string | null
  seller_name: string | null
} {
  const kind = normalizeProductManagerKind(input.kind)
  return {
    kind,
    seller_id: kind === "seller" ? input.seller_id || null : null,
    seller_name: kind === "seller" ? input.seller_name || null : null,
    brand_id: kind === "brand_owner" ? input.brand_id || null : null,
    brand_name: kind === "brand_owner" ? input.brand_name || null : null,
    label: formatProductManagerLabel(kind),
  }
}

export function assertValidProductManagerAssignment(input: {
  kind: ProductManagerKind
  seller_id?: string | null
  offerSellerIds: string[]
  brandOwnerAvailable: boolean
}): void {
  if (input.kind === "none") return
  if (input.kind === "brand_owner") {
    if (!input.brandOwnerAvailable) {
      throw new Error(
        "Geen geverifieerde merkeigenaar beschikbaar voor dit productmerk."
      )
    }
    return
  }
  const sid = (input.seller_id || "").trim()
  if (!sid) {
    throw new Error("Selecteer een seller als Productbeheerder.")
  }
  if (!input.offerSellerIds.includes(sid)) {
    throw new Error(
      "Alleen sellers met een actief aanbod op dit Product Cloud-product mogen Productbeheerder worden."
    )
  }
}

export function productManagerAuditValues(input: {
  kind: ProductManagerKind
  seller_id?: string | null
}): { kind: string; seller_id: string } {
  return {
    kind: input.kind,
    seller_id:
      input.kind === "seller" ? (input.seller_id || "").trim() || "" : "",
  }
}
