import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { AUDIT_MODULE } from "../../../../modules/audit"
import { ENGAGEMENT_MODULE } from "../../../../modules/engagement"
import {
  assessWebhookReplay,
  verifyDeliveryWebhook,
  type ProviderWebhook,
} from "../../../../modules/engagement/delivery"

/**
 * Afgeschermde webhook. Zonder geconfigureerde sleutel wijst elke aanroep af.
 * Deze route verstuurt niets en zet een bericht niet op verzonden.
 */
function header(req: MedusaRequest, name: string): string {
  const value = req.headers[name]
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? ""
}

type AuditApi = {
  append(input: {
    entity_type: string
    entity_id: string
    action_type: string
    reason?: string | null
  }): Promise<unknown>
  listAuditLogs(
    filters: { entity_type: string; entity_id: string },
    config?: { take?: number }
  ): Promise<Array<{ reason?: string | null }>>
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const rawBody = typeof req.body === "string" ? req.body : JSON.stringify(req.body ?? {})
  const verified = verifyDeliveryWebhook({
    secret: process.env.ENGAGEMENT_WEBHOOK_SECRET,
    rawBody,
    signature: header(req, "x-europmade-signature"),
    timestamp: header(req, "x-europmade-timestamp"),
    nonce: header(req, "x-europmade-nonce"),
    now: new Date(),
  })
  if (!verified.ok) {
    res.status(401).json({ message: "Webhook geweigerd." })
    return
  }
  const audit = req.scope.resolve(AUDIT_MODULE) as AuditApi
  const seen = await audit.listAuditLogs(
    { entity_type: "delivery_webhook", entity_id: verified.nonce },
    { take: 1 }
  )
  const replay = assessWebhookReplay({
    bodyHash: verified.bodyHash,
    previousBodyHash: seen[0]?.reason ?? null,
  })
  if (!replay.ok) {
    res.status(401).json({ message: "Webhook geweigerd." })
    return
  }
  if (replay.duplicate) {
    res.status(200).json({ accepted: false, duplicate: true })
    return
  }
  try {
    await audit.append({
      entity_type: "delivery_webhook",
      entity_id: verified.nonce,
      action_type: "ontvangen",
      reason: verified.bodyHash,
    })
  } catch {
    const again = await audit.listAuditLogs(
      { entity_type: "delivery_webhook", entity_id: verified.nonce },
      { take: 1 }
    )
    const raced = assessWebhookReplay({
      bodyHash: verified.bodyHash,
      previousBodyHash: again[0]?.reason ?? null,
    })
    if (raced.ok && raced.duplicate) {
      res.status(200).json({ accepted: false, duplicate: true })
      return
    }
    res.status(401).json({ message: "Webhook geweigerd." })
    return
  }
  const body = (req.body ?? {}) as Partial<ProviderWebhook>
  if (body.type !== "bounced") {
    res.status(200).json({ accepted: false, duplicate: false })
    return
  }
  const engagement = req.scope.resolve(ENGAGEMENT_MODULE) as {
    recordProviderWebhook(input: ProviderWebhook): Promise<{ duplicate: boolean }>
  }
  try {
    const result = await engagement.recordProviderWebhook({
      event_id: typeof body.event_id === "string" ? body.event_id : null,
      provider_message_id:
        typeof body.provider_message_id === "string" ? body.provider_message_id : null,
      type: "bounced",
      error: typeof body.error === "string" ? body.error : null,
    })
    res.status(200).json({ accepted: !result.duplicate, duplicate: result.duplicate })
  } catch {
    res.status(200).json({ accepted: false, duplicate: false })
  }
}
