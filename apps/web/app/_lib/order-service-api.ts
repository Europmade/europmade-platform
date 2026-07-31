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

export function listOrders() {
  return request<{
    orders: Array<{
      order: {
        id: string
        order_number: string
        seller_id: string
        payment_status: string
        shipping_address: string
        billing_address: string
      }
      lines: Array<{
        id: string
        offer_id: string
        quantity: number
        unit_price_snapshot: string | number
        vat_rate_snapshot: number
      }>
    }>
    count: number
  }>("/store/order-service/orders")
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
    }
    lines: Array<{
      id: string
      offer_id: string
      quantity: number
      unit_price_snapshot: string | number
      vat_rate_snapshot: number
    }>
    order_set: { id: string; payment_reference: string } | null
  }>(`/store/order-service/orders/${id}`)
}
