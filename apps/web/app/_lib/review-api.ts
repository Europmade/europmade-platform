/**
 * Store Review-service client (S3-06-02/03).
 */

const BACKEND_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? "http://localhost:9000"
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? ""

export class ReviewApiError extends Error {
  status?: number

  constructor(message: string, status?: number) {
    super(message)
    this.name = "ReviewApiError"
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
    throw new ReviewApiError(message, response.status)
  }
  return body as T
}

export type ReviewType = "Productreview" | "Verkopersreview"

export type ReviewView = {
  id: string
  customer_id?: string
  order_line_id?: string
  review_type: string
  product_id: string | null
  seller_id?: string | null
  score: number
  text: string | null
  created_at: string
}

export type EligibleLine = {
  order_line_id: string
  order_id: string
  order_number: string
  offer_id: string
  product_variant_id: string
  product_id: string
  seller_id: string
  can_product_review: boolean
  can_seller_review: boolean
}

export function listEligibleReviews() {
  return request<{ eligible: EligibleLine[] }>("/store/reviews/eligible")
}

export function listMyReviews() {
  return request<{ reviews: ReviewView[] }>("/store/reviews/mine")
}

export function submitReview(input: {
  order_line_id: string
  review_type: ReviewType
  score: number
  text?: string
}) {
  return request<{ review: ReviewView }>("/store/reviews", {
    method: "POST",
    body: JSON.stringify(input),
  })
}

export function listProductReviews(productId: string) {
  return request<{ reviews: ReviewView[] }>(
    `/store/reviews?product_id=${encodeURIComponent(productId)}`
  )
}

export function getPublicProduct(productId: string) {
  return request<{
    product: { id: string; title: string; lifecycle_status: string }
    reviews: ReviewView[]
  }>(`/store/catalog/products/${encodeURIComponent(productId)}`)
}
