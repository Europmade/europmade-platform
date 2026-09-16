/**
 * Shared order enrichment for seller/buyer order + message views (ADR-0040).
 */
import { Modules } from "@medusajs/framework/utils"
import type {
  ICustomerModuleService,
  MedusaContainer,
} from "@medusajs/framework/types"
import {
  buildTrackingUrl,
  computeReturnPeriod,
  normalizeCountryCode,
  parseOrderAddress,
  vatFromInclusive,
} from "@europmade/utils"
import type OrderServiceModuleService from "../../../modules/order-service/service"
import { normalizeRefundStatus } from "../../../modules/order-service/refund-service"
import { resolveOrderLinesProductInfo } from "./resolve-line-product"

export type ShipmentStatus =
  | "pending"
  | "shipped"
  | "in_transit"
  | "out_for_delivery"
  | "delivered"
  | "exception"

function moneyNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string" && value.trim() !== "") return Number(value) || 0
  if (value && typeof value === "object" && "numeric" in value) {
    return Number((value as { numeric: string }).numeric) || 0
  }
  return Number(value) || 0
}

/** Normalize stored VAT to fraction (0.21). Accepts legacy percentage (21). */
function normalizeVatRate(value: unknown): number {
  const n = moneyNumber(value)
  if (n > 1) return n / 100
  return n
}

function addressView(
  raw: string,
  fallbackName?: string | null
) {
  const parsed = parseOrderAddress(raw, fallbackName)
  return {
    name: parsed.name,
    street: parsed.street,
    postal_code: parsed.postal_code,
    city: parsed.city,
    province: parsed.province,
    country: parsed.country,
    country_code: parsed.country_code,
    formatted: [
      parsed.name,
      parsed.street,
      [parsed.postal_code, parsed.city].filter(Boolean).join(" "),
      parsed.province,
      parsed.country || parsed.country_code,
    ]
      .filter(Boolean)
      .join("\n"),
    raw,
  }
}

