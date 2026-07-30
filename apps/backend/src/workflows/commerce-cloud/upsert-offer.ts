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

export type UpsertOfferInput = {
  seller_id: string
  identifier_id: string
  region_code: string
  quantity_available: number
  base_price: number
  shipping_cost: number
  vat_rate: number
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

    // ADR-0014: Buy Box-herberekening volgt in S3-04-02.
    logger.info(
      `[audit] offer ${result.created ? "created" : "updated"} offer=${result.offer_id} seller=${input.seller_id} identifier=${input.identifier_id} region=${region} buy_box=deferred`
    )

    return new StepResponse(result)
  }
)

export const upsertOfferWorkflow = createWorkflow(
  "upsert-commerce-offer",
  (input: UpsertOfferInput) => {
    const result = upsertOfferStep(input)
    return new WorkflowResponse(result)
  }
)
