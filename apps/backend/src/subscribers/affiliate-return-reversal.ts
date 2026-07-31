import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { ORDER_MODULE } from "../modules/order-service"
import type OrderServiceModuleService from "../modules/order-service/service"
import { executeReverseConversionForOrder } from "../workflows/affiliate/workflows"

/**
 * S3-07-03 — ConversionReversed bij RefundExecuted.
 */
export default async function affiliateReturnReversalHandler({
  event,
  container,
}: SubscriberArgs<Record<string, unknown>>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const data =
    event.data && typeof event.data === "object"
      ? (event.data as Record<string, unknown>)
      : {}
  const orderId =
    typeof data.order_id === "string" ? data.order_id : null
  if (!orderId) return

  try {
    const orders = container.resolve(ORDER_MODULE) as OrderServiceModuleService
    await orders.retrieveEmOrder(orderId)
    const result = await executeReverseConversionForOrder(container, orderId)
    if (result.reversed) {
      logger.info(`[affiliate] conversion reversed order=${orderId}`)
    }
  } catch (err) {
    logger.error(
      `[affiliate] reverse failed order=${orderId}: ${String(err)}`
    )
  }
}

export const config: SubscriberConfig = {
  event: ["RefundExecuted"],
}
