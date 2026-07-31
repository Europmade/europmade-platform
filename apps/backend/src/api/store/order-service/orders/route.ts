import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { ORDER_MODULE } from "../../../../modules/order-service"
import type OrderServiceModuleService from "../../../../modules/order-service/service"
import { PARTNER_MODULE } from "../../../../modules/partner"
import type PartnerModuleService from "../../../../modules/partner/service"

function lineAmount(unit: unknown, quantity: number): number {
  const n =
    typeof unit === "number"
      ? unit
      : typeof unit === "string"
        ? Number(unit)
        : unit &&
            typeof unit === "object" &&
            "value" in unit &&
            typeof (unit as { value: unknown }).value === "string"
          ? Number((unit as { value: string }).value)
          : Number(unit)
  if (!Number.isFinite(n)) return 0
  return Math.round(n * quantity * 100) / 100
}

/** Eigen orders van de ingelogde customer (incl. retour-samenvatting). */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const customerId = req.auth_context.actor_id
  const orders = req.scope.resolve(ORDER_MODULE) as OrderServiceModuleService
  const partner = req.scope.resolve(PARTNER_MODULE) as PartnerModuleService

  const list = await orders.listEmOrders({ customer_id: customerId })
  const sellerNames = new Map<string, string>()
  const enriched = []

  for (const order of list) {
    if (!sellerNames.has(order.seller_id)) {
      try {
        const seller = await partner.retrieveSeller(order.seller_id, {
          relations: ["company"],
        })
        const company = seller.company as { legal_name?: string } | undefined
        sellerNames.set(
          order.seller_id,
          company?.legal_name ?? order.seller_id
        )
      } catch {
        sellerNames.set(order.seller_id, order.seller_id)
      }
    }

    const lines = await orders.listOrderLines({ order_id: order.id })
    const returns = []
    let orderTotal = 0
    for (const line of lines) {
      orderTotal += lineAmount(line.unit_price_snapshot, line.quantity)
      const lineReturns = await orders.listEmReturns({ order_line_id: line.id })
      returns.push(...lineReturns)
    }

    const openReturn = returns.find((r) =>
      ["Aangevraagd", "Bevestigd", "Ontvangen", "Geëscaleerd"].includes(
        r.status
      )
    )
    const anyReturn = returns.length > 0
    const display_status = openReturn
      ? "Retour aangemeld"
      : anyReturn
        ? "Retour afgerond"
        : order.payment_status === "Betaald"
          ? "Onderweg"
          : order.payment_status

    enriched.push({
      order,
      lines,
      returns,
      seller_name: sellerNames.get(order.seller_id) ?? order.seller_id,
      order_total: orderTotal,
      display_status,
    })
  }

  res.json({ orders: enriched, count: enriched.length })
}
