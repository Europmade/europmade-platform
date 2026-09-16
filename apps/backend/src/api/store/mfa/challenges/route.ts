import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { MFA_MODULE } from "../../../../modules/mfa"
import type MfaModuleService from "../../../../modules/mfa/service"

type Body = { auth_token?: string; trust_token?: string }

/**
 * POST /store/mfa/challenges — start login-2FA-challenge.
 * Auth via Bearer-token van emailpass (vóór createSession).
 * Optional trust_token skips challenge when device is trusted (30 days).
 */
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

  const authHeader = req.headers.authorization ?? ""
  const bearer = authHeader.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length).trim()
    : ""
  const body = (req.body ?? {}) as Body
  const auth_token =
    (typeof body.auth_token === "string" && body.auth_token.trim()) || bearer
  const trust_token =
    typeof body.trust_token === "string" ? body.trust_token.trim() : null

  if (!auth_token) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "auth_token is verplicht voor een 2FA-challenge."
    )
  }

  const mfa = req.scope.resolve(MFA_MODULE) as MfaModuleService
  const challenge = await mfa.createChallenge(
    customerId,
    auth_token,
    trust_token
  )

  if (challenge.skipped) {
    res.status(200).json({ skipped: true })
    return
  }

  res.status(201).json({
    mfa_challenge: { id: challenge.id, expires_at: challenge.expires_at },
  })
}
