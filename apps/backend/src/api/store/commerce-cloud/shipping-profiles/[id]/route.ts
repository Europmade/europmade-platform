import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { COMMERCE_CLOUD_MODULE } from "../../../../../modules/commerce-cloud"
import type CommerceCloudModuleService from "../../../../../modules/commerce-cloud/service"
import { PRODUCT_CLOUD_MODULE } from "../../../../../modules/product-cloud"
import type ProductCloudModuleService from "../../../../../modules/product-cloud/service"
import { resolveApprovedSeller } from "../../../product-cloud/resolve-seller"
import {
  assertProfileCanActivate,
  assertProfileWritable,
  countProductsForProfile,
  deleteShippingProfileSafe,
  enrichShippingProfile,
  resyncOffersForShippingProfile,
} from "../../../../../modules/commerce-cloud/shipping-profile-engine"
import {
  normalizeCountryRates,
} from "../../../../../modules/commerce-cloud/shipping-profile-types"
import type { StorePatchShippingProfileBodyInput } from "../../validators"

type RouteParams = { id: string }

export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const seller = await resolveApprovedSeller(
    req.scope,
    req.auth_context.actor_id
  )
  const { id } = req.params as RouteParams
  const commerce = req.scope.resolve(
    COMMERCE_CLOUD_MODULE
  ) as CommerceCloudModuleService
  const productCloud = req.scope.resolve(
    PRODUCT_CLOUD_MODULE
  ) as ProductCloudModuleService

  const [profile] = await commerce.listSellerShippingProfiles({ id })
  assertProfileWritable(profile, seller.id)
  const linked = await countProductsForProfile(
    productCloud,
    seller.id,
    profile.id
  )
  res.json({ shipping_profile: enrichShippingProfile(profile, linked) })
}

export async function PATCH(
  req: AuthenticatedMedusaRequest<StorePatchShippingProfileBodyInput>,
  res: MedusaResponse
) {
  const seller = await resolveApprovedSeller(
    req.scope,
    req.auth_context.actor_id
  )
  const { id } = req.params as RouteParams
  const commerce = req.scope.resolve(
    COMMERCE_CLOUD_MODULE
  ) as CommerceCloudModuleService
  const productCloud = req.scope.resolve(
    PRODUCT_CLOUD_MODULE
  ) as ProductCloudModuleService
  const body = req.validatedBody

  const [existing] = await commerce.listSellerShippingProfiles({ id })
  assertProfileWritable(existing, seller.id)

  const nextStatus = body.status ?? existing.status
  const nextRates =
    body.country_rates != null
      ? normalizeCountryRates(body.country_rates)
      : normalizeCountryRates(
          existing.country_rates as Record<string, unknown>
        )
  const nextProcessing =
    body.processing_settings ?? existing.processing_settings
  const nextName = body.name ?? existing.name

  if (nextStatus === "active") {
    assertProfileCanActivate({
      name: nextName,
      country_rates: nextRates,
      processing_settings: nextProcessing,
    })
  }

  const [updated] = await commerce.updateSellerShippingProfiles([
    {
      id,
      ...body,
      country_rates: body.country_rates != null ? nextRates : undefined,
    },
  ])

  const sync = await resyncOffersForShippingProfile(commerce, productCloud, {
    sellerId: seller.id,
    profileId: updated.id,
  })

  const linked = await countProductsForProfile(
    productCloud,
    seller.id,
    updated.id
  )
  res.json({
    shipping_profile: enrichShippingProfile(updated, linked),
    sync: {
      products_synced: sync.products_synced,
      offers_updated: sync.offers_updated,
    },
  })
}

export async function DELETE(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const seller = await resolveApprovedSeller(
    req.scope,
    req.auth_context.actor_id
  )
  const { id } = req.params as RouteParams
  const commerce = req.scope.resolve(
    COMMERCE_CLOUD_MODULE
  ) as CommerceCloudModuleService
  const productCloud = req.scope.resolve(
    PRODUCT_CLOUD_MODULE
  ) as ProductCloudModuleService

  await deleteShippingProfileSafe(commerce, productCloud, {
    sellerId: seller.id,
    profileId: id,
  })
  res.status(204).end()
}
