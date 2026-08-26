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

type PublicationStatus =
  | "Concept"
  | "In review"
  | "Goedgekeurd"
  | "Gepubliceerd"
  | "Gearchiveerd"
  | "Verwijderd"

type ProductVersionRow = {
  id: string
  product_id: string
  version_number: number
  title: string
  description: string
  publication_status: PublicationStatus
  created_by_seller_id: string
}

type ProductRow = {
  id: string
  current_owner_seller_id: string
  lifecycle_status: string
}

async function assertOwner(
  productCloud: ProductCloudModuleService,
  productId: string,
  sellerId: string
): Promise<ProductRow> {
  const product = (await productCloud.retrieveProduct(
    productId
  )) as ProductRow
  if (product.current_owner_seller_id !== sellerId) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Alleen de huidige Product Cloud-eigenaar mag deze actie uitvoeren."
    )
  }
  return product
}

export type UpsertConceptInput = {
  product_id: string
  seller_id: string
  title?: string
  description?: string
  /**
   * Producent die de eerste nog niet gepubliceerde bewerking voltooit
   * op Retailer Created → Concept gecontroleerd (§3A).
   */
  is_producer_or_brand_owner?: boolean
}

export type UpsertConceptResult = {
  version: ProductVersionRow
  lifecycle_status: string
}

export const upsertConceptVersionStep = createStep(
  "upsert-concept-version",
  async (input: UpsertConceptInput, { container }) => {
    const productCloud = container.resolve(
      PRODUCT_CLOUD_MODULE
    ) as ProductCloudModuleService
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

    const product = await assertOwner(
      productCloud,
      input.product_id,
      input.seller_id
    )

    const versions = (await productCloud.listProductVersions({
      product_id: input.product_id,
    })) as ProductVersionRow[]

    const activeConcept = versions.find(
      (v) =>
        v.publication_status === "Concept" ||
        v.publication_status === "In review"
    )

    let version: ProductVersionRow

    if (activeConcept) {
      const nextTitle = input.title ?? activeConcept.title
      const nextDescription = input.description ?? activeConcept.description
      const titleChanged =
        input.title !== undefined && input.title !== activeConcept.title
      const descriptionChanged =
        input.description !== undefined &&
        input.description !== activeConcept.description

      const updated = await productCloud.updateProductVersions({
        id: activeConcept.id,
        title: nextTitle,
        description: nextDescription,
        publication_status: "Concept",
      })
      version = (
        Array.isArray(updated) ? updated[0] : updated
      ) as ProductVersionRow

      // ADR-0039: brontekst-wijziging → bestaande vertalingen Verouderd (geen auto-MT).
      if (titleChanged || descriptionChanged) {
        const existingTranslations =
          await productCloud.listProductTranslations({
            entity_type: "product_version",
            entity_id: activeConcept.id,
          })
        const maxSourceVersion = existingTranslations.reduce(
          (max, row) => Math.max(max, Number(row.source_version ?? 1)),
          1
        )
        const field_names: string[] = []
        if (titleChanged) field_names.push("title")
        if (descriptionChanged) field_names.push("description")
        await productCloud.markTranslationsStale({
          entity_type: "product_version",
          entity_id: activeConcept.id,
          new_source_version: maxSourceVersion + 1,
          field_names,
        })
      }
    } else {
      const published = versions
        .filter((v) => v.publication_status === "Gepubliceerd")
        .sort((a, b) => b.version_number - a.version_number)[0]
      const maxNum = versions.reduce(
        (m, v) => Math.max(m, v.version_number),
        0
      )
      version = (await productCloud.createProductVersions({
        product_id: input.product_id,
        version_number: maxNum + 1,
        title: input.title ?? published?.title ?? "Concept",
        description:
          input.description ?? published?.description ?? "Concept",
        publication_status: "Concept",
        created_by_seller_id: input.seller_id,
      })) as ProductVersionRow
    }

    let lifecycle_status = product.lifecycle_status
    if (
      product.lifecycle_status === "Retailer Created" &&
      input.is_producer_or_brand_owner
    ) {
      const updatedProduct = await productCloud.updateProducts({
        id: product.id,
        lifecycle_status: "Concept gecontroleerd",
      })
      lifecycle_status = (
        Array.isArray(updatedProduct) ? updatedProduct[0] : updatedProduct
      ).lifecycle_status
      logger.info(
        `[audit] lifecycle Retailer Created→Concept gecontroleerd product=${product.id} trigger=producer_first_edit`
      )
    }

    return new StepResponse<UpsertConceptResult>({
      version,
      lifecycle_status,
    })
  }
)

