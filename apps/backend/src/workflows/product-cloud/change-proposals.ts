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
import { isRealBrandId } from "../../modules/product-cloud/catalog-edit-auth"
import {
  brandOwnerCompanyId,
  isVerifiedBrandOwner,
  type BrandPublicRow,
} from "../../api/store/brands/ownership"
import {
  hasAnyProposalContent,
  normalizeProposedFields,
  titleDescriptionFromProposedFields,
} from "../../modules/product-cloud/change-proposal-fields"
import {
  findProductManagerProposalChange,
  isProductManagerProposalFields,
  parseProductManagerProposedValue,
} from "../../modules/product-cloud/product-manager-request"
import { assertValidProductManagerAssignment } from "../../modules/product-cloud/product-manager-assignment"
import {
  isRealBrandId,
  resolveOfferSellerIdsForProduct,
} from "../../modules/product-cloud/catalog-edit-auth"
import { COMMERCE_CLOUD_MODULE } from "../../modules/commerce-cloud"
import type CommerceCloudModuleService from "../../modules/commerce-cloud/service"
import { approvedOwnerClaim } from "../../api/store/brands/ownership"

type ChangeProposalRow = {
  id: string
  product_id: string
  submitter_seller_id: string
  proposed_title: string | null
  proposed_description: string | null
  proposed_fields?: unknown
  toelichting: string
  status: "In behandeling" | "Goedgekeurd" | "Afgewezen"
  decision_reason: string | null
  decided_by_seller_id: string | null
  decided_at: Date | string | null
}

type ProductRow = {
  id: string
  brand_id?: string | null
  manufacturer_id?: string | null
  current_owner_seller_id: string
  product_manager_kind?: string | null
  product_manager_seller_id?: string | null
  lifecycle_status: string
}

function isAssignedSellerProductManager(
  product: ProductRow,
  sellerId: string
): boolean {
  return (
    product.product_manager_kind === "seller" &&
    Boolean(product.product_manager_seller_id) &&
    product.product_manager_seller_id === sellerId
  )
}

async function sellerIsBrandProductManager(
  container: { resolve: (key: string) => unknown },
  product: ProductRow,
  seller: { id: string; company_id?: string | null }
): Promise<boolean> {
  if (product.product_manager_kind !== "brand_owner") return false
  if (!isRealBrandId(product.brand_id)) return false
  let partner: PartnerModuleService
  try {
    partner = container.resolve(PARTNER_MODULE) as PartnerModuleService
  } catch {
    return false
  }
  try {
    const brand = (await partner.retrieveBrand(
      product.brand_id!
    )) as BrandPublicRow & { id: string }
    if (await isVerifiedBrandOwner(partner, seller, brand)) return true
    const ownerCompany = brandOwnerCompanyId(brand)
    return Boolean(
      seller.company_id && ownerCompany && seller.company_id === ownerCompany
    )
  } catch {
    return false
  }
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
  proposed_fields?: unknown
  toelichting: string
}

