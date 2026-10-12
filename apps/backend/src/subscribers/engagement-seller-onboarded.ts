import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { dispatchAutomation } from "../modules/engagement/automation-run"

/**
 * SellerOnboarded → onboarding-enrollment.
 * Breekt de bestaande goedkeur-flow niet: fouten worden gelogd.
 * Geen verzending.
 */
export default async function engagementSellerOnboardedHandler({
  event,
  container,
}: SubscriberArgs<{ seller_id?: string }>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  try {
    const sellerId =
      event.data && typeof event.data.seller_id === "string"
        ? event.data.seller_id.trim()
        : ""
    if (!sellerId) {
      logger.warn("[engagement] SellerOnboarded zonder seller_id. Geen enrollment.")
      return
    }
    await dispatchAutomation(container, { sellerId })
    logger.info(`[engagement] SellerOnboarded seller=${sellerId} gecontroleerd.`)
  } catch (err) {
    logger.error(
      `[engagement] SellerOnboarded niet gekoppeld aan een enrollment: ${err instanceof Error ? err.message : String(err)}`
    )
  }
}

export const config: SubscriberConfig = {
  event: "SellerOnboarded",
}
