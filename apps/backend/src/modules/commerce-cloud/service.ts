import {
  InjectManager,
  InjectTransactionManager,
  MedusaContext,
  MedusaService,
} from "@medusajs/framework/utils"
import type { Context } from "@medusajs/framework/types"
import { Offer, OfferInventory, OfferPrice } from "./models"

export type UpsertOfferGraphInput = {
  seller_id: string
  identifier_id: string
  region_code: string
  quantity_available: number
  base_price: number
  shipping_cost: number
  vat_rate: number
}

export type UpsertOfferGraphResult = {
  offer_id: string
  inventory_id: string
  price_id: string
  created: boolean
}

/**
 * Commerce Cloud — Blueprint Deel C + ADR-0014/0015.
 */
class CommerceCloudModuleService extends MedusaService({
  Offer,
  OfferInventory,
  OfferPrice,
}) {
  @InjectManager()
  async upsertOfferGraph(
    input: UpsertOfferGraphInput,
    @MedusaContext() sharedContext: Context = {}
  ): Promise<UpsertOfferGraphResult> {
    return await this.upsertOfferGraph_(input, sharedContext)
  }

  @InjectTransactionManager()
  protected async upsertOfferGraph_(
    input: UpsertOfferGraphInput,
    @MedusaContext() sharedContext: Context = {}
  ): Promise<UpsertOfferGraphResult> {
    const existing = await this.listOffers(
      {
        seller_id: input.seller_id,
        identifier_id: input.identifier_id,
        region_code: input.region_code,
      },
      {},
      sharedContext
    )

    if (existing.length > 0) {
      const offer = existing[0]
      const inventories = await this.listOfferInventories(
        { offer_id: offer.id },
        {},
        sharedContext
      )
      const prices = await this.listOfferPrices(
        { offer_id: offer.id },
        {},
        sharedContext
      )

      let inventory_id = inventories[0]?.id
      if (inventory_id) {
        await this.updateOfferInventories(
          {
            id: inventory_id,
            quantity_available: input.quantity_available,
          },
          sharedContext
        )
      } else {
        const inv = await this.createOfferInventories(
          {
            offer_id: offer.id,
            quantity_available: input.quantity_available,
          },
          sharedContext
        )
        inventory_id = inv.id
      }

      let price_id = prices[0]?.id
      if (price_id) {
        await this.updateOfferPrices(
          {
            id: price_id,
            base_price: input.base_price,
            shipping_cost: input.shipping_cost,
            vat_rate: input.vat_rate,
          },
          sharedContext
        )
      } else {
        const price = await this.createOfferPrices(
          {
            offer_id: offer.id,
            base_price: input.base_price,
            shipping_cost: input.shipping_cost,
            vat_rate: input.vat_rate,
          },
          sharedContext
        )
        price_id = price.id
      }

      return {
        offer_id: offer.id,
        inventory_id,
        price_id,
        created: false,
      }
    }

    const offer = await this.createOffers(
      {
        seller_id: input.seller_id,
        identifier_id: input.identifier_id,
        region_code: input.region_code,
      },
      sharedContext
    )

    const inventory = await this.createOfferInventories(
      {
        offer_id: offer.id,
        quantity_available: input.quantity_available,
      },
      sharedContext
    )

    const price = await this.createOfferPrices(
      {
        offer_id: offer.id,
        base_price: input.base_price,
        shipping_cost: input.shipping_cost,
        vat_rate: input.vat_rate,
      },
      sharedContext
    )

    return {
      offer_id: offer.id,
      inventory_id: inventory.id,
      price_id: price.id,
      created: true,
    }
  }
}

export default CommerceCloudModuleService
