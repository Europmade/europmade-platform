import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { executeAppendAuditFromEvent } from "../workflows/platform/audit-from-event"

/**
 * Universele audit-consumer (ADR-0026 / eventmodel §13 via Event Bus).
 */
export default async function auditDomainEventsHandler({
  event,
  container,
}: SubscriberArgs<Record<string, unknown>>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  try {
    const data =
      event.data && typeof event.data === "object"
        ? (event.data as Record<string, unknown>)
        : {}
    await executeAppendAuditFromEvent(container, event.name, data)
  } catch (err) {
    logger.error(
      `[audit] failed for event=${event.name}: ${String(err)}`
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
    "NotificationDispatched",
    "SellerOnboarded",
    "BuyBoxRecomputed",
    "ReviewSubmitted",
    "ReviewAggregateChanged",
    "AffiliateOnboarded",
    "AffiliateLinkCreated",
    "ClickTracked",
    "ConversionRecorded",
    "ConversionReversed",
    "CommissionCalculated",
  ],
}
