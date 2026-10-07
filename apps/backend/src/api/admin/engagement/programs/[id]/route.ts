import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { paramId } from "../../prospect-request"
import { programsService, respondPrograms } from "../../automation-request"
import { optionalString, recordBody } from "../../cms-request"

/** POST — naam en program_type. De service weigert een type dat stappen of enrollments breekt. */
export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const id = paramId(req.params.id, "LifecycleProgram")
  const body = recordBody(req.body)
  await programsService(req.scope).updateLifecycleProgram({
    id,
    name: optionalString(body, "name"),
    program_type: optionalString(body, "program_type"),
  })
  res.status(200).json(await respondPrograms(req.scope))
}
