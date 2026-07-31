import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { executeDecideAffiliate } from "../../../../../workflows/affiliate/workflows"

type Params = { id: string }

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const { id } = req.params as Params
  const result = await executeDecideAffiliate(req.scope, {
    affiliate_id: id,
    approve: true,
  })
  res.status(200).json({ affiliate: result.affiliate })
}
