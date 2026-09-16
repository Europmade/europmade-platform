import {
  InjectManager,
  InjectTransactionManager,
  MedusaContext,
  MedusaError,
  MedusaService,
} from "@medusajs/framework/utils"
import type { Context } from "@medusajs/framework/types"
import {
  OrderSet,
  EmOrder,
  OrderLine,
  Shipment,
  EmReturn,
  OrderMessage,
  OrderConversationRead,
  EmConversation,
  OrderMessageAttachment,
  OrderDocument,
  Cart,
  CartLine,
} from "./models"

export type PlaceOrderLineInput = {
  offer_id: string
  product_variant_id: string
  seller_id: string
  quantity: number
  unit_price_snapshot: number
  vat_rate_snapshot: number
}

export type PlaceOrderGraphInput = {
  customer_id: string
  payment_reference: string
  shipping_address: string
  billing_address: string
  /** ISO-2 destination country for OSS VAT. */
  shipping_country_code?: string | null
  lines: PlaceOrderLineInput[]
}

export type PlaceOrderGraphResult = {
  order_set_id: string
  payment_reference: string
  orders: Array<{
    order_id: string
    order_number: string
    seller_id: string
    line_ids: string[]
  }>
  created: boolean
}

/**
 * Order-service — Blueprint Deel D + G.9 (ADR-0021) + cart (ADR-0022).
 */
