import type { MedusaContainer } from "@medusajs/framework/types"
import { MedusaError } from "@medusajs/framework/utils"
import { PARTNER_MODULE } from "../../../modules/partner"
import type PartnerModuleService from "../../../modules/partner/service"
import { PRODUCT_CLOUD_MODULE } from "../../../modules/product-cloud"
import type ProductCloudModuleService from "../../../modules/product-cloud/service"
import { VERIFICATION_MODULE } from "../../../modules/verification"
import type VerificationModuleService from "../../../modules/verification/service"
import {
  computeMadeInEuropeScore,
  isAssemblyEuBand,
  isEuCountryCode,
  isMaterialsEuLevel,
  isPartsEuLevel,
  type AssemblyEuBand,
  type MadeInEuropeScore,
  type MaterialsEuLevel,
  type PartsEuLevel,
} from "../../../modules/verification/made-in-europe"

export type MadeInEuropeAssignInput = {
  production_facility_id?: string | null
  assembly_eu_band?: string
  parts_eu_level?: string
  materials_eu_level?: string
  primary_assembly_country?: string | null
}

type ProductOriginRow = {
  id: string
  product_version_id: string
  manufacturer_id: string
  brand_id: string
  seller_id: string
  production_country: string
  production_location: string
  status: string
  production_facility_id?: string | null
  assembly_eu_band?: string | null
  parts_eu_level?: string | null
  materials_eu_level?: string | null
  primary_assembly_country?: string | null
}

type FacilityRow = {
  id: string
  brand_id: string
  name: string
  country_code: string
  region?: string | null
  description?: string | null
  assembly_eu_band?: string | null
  parts_eu_level?: string | null
  materials_eu_level?: string | null
  primary_assembly_country?: string | null
}

