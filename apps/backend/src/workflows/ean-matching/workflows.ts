import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"
import { PRODUCT_CLOUD_MODULE } from "../../modules/product-cloud"
import type ProductCloudModuleService from "../../modules/product-cloud/service"

export type EanMatchOutcome = "exact_match" | "uncertain" | "no_match"

export type EanMatchInput = {
  identifier_value: string
  /** Blueprint: EAN-13 is GTIN-subtype — default GTIN. */
  identifier_type?: "GTIN" | "MPN"
  country_scope?: string | null
  /**
   * Optioneel: product-ID van een nieuw/concept-product dat wordt
   * vergeleken met gevonden kandidaten (onzeker pad / latere AI-laag).
   * Bij meerdere of handmatig aangedragen kandidaten → MatchCandidate.
   */
  draft_product_id?: string
  candidate_product_ids?: string[]
}

export type EanMatchResult = {
  outcome: EanMatchOutcome
  product_id?: string
  product_variant_id?: string
  identifier_id?: string
  match_candidate_ids?: string[]
}

function canonicalizePair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a]
}

/**
 * Deterministische EAN/GTIN-matching — product-cloud-architecture Deel 5.1
 * laag 1 + onzeker pad → MatchCandidate (ADR-0007), nooit ModerationCase.
 */
export const matchByEanStep = createStep(
  "match-by-ean",
  async (input: EanMatchInput, { container }) => {
    const productCloud = container.resolve(
      PRODUCT_CLOUD_MODULE
    ) as ProductCloudModuleService
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

    const identifierType = input.identifier_type ?? "GTIN"
    const value = input.identifier_value.trim()
    if (!value) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "identifier_value is verplicht."
      )
    }

    const filters: Record<string, unknown> = {
      identifier_value: value,
      identifier_type: identifierType,
    }
    if (input.country_scope !== undefined && input.country_scope !== null) {
      filters.country_scope = input.country_scope
    }

    const hits = await productCloud.listIdentifiers(filters, {
      relations: ["product_variant"],
    })

    // Exacte unieke hit (met of zonder country_scope-filter) → auto-link.
    if (hits.length === 1) {
      const hit = hits[0]
      const variant = hit.product_variant as { id: string; product_id?: string }
      const productId =
        variant?.product_id ??
        (
          await productCloud.retrieveProductVariant(hit.product_variant_id)
        ).product_id

      logger.info(
        `[audit] ean-match exact: value=${value} type=${identifierType} product=${productId}`
      )

      return new StepResponse<EanMatchResult>({
        outcome: "exact_match",
        product_id: productId,
        product_variant_id: hit.product_variant_id,
        identifier_id: hit.id,
      })
    }

    // Meerdere hits (bijv. zelfde GTIN, verschillende country_scope zonder filter)
    // of expliciete kandidaten → onzeker → MatchCandidate(s).
    const candidateProductIds = new Set<string>()

    if (hits.length > 1) {
      for (const hit of hits) {
        const variant = await productCloud.retrieveProductVariant(
          hit.product_variant_id
        )
        candidateProductIds.add(variant.product_id)
      }
    }

    for (const id of input.candidate_product_ids ?? []) {
      if (id) candidateProductIds.add(id)
    }

    if (candidateProductIds.size === 0) {
      logger.info(
        `[audit] ean-match no_match: value=${value} type=${identifierType}`
      )
      return new StepResponse<EanMatchResult>({ outcome: "no_match" })
    }

    const draftId = input.draft_product_id
    const matchCandidateIds: string[] = []

    if (draftId) {
      for (const otherId of candidateProductIds) {
        if (otherId === draftId) continue
        const [a, b] = canonicalizePair(draftId, otherId)
        const existing = await productCloud.listMatchCandidates({
          product_id_a: a,
          product_id_b: b,
        })
        if (existing.length > 0) {
          matchCandidateIds.push(existing[0].id)
          continue
        }
        const created = await productCloud.createMatchCandidates({
          product_id_a: a,
          product_id_b: b,
          status: "Kandidaat",
        })
        matchCandidateIds.push(created.id)
      }
    } else {
      // Zonder draft: kandidaten onderling paren (onzekerheid tussen bestaande producten).
      const ids = [...candidateProductIds].sort()
      for (let i = 0; i < ids.length; i++) {
        for (let j = i + 1; j < ids.length; j++) {
          const [a, b] = canonicalizePair(ids[i], ids[j])
          const existing = await productCloud.listMatchCandidates({
            product_id_a: a,
            product_id_b: b,
          })
          if (existing.length > 0) {
            matchCandidateIds.push(existing[0].id)
            continue
          }
          const created = await productCloud.createMatchCandidates({
            product_id_a: a,
            product_id_b: b,
            status: "Kandidaat",
          })
          matchCandidateIds.push(created.id)
        }
      }
    }

    if (matchCandidateIds.length === 0) {
      return new StepResponse<EanMatchResult>({ outcome: "no_match" })
    }

    logger.info(
      `[audit] ean-match uncertain: value=${value} candidates=${matchCandidateIds.join(",")}`
    )

    return new StepResponse<EanMatchResult>({
      outcome: "uncertain",
      match_candidate_ids: matchCandidateIds,
    })
  }
)

export const matchByEanWorkflow = createWorkflow(
  "match-by-ean",
  (input: EanMatchInput) => {
    const result = matchByEanStep(input)
    return new WorkflowResponse(result)
  }
)
