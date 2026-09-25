/**
 * Pure helpers for atomic bulk Productbeheerder assignment (admin).
 */

import {
  assertValidProductManagerAssignment,
  type ProductManagerAssignment,
} from "./product-manager-assignment"
import type { ProductManagerKind } from "./catalog-edit-auth"

export type BulkPmCandidate = {
  kind: "seller" | "brand_owner" | "none"
  seller_id: string | null
  label: string
}

export type BulkPmProductContext = {
  product_id: string
  title: string | null
  current: {
    kind: ProductManagerKind
    seller_id: string | null
    display_name: string
    label: string
  }
  offerSellerIds: string[]
  brandOwnerAvailable: boolean
  candidates: BulkPmCandidate[]
}

export function bulkPmCandidateKey(c: {
  kind: string
  seller_id: string | null
}): string {
  return `${c.kind}:${c.seller_id || ""}`
}

/**
 * Candidates valid for every product in the selection (intersection).
 * "Geen beheerder" is always included when present in any list.
 */
export function intersectBulkPmCandidates(
  lists: BulkPmCandidate[][]
): BulkPmCandidate[] {
  if (lists.length === 0) {
    return [{ kind: "none", seller_id: null, label: "Geen beheerder" }]
  }
  const maps = lists.map(
    (list) => new Map(list.map((c) => [bulkPmCandidateKey(c), c]))
  )
  const first = maps[0]!
  const shared: BulkPmCandidate[] = []
  for (const [key, candidate] of first) {
    if (maps.every((m) => m.has(key))) {
      shared.push(candidate)
    }
  }
  // Ensure "none" is always available for a bulk clear.
  if (!shared.some((c) => c.kind === "none")) {
    shared.unshift({ kind: "none", seller_id: null, label: "Geen beheerder" })
  }
  // Stable order: none → brand_owner → sellers
  const rank = (k: string) =>
    k === "none" ? 0 : k === "brand_owner" ? 1 : 2
  return shared.sort(
    (a, b) =>
      rank(a.kind) - rank(b.kind) ||
      a.label.localeCompare(b.label, "nl")
  )
}

export type BulkPmValidationRow = {
  product_id: string
  title: string | null
  current_display: string
  current_type: string
  new_display: string
  new_type: string
  valid: boolean
  error: string | null
}

export function evaluateBulkProductManagerChoice(input: {
  products: BulkPmProductContext[]
  kind: ProductManagerKind
  seller_id?: string | null
  new_display: string
  new_type: string
}): {
  all_valid: boolean
  rows: BulkPmValidationRow[]
  invalid_rows: BulkPmValidationRow[]
} {
  const rows: BulkPmValidationRow[] = input.products.map((p) => {
    let valid = true
    let error: string | null = null
    try {
      assertValidProductManagerAssignment({
        kind: input.kind,
        seller_id: input.seller_id,
        offerSellerIds: p.offerSellerIds,
        brandOwnerAvailable: p.brandOwnerAvailable,
      })
    } catch (err) {
      valid = false
      error = err instanceof Error ? err.message : "Ongeldige toewijzing"
    }
    return {
      product_id: p.product_id,
      title: p.title,
      current_display: p.current.display_name,
      current_type: p.current.label,
      new_display: input.new_display,
      new_type: input.new_type,
      valid,
      error,
    }
  })
  const invalid_rows = rows.filter((r) => !r.valid)
  return {
    all_valid: invalid_rows.length === 0,
    rows,
    invalid_rows,
  }
}

export function formatCurrentManagerDisplay(input: {
  kind: ProductManagerKind
  seller_name?: string | null
  seller_id?: string | null
  brand_name?: string | null
  label: string
}): string {
  if (input.kind === "none") return "Geen beheerder"
  if (input.kind === "brand_owner") {
    return input.brand_name?.trim() || "Merkeigenaar"
  }
  return input.seller_name?.trim() || input.seller_id || "Seller"
}

export type { ProductManagerAssignment }
