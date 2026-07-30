import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { publishVersionWorkflow } from "../../../../../../../../workflows/product-cloud"
import { resolveApprovedSeller } from "../../../../../resolve-seller"

type RouteParams = { id: string; versionId: string }

export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const seller = await resolveApprovedSeller(
    req.scope,
    req.auth_context.actor_id
  )
  const { id, versionId } = req.params as RouteParams

  const { result } = await publishVersionWorkflow(req.scope).run({
    input: {
      product_id: id,
      version_id: versionId,
      seller_id: seller.id,
    },
  })

  res.json(result)
}
