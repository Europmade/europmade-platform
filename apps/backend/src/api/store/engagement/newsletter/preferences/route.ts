import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError, Modules } from "@medusajs/framework/utils"
import {
  CONSUMER_NEWSLETTER_TOPIC_LABELS,
  CONSUMER_NEWSLETTER_TOPICS,
  resolveNewsletterTopics,
  type ConsumerNewsletterTopics,
} from "../../../../../modules/engagement/consumer-rules"
import { appendPreferenceAudits, planPreferenceAudits } from "../../../../../modules/engagement/preference-audit"
import { cmsService, recordBody } from "../../../../admin/engagement/cms-request"

type CustomerRecord = {
  id?: string
  email?: string | null
  first_name?: string | null
  last_name?: string | null
  addresses?: Array<{ country_code?: string | null }>
}

type ConsumerRow = {
  id: string
  email: string
  newsletter_enabled?: boolean | null
  newsletter_topics?: unknown
  customer_id?: string | null
}

/**
 * GET/POST /store/engagement/newsletter/preferences
 * Drie echte nieuwsbrieven op de bestaande consument. Geen verzending.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const customer = await requireCustomer(req)
  const row = await findLinkedConsumer(req, customer)
  res.status(200).json({ newsletters: presentTopics(row) })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const customer = await requireCustomer(req)
  const body = recordBody(req.body)
  const service = cmsService(req.scope)
  const row = await findLinkedConsumer(req, customer)
  const before = resolveNewsletterTopics(row?.newsletter_topics, Boolean(row?.newsletter_enabled))
  if (body.topics && typeof body.topics === "object") {
    if (!row) {
      const wanted = body.topics as ConsumerNewsletterTopics
      const anyOn = Boolean(wanted.news || wanted.brands || wanted.offers)
      if (anyOn) {
        await service.subscribeConsumer({
          email: customer.email ?? "",
          source: "account",
          name: customerName(customer),
          country_code: customerCountry(customer),
          locale: typeof body.locale === "string" ? body.locale : null,
          customer_id: customer.id ?? null,
          topics: body.topics,
        })
      }
    } else {
      await service.setConsumerNewsletterTopics(row.id, body.topics)
    }
  } else if (typeof body.newsletter_enabled === "boolean") {
    if (body.newsletter_enabled) {
      await service.subscribeConsumer({
        email: customer.email ?? "",
        source: "account",
        name: customerName(customer),
        country_code: customerCountry(customer),
        locale: typeof body.locale === "string" ? body.locale : null,
        customer_id: customer.id ?? null,
      })
    } else if (row) {
      await service.unsubscribeConsumer(row.id)
    }
  } else {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Kies per nieuwsbrief of die aan of uit staat."
    )
  }
  const current = await findLinkedConsumer(req, customer)
  if (current) {
    await appendPreferenceAudits(
      req.scope,
      planPreferenceAudits({
        audience: "consumers",
        entityId: current.id,
        actorCustomerId: customer.id ?? null,
        before,
        after: resolveNewsletterTopics(current.newsletter_topics, Boolean(current.newsletter_enabled)),
      })
    )
  }
  res.status(200).json({ newsletters: presentTopics(current) })
}

function presentTopics(row: ConsumerRow | null) {
  const topics = resolveNewsletterTopics(row?.newsletter_topics, Boolean(row?.newsletter_enabled))
  return CONSUMER_NEWSLETTER_TOPICS.map((key) => ({
    key,
    label: CONSUMER_NEWSLETTER_TOPIC_LABELS[key],
    enabled: topics[key],
  }))
}

function customerName(customer: CustomerRecord): string | null {
  const name = [customer.first_name, customer.last_name].filter(Boolean).join(" ").trim()
  return name || null
}

function customerCountry(customer: CustomerRecord): string | null {
  return customer.addresses?.find((item) => item.country_code)?.country_code ?? null
}

async function requireCustomer(req: MedusaRequest): Promise<CustomerRecord> {
  const customerId = req.auth_context?.actor_id
  if (!customerId) {
    throw new MedusaError(MedusaError.Types.UNAUTHORIZED, "Log in om je voorkeuren te bekijken.")
  }
  const customers = req.scope.resolve(Modules.CUSTOMER) as {
    retrieveCustomer: (id: string, config?: { relations?: string[] }) => Promise<CustomerRecord>
  }
  const customer = await customers.retrieveCustomer(customerId, { relations: ["addresses"] })
  if (!customer?.email) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "Account niet gevonden.")
  }
  return { ...customer, id: customer.id ?? customerId }
}

async function findLinkedConsumer(
  req: MedusaRequest,
  customer: CustomerRecord
): Promise<ConsumerRow | null> {
  const service = cmsService(req.scope) as unknown as {
    listEngagementConsumers: (
      filters: { customer_id?: string; email?: string },
      config: { take: number }
    ) => Promise<ConsumerRow[]>
  }
  if (customer.id) {
    const byCustomer = await service.listEngagementConsumers(
      { customer_id: customer.id },
      { take: 1 }
    )
    if (byCustomer[0]) return byCustomer[0]
  }
  const email = customer.email?.trim().toLowerCase()
  if (!email) return null
  const byEmail = await service.listEngagementConsumers({ email }, { take: 1 })
  return byEmail[0] ?? null
}
