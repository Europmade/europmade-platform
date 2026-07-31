import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { ORDER_MODULE } from "../../../../modules/order-service"
import type OrderServiceModuleService from "../../../../modules/order-service/service"

/**
 * Admin OMC — uitsluitend-lezend overzicht van geplaatste orders (S3-05-08).
 * Geen fulfilment-/betalings-/retouracties hier.
 */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const orders = req.scope.resolve(ORDER_MODULE) as OrderServiceModuleService
  const exceptionOnly =
    typeof req.query.exception === "string" && req.query.exception === "open"

  const list = exceptionOnly
    ? await orders.listEmOrders({
        exception_status: "Mislukte ordersplitsing",
      })
    : await orders.listEmOrders({})

  const enriched = []
  for (const order of list) {
    const lines = await orders.listOrderLines({ order_id: order.id })
    const [orderSet] = await orders.listOrderSets({ id: order.order_set_id })
    let total = 0
    for (const line of lines) {
      const unit =
        typeof line.unit_price_snapshot === "number"
          ? line.unit_price_snapshot
          : Number(line.unit_price_snapshot)
      if (Number.isFinite(unit)) total += unit * line.quantity
    }
    enriched.push({
      order,
      line_count: lines.length,
      order_total: Math.round(total * 100) / 100,
      payment_reference: orderSet?.payment_reference ?? null,
    })
  }

  res.json({ orders: enriched, count: enriched.length })
}
