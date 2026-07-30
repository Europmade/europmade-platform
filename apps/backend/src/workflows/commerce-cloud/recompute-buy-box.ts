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
import { COMMERCE_CLOUD_MODULE } from "../../modules/commerce-cloud"
import type CommerceCloudModuleService from "../../modules/commerce-cloud/service"
import type { BuyBoxComputationResult } from "../../modules/commerce-cloud/buy-box-engine"
import { PARTNER_MODULE } from "../../modules/partner"
import type PartnerModuleService from "../../modules/partner/service"

export type RecomputeBuyBoxInput = {
  identifier_id: string
  region_code: string
}

function tenureMs(seller: {
  approved_at?: Date | string | null
  created_at?: Date | string | null
}): number | null {
  const raw = seller.approved_at ?? seller.created_at ?? null
  if (!raw) return null
  const t = new Date(raw).getTime()
  return Number.isFinite(t) ? t : null
}

/** Gedeelde Buy Box-herberekening (S3-04-02) — aanroepbaar vanuit steps. */
export async function executeRecomputeBuyBox(
  container: MedusaContainer,
  input: RecomputeBuyBoxInput
): Promise<BuyBoxComputationResult> {
  const commerce = container.resolve(
    COMMERCE_CLOUD_MODULE
  ) as CommerceCloudModuleService
  const partner = container.resolve(PARTNER_MODULE) as PartnerModuleService
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const eventBus = container.resolve(Modules.EVENT_BUS)

  const region = input.region_code.trim().toUpperCase()
  if (!/^[A-Z]{2}$/.test(region)) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "region_code moet een ISO-3166 landcode zijn (2 letters)."
    )
  }

  const offers = await commerce.listOffers({
    identifier_id: input.identifier_id,
    region_code: region,
  })
  const sellerIds = [...new Set(offers.map((o) => o.seller_id))]
  const sellerTenureById: Record<string, number | null> = {}
  if (sellerIds.length > 0) {
    const sellers = await partner.listSellers({ id: sellerIds })
    for (const s of sellers) {
      sellerTenureById[s.id] = tenureMs(s)
    }
  }

  const offerInputs = await commerce.buildBuyBoxOfferInputs(
    input.identifier_id,
    region,
    sellerTenureById
  )
  const weights = await commerce.getActiveBuyBoxWeights()
  const result = await commerce.rankOffers(
    input.identifier_id,
    region,
    offerInputs,
    weights
  )

  if (!result.winning_offer_id) {
    await commerce.clearBuyBoxComputation(input.identifier_id, region)
    logger.info(
      `[audit] BuyBoxRecomputed identifier=${input.identifier_id} region=${region} winner=none eligible=0`
    )
    await eventBus.emit({
      name: "BuyBoxRecomputed",
      data: {
        identifier_id: input.identifier_id,
        region_code: region,
        winning_offer_id: null,
        ranked_count: 0,
      },
    })
    return result
  }

  const persisted = await commerce.persistBuyBoxComputation({
    identifier_id: input.identifier_id,
    region_code: region,
    winning_offer_id: result.winning_offer_id,
    computed_at: result.computed_at,
  })

  logger.info(
    `[audit] BuyBoxRecomputed identifier=${input.identifier_id} region=${region} winner=${result.winning_offer_id} ranked=${result.ranked.length} computation=${persisted.id}`
  )

  await eventBus.emit({
    name: "BuyBoxRecomputed",
    data: {
      identifier_id: input.identifier_id,
      region_code: region,
      winning_offer_id: result.winning_offer_id,
      ranked_count: result.ranked.length,
      buy_box_computation_id: persisted.id,
    },
  })

  return result
}

export const recomputeBuyBoxStep = createStep(
  "recompute-buy-box",
  async (input: RecomputeBuyBoxInput, { container }) => {
    const result = await executeRecomputeBuyBox(container, input)
    return new StepResponse(result)
  }
)

export const recomputeBuyBoxWorkflow = createWorkflow(
  "recompute-buy-box",
  (input: RecomputeBuyBoxInput) => {
    const result = recomputeBuyBoxStep(input)
    return new WorkflowResponse(result)
  }
)
