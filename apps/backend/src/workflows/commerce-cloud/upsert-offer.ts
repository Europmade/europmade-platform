import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import { COMMERCE_CLOUD_MODULE } from "../../modules/commerce-cloud"
import type CommerceCloudModuleService from "../../modules/commerce-cloud/service"
import { PRODUCT_CLOUD_MODULE } from "../../modules/product-cloud"
import type ProductCloudModuleService from "../../modules/product-cloud/service"
import { executeRecomputeBuyBox } from "./recompute-buy-box"
import type { BuyBoxComputationResult } from "../../modules/commerce-cloud/buy-box-engine"
import { emitCommerceEvent } from "./commerce-events"

export type UpsertOfferInput = {
  seller_id: string
  identifier_id: string
  region_code: string
  quantity_available: number
  base_price: number
  shipping_cost: number
  vat_rate: number
}

export type UpsertOfferWorkflowResult = {
  offer_id: string
  inventory_id: string
  price_id: string
  created: boolean
  region_code: string
  buy_box: BuyBoxComputationResult
}

function validateOfferAmounts(input: {
  quantity_available: number
  base_price: number
  shipping_cost: number
  vat_rate: number
}) {
  if (input.quantity_available < 0) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "quantity_available mag niet negatief zijn."
    )
  }
  if (input.base_price < 0 || input.shipping_cost < 0) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Prijsvelden mogen niet negatief zijn."
    )
  }
  if (input.vat_rate < 0 || input.vat_rate > 1) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "vat_rate moet tussen 0 en 1 liggen (bijv. 0.21)."
    )
  }
}

export const upsertOfferStep = createStep(
  "upsert-commerce-offer",
  async (input: UpsertOfferInput, { container }) => {
    const commerce = container.resolve(
      COMMERCE_CLOUD_MODULE
    ) as CommerceCloudModuleService
    const productCloud = container.resolve(
      PRODUCT_CLOUD_MODULE
    ) as ProductCloudModuleService
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

    validateOfferAmounts(input)

    const region = input.region_code.trim().toUpperCase()
    if (!/^[A-Z]{2}$/.test(region)) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "region_code moet een ISO-3166 landcode zijn (2 letters)."
      )
    }

    try {
      await productCloud.retrieveIdentifier(input.identifier_id)
    } catch {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        "Identifier bestaat niet in Product Cloud."
      )
    }

    const result = await commerce.upsertOfferGraph({
      ...input,
      region_code: region,
    })

    if (result.created) {
      await emitCommerceEvent(container, "OfferCreated", {
        offer_id: result.offer_id,
        seller_id: input.seller_id,
        identifier_id: input.identifier_id,
        region_code: region,
      })
    }
    if (result.inventory_changed) {
      await emitCommerceEvent(container, "InventoryChanged", {
        offer_id: result.offer_id,
        inventory_id: result.inventory_id,
        quantity_available: input.quantity_available,
        previous_quantity_available: result.previous_quantity_available,
      })
    }
    if (result.price_changed) {
      await emitCommerceEvent(container, "PriceChanged", {
        offer_id: result.offer_id,
        price_id: result.price_id,
        base_price: input.base_price,
        shipping_cost: input.shipping_cost,
        vat_rate: input.vat_rate,
        previous_base_price: result.previous_base_price,
        previous_shipping_cost: result.previous_shipping_cost,
        previous_vat_rate: result.previous_vat_rate,
      })
    }

    logger.info(
      `[audit] offer ${result.created ? "created" : "updated"} offer=${result.offer_id} seller=${input.seller_id} identifier=${input.identifier_id} region=${region}`
    )

    const buy_box = await executeRecomputeBuyBox(container, {
      identifier_id: input.identifier_id,
      region_code: region,
    })

    const payload: UpsertOfferWorkflowResult = {
      offer_id: result.offer_id,
      inventory_id: result.inventory_id,
      price_id: result.price_id,
      created: result.created,
      region_code: region,
      buy_box,
    }

    return new StepResponse(payload)
  }
)

export const upsertOfferWorkflow = createWorkflow(
  "upsert-commerce-offer",
  (input: UpsertOfferInput) => {
    const result = upsertOfferStep(input)
    return new WorkflowResponse(result)
  }
)

export type PatchOfferInput = {
  seller_id: string
  offer_id: string
  quantity_available?: number
  base_price?: number
  shipping_cost?: number
  vat_rate?: number
}

