import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { NOTIFICATION_FEED_MODULE } from "../../../../../modules/notification-feed"
import type NotificationFeedModuleService from "../../../../../modules/notification-feed/service"

/**
 * POST /store/notifications/:id/read — markeer gelezen.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const customerId = req.auth_context?.actor_id
  if (!customerId) {
    throw new MedusaError(
      MedusaError.Types.UNAUTHORIZED,
      "Authenticatie vereist."
    )
  }

  const id = req.params.id
  if (!id) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "notification id is verplicht."
    )
  }

  const feed = req.scope.resolve(
    NOTIFICATION_FEED_MODULE
  ) as NotificationFeedModuleService

  const row = await feed.markRead(id, customerId)
  res.status(200).json({
    notification: {
      id: row.id,
      notification_type: row.notification_type,
      source_entity_type: row.source_entity_type,
      source_entity_id: row.source_entity_id,
      read_at: row.read_at,
      created_at: row.created_at,
    },
  })
}
