import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { upsertConceptVersionWorkflow } from "../../../../../../workflows/product-cloud"
import { resolveApprovedSeller } from "../../../resolve-seller"
import type { StoreUpsertConceptBodyInput } from "../../../validators"

type RouteParams = { id: string }

/** Concept starten/hervatten — PM §4. */
export async function POST(
  req: AuthenticatedMedusaRequest<StoreUpsertConceptBodyInput>,
  res: MedusaResponse
) {
  const seller = await resolveApprovedSeller(
    req.scope,
    req.auth_context.actor_id
  )
  const { id } = req.params as RouteParams
  const body = req.validatedBody

  const { result } = await upsertConceptVersionWorkflow(req.scope).run({
    input: {
      product_id: id,
      seller_id: seller.id,
      title: body.title,
      description: body.description,
      is_producer_or_brand_owner: seller.is_producer_or_brand_owner,
    },
  })

  res.json(result)
}
