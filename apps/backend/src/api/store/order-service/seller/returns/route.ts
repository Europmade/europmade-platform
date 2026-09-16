import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { buildTrackingUrl } from "@europmade/utils"
import { ORDER_MODULE } from "../../../../../modules/order-service"
import type OrderServiceModuleService from "../../../../../modules/order-service/service"
import { normalizeRefundStatus } from "../../../../../modules/order-service/refund-service"
import { resolveApprovedSeller } from "../../../product-cloud/resolve-seller"
import { executeSellerCreateReturn } from "../../../../../workflows/order-service/returns"
import { resolveOrderLineProductInfo } from "../../resolve-line-product"

/** Seller: retouren op eigen orders. */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const seller = await resolveApprovedSeller(
    req.scope,
    req.auth_context.actor_id
  )
  const orders = req.scope.resolve(ORDER_MODULE) as OrderServiceModuleService

  const sellerOrders = await orders.listEmOrders({ seller_id: seller.id })
  const returns = []
  for (const order of sellerOrders) {
    const lines = await orders.listOrderLines({ order_id: order.id })
    for (const line of lines) {
      const product = await resolveOrderLineProductInfo(req.scope, {
        offer_id: line.offer_id,
        product_variant_id: line.product_variant_id,
      })
      const lineReturns = await orders.listEmReturns({ order_line_id: line.id })
      for (const ret of lineReturns) {
        returns.push({
          ...ret,
          order_id: order.id,
          order_number: order.order_number,
          customer_id: order.customer_id,
          offer_id: line.offer_id,
          product_variant_id: line.product_variant_id,
          quantity: line.quantity,
          unit_price_snapshot: line.unit_price_snapshot,
          product_name: product.product_name || "—",
          variant_name: product.variant_name,
          sku: product.sku,
          tracking_url: buildTrackingUrl(
            ret.carrier,
            ret.tracking_code,
            ret.tracking_url
          ),
          refund_status:
            normalizeRefundStatus(ret.refund_status) ?? ret.refund_status,
        })
      }
    }
  }

  res.json({ returns })
}

/** Seller initiates a return for an own order line. */
export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const seller = await resolveApprovedSeller(
    req.scope,
    req.auth_context.actor_id
  )
  const body = (req.body ?? {}) as {
    order_line_id?: string
    reason?: string
  }
  const order_line_id =
    typeof body.order_line_id === "string" ? body.order_line_id.trim() : ""
  const reason = typeof body.reason === "string" ? body.reason.trim() : ""

  if (!order_line_id || !reason) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "order_line_id en reason zijn verplicht."
    )
  }

  const result = await executeSellerCreateReturn(req.scope, {
    seller_id: seller.id,
    order_line_id,
    reason,
  })

  res.status(201).json(result)
}
