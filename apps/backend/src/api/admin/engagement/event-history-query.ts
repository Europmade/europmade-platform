/**
 * Query-parameters voor de read-only CommunicationEvent-lijst.
 * Geen writes, geen verzending.
 */
import { COMMUNICATION_EVENT_STATUSES } from "../../../modules/engagement/participation-rules"

const DAY = /^\d{4}-\d{2}-\d{2}$/

export type EventHistoryQuery = {
  status: (typeof COMMUNICATION_EVENT_STATUSES)[number] | null
  contactId: string | null
  organizationId: string | null
  contact: string | null
  organization: string | null
  q: string | null
  templateId: string | null
  from: Date | null
  to: Date | null
}

function one(value: unknown): string | null {
  const raw = Array.isArray(value) ? value[0] : value
  if (typeof raw !== "string") return null
  const trimmed = raw.trim()
  return trimmed || null
}

function dayBound(value: string | null, field: string, end: boolean): Date | null {
  if (!value) return null
  if (!DAY.test(value)) {
    throw new Error(`Datumfilter ${field} gebruikt YYYY-MM-DD.`)
  }
  const date = new Date(
    `${value}T${end ? "23:59:59.999" : "00:00:00.000"}Z`
  )
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Datumfilter ${field} is ongeldig.`)
  }
  return date
}

export function parseEventHistoryQuery(
  query: Record<string, unknown>
): EventHistoryQuery {
  const status = one(query.status)
  if (
    status &&
    !(COMMUNICATION_EVENT_STATUSES as readonly string[]).includes(status)
  ) {
    throw new Error(`Onbekende communication-event-status "${status}".`)
  }
  const from = dayBound(one(query.from), "from", false)
  const to = dayBound(one(query.to), "to", true)
  if (from && to && from.getTime() > to.getTime()) {
    throw new Error("Datumfilter: from ligt na to.")
  }
  return {
    status: status as EventHistoryQuery["status"],
    contactId: one(query.contact_id),
    organizationId: one(query.organization_id),
    contact: one(query.contact),
    organization: one(query.organization),
    q: one(query.q),
    templateId: one(query.template_id),
    from,
    to,
  }
}
