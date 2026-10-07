import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { paramId } from "../../../../../../prospect-request"
import {
  guardStepContent,
  intField,
  programsService,
  requireSequenceOnProgram,
  requireStepOnSequence,
  respondPrograms,
} from "../../../../../../automation-request"
import { optionalString, recordBody } from "../../../../../../cms-request"

/** POST — volgorde, vertraging, template en variant. Geen inhoud. */
export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const programId = paramId(req.params.id, "LifecycleProgram")
  const sequenceId = paramId(req.params.sequenceId, "Sequence")
  const stepId = paramId(req.params.stepId, "SequenceStep")
  const body = recordBody(req.body)
  guardStepContent(body)
  const service = programsService(req.scope)
  await requireSequenceOnProgram(service, programId, sequenceId)
  await requireStepOnSequence(service, sequenceId, stepId)
  await service.updateSequenceStep({
    id: stepId,
    step_order: intField(body, "step_order", "Volgorde", false),
    delay_minutes: intField(body, "delay_minutes", "Vertraging", false),
    template_id: optionalString(body, "template_id"),
    variant_id: optionalString(body, "variant_id"),
  })
  res.status(200).json(await respondPrograms(req.scope))
}

/** DELETE — alleen als geen enrollment naar deze step verwijst. */
export async function DELETE(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const programId = paramId(req.params.id, "LifecycleProgram")
  const sequenceId = paramId(req.params.sequenceId, "Sequence")
  const stepId = paramId(req.params.stepId, "SequenceStep")
  const service = programsService(req.scope)
  await requireSequenceOnProgram(service, programId, sequenceId)
  await requireStepOnSequence(service, sequenceId, stepId)
  await service.deleteSequenceStep(stepId)
  res.status(200).json(await respondPrograms(req.scope))
}
