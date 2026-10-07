import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { loadEngagementPrograms } from "../admin-engagement-query"
import { programsService, respondPrograms } from "../automation-request"
import { recordBody, requiredString } from "../cms-request"

/** GET /admin/engagement/programs — programma's, sequences en steps. */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const result = await loadEngagementPrograms(req.scope)
  res.status(200).json(result)
}

/** POST — LifecycleProgram. Geen enrollment en geen verzending. */
export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const body = recordBody(req.body)
  await programsService(req.scope).createLifecycleProgram({
    name: requiredString(body, "name", "Naam"),
    program_type: requiredString(body, "program_type", "Type"),
  })
  res.status(201).json(await respondPrograms(req.scope))
}
