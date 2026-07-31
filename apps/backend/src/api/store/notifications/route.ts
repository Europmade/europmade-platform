import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { NOTIFICATION_FEED_MODULE } from "../../../modules/notification-feed"
import type NotificationFeedModuleService from "../../../modules/notification-feed/service"

/**
 * GET /store/notifications — in-app feed voor de ingelogde customer (F.3 / ADR-0026).
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const customerId = req.auth_context?.actor_id
  if (!customerId) {
    throw new MedusaError(
      MedusaError.Types.UNAUTHORIZED,
      "Authenticatie vereist."
    )
  }

  const feed = req.scope.resolve(
    NOTIFICATION_FEED_MODULE
  ) as NotificationFeedModuleService

  const unreadOnly = req.query?.unread === "true" || req.query?.unread === "1"
  const rows = await feed.listInAppNotifications(
    {
      recipient_customer_id: customerId,
      ...(unreadOnly ? { read_at: null } : {}),
    },
    {
      order: { created_at: "DESC" },
      take: 100,
    }
  )

  res.status(200).json({
    notifications: rows.map((n) => ({
      id: n.id,
      notification_type: n.notification_type,
      source_entity_type: n.source_entity_type,
      source_entity_id: n.source_entity_id,
      read_at: n.read_at,
      created_at: n.created_at,
    })),
    unread_count: rows.filter((n) => n.read_at == null).length,
  })
}
