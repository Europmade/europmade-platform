import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { paramId } from "../../../../../prospect-request"
import {
  programsService,
  requireSequenceOnProgram,
  respondPrograms,
} from "../../../../../automation-request"
import { recordBody } from "../../../../../cms-request"

/** POST — vaste volgorde van de stappen. Geen verzending. */
export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const programId = paramId(req.params.id, "Automatisering")
  const sequenceId = paramId(req.params.sequenceId, "Automatisering")
  const body = recordBody(req.body)
  const raw = body.steps
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "De volgorde van de berichten ontbreekt."
    )
  }
  const steps = raw.map((item, index) => {
    if (!item || typeof item !== "object") {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "De volgorde van de berichten is ongeldig."
      )
    }
    const row = item as { id?: unknown; step_order?: unknown }
    const id = typeof row.id === "string" ? row.id.trim() : ""
    const step_order =
      typeof row.step_order === "number" ? row.step_order : Number(row.step_order)
    if (!id || !Number.isInteger(step_order)) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Bericht ${index + 1} heeft geen geldige volgorde.`
      )
    }
    return { id, step_order }
  })
  const service = programsService(req.scope)
  await requireSequenceOnProgram(service, programId, sequenceId)
  await service.orderSequenceSteps({ sequence_id: sequenceId, steps })
  res.status(200).json(await respondPrograms(req.scope))
}
