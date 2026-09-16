import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import type { ICustomerModuleService } from "@medusajs/framework/types"
import { buildTrackingUrl } from "@europmade/utils"
import { ORDER_MODULE } from "../../../../modules/order-service"
import type OrderServiceModuleService from "../../../../modules/order-service/service"
import { resolveOrderLinesProductInfo } from "../../../store/order-service/resolve-line-product"
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
 * Admin OMC — platformbrede orderlijst.
 * Hergebruikt Seller product-resolve + shipment/customer enrichment-patronen.
 * Geen fulfilment-/retour-writes.
 */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const orders = req.scope.resolve(ORDER_MODULE) as OrderServiceModuleService
  const exceptionOnly =
    typeof req.query.exception === "string" && req.query.exception === "open"
  const sellerFilter =
    typeof req.query.seller_id === "string" && req.query.seller_id.trim()
      ? req.query.seller_id.trim()
      : null
  const paymentFilter =
    typeof req.query.payment_status === "string" && req.query.payment_status.trim()
      ? req.query.payment_status.trim()
      : null
  const shippingFilter =
    typeof req.query.shipping_status === "string" &&
    req.query.shipping_status.trim()
      ? req.query.shipping_status.trim()
      : null
  const returnFilter =
    typeof req.query.return_status === "string" && req.query.return_status.trim()
      ? req.query.return_status.trim()
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

  const filters: Record<string, unknown> = {}
  if (exceptionOnly) filters.exception_status = "Mislukte ordersplitsing"
  if (sellerFilter) filters.seller_id = sellerFilter
  if (paymentFilter) filters.payment_status = paymentFilter

  const list = await orders.listEmOrders(filters)
  const sellerCache = new Map<
    string,
    Awaited<ReturnType<typeof resolveSellerDisplayName>>
  >()

  const enriched = []
  for (const order of list) {
    const lines = await orders.listOrderLines({ order_id: order.id })
    const returns = []
    for (const line of lines) {
      const lineReturns = await orders.listEmReturns({ order_line_id: line.id })
      returns.push(...lineReturns)
    }

    const productByLine = await resolveOrderLinesProductInfo(
      req.scope,
      lines.map((line) => ({
        id: line.id,
        offer_id: line.offer_id,
        product_variant_id: line.product_variant_id,
      }))
    )

    let total = 0
    const lineViews = []
    for (const line of lines) {
      const unit = moneyNumber(line.unit_price_snapshot)
      if (Number.isFinite(unit)) total += unit * line.quantity
      const product = productByLine.get(line.id)
      lineViews.push({
        id: line.id,
        offer_id: line.offer_id,
        quantity: line.quantity,
        unit_price_snapshot: line.unit_price_snapshot,
        product_name: product?.product_name || "—",
        variant_name: product?.variant_name ?? null,
        sku: product?.sku ?? null,
        product_id: product?.product_id ?? null,
      })
    }

    const shipments = await orders.listShipments({ order_id: order.id })
    const primary =
      shipments.find((s) => s.status === "delivered" || s.delivered_at) ||
      shipments[0] ||
      null
    const shipping_status =
      primary?.status ||
      (primary?.delivered_at
        ? "delivered"
        : primary?.tracking_code
          ? "in_transit"
          : "pending")

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

    if (!sellerCache.has(order.seller_id)) {
      sellerCache.set(
        order.seller_id,
        await resolveSellerDisplayName(req.scope, order.seller_id)
      )
    }
    const seller = sellerCache.get(order.seller_id)!

    const openReturns = returns.filter((r) => isOpenReturnStatus(r.status))
    const return_status =
      openReturns[0]?.status ?? returns[0]?.status ?? null

    if (shippingFilter && shipping_status !== shippingFilter) continue
    if (returnFilter === "open" && openReturns.length === 0) continue
    if (
      returnFilter &&
      returnFilter !== "open" &&
      return_status !== returnFilter
    ) {
      continue
    }

    if (q) {
      const productHay = lineViews
        .map((l) => `${l.product_name} ${l.sku ?? ""}`)
        .join(" ")
        .toLowerCase()
      const hay = [
        order.order_number,
        order.id,
        order.seller_id,
        seller.seller_name,
        order.customer_id,
        customer_name ?? "",
        customer_email ?? "",
        productHay,
      ]
        .join(" ")
        .toLowerCase()
      if (!hay.includes(q)) continue
    }

    const [orderSet] = await orders.listOrderSets({ id: order.order_set_id })

    enriched.push({
      order: {
        id: order.id,
        order_number: order.order_number,
        customer_id: order.customer_id,
        seller_id: order.seller_id,
        payment_status: order.payment_status,
        exception_status: order.exception_status,
        exception_reason: order.exception_reason,
        created_at: order.created_at,
        customer_name,
        customer_email,
        shipping_status,
        carrier: primary?.carrier ?? null,
        tracking_code: primary?.tracking_code ?? null,
        tracking_url: buildTrackingUrl(
          primary?.carrier ?? null,
          primary?.tracking_code ?? null,
          primary?.tracking_url ?? null
        ),
      },
      seller: {
        id: seller.seller_id,
        name: seller.seller_name,
        onboarding_status: seller.onboarding_status,
      },
      lines: lineViews,
      line_count: lines.length,
      order_total: Math.round(total * 100) / 100,
      payment_reference: orderSet?.payment_reference ?? null,
      return_status,
      open_return_count: openReturns.length,
      product_summary:
        lineViews.length === 0
          ? "—"
          : lineViews.length === 1
            ? lineViews[0].product_name
            : `${lineViews[0].product_name} +${lineViews.length - 1}`,
      quantity_total: lineViews.reduce((s, l) => s + (l.quantity || 0), 0),
    })
  }

  enriched.sort(
    (a, b) =>
      new Date(b.order.created_at).getTime() -
      new Date(a.order.created_at).getTime()
  )

  res.json({ orders: enriched, count: enriched.length })
}
