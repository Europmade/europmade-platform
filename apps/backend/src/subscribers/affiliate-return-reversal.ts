import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { ORDER_MODULE } from "../modules/order-service"
import type OrderServiceModuleService from "../modules/order-service/service"
import { executeReverseConversionForOrder } from "../workflows/affiliate/workflows"

/**
 * Affiliate conversion/commission reverse or prorate on RefundExecuted.
 * After the 30-day hold the commission is locked (seller bears late-return risk).
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

  const refundAmount =
    typeof data.refund_amount === "number"
      ? data.refund_amount
      : typeof data.refund_amount === "string"
        ? Number(data.refund_amount)
        : null

  try {
    const orders = container.resolve(ORDER_MODULE) as OrderServiceModuleService
    await orders.retrieveEmOrder(orderId)
    const result = await executeReverseConversionForOrder(container, orderId, {
      refund_amount: Number.isFinite(refundAmount as number)
        ? (refundAmount as number)
        : null,
    })
    if (result.locked) {
      logger.info(
        `[affiliate] commission locked after hold order=${orderId}`
      )
    } else if ("prorated" in result && result.prorated) {
      logger.info(
        `[affiliate] commission prorated order=${orderId} amount=${result.amount}`
      )
    } else if (result.reversed) {
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