export const submitChangeProposalStep = createStep(
  "submit-change-proposal",
  async (input: SubmitChangeProposalInput, { container }) => {
    const productCloud = container.resolve(
      PRODUCT_CLOUD_MODULE
    ) as ProductCloudModuleService
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

    await productCloud.retrieveProduct(input.product_id)

    const proposedFields = normalizeProposedFields(input.proposed_fields)
    const fromFields = titleDescriptionFromProposedFields(proposedFields)
    const proposedTitle =
      input.proposed_title?.trim() || fromFields.title || null
    const proposedDescription =
      input.proposed_description?.trim() || fromFields.description || null

    if (
      !hasAnyProposalContent({
        proposed_title: proposedTitle,
        proposed_description: proposedDescription,
        proposed_fields: proposedFields,
      })
    ) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Minimaal één centrale veldwijziging is verplicht (titel, beschrijving of proposed_fields)."
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
      proposed_title: proposedTitle,
      proposed_description: proposedDescription,
      proposed_fields: proposedFields,
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
  /** Optional company id for brand-owner Productbeheerder checks. */
  decider_company_id?: string | null
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

    const isManagerSeller = isAssignedSellerProductManager(
      product,
      input.decider_seller_id
    )
    const isManagerBrand = await sellerIsBrandProductManager(container, product, {
      id: input.decider_seller_id,
      company_id: input.decider_company_id ?? null,
    })

    if (!input.as_admin && !isManagerSeller && !isManagerBrand) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "Alleen de aangewezen Productbeheerder mag dit voorstel beoordelen."
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

    // Productbeheerder-aanvraag: assign via existing ADR-0046 path (no version merge).
    if (isProductManagerProposalFields(proposal.proposed_fields)) {
      const change = findProductManagerProposalChange(proposal.proposed_fields)
      const parsed = parseProductManagerProposedValue(
        change?.proposed_value || ""
      )
      if (!parsed) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          "Ongeldige Productbeheerder-aanvraag."
        )
      }

      let commerce: CommerceCloudModuleService | null = null
      try {
        commerce = container.resolve(
          COMMERCE_CLOUD_MODULE
        ) as CommerceCloudModuleService
      } catch {
        commerce = null
      }
      const partner = container.resolve(PARTNER_MODULE) as PartnerModuleService
      const offerSellerIds = await resolveOfferSellerIdsForProduct(
        productCloud,
        commerce,
        product.id
      )
      let brandOwnerAvailable = false
      if (isRealBrandId(product.brand_id)) {
        const claim = await approvedOwnerClaim(partner, product.brand_id!)
        brandOwnerAvailable = Boolean(claim)
      }

      const assignSellerId =
        parsed.kind === "seller"
          ? parsed.seller_id || proposal.submitter_seller_id
          : null

      try {
        assertValidProductManagerAssignment({
          kind: parsed.kind,
          seller_id: assignSellerId,
          offerSellerIds,
          brandOwnerAvailable,
        })
      } catch (err) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          err instanceof Error
            ? err.message
            : "Aanvrager is geen geldige Productbeheerder-kandidaat meer."
        )
      }

      if (
        parsed.kind === "seller" &&
        assignSellerId &&
        assignSellerId !== proposal.submitter_seller_id
      ) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          "Productbeheerder-aanvraag mag alleen de aanvrager zelf toewijzen."
        )
      }

      await productCloud.assignProductManager({
        product_id: product.id,
        kind: parsed.kind,
        seller_id: assignSellerId,
        actor_admin_id: input.as_admin ? input.decider_seller_id : null,
        transfer_reason:
          input.decision_reason?.trim() ||
          `Productbeheerder-aanvraag ${proposal.id} goedgekeurd`,
      })

      const updated = await productCloud.updateChangeProposals({
        id: proposal.id,
        status: "Goedgekeurd",
        decision_reason: input.decision_reason?.trim() || null,
        decided_by_seller_id: input.decider_seller_id,
        decided_at: now,
      })

      logger.info(
        `[audit] product-manager-request accepted id=${proposal.id} product=${product.id} kind=${parsed.kind}`
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

    const proposedFields = normalizeProposedFields(proposal.proposed_fields)
    const fromFields = titleDescriptionFromProposedFields(proposedFields)
    const nextTitle =
      proposal.proposed_title ?? fromFields.title ?? undefined
    const nextDescription =
      proposal.proposed_description ?? fromFields.description ?? undefined

    const activeConcept = versions.find(
      (v) =>
        v.publication_status === "Concept" ||
        v.publication_status === "In review"
    )

    let version: ProductVersionRow

    if (activeConcept) {
      const updatedVersion = await productCloud.updateProductVersions({
        id: activeConcept.id,
        title: nextTitle ?? activeConcept.title,
        description: nextDescription ?? activeConcept.description,
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
        title: nextTitle ?? published?.title ?? "Concept",
        description:
          nextDescription ?? published?.description ?? "Concept",
        publication_status: "Concept",
        created_by_seller_id: input.decider_seller_id,
      })) as ProductVersionRow
    }

    // Apply additional central fields from proposed_fields
    if (proposedFields) {
      const brandChange = proposedFields.changes.find(
        (c) => c.field === "brand_id"
      )
      const manuChange = proposedFields.changes.find(
        (c) => c.field === "manufacturer_id"
      )
      if (brandChange || manuChange) {
        await productCloud.updateProducts({
          id: product.id,
          ...(brandChange ? { brand_id: brandChange.proposed_value } : {}),
          ...(manuChange
            ? { manufacturer_id: manuChange.proposed_value }
            : {}),
        })
      }

      const attrChanges = proposedFields.changes.filter(
        (c) => c.field === "attribute" && c.attribute_definition_id
      )
      for (const attr of attrChanges) {
        const existing = await productCloud.listAttributeValues({
          product_version_id: version.id,
          attribute_definition_id: attr.attribute_definition_id!,
        })
        const row = existing[0]
        if (row) {
          await productCloud.updateAttributeValues({
            id: row.id,
            value: attr.proposed_value,
          })
        } else {
          await productCloud.createAttributeValues({
            product_version_id: version.id,
            attribute_definition_id: attr.attribute_definition_id!,
            value: attr.proposed_value,
          })
        }
      }

      // Apply staged media only on approve (never attached at upload time).
      const mediaChanges = proposedFields.changes.filter(
        (c) => c.field === "media_note" && c.storage_references?.length
      )
      for (const mediaChange of mediaChanges) {
        const existing = await productCloud.listProductMedias({
          product_version_id: version.id,
        })
        let sort = existing.length
        for (const ref of mediaChange.storage_references || []) {
          await productCloud.createProductMedias({
            product_version_id: version.id,
            media_type: "Overige afbeelding",
            storage_reference: ref,
            sort_order: sort++,
            metadata: {
              purpose: "change_proposal_accepted",
              proposal_id: proposal.id,
              note: mediaChange.proposed_value || null,
            },
          })
        }
      }

      for (const change of proposedFields.changes) {
        await productCloud.createProductFieldChanges({
          product_id: product.id,
          product_version_id: version.id,
          seller_id: proposal.submitter_seller_id,
          actor_customer_id: null,
          field_code:
            change.field === "attribute"
              ? `attribute:${change.attribute_definition_id || "unknown"}`
              : change.field,
          field_label: change.label,
          old_value: change.current_value,
          new_value:
            change.storage_references?.length
              ? `${change.proposed_value || "media"} [${change.storage_references.join(", ")}]`
              : change.proposed_value,
          status: "approved",
          reason: `Wijzigingsvoorstel ${proposal.id} goedgekeurd`,
        })
      }
    }

    const updated = await productCloud.updateChangeProposals({
      id: proposal.id,
      status: "Goedgekeurd",
      decision_reason: input.decision_reason?.trim() || null,
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
