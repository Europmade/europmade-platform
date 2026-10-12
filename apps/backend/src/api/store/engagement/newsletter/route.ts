import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError, Modules } from "@medusajs/framework/utils"
import { cmsService, recordBody } from "../../../admin/engagement/cms-request"
import { dispatchAutomation } from "../../../../modules/engagement/automation-run"
import { allNewsletterTopics, emptyNewsletterTopics } from "../../../../modules/engagement/consumer-rules"
import { appendPreferenceAudits, planPreferenceAudits } from "../../../../modules/engagement/preference-audit"

type CustomerRecord = {
  id?: string
  email?: string | null
  first_name?: string | null
  last_name?: string | null
  addresses?: Array<{ country_code?: string | null }>
}

/**
 * POST /store/engagement/newsletter — inschrijven vanaf de storefront.
 * Geen account verplicht. Geen Organization. Geen verzending.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const body = recordBody(req.body)
  const email = typeof body.email === "string" ? body.email : ""
  const locale = typeof body.locale === "string" ? body.locale : null
  const customer = await findCustomer(req, email)
  const name = [customer?.first_name, customer?.last_name].filter(Boolean).join(" ").trim()
  const country = customer?.addresses?.find((item) => item.country_code)?.country_code ?? null
  try {
    const result = await cmsService(req.scope).subscribeConsumer({
      email,
      source: "website",
      name: name || null,
      country_code: country,
      locale,
      customer_id: customer?.id ?? null,
    })
    if (result.outcome === "subscribed") {
      await appendPreferenceAudits(
        req.scope,
        planPreferenceAudits({
          audience: "consumers",
          entityId: result.id,
          actorCustomerId: customer?.id ?? null,
          before: emptyNewsletterTopics(),
          after: allNewsletterTopics(),
        })
      )
      try {
        await dispatchAutomation(req.scope, { only: ["consumer_newsletter_subscribed"] })
      } catch {
        // Inschrijven blijft geslaagd. De job haalt het startmoment later op.
      }
    }
    const status = result.outcome === "already_subscribed" ? 200 : 201
    res.status(status).json({
      outcome: result.outcome,
      message:
        result.outcome === "already_subscribed"
          ? "Dit e-mailadres staat al ingeschreven."
          : "Je bent ingeschreven voor de EuropMade-nieuwsbrief.",
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Inschrijven is niet gelukt."
    throw new MedusaError(MedusaError.Types.INVALID_DATA, message)
  }
}

async function findCustomer(req: MedusaRequest, email: string): Promise<CustomerRecord | null> {
  const normalized = email.trim().toLowerCase()
  if (!normalized) return null
  try {
    const customers = req.scope.resolve(Modules.CUSTOMER) as {
      listCustomers: (
        filters: { email: string },
        config: { take: number; relations: string[] }
      ) => Promise<CustomerRecord[]>
    }
    const rows = await customers.listCustomers(
      { email: normalized },
      { take: 1, relations: ["addresses"] }
    )
    const found = rows[0]
    if (!found?.id || found.email?.trim().toLowerCase() !== normalized) return null
    return found
  } catch {
    return null
  }
}
