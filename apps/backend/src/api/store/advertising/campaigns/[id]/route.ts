import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { requestBackendOrigin } from "../../../../request-backend-origin"
import { CMS_MODULE } from "../../../../../modules/cms"
import type CmsModuleService from "../../../../../modules/cms/service"
import { resolveApprovedSeller } from "../../../product-cloud/resolve-seller"
import {
  parseCampaignInput,
  assertSlotsAvailable,
} from "../../campaign-input"
import {
  assertOwnedProductIds,
  buildCampaignSlug,
  resolveDestinationUrl,
  resolveSellerPublicSlug,
} from "../../destination"
import {
  computeWeekEnd,
  computeCampaignPrice,
  serializeCampaign,
} from "../../helpers"
import { PRODUCT_CLOUD_MODULE } from "../../../../../modules/product-cloud"
import type ProductCloudModuleService from "../../../../../modules/product-cloud/service"
import { loadResolvedAdvertisingProductCards } from "../../public-product-cards"

type Req = AuthenticatedMedusaRequest & { params: { id: string } }

/**
 * GET /store/advertising/campaigns/:id — own campaign detail (incl. admin_note).
 */
export async function GET(req: Req, res: MedusaResponse) {
  const seller = await resolveApprovedSeller(
    req.scope,
    req.auth_context.actor_id
  )
  const cms = req.scope.resolve(CMS_MODULE) as CmsModuleService
  const row = await cms.retrieveAdCampaign(req.params.id).catch(() => null)
  if (!row || row.seller_id !== seller.id) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "Campaign not found.")
  }
  const weeks = await cms.listAdCampaignWeeks(
    { campaign_id: row.id },
    { order: { week_start: "ASC" } }
  )
  const origin = requestBackendOrigin(req)
  const campaign = serializeCampaign(
    row as Record<string, unknown>,
    weeks,
    origin
  )
  const productCloud = req.scope.resolve(
    PRODUCT_CLOUD_MODULE
  ) as ProductCloudModuleService
  const products = await loadResolvedAdvertisingProductCards(
    productCloud,
    Array.isArray(campaign.product_ids)
      ? (campaign.product_ids as string[])
      : [],
    origin
  )
  res.json({
    campaign: { ...campaign, products },
  })
}

/**
 * PATCH /store/advertising/campaigns/:id — resubmit a rejected campaign.
 */
export async function PATCH(req: Req, res: MedusaResponse) {
  const seller = await resolveApprovedSeller(
    req.scope,
    req.auth_context.actor_id
  )
  const cms = req.scope.resolve(CMS_MODULE) as CmsModuleService
  const existing = await cms.retrieveAdCampaign(req.params.id).catch(() => null)
  if (!existing || existing.seller_id !== seller.id) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "Campaign not found.")
  }
  if (existing.status !== "rejected") {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Only rejected campaigns can be edited and resubmitted."
    )
  }

  const body = (req.body ?? {}) as Record<string, unknown>
  const input = parseCampaignInput(body)

  await assertOwnedProductIds(req.scope, seller.id, input.product_ids)
  await assertSlotsAvailable(cms, input, {
    excludeCampaignId: req.params.id,
  })

  const { seller_public_slug } = await resolveSellerPublicSlug(
    req.scope,
    seller.id
  )
  const campaignSlug =
    (typeof existing.campaign_slug === "string" && existing.campaign_slug) ||
    buildCampaignSlug(input.name, req.params.id)
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

  const oldWeeks = await cms.listAdCampaignWeeks({
    campaign_id: req.params.id,
  })
  for (const w of oldWeeks) {
    await cms.deleteAdCampaignWeeks(w.id)
  }

  await cms.updateAdCampaigns({
    id: req.params.id,
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
    admin_note: null,
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
        campaign_id: req.params.id,
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

  const updated = await cms.retrieveAdCampaign(req.params.id)
  const weeks = await cms.listAdCampaignWeeks(
    { campaign_id: req.params.id },
    { order: { week_start: "ASC" } }
  )

  res.json({
    campaign: serializeCampaign(
      updated as Record<string, unknown>,
      weeks,
      requestBackendOrigin(req)
    ),
  })
}
