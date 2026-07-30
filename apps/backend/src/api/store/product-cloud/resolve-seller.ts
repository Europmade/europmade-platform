import { MedusaError } from "@medusajs/framework/utils"
import type { MedusaContainer } from "@medusajs/framework/types"
import { PARTNER_MODULE } from "../../../modules/partner"
import type PartnerModuleService from "../../../modules/partner/service"

export type ApprovedSeller = {
  id: string
  customer_id: string
  is_retailer: boolean
  is_producer_or_brand_owner: boolean
  is_distributor: boolean
  onboarding_status: string
}

/**
 * Geverifieerde partner (Goedgekeurd) voor Product Cloud store-API's.
 * product-management/spec.md §9 + authenticatie-toegangsvoorwaarde.
 */
export async function resolveApprovedSeller(
  container: MedusaContainer,
  customerId: string
): Promise<ApprovedSeller> {
  const partnerService = container.resolve(
    PARTNER_MODULE
  ) as PartnerModuleService

  const [seller] = await partnerService.listSellers({
    customer_id: customerId,
  })

  if (!seller) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      "Geen partneraccount gevonden voor dit account."
    )
  }

  if (seller.onboarding_status !== "Goedgekeurd") {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Product Cloud is alleen beschikbaar na goedgekeurde Partner Onboarding."
    )
  }

  return seller as ApprovedSeller
}
