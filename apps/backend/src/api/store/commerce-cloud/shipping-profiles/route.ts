import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { COMMERCE_CLOUD_MODULE } from "../../../../modules/commerce-cloud"
import type CommerceCloudModuleService from "../../../../modules/commerce-cloud/service"
import { PRODUCT_CLOUD_MODULE } from "../../../../modules/product-cloud"
import type ProductCloudModuleService from "../../../../modules/product-cloud/service"
import { resolveApprovedSeller } from "../../product-cloud/resolve-seller"
import {
  assertProfileCanActivate,
  enrichShippingProfile,
  listEnrichedProfiles,
} from "../../../../modules/commerce-cloud/shipping-profile-engine"
import {
  defaultProcessingSettings,
  normalizeCountryRates,
} from "../../../../modules/commerce-cloud/shipping-profile-types"
import type { StoreShippingProfileBodyInput } from "../validators"

/** List seller shipping profiles with usage stats. */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const seller = await resolveApprovedSeller(
    req.scope,
    req.auth_context.actor_id
  )
  const commerce = req.scope.resolve(
    COMMERCE_CLOUD_MODULE
  ) as CommerceCloudModuleService
  const productCloud = req.scope.resolve(
    PRODUCT_CLOUD_MODULE
  ) as ProductCloudModuleService

  const profiles = await listEnrichedProfiles(
    commerce,
    productCloud,
    seller.id
  )
  res.json({ shipping_profiles: profiles })
}

/** Create seller shipping profile. */
export async function POST(
  req: AuthenticatedMedusaRequest<StoreShippingProfileBodyInput>,
  res: MedusaResponse
) {
  const seller = await resolveApprovedSeller(
    req.scope,
    req.auth_context.actor_id
  )
  const commerce = req.scope.resolve(
    COMMERCE_CLOUD_MODULE
  ) as CommerceCloudModuleService
  const productCloud = req.scope.resolve(
    PRODUCT_CLOUD_MODULE
  ) as ProductCloudModuleService
  const body = req.validatedBody
  const country_rates = normalizeCountryRates(body.country_rates)
  const processing_settings =
    body.processing_settings ?? defaultProcessingSettings()
  const status = body.status ?? "draft"
  if (status === "active") {
    assertProfileCanActivate({
      name: body.name,
      country_rates,
      processing_settings,
    })
  }

  const [created] = await commerce.createSellerShippingProfiles([
    {
      seller_id: seller.id,
      name: body.name,
      description: body.description ?? null,
      status,
      country_rates,
      processing_settings,
      carrier_mode: body.carrier_mode ?? "own",
      carrier_ref: body.carrier_ref ?? null,
    },
  ])

  res.status(201).json({
    shipping_profile: enrichShippingProfile(created, 0),
  })
}
