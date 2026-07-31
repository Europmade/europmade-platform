import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { ORDER_MODULE } from "../../../../modules/order-service"
import type OrderServiceModuleService from "../../../../modules/order-service/service"
import { revalidateCheckoutLines } from "../../../../workflows/order-service"
import { computeCheckoutTotals } from "../totals"
import type { StoreCartLineBodyInput } from "../validators"

async function cartPayload(
  req: AuthenticatedMedusaRequest,
  cartId: string
) {
  const orders = req.scope.resolve(ORDER_MODULE) as OrderServiceModuleService
  const lines = await orders.listCartLines({ cart_id: cartId })
  if (lines.length === 0) {
    return {
      cart_id: cartId,
      lines: [],
      seller_count: 0,
      split_notice: null as string | null,
      totals: computeCheckoutTotals([]),
    }
  }
  const validated = await revalidateCheckoutLines(
    req.scope,
    lines.map((l) => ({ offer_id: l.offer_id, quantity: Number(l.quantity) }))
  )
  const byOffer = new Map(validated.map((v) => [v.offer_id, v]))
  const enriched = lines.map((l) => {
    const v = byOffer.get(l.offer_id)!
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
  })
  const sellers = new Set(enriched.map((e) => e.seller_id))
  return {
    cart_id: cartId,
    lines: enriched,
    seller_count: sellers.size,
    split_notice:
      sellers.size >= 2
        ? `Je bestelling wordt opgesplitst in ${sellers.size} deelbestellingen — één per verkoper.`
        : null,
    totals: computeCheckoutTotals(validated),
  }
}

/** Winkelwagen (ingelogde klant) — ADR-0022. */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const orders = req.scope.resolve(ORDER_MODULE) as OrderServiceModuleService
  const cart = await orders.resolveOrCreateCart({
    customer_id: req.auth_context.actor_id,
    guest_token: null,
  })
  res.json(await cartPayload(req, cart.id))
}

/** Offer-regel toevoegen of qty zetten. */
export async function POST(
  req: AuthenticatedMedusaRequest<StoreCartLineBodyInput>,
  res: MedusaResponse
) {
  const body = req.validatedBody
  const orders = req.scope.resolve(ORDER_MODULE) as OrderServiceModuleService
  await revalidateCheckoutLines(req.scope, [
    { offer_id: body.offer_id, quantity: body.quantity },
  ])
  const cart = await orders.resolveOrCreateCart({
    customer_id: req.auth_context.actor_id,
    guest_token: null,
  })
  await orders.upsertCartLine({
    cart_id: cart.id,
    offer_id: body.offer_id,
    quantity: body.quantity,
  })
  res.json(await cartPayload(req, cart.id))
}
