import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { cmsService } from "../../../../cms-request"
import { paramId, respondOrganization } from "../../../../prospect-request"

/** DELETE — rol uit de set. Een lege set valt terug op unknown. */
export async function DELETE(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const id = paramId(req.params.id, "Organization")
  const role = paramId(req.params.role, "Rol")
  await cmsService(req.scope).removeOrganizationRole({
    organization_id: id,
    role,
  })
  res.status(200).json({
    organization: await respondOrganization(req.scope, id),
  })
}
