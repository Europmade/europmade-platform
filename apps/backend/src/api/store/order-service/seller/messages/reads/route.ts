import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { ORDER_MODULE } from "../../../../../../modules/order-service"
import type OrderServiceModuleService from "../../../../../../modules/order-service/service"
import { resolveApprovedSeller } from "../../../../product-cloud/resolve-seller"

/**
 * GET /store/order-service/seller/messages/reads
 * All persisted read cursors for the authenticated seller.
 */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const seller = await resolveApprovedSeller(
    req.scope,
    req.auth_context.actor_id
  )
  const orders = req.scope.resolve(ORDER_MODULE) as OrderServiceModuleService
  let rows: Awaited<
    ReturnType<OrderServiceModuleService["listConversationReadsForParticipant"]>
  > = []
  try {
    rows = await orders.listConversationReadsForParticipant(
      seller.customer_id
    )
  } catch {
    rows = []
  }

  const reads = rows.map((row) => ({
    conversation_id: row.conversation_id,
    read_at: new Date(row.read_at).toISOString(),
  }))

  res.json({
    reads,
    count: reads.length,
  })
}
