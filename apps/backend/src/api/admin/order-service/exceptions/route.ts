import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { ORDER_MODULE } from "../../../../modules/order-service"
import type OrderServiceModuleService from "../../../../modules/order-service/service"

/** Admin: openstaande uitzonderingen (Mislukte ordersplitsing). */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const orders = req.scope.resolve(ORDER_MODULE) as OrderServiceModuleService
  const list = await orders.listEmOrders({
    exception_status: "Mislukte ordersplitsing",
  })
  res.json({ orders: list, count: list.length })
}
