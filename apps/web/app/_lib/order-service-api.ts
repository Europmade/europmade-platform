/**
 * Store Order-service client — cart / checkout (S3-05-03, ADR-0022).
 */

import {
  clearGuestCartToken,
  getGuestCartToken,
  rememberGuestTokenFromResponse,
} from "./guest-cart-token"
import {
  clearPendingGuestOrder,
  getGuestCheckoutToken,
  readPendingGuestOrder,
} from "./guest-checkout-token"
import { medusaBackendUrl } from "./medusa-backend-url"

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
  const guest = getGuestCartToken()
  const response = await fetch(`${medusaBackendUrl()}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(PUBLISHABLE_KEY
        ? { "x-publishable-api-key": PUBLISHABLE_KEY }
        : {}),
      ...(guest ? { "x-guest-cart-token": guest } : {}),
      ...init.headers,
    },
  })
  const body: unknown = await response.json().catch(() => undefined)
  if (body && typeof body === "object" && "guest_token" in body) {
    rememberGuestTokenFromResponse(
      body as { guest_token?: string | null },
      response
    )
  } else {
    rememberGuestTokenFromResponse({}, response)
  }
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
  guest_token?: string | null
  lines: CartLineView[]
  seller_count: number
  split_notice: string | null
  totals: CartTotals
  merged?: boolean
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
  if (!offer_id.startsWith("offr_")) {
    return Promise.reject(
      new OrderServiceApiError(
        "Dit product heeft geen actieve Commerce Cloud-aanbieding.",
        400
      )
    )
  }
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

/** Guest → customer merge na login (winkelwagen §5A / ADR-0022). */
export async function mergeGuestCart() {
  const guest_token = getGuestCartToken()
  if (!guest_token) {
    return null
  }
  try {
    const result = await request<CartView>("/store/order-service/cart/merge", {
      method: "POST",
      body: JSON.stringify({ guest_token }),
    })
    clearGuestCartToken()
    return result
  } catch (err) {
    if (err instanceof OrderServiceApiError && err.status === 401) {
      throw err
    }
    return null
  }
}

export function revalidateCheckout(
  lines: Array<{ offer_id: string; quantity: number }>,
  deliveryCountry?: string
) {
  return request<{
    lines: CartLineView[]
    seller_count: number
    split_notice: string | null
    totals: CartTotals
  }>("/store/order-service/checkout/revalidate", {
    method: "POST",
    body: JSON.stringify({
      lines,
      ...(deliveryCountry
        ? { delivery_country: deliveryCountry.slice(0, 2).toUpperCase() }
        : {}),
    }),
  })
}

export function placeOrder(input: {
  payment_reference: string
  shipping_address: string
  billing_address: string
  delivery_country?: string
  lines: Array<{ offer_id: string; quantity: number }>
  affiliate_click_id?: string | null
  affiliate_coupon_code?: string | null
  guest_checkout?: boolean
}) {
  const { guest_checkout, delivery_country, ...payload } = input
  const guest_checkout_token = guest_checkout
    ? getGuestCheckoutToken()
    : undefined
  return request<PlaceOrderResult>("/store/order-service/checkout/place", {
    method: "POST",
    body: JSON.stringify({
      ...payload,
      payment_mode: "simulated",
      delivery_country: (delivery_country || "NL").slice(0, 2).toUpperCase(),
      guest_checkout_token,
    }),
  })
}

export type ConfirmationOrderView = {
  order: {
    id: string
    order_number: string
    seller_id: string
    payment_status: string
    shipping_address: string
    billing_address: string
  }
  lines: OrderLineView[]
}

export function getOrderConfirmation(payment_reference: string) {
  const guestCheckoutToken = getGuestCheckoutToken()
  return request<{
    order_set_id: string
    payment_reference: string
    orders: ConfirmationOrderView[]
    guest: boolean
  }>(`/store/order-service/orders/confirmation/${encodeURIComponent(payment_reference)}`, {
    headers: { "x-guest-checkout-token": guestCheckoutToken },
  })
}

export function claimGuestOrder(payment_reference: string) {
  const guest_checkout_token = getGuestCheckoutToken()
  return request<{ claimed: boolean; order_set_id: string | null }>(
    "/store/order-service/orders/claim",
    {
      method: "POST",
      headers: { "x-guest-checkout-token": guest_checkout_token },
      body: JSON.stringify({ payment_reference, guest_checkout_token }),
    }
  )
}

export async function claimPendingGuestOrder(paymentReference?: string | null) {
  const candidate = paymentReference?.trim() || readPendingGuestOrder()
  if (!candidate) return null
  try {
    const result = await claimGuestOrder(candidate)
    if (result.claimed) {
      clearPendingGuestOrder()
    }
    return result
  } catch (err) {
    if (err instanceof OrderServiceApiError && err.status === 401) {
      throw err
    }
    return null
  }
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
  carrier?: string | null
  tracking_code?: string | null
  tracking_url?: string | null
  product_name?: string
  variant_name?: string | null
  sku?: string | null
  quantity?: number
  unit_price_snapshot?: unknown
}

export type ReturnPeriodView = {
  anchor_at: string | null
  anchor_source: "delivered_at" | null
  period_days: number
  deadline_at: string | null
  days_remaining: number | null
  is_open: boolean
  delivered_at: string | null
  starts_after_delivery?: boolean
}

export type OrderAddressView = {
  name: string | null
  street: string | null
  postal_code: string | null
  city: string | null
  province: string | null
  country: string | null
  country_code: string | null
  formatted: string
  raw: string
}

export type SellerOrderBundle = {
  order: {
    id: string
    order_number: string
    customer_id: string
    seller_id: string
    payment_status: string
    shipping_address: string
    billing_address: string
    shipping_address_structured?: OrderAddressView
    billing_address_structured?: OrderAddressView
    shipping_country_code?: string | null
    created_at: string
    customer_name: string | null
    customer_email: string | null
    shipping_status: string
    shipped_at?: string | null
    delivered_at: string | null
    carrier: string | null
    tracking_code: string | null
    tracking_number?: string | null
    tracking_url: string | null
  }
  lines: Array<{
    id: string
    product_variant_id: string
    offer_id: string
    quantity: number
    unit_price_snapshot: unknown
    unit_price?: number
    line_total?: number
    vat_rate_snapshot?: number
    vat_amount?: number
    product_name?: string
    variant_name?: string | null
    sku?: string | null
    product_label: string
  }>
  shipments: Array<{
    id: string
    carrier: string | null
    tracking_code: string | null
    tracking_number?: string | null
    tracking_url: string | null
    status: string
    shipped_at?: string | null
    delivered_at: string | null
  }>
  returns: Array<
    ReturnView & {
      order_id: string
      order_number: string
      tracking_url?: string | null
      quantity?: number
      product_name?: string
      variant_name?: string | null
      sku?: string | null
    }
  >
  documents: Array<{
    id: string
    type: string
    url: string
    filename: string
    uploaded_at: string | null
  }>
  invoice: {
    id: string
    url: string
    filename: string
    uploaded_at: string | null
  } | null
  packing_slip: {
    id: string
    url: string
    filename: string
    uploaded_at: string | null
  } | null
  conversation_id: string | null
  return_period: ReturnPeriodView
  totals: {
    subtotal: number
    shipping_cost: number
    vat: number
    vat_rate?: number | null
    delivery_country_code?: string | null
    total: number
  }
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
      order: BuyerOrderListItem["order"] & {
        customer_id: string
        shipping_status?: string
        delivered_at?: string | null
        carrier?: string | null
        tracking_code?: string | null
        tracking_url?: string | null
        customer_name?: string | null
        customer_email?: string | null
        promised_delivery_date?: string | null
        promised_delivery_urgency?: "due_tomorrow" | "overdue" | null
      }
      lines: Array<
        OrderLineView & {
          product_name?: string
          variant_name?: string | null
          sku?: string | null
          product_label?: string
        }
      >
      returns: ReturnView[]
    }>
    count: number
  }>("/store/order-service/seller/orders")
}

export function getSellerOrder(id: string) {
  return request<SellerOrderBundle>(
    `/store/order-service/seller/orders/${encodeURIComponent(id)}`
  )
}

export function upsertSellerShipment(
  orderId: string,
  body: {
    carrier?: string | null
    tracking_code?: string | null
    tracking_number?: string | null
    tracking_url?: string | null
    status?: string | null
    expected_delivery_at?: string | null
    shipped_at?: string | null
    delivered_at?: string | null
  }
) {
  return request<SellerOrderBundle>(
    `/store/order-service/seller/orders/${encodeURIComponent(orderId)}/shipment`,
    {
      method: "PUT",
      body: JSON.stringify(body),
    }
  )
}

export function uploadSellerOrderDocument(
  orderId: string,
  type: "invoice",
  file: File
) {
  const form = new FormData()
  form.append("type", type)
  form.append("files", file)
  return requestForm<SellerOrderBundle>(
    `/store/order-service/seller/orders/${encodeURIComponent(orderId)}/documents`,
    form
  )
}

export function generateSellerPackingSlip(orderId: string) {
  return request<SellerOrderBundle>(
    `/store/order-service/seller/orders/${encodeURIComponent(orderId)}/documents/packing-slip/generate`,
    { method: "POST", body: "{}" }
  )
}

export function ensureSellerOrderMessage(
  orderId: string,
  body?: string,
  subject?: string
) {
  const text = body?.trim()
  if (!text) {
    return Promise.reject(
      new OrderServiceApiError("Berichttekst is verplicht.", 400)
    )
  }
  return request<{
    conversation_id: string
    message: {
      id: string
      order_id: string | null
      sender_customer_id: string
      body: string
      created_at: string
    }
  }>(
    `/store/order-service/seller/orders/${encodeURIComponent(orderId)}/message`,
    {
      method: "POST",
      body: JSON.stringify({
        body: text,
        subject: subject ?? undefined,
      }),
    }
  )
}

export function getSellerOrderConversation(orderId: string) {
  return request<{ conversation_id: string | null }>(
    `/store/order-service/seller/orders/${encodeURIComponent(orderId)}/message`
  )
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

export function createSellerReturn(order_line_id: string, reason: string) {
  return request<{ return: ReturnView; order_id: string }>(
    "/store/order-service/seller/returns",
    {
      method: "POST",
      body: JSON.stringify({ order_line_id, reason }),
    }
  )
}

export function updateSellerReturnTracking(
  id: string,
  payload: {
    carrier?: string | null
    tracking_code?: string | null
    tracking_url?: string | null
    mark_in_transit?: boolean
  }
) {
  return request<{ return: ReturnView }>(
    `/store/order-service/seller/returns/${encodeURIComponent(id)}/tracking`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    }
  )
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

export type MessageAttachmentView = {
  id: string
  url: string
  filename: string
  mime_type: string
  size_bytes: number
}

export type MessageView = {
  id: string
  order_id: string | null
  sender_customer_id: string
  body: string
  created_at: string
  attachments?: MessageAttachmentView[]
}

export type ConversationStatus =
  | "waiting_for_seller"
  | "waiting_for_customer"
  | "resolved"

export type MessageThreadSummary = {
  id?: string
  conversation_id?: string
  order_id: string | null
  order_number: string | null
  seller_id: string
  customer_id: string
  customer_email?: string | null
  customer_name?: string | null
  subject?: string | null
  status?: ConversationStatus
  message_count: number
  last_message_at: string | null
  last_body_preview: string | null
  unread?: boolean
  requires_attention?: boolean
}

export type ConversationReadView = {
  conversation_id: string
  read_at: string
}

export type SellerCustomerOption = {
  customer_id: string
  email: string
  name: string
  order_ids: string[]
  order_numbers: string[]
}

export function listMessageThreads() {
  return request<{ threads: MessageThreadSummary[]; count: number }>(
    "/store/order-service/messages"
  )
}

export function listSellerMessageThreads(status?: string, q?: string) {
  const params = new URLSearchParams()
  if (status) params.set("status", status)
  if (q?.trim()) params.set("q", q.trim())
  const qs = params.toString() ? `?${params.toString()}` : ""
  return request<{
    threads: MessageThreadSummary[]
    count: number
    unread_count: number
    attention_count: number
  }>(`/store/order-service/seller/messages${qs}`)
}

export function listSellerMessageReads() {
  return request<{ reads: ConversationReadView[]; count: number }>(
    "/store/order-service/seller/messages/reads"
  )
}

export function markSellerMessageRead(conversationId: string) {
  return request<ConversationReadView>(
    `/store/order-service/seller/messages/${encodeURIComponent(conversationId)}/read`,
    { method: "POST" }
  )
}

export function listSellerCustomers(q?: string) {
  const qs = q?.trim() ? `?q=${encodeURIComponent(q.trim())}` : ""
  return request<{ customers: SellerCustomerOption[]; count: number }>(
    `/store/order-service/seller/customers${qs}`
  )
}

export type SellerOrderOption = {
  id: string
  order_number: string
}

export function listSellerCustomerOrders(customerId: string, q?: string) {
  const params = new URLSearchParams({ customer_id: customerId })
  if (q?.trim()) params.set("q", q.trim())
  return request<{ orders: SellerOrderOption[]; count: number }>(
    `/store/order-service/seller/orders/lookup?${params.toString()}`
  )
}

export function getSellerConversation(id: string) {
  return request<{
    conversation: {
      id: string
      status: ConversationStatus
      subject: string | null
      seller_id: string
      customer_id: string
      customer_email: string | null
      customer_name: string | null
      order_id: string | null
      order_number: string | null
      last_message_at: string | null
    }
    messages: MessageView[]
    viewer_customer_id: string
    order_summary: SellerOrderBundle | null
  }>(`/store/order-service/seller/conversations/${encodeURIComponent(id)}`)
}

export function replySellerConversation(
  id: string,
  body: string,
  files?: File[]
) {
  if (files && files.length > 0) {
    const form = new FormData()
    form.append("body", body)
    for (const file of files) form.append("files", file)
    return requestForm<{ message: MessageView; status: ConversationStatus }>(
      `/store/order-service/seller/conversations/${encodeURIComponent(id)}`,
      form
    )
  }
  return request<{ message: MessageView; status: ConversationStatus }>(
    `/store/order-service/seller/conversations/${encodeURIComponent(id)}`,
    {
      method: "POST",
      body: JSON.stringify({ body }),
    }
  )
}

export function createSellerConversation(input: {
  customer_id: string
  order_id?: string | null
  subject?: string | null
  body: string
  files?: File[]
}) {
  const form = new FormData()
  form.append("customer_id", input.customer_id)
  form.append("body", input.body)
  if (input.order_id) form.append("order_id", input.order_id)
  if (input.subject) form.append("subject", input.subject)
  for (const file of input.files ?? []) form.append("files", file)
  return requestForm<{
    message: MessageView
    conversation_id: string
    status: ConversationStatus
  }>("/store/order-service/seller/conversations", form)
}

export function patchSellerConversationStatus(
  id: string,
  status: ConversationStatus
) {
  return request<{ conversation: { id: string; status: ConversationStatus } }>(
    `/store/order-service/seller/conversations/${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }
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

export function sendOrderMessage(
  orderId: string,
  body: string,
  files?: File[]
) {
  if (files && files.length > 0) {
    const form = new FormData()
    form.append("body", body)
    for (const file of files) form.append("files", file)
    return requestForm<{ message: MessageView }>(
      `/store/order-service/orders/${orderId}/messages`,
      form
    )
  }
  return request<{ message: MessageView }>(
    `/store/order-service/orders/${orderId}/messages`,
    {
      method: "POST",
      body: JSON.stringify({ body }),
    }
  )
}

export function getStoreConversation(id: string) {
  return request<{
    conversation: {
      id: string
      status: ConversationStatus
      subject: string | null
      order_id: string | null
      order_number: string | null
      customer_id: string
      seller_id: string
    }
    messages: MessageView[]
    viewer_customer_id: string
  }>(`/store/order-service/conversations/${encodeURIComponent(id)}`)
}

export function replyStoreConversation(
  id: string,
  body: string,
  files?: File[]
) {
  const form = new FormData()
  form.append("body", body)
  for (const file of files ?? []) form.append("files", file)
  return requestForm<{ message: MessageView }>(
    `/store/order-service/conversations/${encodeURIComponent(id)}`,
    form
  )
}

async function requestForm<T>(path: string, form: FormData): Promise<T> {
  const guest = getGuestCartToken()
  const response = await fetch(`${medusaBackendUrl()}${path}`, {
    method: "POST",
    credentials: "include",
    headers: {
      ...(PUBLISHABLE_KEY
        ? { "x-publishable-api-key": PUBLISHABLE_KEY }
        : {}),
      ...(guest ? { "x-guest-cart-token": guest } : {}),
    },
    body: form,
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
