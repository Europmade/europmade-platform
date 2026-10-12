import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { dispatchAutomation } from "../modules/engagement/automation-run"

/**
 * OrderPlaced en OrderSplit starten consumenten- en verkoperstriggers.
 * De milestone-job herhaalt dezelfde sleutels zonder een tweede enrollment.
 * Geen verzending.
 */
export default async function engagementOrderPlacedHandler({
  container,
}: SubscriberArgs<Record<string, unknown>>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  try {
    await dispatchAutomation(container, {
      only: [
        "consumer_order_placed",
        "consumer_first_order",
        "consumer_repeat_order",
        "first_sale",
      ],
    })
  } catch (err) {
    logger.error(
      `[engagement] bestelling niet gekoppeld aan een automatisering: ${err instanceof Error ? err.message : String(err)}`
    )
  }
}

export const config: SubscriberConfig = {
  event: ["OrderPlaced", "OrderSplit"],
}
