import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { PRODUCT_CLOUD_MODULE } from "../../../../../../modules/product-cloud"
import type ProductCloudModuleService from "../../../../../../modules/product-cloud/service"
import { isRealBrandId } from "../../../../../../modules/product-cloud/catalog-edit-auth"
import { VERIFICATION_MODULE } from "../../../../../../modules/verification"
import type VerificationModuleService from "../../../../../../modules/verification/service"
import { resolveApprovedSeller } from "../../../resolve-seller"
import {
  sellerCanDirectEditCatalog,
  sellerHasOfferOnProduct,
} from "../../../catalog-edit-guard"
import {
  findClaimForProductRefs,
  serializeEuropeanOwnershipClaim,
} from "../../../european-ownership-helpers"

type RouteParams = { id: string }

async function resolveProductBrandRefs(
  productCloud: ProductCloudModuleService,
  productId: string
): Promise<{
  brand_id: string | null
  manufacturer_id: string | null
  product: {
    id: string
    brand_id?: string | null
    manufacturer_id?: string | null
    current_owner_seller_id?: string | null
  }
}> {
  const product = (await productCloud.retrieveProduct(productId)) as {
    id: string
    brand_id?: string | null
    manufacturer_id?: string | null
    current_owner_seller_id?: string | null
  }
  const brandId = (product.brand_id || "").trim()
  return {
    brand_id: isRealBrandId(brandId) ? brandId : null,
    manufacturer_id: (product.manufacturer_id || "").trim() || null,
    product,
  }
}

/**
 * GET /store/product-cloud/products/:id/european-ownership
 * Read-only view of brand-level claim for the product's brand.
 */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const { id } = req.params as RouteParams
  const seller = await resolveApprovedSeller(
    req.scope,
    req.auth_context.actor_id
  )
  const productCloud = req.scope.resolve(
    PRODUCT_CLOUD_MODULE
  ) as ProductCloudModuleService
  const verification = req.scope.resolve(
    VERIFICATION_MODULE
  ) as VerificationModuleService

  const { brand_id, manufacturer_id, product } =
    await resolveProductBrandRefs(productCloud, id)

  const access = await sellerCanDirectEditCatalog(req.scope, product, seller)
  const hasOffer = await sellerHasOfferOnProduct(req.scope, id, seller.id)
  if (
    !access.allowed &&
    !hasOffer &&
    product.current_owner_seller_id !== seller.id
  ) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Geen toegang tot dit product."
    )
  }

  if (!brand_id) {
    res.json({
      brand_id: null,
      manufacturer_id,
      claim: null,
      history: [],
      inherited_from_brand: false,
      manage_at: null,
    })
    return
  }

  const claim = await findClaimForProductRefs(verification, {
    brand_id,
    manufacturer_id,
  })
  const events = claim
    ? await verification.listEuropeanOwnershipStatusEvents(
        { claim_id: claim.id },
        { order: { created_at: "DESC" }, take: 50 }
      )
    : []

  res.json({
    brand_id,
    manufacturer_id,
    claim: claim ? serializeEuropeanOwnershipClaim(claim) : null,
    history: events,
    inherited_from_brand: Boolean(claim?.brand_id || claim),
    manage_at: `/seller/brands/${encodeURIComponent(brand_id)}`,
  })
}

/**
 * PUT is disabled: European ownership is managed on the brand, not per product.
 */
export async function PUT(
  _req: AuthenticatedMedusaRequest,
  _res: MedusaResponse
) {
  throw new MedusaError(
    MedusaError.Types.NOT_ALLOWED,
    "Europese eigendom wordt beheerd op merkniveau (Seller → Merken). Producten tonen alleen de merkgegevens."
  )
}
