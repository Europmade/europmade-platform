import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import {
  CONSUMER_NEWSLETTER_TOPIC_LABELS,
  CONSUMER_NEWSLETTER_TOPICS,
  emptyNewsletterTopics,
  isPreviewUnsubscribeToken,
  resolveNewsletterTopics,
} from "../../../../../../modules/engagement/consumer-rules"
import { appendPreferenceAudits, planPreferenceAudits } from "../../../../../../modules/engagement/preference-audit"
import { cmsService, recordBody } from "../../../../../admin/engagement/cms-request"

function tokenOf(req: MedusaRequest): string {
  const token = req.params.token?.trim() ?? ""
  if (!token) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "De uitschrijflink is ongeldig.")
  }
  return token
}

/** GET — toont de keuze. Schrijft niets. */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const token = tokenOf(req)
  if (isPreviewUnsubscribeToken(token)) {
    res.status(200).json({
      state: "preview",
      message: "Dit is een voorbeeld. Er wordt niemand uitgeschreven.",
    })
    return
  }
  const service = cmsService(req.scope)
  const rows = (await service.listEngagementConsumers(
    { unsubscribe_token: token },
    { take: 1 }
  )) as Array<{ id: string; newsletter_enabled?: boolean; newsletter_topics?: unknown }>
  const row = rows[0]
  if (!row) {
    res.status(404).json({ message: "Deze uitschrijflink is niet geldig." })
    return
  }
  const topics = resolveNewsletterTopics(row.newsletter_topics, Boolean(row.newsletter_enabled))
  res.status(200).json({
    state: row.newsletter_enabled ? "subscribed" : "unsubscribed",
    message: row.newsletter_enabled
      ? "Kies welke EuropMade-nieuwsbrieven je wilt ontvangen."
      : "Je bent uitgeschreven. Je kunt een soort opnieuw aanzetten.",
    newsletters: CONSUMER_NEWSLETTER_TOPICS.map((key) => ({
      key,
      label: CONSUMER_NEWSLETTER_TOPIC_LABELS[key],
      enabled: topics[key],
    })),
  })
}

/** POST — zet de nieuwsbriefvoorkeur uit. De consument blijft bestaan. */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const token = tokenOf(req)
  if (isPreviewUnsubscribeToken(token)) {
    res.status(200).json({
      state: "preview",
      message: "Dit is een voorbeeld. Er wordt niemand uitgeschreven.",
    })
    return
  }
  const service = cmsService(req.scope)
  const rows = (await service.listEngagementConsumers(
    { unsubscribe_token: token },
    { take: 1 }
  )) as Array<{ id: string; newsletter_enabled?: boolean; newsletter_topics?: unknown }>
  const current = rows[0]
  if (!current) {
    res.status(404).json({ message: "Deze uitschrijflink is niet geldig." })
    return
  }
  const before = resolveNewsletterTopics(current.newsletter_topics, Boolean(current.newsletter_enabled))
  const body = recordBody(req.body)
  if (body.topics && typeof body.topics === "object") {
    await service.setConsumerNewsletterTopicsByToken(token, body.topics)
  } else {
    await service.unsubscribeConsumerByToken(token)
  }
  const [saved] = (await service.listEngagementConsumers(
    { id: current.id },
    { take: 1 }
  )) as Array<{ newsletter_enabled?: boolean; newsletter_topics?: unknown }>
  const after = saved
    ? resolveNewsletterTopics(saved.newsletter_topics, Boolean(saved.newsletter_enabled))
    : emptyNewsletterTopics()
  await appendPreferenceAudits(
    req.scope,
    planPreferenceAudits({
      audience: "consumers",
      entityId: current.id,
      before,
      after,
    })
  )
  res.status(200).json({
    state: after.news || after.brands || after.offers ? "subscribed" : "unsubscribed",
    message:
      after.news || after.brands || after.offers
        ? "Je voorkeuren zijn opgeslagen. Er is niets verzonden."
        : "Je bent uitgeschreven voor de EuropMade-nieuwsbrief.",
    newsletters: CONSUMER_NEWSLETTER_TOPICS.map((key) => ({
      key,
      label: CONSUMER_NEWSLETTER_TOPIC_LABELS[key],
      enabled: after[key],
    })),
  })
}
