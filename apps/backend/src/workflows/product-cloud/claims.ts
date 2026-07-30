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
import { PRODUCT_CLOUD_MODULE } from "../../modules/product-cloud"
import type ProductCloudModuleService from "../../modules/product-cloud/service"
import { PARTNER_MODULE } from "../../modules/partner"
import type PartnerModuleService from "../../modules/partner/service"

type ClaimRow = {
  id: string
  product_id: string
  claimant_seller_id: string
  status: "In beoordeling" | "Goedgekeurd" | "Afgewezen"
  decision_reason: string | null
}

type ProductRow = {
  id: string
  current_owner_seller_id: string
  lifecycle_status: string
}

type OwnershipRow = {
  id: string
  product_id: string
  seller_id: string
  valid_until: Date | string | null
}

export type SubmitClaimInput = {
  product_id: string
  claimant_seller_id: string
  is_producer_or_brand_owner: boolean
}

export const submitClaimStep = createStep(
  "submit-product-claim",
  async (input: SubmitClaimInput, { container }) => {
    const productCloud = container.resolve(
      PRODUCT_CLOUD_MODULE
    ) as ProductCloudModuleService
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

    if (!input.is_producer_or_brand_owner) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "Alleen Producent/Merkhouder mag een claim indienen (PM §9)."
      )
    }

    const product = (await productCloud.retrieveProduct(
      input.product_id
    )) as ProductRow

    if (product.current_owner_seller_id === input.claimant_seller_id) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "Je bent al eigenaar van dit product."
      )
    }

    const openOwn = (await productCloud.listClaims({
      product_id: input.product_id,
      claimant_seller_id: input.claimant_seller_id,
      status: "In beoordeling",
    })) as ClaimRow[]
    if (openOwn.length > 0) {
      throw new MedusaError(
        MedusaError.Types.DUPLICATE_ERROR,
        "Er staat al een claim In beoordeling voor dit product."
      )
    }

    const otherOpen = (await productCloud.listClaims({
      product_id: input.product_id,
      status: "In beoordeling",
    })) as ClaimRow[]

    const claim = (await productCloud.createClaims({
      product_id: input.product_id,
      claimant_seller_id: input.claimant_seller_id,
      status: "In beoordeling",
      decision_reason: null,
      ai_metadata_id: null,
    })) as ClaimRow

    // B.10: twee gelijktijdige claims → Dispute.
    if (otherOpen.length > 0) {
      await productCloud.createDisputes({
        product_id: input.product_id,
        status: "Open",
      })
      logger.info(
        `[audit] dispute opened product=${input.product_id} claim=${claim.id}`
      )
    }

    logger.info(
      `[audit] claim submitted claim=${claim.id} product=${input.product_id} claimant=${input.claimant_seller_id}`
    )
    return new StepResponse(claim)
  }
)

export const submitClaimWorkflow = createWorkflow(
  "submit-product-claim",
  (input: SubmitClaimInput) => {
    const result = submitClaimStep(input)
    return new WorkflowResponse(result)
  }
)

export type DecideClaimInput = {
  claim_id: string
  decision: "approve" | "reject"
  decision_reason?: string
}

export const decideClaimStep = createStep(
  "decide-product-claim",
  async (input: DecideClaimInput, { container }) => {
    const productCloud = container.resolve(
      PRODUCT_CLOUD_MODULE
    ) as ProductCloudModuleService
    const partnerService = container.resolve(
      PARTNER_MODULE
    ) as PartnerModuleService
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

    const claim = (await productCloud.retrieveClaim(
      input.claim_id
    )) as ClaimRow
    if (claim.status !== "In beoordeling") {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "Deze claim is al beslist."
      )
    }

    if (input.decision === "reject") {
      const reason = input.decision_reason?.trim()
      if (!reason) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          "Afwijzing vereist een decision_reason (ADR-0010 / PM §5)."
        )
      }
      const updated = await productCloud.updateClaims({
        id: claim.id,
        status: "Afgewezen",
        decision_reason: reason,
      })
      logger.info(
        `[audit] claim rejected claim=${claim.id} reason=${reason}`
      )
      return new StepResponse(Array.isArray(updated) ? updated[0] : updated)
    }

    const claimant = await partnerService.retrieveSeller(
      claim.claimant_seller_id
    )
    if (
      !claimant.is_producer_or_brand_owner ||
      claimant.onboarding_status !== "Goedgekeurd"
    ) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "Claimant is geen goedgekeurde Producent/Merkhouder."
      )
    }

    const product = (await productCloud.retrieveProduct(
      claim.product_id
    )) as ProductRow
    const now = new Date()

    const currentOwnership = (await productCloud.listOwnershipRecords({
      product_id: product.id,
      valid_until: null,
    })) as OwnershipRow[]
    for (const own of currentOwnership) {
      await productCloud.updateOwnershipRecords({
        id: own.id,
        valid_until: now,
      })
    }

    await productCloud.createOwnershipRecords({
      product_id: product.id,
      seller_id: claim.claimant_seller_id,
      valid_from: now,
      valid_until: null,
      transfer_reason: `Claim goedgekeurd: ${claim.id}`,
    })

    const lifecyclePatch: { id: string; current_owner_seller_id: string; lifecycle_status?: string } =
      {
        id: product.id,
        current_owner_seller_id: claim.claimant_seller_id,
      }
    if (product.lifecycle_status === "Retailer Created") {
      lifecyclePatch.lifecycle_status = "Concept gecontroleerd"
    }

    await productCloud.updateProducts(lifecyclePatch)

    // marketplace-core §9 stap 6: openstaande wijzigingsvoorstellen blijven
    // product-gebonden; nieuwe eigenaar ziet ze in de inbox (geen aparte reassignment-kolom).

    const updated = await productCloud.updateClaims({
      id: claim.id,
      status: "Goedgekeurd",
      decision_reason: null,
    })

    // Overige open claims op dit product afwijzen (dispute-resolutie).
    const others = (await productCloud.listClaims({
      product_id: product.id,
      status: "In beoordeling",
    })) as ClaimRow[]
    for (const other of others) {
      if (other.id === claim.id) continue
      await productCloud.updateClaims({
        id: other.id,
        status: "Afgewezen",
        decision_reason:
          "Andere claim goedgekeurd; eigendom is overgedragen.",
      })
    }

    const openDisputes = await productCloud.listDisputes({
      product_id: product.id,
      status: "Open",
    })
    for (const d of openDisputes) {
      await productCloud.updateDisputes({
        id: d.id,
        status: "Overdracht",
      })
    }

    logger.info(
      `[audit] claim approved claim=${claim.id} product=${product.id} new_owner=${claim.claimant_seller_id}`
    )
    return new StepResponse(Array.isArray(updated) ? updated[0] : updated)
  }
)

export const decideClaimWorkflow = createWorkflow(
  "decide-product-claim",
  (input: DecideClaimInput) => {
    const result = decideClaimStep(input)
    return new WorkflowResponse(result)
  }
)
