import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { MFA_MODULE } from "../../../modules/mfa"
import type MfaModuleService from "../../../modules/mfa/service"

/** GET /store/mfa — 2FA-status voor de ingelogde customer. */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const customerId = req.auth_context.actor_id
  if (!customerId) {
    throw new MedusaError(
      MedusaError.Types.UNAUTHORIZED,
      "Authenticatie vereist."
    )
  }
  const mfa = req.scope.resolve(MFA_MODULE) as MfaModuleService
  const status = await mfa.getStatus(customerId)
  res.json(status)
}
