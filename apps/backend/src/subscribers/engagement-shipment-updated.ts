import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { dispatchAutomation } from "../modules/engagement/automation-run"

/**
 * OrderShipmentUpdated start de eerste afgeleverde zending per consument.
 * Dezelfde zending of een latere zending gebruikt dezelfde sleutel.
 * Geen verzending.
 */
export default async function engagementShipmentUpdatedHandler({
  container,
}: SubscriberArgs<Record<string, unknown>>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  try {
    await dispatchAutomation(container, {
      only: ["consumer_first_order_received"],
    })
  } catch (err) {
    logger.error(
      `[engagement] zending niet gekoppeld aan een automatisering: ${err instanceof Error ? err.message : String(err)}`
    )
  }
}

export const config: SubscriberConfig = {
  event: "OrderShipmentUpdated",
}
