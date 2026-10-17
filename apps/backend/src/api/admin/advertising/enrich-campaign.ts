/**
 * Admin advertising — attach seller display name (P2.19 partner company).
 * No new business rules; falls back to seller_id when company name missing.
 */
import type { MedusaContainer } from "@medusajs/framework/types"
import { resolveSellerDisplayName } from "../order-service/admin-order-helpers"
import { serializeCampaign } from "../../store/advertising/helpers"
import { visibilityForCampaign } from "../../store/advertising/live-slots/route"
import { CMS_MODULE } from "../../../modules/cms"
import type CmsModuleService from "../../../modules/cms/service"
import { PRODUCT_CLOUD_MODULE } from "../../../modules/product-cloud"
import type ProductCloudModuleService from "../../../modules/product-cloud/service"
import { loadResolvedAdvertisingProductCards } from "../../store/advertising/public-product-cards"

export async function serializeAdminCampaign(
  container: MedusaContainer,
  campaign: Record<string, unknown>,
  weeks: Array<Record<string, unknown>>,
  backendOrigin = "http://localhost:9000",
  options?: { includeProducts?: boolean }
) {
  const base = serializeCampaign(campaign, weeks, backendOrigin)
  const sellerId = String(base.seller_id ?? "")
  const { seller_name } = await resolveSellerDisplayName(container, sellerId)
  const productCloud = container.resolve(
    PRODUCT_CLOUD_MODULE
  ) as ProductCloudModuleService
  const productIds = Array.isArray(base.product_ids)
    ? (base.product_ids as string[])
    : []
  const products =
    options?.includeProducts === false
      ? []
      : await loadResolvedAdvertisingProductCards(
          productCloud,
          productIds,
          backendOrigin
        )
  const cms = container.resolve(CMS_MODULE) as CmsModuleService
  const visibility = await visibilityForCampaign(
    cms,
    campaign as Record<string, unknown> & { id: string },
    weeks as Array<{
      market_code?: string
      week_start?: unknown
      week_end?: unknown
      created_at?: unknown
    }>
  )
  return {
    ...base,
    seller_name,
    products,
    visibility,
  }
}
