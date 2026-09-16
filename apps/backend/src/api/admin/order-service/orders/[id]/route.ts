import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { ORDER_MODULE } from "../../../../../modules/order-service"
import type OrderServiceModuleService from "../../../../../modules/order-service/service"
import { enrichOrderBundle } from "../../../../store/order-service/order-enrichment"
import { resolveSellerDisplayName } from "../../admin-order-helpers"
import { FINANCE_MODULE } from "../../../../../modules/finance"
import type FinanceModuleService from "../../../../../modules/finance/service"

type RouteParams = { id: string }

/**
 * Admin OMC — orderdetail (read-only).
 * Hergebruikt Seller `enrichOrderBundle`; voegt seller + optionele finance-koppeling toe.
 */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const { id } = req.params as RouteParams
  const orders = req.scope.resolve(ORDER_MODULE) as OrderServiceModuleService
  const raw = await orders.retrieveEmOrder(id)
  const bundle = await enrichOrderBundle(req.scope, orders, id)
  const seller = await resolveSellerDisplayName(
    req.scope,
    bundle.order.seller_id
  )
  const [orderSet] = await orders.listOrderSets({ id: raw.order_set_id })

  let finance: {
    commissions: Array<{
      id: string
      recipient_type: string
      amount: number
      percentage: number
      status: string
    }>
    payouts: Array<{
      id: string
      amount: number
      status: string
      recipient_type: string
    }>
  } | null = null

  try {
    const financeSvc = req.scope.resolve(FINANCE_MODULE) as FinanceModuleService
    const commissions = await financeSvc.listCommissions({ order_id: id })
    const payouts = await financeSvc.listPayouts({ order_id: id })
    finance = {
      commissions: commissions.map((c) => ({
        id: c.id,
        recipient_type: c.recipient_type,
        amount: Number(c.amount) || 0,
        percentage: Number(c.percentage) || 0,
        status: c.status,
      })),
      payouts: payouts.map((p) => ({
        id: p.id,
        amount: Number(p.amount) || 0,
        status: p.status,
        recipient_type: p.recipient_type,
      })),
    }
  } catch {
    finance = null
  }

  res.json({
    ...bundle,
    order_set: orderSet ?? null,
    seller: {
      id: seller.seller_id,
      name: seller.seller_name,
      onboarding_status: seller.onboarding_status,
    },
    finance,
  })
}