class OrderServiceModuleService extends MedusaService({
  OrderSet,
  EmOrder,
  OrderLine,
  Shipment,
  EmReturn,
  OrderMessage,
  OrderConversationRead,
  EmConversation,
  OrderMessageAttachment,
  OrderDocument,
  Cart,
  CartLine,
}) {
  /**
   * Mark conversation as read for a participant (idempotent).
   * Does not encode waiting/resolved action status — read only.
   */
  @InjectManager()
  async markConversationRead(
    participant_customer_id: string,
    conversation_id: string,
    @MedusaContext() sharedContext: Context = {}
  ) {
    const participant = participant_customer_id.trim()
    const conversation = conversation_id.trim()
    if (!participant || !conversation) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "participant_customer_id en conversation_id zijn verplicht."
      )
    }

    const existing = await this.listOrderConversationReads(
      {
        participant_customer_id: participant,
        conversation_id: conversation,
      },
      {},
      sharedContext
    )

    if (existing[0]) {
      return this.updateOrderConversationReads(
        {
          id: existing[0].id,
          read_at: new Date(),
        },
        sharedContext
      )
    }

    return this.createOrderConversationReads(
      {
        participant_customer_id: participant,
        conversation_id: conversation,
        read_at: new Date(),
      },
      sharedContext
    )
  }

  @InjectManager()
  async listConversationReadsForParticipant(
    participant_customer_id: string,
    @MedusaContext() sharedContext: Context = {}
  ) {
    return this.listOrderConversationReads(
      { participant_customer_id: participant_customer_id.trim() },
      {},
      sharedContext
    )
  }

  @InjectManager()
  async findOrderSetByPaymentReference(
    payment_reference: string,
    @MedusaContext() sharedContext: Context = {}
  ): Promise<{ id: string } | null> {
    const rows = await this.listOrderSets(
      { payment_reference },
      {},
      sharedContext
    )
    if (rows.length === 0) return null
    return { id: rows[0].id }
  }

  @InjectManager()
  async placeOrderGraph(
    input: PlaceOrderGraphInput,
    @MedusaContext() sharedContext: Context = {}
  ): Promise<PlaceOrderGraphResult> {
    return await this.placeOrderGraph_(input, sharedContext)
  }

  @InjectTransactionManager()
  protected async placeOrderGraph_(
    input: PlaceOrderGraphInput,
    @MedusaContext() sharedContext: Context = {}
  ): Promise<PlaceOrderGraphResult> {
    const existing = await this.listOrderSets(
      { payment_reference: input.payment_reference },
      {},
      sharedContext
    )
    if (existing.length > 0) {
      const orders = await this.listEmOrders(
        { order_set_id: existing[0].id },
        {},
        sharedContext
      )
      const mapped = []
      for (const order of orders) {
        const lines = await this.listOrderLines(
          { order_id: order.id },
          {},
          sharedContext
        )
        mapped.push({
          order_id: order.id,
          order_number: order.order_number,
          seller_id: order.seller_id,
          line_ids: lines.map((l) => l.id),
        })
      }
      return {
        order_set_id: existing[0].id,
        payment_reference: input.payment_reference,
        orders: mapped,
        created: false,
      }
    }

    if (input.lines.length === 0) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Checkout vereist minstens één orderregel."
      )
    }

    const orderSet = await this.createOrderSets(
      {
        customer_id: input.customer_id,
        payment_reference: input.payment_reference,
      },
      sharedContext
    )

    const bySeller = new Map<string, PlaceOrderLineInput[]>()
    for (const line of input.lines) {
      const bucket = bySeller.get(line.seller_id) ?? []
      bucket.push(line)
      bySeller.set(line.seller_id, bucket)
    }

    const mapped = []
    let seq = 1
    for (const [seller_id, sellerLines] of bySeller) {
      const order_number = `${input.payment_reference}-${String(seq).padStart(2, "0")}`
      seq += 1
      const order = await this.createEmOrders(
        {
          order_number,
          order_set_id: orderSet.id,
          customer_id: input.customer_id,
          seller_id,
          payment_status: "Betaald",
          exception_status: null,
          shipping_address: input.shipping_address,
          billing_address: input.billing_address,
          shipping_country_code: input.shipping_country_code ?? null,
          exception_reason: null,
        },
        sharedContext
      )

      const line_ids: string[] = []
      for (const line of sellerLines) {
        const created = await this.createOrderLines(
          {
            order_id: order.id,
            product_variant_id: line.product_variant_id,
            offer_id: line.offer_id,
            quantity: line.quantity,
            unit_price_snapshot: line.unit_price_snapshot,
            vat_rate_snapshot: line.vat_rate_snapshot,
          },
          sharedContext
        )
        line_ids.push(created.id)
      }

      mapped.push({
        order_id: order.id,
        order_number,
        seller_id,
        line_ids,
      })
    }

    return {
      order_set_id: orderSet.id,
      payment_reference: input.payment_reference,
      orders: mapped,
      created: true,
    }
  }

  @InjectManager()
  async markOrdersSplitFailed(
    orderIds: string[],
    reason: string,
    @MedusaContext() sharedContext: Context = {}
  ): Promise<void> {
    return await this.markOrdersSplitFailed_(orderIds, reason, sharedContext)
  }

  @InjectTransactionManager()
  protected async markOrdersSplitFailed_(
    orderIds: string[],
    reason: string,
    @MedusaContext() sharedContext: Context = {}
  ): Promise<void> {
    for (const id of orderIds) {
      await this.updateEmOrders(
        {
          id,
          exception_status: "Mislukte ordersplitsing",
          exception_reason: reason,
        },
        sharedContext
      )
    }
  }

  @InjectManager()
  async resolveOrderException(
    orderId: string,
    reason: string,
    @MedusaContext() sharedContext: Context = {}
  ): Promise<{ id: string; exception_status: string }> {
    return await this.resolveOrderException_(orderId, reason, sharedContext)
  }

  @InjectTransactionManager()
  protected async resolveOrderException_(
    orderId: string,
    reason: string,
    @MedusaContext() sharedContext: Context = {}
  ): Promise<{ id: string; exception_status: string }> {
    const order = await this.retrieveEmOrder(orderId, {}, sharedContext)
    if (order.exception_status !== "Mislukte ordersplitsing") {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Alleen orders met uitzondering 'Mislukte ordersplitsing' kunnen worden afgehandeld."
      )
    }
    await this.updateEmOrders(
      {
        id: orderId,
        exception_status: "Afgehandeld",
        exception_reason: reason,
      },
      sharedContext
    )
    return { id: orderId, exception_status: "Afgehandeld" }
  }

  @InjectManager()
  async resolveOrCreateCart(input: {
    customer_id?: string | null
    guest_token?: string | null
  }, @MedusaContext() sharedContext: Context = {}): Promise<{ id: string }> {
    return await this.resolveOrCreateCart_(input, sharedContext)
  }

  @InjectTransactionManager()
  protected async resolveOrCreateCart_(
    input: { customer_id?: string | null; guest_token?: string | null },
    @MedusaContext() sharedContext: Context = {}
  ): Promise<{ id: string }> {
    if (input.customer_id) {
      const existing = await this.listCarts(
        { customer_id: input.customer_id },
        {},
        sharedContext
      )
      if (existing.length > 0) return { id: existing[0].id }
      const created = await this.createCarts(
        { customer_id: input.customer_id, guest_token: null },
        sharedContext
      )
      return { id: created.id }
    }
    if (input.guest_token) {
      const existing = await this.listCarts(
        { guest_token: input.guest_token },
        {},
        sharedContext
      )
      if (existing.length > 0) return { id: existing[0].id }
      const created = await this.createCarts(
        { customer_id: null, guest_token: input.guest_token },
        sharedContext
      )
      return { id: created.id }
    }
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "customer_id of guest_token is verplicht."
    )
  }

  @InjectManager()
  async upsertCartLine(input: {
    cart_id: string
    offer_id: string
    quantity: number
  }, @MedusaContext() sharedContext: Context = {}): Promise<{ id: string; quantity: number }> {
    return await this.upsertCartLine_(input, sharedContext)
  }

  @InjectTransactionManager()
  protected async upsertCartLine_(
    input: { cart_id: string; offer_id: string; quantity: number },
    @MedusaContext() sharedContext: Context = {}
  ): Promise<{ id: string; quantity: number }> {
    if (!Number.isInteger(input.quantity) || input.quantity < 1) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "quantity moet ≥ 1 zijn."
      )
    }
    const existing = await this.listCartLines(
      { cart_id: input.cart_id, offer_id: input.offer_id },
      {},
      sharedContext
    )
    if (existing.length > 0) {
      await this.updateCartLines(
        { id: existing[0].id, quantity: input.quantity },
        sharedContext
      )
      return { id: existing[0].id, quantity: input.quantity }
    }
    const created = await this.createCartLines(
      {
        cart_id: input.cart_id,
        offer_id: input.offer_id,
        quantity: input.quantity,
      },
      sharedContext
    )
    return { id: created.id, quantity: input.quantity }
  }

  @InjectManager()
  async clearCartLines(
    cartId: string,
    @MedusaContext() sharedContext: Context = {}
  ): Promise<void> {
    return await this.clearCartLines_(cartId, sharedContext)
  }

  @InjectTransactionManager()
  protected async clearCartLines_(
    cartId: string,
    @MedusaContext() sharedContext: Context = {}
  ): Promise<void> {
    const lines = await this.listCartLines({ cart_id: cartId }, {}, sharedContext)
    if (lines.length === 0) return
    await this.softDeleteCartLines(
      lines.map((l) => l.id),
      sharedContext
    )
  }

  /**
   * ADR-0022 / winkelwagen §5A — guest → customer merge (som qty per offer).
   * Voorraadclipping gebeurt in de HTTP-laag via revalidateCheckoutLines.
   */
  @InjectManager()
  async mergeGuestCartIntoCustomer(
    input: { customer_id: string; guest_token: string },
    @MedusaContext() sharedContext: Context = {}
  ): Promise<{
    customer_cart_id: string
    merged_lines: Array<{ offer_id: string; quantity: number }>
  }> {
    return await this.mergeGuestCartIntoCustomer_(input, sharedContext)
  }

  @InjectTransactionManager()
  protected async mergeGuestCartIntoCustomer_(
    input: { customer_id: string; guest_token: string },
    @MedusaContext() sharedContext: Context = {}
  ): Promise<{
    customer_cart_id: string
    merged_lines: Array<{ offer_id: string; quantity: number }>
  }> {
    const guestCarts = await this.listCarts(
      { guest_token: input.guest_token },
      {},
      sharedContext
    )
    const customerCart = await this.resolveOrCreateCart_(
      { customer_id: input.customer_id, guest_token: null },
      sharedContext
    )

    if (guestCarts.length === 0) {
      const lines = await this.listCartLines(
        { cart_id: customerCart.id },
        {},
        sharedContext
      )
      return {
        customer_cart_id: customerCart.id,
        merged_lines: lines.map((l) => ({
          offer_id: l.offer_id,
          quantity: Number(l.quantity),
        })),
      }
    }

    const guestCart = guestCarts[0]
    if (guestCart.id === customerCart.id) {
      return {
        customer_cart_id: customerCart.id,
        merged_lines: (
          await this.listCartLines(
            { cart_id: customerCart.id },
            {},
            sharedContext
          )
        ).map((l) => ({
          offer_id: l.offer_id,
          quantity: Number(l.quantity),
        })),
      }
    }

    const guestLines = await this.listCartLines(
      { cart_id: guestCart.id },
      {},
      sharedContext
    )
    const customerLines = await this.listCartLines(
      { cart_id: customerCart.id },
      {},
      sharedContext
    )
    const qtyByOffer = new Map<string, number>()
    for (const l of customerLines) {
      qtyByOffer.set(l.offer_id, Number(l.quantity))
    }
    for (const l of guestLines) {
      const prev = qtyByOffer.get(l.offer_id) ?? 0
      qtyByOffer.set(l.offer_id, prev + Number(l.quantity))
    }

    const merged_lines: Array<{ offer_id: string; quantity: number }> = []
    for (const [offer_id, quantity] of qtyByOffer) {
      merged_lines.push({ offer_id, quantity })
      await this.upsertCartLine_(
        { cart_id: customerCart.id, offer_id, quantity },
        sharedContext
      )
    }

    await this.clearCartLines_(guestCart.id, sharedContext)
    await this.softDeleteCarts([guestCart.id], sharedContext)

    return { customer_cart_id: customerCart.id, merged_lines }
  }

  @InjectManager()
  async claimGuestOrderSet(
    input: {
      payment_reference: string
      guest_customer_id: string
      customer_id: string
    },
    @MedusaContext() sharedContext: Context = {}
  ): Promise<{ claimed: boolean; order_set_id: string | null }> {
    return await this.claimGuestOrderSet_(input, sharedContext)
  }

  @InjectTransactionManager()
  protected async claimGuestOrderSet_(
    input: {
      payment_reference: string
      guest_customer_id: string
      customer_id: string
    },
    @MedusaContext() sharedContext: Context = {}
  ): Promise<{ claimed: boolean; order_set_id: string | null }> {
    const orderSets = await this.listOrderSets(
      {
        payment_reference: input.payment_reference,
        customer_id: input.guest_customer_id,
      },
      {},
      sharedContext
    )
    if (orderSets.length === 0) {
      return { claimed: false, order_set_id: null }
    }

    const orderSet = orderSets[0]
    await this.updateOrderSets(
      {
        id: orderSet.id,
        customer_id: input.customer_id,
      },
      sharedContext
    )

    const orders = await this.listEmOrders(
      {
        order_set_id: orderSet.id,
        customer_id: input.guest_customer_id,
      },
      {},
      sharedContext
    )
    for (const order of orders) {
      await this.updateEmOrders(
        {
          id: order.id,
          customer_id: input.customer_id,
        },
        sharedContext
      )
    }

    return { claimed: true, order_set_id: orderSet.id }
  }
}

export default OrderServiceModuleService
