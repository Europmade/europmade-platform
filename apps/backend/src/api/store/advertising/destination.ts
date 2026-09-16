import { MedusaError } from "@medusajs/framework/utils"
import type { MedusaContainer } from "@medusajs/framework/types"
import { PARTNER_MODULE } from "../../../modules/partner"
import type PartnerModuleService from "../../../modules/partner/service"
import { PRODUCT_CLOUD_MODULE } from "../../../modules/product-cloud"
import type ProductCloudModuleService from "../../../modules/product-cloud/service"
import {
  buildCampaignDestinationPath,
  slugifyAdvertising,
} from "./helpers"

export async function resolveSellerPublicSlug(
  container: MedusaContainer,
  sellerId: string
): Promise<{ seller_public_slug: string; seller_display_name: string }> {
  const partner = container.resolve(PARTNER_MODULE) as PartnerModuleService
  const seller = await partner.retrieveSeller(sellerId, {
    relations: ["company"],
  })
  const company = seller.company as { legal_name?: string } | undefined
  const display =
    company?.legal_name?.trim() ||
    String(sellerId).replace(/^sell_/, "") ||
    "seller"
  let slug = slugifyAdvertising(display)
  // Keep unique-ish: append short seller id tail if slug is generic
  if (slug.length < 3) {
    slug = `seller-${String(sellerId).slice(-8).toLowerCase()}`
  }
  return { seller_public_slug: slug, seller_display_name: display }
}

export function buildCampaignSlug(name: string, campaignId?: string): string {
  const base = slugifyAdvertising(name)
  const suffix = campaignId
    ? String(campaignId).replace(/^adcmp_/, "").slice(-8).toLowerCase()
    : Date.now().toString(36)
  return `${base}-${suffix}`
}

export function resolveDestinationUrl(
  sellerPublicSlug: string,
  campaignSlug: string
): string {
  return buildCampaignDestinationPath(sellerPublicSlug, campaignSlug)
}

/**
 * Ensure every product_id is owned by the seller.
 */
export async function assertOwnedProductIds(
  container: MedusaContainer,
  sellerId: string,
  productIds: string[]
): Promise<void> {
  const productCloud = container.resolve(
    PRODUCT_CLOUD_MODULE
  ) as ProductCloudModuleService
  for (const id of productIds) {
    const product = await productCloud.retrieveProduct(id).catch(() => null)
    if (!product || product.current_owner_seller_id !== sellerId) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Product not found or not owned by seller: ${id}`
      )
    }
  }
}
