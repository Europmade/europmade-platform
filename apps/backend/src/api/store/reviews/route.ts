import type {
  AuthenticatedMedusaRequest,
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { REVIEW_MODULE } from "../../../modules/review"
import type ReviewModuleService from "../../../modules/review/service"
import {
  executeListEligibleReviewLines,
  executeSubmitReview,
} from "../../../workflows/review/submit-review"
import type { StoreSubmitReviewBodyInput } from "./validators"

function serializeReview(r: {
  id: string
  customer_id: string
  order_line_id: string
  review_type: string
  product_id: string | null
  seller_id: string | null
  score: number
  text: string | null
  created_at: Date | string
}) {
  return {
    id: r.id,
    customer_id: r.customer_id,
    order_line_id: r.order_line_id,
    review_type: r.review_type,
    product_id: r.product_id,
    seller_id: r.seller_id,
    score: Number(r.score),
    text: r.text,
    created_at: r.created_at,
  }
}

/**
 * GET /store/reviews?product_id= | seller_id= — publieke lijst.
 * Eigen reviews: GET /store/reviews/mine
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const reviews = req.scope.resolve(REVIEW_MODULE) as ReviewModuleService
  const productId =
    typeof req.query?.product_id === "string" ? req.query.product_id.trim() : ""
  const sellerId =
    typeof req.query?.seller_id === "string" ? req.query.seller_id.trim() : ""

  if (productId) {
    const rows = await reviews.listReviews(
      { product_id: productId, review_type: "Productreview" },
      { order: { created_at: "DESC" }, take: 100 }
    )
    res.status(200).json({ reviews: rows.map(serializeReview) })
    return
  }

  if (sellerId) {
    const rows = await reviews.listReviews(
      { seller_id: sellerId, review_type: "Verkopersreview" },
      { order: { created_at: "DESC" }, take: 100 }
    )
    const agg = await reviews.averageSellerScoreRaw(sellerId)
    res.status(200).json({
      reviews: rows.map(serializeReview),
      aggregate: {
        average_score: agg.average,
        count: agg.count,
      },
    })
    return
  }

  throw new MedusaError(
    MedusaError.Types.INVALID_DATA,
    "Query product_id of seller_id is verplicht (eigen reviews: /store/reviews/mine)."
  )
}

/**
 * POST /store/reviews — review plaatsen (auth).
 */
export async function POST(
  req: AuthenticatedMedusaRequest<StoreSubmitReviewBodyInput>,
  res: MedusaResponse
) {
  const customerId = req.auth_context.actor_id
  const body = req.validatedBody
  const result = await executeSubmitReview(req.scope, {
    customer_id: customerId,
    order_line_id: body.order_line_id,
    review_type: body.review_type,
    score: body.score,
    text: body.text ?? null,
  })
  res.status(201).json({ review: serializeReview(result.review) })
}
