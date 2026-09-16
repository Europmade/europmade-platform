import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import type { ICustomerModuleService } from "@medusajs/framework/types"
import { buildTrackingUrl } from "@europmade/utils"
import { ORDER_MODULE } from "../../../../modules/order-service"
import type OrderServiceModuleService from "../../../../modules/order-service/service"
import { normalizeRefundStatus } from "../../../../modules/order-service/refund-service"
import { resolveOrderLineProductInfo } from "../../../store/order-service/resolve-line-product"
import {
  isOpenReturnStatus,
  resolveSellerDisplayName,
} from "../admin-order-helpers"

function moneyNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string" && value.trim() !== "") return Number(value) || 0
  if (value && typeof value === "object" && "numeric" in value) {
    return Number((value as { numeric: string }).numeric) || 0
  }
  return Number(value) || 0
}

/**
 * Admin: platformbrede retourenlijst.
 * Zelfde enrichment-patroon als Seller returns (product resolve + tracking URL).
 */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const orders = req.scope.resolve(ORDER_MODULE) as OrderServiceModuleService
  const status = typeof req.query.status === "string" ? req.query.status : null
  const openOnly =
    typeof req.query.open === "string" && req.query.open === "1"
  const sellerFilter =
    typeof req.query.seller_id === "string" && req.query.seller_id.trim()
      ? req.query.seller_id.trim()
      : null
  const q =
    typeof req.query.q === "string" && req.query.q.trim()
      ? req.query.q.trim().toLowerCase()
      : null

  let customers: ICustomerModuleService | null = null
  try {
    customers = req.scope.resolve(Modules.CUSTOMER) as ICustomerModuleService
  } catch {
    customers = null
  }

  const filters = status && status !== "open" ? { status } : {}
  const list = await orders.listEmReturns(filters)
  const sellerCache = new Map<
    string,
    Awaited<ReturnType<typeof resolveSellerDisplayName>>
  >()

  const returns = []
  for (const ret of list) {
    if (openOnly || status === "open") {
      if (!isOpenReturnStatus(ret.status)) continue
    }

    const line = await orders.retrieveOrderLine(ret.order_line_id)
    const order = await orders.retrieveEmOrder(line.order_id)
    if (sellerFilter && order.seller_id !== sellerFilter) continue

    const product = await resolveOrderLineProductInfo(req.scope, {
      offer_id: line.offer_id,
      product_variant_id: line.product_variant_id,
    })

    if (!sellerCache.has(order.seller_id)) {
      sellerCache.set(
        order.seller_id,
        await resolveSellerDisplayName(req.scope, order.seller_id)
      )
    }
    const seller = sellerCache.get(order.seller_id)!

    let customer_name: string | null = null
    let customer_email: string | null = null
    if (customers) {
      try {
        const customer = await customers.retrieveCustomer(order.customer_id)
        customer_email = customer.email ?? null
        customer_name =
          [customer.first_name, customer.last_name]
            .filter(Boolean)
            .join(" ")
            .trim() || null
      } catch {
        // keep null
      }
    }

    const unit = moneyNumber(line.unit_price_snapshot)
    const amount = Math.round(unit * line.quantity * 100) / 100

    const row = {
      ...ret,
      order_id: order.id,
      order_number: order.order_number,
      customer_id: order.customer_id,
      customer_name,
      customer_email,
      seller_id: order.seller_id,
      seller_name: seller.seller_name,
      offer_id: line.offer_id,
      product_variant_id: line.product_variant_id,
      product_id: product.product_id,
      quantity: line.quantity,
      unit_price_snapshot: line.unit_price_snapshot,
      amount,
      product_name: product.product_name || "—",
      variant_name: product.variant_name,
      sku: product.sku,
      tracking_url: buildTrackingUrl(
        ret.carrier,
        ret.tracking_code,
        ret.tracking_url
      ),
      refund_status:
        normalizeRefundStatus(ret.refund_status) ?? ret.refund_status,
    }

    if (q) {
      const hay = [
        row.id,
        row.order_number,
        row.seller_name,
        row.seller_id,
        row.customer_name ?? "",
        row.customer_email ?? "",
        row.product_name,
        row.sku ?? "",
      ]
        .join(" ")
        .toLowerCase()
      if (!hay.includes(q)) continue
    }

    returns.push(row)
  }

  returns.sort(
    (a, b) =>
      new Date(b.created_at as string).getTime() -
      new Date(a.created_at as string).getTime()
  )

  res.json({
    returns,
    count: returns.length,
    open_count: returns.filter((r) => isOpenReturnStatus(r.status)).length,
  })
}
