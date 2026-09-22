import type VerificationModuleService from "../../../modules/verification/service"
import {
  EUROPEAN_OWNERSHIP_BAND_LABELS,
  EUROPEAN_OWNERSHIP_SOURCE_LABELS,
  type EuropeanOwnershipBand,
  type EuropeanOwnershipSource,
  type EuropeanOwnershipStatus,
  isStorefrontVisibleStatus,
  statusAfterAdminDecision,
  statusAfterSellerSubmit,
} from "../../../modules/verification/european-ownership"

export type EuropeanOwnershipClaimRow = {
  id: string
  manufacturer_id: string
  company_id?: string | null
  seller_id: string
  ownership_band: EuropeanOwnershipBand
  source: EuropeanOwnershipSource
  status: EuropeanOwnershipStatus
  evidence_file_id?: string | null
  evidence_note?: string | null
  review_note?: string | null
  reviewed_by?: string | null
  reviewed_at?: Date | string | null
  created_at?: Date | string
  updated_at?: Date | string
}

export function serializeEuropeanOwnershipClaim(row: EuropeanOwnershipClaimRow) {
  return {
    id: row.id,
    manufacturer_id: row.manufacturer_id,
    company_id: row.company_id ?? null,
    seller_id: row.seller_id,
    ownership_band: row.ownership_band,
    ownership_band_label:
      EUROPEAN_OWNERSHIP_BAND_LABELS[row.ownership_band] ?? row.ownership_band,
    source: row.source,
    source_label: EUROPEAN_OWNERSHIP_SOURCE_LABELS[row.source] ?? row.source,
    status: row.status,
    evidence_file_id: row.evidence_file_id ?? null,
    evidence_note: row.evidence_note ?? null,
    review_note: row.review_note ?? null,
    reviewed_by: row.reviewed_by ?? null,
    reviewed_at: row.reviewed_at ?? null,
    created_at: row.created_at ?? null,
    updated_at: row.updated_at ?? null,
  }
}

export type PublicEuropeanOwnership = {
  manufacturer_id: string
  ownership_band: EuropeanOwnershipBand
  ownership_band_label: string
  source: EuropeanOwnershipSource
  source_label: string
  status: EuropeanOwnershipStatus
  verified_by_europmade: boolean
}

export function toPublicEuropeanOwnership(
  row: EuropeanOwnershipClaimRow | null | undefined
): PublicEuropeanOwnership | null {
  if (!row || !isStorefrontVisibleStatus(row.status)) return null
  return {
    manufacturer_id: row.manufacturer_id,
    ownership_band: row.ownership_band,
    ownership_band_label:
      EUROPEAN_OWNERSHIP_BAND_LABELS[row.ownership_band] ?? row.ownership_band,
    source: row.source,
    source_label: EUROPEAN_OWNERSHIP_SOURCE_LABELS[row.source] ?? row.source,
    status: row.status,
    verified_by_europmade: row.status === "Geverifieerd door EuropMade",
  }
}

export async function findClaimByManufacturer(
  verification: VerificationModuleService,
  manufacturerId: string
): Promise<EuropeanOwnershipClaimRow | null> {
  const rows = (await verification.listEuropeanOwnershipClaims(
    { manufacturer_id: manufacturerId },
    { take: 1 }
  )) as EuropeanOwnershipClaimRow[]
  return rows[0] ?? null
}

export async function appendOwnershipStatusEvent(
  verification: VerificationModuleService,
  input: {
    claim_id: string
    manufacturer_id: string
    from_status?: string | null
    to_status: string
    note?: string | null
    actor_id?: string | null
    actor_type?: "seller" | "admin" | null
    decision?: string | null
  }
) {
  await verification.createEuropeanOwnershipStatusEvents({
    claim_id: input.claim_id,
    manufacturer_id: input.manufacturer_id,
    from_status: input.from_status ?? null,
    to_status: input.to_status,
    note: input.note ?? null,
    actor_id: input.actor_id ?? null,
    actor_type: input.actor_type ?? null,
    decision: input.decision ?? null,
  })
}

export {
  statusAfterAdminDecision,
  statusAfterSellerSubmit,
}
