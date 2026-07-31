import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import {
  executeListQueue,
  QUEUE_KEYS,
  type QueueKey,
} from "../../../../../workflows/moderation"

type Params = { queue: string }

/**
 * GET /admin/moderation/queues/:queue — items in één wachtrij.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const { queue } = req.params as Params
  if (!(QUEUE_KEYS as string[]).includes(queue)) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Onbekende wachtrij: ${queue}`
    )
  }
  const result = await executeListQueue(req.scope, queue as QueueKey)
  res.status(200).json(result)
}
