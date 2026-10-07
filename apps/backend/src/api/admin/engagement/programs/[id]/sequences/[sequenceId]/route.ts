import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { paramId } from "../../../../prospect-request"
import {
  programsService,
  requireSequenceOnProgram,
  respondPrograms,
} from "../../../../automation-request"
import { optionalString, recordBody } from "../../../../cms-request"

/** POST — naam, en alleen een programmakoppeling die de service geldig vindt. */
export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const programId = paramId(req.params.id, "LifecycleProgram")
  const sequenceId = paramId(req.params.sequenceId, "Sequence")
  const service = programsService(req.scope)
  await requireSequenceOnProgram(service, programId, sequenceId)
  const body = recordBody(req.body)
  await service.updateSequence({
    id: sequenceId,
    name: optionalString(body, "name"),
    program_id: optionalString(body, "program_id"),
  })
  res.status(200).json(await respondPrograms(req.scope))
}
