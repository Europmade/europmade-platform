import { MedusaError, MedusaService } from "@medusajs/framework/utils"
import InAppNotification from "./models/in-app-notification"

export type CreateFeedNotificationInput = {
  recipient_customer_id: string
  notification_type: string
  source_entity_type: string
  source_entity_id: string
}

/**
 * In-app notificatiefeed — Blueprint F.3 + ADR-0026.
 * Muteert nooit andere domeinobjecten.
 */
class NotificationFeedModuleService extends MedusaService({
  InAppNotification,
}) {
  async createFeedEntry(input: CreateFeedNotificationInput) {
    const recipient_customer_id = input.recipient_customer_id.trim()
    const notification_type = input.notification_type.trim()
    const source_entity_type = input.source_entity_type.trim()
    const source_entity_id = input.source_entity_id.trim()
    if (
      !recipient_customer_id ||
      !notification_type ||
      !source_entity_type ||
      !source_entity_id
    ) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "in_app_notification vereist recipient, type en bronverwijzing."
      )
    }
    return this.createInAppNotifications({
      recipient_customer_id,
      notification_type,
      source_entity_type,
      source_entity_id,
      read_at: null,
    })
  }

  async markRead(id: string, recipient_customer_id: string) {
    const row = await this.retrieveInAppNotification(id)
    if (row.recipient_customer_id !== recipient_customer_id) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "Notificatie hoort niet bij deze gebruiker."
      )
    }
    if (row.read_at) {
      return row
    }
    return this.updateInAppNotifications({
      id,
      read_at: new Date(),
    })
  }
}

export default NotificationFeedModuleService
