import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
} from "@medusajs/framework/utils"
import type { MedusaContainer } from "@medusajs/framework/types"
import { ORDER_MODULE } from "../../modules/order-service"
import type OrderServiceModuleService from "../../modules/order-service/service"
import { COMMERCE_CLOUD_MODULE } from "../../modules/commerce-cloud"
import type CommerceCloudModuleService from "../../modules/commerce-cloud/service"
import { PRODUCT_CLOUD_MODULE } from "../../modules/product-cloud"
import type ProductCloudModuleService from "../../modules/product-cloud/service"
import { executeRecomputeBuyBox } from "../commerce-cloud/recompute-buy-box"

export type CheckoutLineInput = {
  offer_id: string
  quantity: number
}

export type PlaceOrderInput = {
  customer_id: string
  payment_reference: string
  payment_mode: "simulated" | "stripe"
  shipping_address: string
  billing_address: string
  lines: CheckoutLineInput[]
}

export type PlaceOrderResult = {
  order_set_id: string
  payment_reference: string
  created: boolean
  orders: Array<{
    order_id: string
    order_number: string
    seller_id: string
    line_ids: string[]
  }>
}

export type RevalidatedLine = {
  offer_id: string
  seller_id: string
  identifier_id: string
  product_variant_id: string
  quantity: number
  quantity_available: number
  unit_price: number
  shipping_cost: number
  vat_rate: number
  total_unit_price: number
  region_code: string
}

function assertSimulatedPaymentAllowed(payment_mode: string) {
  if (payment_mode !== "simulated") {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Alleen payment_mode=simulated is beschikbaar tot Stripe-provider is geconfigureerd (ADR-0018/0021)."
    )
  }
  if (process.env.NODE_ENV === "production") {
    const allow = process.env.ALLOW_SIMULATED_PAYMENT === "true"
    if (!allow) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "Gesimuleerde betaling is in productie uitgeschakeld."
      )
    }
  }
}

export async function revalidateCheckoutLines(
  container: MedusaContainer,
  lines: CheckoutLineInput[]
): Promise<RevalidatedLine[]> {
  const commerce = container.resolve(
    COMMERCE_CLOUD_MODULE
  ) as CommerceCloudModuleService
  const productCloud = container.resolve(
    PRODUCT_CLOUD_MODULE
  ) as ProductCloudModuleService

  if (lines.length === 0) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Geen checkout-regels."
    )
  }

  const result: RevalidatedLine[] = []
  for (const line of lines) {
    if (!Number.isInteger(line.quantity) || line.quantity <= 0) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Ongeldige quantity voor offer ${line.offer_id}.`
      )
    }
    let offer
    try {
      offer = await commerce.retrieveOffer(line.offer_id)
    } catch {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Offer ${line.offer_id} bestaat niet.`
      )
    }
    const [inventory] = await commerce.listOfferInventories({
      offer_id: offer.id,
    })
    const [price] = await commerce.listOfferPrices({ offer_id: offer.id })
    if (!inventory || !price) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Offer ${offer.id} mist prijs of voorraad.`
      )
    }
    const available = Number(inventory.quantity_available)
    if (available < line.quantity) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Onvoldoende voorraad voor offer ${offer.id} (beschikbaar: ${available}).`
      )
    }

    const identifier = await productCloud.retrieveIdentifier(
      offer.identifier_id
    )

    const unit = Number(price.base_price)
    const shipping = Number(price.shipping_cost)
    result.push({
      offer_id: offer.id,
      seller_id: offer.seller_id,
      identifier_id: offer.identifier_id,
      product_variant_id: identifier.product_variant_id,
      quantity: line.quantity,
      quantity_available: available,
      unit_price: unit,
      shipping_cost: shipping,
      vat_rate: Number(price.vat_rate),
      total_unit_price: unit + shipping,
      region_code: offer.region_code,
    })
  }
  return result
}

async function emitOrderEvent(
  container: MedusaContainer,
  name: "OrderPlaced" | "OrderSplit" | "OrderSplitFailed" | "OrderExceptionResolved",
  data: Record<string, unknown>
) {
  const eventBus = container.resolve(Modules.EVENT_BUS)
  await eventBus.emit({ name, data })
}

