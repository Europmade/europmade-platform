import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { executeListAdminPayouts } from "../../../../workflows/finance/workflows"

/**
 * GET /admin/finance/payouts — Beheerder-overzicht (S3-08-04).
 */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const status =
    typeof req.query.status === "string" ? req.query.status : undefined
  const recipient_type =
    typeof req.query.recipient_type === "string"
      ? req.query.recipient_type
      : undefined
  const result = await executeListAdminPayouts(req.scope, {
    status,
    recipient_type,
  })
  res.status(200).json(result)
}
