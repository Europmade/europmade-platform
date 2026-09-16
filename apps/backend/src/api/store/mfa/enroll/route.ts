import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError, Modules } from "@medusajs/framework/utils"
import type { ICustomerModuleService } from "@medusajs/framework/types"
import QRCode from "qrcode"
import { MFA_MODULE } from "../../../../modules/mfa"
import type MfaModuleService from "../../../../modules/mfa/service"

/** POST /store/mfa/enroll — start TOTP-setup (pending tot confirm). */
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

  const customers = req.scope.resolve(Modules.CUSTOMER) as ICustomerModuleService
  const customer = await customers.retrieveCustomer(customerId)
  const label = customer.email ?? customerId

  const mfa = req.scope.resolve(MFA_MODULE) as MfaModuleService
  const enroll = await mfa.startEnroll(customerId, label)
  const qr_data_url = await QRCode.toDataURL(enroll.otpauth_url, {
    width: 200,
    margin: 2,
    errorCorrectionLevel: "M",
  })

  res.status(201).json({ ...enroll, qr_data_url })
}