export async function enrichOrderBundle(
  container: MedusaContainer,
  orders: OrderServiceModuleService,
  orderId: string
) {
  const order = await orders.retrieveEmOrder(orderId)
  const lines = await orders.listOrderLines({ order_id: order.id })
  const shipmentsRaw = await orders.listShipments({ order_id: order.id })
  const documents = await orders.listOrderDocuments({ order_id: order.id })
  const conversations = await orders.listEmConversations({ order_id: order.id })

  const productByLine = await resolveOrderLinesProductInfo(
    container,
    lines.map((line) => ({
      id: line.id,
      offer_id: line.offer_id,
      product_variant_id: line.product_variant_id,
    }))
  )

  let customer_email: string | null = null
  let customer_name: string | null = null
  try {
    const customers = container.resolve(
      Modules.CUSTOMER
    ) as ICustomerModuleService
    const customer = await customers.retrieveCustomer(order.customer_id)
    customer_email = customer.email ?? null
    customer_name =
      [customer.first_name, customer.last_name].filter(Boolean).join(" ").trim() ||
      null
  } catch {
    // keep nulls
  }

  const shippingAddress = addressView(order.shipping_address, customer_name)
  const billingAddress = addressView(order.billing_address, customer_name)
  const shippingCountryCode =
    normalizeCountryCode(
      (order as { shipping_country_code?: string | null }).shipping_country_code
    ) ||
    shippingAddress.country_code ||
    null

  const returns = []
  for (const line of lines) {
    const product = productByLine.get(line.id)
    const lineReturns = await orders.listEmReturns({ order_line_id: line.id })
    for (const ret of lineReturns) {
      const tracking_url = buildTrackingUrl(
        ret.carrier,
        ret.tracking_code,
        ret.tracking_url
      )
      returns.push({
        ...ret,
        order_id: order.id,
        order_number: order.order_number,
        offer_id: line.offer_id,
        product_variant_id: line.product_variant_id,
        quantity: line.quantity,
        unit_price_snapshot: line.unit_price_snapshot,
        product_name: product?.product_name ?? "—",
        variant_name: product?.variant_name ?? null,
        sku: product?.sku ?? null,
        tracking_url,
        refund_status:
          normalizeRefundStatus(ret.refund_status) ?? ret.refund_status,
      })
    }
  }

  const shipments = shipmentsRaw.map((s) => {
    const status =
      (s.status as ShipmentStatus | null) ||
      (s.delivered_at
        ? "delivered"
        : s.tracking_code
          ? "in_transit"
          : "pending")
    return {
      id: s.id,
      order_id: order.id,
      carrier: s.carrier ?? null,
      tracking_code: s.tracking_code ?? null,
      tracking_number: s.tracking_code ?? null,
      tracking_url: buildTrackingUrl(
        s.carrier,
        s.tracking_code,
        s.tracking_url
      ),
      status,
      expected_delivery_at: s.expected_delivery_at
        ? new Date(s.expected_delivery_at).toISOString()
        : null,
      shipped_at: (s as { shipped_at?: Date | string | null }).shipped_at
        ? new Date(
            (s as { shipped_at: Date | string }).shipped_at
          ).toISOString()
        : null,
      delivered_at: s.delivered_at
        ? new Date(s.delivered_at).toISOString()
        : null,
    }
  })

  const primaryShipment =
    shipments.find((s) => s.status === "delivered") || shipments[0] || null

  const return_period = computeReturnPeriod({
    deliveredAt: primaryShipment?.delivered_at ?? null,
  })

  const lineViews = lines.map((line) => {
    const product = productByLine.get(line.id)
    const unit = moneyNumber(line.unit_price_snapshot)
    const vatRate = normalizeVatRate(line.vat_rate_snapshot)
    return {
      id: line.id,
      order_id: order.id,
      product_variant_id: line.product_variant_id,
      offer_id: line.offer_id,
      quantity: line.quantity,
      unit_price_snapshot: line.unit_price_snapshot,
      unit_price: unit,
      line_total: unit * line.quantity,
      vat_rate_snapshot: vatRate,
      vat_amount: vatFromInclusive(unit * line.quantity, vatRate),
      product_name: product?.product_name ?? "—",
      variant_name: product?.variant_name ?? null,
      sku: product?.sku ?? null,
      product_id: product?.product_id ?? null,
      /** @deprecated use product_name */
      product_label: product?.product_name ?? "—",
    }
  })

  const subtotal = lineViews.reduce((sum, line) => sum + line.line_total, 0)
  const vat = lineViews.reduce((sum, line) => sum + line.vat_amount, 0)
  const primaryVatRate = lineViews[0]?.vat_rate_snapshot ?? null

  const invoice = documents.find((d) => d.type === "invoice") ?? null
  const packing_slip =
    documents.find((d) => d.type === "packing_slip") ?? null

  return {
    order: {
      id: order.id,
      order_number: order.order_number,
      customer_id: order.customer_id,
      seller_id: order.seller_id,
      payment_status: order.payment_status,
      exception_status: order.exception_status,
      shipping_address: shippingAddress.formatted || order.shipping_address,
      billing_address: billingAddress.formatted || order.billing_address,
      shipping_address_structured: shippingAddress,
      billing_address_structured: billingAddress,
      shipping_country_code: shippingCountryCode,
      created_at: order.created_at,
      updated_at: order.updated_at,
      customer_name,
      customer_email,
      shipping_status: primaryShipment?.status ?? "pending",
      shipped_at: primaryShipment?.shipped_at ?? null,
      delivered_at: primaryShipment?.delivered_at ?? null,
      carrier: primaryShipment?.carrier ?? null,
      tracking_code: primaryShipment?.tracking_code ?? null,
      tracking_number: primaryShipment?.tracking_code ?? null,
      tracking_url: primaryShipment?.tracking_url ?? null,
    },
    lines: lineViews,
    shipments,
    returns,
    documents: documents.map((d) => ({
      id: d.id,
      type: d.type,
      url: d.url,
      filename: d.filename,
      mime_type: d.mime_type,
      size_bytes: d.size_bytes,
      uploaded_at: d.uploaded_at
        ? new Date(d.uploaded_at).toISOString()
        : null,
    })),
    invoice: invoice
      ? {
          id: invoice.id,
          url: invoice.url,
          filename: invoice.filename,
          uploaded_at: invoice.uploaded_at
            ? new Date(invoice.uploaded_at).toISOString()
            : null,
        }
      : null,
    packing_slip: packing_slip
      ? {
          id: packing_slip.id,
          url: packing_slip.url,
          filename: packing_slip.filename,
          uploaded_at: packing_slip.uploaded_at
            ? new Date(packing_slip.uploaded_at).toISOString()
            : null,
        }
      : null,
    conversation_id: conversations[0]?.id ?? null,
    return_period,
    totals: {
      subtotal,
      shipping_cost: 0,
      vat,
      vat_rate: primaryVatRate,
      delivery_country_code: shippingCountryCode,
      total: subtotal,
    },
  }
}
