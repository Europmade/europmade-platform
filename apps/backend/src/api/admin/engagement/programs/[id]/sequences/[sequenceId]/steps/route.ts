import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { paramId } from "../../../../../prospect-request"
import {
  guardStepContent,
  intField,
  programsService,
  requireSequenceOnProgram,
  respondPrograms,
} from "../../../../../automation-request"
import { recordBody, requiredString } from "../../../../../cms-request"

/** POST — step met template + variant. Geen version en geen tekst. */
export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const programId = paramId(req.params.id, "LifecycleProgram")
  const sequenceId = paramId(req.params.sequenceId, "Sequence")
  const body = recordBody(req.body)
  guardStepContent(body)
  const service = programsService(req.scope)
  await requireSequenceOnProgram(service, programId, sequenceId)
  await service.createSequenceStep({
    sequence_id: sequenceId,
    step_order: intField(body, "step_order", "Volgorde", true) as number,
    delay_minutes: intField(body, "delay_minutes", "Vertraging", false) ?? 0,
    template_id: requiredString(body, "template_id", "Template"),
    variant_id: requiredString(body, "variant_id", "Variant"),
  })
  res.status(201).json(await respondPrograms(req.scope))
}
