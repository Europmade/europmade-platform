import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import type { ICustomerModuleService } from "@medusajs/framework/types"
import { MedusaError } from "@medusajs/framework/utils"
import { buildTrackingUrl } from "@europmade/utils"
import { ORDER_MODULE } from "../../../../../modules/order-service"
import type OrderServiceModuleService from "../../../../../modules/order-service/service"
import { normalizeRefundStatus } from "../../../../../modules/order-service/refund-service"
import { resolveOrderLineProductInfo } from "../../../../store/order-service/resolve-line-product"
import { resolveSellerDisplayName } from "../../admin-order-helpers"

type RouteParams = { id: string }

function moneyNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string" && value.trim() !== "") return Number(value) || 0
  if (value && typeof value === "object" && "numeric" in value) {
    return Number((value as { numeric: string }).numeric) || 0
  }
  return Number(value) || 0
}

/** Admin: retourdetail (read-only) + gekoppelde order/seller/product. */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const { id } = req.params as RouteParams
  const orders = req.scope.resolve(ORDER_MODULE) as OrderServiceModuleService

  let ret
  try {
    ret = await orders.retrieveEmReturn(id)
  } catch {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, `Retour ${id} niet gevonden`)
  }

  const line = await orders.retrieveOrderLine(ret.order_line_id)
  const order = await orders.retrieveEmOrder(line.order_id)
  const product = await resolveOrderLineProductInfo(req.scope, {
    offer_id: line.offer_id,
    product_variant_id: line.product_variant_id,
  })
  const seller = await resolveSellerDisplayName(req.scope, order.seller_id)

  let customer_name: string | null = null
  let customer_email: string | null = null
  try {
    const customers = req.scope.resolve(Modules.CUSTOMER) as ICustomerModuleService
    const customer = await customers.retrieveCustomer(order.customer_id)
    customer_email = customer.email ?? null
    customer_name =
      [customer.first_name, customer.last_name].filter(Boolean).join(" ").trim() ||
      null
  } catch {
    // keep null
  }

  const unit = moneyNumber(line.unit_price_snapshot)

  res.json({
    return: {
      ...ret,
      refund_status:
        normalizeRefundStatus(ret.refund_status) ?? ret.refund_status,
      tracking_url: buildTrackingUrl(
        ret.carrier,
        ret.tracking_code,
        ret.tracking_url
      ),
    },
    order: {
      id: order.id,
      order_number: order.order_number,
      payment_status: order.payment_status,
      created_at: order.created_at,
      customer_id: order.customer_id,
      seller_id: order.seller_id,
    },
    customer: {
      id: order.customer_id,
      name: customer_name,
      email: customer_email,
    },
    seller: {
      id: seller.seller_id,
      name: seller.seller_name,
      onboarding_status: seller.onboarding_status,
    },
    line: {
      id: line.id,
      offer_id: line.offer_id,
      quantity: line.quantity,
      unit_price: unit,
      line_total: Math.round(unit * line.quantity * 100) / 100,
      product_name: product.product_name || "—",
      variant_name: product.variant_name,
      sku: product.sku,
      product_id: product.product_id,
    },
    force_refund_available: ["Geëscaleerd", "Ontvangen", "Verwerkt"].includes(
      String(ret.status)
    ),
  })
}
