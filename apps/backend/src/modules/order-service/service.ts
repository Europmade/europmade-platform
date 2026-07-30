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
 * Order-service — Blueprint Deel D + G.9 (ADR-0021).
 */
class OrderServiceModuleService extends MedusaService({
  OrderSet,
  EmOrder,
  OrderLine,
  Shipment,
  EmReturn,
  OrderMessage,
}) {
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
}

export default OrderServiceModuleService