function requireBand<T extends string>(
  value: string | null | undefined,
  check: (v: string) => v is T,
  label: string
): T {
  if (!value || !check(value)) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Ongeldige ${label}: ${value ?? "(leeg)"}`
    )
  }
  return value
}

export function resolveEffectiveMadeInEuropeBands(
  input: MadeInEuropeAssignInput,
  facility: FacilityRow | null
): {
  assembly_eu_band: AssemblyEuBand
  parts_eu_level: PartsEuLevel
  materials_eu_level: MaterialsEuLevel
  primary_assembly_country: string | null
  production_facility_id: string | null
} {
  const assembly = requireBand(
    input.assembly_eu_band ?? facility?.assembly_eu_band ?? undefined,
    isAssemblyEuBand,
    "assembly_eu_band"
  )
  const parts = requireBand(
    input.parts_eu_level ?? facility?.parts_eu_level ?? undefined,
    isPartsEuLevel,
    "parts_eu_level"
  )
  const materials = requireBand(
    input.materials_eu_level ?? facility?.materials_eu_level ?? undefined,
    isMaterialsEuLevel,
    "materials_eu_level"
  )
  const countryRaw =
    input.primary_assembly_country ??
    facility?.primary_assembly_country ??
    facility?.country_code ??
    null
  const primary_assembly_country = countryRaw
    ? countryRaw.trim().toUpperCase()
    : null
  if (primary_assembly_country && !isEuCountryCode(primary_assembly_country)) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "primary_assembly_country moet een EU-land zijn."
    )
  }
  return {
    assembly_eu_band: assembly,
    parts_eu_level: parts,
    materials_eu_level: materials,
    primary_assembly_country,
    production_facility_id: facility?.id ?? input.production_facility_id ?? null,
  }
}

export async function loadPublishedVersionId(
  productCloud: ProductCloudModuleService,
  productId: string
): Promise<string | null> {
  const versions = (await productCloud.listProductVersions(
    { product_id: productId, publication_status: "Gepubliceerd" },
    { order: { version_number: "DESC" }, take: 1 }
  )) as Array<{ id: string }>
  if (versions[0]) return versions[0].id
  const any = (await productCloud.listProductVersions(
    { product_id: productId },
    { order: { version_number: "DESC" }, take: 1 }
  )) as Array<{ id: string }>
  return any[0]?.id ?? null
}

export async function upsertProductMadeInEurope(
  scope: MedusaContainer,
  opts: {
    product_id: string
    seller_id: string
    brand_id: string
    manufacturer_id: string
    input: MadeInEuropeAssignInput
  }
): Promise<{
  product_id: string
  product_version_id: string
  origin: ProductOriginRow
  score: MadeInEuropeScore
  facility: FacilityRow | null
}> {
  const productCloud = scope.resolve(
    PRODUCT_CLOUD_MODULE
  ) as ProductCloudModuleService
  const verification = scope.resolve(
    VERIFICATION_MODULE
  ) as VerificationModuleService
  const partner = scope.resolve(PARTNER_MODULE) as PartnerModuleService

  const versionId = await loadPublishedVersionId(productCloud, opts.product_id)
  if (!versionId) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      "Geen productversie gevonden."
    )
  }

  let facility: FacilityRow | null = null
  const facilityId = opts.input.production_facility_id?.trim() || null
  if (facilityId) {
    try {
      facility = (await partner.retrieveProductionFacility(
        facilityId
      )) as FacilityRow
    } catch {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        "Productiefaciliteit niet gevonden."
      )
    }
    if (facility.brand_id && facility.brand_id !== opts.brand_id) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "Productiefaciliteit hoort niet bij het productmerk."
      )
    }
  }

  const bands = resolveEffectiveMadeInEuropeBands(opts.input, facility)
  const score = computeMadeInEuropeScore(bands)
  const production_country =
    bands.primary_assembly_country ?? facility?.country_code ?? "EU"
  const production_location = facility?.name ?? production_country

  const existing = (await verification.listProductOrigins({
    product_version_id: versionId,
  })) as ProductOriginRow[]
  const current = existing[0]

  const payload = {
    manufacturer_id: opts.manufacturer_id || facility?.brand_id || "unknown",
    brand_id: opts.brand_id,
    seller_id: opts.seller_id,
    production_country,
    production_location,
    status: current?.status ?? "Niet aangevraagd",
    production_facility_id: bands.production_facility_id,
    assembly_eu_band: bands.assembly_eu_band,
    parts_eu_level: bands.parts_eu_level,
    materials_eu_level: bands.materials_eu_level,
    primary_assembly_country: bands.primary_assembly_country,
  }

  let origin: ProductOriginRow
  if (current) {
    const updated = await verification.updateProductOrigins({
      id: current.id,
      ...payload,
    })
    origin = (Array.isArray(updated) ? updated[0] : updated) as ProductOriginRow
  } else {
    origin = (await verification.createProductOrigins({
      product_version_id: versionId,
      ...payload,
    })) as ProductOriginRow
  }

  return {
    product_id: opts.product_id,
    product_version_id: versionId,
    origin,
    score,
    facility,
  }
}

export async function loadMadeInEuropeForProduct(
  scope: MedusaContainer,
  productId: string
): Promise<{
  score: MadeInEuropeScore | null
  facility: FacilityRow | null
  origin: ProductOriginRow | null
} | null> {
  const productCloud = scope.resolve(
    PRODUCT_CLOUD_MODULE
  ) as ProductCloudModuleService
  const verification = scope.resolve(
    VERIFICATION_MODULE
  ) as VerificationModuleService
  const partner = scope.resolve(PARTNER_MODULE) as PartnerModuleService

  const versionId = await loadPublishedVersionId(productCloud, productId)
  if (!versionId) return null

  const origins = (await verification.listProductOrigins({
    product_version_id: versionId,
  })) as ProductOriginRow[]
  const origin = origins[0] ?? null
  if (
    !origin?.assembly_eu_band ||
    !origin.parts_eu_level ||
    !origin.materials_eu_level
  ) {
    return { score: null, facility: null, origin }
  }
  if (
    !isAssemblyEuBand(origin.assembly_eu_band) ||
    !isPartsEuLevel(origin.parts_eu_level) ||
    !isMaterialsEuLevel(origin.materials_eu_level)
  ) {
    return { score: null, facility: null, origin }
  }

  let facility: FacilityRow | null = null
  if (origin.production_facility_id) {
    try {
      facility = (await partner.retrieveProductionFacility(
        origin.production_facility_id
      )) as FacilityRow
    } catch {
      facility = null
    }
  }

  const score = computeMadeInEuropeScore({
    assembly_eu_band: origin.assembly_eu_band,
    parts_eu_level: origin.parts_eu_level,
    materials_eu_level: origin.materials_eu_level,
    primary_assembly_country: origin.primary_assembly_country,
  })

  return { score, facility, origin }
}
