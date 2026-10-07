import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { paramId } from "../../../prospect-request"
import { programsService, respondPrograms } from "../../../automation-request"
import { recordBody, requiredString } from "../../../cms-request"

/** POST — sequence in dit programma. Geen communicatie-inhoud. */
export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const programId = paramId(req.params.id, "LifecycleProgram")
  const body = recordBody(req.body)
  await programsService(req.scope).createSequence({
    program_id: programId,
    name: requiredString(body, "name", "Naam"),
  })
  res.status(201).json(await respondPrograms(req.scope))
}
