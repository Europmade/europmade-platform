import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { CMS_MODULE } from "../../../../../../../../modules/cms"
import type CmsModuleService from "../../../../../../../../modules/cms/service"
import { PRODUCT_CLOUD_MODULE } from "../../../../../../../../modules/product-cloud"
import type ProductCloudModuleService from "../../../../../../../../modules/product-cloud/service"
import { serializeCampaign } from "../../../../../helpers"
import { resolveSellerPublicSlug } from "../../../../../destination"
import { loadAdvertisingProductCards } from "../../../../../public-product-cards"

type Req = MedusaRequest & {
  params: { sellerSlug: string; campaignSlug: string }
}

const VIEWABLE = new Set([
  "pending_review",
  "approved",
  "scheduled",
  "active",
])

/**
 * GET /store/advertising/public/sellers/:sellerSlug/campaigns/:campaignSlug
 */
export async function GET(req: Req, res: MedusaResponse) {
  const cms = req.scope.resolve(CMS_MODULE) as CmsModuleService
  const productCloud = req.scope.resolve(
    PRODUCT_CLOUD_MODULE
  ) as ProductCloudModuleService

  const rows = await cms.listAdCampaigns(
    {
      seller_public_slug: req.params.sellerSlug,
      campaign_slug: req.params.campaignSlug,
    },
    { take: 5 }
  )
  const campaign = rows[0]
  if (!campaign || !VIEWABLE.has(String(campaign.status))) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "Campaign not found.")
  }

  const { seller_display_name } = await resolveSellerPublicSlug(
    req.scope,
    String(campaign.seller_id)
  )

  const weeks = await cms.listAdCampaignWeeks(
    { campaign_id: campaign.id },
    { order: { week_start: "ASC" } }
  )
  const serialized = serializeCampaign(
    campaign as Record<string, unknown>,
    weeks as Array<Record<string, unknown>>
  )

  const productIds = Array.isArray(serialized.product_ids)
    ? (serialized.product_ids as string[])
    : []
  const products = await loadAdvertisingProductCards(productCloud, productIds)

  res.json({
    seller: {
      id: campaign.seller_id,
      name: seller_display_name,
      slug: req.params.sellerSlug,
      href: `/seller/${encodeURIComponent(req.params.sellerSlug)}`,
    },
    campaign: serialized,
    products,
  })
}
