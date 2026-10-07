import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { cmsService, optionalString, recordBody, requiredString } from "../../../cms-request"
import { paramId, respondOrganization } from "../../../prospect-request"

/** POST — contact op deze organisatie. Geen contact zonder organisatie. */
export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const id = paramId(req.params.id, "Organization")
  const body = recordBody(req.body)
  await cmsService(req.scope).createContact({
    organization_id: id,
    email: requiredString(body, "email", "E-mail"),
    name: optionalString(body, "name") ?? null,
  })
  res.status(201).json({
    organization: await respondOrganization(req.scope, id),
  })
}
