import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { FINANCE_MODULE } from "../../../../../modules/finance"
import type FinanceModuleService from "../../../../../modules/finance/service"
import { ORDER_MODULE } from "../../../../../modules/order-service"
import type OrderServiceModuleService from "../../../../../modules/order-service/service"
import { PARTNER_MODULE } from "../../../../../modules/partner"
import type PartnerModuleService from "../../../../../modules/partner/service"
import { MedusaError } from "@medusajs/framework/utils"

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100
}

/**
 * GET /store/finance/seller/sales — sales overview (not an invoice).
 */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const partner = req.scope.resolve(PARTNER_MODULE) as PartnerModuleService
  const orders = req.scope.resolve(ORDER_MODULE) as OrderServiceModuleService
  const finance = req.scope.resolve(FINANCE_MODULE) as FinanceModuleService

  const [seller] = await partner.listSellers({
    customer_id: req.auth_context.actor_id,
  })
  if (!seller) {
    throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "Not a seller")
  }

  const sellerOrders = await orders.listEmOrders(
    { seller_id: seller.id },
    { take: 500, order: { created_at: "DESC" } }
  )

  const commissions = await finance.listCommissions(
    { recipient_type: "Platform" },
    { take: 5000 }
  )
  const commByOrder = new Map<string, any>()
  for (const c of commissions) {
    if (c.order_id) commByOrder.set(c.order_id, c)
  }

  const sales = []
  for (const order of sellerOrders) {
    const orderLines = await orders.listOrderLines({ order_id: order.id })
    const subtotal = roundMoney(
      orderLines.reduce(
        (sum, l) => sum + Number(l.unit_price_snapshot) * Number(l.quantity),
        0
      )
    )
    const totalQty = orderLines.reduce((s, l) => s + Number(l.quantity), 0)
    const comm = commByOrder.get(order.id)
    const productNames = orderLines
      .map((l) => l.product_variant_id ?? "Product")
      .join(", ")

    sales.push({
      order_id: order.id,
      order_number: order.order_number,
      date: order.created_at,
      product: productNames,
      quantity: totalQty,
      sales_value: subtotal,
      commission_pct: comm ? comm.percentage : null,
      commission_amount: comm ? Number(comm.amount) : null,
      commission_status: comm ? comm.status : null,
      order_status: order.payment_status,
    })
  }

  // CSV export
  const format = (req.query as any).format
  if (format === "csv") {
    const header = "Order,Date,Product,Qty,Sales Value,Commission %,Commission,Status\n"
    const rows = sales
      .map(
        (s) =>
          `${s.order_number},${s.date},${s.product},${s.quantity},${s.sales_value},${s.commission_pct ? (s.commission_pct * 100).toFixed(1) + "%" : ""},${s.commission_amount ?? ""},${s.order_status}`
      )
      .join("\n")
    res.setHeader("Content-Type", "text/csv")
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=sales-overview.csv"
    )
    res.status(200).send(header + rows)
    return
  }

  res.status(200).json({ sales })
}
