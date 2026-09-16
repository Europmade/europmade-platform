/**
 * Admin Order Management — shared read helpers.
 * Reuses Seller enrichment; platform scope (all sellers).
 */
import type { MedusaContainer } from "@medusajs/framework/types"
import { PARTNER_MODULE } from "../../../modules/partner"
import type PartnerModuleService from "../../../modules/partner/service"

export async function resolveSellerDisplayName(
  container: MedusaContainer,
  sellerId: string
): Promise<{ seller_id: string; seller_name: string; onboarding_status: string | null }> {
  try {
    const partner = container.resolve(PARTNER_MODULE) as PartnerModuleService
    const seller = await partner.retrieveSeller(sellerId, {
      relations: ["company"],
    })
    const company = seller.company as { legal_name?: string } | undefined
    const name = company?.legal_name?.trim()
    return {
      seller_id: sellerId,
      seller_name: name || sellerId,
      onboarding_status: (seller.onboarding_status as string) ?? null,
    }
  } catch {
    return {
      seller_id: sellerId,
      seller_name: sellerId,
      onboarding_status: null,
    }
  }
}

/** Retourstatussen die nog actie/behandeling vereisen (zelfde NL-vocabulaire als Seller). */
export const OPEN_RETURN_STATUSES = new Set([
  "Aangevraagd",
  "Bevestigd",
  "Onderweg",
  "Ontvangen",
  "Geëscaleerd",
])

export function isOpenReturnStatus(status: string | null | undefined): boolean {
  return OPEN_RETURN_STATUSES.has(String(status ?? ""))
}
