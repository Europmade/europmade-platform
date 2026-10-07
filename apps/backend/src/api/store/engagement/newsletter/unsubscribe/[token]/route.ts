import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { isPreviewUnsubscribeToken } from "../../../../../../modules/engagement/consumer-rules"
import { cmsService } from "../../../../../admin/engagement/cms-request"

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
  )) as Array<{ newsletter_enabled?: boolean }>
  const row = rows[0]
  if (!row) {
    res.status(404).json({ message: "Deze uitschrijflink is niet geldig." })
    return
  }
  res.status(200).json({
    state: row.newsletter_enabled ? "subscribed" : "unsubscribed",
    message: row.newsletter_enabled
      ? "Wil je geen nieuwsbrieven van EuropMade meer ontvangen?"
      : "Je bent uitgeschreven voor de EuropMade-nieuwsbrief.",
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
  await cmsService(req.scope).unsubscribeConsumerByToken(token)
  res.status(200).json({
    state: "unsubscribed",
    message: "Je bent uitgeschreven voor de EuropMade-nieuwsbrief.",
  })
}
