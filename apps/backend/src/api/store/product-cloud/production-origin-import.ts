import type { MedusaContainer } from "@medusajs/framework/types"
import { VERIFICATION_MODULE } from "../../../modules/verification"
import type VerificationModuleService from "../../../modules/verification/service"

/**
 * Persist Productieland from import onto product_origin (verification module).
 * Uses the working product version — does not infer from Fabrikantland.
 */
export async function persistImportProductionOrigin(opts: {
  scope: MedusaContainer
  product_version_id: string
  brand_id: string
  manufacturer_id: string
  seller_id: string
  /** Excel Productieland — only persisted when non-empty. */
  production_country?: string | null
  /** Excel Productieplaats — optional location label. */
  production_location?: string | null
  /** Reuse path: keep a country that is already stored. */
  only_if_empty?: boolean
}): Promise<{ origin_id: string } | null> {
  const country = opts.production_country?.trim()
  if (!country) return null

  const verification = opts.scope.resolve(
    VERIFICATION_MODULE
  ) as VerificationModuleService

  const existing = (await verification.listProductOrigins({
    product_version_id: opts.product_version_id,
  })) as Array<{ id: string; production_country?: string | null }>

  if (opts.only_if_empty && String(existing[0]?.production_country || "").trim()) {
    return { origin_id: existing[0].id }
  }

  const location =
    opts.production_location?.trim() || country
  const iso = /^[A-Za-z]{2}$/.test(country) ? country.toUpperCase() : null

  const payload = {
    manufacturer_id: opts.manufacturer_id,
    brand_id: opts.brand_id,
    seller_id: opts.seller_id,
    production_country: iso || country,
    production_location: location,
    primary_assembly_country: iso,
    status: "Niet aangevraagd" as const,
  }

  if (existing[0]) {
    await verification.updateProductOrigins({
      id: existing[0].id,
      manufacturer_id: payload.manufacturer_id,
      brand_id: payload.brand_id,
      seller_id: payload.seller_id,
      production_country: payload.production_country,
      production_location: payload.production_location,
      primary_assembly_country: payload.primary_assembly_country,
    })
    return { origin_id: existing[0].id }
  }

  const created = (await verification.createProductOrigins({
    product_version_id: opts.product_version_id,
    ...payload,
  })) as { id: string }

  return { origin_id: created.id }
}
