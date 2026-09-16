import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { executeFinanceOnOrderSplit } from "../../../../workflows/finance/workflows"
import { ORDER_MODULE } from "../../../../modules/order-service"
import type OrderServiceModuleService from "../../../../modules/order-service/service"

/**
 * POST /admin/finance/reprocess
 * Development-only: reprocess orders that were created without going through
 * the finance workflow (e.g. E2E test orders).
 *
 * Body: { seller_id?: string }
 * Processes all paid orders that don't have a Platform commission yet.
 */
export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const { seller_id } = req.body as { seller_id?: string }

  const orders = req.scope.resolve(ORDER_MODULE) as OrderServiceModuleService

  const filter: any = { payment_status: "Betaald" }
  if (seller_id) filter.seller_id = seller_id

  const allOrders = await orders.listEmOrders(filter, {
    take: 1000,
    order: { created_at: "DESC" },
  })

  const results: Array<{ order_id: string; order_number: string; result: any }> = []
  for (const order of allOrders) {
    try {
      const result = await executeFinanceOnOrderSplit(req.scope, order.id)
      results.push({
        order_id: order.id,
        order_number: order.order_number,
        result,
      })
    } catch (err: any) {
      results.push({
        order_id: order.id,
        order_number: order.order_number,
        result: { error: err.message },
      })
    }
  }

  const processed = results.filter(r => !r.result.skipped && !r.result.error)
  const skipped = results.filter(r => r.result.skipped)
  const errors = results.filter(r => r.result.error)

  res.status(200).json({
    total: results.length,
    processed: processed.length,
    skipped: skipped.length,
    errors: errors.length,
    results,
  })
}
