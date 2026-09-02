import { MedusaError } from "@medusajs/framework/utils"
import type CommerceCloudModuleService from "./service"
import type ProductCloudModuleService from "../product-cloud/service"
import {
  defaultProcessingSettings,
  deliveryDaysMaxForCode,
  normalizeCountryRates,
  resolveEffectiveShippingCost,
  validateShippingProfileInput,
  type ProcessingSettings,
  type ShippingCountryConfig,
  type ShippingProfileRecord,
} from "./shipping-profile-types"

export type EnrichedShippingProfile = ShippingProfileRecord & {
  linked_product_count: number
  active_country_count: number
  min_shipping_cost: number | null
}

export function enrichShippingProfile(
  profile: Record<string, unknown>,
  linkedProductCount = 0
): EnrichedShippingProfile {
  const country_rates = normalizeCountryRates(
    profile.country_rates as Record<string, unknown>
  )
  const active = Object.values(country_rates).filter((c) => c.active !== false)
  const costs = active
    .map((c) => resolveEffectiveShippingCost(c))
    .filter((n) => Number.isFinite(n))
  return {
    id: String(profile.id),
    seller_id: String(profile.seller_id),
    name: String(profile.name),
    description: (profile.description as string | null) ?? null,
    status: (profile.status as ShippingProfileRecord["status"]) || "draft",
    country_rates,
    processing_settings:
      (profile.processing_settings as ProcessingSettings) ||
      defaultProcessingSettings(),
    carrier_mode:
      (profile.carrier_mode as ShippingProfileRecord["carrier_mode"]) || "own",
    carrier_ref:
      (profile.carrier_ref as ShippingProfileRecord["carrier_ref"]) ?? null,
    created_at: profile.created_at as string | Date | undefined,
    updated_at: profile.updated_at as string | Date | undefined,
    linked_product_count: linkedProductCount,
    active_country_count: active.length,
    min_shipping_cost: costs.length ? Math.min(...costs) : null,
  }
}

export async function countProductsForProfile(
  productCloud: ProductCloudModuleService,
  sellerId: string,
  profileId: string
): Promise<number> {
  const products = await productCloud.listProducts({
    current_owner_seller_id: sellerId,
    shipping_profile_id: profileId,
  })
  return products.length
}

export async function countOffersForProfile(
  commerce: CommerceCloudModuleService,
  sellerId: string,
  profileId: string
): Promise<number> {
  const offers = await commerce.listOffers({
    seller_id: sellerId,
    shipping_profile_id: profileId,
  })
  return offers.length
}

export function assertProfileWritable(
  profile: { seller_id: string },
  sellerId: string
) {
  if (profile.seller_id !== sellerId) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      "Verzendprofiel niet gevonden."
    )
  }
}

export function assertProfileCanActivate(input: {
  name?: string | null
  country_rates?: Record<string, ShippingCountryConfig> | null
  processing_settings?: ProcessingSettings | null
}) {
  const issues = validateShippingProfileInput(input)
  if (issues.length) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      issues.map((i) => i.message).join(" ")
    )
  }
}

