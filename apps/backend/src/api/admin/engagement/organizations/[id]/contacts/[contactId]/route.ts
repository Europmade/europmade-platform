import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { cmsService, optionalString, recordBody } from "../../../../cms-request"
import { paramId, respondOrganization } from "../../../../prospect-request"

/** POST — naam en e-mail. Het contact blijft bij deze organisatie. */
export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const id = paramId(req.params.id, "Organization")
  const contactId = paramId(req.params.contactId, "Contact")
  const body = recordBody(req.body)
  let name: string | null | undefined
  if (!("name" in body)) name = undefined
  else if (body.name === null || typeof body.name === "string") name = body.name
  else {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "name moet tekst zijn."
    )
  }
  await cmsService(req.scope).updateContact({
    id: contactId,
    organization_id: id,
    email: optionalString(body, "email"),
    name,
  })
  res.status(200).json({
    organization: await respondOrganization(req.scope, id),
  })
}
