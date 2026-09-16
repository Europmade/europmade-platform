import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { ORDER_MODULE } from "../../../../../../modules/order-service"
import type OrderServiceModuleService from "../../../../../../modules/order-service/service"
import { resolveApprovedSeller } from "../../../../product-cloud/resolve-seller"
import { enrichOrderBundle } from "../../../order-enrichment"

type RouteParams = { id: string }

/** GET seller order detail with fulfilment enrichment (ADR-0040). */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const seller = await resolveApprovedSeller(
    req.scope,
    req.auth_context.actor_id
  )
  const { id } = req.params as RouteParams
  const orders = req.scope.resolve(ORDER_MODULE) as OrderServiceModuleService

  const order = await orders.retrieveEmOrder(id)
  if (order.seller_id !== seller.id) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Deze order hoort bij een andere seller."
    )
  }

  const bundle = await enrichOrderBundle(req.scope, orders, id)
  res.json(bundle)
}
