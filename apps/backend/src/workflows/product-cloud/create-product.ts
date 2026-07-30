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
import { matchByEanWorkflow } from "../ean-matching"

export type CreateProductCloudInput = {
  seller_id: string
  is_retailer: boolean
  is_producer_or_brand_owner: boolean
  /**
   * Dual-role: true → Retailer Created-pad (marketplace-core).
   * false/omitted bij dual-role → producentcatalogus (Concept gecontroleerd).
   */
  create_as_retailer?: boolean
  brand_id: string
  manufacturer_id: string
  title: string
  description: string
  category_name: string
  identifier_type: "GTIN" | "MPN"
  identifier_value: string
  country_scope?: string | null
  variant_type?:
    | "Kleur"
    | "Maat"
    | "Inhoud"
    | "Vermogen"
    | "Spanning"
    | "Materiaal"
    | "Uitvoering"
    | "Bundel"
  variant_value?: string
  media?: Array<{
    media_type: "Hoofdafbeelding" | "Overige afbeelding" | "Video"
    storage_reference: string
  }>
}

export type CreateProductCloudResult = {
  created: boolean
  product_id: string
  exact_match_existing?: boolean
  version_id?: string
  variant_id?: string
  identifier_id?: string
  lifecycle_status?: string
}

function resolveCreateLifecycle(
  input: CreateProductCloudInput
): "Retailer Created" | "Concept gecontroleerd" {
  if (!input.is_retailer && !input.is_producer_or_brand_owner) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Alleen Retailer of Producent/Merkhouder mag een Product Cloud-record aanmaken."
    )
  }

  // Retailer-only → altijd Retailer Created (Deel 8.1 / marketplace-core).
  if (input.is_retailer && !input.is_producer_or_brand_owner) {
    return "Retailer Created"
  }

  // Producent-only → Concept gecontroleerd (PM §3 Create), nooit Actief.
  if (!input.is_retailer && input.is_producer_or_brand_owner) {
    return "Concept gecontroleerd"
  }

  // Dual-role: expliciet create_as_retailer → Retailer Created, anders producentpad.
  return input.create_as_retailer === true
    ? "Retailer Created"
    : "Concept gecontroleerd"
}

export const createProductCloudStep = createStep(
  "create-product-cloud",
  async (input: CreateProductCloudInput, { container }) => {
    const productCloud = container.resolve(
      PRODUCT_CLOUD_MODULE
    ) as ProductCloudModuleService
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

    const { result: match } = await matchByEanWorkflow(container).run({
      input: {
        identifier_value: input.identifier_value,
        identifier_type: input.identifier_type,
        country_scope: input.country_scope ?? null,
      },
    })

    if (match.outcome === "exact_match" && match.product_id) {
      logger.info(
        `[audit] product-cloud create blocked exact_match product=${match.product_id}`
      )
      return new StepResponse<CreateProductCloudResult>({
        created: false,
        product_id: match.product_id,
        exact_match_existing: true,
      })
    }

    const lifecycle_status = resolveCreateLifecycle(input)

    const created = await productCloud.createProductGraph({
      seller_id: input.seller_id,
      brand_id: input.brand_id,
      manufacturer_id: input.manufacturer_id,
      lifecycle_status,
      title: input.title,
      description: input.description,
      category_name: input.category_name,
      identifier_type: input.identifier_type,
      identifier_value: input.identifier_value,
      country_scope: input.country_scope,
      variant_type: input.variant_type,
      variant_value: input.variant_value,
      media: input.media,
    })

    if (match.outcome === "uncertain") {
      await matchByEanWorkflow(container).run({
        input: {
          identifier_value: input.identifier_value,
          identifier_type: input.identifier_type,
          country_scope: input.country_scope ?? null,
          draft_product_id: created.product_id,
          candidate_product_ids: undefined,
        },
      })
    }

    logger.info(
      `[audit] product-cloud created product=${created.product_id} lifecycle=${lifecycle_status} seller=${input.seller_id}`
    )

    return new StepResponse<CreateProductCloudResult>({
      created: true,
      product_id: created.product_id,
      version_id: created.version_id,
      variant_id: created.variant_id,
      identifier_id: created.identifier_id,
      lifecycle_status,
    })
  }
)

export const createProductCloudWorkflow = createWorkflow(
  "create-product-cloud",
  (input: CreateProductCloudInput) => {
    const result = createProductCloudStep(input)
    return new WorkflowResponse(result)
  }
)
