import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { paramId } from "../../prospect-request"
import { programsService, respondPrograms } from "../../automation-request"
import { optionalString, recordBody } from "../../cms-request"

/** POST — naam, type en start. Geen enrollment en geen verzending. */
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
    ...("start_trigger" in body
      ? { start_trigger: typeof body.start_trigger === "string" ? body.start_trigger : null }
      : {}),
    ...("start_mode" in body
      ? { start_mode: typeof body.start_mode === "string" ? body.start_mode : null }
      : {}),
    ...("scheduled_at" in body
      ? { scheduled_at: typeof body.scheduled_at === "string" ? body.scheduled_at : null }
      : {}),
    ...("schedule_timezone" in body
      ? {
          schedule_timezone:
            typeof body.schedule_timezone === "string" ? body.schedule_timezone : null,
        }
      : {}),
    ...("audience" in body
      ? { audience: typeof body.audience === "string" ? body.audience : null }
      : {}),
    ...("selection_criteria" in body ? { selection_criteria: body.selection_criteria } : {}),
    activate: body.activate === true,
  })
  res.status(200).json(await respondPrograms(req.scope))
}
