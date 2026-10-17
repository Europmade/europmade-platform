import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { requestBackendOrigin } from "../../../request-backend-origin"
import { CMS_MODULE } from "../../../../modules/cms"
import type CmsModuleService from "../../../../modules/cms/service"
import { resolveApprovedSeller } from "../../product-cloud/resolve-seller"
import {
  parseCampaignInput,
  assertSlotsAvailable,
} from "../campaign-input"
import {
  assertOwnedProductIds,
  buildCampaignSlug,
  resolveDestinationUrl,
  resolveSellerPublicSlug,
} from "../destination"
import {
  computeWeekEnd,
  computeCampaignPrice,
  serializeCampaign,
} from "../helpers"
import { visibilityForCampaign } from "../live-slots/route"
import { PRODUCT_CLOUD_MODULE } from "../../../../modules/product-cloud"
import type ProductCloudModuleService from "../../../../modules/product-cloud/service"
import { loadResolvedAdvertisingProductCards } from "../public-product-cards"

/**
 * GET /store/advertising/campaigns — list seller's own campaigns.
 * POST /store/advertising/campaigns — create (always pending_review).
 */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const seller = await resolveApprovedSeller(
    req.scope,
    req.auth_context.actor_id
  )
  const cms = req.scope.resolve(CMS_MODULE) as CmsModuleService
  const productCloud = req.scope.resolve(
    PRODUCT_CLOUD_MODULE
  ) as ProductCloudModuleService
  const origin = requestBackendOrigin(req)

  const rows = await cms.listAdCampaigns(
    { seller_id: seller.id },
    { order: { created_at: "DESC" }, take: 200 }
  )

  const enriched = []
  const visibilityCache = new Map()
  for (const row of rows) {
    const weeks = await cms.listAdCampaignWeeks(
      { campaign_id: row.id },
      { order: { week_start: "ASC" } }
    )
    const serialized = serializeCampaign(row, weeks, origin)
    const productIds = Array.isArray(serialized.product_ids)
      ? (serialized.product_ids as string[])
      : []
    const products = await loadResolvedAdvertisingProductCards(
      productCloud,
      productIds,
      origin
    )
    const visibility = await visibilityForCampaign(
      cms,
      row as Record<string, unknown> & { id: string },
      weeks as Array<{
        campaign_id?: string
        market_code?: string
        week_start?: unknown
        week_end?: unknown
        created_at?: unknown
      }>,
      new Date(),
      visibilityCache
    )
    enriched.push({ ...serialized, products, visibility })
  }

  res.json({ campaigns: enriched })
}

export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const seller = await resolveApprovedSeller(
    req.scope,
    req.auth_context.actor_id
  )
  const cms = req.scope.resolve(CMS_MODULE) as CmsModuleService
  const body = (req.body ?? {}) as Record<string, unknown>
  const input = parseCampaignInput(body)

  await assertOwnedProductIds(req.scope, seller.id, input.product_ids)
  await assertSlotsAvailable(cms, input)

  const { seller_public_slug } = await resolveSellerPublicSlug(
    req.scope,
    seller.id
  )
  const campaignSlug = buildCampaignSlug(input.name)
  const destination_url = resolveDestinationUrl(
    seller_public_slug,
    campaignSlug
  )

  const totalPrice = await computeCampaignPrice(
    cms,
    input.placement,
    input.target_type,
    input.markets,
    input.weekStarts
  )

  const campaign = await cms.createAdCampaigns({
    seller_id: seller.id,
    name: input.name,
    placement: input.placement,
    target_type: input.target_type,
    target_value: input.target_value,
    markets: input.markets,
    image_url: input.image_url,
    logo_url: input.logo_url,
    banner_presentation: input.banner_presentation,
    destination_url,
    headline: input.headline,
    subline: input.subline,
    cta_key: input.cta_key,
    design_key: input.design_key,
    product_ids: input.product_ids,
    campaign_slug: campaignSlug,
    seller_public_slug,
    status: "pending_review",
    total_price: totalPrice,
  })

  for (const market of input.markets) {
    for (const ws of input.weekStarts) {
      const weekPrice = await computeCampaignPrice(
        cms,
        input.placement,
        input.target_type,
        [market],
        [ws]
      )
      await cms.createAdCampaignWeeks({
        campaign_id: campaign.id,
        placement: input.placement,
        target_type: input.target_type,
        target_value: input.target_value,
        market_code: market,
        week_start: ws,
        week_end: computeWeekEnd(ws),
        week_price: weekPrice,
      })
    }
  }

  const weeks = await cms.listAdCampaignWeeks(
    { campaign_id: campaign.id },
    { order: { week_start: "ASC" } }
  )

  res.status(201).json({
    campaign: serializeCampaign(campaign, weeks, requestBackendOrigin(req)),
  })
}
