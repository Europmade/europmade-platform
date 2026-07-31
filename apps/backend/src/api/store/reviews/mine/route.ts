import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { REVIEW_MODULE } from "../../../../modules/review"
import type ReviewModuleService from "../../../../modules/review/service"

/**
 * GET /store/reviews/mine — eigen reviews van de ingelogde koper.
 */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const reviews = req.scope.resolve(REVIEW_MODULE) as ReviewModuleService
  const rows = await reviews.listReviews(
    { customer_id: req.auth_context.actor_id },
    { order: { created_at: "DESC" }, take: 100 }
  )
  res.status(200).json({
    reviews: rows.map((r) => ({
      id: r.id,
      customer_id: r.customer_id,
      order_line_id: r.order_line_id,
      review_type: r.review_type,
      product_id: r.product_id,
      seller_id: r.seller_id,
      score: Number(r.score),
      text: r.text,
      created_at: r.created_at,
    })),
  })
}
