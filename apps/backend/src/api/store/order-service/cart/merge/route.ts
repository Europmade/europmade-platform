import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { ORDER_MODULE } from "../../../../../modules/order-service"
import type OrderServiceModuleService from "../../../../../modules/order-service/service"
import { revalidateCheckoutLines } from "../../../../../workflows/order-service"
import { computeCheckoutTotals } from "../../totals"
import type { StoreCartMergeBodyInput } from "../../validators"

/**
 * POST /store/order-service/cart/merge — guest → customer (ADR-0022 / §5A).
 * Vereist customer-sessie; guest token via body of x-guest-cart-token.
 */
export async function POST(
  req: AuthenticatedMedusaRequest<StoreCartMergeBodyInput>,
  res: MedusaResponse
) {
  const customerId = req.auth_context.actor_id
  const headerToken = req.headers["x-guest-cart-token"]
  const guest_token =
    req.validatedBody.guest_token?.trim() ||
    (typeof headerToken === "string" ? headerToken.trim() : "")

  if (!guest_token || guest_token.length < 8) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "guest_token is verplicht voor merge."
    )
  }

  const orders = req.scope.resolve(ORDER_MODULE) as OrderServiceModuleService
  const { customer_cart_id, merged_lines } =
    await orders.mergeGuestCartIntoCustomer({
      customer_id: customerId,
      guest_token,
    })

  const clipped: Array<{ offer_id: string; quantity: number }> = []
  for (const line of merged_lines) {
    try {
      await revalidateCheckoutLines(req.scope, [
        { offer_id: line.offer_id, quantity: line.quantity },
      ])
      clipped.push(line)
    } catch {
      // Clip naar beschikbare voorraad via herhaalde poging met lagere qty
      let qty = line.quantity
      let ok = false
      while (qty > 0 && !ok) {
        qty -= 1
        try {
          await revalidateCheckoutLines(req.scope, [
            { offer_id: line.offer_id, quantity: qty },
          ])
          await orders.upsertCartLine({
            cart_id: customer_cart_id,
            offer_id: line.offer_id,
            quantity: qty,
          })
          clipped.push({ offer_id: line.offer_id, quantity: qty })
          ok = true
        } catch {
          // continue
        }
      }
      if (!ok) {
        const existing = await orders.listCartLines({
          cart_id: customer_cart_id,
          offer_id: line.offer_id,
        })
        if (existing.length > 0) {
          await orders.softDeleteCartLines([existing[0].id])
        }
      }
    }
  }

  const lines = await orders.listCartLines({ cart_id: customer_cart_id })
  if (lines.length === 0) {
    res.json({
      cart_id: customer_cart_id,
      guest_token: null,
      lines: [],
      seller_count: 0,
      split_notice: null,
      totals: computeCheckoutTotals([]),
      merged: true,
    })
    return
  }

  const validated = await revalidateCheckoutLines(
    req.scope,
    lines.map((l) => ({ offer_id: l.offer_id, quantity: Number(l.quantity) }))
  )
  const sellers = new Set(validated.map((v) => v.seller_id))
  res.json({
    cart_id: customer_cart_id,
    guest_token: null,
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
        region_code: v.region_code,
      }
    }),
    seller_count: sellers.size,
    split_notice:
      sellers.size >= 2
        ? `Je bestelling wordt opgesplitst in ${sellers.size} deelbestellingen — één per verkoper.`
        : null,
    totals: computeCheckoutTotals(validated),
    merged: true,
  })
}