export const upsertConceptVersionWorkflow = createWorkflow(
  "upsert-concept-version",
  (input: UpsertConceptInput) => {
    const result = upsertConceptVersionStep(input)
    return new WorkflowResponse(result)
  }
)

export type SubmitVersionInput = {
  product_id: string
  version_id: string
  seller_id: string
}

export const submitVersionStep = createStep(
  "submit-product-version",
  async (input: SubmitVersionInput, { container }) => {
    const productCloud = container.resolve(
      PRODUCT_CLOUD_MODULE
    ) as ProductCloudModuleService
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

    await assertOwner(productCloud, input.product_id, input.seller_id)

    const version = (await productCloud.retrieveProductVersion(
      input.version_id
    )) as ProductVersionRow
    if (version.product_id !== input.product_id) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Versie hoort niet bij dit product."
      )
    }
    if (version.publication_status !== "Concept") {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "Alleen een Concept kan worden ingediend voor review."
      )
    }

    const updated = await productCloud.updateProductVersions({
      id: version.id,
      publication_status: "In review",
      approval_requested_at: new Date(),
      approval_rejection_reason: null,
      approval_decided_at: null,
      approval_decided_by: null,
    })
    const result = (
      Array.isArray(updated) ? updated[0] : updated
    ) as ProductVersionRow

    // Zonder AI-module (later): indienen geldt als geslaagde voorcontrole
    // voor Retailer Created → Concept gecontroleerd (marketplace-core §12 stub).
    const product = (await productCloud.retrieveProduct(
      input.product_id
    )) as ProductRow
    if (product.lifecycle_status === "Retailer Created") {
      await productCloud.updateProducts({
        id: product.id,
        lifecycle_status: "Concept gecontroleerd",
      })
      logger.info(
        `[audit] lifecycle Retailer Created→Concept gecontroleerd product=${product.id} trigger=submit_review`
      )
    }

    logger.info(
      `[audit] version submit version=${version.id} product=${input.product_id}`
    )
    return new StepResponse(result)
  }
)

export const submitVersionWorkflow = createWorkflow(
  "submit-product-version",
  (input: SubmitVersionInput) => {
    const result = submitVersionStep(input)
    return new WorkflowResponse(result)
  }
)

export type PublishVersionInput = {
  product_id: string
  version_id: string
  seller_id: string
}

export const publishVersionStep = createStep(
  "publish-product-version",
  async (input: PublishVersionInput, { container }) => {
    const productCloud = container.resolve(
      PRODUCT_CLOUD_MODULE
    ) as ProductCloudModuleService
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

    const product = await assertOwner(
      productCloud,
      input.product_id,
      input.seller_id
    )

    const version = (await productCloud.retrieveProductVersion(
      input.version_id
    )) as ProductVersionRow
    if (version.product_id !== input.product_id) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Versie hoort niet bij dit product."
      )
    }

    const allowed: PublicationStatus[] = [
      "Concept",
      "In review",
      "Goedgekeurd",
    ]
    if (!allowed.includes(version.publication_status)) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "Deze versie kan niet worden gepubliceerd."
      )
    }

    const media = await productCloud.listProductMedias({
      product_version_id: version.id,
      media_type: "Hoofdafbeelding",
    })
    if (media.length === 0) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Publicatie vereist minimaal één Hoofdafbeelding (Deel B.15 / PM §3)."
      )
    }

    const result = await productCloud.publishVersionGraph({
      product_id: input.product_id,
      version_id: version.id,
      current_lifecycle_status: product.lifecycle_status,
    })

    if (result.lifecycle_status === "Actief" && product.lifecycle_status !== "Actief") {
      logger.info(
        `[audit] lifecycle →Actief product=${product.id} trigger=first_publish`
      )
    }

    return new StepResponse({
      version: result.version as ProductVersionRow,
      lifecycle_status: result.lifecycle_status,
    })
  }
)