export async function syncProfileToProductOffers(
  commerce: CommerceCloudModuleService,
  productCloud: ProductCloudModuleService,
  opts: {
    sellerId: string
    productId: string
    profileId: string | null
  }
): Promise<{ offers_updated: number }> {
  const product = await productCloud.retrieveProduct(opts.productId)
  if (product.current_owner_seller_id !== opts.sellerId) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Geen rechten voor dit product."
    )
  }

  await productCloud.updateProducts({
    id: product.id,
    shipping_profile_id: opts.profileId,
  })

  if (!opts.profileId) {
    const variants = await productCloud.listProductVariants({
      product_id: product.id,
    })
    let offers_updated = 0
    for (const variant of variants) {
      const identifiers = await productCloud.listIdentifiers({
        product_variant_id: variant.id,
      })
      for (const ident of identifiers) {
        const offers = await commerce.listOffers({
          seller_id: opts.sellerId,
          identifier_id: ident.id,
        })
        for (const offer of offers) {
          await commerce.updateOffers({
            id: offer.id,
            shipping_profile_id: null,
          })
          offers_updated++
        }
      }
    }
    return { offers_updated }
  }

  const [profile] = await commerce.listSellerShippingProfiles({
    id: opts.profileId,
  })
  if (!profile || profile.seller_id !== opts.sellerId) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      "Verzendprofiel niet gevonden."
    )
  }

  const country_rates = normalizeCountryRates(
    profile.country_rates as Record<string, unknown>
  )

  const variants = await productCloud.listProductVariants({
    product_id: product.id,
  })
  let offers_updated = 0
  for (const variant of variants) {
    const identifiers = await productCloud.listIdentifiers({
      product_variant_id: variant.id,
    })
    for (const ident of identifiers) {
      const offers = await commerce.listOffers({
        seller_id: opts.sellerId,
        identifier_id: ident.id,
      })
      for (const offer of offers) {
        const region = (offer.region_code || "").toUpperCase()
        const cfg = country_rates[region]
        const shipping_cost =
          cfg && cfg.active !== false
            ? resolveEffectiveShippingCost(cfg)
            : 0
        const delivery_days_max =
          cfg?.delivery_days_max ??
          (cfg?.delivery_time_code
            ? deliveryDaysMaxForCode(cfg.delivery_time_code)
            : offer.delivery_days_max)

        await commerce.updateOffers({
          id: offer.id,
          shipping_profile_id: opts.profileId,
          delivery_days_max: delivery_days_max ?? null,
        })

        const [price] = await commerce.listOfferPrices({ offer_id: offer.id })
        if (price) {
          await commerce.updateOfferPrices({
            id: price.id,
            shipping_cost,
          })
        }
        offers_updated++
      }
    }
  }

  return { offers_updated }
}

export async function duplicateShippingProfile(
  commerce: CommerceCloudModuleService,
  opts: { sellerId: string; profileId: string; newName: string }
) {
  const [existing] = await commerce.listSellerShippingProfiles({
    id: opts.profileId,
  })
  assertProfileWritable(existing, opts.sellerId)

  const [created] = await commerce.createSellerShippingProfiles([
    {
      seller_id: opts.sellerId,
      name: opts.newName.trim(),
      description: existing.description ?? null,
      status: "draft",
      country_rates: existing.country_rates ?? {},
      processing_settings:
        existing.processing_settings ?? defaultProcessingSettings(),
      carrier_mode: existing.carrier_mode ?? "own",
      carrier_ref: existing.carrier_ref ?? null,
    },
  ])
  return created
}

export async function deleteShippingProfileSafe(
  commerce: CommerceCloudModuleService,
  productCloud: ProductCloudModuleService,
  opts: { sellerId: string; profileId: string }
) {
  const [existing] = await commerce.listSellerShippingProfiles({
    id: opts.profileId,
  })
  assertProfileWritable(existing, opts.sellerId)

  const productCount = await countProductsForProfile(
    productCloud,
    opts.sellerId,
    opts.profileId
  )
  const offerCount = await countOffersForProfile(
    commerce,
    opts.sellerId,
    opts.profileId
  )
  if (productCount > 0 || offerCount > 0) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      `Dit verzendprofiel is nog gekoppeld aan ${productCount} product(en). Koppel deze eerst aan een ander profiel voordat je verwijdert.`
    )
  }

  await commerce.deleteSellerShippingProfiles([opts.profileId])
}

export async function listEnrichedProfiles(
  commerce: CommerceCloudModuleService,
  productCloud: ProductCloudModuleService,
  sellerId: string
): Promise<EnrichedShippingProfile[]> {
  const profiles = await commerce.listSellerShippingProfiles({
    seller_id: sellerId,
  })
  const enriched: EnrichedShippingProfile[] = []
  for (const profile of profiles) {
    const count = await countProductsForProfile(
      productCloud,
      sellerId,
      profile.id
    )
    enriched.push(enrichShippingProfile(profile, count))
  }
  return enriched.sort((a, b) => a.name.localeCompare(b.name, "nl"))
}
