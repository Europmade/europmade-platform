/**
 * Wijzigingen van bestaande communicatievoorkeuren.
 * Schrijft naar audit_log. Geen e-mailadres en geen tweede voorkeurentabel.
 */
import type { MedusaContainer } from "@medusajs/framework/types"
import { AUDIT_MODULE } from "../audit"
import type { AppendAuditLogInput } from "../audit/service"
import { CONSUMER_NEWSLETTER_TOPICS } from "./consumer-rules"

export type PreferenceAudience = "consumers" | "sellers" | "affiliates"

const SELLER_KEYS = [
  "platform_updates",
  "seller_tips",
  "product_opportunities",
  "seller_campaigns",
  "europmade_news",
] as const

const AFFILIATE_KEYS = [
  "affiliate_news",
  "new_brands_products",
  "affiliate_campaigns",
  "commission_updates",
  "content_opportunities",
] as const

export function preferenceKeys(audience: PreferenceAudience): readonly string[] {
  if (audience === "consumers") return CONSUMER_NEWSLETTER_TOPICS
  if (audience === "sellers") return SELLER_KEYS
  return AFFILIATE_KEYS
}

export function asPreferenceMap(input: unknown, keys: readonly string[]): Record<string, boolean> {
  const row =
    input && typeof input === "object" && !Array.isArray(input)
      ? (input as Record<string, unknown>)
      : {}
  const next: Record<string, boolean> = {}
  for (const key of keys) next[key] = row[key] === true
  return next
}

/** Marketingkanaal. Transactionele seller-meldingen zitten hier niet in. */
export function marketingPreferenceKey(
  audience: PreferenceAudience,
  programType: string | null | undefined,
  startTrigger: string | null | undefined
): string {
  const trigger = startTrigger ?? ""
  const brands = /brand|product|category/.test(trigger)
  const offers = /offer|promo/.test(trigger) || programType === "campaign"
  if (audience === "consumers") {
    if (brands) return "brands"
    if (offers) return "offers"
    return "news"
  }
  if (audience === "sellers") {
    if (brands) return "product_opportunities"
    if (offers) return "seller_campaigns"
    return "europmade_news"
  }
  if (brands) return "new_brands_products"
  if (offers) return "affiliate_campaigns"
  return "affiliate_news"
}

export function planPreferenceAudits(input: {
  audience: PreferenceAudience
  entityId: string
  actorCustomerId?: string | null
  before: unknown
  after: unknown
}): AppendAuditLogInput[] {
  const entityId = input.entityId.trim()
  if (!entityId) return []
  const keys = preferenceKeys(input.audience)
  const before = asPreferenceMap(input.before, keys)
  const after = asPreferenceMap(input.after, keys)
  const rows: AppendAuditLogInput[] = []
  for (const key of keys) {
    if (before[key] === after[key]) continue
    rows.push({
      actor_customer_id: input.actorCustomerId?.trim() || null,
      entity_type: "communication_preference",
      entity_id: entityId,
      action_type: `${input.audience}.${key}`,
      reason: after[key] ? "ingeschakeld" : "uitgeschakeld",
    })
  }
  return rows
}

export async function appendPreferenceAudits(
  scope: MedusaContainer,
  rows: AppendAuditLogInput[]
): Promise<void> {
  if (rows.length === 0) return
  const audit = scope.resolve(AUDIT_MODULE) as {
    append: (input: AppendAuditLogInput) => Promise<unknown>
  }
  for (const row of rows) await audit.append(row)
}
