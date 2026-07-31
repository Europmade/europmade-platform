import {
  InjectManager,
  InjectTransactionManager,
  MedusaContext,
  MedusaError,
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
  inventory_changed: boolean
  price_changed: boolean
  previous_quantity_available: number | null
  previous_base_price: number | null
  previous_shipping_cost: number | null
  previous_vat_rate: number | null
}

export type PatchOfferGraphInput = {
  offer_id: string
  quantity_available?: number
  base_price?: number
  shipping_cost?: number
  vat_rate?: number
}

export type WithdrawOfferResult = {
  offer_id: string
  identifier_id: string
  region_code: string
  seller_id: string
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

      const previous_quantity_available =
        inventories[0] != null
          ? Number(inventories[0].quantity_available)
          : null
      const previous_base_price =
        prices[0] != null ? Number(prices[0].base_price) : null
      const previous_shipping_cost =
        prices[0] != null ? Number(prices[0].shipping_cost) : null
      const previous_vat_rate =
        prices[0] != null ? Number(prices[0].vat_rate) : null

      let inventory_id = inventories[0]?.id
      let inventory_changed = false
      if (inventory_id) {
        inventory_changed =
          previous_quantity_available !== input.quantity_available
        if (inventory_changed) {
          await this.updateOfferInventories(
            {
              id: inventory_id,
              quantity_available: input.quantity_available,
            },
            sharedContext
          )
        }
      } else {
        const inv = await this.createOfferInventories(
          {
            offer_id: offer.id,
            quantity_available: input.quantity_available,
          },
          sharedContext
        )
        inventory_id = inv.id
        inventory_changed = true
      }

      let price_id = prices[0]?.id
      let price_changed = false
      if (price_id) {
        price_changed =
          previous_base_price !== input.base_price ||
          previous_shipping_cost !== input.shipping_cost ||
          previous_vat_rate !== input.vat_rate
        if (price_changed) {
          await this.updateOfferPrices(
            {
              id: price_id,
              base_price: input.base_price,
              shipping_cost: input.shipping_cost,
              vat_rate: input.vat_rate,
            },
            sharedContext
          )
        }
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
        price_changed = true
      }

      return {
        offer_id: offer.id,
        inventory_id,
        price_id,
        created: false,
        inventory_changed,
        price_changed,
        previous_quantity_available,
        previous_base_price,
        previous_shipping_cost,
        previous_vat_rate,
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
      inventory_changed: true,
      price_changed: true,
      previous_quantity_available: null,
      previous_base_price: null,
      previous_shipping_cost: null,
      previous_vat_rate: null,
    }
  }

  @InjectManager()
  async patchOfferGraph(
    input: PatchOfferGraphInput,
    @MedusaContext() sharedContext: Context = {}
  ): Promise<UpsertOfferGraphResult> {
    return await this.patchOfferGraph_(input, sharedContext)
  }

  @InjectTransactionManager()
  protected async patchOfferGraph_(
    input: PatchOfferGraphInput,
    @MedusaContext() sharedContext: Context = {}
  ): Promise<UpsertOfferGraphResult> {
    const offer = await this.retrieveOffer(input.offer_id, {}, sharedContext)
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

    if (!inventories[0] || !prices[0]) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Offer mist inventory of price."
      )
    }

    const quantity =
      input.quantity_available ?? Number(inventories[0].quantity_available)
    const base_price = input.base_price ?? Number(prices[0].base_price)
    const shipping_cost =
      input.shipping_cost ?? Number(prices[0].shipping_cost)
    const vat_rate = input.vat_rate ?? Number(prices[0].vat_rate)

    return await this.upsertOfferGraph_(
      {
        seller_id: offer.seller_id,
        identifier_id: offer.identifier_id,
        region_code: offer.region_code,
        quantity_available: quantity,
        base_price,
        shipping_cost,
        vat_rate,
      },
      sharedContext
    )
  }

  @InjectManager()
  async withdrawOffer(
    offerId: string,
    @MedusaContext() sharedContext: Context = {}
  ): Promise<WithdrawOfferResult> {
    return await this.withdrawOffer_(offerId, sharedContext)
  }

  @InjectTransactionManager()
  protected async withdrawOffer_(
    offerId: string,
    @MedusaContext() sharedContext: Context = {}
  ): Promise<WithdrawOfferResult> {
    const offer = await this.retrieveOffer(offerId, {}, sharedContext)
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

    if (inventories.length > 0) {
      await this.softDeleteOfferInventories(
        inventories.map((row) => row.id),
        sharedContext
      )
    }
    if (prices.length > 0) {
      await this.softDeleteOfferPrices(
        prices.map((row) => row.id),
        sharedContext
      )
    }
    await this.softDeleteOffers([offer.id], sharedContext)

    return {
      offer_id: offer.id,
      identifier_id: offer.identifier_id,
      region_code: offer.region_code,
      seller_id: offer.seller_id,
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
    sellerReviewScoreById: Record<string, number | null> = {},
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
        seller_review_score: sellerReviewScoreById[offer.seller_id] ?? null,
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
