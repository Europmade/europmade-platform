import type { MedusaContainer } from "@medusajs/framework/types"
import { PRODUCT_CLOUD_MODULE } from "../../../../modules/product-cloud"
import type ProductCloudModuleService from "../../../../modules/product-cloud/service"
import { COMMERCE_CLOUD_MODULE } from "../../../../modules/commerce-cloud"
import type CommerceCloudModuleService from "../../../../modules/commerce-cloud/service"
import { PARTNER_MODULE } from "../../../../modules/partner"
import type PartnerModuleService from "../../../../modules/partner/service"
import {
  adminDecideVersionWorkflow,
  publishVersionWorkflow,
} from "../../../../workflows/product-cloud"
import {
  productPublicationBlockers,
  publishVersionAfterApproval,
} from "../../../../modules/product-cloud/approval-publication"
import { buildSellerProductManagerDetail } from "../../../store/product-cloud/product-manager"
import { assertValidGtinForSubmission } from "../../../store/product-cloud/submit-gates"
import { listSectionReviewsForProduct } from "../../../../modules/product-cloud/section-review-helpers"
import {
  describeOfferStatus,
  describeSellability,
  type ProductApprovalDeps,
} from "../../../../modules/product-cloud/product-approval-decision"

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
      const productReasons = productPublicationBlockers(
        detail?.completeness.publication_blocked_reasons || []
      )
      return {
        publishable: productReasons.length === 0,
        reason: productReasons[0] || NOT_PUBLISHABLE,
        findings: detail?.completeness.findings || [],
        preview: detail
          ? {
              identifier: detail.identifier_value ?? null,
              lifecycle_status: detail.lifecycle_status ?? null,
              publication_status: detail.publication_status ?? null,
              offer_status: describeOfferStatus({
                offer_count: detail.offers?.offer_count,
                sales_status: detail.offers?.sales_status,
              }),
              sellability: describeSellability(detail.completeness?.sale_presentation),
            }
          : null,
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
      const decided = result as {
        version?: { publication_status?: string }
        lifecycle_status?: string
      }
      const product = await productCloud.retrieveProduct(input.product_id)
      const published = await publishVersionAfterApproval({
        statusAfterApproval: decided.version?.publication_status,
        publish: async () => {
          const { result: publishedResult } = await publishVersionWorkflow(scope).run({
            input: {
              product_id: input.product_id,
              version_id: input.version_id,
              seller_id: product.current_owner_seller_id,
            },
          })
          return publishedResult as { version?: unknown; lifecycle_status?: string }
        },
        revertToReview: async () => {
          await productCloud.updateProductVersions({
            id: input.version_id,
            publication_status: "In review",
            admin_review_outcome: null,
            approval_decided_at: null,
            approval_decided_by: null,
            approval_rejection_reason: null,
          })
          await productCloud.createProductFieldChanges({
            product_id: input.product_id,
            product_version_id: input.version_id,
            seller_id: "admin",
            actor_customer_id: input.actor_id,
            field_code: "publication.approval",
            field_label: "Productgoedkeuring",
            old_value: "Goedgekeurd",
            new_value: "In review",
            status: "pending",
            reason: "Publicatie mislukt. De versie blijft in beoordeling.",
          })
        },
      })
      if (!published.published || !published.result) return decided
      return published.result
    },
    listProducts: (filter) =>
      productCloud.listProducts(filter, {
        take: 500,
        order: { updated_at: "DESC" },
      }),
  }
}
