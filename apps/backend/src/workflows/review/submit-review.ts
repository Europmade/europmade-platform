import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
} from "@medusajs/framework/utils"
import type { MedusaContainer } from "@medusajs/framework/types"
import { REVIEW_MODULE } from "../../modules/review"
import type ReviewModuleService from "../../modules/review/service"
import type { ReviewType } from "../../modules/review/service"
import { ORDER_MODULE } from "../../modules/order-service"
import type OrderServiceModuleService from "../../modules/order-service/service"
import { PRODUCT_CLOUD_MODULE } from "../../modules/product-cloud"
import type ProductCloudModuleService from "../../modules/product-cloud/service"
import { COMMERCE_CLOUD_MODULE } from "../../modules/commerce-cloud"
import type CommerceCloudModuleService from "../../modules/commerce-cloud/service"
import { executeRecomputeBuyBox } from "../commerce-cloud/recompute-buy-box"

export type SubmitReviewInput = {
  customer_id: string
  order_line_id: string
  review_type: ReviewType
  score: number
  text?: string | null
}

async function resolveProductId(
  container: MedusaContainer,
  productVariantId: string
): Promise<string> {
  const productCloud = container.resolve(
    PRODUCT_CLOUD_MODULE
  ) as ProductCloudModuleService
  const variant = await productCloud.retrieveProductVariant(productVariantId)
  return variant.product_id
}

export async function executeSubmitReview(
  container: MedusaContainer,
  input: SubmitReviewInput
) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const reviews = container.resolve(REVIEW_MODULE) as ReviewModuleService
  const orders = container.resolve(ORDER_MODULE) as OrderServiceModuleService
  const eventBus = container.resolve(Modules.EVENT_BUS)

  reviews.assertScore(input.score)
  const text =
    typeof input.text === "string" && input.text.trim()
      ? input.text.trim().slice(0, 5000)
      : null

  const line = await orders.retrieveOrderLine(input.order_line_id)
  const order = await orders.retrieveEmOrder(line.order_id)

  if (order.customer_id !== input.customer_id) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Alleen de koper van deze orderregel mag een review plaatsen."
    )
  }
  if (order.payment_status !== "Betaald") {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Review is alleen mogelijk na een betaalde order."
    )
  }
  if (order.exception_status === "Mislukte ordersplitsing") {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Review is niet mogelijk bij een mislukte ordersplitsing."
    )
  }

  const existing = await reviews.listReviews({
    customer_id: input.customer_id,
    order_line_id: input.order_line_id,
    review_type: input.review_type,
  })
  if (existing.length > 0) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Er bestaat al een ${input.review_type} voor deze orderregel.`
    )
  }

  let product_id: string | null = null
  let seller_id: string | null = null
  if (input.review_type === "Productreview") {
    product_id = await resolveProductId(container, line.product_variant_id)
  } else {
    seller_id = order.seller_id
  }

  const created = await reviews.createReviews({
    customer_id: input.customer_id,
    order_line_id: input.order_line_id,
    review_type: input.review_type,
    product_id,
    seller_id,
    score: input.score,
    text,
  })

  await eventBus.emit({
    name: "ReviewSubmitted",
    data: {
      review_id: created.id,
      customer_id: input.customer_id,
      order_line_id: input.order_line_id,
      review_type: input.review_type,
      product_id,
      seller_id,
      score: input.score,
    },
  })

  if (input.review_type === "Verkopersreview" && seller_id) {
    const agg = await reviews.averageSellerScoreRaw(seller_id)
    const score_01 = agg.average != null ? agg.average / 5 : null
    await eventBus.emit({
      name: "ReviewAggregateChanged",
      data: {
        seller_id,
        average_score: agg.average,
        average_score_01: score_01,
        review_count: agg.count,
      },
    })

    const commerce = container.resolve(
      COMMERCE_CLOUD_MODULE
    ) as CommerceCloudModuleService
    const sellerOffers = await commerce.listOffers({ seller_id })
    const pairs = new Map<string, { identifier_id: string; region_code: string }>()
    for (const offer of sellerOffers) {
      pairs.set(`${offer.identifier_id}:${offer.region_code}`, {
        identifier_id: offer.identifier_id,
        region_code: offer.region_code,
      })
    }
    for (const pair of pairs.values()) {
      try {
        await executeRecomputeBuyBox(container, pair)
      } catch (err) {
        logger.warn(
          `[review] Buy Box recompute after aggregate seller=${seller_id}: ${String(err)}`
        )
      }
    }
  }

  return { review: created }
}

export type EligibleReviewLine = {
  order_line_id: string
  order_id: string
  order_number: string
  offer_id: string
  product_variant_id: string
  product_id: string
  seller_id: string
  can_product_review: boolean
  can_seller_review: boolean
}

export async function executeListEligibleReviewLines(
  container: MedusaContainer,
  customerId: string
): Promise<EligibleReviewLine[]> {
  const orders = container.resolve(ORDER_MODULE) as OrderServiceModuleService
  const reviews = container.resolve(REVIEW_MODULE) as ReviewModuleService
  const productCloud = container.resolve(
    PRODUCT_CLOUD_MODULE
  ) as ProductCloudModuleService

  const emOrders = await orders.listEmOrders(
    { customer_id: customerId, payment_status: "Betaald" },
    { take: 200, order: { created_at: "DESC" } }
  )

  const result: EligibleReviewLine[] = []
  for (const order of emOrders) {
    if (order.exception_status === "Mislukte ordersplitsing") continue
    const lines = await orders.listOrderLines({ order_id: order.id })
    for (const line of lines) {
      const existing = await reviews.listReviews({
        customer_id: customerId,
        order_line_id: line.id,
      })
      const hasProduct = existing.some((r) => r.review_type === "Productreview")
      const hasSeller = existing.some((r) => r.review_type === "Verkopersreview")
      if (hasProduct && hasSeller) continue

      let product_id = ""
      try {
        const variant = await productCloud.retrieveProductVariant(
          line.product_variant_id
        )
        product_id = variant.product_id
      } catch {
        product_id = ""
      }

      result.push({
        order_line_id: line.id,
        order_id: order.id,
        order_number: order.order_number,
        offer_id: line.offer_id,
        product_variant_id: line.product_variant_id,
        product_id,
        seller_id: order.seller_id,
        can_product_review: !hasProduct && Boolean(product_id),
        can_seller_review: !hasSeller,
      })
    }
  }
  return result
}

const submitReviewStep = createStep(
  "submit-review",
  async (input: SubmitReviewInput, { container }) => {
    const result = await executeSubmitReview(container, input)
    return new StepResponse(result)
  }
)

export const submitReviewWorkflow = createWorkflow(
  "submit-review",
  function (input: SubmitReviewInput) {
    const result = submitReviewStep(input)
    return new WorkflowResponse(result)
  }
)
