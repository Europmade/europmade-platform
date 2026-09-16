import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { ORDER_MODULE } from "../../../../../../../modules/order-service"
import type OrderServiceModuleService from "../../../../../../../modules/order-service/service"
import { resolveApprovedSeller } from "../../../../../product-cloud/resolve-seller"
import { enrichOrderBundle } from "../../../../order-enrichment"
import { executeSendMessage } from "../../../../../../../workflows/order-service/messages"

type RouteParams = { id: string }

/** GET conversation_id for this order (from enrichment). */
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
  res.json({ conversation_id: bundle.conversation_id })
}

/** POST start/reuse order conversation and send a message. */
export async function POST(
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

  const body = (req.body ?? {}) as {
    body?: string
    subject?: string | null
  }
  const text = typeof body.body === "string" ? body.body.trim() : ""
  if (!text) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Berichttekst is verplicht."
    )
  }

  const subject =
    typeof body.subject === "string" && body.subject.trim()
      ? body.subject.trim()
      : "Order message"

  const result = await executeSendMessage(req.scope, {
    order_id: id,
    sender_customer_id: seller.customer_id,
    body: text,
    subject,
  })

  res.status(201).json({
    conversation_id: result.conversation_id,
    message: result.message,
  })
}
