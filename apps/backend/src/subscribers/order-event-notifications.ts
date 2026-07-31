import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { executeNotifyForOrderEvent } from "../workflows/platform/order-event-notifications"

/**
 * S3-05-09 — Order-/Message-/Return-events → in-app notificatie + kanaal.
 * Consumeert bewust geen NotificationDispatched (terminaal).
 */
export default async function orderEventNotificationsHandler({
  event,
  container,
}: SubscriberArgs<Record<string, unknown>>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  try {
    const data =
      event.data && typeof event.data === "object"
        ? (event.data as Record<string, unknown>)
        : {}
    const count = await executeNotifyForOrderEvent(
      container,
      event.name,
      data
    )
    if (count > 0) {
      logger.info(
        `[notification] event=${event.name} dispatched=${count}`
      )
    }
  } catch (err) {
    logger.error(
      `[notification] order subscriber failed event=${event.name}: ${String(err)}`
    )
  }
}

export const config: SubscriberConfig = {
  event: [
    "OrderPlaced",
    "OrderSplit",
    "OrderSplitFailed",
    "OrderExceptionResolved",
    "MessageSent",
    "ReturnRequested",
    "ReturnStatusChanged",
    "RefundExecuted",
  ],
}
