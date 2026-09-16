import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { resolveApprovedSeller } from "../../../../../product-cloud/resolve-seller"
import { executeUpdateReturnTracking } from "../../../../../../../workflows/order-service/returns"

type RouteParams = { id: string }

/** PATCH return tracking (carrier / code / URL / mark in transit). */
export async function PATCH(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const seller = await resolveApprovedSeller(
    req.scope,
    req.auth_context.actor_id
  )
  const { id } = req.params as RouteParams
  const body = (req.body ?? {}) as {
    carrier?: string | null
    tracking_code?: string | null
    tracking_url?: string | null
    mark_in_transit?: boolean
  }

  const result = await executeUpdateReturnTracking(req.scope, {
    return_id: id,
    seller_id: seller.id,
    carrier: body.carrier,
    tracking_code: body.tracking_code,
    tracking_url: body.tracking_url,
    mark_in_transit: body.mark_in_transit === true,
  })

  res.json(result)
}
