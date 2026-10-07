import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { cmsService, recordBody } from "../../../cms-request"
import { presentConsumer, type ConsumerRow } from "../../../consumer-present"

/** POST — bewust in- of uitschrijven vanuit beheer. Geen verzending. */
export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const id = req.params.id?.trim() ?? ""
  if (!id) throw new MedusaError(MedusaError.Types.INVALID_DATA, "Consument vereist een id.")
  const body = recordBody(req.body)
  if (typeof body.enabled !== "boolean") {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "Kies inschrijven of uitschrijven.")
  }
  const service = cmsService(req.scope)
  if (body.enabled) await service.resubscribeConsumer(id)
  else await service.unsubscribeConsumer(id)
  const row = (await service.retrieveEngagementConsumer(id)) as ConsumerRow
  res.status(200).json({ consumer: presentConsumer(row) })
}
