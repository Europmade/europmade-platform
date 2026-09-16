/**
 * Admin advertising — attach seller display name (P2.19 partner company).
 * No new business rules; falls back to seller_id when company name missing.
 */
import type { MedusaContainer } from "@medusajs/framework/types"
import { resolveSellerDisplayName } from "../order-service/admin-order-helpers"
import { serializeCampaign } from "../../store/advertising/helpers"
import { PRODUCT_CLOUD_MODULE } from "../../../modules/product-cloud"
import type ProductCloudModuleService from "../../../modules/product-cloud/service"
import { loadAdvertisingProductCards } from "../../store/advertising/public-product-cards"

export async function serializeAdminCampaign(
  container: MedusaContainer,
  campaign: Record<string, unknown>,
  weeks: Array<Record<string, unknown>>
) {
  const base = serializeCampaign(campaign, weeks)
  const sellerId = String(base.seller_id ?? "")
  const { seller_name } = await resolveSellerDisplayName(container, sellerId)
  const productCloud = container.resolve(
    PRODUCT_CLOUD_MODULE
  ) as ProductCloudModuleService
  const productIds = Array.isArray(base.product_ids)
    ? (base.product_ids as string[])
    : []
  const products = await loadAdvertisingProductCards(productCloud, productIds)
  return {
    ...base,
    seller_name,
    products,
  }
}
