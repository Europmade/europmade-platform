/**
 * Store Order-service client — cart / checkout (S3-05-03).
 */

const BACKEND_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? "http://localhost:9000"
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? ""

export class OrderServiceApiError extends Error {
  status?: number

  constructor(message: string, status?: number) {
    super(message)
    this.name = "OrderServiceApiError"
    this.status = status
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${BACKEND_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(PUBLISHABLE_KEY
        ? { "x-publishable-api-key": PUBLISHABLE_KEY }
        : {}),
      ...init.headers,
    },
  })
  const body: unknown = await response.json().catch(() => undefined)
  if (!response.ok) {
    const message =
      body &&
      typeof body === "object" &&
      "message" in body &&
      typeof body.message === "string"
        ? body.message
        : "Er is iets misgegaan. Probeer het opnieuw."
    throw new OrderServiceApiError(message, response.status)
  }
  return body as T
}

export type CartTotals = {
  subtotal: number
  shipping_total: number
  vat_amount: number
  total: number
  delivery_country: string
  vat_rate: number
  vat_tooltip: string
}

export type CartLineView = {
  line_id: string
  offer_id: string
  quantity: number
  seller_id: string
  unit_price: number
  shipping_cost: number
  vat_rate: number
  quantity_available: number
  total_unit_price: number
  region_code?: string
}

export type CartView = {
  cart_id: string
  lines: CartLineView[]
  seller_count: number
  split_notice: string | null
  totals: CartTotals
}

export type PlaceOrderResult = {
  order_set_id: string
  payment_reference: string
  created: boolean
  orders: Array<{
    order_id: string
    order_number: string
    seller_id: string
    line_ids: string[]
  }>
}

export function getCart() {
  return request<CartView>("/store/order-service/cart")
}

export function upsertCartLine(offer_id: string, quantity: number) {
  return request<CartView>("/store/order-service/cart", {
    method: "POST",
    body: JSON.stringify({ offer_id, quantity }),
  })
}

export function patchCartLine(lineId: string, quantity: number) {
  return request<CartView>(`/store/order-service/cart/lines/${lineId}`, {
    method: "PATCH",
    body: JSON.stringify({ quantity }),
  })
}

export function deleteCartLine(lineId: string) {
  return request<{ deleted: boolean }>(
    `/store/order-service/cart/lines/${lineId}`,
    { method: "DELETE" }
  )
}

export function revalidateCheckout(
  lines: Array<{ offer_id: string; quantity: number }>
) {
  return request<{
    lines: CartLineView[]
    seller_count: number
    split_notice: string | null
    totals: CartTotals
  }>("/store/order-service/checkout/revalidate", {
    method: "POST",
    body: JSON.stringify({ lines }),
  })
}

export function placeOrder(input: {
  payment_reference: string
  shipping_address: string
  billing_address: string
  lines: Array<{ offer_id: string; quantity: number }>
  affiliate_click_id?: string | null
  affiliate_coupon_code?: string | null
}) {
  return request<PlaceOrderResult>("/store/order-service/checkout/place", {
    method: "POST",
    body: JSON.stringify({
      ...input,
      payment_mode: "simulated",
      delivery_country: "NL",
    }),
  })
}

export type OrderLineView = {
  id: string
  offer_id: string
  quantity: number
  unit_price_snapshot: string | number
  vat_rate_snapshot: number
}

export type ReturnView = {
  id: string
  order_line_id: string
  reason: string
  status: string
  refund_status: string | null
  refund_amount: string | number | null
  refund_reference: string | null
  seller_decision_reason: string | null
  force_reason: string | null
  cooling_off_ends_at: string
  created_at: string
}

export type BuyerOrderListItem = {
  order: {
    id: string
    order_number: string
    seller_id: string
    payment_status: string
    shipping_address: string
    billing_address: string
    created_at: string
  }
  lines: OrderLineView[]
  returns: ReturnView[]
  seller_name: string
  order_total: number
  display_status: string
}

export function listOrders() {
  return request<{ orders: BuyerOrderListItem[]; count: number }>(
    "/store/order-service/orders"
  )
}

export function getOrder(id: string) {
  return request<{
    order: {
      id: string
      order_number: string
      seller_id: string
      payment_status: string
      shipping_address: string
      billing_address: string
      order_set_id: string
      created_at: string
    }
    lines: OrderLineView[]
    order_set: { id: string; payment_reference: string } | null
  }>(`/store/order-service/orders/${id}`)
}

export function listReturns() {
  return request<{
    returns: Array<
      ReturnView & {
        order_id: string
        order_number: string
        seller_id: string
        offer_id: string
      }
    >
  }>("/store/order-service/returns")
}

export function getReturn(id: string) {
  return request<{
    return: ReturnView
    order_id: string
    order_number: string
    seller_id: string
    order_line: OrderLineView
  }>(`/store/order-service/returns/${id}`)
}

export function requestReturn(order_line_id: string, reason: string) {
  return request<{ return: ReturnView }>("/store/order-service/returns", {
    method: "POST",
    body: JSON.stringify({ order_line_id, reason }),
  })
}

export function escalateReturn(id: string) {
  return request<{ return: ReturnView }>(
    `/store/order-service/returns/${id}/escalate`,
    { method: "POST", body: "{}" }
  )
}

export function listSellerOrders() {
  return request<{
    orders: Array<{
      order: BuyerOrderListItem["order"] & { customer_id: string }
      lines: OrderLineView[]
      returns: ReturnView[]
    }>
    count: number
  }>("/store/order-service/seller/orders")
}

export function listSellerReturns() {
  return request<{
    returns: Array<
      ReturnView & {
        order_id: string
        order_number: string
        customer_id: string
        offer_id: string
      }
    >
  }>("/store/order-service/seller/returns")
}

export function sellerReturnAction(
  id: string,
  action: "confirm" | "receive" | "approve" | "reject",
  decision_reason?: string
) {
  const path =
    action === "reject"
      ? `/store/order-service/seller/returns/${id}/reject`
      : `/store/order-service/seller/returns/${id}/${action}`
  return request<{ return: ReturnView }>(path, {
    method: "POST",
    body:
      action === "reject"
        ? JSON.stringify({ decision_reason: decision_reason ?? "" })
        : "{}",
  })
}

export type MessageView = {
  id: string
  order_id: string
  sender_customer_id: string
  body: string
  created_at: string
}

export type MessageThreadSummary = {
  order_id: string
  order_number: string
  seller_id: string
  customer_id: string
  message_count: number
  last_message_at: string | null
  last_body_preview: string | null
}

export function listMessageThreads() {
  return request<{ threads: MessageThreadSummary[]; count: number }>(
    "/store/order-service/messages"
  )
}

export function listSellerMessageThreads() {
  return request<{ threads: MessageThreadSummary[]; count: number }>(
    "/store/order-service/seller/messages"
  )
}

export function listOrderMessages(orderId: string) {
  return request<{
    order_id: string
    order_number: string
    customer_id: string
    seller_id: string
    viewer_customer_id: string
    messages: MessageView[]
  }>(`/store/order-service/orders/${orderId}/messages`)
}

export function sendOrderMessage(orderId: string, body: string) {
  return request<{ message: MessageView }>(
    `/store/order-service/orders/${orderId}/messages`,
    {
      method: "POST",
      body: JSON.stringify({ body }),
    }
  )
}
