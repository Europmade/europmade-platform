/**
 * Moderation Center admin-API (S3-03-07 / S3-11-03).
 */

const BACKEND_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? "http://localhost:9000"

export class ModerationAdminApiError extends Error {
  status?: number
  constructor(message: string, status?: number) {
    super(message)
    this.name = "ModerationAdminApiError"
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
    throw new ModerationAdminApiError(message, response.status)
  }
  return body as T
}

export type QueueKey =
  | "claims"
  | "ownership"
  | "matching"
  | "disputes"
  | "fraude"
  | "meldingen"
  | "hoog-risico"

export type QueueSummary = { key: QueueKey; count: number }

export type QueueItem = {
  queue: QueueKey
  id: string
  item_type: string
  title: string
  status: string
  product_id: string | null
  seller_id: string | null
  affiliate_id: string | null
  signal_code: string | null
  created_at: string
  age_hours: number
}

export const QUEUE_LABELS: Record<QueueKey, string> = {
  claims: "Claims",
  ownership: "Eigendomsoverdracht",
  matching: "Matching",
  disputes: "Geschillen",
  fraude: "Fraude-signalen",
  meldingen: "Meldingen",
  "hoog-risico": "Hoog-risico",
}

export function listQueueSummary() {
  return request<{ queues: QueueSummary[] }>("/admin/moderation/queues")
}

export function listQueue(queue: QueueKey) {
  return request<{ queue: QueueKey; items: QueueItem[]; count: number }>(
    `/admin/moderation/queues/${queue}`
  )
}

export type AiMetadataDetail = {
  id: string
  recommendation_type: string
  confidence_score: number
  confidence_percent: number
  explanation: string | null
  label: string
}

export function getQueueItem(queue: QueueKey, id: string) {
  return request<{
    item: QueueItem
    detail: {
      case_type: string
      signal_code: string | null
      affiliate_id: string | null
      subject_customer_id: string | null
      source_entity_type: string | null
      source_entity_id: string | null
      decision_reason: string | null
      status: string
      ai_note: string
      ai_metadata: AiMetadataDetail | null
    }
    actions: string[]
  }>(`/admin/moderation/queues/${queue}/${id}`)
}

export function decideModerationCase(
  id: string,
  decision: "geen_actie" | "escaleren",
  reason?: string
) {
  return request<{ case: { id: string; status: string } }>(
    `/admin/moderation/cases/${id}/decide`,
    {
      method: "POST",
      body: JSON.stringify({ decision, reason: reason ?? null }),
    }
  )
}
