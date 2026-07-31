import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { executeGenerateAiRecommendation } from "../../../../workflows/ai-support/workflows"
import type { AdminGenerateAiRecommendationBodyInput } from "../validators"

/**
 * POST /admin/ai-support/recommendations — aanbevelingsgeneratie (S3-09-01).
 * Bevat altijd confidence_score; nooit een beslissing.
 */
export async function POST(
  req: AuthenticatedMedusaRequest<AdminGenerateAiRecommendationBodyInput>,
  res: MedusaResponse
) {
  const body = req.validatedBody
  const result = await executeGenerateAiRecommendation(req.scope, {
    subject_type: body.subject_type,
    subject_id: body.subject_id.trim(),
    force: body.force === true,
  })

  res.status(result.created ? 201 : 200).json({
    ai_metadata: result.ai_metadata,
    created: result.created,
    label: "Aanbeveling — AI ondersteunt, mens beslist",
  })
}
