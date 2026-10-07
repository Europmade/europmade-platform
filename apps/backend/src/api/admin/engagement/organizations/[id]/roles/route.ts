import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { cmsService, recordBody, requiredString } from "../../../cms-request"
import { paramId, respondOrganization } from "../../../prospect-request"

/** POST — één bestaande rol toevoegen. Geen dubbele rol. */
export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const id = paramId(req.params.id, "Organization")
  const body = recordBody(req.body)
  await cmsService(req.scope).addOrganizationRole({
    organization_id: id,
    role: requiredString(body, "role", "Rol"),
  })
  res.status(200).json({
    organization: await respondOrganization(req.scope, id),
  })
}