export const publishVersionWorkflow = createWorkflow(
  "publish-product-version",
  (input: PublishVersionInput) => {
    const result = publishVersionStep(input)
    return new WorkflowResponse(result)
  }
)

export type AddMediaInput = {
  product_id: string
  version_id: string
  seller_id: string
  media_type: "Hoofdafbeelding" | "Overige afbeelding" | "Video"
  storage_reference: string
}

export const addMediaStep = createStep(
  "add-product-media",
  async (input: AddMediaInput, { container }) => {
    const productCloud = container.resolve(
      PRODUCT_CLOUD_MODULE
    ) as ProductCloudModuleService

    await assertOwner(productCloud, input.product_id, input.seller_id)

    const version = (await productCloud.retrieveProductVersion(
      input.version_id
    )) as ProductVersionRow
    if (version.product_id !== input.product_id) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Versie hoort niet bij dit product."
      )
    }
    if (
      version.publication_status !== "Concept" &&
      version.publication_status !== "In review"
    ) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "Media kan alleen aan een Concept/In review-versie worden toegevoegd."
      )
    }

    const existing = await productCloud.listProductMedias({
      product_version_id: version.id,
    })
    const maxOrder = existing.reduce(
      (max, row: { sort_order?: number | null }) =>
        Math.max(max, Number(row.sort_order ?? 0)),
      -1
    )
    const media = await productCloud.createProductMedias({
      product_version_id: version.id,
      media_type: input.media_type,
      storage_reference: input.storage_reference,
      sort_order: maxOrder + 1,
    })
    return new StepResponse(media)
  }
)

export const addMediaWorkflow = createWorkflow(
  "add-product-media",
  (input: AddMediaInput) => {
    const result = addMediaStep(input)
    return new WorkflowResponse(result)
  }
)

export type OwnerLifecycleInput = {
  product_id: string
  seller_id: string
  target_status: "Uitlopend" | "Niet meer leverbaar"
}

export const ownerLifecycleStep = createStep(
  "owner-lifecycle-transition",
  async (input: OwnerLifecycleInput, { container }) => {
    const productCloud = container.resolve(
      PRODUCT_CLOUD_MODULE
    ) as ProductCloudModuleService
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

    const product = await assertOwner(
      productCloud,
      input.product_id,
      input.seller_id
    )

    const allowedFromUitlopend = ["Actief", "Verified™"]
    const allowedFromNietLeverbaar = ["Actief", "Verified™", "Uitlopend"]

    if (input.target_status === "Uitlopend") {
      if (!allowedFromUitlopend.includes(product.lifecycle_status)) {
        throw new MedusaError(
          MedusaError.Types.NOT_ALLOWED,
          `Kan niet naar Uitlopend vanuit ${product.lifecycle_status}.`
        )
      }
    } else if (
      !allowedFromNietLeverbaar.includes(product.lifecycle_status)
    ) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        `Kan niet naar Niet meer leverbaar vanuit ${product.lifecycle_status}.`
      )
    }

    const updated = await productCloud.updateProducts({
      id: product.id,
      lifecycle_status: input.target_status,
    })
    const result = Array.isArray(updated) ? updated[0] : updated
    logger.info(
      `[audit] lifecycle ${product.lifecycle_status}→${input.target_status} product=${product.id} by=${input.seller_id}`
    )
    return new StepResponse(result)
  }
)

export const ownerLifecycleWorkflow = createWorkflow(
  "owner-lifecycle-transition",
  (input: OwnerLifecycleInput) => {
    const result = ownerLifecycleStep(input)
    return new WorkflowResponse(result)
  }
)

export type AdminArchiveInput = {
  product_id: string
}

