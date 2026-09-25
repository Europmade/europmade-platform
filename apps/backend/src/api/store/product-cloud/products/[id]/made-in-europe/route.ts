import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { PRODUCT_CLOUD_MODULE } from "../../../../../../modules/product-cloud"
import type ProductCloudModuleService from "../../../../../../modules/product-cloud/service"
import { resolveApprovedSeller } from "../../../resolve-seller"
import { assertSellerCanDirectEditCatalog } from "../../../catalog-edit-guard"
import { assertPermission } from "../../../../../../modules/partner/permissions"
import type { StoreAssignMadeInEuropeBodyInput } from "../../../validators"
import {
  upsertProductMadeInEurope,
  loadMadeInEuropeForProduct,
  serializeProductionLocation,
} from "../../../made-in-europe-helpers"

type RouteParams = { id: string }

/**
 * POST /store/product-cloud/products/:id/made-in-europe
 * Owner-only: koppel facility/profiel; score wordt server-side berekend.
 */
export async function POST(
  req: AuthenticatedMedusaRequest<StoreAssignMadeInEuropeBodyInput>,
  res: MedusaResponse
) {
  const seller = await resolveApprovedSeller(
    req.scope,
    req.auth_context.actor_id
  )
  assertPermission(seller, "mie.manage")
  const { id } = req.params as RouteParams
  const productCloud = req.scope.resolve(
    PRODUCT_CLOUD_MODULE
  ) as ProductCloudModuleService

  let product: {
    id: string
    brand_id: string
    manufacturer_id: string
    current_owner_seller_id: string
  }
  try {
    product = await productCloud.retrieveProduct(id)
  } catch {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "Product niet gevonden.")
  }
  await assertSellerCanDirectEditCatalog(req.scope, product, seller)

  const result = await upsertProductMadeInEurope(req.scope, {
    product_id: id,
    seller_id: seller.id,
    brand_id: product.brand_id,
    manufacturer_id: product.manufacturer_id,
    input: req.validatedBody,
  })

  res.status(200).json({
    product_id: result.product_id,
    product_version_id: result.product_version_id,
    made_in_europe: result.score,
    facility: serializeProductionLocation(result.facility),
  })
}

/**
 * GET /store/product-cloud/products/:id/made-in-europe — owner preview.
 */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const seller = await resolveApprovedSeller(
    req.scope,
    req.auth_context.actor_id
  )
  const { id } = req.params as RouteParams
  const productCloud = req.scope.resolve(
    PRODUCT_CLOUD_MODULE
  ) as ProductCloudModuleService
  const product = await productCloud.retrieveProduct(id)
  await assertSellerCanDirectEditCatalog(req.scope, product, seller)

  const data = await loadMadeInEuropeForProduct(req.scope, id)
  res.status(200).json({
    product_id: id,
    made_in_europe: data?.score ?? null,
    facility: serializeProductionLocation(data?.facility ?? null),
  })
}
