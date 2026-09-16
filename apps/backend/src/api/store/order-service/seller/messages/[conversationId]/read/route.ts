import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { ORDER_MODULE } from "../../../../../../../modules/order-service"
import type OrderServiceModuleService from "../../../../../../../modules/order-service/service"
import { resolveApprovedSeller } from "../../../../../product-cloud/resolve-seller"

type RouteParams = { conversationId: string }

/**
 * POST /store/order-service/seller/messages/:conversationId/read
 * Persist seller read state for a conversation (demo thread id or order_id).
 */
export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const seller = await resolveApprovedSeller(
    req.scope,
    req.auth_context.actor_id
  )
  const { conversationId } = req.params as RouteParams
  if (!conversationId?.trim()) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "conversationId is verplicht."
    )
  }

  const orders = req.scope.resolve(ORDER_MODULE) as OrderServiceModuleService
  const row = await orders.markConversationRead(
    seller.customer_id,
    conversationId
  )

  const read = Array.isArray(row) ? row[0] : row
  res.status(200).json({
    conversation_id: read.conversation_id,
    read_at: new Date(read.read_at).toISOString(),
  })
}
