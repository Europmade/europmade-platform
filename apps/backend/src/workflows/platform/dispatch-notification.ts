import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils"
import type { MedusaContainer } from "@medusajs/framework/types"
import type { INotificationModuleService } from "@medusajs/framework/types"
import {
  NOTIFICATION_FEED_MODULE,
} from "../../modules/notification-feed"
import type NotificationFeedModuleService from "../../modules/notification-feed/service"

export type DispatchNotificationInput = {
  recipient_customer_id: string
  notification_type: string
  source_entity_type: string
  source_entity_id: string
  /** Optioneel kanaalpayload (local provider logt dit). */
  data?: Record<string, unknown>
}

export type DispatchNotificationResult = {
  feed_id: string
  channel_notification_id: string | null
}

/**
 * Schrijft F.3-feed + Medusa Notification-kanaal + terminaal NotificationDispatched.
 */
export async function executeDispatchNotification(
  container: MedusaContainer,
  input: DispatchNotificationInput
): Promise<DispatchNotificationResult> {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const feed = container.resolve(
    NOTIFICATION_FEED_MODULE
  ) as NotificationFeedModuleService

  const created = await feed.createFeedEntry({
    recipient_customer_id: input.recipient_customer_id,
    notification_type: input.notification_type,
    source_entity_type: input.source_entity_type,
    source_entity_id: input.source_entity_id,
  })

  let channel_notification_id: string | null = null
  try {
    const notification = container.resolve(
      Modules.NOTIFICATION
    ) as INotificationModuleService
    // Local Notification-provider is standaard op channel `email` gebonden.
    const channelRow = await notification.createNotifications({
      to: `${input.recipient_customer_id}@notifications.europmade.local`,
      channel: "email",
      template: input.notification_type,
      trigger_type: input.notification_type,
      resource_type: input.source_entity_type,
      resource_id: input.source_entity_id,
      receiver_id: input.recipient_customer_id,
      data: input.data ?? {
        notification_type: input.notification_type,
        source_entity_type: input.source_entity_type,
        source_entity_id: input.source_entity_id,
      },
      idempotency_key: `feed:${input.notification_type}:${input.source_entity_id}:${input.recipient_customer_id}`,
    })
    channel_notification_id = channelRow.id
  } catch (err) {
    logger.warn(
      `[notification] Medusa channel dispatch failed feed=${created.id}: ${String(err)}`
    )
  }

  const eventBus = container.resolve(Modules.EVENT_BUS)
  await eventBus.emit({
    name: "NotificationDispatched",
    data: {
      feed_id: created.id,
      channel_notification_id,
      recipient_customer_id: input.recipient_customer_id,
      notification_type: input.notification_type,
      source_entity_type: input.source_entity_type,
      source_entity_id: input.source_entity_id,
    },
  })

  return { feed_id: created.id, channel_notification_id }
}

const dispatchNotificationStep = createStep(
  "dispatch-in-app-notification",
  async (input: DispatchNotificationInput, { container }) => {
    const result = await executeDispatchNotification(container, input)
    return new StepResponse(result)
  }
)

export const dispatchNotificationWorkflow = createWorkflow(
  "dispatch-in-app-notification",
  function (input: DispatchNotificationInput) {
    const result = dispatchNotificationStep(input)
    return new WorkflowResponse(result)
  }
)
