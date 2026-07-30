import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { adminArchiveWorkflow } from "../../../../../../workflows/product-cloud"
import type { AdminArchiveProductBodyInput } from "../../../validators"

type RouteParams = { id: string }

export async function POST(
  req: AuthenticatedMedusaRequest<AdminArchiveProductBodyInput>,
  res: MedusaResponse
) {
  const { id } = req.params as RouteParams
  void req.validatedBody

  const { result } = await adminArchiveWorkflow(req.scope).run({
    input: { product_id: id },
  })

  res.json({ product: result })
}
