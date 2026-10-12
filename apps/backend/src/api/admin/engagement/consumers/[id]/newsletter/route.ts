import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { cmsService, recordBody } from "../../../cms-request"
import { presentConsumer, type ConsumerRow } from "../../../consumer-present"
import { resolveNewsletterTopics } from "../../../../../../modules/engagement/consumer-rules"
import { appendPreferenceAudits, planPreferenceAudits } from "../../../../../../modules/engagement/preference-audit"

/** POST — bewust in- of uitschrijven vanuit beheer. Geen verzending. */
export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const id = req.params.id?.trim() ?? ""
  if (!id) throw new MedusaError(MedusaError.Types.INVALID_DATA, "Consument vereist een id.")
  const body = recordBody(req.body)
  if (typeof body.enabled !== "boolean") {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "Kies inschrijven of uitschrijven.")
  }
  const service = cmsService(req.scope)
  const beforeRow = (await service.retrieveEngagementConsumer(id)) as ConsumerRow
  const before = resolveNewsletterTopics(beforeRow.newsletter_topics, Boolean(beforeRow.newsletter_enabled))
  if (body.enabled) await service.resubscribeConsumer(id)
  else await service.unsubscribeConsumer(id)
  const saved = (await service.retrieveEngagementConsumer(id)) as ConsumerRow
  await appendPreferenceAudits(
    req.scope,
    planPreferenceAudits({
      audience: "consumers",
      entityId: id,
      before,
      after: resolveNewsletterTopics(saved.newsletter_topics, Boolean(saved.newsletter_enabled)),
    })
  )
  const row = (await service.retrieveEngagementConsumer(id)) as ConsumerRow
  res.status(200).json({ consumer: presentConsumer(row) })
}
