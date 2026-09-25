import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { PARTNER_MODULE } from "../../../../../modules/partner"
import type PartnerModuleService from "../../../../../modules/partner/service"
import { PRODUCT_CLOUD_MODULE } from "../../../../../modules/product-cloud"
import type ProductCloudModuleService from "../../../../../modules/product-cloud/service"
import { assertPermission } from "../../../../../modules/partner/permissions"
import { resolveApprovedSeller } from "../../resolve-seller"
import { sellerCanDirectEditCatalog } from "../../catalog-edit-guard"
import type { StoreBulkBrandLocationBodyInput } from "../../validators"
import { upsertProductMadeInEurope } from "../../made-in-europe-helpers"
import { listManageableBrands } from "../../../brands/brand-helpers"

export async function POST(
  req: AuthenticatedMedusaRequest<StoreBulkBrandLocationBodyInput>,
  res: MedusaResponse
) {
  const seller = await resolveApprovedSeller(req.scope, req.auth_context.actor_id)
  assertPermission(seller, "products.manage")
  assertPermission(seller, "mie.manage")

  const body = req.validatedBody
  const partner = req.scope.resolve(PARTNER_MODULE) as PartnerModuleService
  try {
    await partner.retrieveBrand(body.brand_id)
  } catch {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "Merk niet gevonden.")
  }
  const manageable = await listManageableBrands(req.scope, seller)
  if (!manageable.some((row) => row.id === body.brand_id)) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Dit merk is niet toegankelijk voor jouw partneraccount."
    )
  }
  const facility = await partner.retrieveProductionFacility(
    body.production_facility_id
  )
  if (facility.brand_id !== body.brand_id) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Productielocatie hoort niet bij het geselecteerde merk."
    )
  }
  if (facility.is_active === false) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Deze productielocatie is gedeactiveerd en kan niet opnieuw worden gekoppeld."
    )
  }

  const productCloud = req.scope.resolve(
    PRODUCT_CLOUD_MODULE
  ) as ProductCloudModuleService
  const results: Array<{ product_id: string; ok: boolean; error?: string }> = []
  for (const productId of body.product_ids) {
    try {
      const product = await productCloud.retrieveProduct(productId)
      const access = await sellerCanDirectEditCatalog(req.scope, product, seller)
      if (!access.allowed) {
        results.push({
          product_id: productId,
          ok: false,
          error: "Geen rechten voor dit product.",
        })
        continue
      }
      const updatedProduct =
        product.brand_id === body.brand_id
          ? product
          : await productCloud.updateProducts({
              id: product.id,
              brand_id: body.brand_id,
            })

      await upsertProductMadeInEurope(req.scope, {
        product_id: product.id,
        seller_id: seller.id,
        brand_id: body.brand_id,
        manufacturer_id: updatedProduct.manufacturer_id,
        input: {
          production_facility_id: body.production_facility_id,
          assembly_eu_band: facility.assembly_eu_band ?? "eu_100",
          parts_eu_level: facility.parts_eu_level ?? "eu_majority",
          materials_eu_level: facility.materials_eu_level ?? "eu_majority",
          primary_assembly_country:
            facility.primary_assembly_country ?? facility.country_code ?? "NL",
        },
      })
      results.push({ product_id: productId, ok: true })
    } catch (err) {
      results.push({
        product_id: productId,
        ok: false,
        error: err instanceof Error ? err.message : "Mislukt",
      })
    }
  }

  const failed = results.filter((r) => !r.ok)
  if (failed.length > 0) {
    res.status(400).json({
      message: "Niet alle producten konden worden bijgewerkt.",
      results,
    })
    return
  }

  res.status(200).json({
    message: `Productielocatie gekoppeld aan ${results.length} producten.`,
    results,
  })
}