export const adminArchiveStep = createStep(
  "admin-archive-product",
  async (input: AdminArchiveInput, { container }) => {
    const productCloud = container.resolve(
      PRODUCT_CLOUD_MODULE
    ) as ProductCloudModuleService
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

    const product = (await productCloud.retrieveProduct(
      input.product_id
    )) as ProductRow
    if (product.lifecycle_status !== "Niet meer leverbaar") {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "Alleen een product in status Niet meer leverbaar mag worden gearchiveerd (PM §3A)."
      )
    }

    const updated = await productCloud.updateProducts({
      id: product.id,
      lifecycle_status: "Gearchiveerd",
    })
    const result = Array.isArray(updated) ? updated[0] : updated
    logger.info(
      `[audit] lifecycle Niet meer leverbaar→Gearchiveerd product=${product.id} by=admin`
    )
    return new StepResponse(result)
  }
)

export const adminArchiveWorkflow = createWorkflow(
  "admin-archive-product",
  (input: AdminArchiveInput) => {
    const result = adminArchiveStep(input)
    return new WorkflowResponse(result)
  }
)

export type AdminDecideVersionInput = {
  product_id: string
  version_id: string
  actor_id: string
  decision: "approved" | "rejected"
  reason?: string
}

export const adminDecideVersionStep = createStep(
  "admin-decide-product-version",
  async (input: AdminDecideVersionInput, { container }) => {
    const productCloud = container.resolve(
      PRODUCT_CLOUD_MODULE
    ) as ProductCloudModuleService
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

    const product = (await productCloud.retrieveProduct(
      input.product_id
    )) as ProductRow
    const version = (await productCloud.retrieveProductVersion(
      input.version_id
    )) as ProductVersionRow
    if (version.product_id !== input.product_id) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Versie hoort niet bij dit product."
      )
    }
    if (version.publication_status !== "In review") {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "Alleen producten in productgoedkeuring (In review) kunnen worden beoordeeld."
      )
    }

    if (input.decision === "rejected") {
      const reason = (input.reason || "").trim()
      if (!reason) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          "Bij afwijzen is een reden verplicht."
        )
      }
      const updated = await productCloud.updateProductVersions({
        id: version.id,
        publication_status: "Concept",
        approval_rejection_reason: reason,
        approval_decided_at: new Date(),
        approval_decided_by: input.actor_id,
      })
      await productCloud.createProductFieldChanges({
        product_id: input.product_id,
        product_version_id: version.id,
        seller_id: "admin",
        actor_customer_id: input.actor_id,
        field_code: "publication.approval",
        field_label: "Productgoedkeuring",
        old_value: "In review",
        new_value: `rejected:${reason}`,
        status: "rejected",
        reason,
      })
      logger.info(
        `[audit] product approval rejected product=${input.product_id} version=${version.id}`
      )
      return new StepResponse({
        version: (Array.isArray(updated) ? updated[0] : updated) as ProductVersionRow,
        lifecycle_status: product.lifecycle_status,
        decision: "rejected" as const,
      })
    }

    const published = await productCloud.publishVersionGraph({
      product_id: input.product_id,
      version_id: version.id,
      current_lifecycle_status: product.lifecycle_status,
    })
    await productCloud.updateProductVersions({
      id: version.id,
      approval_rejection_reason: null,
      approval_decided_at: new Date(),
      approval_decided_by: input.actor_id,
    })
    await productCloud.createProductFieldChanges({
      product_id: input.product_id,
      product_version_id: version.id,
      seller_id: "admin",
      actor_customer_id: input.actor_id,
      field_code: "publication.approval",
      field_label: "Productgoedkeuring",
      old_value: "In review",
      new_value: "Gepubliceerd",
      status: "approved",
      reason: input.reason || "Goedgekeurd door EuropMade",
    })
    logger.info(
      `[audit] product approval approved product=${input.product_id} version=${version.id}`
    )
    return new StepResponse({
      version: published.version as ProductVersionRow,
      lifecycle_status: published.lifecycle_status,
      decision: "approved" as const,
    })
  }
)

export const adminDecideVersionWorkflow = createWorkflow(
  "admin-decide-product-version",
  (input: AdminDecideVersionInput) => {
    const result = adminDecideVersionStep(input)
    return new WorkflowResponse(result)
  }
)