export async function executePlaceOrder(
  container: MedusaContainer,
  input: PlaceOrderInput
): Promise<PlaceOrderResult> {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const orders = container.resolve(ORDER_MODULE) as OrderServiceModuleService
  const commerce = container.resolve(
    COMMERCE_CLOUD_MODULE
  ) as CommerceCloudModuleService

  assertSimulatedPaymentAllowed(input.payment_mode)

  const payment_reference = input.payment_reference.trim()
  if (!payment_reference) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "payment_reference is verplicht (idempotentiesleutel)."
    )
  }

  const existing = await orders.findOrderSetByPaymentReference(
    payment_reference
  )
  if (existing) {
    const graph = await orders.placeOrderGraph({
      customer_id: input.customer_id,
      payment_reference,
      shipping_address: input.shipping_address,
      billing_address: input.billing_address,
      lines: [
        {
          offer_id: "_idempotent_",
          product_variant_id: "_idempotent_",
          seller_id: "_idempotent_",
          quantity: 1,
          unit_price_snapshot: 0,
          vat_rate_snapshot: 0,
        },
      ],
    })
    return {
      order_set_id: graph.order_set_id,
      payment_reference: graph.payment_reference,
      created: false,
      orders: graph.orders,
    }
  }

  const validated = await revalidateCheckoutLines(container, input.lines)

  // Snapshot unit price = base only; shipping aggregated per seller in totals later.
  // Blueprint line snapshot is unit_price + vat; shipping is offer-level — we store
  // unit_price_snapshot as base+shipping per unit equivalent for Buy Box parity
  // (total customer price at place time).
  const graphLines = validated.map((v) => ({
    offer_id: v.offer_id,
    product_variant_id: v.product_variant_id,
    seller_id: v.seller_id,
    quantity: v.quantity,
    unit_price_snapshot: v.total_unit_price,
    vat_rate_snapshot: v.vat_rate,
  }))

  let placed
  try {
    placed = await orders.placeOrderGraph({
      customer_id: input.customer_id,
      payment_reference,
      shipping_address: input.shipping_address.trim(),
      billing_address: input.billing_address.trim(),
      lines: graphLines,
    })
  } catch (err) {
    logger.error(`[order] placeOrderGraph failed: ${String(err)}`)
    throw err
  }

  if (!placed.created) {
    return {
      order_set_id: placed.order_set_id,
      payment_reference: placed.payment_reference,
      created: false,
      orders: placed.orders,
    }
  }

  try {
    for (const v of validated) {
      const [inventory] = await commerce.listOfferInventories({
        offer_id: v.offer_id,
      })
      if (!inventory) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `Inventory ontbreekt voor ${v.offer_id}`
        )
      }
      const nextQty = Number(inventory.quantity_available) - v.quantity
      await commerce.updateOfferInventories({
        id: inventory.id,
        quantity_available: nextQty,
      })
    }
  } catch (err) {
    await orders.markOrdersSplitFailed(
      placed.orders.map((o) => o.order_id),
      `Voorraadreserve mislukt: ${String(err)}`
    )
    await emitOrderEvent(container, "OrderSplitFailed", {
      order_set_id: placed.order_set_id,
      payment_reference,
      order_ids: placed.orders.map((o) => o.order_id),
      reason: String(err),
    })
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "Ordersplitsing mislukt tijdens voorraadreserve. Geen automatische refund (OMC)."
    )
  }

  await emitOrderEvent(container, "OrderPlaced", {
    order_set_id: placed.order_set_id,
    customer_id: input.customer_id,
    payment_reference,
  })

  for (const order of placed.orders) {
    await emitOrderEvent(container, "OrderSplit", {
      order_id: order.order_id,
      order_set_id: placed.order_set_id,
      seller_id: order.seller_id,
      order_number: order.order_number,
      line_ids: order.line_ids,
    })
  }

  // Buy Box herberekenen per geraakte identifier
  const identifiers = [...new Set(validated.map((v) => v.identifier_id))]
  const regions = [...new Set(validated.map((v) => v.region_code))]
  try {
    for (const identifier_id of identifiers) {
      for (const region_code of regions) {
        await executeRecomputeBuyBox(container, {
          identifier_id,
          region_code,
        })
      }
    }
  } catch (err) {
    logger.warn(`[order] Buy Box recompute after place: ${String(err)}`)
  }

  logger.info(
    `[audit] OrderPlaced set=${placed.order_set_id} payment=${payment_reference} orders=${placed.orders.length}`
  )

  try {
    const cart = await orders.resolveOrCreateCart({
      customer_id: input.customer_id,
      guest_token: null,
    })
    await orders.clearCartLines(cart.id)
  } catch (err) {
    logger.warn(`[order] clear cart after place: ${String(err)}`)
  }

  return {
    order_set_id: placed.order_set_id,
    payment_reference: placed.payment_reference,
    created: true,
    orders: placed.orders,
  }
}

export const placeOrderStep = createStep(
  "place-order",
  async (input: PlaceOrderInput, { container }) => {
    const result = await executePlaceOrder(container, input)
    return new StepResponse(result)
  }
)

export const placeOrderWorkflow = createWorkflow(
  "place-order",
  (input: PlaceOrderInput) => {
    const result = placeOrderStep(input)
    return new WorkflowResponse(result)
  }
)

export type ResolveExceptionInput = {
  order_id: string
  reason: string
}

export const resolveOrderExceptionStep = createStep(
  "resolve-order-exception",
  async (input: ResolveExceptionInput, { container }) => {
    const orders = container.resolve(ORDER_MODULE) as OrderServiceModuleService
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
    if (!input.reason.trim()) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "reason is verplicht bij uitzonderingsafhandeling."
      )
    }
    const result = await orders.resolveOrderException(
      input.order_id,
      input.reason.trim()
    )
    await emitOrderEvent(container, "OrderExceptionResolved", {
      order_id: result.id,
      exception_status: result.exception_status,
      reason: input.reason.trim(),
    })
    logger.info(
      `[audit] OrderExceptionResolved order=${result.id} reason=${input.reason.trim()}`
    )
    return new StepResponse(result)
  }
)

export const resolveOrderExceptionWorkflow = createWorkflow(
  "resolve-order-exception",
  (input: ResolveExceptionInput) => {
    const result = resolveOrderExceptionStep(input)
    return new WorkflowResponse(result)
  }
)
