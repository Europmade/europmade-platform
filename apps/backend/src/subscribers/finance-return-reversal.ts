import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { ORDER_MODULE } from "../modules/order-service"
import type OrderServiceModuleService from "../modules/order-service/service"
import { executeFinanceRefundForOrder } from "../workflows/finance/workflows"

/**
 * S3-08-03/04 — creditnota, platformcommissie reverse, Gepland-payouts annuleren.
 */
export default async function financeReturnReversalHandler({
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
    const result = await executeFinanceRefundForOrder(container, orderId)
    logger.info(
      `[finance] refund settlement order=${orderId} platform_reversed=${result.platform_reversed} credits=${result.credit_invoice_ids.length} payouts_cancelled=${result.payouts_cancelled}`
    )
  } catch (err) {
    logger.error(
      `[finance] refund settlement failed order=${orderId}: ${String(err)}`
    )
  }
}

export const config: SubscriberConfig = {
  event: ["RefundExecuted"],
}
