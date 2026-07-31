import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { escalateReturnWorkflow } from "../../../../../../workflows/order-service"

type RouteParams = { id: string }

/** Klant: afgewezen retour escaleren naar Beheerder. */
export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const { id } = req.params as RouteParams
  const { result } = await escalateReturnWorkflow(req.scope).run({
    input: {
      customer_id: req.auth_context.actor_id,
      return_id: id,
    },
  })
  res.json(result)
}
