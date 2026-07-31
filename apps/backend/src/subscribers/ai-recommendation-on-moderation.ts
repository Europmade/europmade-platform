import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { executeGenerateAiRecommendation } from "../workflows/ai-support/workflows"

/**
 * S3-09-01 — bij ModerationCaseOpened niet-blokkerend AI-advies genereren.
 */
export default async function aiRecommendationOnModerationHandler({
  event,
  container,
}: SubscriberArgs<Record<string, unknown>>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const data =
    event.data && typeof event.data === "object"
      ? (event.data as Record<string, unknown>)
      : {}
  const caseId = typeof data.case_id === "string" ? data.case_id : null
  if (!caseId) return

  try {
    const result = await executeGenerateAiRecommendation(container, {
      subject_type: "moderation_case",
      subject_id: caseId,
    })
    logger.info(
      `[ai-support] recommendation ${result.created ? "created" : "reused"} case=${caseId} score=${result.ai_metadata.confidence_score}`
    )
  } catch (err) {
    logger.warn(
      `[ai-support] non-blocking generate failed case=${caseId}: ${String(err)}`
    )
  }
}

export const config: SubscriberConfig = {
  event: ["ModerationCaseOpened"],
}
