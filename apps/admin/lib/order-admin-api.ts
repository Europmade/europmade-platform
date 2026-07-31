/**
 * Order Management Center admin-API (S3-05-08) — read-only + exception resolve.
 */

const BACKEND_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? "http://localhost:9000"

export class OrderAdminApiError extends Error {
  status?: number
  constructor(message: string, status?: number) {
    super(message)
    this.name = "OrderAdminApiError"
    this.status = status
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${BACKEND_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
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
  }
  line_count: number
  order_total: number
  payment_reference: string | null
}

export function listAdminOrders(exceptionOpen = false) {
  const q = exceptionOpen ? "?exception=open" : ""
  return request<{ orders: AdminOrderListItem[]; count: number }>(
    `/admin/order-service/orders${q}`
  )
}

export function getAdminOrder(id: string) {
  return request<{
    order: AdminOrderListItem["order"] & {
      shipping_address: string
      billing_address: string
      order_set_id: string
    }
    lines: Array<{
      id: string
      offer_id: string
      quantity: number
      unit_price_snapshot: string | number
    }>
    order_set: { id: string; payment_reference: string } | null
    returns: Array<{ id: string; status: string; order_line_id: string }>
  }>(`/admin/order-service/orders/${id}`)
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
