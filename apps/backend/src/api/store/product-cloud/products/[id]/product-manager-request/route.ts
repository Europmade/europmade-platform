import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { z } from "zod"
import { PRODUCT_CLOUD_MODULE } from "../../../../../../modules/product-cloud"
import type ProductCloudModuleService from "../../../../../../modules/product-cloud/service"
import { COMMERCE_CLOUD_MODULE } from "../../../../../../modules/commerce-cloud"
import type CommerceCloudModuleService from "../../../../../../modules/commerce-cloud/service"
import { PARTNER_MODULE } from "../../../../../../modules/partner"
import type PartnerModuleService from "../../../../../../modules/partner/service"
import {
  isRealBrandId,
  resolveOfferSellerIdsForProduct,
} from "../../../../../../modules/product-cloud/catalog-edit-auth"
import {
  buildProductManagerRequestFields,
  findProductManagerProposalChange,
  isAlreadyProductManager,
  isProductManagerProposalFields,
  resolveProductManagerRequestKind,
} from "../../../../../../modules/product-cloud/product-manager-request"
import {
  isVerifiedBrandOwner,
  type BrandPublicRow,
} from "../../../../brands/ownership"
import { resolveApprovedSeller } from "../../../resolve-seller"
import { submitChangeProposalWorkflow } from "../../../../../../workflows/product-cloud"

type RouteParams = { id: string }

const BodySchema = z.object({
  toelichting: z.string().trim().max(2000).optional(),
})

/**
 * POST /store/product-cloud/products/:id/product-manager-request
 * Seller with offer (or verified brand owner) requests to become Productbeheerder.
 * Creates a change_proposal with field product_manager (In behandeling).
 */
export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const seller = await resolveApprovedSeller(
    req.scope,
    req.auth_context.actor_id
  )
  const { id } = req.params as RouteParams
  const parsed = BodySchema.safeParse(req.body ?? {})
  if (!parsed.success) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Ongeldige aanvraag."
    )
  }

  const productCloud = req.scope.resolve(
    PRODUCT_CLOUD_MODULE
  ) as ProductCloudModuleService
  const partner = req.scope.resolve(PARTNER_MODULE) as PartnerModuleService
  let commerce: CommerceCloudModuleService | null = null
  try {
    commerce = req.scope.resolve(
      COMMERCE_CLOUD_MODULE
    ) as CommerceCloudModuleService
  } catch {
    commerce = null
  }

  const product = await productCloud.retrieveProduct(id)
  const offerSellerIds = await resolveOfferSellerIdsForProduct(
    productCloud,
    commerce,
    id
  )
  const hasOffer = offerSellerIds.includes(seller.id)

  let isBrandOwner = false
  if (isRealBrandId(product.brand_id)) {
    try {
      const brand = (await partner.retrieveBrand(
        product.brand_id!
      )) as BrandPublicRow & { id: string }
      isBrandOwner = await isVerifiedBrandOwner(partner, seller, brand)
    } catch {
      isBrandOwner = false
    }
  }

  if (
    isAlreadyProductManager({
      actorSellerId: seller.id,
      kind: (product as { product_manager_kind?: string }).product_manager_kind,
      seller_id: (product as { product_manager_seller_id?: string | null })
        .product_manager_seller_id,
      isBrandOwner,
    })
  ) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Je bent al Productbeheerder van dit product."
    )
  }

  const requestKind = resolveProductManagerRequestKind({
    hasOffer,
    isBrandOwner,
  })
  if (!requestKind) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Alleen sellers met een aanbod op dit product of de geverifieerde merkeigenaar kunnen Productbeheerder aanvragen."
    )
  }

  const pending = (await productCloud.listChangeProposals({
    product_id: id,
    submitter_seller_id: seller.id,
    status: "In behandeling",
  })) as Array<{ id: string; proposed_fields?: unknown }>
  const hasPendingPm = pending.some((p) =>
    isProductManagerProposalFields(p.proposed_fields)
  )
  if (hasPendingPm) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Er loopt al een Productbeheerder-aanvraag voor dit product."
    )
  }

  const proposed_fields = buildProductManagerRequestFields({
    currentKind: (product as { product_manager_kind?: string })
      .product_manager_kind,
    currentSellerId: (product as { product_manager_seller_id?: string | null })
      .product_manager_seller_id,
    requestKind,
    requesterSellerId: seller.id,
  })

  const toelichting =
    parsed.data.toelichting?.trim() ||
    "Aanvraag om Productbeheerder te worden van dit Product Cloud-product."

  const { result } = await submitChangeProposalWorkflow(req.scope).run({
    input: {
      product_id: id,
      submitter_seller_id: seller.id,
      proposed_fields,
      toelichting,
    },
  })

  res.status(201).json({
    change_proposal: result,
    product_manager_request: {
      status: "In behandeling",
      request_kind: requestKind,
      change: findProductManagerProposalChange(proposed_fields),
    },
  })
}
