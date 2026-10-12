/**
 * Leest bestaande history en plant een dry-run.
 * Wijzigt geen status en roept geen provider aan.
 */
import type { MedusaContainer } from "@medusajs/framework/types"
import { AFFILIATE_MODULE } from "../affiliate"
import { PARTNER_MODULE } from "../partner"
import { dryRunDeliveries, type DeliverySnapshot } from "./delivery"
import { ENGAGEMENT_MODULE } from "./index"

const TAKE = 500

type ListFn = (filters: object, config?: { take?: number }) => Promise<unknown[]>

function rows(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) return []
  return value.filter((row) => row && typeof row === "object") as Record<string, unknown>[]
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null
}

export async function inspectQueuedMarketingDeliveries(
  container: MedusaContainer
): Promise<{ wouldDeliver: number; skipped: number; considered: number }> {
  const engagement = container.resolve(ENGAGEMENT_MODULE) as {
    listEngagementCommunicationEvents: ListFn
    listEngagementLifecyclePrograms: ListFn
    listCommunicationTemplateVersions: ListFn
    listCommunicationTemplateVariants: ListFn
    listEngagementConsumers: ListFn
    listEngagementContacts: ListFn
    listEngagementOrganizations: ListFn
    listEngagementSuppressions: ListFn
  }
  const statuses = ["queued", "failed", "sent", "bounced"]
  const events = (
    await Promise.all(
      statuses.map((status) =>
        engagement.listEngagementCommunicationEvents({ status }, { take: TAKE }).catch(() => [])
      )
    )
  ).flatMap(rows)
  const [programs, versions, variants, consumers, contacts, organizations, suppressions] =
    await Promise.all([
      engagement.listEngagementLifecyclePrograms({}, { take: TAKE }).catch(() => []),
      engagement.listCommunicationTemplateVersions({}, { take: TAKE }).catch(() => []),
      engagement.listCommunicationTemplateVariants({}, { take: TAKE }).catch(() => []),
      engagement.listEngagementConsumers({}, { take: TAKE }).catch(() => []),
      engagement.listEngagementContacts({}, { take: TAKE }).catch(() => []),
      engagement.listEngagementOrganizations({}, { take: TAKE }).catch(() => []),
      engagement.listEngagementSuppressions({ active: true }, { take: TAKE }).catch(() => []),
    ])
  let sellers: Record<string, unknown>[] = []
  let affiliates: Record<string, unknown>[] = []
  try {
    const partner = container.resolve(PARTNER_MODULE) as { listSellers: ListFn }
    sellers = rows(await partner.listSellers({}, { take: TAKE }))
  } catch {
    sellers = []
  }
  try {
    const affiliate = container.resolve(AFFILIATE_MODULE) as { listAffiliates: ListFn }
    affiliates = rows(await affiliate.listAffiliates({}, { take: TAKE }))
  } catch {
    affiliates = []
  }
  const snapshot: DeliverySnapshot = {
    events: events.map((row) => ({
      id: text(row.id) ?? "",
      status: text(row.status) ?? "",
      contact_id: text(row.contact_id),
      consumer_id: text(row.consumer_id),
      affiliate_id: text(row.affiliate_id),
      program_id: text(row.program_id),
      sequence_id: text(row.sequence_id),
      sequence_step_id: text(row.sequence_step_id),
      template_id: text(row.template_id),
      variant_id: text(row.variant_id),
      template_version_id: text(row.template_version_id),
      provider_message_id: text(row.provider_message_id),
      locale: text(row.locale),
      delivery_error: text(row.delivery_error),
      attempt_count: Number(row.attempt_count ?? 0) || 0,
      delivery_claim: text(row.delivery_claim),
    })).filter((row) => row.id),
    programs: rows(programs).flatMap((row) => {
      const id = text(row.id)
      const program_type = text(row.program_type)
      if (!id || !program_type) return []
      return [
        {
          id,
          program_type,
          audience: text(row.audience),
          start_trigger: text(row.start_trigger),
        },
      ]
    }),
    versions: rows(versions).flatMap((row) => {
      const id = text(row.id)
      const variant_id = text(row.variant_id)
      if (!id || !variant_id) return []
      return [
        {
          id,
          variant_id,
          subject: text(row.subject) ?? "",
          approval_status: text(row.approval_status) ?? "",
          activation_status: text(row.activation_status) ?? "",
        },
      ]
    }),
    variants: rows(variants).flatMap((row) => {
      const id = text(row.id)
      const locale = text(row.locale)
      const template_id = text(row.template_id)
      if (!id || !locale || !template_id) return []
      return [{ id, locale, template_id }]
    }),
    consumers: rows(consumers).flatMap((row) => {
      const id = text(row.id)
      if (!id) return []
      return [
        {
          id,
          newsletter_enabled: row.newsletter_enabled === true,
          newsletter_topics: row.newsletter_topics,
        },
      ]
    }),
    contacts: rows(contacts).flatMap((row) => {
      const id = text(row.id)
      const organization_id = text(row.organization_id)
      if (!id || !organization_id) return []
      return [{ id, organization_id }]
    }),
    organizations: rows(organizations).flatMap((row) => {
      const id = text(row.id)
      if (!id) return []
      return [{ id, converted_seller_id: text(row.converted_seller_id) }]
    }),
    sellers: sellers.flatMap((row) => {
      const id = text(row.id)
      if (!id) return []
      const preferences = row.communication_preferences
      return [
        {
          id,
          communication_preferences:
            preferences && typeof preferences === "object" && !Array.isArray(preferences)
              ? (preferences as Record<string, boolean>)
              : null,
        },
      ]
    }),
    affiliates: affiliates.flatMap((row) => {
      const id = text(row.id)
      if (!id) return []
      const preferences = row.communication_preferences
      return [
        {
          id,
          communication_preferences:
            preferences && typeof preferences === "object" && !Array.isArray(preferences)
              ? (preferences as Record<string, boolean>)
              : null,
        },
      ]
    }),
    suppressions: rows(suppressions).flatMap((row) => {
      const contact_id = text(row.contact_id)
      const category = text(row.category)
      if (!contact_id || !category) return []
      return [{ contact_id, category, active: row.active !== false }]
    }),
  }
  const items = dryRunDeliveries(snapshot)
  const wouldDeliver = items.filter((item) => item.action === "would_deliver").length
  return {
    wouldDeliver,
    skipped: items.length - wouldDeliver,
    considered: items.length,
  }
}
