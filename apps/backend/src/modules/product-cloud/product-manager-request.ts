/**
 * Productbeheerder-aanvraag via change_proposal (field: product_manager).
 * Reuses ADR-0009 proposal statuses + ADR-0046 assignProductManager on approve.
 */

import {
  normalizeProductManagerKind,
  type ProductManagerKind,
} from "./catalog-edit-auth"
import {
  normalizeProposedFields,
  type ProposedFieldsPayload,
} from "./change-proposal-fields"

export const PRODUCT_MANAGER_PROPOSAL_FIELD = "product_manager" as const

export function isProductManagerProposalFields(
  fields: ProposedFieldsPayload | null | unknown
): boolean {
  const normalized =
    fields && typeof fields === "object" && "changes" in (fields as object)
      ? normalizeProposedFields(fields)
      : null
  if (!normalized?.changes.length) return false
  return normalized.changes.every(
    (c) => c.field === PRODUCT_MANAGER_PROPOSAL_FIELD
  )
}

export function findProductManagerProposalChange(
  fields: unknown
): {
  field: string
  label: string
  current_value: string | null
  proposed_value: string
} | null {
  const normalized = normalizeProposedFields(fields)
  const row = normalized?.changes.find(
    (c) => c.field === PRODUCT_MANAGER_PROPOSAL_FIELD
  )
  return row || null
}

export function formatProductManagerStateValue(input: {
  kind?: string | null
  seller_id?: string | null
}): string {
  const kind = normalizeProductManagerKind(input.kind)
  if (kind === "none") return "none"
  if (kind === "brand_owner") return "brand_owner"
  return `seller:${(input.seller_id || "").trim()}`
}

export function parseProductManagerProposedValue(
  value: string
): { kind: "seller" | "brand_owner"; seller_id: string | null } | null {
  const raw = (value || "").trim()
  if (raw === "brand_owner") {
    return { kind: "brand_owner", seller_id: null }
  }
  if (raw.startsWith("seller:")) {
    const seller_id = raw.slice("seller:".length).trim()
    if (!seller_id) return null
    return { kind: "seller", seller_id }
  }
  return null
}

/**
 * Which Productbeheerder kind this seller would receive if approved.
 * Brand owner takes precedence when both apply.
 */
export function resolveProductManagerRequestKind(input: {
  hasOffer: boolean
  isBrandOwner: boolean
}): "seller" | "brand_owner" | null {
  if (input.isBrandOwner) return "brand_owner"
  if (input.hasOffer) return "seller"
  return null
}

export function isAlreadyProductManager(input: {
  actorSellerId: string
  kind?: string | null
  seller_id?: string | null
  isBrandOwner: boolean
}): boolean {
  const kind = normalizeProductManagerKind(input.kind)
  if (kind === "seller") {
    return (
      Boolean(input.seller_id) &&
      input.seller_id === input.actorSellerId
    )
  }
  if (kind === "brand_owner") {
    return input.isBrandOwner
  }
  return false
}

export function buildProductManagerRequestFields(input: {
  currentKind?: string | null
  currentSellerId?: string | null
  requestKind: "seller" | "brand_owner"
  requesterSellerId: string
}): ProposedFieldsPayload {
  const proposed_value =
    input.requestKind === "brand_owner"
      ? "brand_owner"
      : `seller:${input.requesterSellerId}`
  return {
    changes: [
      {
        field: "product_manager",
        label: "Productbeheerder",
        current_value: formatProductManagerStateValue({
          kind: input.currentKind,
          seller_id: input.currentSellerId,
        }),
        proposed_value,
      },
    ],
  }
}

export type { ProductManagerKind }
