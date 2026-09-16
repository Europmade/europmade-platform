/**
 * Order Management Center admin-API — platform scope.
 * Hergebruikt backend enrichment (zelfde als Seller).
 */

import { adminFetch } from "./admin-fetch"

export class OrderAdminApiError extends Error {
  status?: number
  constructor(message: string, status?: number) {
    super(message)
    this.name = "OrderAdminApiError"
    this.status = status
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await adminFetch(path, init)
  const body: unknown = await response.json().catch(() => undefined)
  if (!response.ok) {
    const message =
      body &&
      typeof body === "object" &&
      "message" in body &&
      typeof body.message === "string"
        ? body.message
        : "Er is iets misgegaan. Probeer het opnieuw."
    throw new OrderAdminApiError(message, response.status)
  }
  return body as T
}

export type AdminOrderListItem = {
  order: {
    id: string
    order_number: string
    customer_id: string
    seller_id: string
    payment_status: string
    exception_status: string | null
    exception_reason: string | null
    created_at: string
    customer_name?: string | null
    customer_email?: string | null
    shipping_status?: string | null
    carrier?: string | null
    tracking_code?: string | null
    tracking_url?: string | null
  }
  seller?: {
    id: string
    name: string
    onboarding_status: string | null
  }
  lines?: Array<{
    id: string
    product_name: string
    quantity: number
    sku?: string | null
  }>
  line_count: number
  order_total: number
  payment_reference: string | null
  return_status?: string | null
  open_return_count?: number
  product_summary?: string
  quantity_total?: number
}

export type AdminOrderListParams = {
  exception?: boolean
  seller_id?: string
  payment_status?: string
  shipping_status?: string
  return_status?: string
  q?: string
}

export function listAdminOrders(params: AdminOrderListParams | boolean = {}) {
  const p =
    typeof params === "boolean" ? { exception: params } : params
  const qs = new URLSearchParams()
  if (p.exception) qs.set("exception", "open")
  if (p.seller_id) qs.set("seller_id", p.seller_id)
  if (p.payment_status) qs.set("payment_status", p.payment_status)
  if (p.shipping_status) qs.set("shipping_status", p.shipping_status)
  if (p.return_status) qs.set("return_status", p.return_status)
  if (p.q) qs.set("q", p.q)
  const q = qs.toString()
  return request<{ orders: AdminOrderListItem[]; count: number }>(
    `/admin/order-service/orders${q ? `?${q}` : ""}`
  )
}

export type AdminOrderDetail = {
  order: {
    id: string
    order_number: string
    customer_id: string
    seller_id: string
    payment_status: string
    exception_status: string | null
    exception_reason?: string | null
    shipping_address: string
    billing_address: string
    shipping_address_structured?: Record<string, string | null>
    billing_address_structured?: Record<string, string | null>
    created_at: string
    customer_name?: string | null
    customer_email?: string | null
    shipping_status?: string | null
    shipped_at?: string | null
    delivered_at?: string | null
    carrier?: string | null
    tracking_code?: string | null
    tracking_url?: string | null
  }
  lines: Array<{
    id: string
    offer_id: string
    quantity: number
    unit_price: number
    line_total: number
    vat_rate_snapshot?: number
    vat_amount?: number
    product_name: string
    variant_name?: string | null
    sku?: string | null
    product_id?: string | null
  }>
  shipments?: Array<{
    id: string
    carrier: string | null
    tracking_code: string | null
    tracking_url: string | null
    status: string
    shipped_at: string | null
    delivered_at: string | null
    expected_delivery_at: string | null
  }>
  returns: Array<{
    id: string
    status: string
    order_line_id: string
    reason?: string
    refund_status?: string | null
    refund_amount?: number | string | null
    product_name?: string
    created_at?: string
  }>
  totals?: {
    subtotal: number
    vat: number
    total: number
    vat_rate?: number | null
  }
  order_set: { id: string; payment_reference: string } | null
  seller: {
    id: string
    name: string
    onboarding_status: string | null
  }
  finance: {
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
  } | null
}

export function getAdminOrder(id: string) {
  return request<AdminOrderDetail>(`/admin/order-service/orders/${id}`)
}

export function listAdminOrderMessages(id: string) {
  return request<{
    order_id: string
    order_number: string
    messages: Array<{
      id: string
      sender_customer_id: string
      body: string
      created_at: string
    }>
  }>(`/admin/order-service/orders/${id}/messages`)
}

export function resolveOrderException(id: string, reason: string) {
  return request<{ id: string; exception_status: string }>(
    `/admin/order-service/orders/${id}/resolve-exception`,
    {
      method: "POST",
      body: JSON.stringify({ reason }),
    }
  )
}

export type AdminReturnRow = {
  id: string
  status: string
  reason: string
  order_id: string
  order_number: string
  customer_id: string
  customer_name?: string | null
  customer_email?: string | null
  seller_id: string
  seller_name?: string
  product_name: string
  sku?: string | null
  product_id?: string | null
  amount?: number
  refund_status?: string | null
  refund_amount?: number | string | null
  created_at: string
  tracking_code?: string | null
  tracking_url?: string | null
}

export function listAdminReturns(params: {
  status?: string
  open?: boolean
  seller_id?: string
  q?: string
} = {}) {
  const qs = new URLSearchParams()
  if (params.open) qs.set("open", "1")
  if (params.status) qs.set("status", params.status)
  if (params.seller_id) qs.set("seller_id", params.seller_id)
  if (params.q) qs.set("q", params.q)
  const q = qs.toString()
  return request<{
    returns: AdminReturnRow[]
    count: number
    open_count: number
  }>(`/admin/order-service/returns${q ? `?${q}` : ""}`)
}

export function getAdminReturn(id: string) {
  return request<{
    return: AdminReturnRow & {
      force_reason?: string | null
      seller_decision_reason?: string | null
      cooling_off_ends_at?: string
    }
    order: {
      id: string
      order_number: string
      payment_status: string
      created_at: string
      customer_id: string
      seller_id: string
    }
    customer: {
      id: string
      name: string | null
      email: string | null
    }
    seller: {
      id: string
      name: string
      onboarding_status: string | null
    }
    line: {
      id: string
      product_name: string
      variant_name?: string | null
      sku?: string | null
      product_id?: string | null
      quantity: number
      unit_price: number
      line_total: number
    }
    force_refund_available: boolean
  }>(`/admin/order-service/returns/${id}`)
}

export function forceAdminRefund(id: string, force_reason: string) {
  return request<{ return: unknown }>(
    `/admin/order-service/returns/${id}/force-refund`,
    {
      method: "POST",
      body: JSON.stringify({ force_reason }),
    }
  )
}

export const SHIPPING_STATUS_LABELS: Record<string, string> = {
  pending: "In afwachting",
  shipped: "Verzonden",
  in_transit: "Onderweg",
  out_for_delivery: "Onderweg naar klant",
  delivered: "Afgeleverd",
  exception: "Uitzondering",
}

export function shippingStatusLabel(status: string | null | undefined): string {
  if (!status) return "Niet beschikbaar"
  return SHIPPING_STATUS_LABELS[status] ?? status
}
