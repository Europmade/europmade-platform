import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { PRODUCT_CLOUD_MODULE } from "../../../../modules/product-cloud"
import type ProductCloudModuleService from "../../../../modules/product-cloud/service"
import { createProductCloudWorkflow } from "../../../../workflows/product-cloud"
import { COMMERCE_CLOUD_MODULE } from "../../../../modules/commerce-cloud"
import type CommerceCloudModuleService from "../../../../modules/commerce-cloud/service"
import { PARTNER_MODULE } from "../../../../modules/partner"
import type PartnerModuleService from "../../../../modules/partner/service"
import { resolveApprovedSeller } from "../resolve-seller"
import type { StoreCreateProductBodyInput } from "../validators"
import {
  buildSellerProductManagerRow,
  filterAndSortProductRows,
  loadSellerOfferLookup,
} from "../product-manager"
import { VERIFICATION_MODULE } from "../../../../modules/verification"
import type VerificationModuleService from "../../../../modules/verification/service"
import { generateConceptDraftIdentifier } from "../../../../modules/product-cloud/concept-identifier"
import {
  isValidGtin,
  normalizeGtinDigits,
} from "../../../../modules/product-cloud/gtin-validation"
import { listManageableBrands } from "../../brands/brand-helpers"

/** Eigen catalogus + offer/completeness (Seller Product Manager). */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const seller = await resolveApprovedSeller(
    req.scope,
    req.auth_context.actor_id
  )
  const productCloud = req.scope.resolve(
    PRODUCT_CLOUD_MODULE
  ) as ProductCloudModuleService

  let commerce: CommerceCloudModuleService | null = null
  try {
    commerce = req.scope.resolve(
      COMMERCE_CLOUD_MODULE
    ) as CommerceCloudModuleService
  } catch {
    commerce = null
  }

  let partner: PartnerModuleService | null = null
  try {
    partner = req.scope.resolve(PARTNER_MODULE) as PartnerModuleService
  } catch {
    partner = null
  }

  const products = await productCloud.listProducts({
    current_owner_seller_id: seller.id,
  })

  let verification: VerificationModuleService | null = null
  try {
    verification = req.scope.resolve(
      VERIFICATION_MODULE
    ) as VerificationModuleService
  } catch {
    verification = null
  }

  const offerMaps = await loadSellerOfferLookup(commerce, seller.id)
  const brandNameCache = new Map<string, string | null>()

  const enriched = []
  for (const product of products) {
    enriched.push(
      await buildSellerProductManagerRow(
        productCloud,
        commerce,
        product,
        seller.id,
        {
          offerMaps,
          partner,
          brandNameCache,
          verification,
          container: req.scope,
        }
      )
    )
  }

  const q =
    typeof req.query.q === "string" ? req.query.q : undefined
  const filter =
    typeof req.query.filter === "string" ? req.query.filter : undefined
  const sort =
    typeof req.query.sort === "string" ? req.query.sort : undefined
  const brandId =
    typeof req.query.brand_id === "string" ? req.query.brand_id : undefined

  const scoped = brandId
    ? enriched.filter((p) => p.brand_id === brandId)
    : enriched
  const filtered = filterAndSortProductRows(scoped, { q, filter, sort })

  res.json({
    products: filtered,
    count: filtered.length,
    total_unfiltered: enriched.length,
  })
}

/**
 * Nieuw Product Cloud-record — Retailer Created of Concept gecontroleerd.
 * Exacte EAN-match → geen duplicaat (marketplace-core §16).
 */
export async function POST(
  req: AuthenticatedMedusaRequest<StoreCreateProductBodyInput>,
  res: MedusaResponse
) {
  const seller = await resolveApprovedSeller(
    req.scope,
    req.auth_context.actor_id
  )
  const body = req.validatedBody

  const partner = req.scope.resolve(PARTNER_MODULE) as PartnerModuleService
  const brands = await listManageableBrands(req.scope, seller)
  const brandRaw = body.brand_id.trim()
  const brandHit =
    brands.find((b) => b.id === brandRaw) ||
    brands.find((b) => b.name.trim().toLowerCase() === brandRaw.toLowerCase())
  if (!brandHit) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Merk niet gevonden. Kies een bestaand merk of maak er eerst een aan."
    )
  }

  let identifier_type = body.identifier_type ?? "GTIN"
  let identifier_value = body.identifier_value?.trim() || ""
  let country_scope = body.country_scope ?? null

  if (!identifier_value) {
    const draft = generateConceptDraftIdentifier()
    identifier_type = draft.identifier_type
    identifier_value = draft.identifier_value
    country_scope = draft.country_scope
  } else if (
    identifier_type === "GTIN" ||
    /^\d{8,14}$/.test(identifier_value.replace(/\s/g, ""))
  ) {
    identifier_type = "GTIN"
    identifier_value = normalizeGtinDigits(identifier_value)
    if (!isValidGtin(identifier_value)) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Ongeldige EAN/GTIN (formaat of checksum)."
      )
    }
  }

  const { result } = await createProductCloudWorkflow(req.scope).run({
    input: {
      seller_id: seller.id,
      is_retailer: seller.is_retailer,
      is_producer_or_brand_owner: seller.is_producer_or_brand_owner,
      create_as_retailer: body.create_as_retailer,
      brand_id: brandHit.id,
      manufacturer_id: body.manufacturer_id?.trim() || brandHit.id,
      title: body.title,
      description: body.description,
      category_name: body.category_name,
      category_names: body.category_names,
      identifier_type,
      identifier_value,
      country_scope,
      variant_type: body.variant_type,
      variant_value: body.variant_value,
      media: body.media,
      mpn: body.mpn?.trim() || null,
    },
  })

  if (!result.created && result.exact_match_existing) {
    res.status(200).json({
      created: false,
      exact_match_existing: true,
      product_id: result.product_id,
      identifier_id: result.identifier_id,
      message:
        "Exacte EAN-match: koppel een Offer aan het bestaande product (Commerce Cloud), maak geen duplicaat.",
    })
    return
  }

  res.status(201).json(result)
}
