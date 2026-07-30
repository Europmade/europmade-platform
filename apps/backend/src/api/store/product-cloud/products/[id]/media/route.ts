import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { addMediaWorkflow } from "../../../../../../workflows/product-cloud"
import { resolveApprovedSeller } from "../../../resolve-seller"
import type { StoreAddMediaBodyInput } from "../../../validators"

type RouteParams = { id: string }

export async function POST(
  req: AuthenticatedMedusaRequest<StoreAddMediaBodyInput>,
  res: MedusaResponse
) {
  const seller = await resolveApprovedSeller(
    req.scope,
    req.auth_context.actor_id
  )
  const { id } = req.params as RouteParams
  const body = req.validatedBody

  const { result } = await addMediaWorkflow(req.scope).run({
    input: {
      product_id: id,
      version_id: body.version_id,
      seller_id: seller.id,
      media_type: body.media_type,
      storage_reference: body.storage_reference,
    },
  })

  res.status(201).json({ media: result })
}
