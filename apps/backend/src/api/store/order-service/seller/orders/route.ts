import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import type { ICustomerModuleService } from "@medusajs/framework/types"
import {
  buildTrackingUrl,
  computePromisedDeliveryDate,
  DELIVERY_CATEGORY_MAX_BUSINESS_DAYS,
  resolveDeliveryEstimateCategory,
  resolvePromisedDeliveryUrgency,
} from "@europmade/utils"
import { ORDER_MODULE } from "../../../../../modules/order-service"
import type OrderServiceModuleService from "../../../../../modules/order-service/service"
import { COMMERCE_CLOUD_MODULE } from "../../../../../modules/commerce-cloud"
import type CommerceCloudModuleService from "../../../../../modules/commerce-cloud/service"
import { resolveApprovedSeller } from "../../../product-cloud/resolve-seller"
import { resolveOrderLinesProductInfo } from "../../resolve-line-product"

function moneyNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string" && value.trim() !== "") return Number(value) || 0
  if (value && typeof value === "object" && "numeric" in value) {
    return Number((value as { numeric: string }).numeric) || 0
  }
  return Number(value) || 0
}

/** Seller: eigen orders (S3-05-06) + product + promised delivery enrichment. */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const seller = await resolveApprovedSeller(
    req.scope,
    req.auth_context.actor_id
  )
  const orders = req.scope.resolve(ORDER_MODULE) as OrderServiceModuleService
  let customers: ICustomerModuleService | null = null
  try {
    customers = req.scope.resolve(Modules.CUSTOMER) as ICustomerModuleService
  } catch {
    customers = null
  }

  let commerce: CommerceCloudModuleService | null = null
  try {
    commerce = req.scope.resolve(
      COMMERCE_CLOUD_MODULE
    ) as CommerceCloudModuleService
  } catch {
    commerce = null
  }

  const list = await orders.listEmOrders({ seller_id: seller.id })
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

    const lineViews = []
    let maxBusinessDays = DELIVERY_CATEGORY_MAX_BUSINESS_DAYS["2_4_business_days"]
    for (const line of lines) {
      const product = productByLine.get(line.id)
      const name = product?.product_name || "—"
      lineViews.push({
        id: line.id,
        offer_id: line.offer_id,
        quantity: line.quantity,
        unit_price_snapshot: line.unit_price_snapshot,
        product_name: name,
        variant_name: product?.variant_name ?? null,
        sku: product?.sku ?? null,
        product_label: name,
      })

      if (commerce) {
        try {
          const [price] = await commerce.listOfferPrices({
            offer_id: line.offer_id,
          })
          const [inventory] = await commerce.listOfferInventories({
            offer_id: line.offer_id,
          })
          const category = resolveDeliveryEstimateCategory({
            shipping_cost: moneyNumber(price?.shipping_cost),
            quantity_available: moneyNumber(inventory?.quantity_available),
          })
          maxBusinessDays = Math.max(
            maxBusinessDays,
            DELIVERY_CATEGORY_MAX_BUSINESS_DAYS[category]
          )
        } catch {
          // keep default max
        }
      }
    }

    const shipments = await orders.listShipments({ order_id: order.id })
    const primary =
      shipments.find((s) => s.status === "delivered" || s.delivered_at) ||
      shipments[0] ||
      null

    const shipping_status =
      (primary?.status as string | null) ||
      (primary?.delivered_at
        ? "delivered"
        : primary?.tracking_code
          ? "in_transit"
          : "pending")

    const promised_delivery_date = computePromisedDeliveryDate({
      orderCreatedAt: order.created_at,
      maxBusinessDays,
      expectedDeliveryAt: primary?.expected_delivery_at ?? null,
    })
    const promised_delivery_urgency = resolvePromisedDeliveryUrgency({
      promisedDeliveryDate: promised_delivery_date,
      shippingStatus: shipping_status,
    })

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
        // keep nulls
      }
    }

    enriched.push({
      order: {
        ...order,
        customer_name,
        customer_email,
        shipping_status,
        delivered_at: primary?.delivered_at
          ? new Date(primary.delivered_at).toISOString()
          : null,
        carrier: primary?.carrier ?? null,
        tracking_code: primary?.tracking_code ?? null,
        tracking_url: buildTrackingUrl(
          primary?.carrier ?? null,
          primary?.tracking_code ?? null,
          primary?.tracking_url ?? null
        ),
        promised_delivery_date,
        promised_delivery_urgency,
      },
      lines: lineViews,
      returns,
    })
  }

  res.json({ orders: enriched, count: enriched.length })
}