export const patchOfferStep = createStep(
  "patch-commerce-offer",
  async (input: PatchOfferInput, { container }) => {
    const commerce = container.resolve(
      COMMERCE_CLOUD_MODULE
    ) as CommerceCloudModuleService
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

    const offer = await commerce.retrieveOffer(input.offer_id)
    if (offer.seller_id !== input.seller_id) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "Je mag alleen je eigen aanbod wijzigen."
      )
    }

    if (
      input.quantity_available === undefined &&
      input.base_price === undefined &&
      input.shipping_cost === undefined &&
      input.vat_rate === undefined
    ) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Geef minstens één veld op: quantity_available, base_price, shipping_cost of vat_rate."
      )
    }

    const [inventory] = await commerce.listOfferInventories({
      offer_id: offer.id,
    })
    const [price] = await commerce.listOfferPrices({ offer_id: offer.id })
    if (!inventory || !price) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Offer mist inventory of price."
      )
    }

    const next = {
      quantity_available:
        input.quantity_available ?? Number(inventory.quantity_available),
      base_price: input.base_price ?? Number(price.base_price),
      shipping_cost: input.shipping_cost ?? Number(price.shipping_cost),
      vat_rate: input.vat_rate ?? Number(price.vat_rate),
    }
    validateOfferAmounts(next)

    const result = await commerce.patchOfferGraph({
      offer_id: offer.id,
      ...input,
      quantity_available: input.quantity_available,
      base_price: input.base_price,
      shipping_cost: input.shipping_cost,
      vat_rate: input.vat_rate,
    })

    if (result.inventory_changed) {
      await emitCommerceEvent(container, "InventoryChanged", {
        offer_id: result.offer_id,
        inventory_id: result.inventory_id,
        quantity_available: next.quantity_available,
        previous_quantity_available: result.previous_quantity_available,
      })
    }
    if (result.price_changed) {
      await emitCommerceEvent(container, "PriceChanged", {
        offer_id: result.offer_id,
        price_id: result.price_id,
        base_price: next.base_price,
        shipping_cost: next.shipping_cost,
        vat_rate: next.vat_rate,
        previous_base_price: result.previous_base_price,
        previous_shipping_cost: result.previous_shipping_cost,
        previous_vat_rate: result.previous_vat_rate,
      })
    }

    logger.info(
      `[audit] offer patched offer=${result.offer_id} seller=${input.seller_id}`
    )

    const buy_box = await executeRecomputeBuyBox(container, {
      identifier_id: offer.identifier_id,
      region_code: offer.region_code,
    })

    const payload: UpsertOfferWorkflowResult = {
      offer_id: result.offer_id,
      inventory_id: result.inventory_id,
      price_id: result.price_id,
      created: false,
      region_code: offer.region_code,
      buy_box,
    }
    return new StepResponse(payload)
  }
)

export const patchOfferWorkflow = createWorkflow(
  "patch-commerce-offer",
  (input: PatchOfferInput) => {
    const result = patchOfferStep(input)
    return new WorkflowResponse(result)
  }
)

export type WithdrawOfferInput = {
  seller_id: string
  offer_id: string
}

export type WithdrawOfferWorkflowResult = {
  offer_id: string
  identifier_id: string
  region_code: string
  buy_box: BuyBoxComputationResult
}

export const withdrawOfferStep = createStep(
  "withdraw-commerce-offer",
  async (input: WithdrawOfferInput, { container }) => {
    const commerce = container.resolve(
      COMMERCE_CLOUD_MODULE
    ) as CommerceCloudModuleService
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

    const offer = await commerce.retrieveOffer(input.offer_id)
    if (offer.seller_id !== input.seller_id) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "Je mag alleen je eigen aanbod intrekken."
      )
    }

    const withdrawn = await commerce.withdrawOffer(offer.id)

    await emitCommerceEvent(container, "OfferWithdrawn", {
      offer_id: withdrawn.offer_id,
      seller_id: withdrawn.seller_id,
      identifier_id: withdrawn.identifier_id,
      region_code: withdrawn.region_code,
    })

    logger.info(
      `[audit] offer withdrawn offer=${withdrawn.offer_id} seller=${withdrawn.seller_id}`
    )

    const buy_box = await executeRecomputeBuyBox(container, {
      identifier_id: withdrawn.identifier_id,
      region_code: withdrawn.region_code,
    })

    const payload: WithdrawOfferWorkflowResult = {
      offer_id: withdrawn.offer_id,
      identifier_id: withdrawn.identifier_id,
      region_code: withdrawn.region_code,
      buy_box,
    }
    return new StepResponse(payload)
  }
)

export const withdrawOfferWorkflow = createWorkflow(
  "withdraw-commerce-offer",
  (input: WithdrawOfferInput) => {
    const result = withdrawOfferStep(input)
    return new WorkflowResponse(result)
  }
)
