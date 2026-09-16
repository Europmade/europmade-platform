import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { MFA_MODULE } from "../../../../../../modules/mfa"
import type MfaModuleService from "../../../../../../modules/mfa/service"

type Body = {
  method?: "totp" | "recovery_code"
  code?: string
  trust_device?: boolean
}

type RouteParams = { id: string }

/**
 * POST /store/mfa/challenges/:id/verify
 *
 * Completes login 2FA. Must NOT live under /auth/* — Medusa treats
 * /auth/{actor_type}/{provider} as the Auth Module login route and returns
 * 401 Unauthorized for custom paths like /auth/mfa/challenges/:id/verify.
 *
 * Public (no customer session yet): the challenge id is the capability token.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const { id } = req.params as RouteParams
  const body = (req.body ?? {}) as Body
  const method = body.method
  const code = typeof body.code === "string" ? body.code.trim() : ""
  const trustDevice = body.trust_device === true

  if (!id) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "challenge id is verplicht."
    )
  }
  if (method !== "totp" && method !== "recovery_code") {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "method moet totp of recovery_code zijn."
    )
  }
  if (!code) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "code is verplicht."
    )
  }

  const mfa = req.scope.resolve(MFA_MODULE) as MfaModuleService
  const result = await mfa.verifyChallenge(id, method, code)

  let trust_token: string | undefined
  if (trustDevice) {
    trust_token = await mfa.issueTrustedDeviceToken(result.customer_id)
  }

  res.status(200).json({
    token: result.token,
    ...(trust_token ? { trust_token } : {}),
  })
}
