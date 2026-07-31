import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { executeDecideAffiliate } from "../../../../../workflows/affiliate/workflows"
import type { AdminDecideAffiliateBodyInput } from "../../../../store/affiliate/validators"

type Params = { id: string }

export async function POST(
  req: AuthenticatedMedusaRequest<AdminDecideAffiliateBodyInput>,
  res: MedusaResponse
) {
  const { id } = req.params as Params
  const result = await executeDecideAffiliate(req.scope, {
    affiliate_id: id,
    approve: false,
    reason: req.validatedBody.reason,
  })
  res.status(200).json({ affiliate: result.affiliate })
}
