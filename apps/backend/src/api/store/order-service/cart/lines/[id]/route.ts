import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { ORDER_MODULE } from "../../../../../../modules/order-service"
import type OrderServiceModuleService from "../../../../../../modules/order-service/service"
import { revalidateCheckoutLines } from "../../../../../../workflows/order-service"
import { computeCheckoutTotals } from "../../../totals"
import type { StoreCartLinePatchBodyInput } from "../../../validators"

type RouteParams = { id: string }

export async function PATCH(
  req: AuthenticatedMedusaRequest<StoreCartLinePatchBodyInput>,
  res: MedusaResponse
) {
  const { id } = req.params as RouteParams
  const quantity = req.validatedBody.quantity
  const orders = req.scope.resolve(ORDER_MODULE) as OrderServiceModuleService
  const cart = await orders.resolveOrCreateCart({
    customer_id: req.auth_context.actor_id,
    guest_token: null,
  })
  const line = await orders.retrieveCartLine(id)
  if (line.cart_id !== cart.id) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Deze winkelwagenregel hoort niet bij jouw cart."
    )
  }
  await revalidateCheckoutLines(req.scope, [
    { offer_id: line.offer_id, quantity },
  ])
  await orders.upsertCartLine({
    cart_id: cart.id,
    offer_id: line.offer_id,
    quantity,
  })
  const lines = await orders.listCartLines({ cart_id: cart.id })
  const validated = await revalidateCheckoutLines(
    req.scope,
    lines.map((l) => ({ offer_id: l.offer_id, quantity: Number(l.quantity) }))
  )
  res.json({
    cart_id: cart.id,
    lines: lines.map((l) => {
      const v = validated.find((x) => x.offer_id === l.offer_id)!
      return {
        line_id: l.id,
        offer_id: l.offer_id,
        quantity: Number(l.quantity),
        seller_id: v.seller_id,
        unit_price: v.unit_price,
        shipping_cost: v.shipping_cost,
        vat_rate: v.vat_rate,
        quantity_available: v.quantity_available,
        total_unit_price: v.total_unit_price,
      }
    }),
    totals: computeCheckoutTotals(validated),
  })
}

export async function DELETE(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const { id } = req.params as RouteParams
  const orders = req.scope.resolve(ORDER_MODULE) as OrderServiceModuleService
  const cart = await orders.resolveOrCreateCart({
    customer_id: req.auth_context.actor_id,
    guest_token: null,
  })
  const line = await orders.retrieveCartLine(id)
  if (line.cart_id !== cart.id) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Deze winkelwagenregel hoort niet bij jouw cart."
    )
  }
  await orders.softDeleteCartLines([id])
  res.json({ deleted: true, line_id: id })
}
