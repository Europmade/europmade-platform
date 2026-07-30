import {
  InjectManager,
  InjectTransactionManager,
  MedusaContext,
  MedusaService,
} from "@medusajs/framework/utils"
import type { Context } from "@medusajs/framework/types"
import {
  Offer,
  OfferInventory,
  OfferPrice,
  BuyBoxComputation,
  BuyBoxWeighting,
} from "./models"
import {
  computeBuyBoxRanking,
  DEFAULT_BUY_BOX_WEIGHTS,
  type BuyBoxComputationResult,
  type BuyBoxOfferInput,
  type BuyBoxWeights,
} from "./buy-box-engine"

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

export type PersistBuyBoxInput = {
  identifier_id: string
  region_code: string
  winning_offer_id: string
  computed_at: Date
}

/**
 * Commerce Cloud — Blueprint Deel C + Buy Box-engine (S3-04-02).
 */
class CommerceCloudModuleService extends MedusaService({
  Offer,
  OfferInventory,
  OfferPrice,
  BuyBoxComputation,
  BuyBoxWeighting,
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

  @InjectManager()
  async getActiveBuyBoxWeights(
    @MedusaContext() sharedContext: Context = {}
  ): Promise<BuyBoxWeights> {
    const rows = await this.listBuyBoxWeightings({}, {}, sharedContext)
    if (rows.length === 0) {
      return { ...DEFAULT_BUY_BOX_WEIGHTS }
    }
    const w = rows[0]
    return {
      price: Number(w.price),
      delivery: Number(w.delivery),
      seller_review: Number(w.seller_review),
      stock: Number(w.stock),
      performance: Number(w.performance),
      returns: Number(w.returns),
    }
  }

  @InjectManager()
  async buildBuyBoxOfferInputs(
    identifier_id: string,
    region_code: string,
    sellerTenureById: Record<string, number | null>,
    @MedusaContext() sharedContext: Context = {}
  ): Promise<BuyBoxOfferInput[]> {
    const offers = await this.listOffers(
      { identifier_id, region_code },
      {},
      sharedContext
    )
    const inputs: BuyBoxOfferInput[] = []
    for (const offer of offers) {
      const [inventory] = await this.listOfferInventories(
        { offer_id: offer.id },
        {},
        sharedContext
      )
      const [price] = await this.listOfferPrices(
        { offer_id: offer.id },
        {},
        sharedContext
      )
      if (!inventory || !price) continue
      inputs.push({
        offer_id: offer.id,
        seller_id: offer.seller_id,
        quantity_available: Number(inventory.quantity_available),
        base_price: Number(price.base_price),
        shipping_cost: Number(price.shipping_cost),
        seller_tenure_at_ms: sellerTenureById[offer.seller_id] ?? null,
      })
    }
    return inputs
  }

  @InjectManager()
  async persistBuyBoxComputation(
    input: PersistBuyBoxInput,
    @MedusaContext() sharedContext: Context = {}
  ): Promise<{ id: string }> {
    return await this.persistBuyBoxComputation_(input, sharedContext)
  }

  @InjectTransactionManager()
  protected async persistBuyBoxComputation_(
    input: PersistBuyBoxInput,
    @MedusaContext() sharedContext: Context = {}
  ): Promise<{ id: string }> {
    const existing = await this.listBuyBoxComputations(
      {
        identifier_id: input.identifier_id,
        region_code: input.region_code,
      },
      {},
      sharedContext
    )
    if (existing.length > 0) {
      await this.updateBuyBoxComputations(
        {
          id: existing[0].id,
          winning_offer_id: input.winning_offer_id,
          computed_at: input.computed_at,
        },
        sharedContext
      )
      return { id: existing[0].id }
    }
    const created = await this.createBuyBoxComputations(
      {
        identifier_id: input.identifier_id,
        region_code: input.region_code,
        winning_offer_id: input.winning_offer_id,
        computed_at: input.computed_at,
      },
      sharedContext
    )
    return { id: created.id }
  }

  @InjectManager()
  async clearBuyBoxComputation(
    identifier_id: string,
    region_code: string,
    @MedusaContext() sharedContext: Context = {}
  ): Promise<void> {
    return await this.clearBuyBoxComputation_(
      identifier_id,
      region_code,
      sharedContext
    )
  }

  @InjectTransactionManager()
  protected async clearBuyBoxComputation_(
    identifier_id: string,
    region_code: string,
    @MedusaContext() sharedContext: Context = {}
  ): Promise<void> {
    const existing = await this.listBuyBoxComputations(
      { identifier_id, region_code },
      {},
      sharedContext
    )
    if (existing.length === 0) return
    await this.deleteBuyBoxComputations(
      existing.map((r) => r.id),
      sharedContext
    )
  }

  async rankOffers(
    identifier_id: string,
    region_code: string,
    offers: BuyBoxOfferInput[],
    weights: BuyBoxWeights
  ): Promise<BuyBoxComputationResult> {
    return computeBuyBoxRanking({
      identifier_id,
      region_code,
      offers,
      weights,
    })
  }
}

export default CommerceCloudModuleService
