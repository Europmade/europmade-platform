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

type ChangeProposalRow = {
  id: string
  product_id: string
  submitter_seller_id: string
  proposed_title: string | null
  proposed_description: string | null
  toelichting: string
  status: "In behandeling" | "Goedgekeurd" | "Afgewezen"
  decision_reason: string | null
  decided_by_seller_id: string | null
  decided_at: Date | string | null
}

type ProductRow = {
  id: string
  current_owner_seller_id: string
  lifecycle_status: string
}

type ProductVersionRow = {
  id: string
  product_id: string
  version_number: number
  title: string
  description: string
  publication_status: string
}

export type SubmitChangeProposalInput = {
  product_id: string
  submitter_seller_id: string
  proposed_title?: string | null
  proposed_description?: string | null
  toelichting: string
}

export const submitChangeProposalStep = createStep(
  "submit-change-proposal",
  async (input: SubmitChangeProposalInput, { container }) => {
    const productCloud = container.resolve(
      PRODUCT_CLOUD_MODULE
    ) as ProductCloudModuleService
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

    const product = (await productCloud.retrieveProduct(
      input.product_id
    )) as ProductRow

    if (product.current_owner_seller_id === input.submitter_seller_id) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "Eigenaar bewerkt via Concept, niet via wijzigingsvoorstel (PM §9)."
      )
    }

    if (
      !input.proposed_title?.trim() &&
      !input.proposed_description?.trim()
    ) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Minimaal proposed_title of proposed_description is verplicht."
      )
    }

    const toelichting = input.toelichting.trim()
    if (!toelichting) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "toelichting is verplicht."
      )
    }

    const proposal = (await productCloud.createChangeProposals({
      product_id: input.product_id,
      submitter_seller_id: input.submitter_seller_id,
      proposed_title: input.proposed_title?.trim() ?? null,
      proposed_description: input.proposed_description?.trim() ?? null,
      toelichting,
      status: "In behandeling",
      decision_reason: null,
      decided_by_seller_id: null,
      decided_at: null,
    })) as ChangeProposalRow

    logger.info(
      `[audit] change-proposal submitted id=${proposal.id} product=${input.product_id} by=${input.submitter_seller_id}`
    )
    return new StepResponse(proposal)
  }
)

export const submitChangeProposalWorkflow = createWorkflow(
  "submit-change-proposal",
  (input: SubmitChangeProposalInput) => {
    const result = submitChangeProposalStep(input)
    return new WorkflowResponse(result)
  }
)

export type DecideChangeProposalInput = {
  proposal_id: string
  decider_seller_id: string
  decision: "accept" | "reject"
  decision_reason?: string
  /** Beheerder-escalatie: mag beslissen zonder eigenaar te zijn. */
  as_admin?: boolean
}

export const decideChangeProposalStep = createStep(
  "decide-change-proposal",
  async (input: DecideChangeProposalInput, { container }) => {
    const productCloud = container.resolve(
      PRODUCT_CLOUD_MODULE
    ) as ProductCloudModuleService
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

    const proposal = (await productCloud.retrieveChangeProposal(
      input.proposal_id
    )) as ChangeProposalRow

    if (proposal.status !== "In behandeling") {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "Dit wijzigingsvoorstel is al beslist."
      )
    }

    const product = (await productCloud.retrieveProduct(
      proposal.product_id
    )) as ProductRow

    if (
      !input.as_admin &&
      product.current_owner_seller_id !== input.decider_seller_id
    ) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "Alleen de Product Cloud-eigenaar mag dit voorstel beoordelen (PM §9)."
      )
    }

    const now = new Date()

    if (input.decision === "reject") {
      const reason = input.decision_reason?.trim()
      if (!reason) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          "Afwijzing vereist een decision_reason (marketplace-core §10)."
        )
      }
      const updated = await productCloud.updateChangeProposals({
        id: proposal.id,
        status: "Afgewezen",
        decision_reason: reason,
        decided_by_seller_id: input.decider_seller_id,
        decided_at: now,
      })
      logger.info(
        `[audit] change-proposal rejected id=${proposal.id} reason=${reason}`
      )
      return new StepResponse({
        proposal: Array.isArray(updated) ? updated[0] : updated,
        version: null,
      })
    }

    // Acceptatie — B-PM3: merge in bestaand Concept, anders nieuw Concept.
    const versions = (await productCloud.listProductVersions({
      product_id: product.id,
    })) as ProductVersionRow[]

    const activeConcept = versions.find(
      (v) =>
        v.publication_status === "Concept" ||
        v.publication_status === "In review"
    )

    let version: ProductVersionRow

    if (activeConcept) {
      const updatedVersion = await productCloud.updateProductVersions({
        id: activeConcept.id,
        title: proposal.proposed_title ?? activeConcept.title,
        description:
          proposal.proposed_description ?? activeConcept.description,
        publication_status: "Concept",
      })
      version = (
        Array.isArray(updatedVersion) ? updatedVersion[0] : updatedVersion
      ) as ProductVersionRow
    } else {
      const published = versions
        .filter((v) => v.publication_status === "Gepubliceerd")
        .sort((a, b) => b.version_number - a.version_number)[0]
      const maxNum = versions.reduce(
        (m, v) => Math.max(m, v.version_number),
        0
      )
      version = (await productCloud.createProductVersions({
        product_id: product.id,
        version_number: maxNum + 1,
        title: proposal.proposed_title ?? published?.title ?? "Concept",
        description:
          proposal.proposed_description ??
          published?.description ??
          "Concept",
        publication_status: "Concept",
        created_by_seller_id: input.decider_seller_id,
      })) as ProductVersionRow
    }

    const updated = await productCloud.updateChangeProposals({
      id: proposal.id,
      status: "Goedgekeurd",
      decision_reason: null,
      decided_by_seller_id: input.decider_seller_id,
      decided_at: now,
    })

    logger.info(
      `[audit] change-proposal accepted id=${proposal.id} merged_into_version=${version.id}`
    )

    return new StepResponse({
      proposal: Array.isArray(updated) ? updated[0] : updated,
      version,
    })
  }
)

export const decideChangeProposalWorkflow = createWorkflow(
  "decide-change-proposal",
  (input: DecideChangeProposalInput) => {
    const result = decideChangeProposalStep(input)
    return new WorkflowResponse(result)
  }
)
