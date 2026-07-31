import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { executeListQueueSummary } from "../../../../workflows/moderation"

/**
 * GET /admin/moderation/queues — samenvatting zeven wachtrijen (S3-03-07).
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const result = await executeListQueueSummary(req.scope)
  res.status(200).json(result)
}
