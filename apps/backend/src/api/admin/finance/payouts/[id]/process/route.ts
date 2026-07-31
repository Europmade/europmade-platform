import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { executeProcessPayout } from "../../../../../../workflows/finance/workflows"

/**
 * POST /admin/finance/payouts/:id/process — verwerk na retourhold (S3-08-04).
 */
export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const payoutId = req.params.id
  const result = await executeProcessPayout(req.scope, payoutId)
  res.status(200).json(result)
}
