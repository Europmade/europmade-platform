import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import {
  executeGetQueueItem,
  QUEUE_KEYS,
  type QueueKey,
} from "../../../../../../workflows/moderation"

type Params = { queue: string; id: string }

/**
 * GET /admin/moderation/queues/:queue/:id — detail.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const { queue, id } = req.params as Params
  if (!(QUEUE_KEYS as string[]).includes(queue)) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Onbekende wachtrij: ${queue}`
    )
  }
  const result = await executeGetQueueItem(req.scope, queue as QueueKey, id)
  res.status(200).json(result)
}
