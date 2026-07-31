import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { executeListEligibleReviewLines } from "../../../../workflows/review/submit-review"

/**
 * GET /store/reviews/eligible — orderregels waar de koper nog mag reviewen.
 */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const lines = await executeListEligibleReviewLines(
    req.scope,
    req.auth_context.actor_id
  )
  res.status(200).json({ eligible: lines })
}
