import type { MedusaContainer } from "@medusajs/framework/types"
import { PRODUCT_CLOUD_MODULE } from "../../../../modules/product-cloud"
import type ProductCloudModuleService from "../../../../modules/product-cloud/service"
import { COMMERCE_CLOUD_MODULE } from "../../../../modules/commerce-cloud"
import type CommerceCloudModuleService from "../../../../modules/commerce-cloud/service"
import { PARTNER_MODULE } from "../../../../modules/partner"
import type PartnerModuleService from "../../../../modules/partner/service"
import { adminDecideVersionWorkflow } from "../../../../workflows/product-cloud"
import { buildSellerProductManagerDetail } from "../../../store/product-cloud/product-manager"
import { assertValidGtinForSubmission } from "../../../store/product-cloud/submit-gates"
import { listSectionReviewsForProduct } from "../../../../modules/product-cloud/section-review-helpers"
import type { ProductApprovalDeps } from "../../../../modules/product-cloud/product-approval-decision"

const NOT_PUBLISHABLE =
  "Product is niet publiceerbaar — keur eerst verplichte documenten goed en controleer completeness."

export function buildAdminApprovalDeps(scope: MedusaContainer): ProductApprovalDeps & {
  listProducts: ProductCloudModuleService["listProducts"]
} {
  const productCloud = scope.resolve(PRODUCT_CLOUD_MODULE) as ProductCloudModuleService
  let commerce: CommerceCloudModuleService | null = null
  try {
    commerce = scope.resolve(COMMERCE_CLOUD_MODULE) as CommerceCloudModuleService
  } catch {
    commerce = null
  }
  let partner: PartnerModuleService | null = null
  try {
    partner = scope.resolve(PARTNER_MODULE) as PartnerModuleService
  } catch {
    partner = null
  }

  return {
    retrieveProduct: (productId) => productCloud.retrieveProduct(productId),
    listProductVersions: async (productId) =>
      (await productCloud.listProductVersions({ product_id: productId })) as Array<{
        id: string
        publication_status: string
        version_number: number
        title?: string | null
      }>,
    listSectionReviews: (productId) => listSectionReviewsForProduct(productCloud, productId),
    loadPublishable: async (productId) => {
      const product = await productCloud.retrieveProduct(productId)
      const detail = await buildSellerProductManagerDetail(
        productCloud,
        commerce,
        productId,
        product.current_owner_seller_id,
        partner,
        scope
      )
      return {
        publishable: !!detail?.completeness.publishable,
        reason:
          detail?.completeness.publication_blocked_reasons?.[0] || NOT_PUBLISHABLE,
      }
    },
    assertGtin: (productId) => assertValidGtinForSubmission(productCloud, productId),
    decide: async (input) => {
      const { result } = await adminDecideVersionWorkflow(scope).run({
        input: {
          product_id: input.product_id,
          version_id: input.version_id,
          actor_id: input.actor_id,
          decision: "approved",
          reason: input.reason,
        },
      })
      return result as { version?: unknown; lifecycle_status?: string }
    },
    listProducts: (filter) =>
      productCloud.listProducts(filter, {
        take: 500,
        order: { updated_at: "DESC" },
      }),
  }
}
