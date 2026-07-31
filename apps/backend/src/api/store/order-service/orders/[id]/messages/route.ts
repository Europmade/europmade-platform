import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { ORDER_MODULE } from "../../../../../../modules/order-service"
import type OrderServiceModuleService from "../../../../../../modules/order-service/service"
import {
  executeListMessages,
  resolveSellerForCustomer,
  sendMessageWorkflow,
  type OrderParticipant,
} from "../../../../../../workflows/order-service"
import type { StoreSendMessageBodyInput } from "../../../validators"

type RouteParams = { id: string }

async function resolveActor(
  container: AuthenticatedMedusaRequest["scope"],
  customerId: string,
  orderId: string
): Promise<OrderParticipant> {
  const orders = container.resolve(ORDER_MODULE) as OrderServiceModuleService
  const order = await orders.retrieveEmOrder(orderId)
  if (order.customer_id === customerId) {
    return { role: "customer", customer_id: customerId }
  }
  const seller = await resolveSellerForCustomer(container, customerId)
  if (seller && order.seller_id === seller.id) {
    return {
      role: "seller",
      customer_id: customerId,
      seller_id: seller.id,
    }
  }
  throw new MedusaError(
    MedusaError.Types.NOT_ALLOWED,
    "Geen toegang tot berichten van deze order."
  )
}

/** Thread voor één order (klant of seller). */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const { id } = req.params as RouteParams
  const customerId = req.auth_context.actor_id
  const actor = await resolveActor(req.scope, customerId, id)
  const result = await executeListMessages(req.scope, id, actor)
  const orders = req.scope.resolve(ORDER_MODULE) as OrderServiceModuleService
  const order = await orders.retrieveEmOrder(id)
  res.json({
    order_id: order.id,
    order_number: order.order_number,
    customer_id: order.customer_id,
    seller_id: order.seller_id,
    viewer_customer_id: customerId,
    ...result,
  })
}

/** Nieuw bericht in order-thread. */
export async function POST(
  req: AuthenticatedMedusaRequest<StoreSendMessageBodyInput>,
  res: MedusaResponse
) {
  const { id } = req.params as RouteParams
  const customerId = req.auth_context.actor_id
  await resolveActor(req.scope, customerId, id)
  const { result } = await sendMessageWorkflow(req.scope).run({
    input: {
      order_id: id,
      sender_customer_id: customerId,
      body: req.validatedBody.body,
    },
  })
  res.status(201).json(result)
}
