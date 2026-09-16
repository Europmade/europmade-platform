import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { MFA_MODULE } from "../../../../modules/mfa"
import type MfaModuleService from "../../../../modules/mfa/service"

type Body = { code?: string }

/** POST /store/mfa/confirm — bevestig TOTP; activeert 2FA + geeft herstelcodes. */
export async function POST(
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

  const body = (req.body ?? {}) as Body
  const code = typeof body.code === "string" ? body.code.trim() : ""
  if (!code) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Verificatiecode is verplicht."
    )
  }

  const mfa = req.scope.resolve(MFA_MODULE) as MfaModuleService
  const result = await mfa.confirmEnroll(customerId, code)
  res.status(200).json(result)
}
