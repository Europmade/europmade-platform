import {
  InjectManager,
  InjectTransactionManager,
  MedusaContext,
  MedusaService,
} from "@medusajs/framework/utils"
import type { Context } from "@medusajs/framework/types"
import {
  ProductFamily,
  Product,
  ProductVersion,
  ProductVariant,
  Identifier,
  Category,
  ProductCategory,
  AttributeDefinition,
  AttributeValue,
  OwnershipRecord,
  Claim,
  Dispute,
  MatchCandidate,
  MergeRecord,
  SplitRecord,
  ProductMedia,
  ChangeProposal,
} from "./models"

export type CreateProductGraphInput = {
  seller_id: string
  brand_id: string
  manufacturer_id: string
  lifecycle_status: "Retailer Created" | "Concept gecontroleerd"
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

export type CreateProductGraphResult = {
  product_id: string
  version_id: string
  variant_id: string
  identifier_id: string
  lifecycle_status: string
}

export type ApproveClaimTransferInput = {
  claim_id: string
  product_id: string
  claimant_seller_id: string
  current_lifecycle_status: string
}

export type PublishVersionGraphInput = {
  product_id: string
  version_id: string
  current_lifecycle_status: string
}

/**
 * Product Cloud-module — Blueprint `11-medusa-architecture.md` §3 + ADR-0008.
 * Deel B (+ B.15 media) + ADR-0009 ChangeProposal.
 *
 * Meerstaps-mutaties (create / claim-approve / publish) lopen via
 * `@InjectTransactionManager` zodat bij een fout niets gedeeltelijk blijft staan.
 */
class ProductCloudModuleService extends MedusaService({
  ProductFamily,
  Product,
  ProductVersion,
  ProductVariant,
  Identifier,
  Category,
  ProductCategory,
  AttributeDefinition,
  AttributeValue,
  OwnershipRecord,
  Claim,
  Dispute,
  MatchCandidate,
  MergeRecord,
  SplitRecord,
  ProductMedia,
  ChangeProposal,
}) {
  @InjectManager()
  async createProductGraph(
    input: CreateProductGraphInput,
    @MedusaContext() sharedContext: Context = {}
  ): Promise<CreateProductGraphResult> {
    return await this.createProductGraph_(input, sharedContext)
  }

  @InjectTransactionManager()
  protected async createProductGraph_(
    input: CreateProductGraphInput,
    @MedusaContext() sharedContext: Context = {}
  ): Promise<CreateProductGraphResult> {
    const product = await this.createProducts(
      {
        brand_id: input.brand_id,
        manufacturer_id: input.manufacturer_id,
        current_owner_seller_id: input.seller_id,
        lifecycle_status: input.lifecycle_status,
      },
      sharedContext
    )

    await this.createOwnershipRecords(
      {
        product_id: product.id,
        seller_id: input.seller_id,
        valid_from: new Date(),
        valid_until: null,
        transfer_reason: null,
      },
      sharedContext
    )

    const version = await this.createProductVersions(
      {
        product_id: product.id,
        version_number: 1,
        title: input.title,
        description: input.description,
        publication_status: "Concept",
        created_by_seller_id: input.seller_id,
      },
      sharedContext
    )

    for (const m of input.media ?? []) {
      await this.createProductMedias(
        {
          product_version_id: version.id,
          media_type: m.media_type,
          storage_reference: m.storage_reference,
        },
        sharedContext
      )
    }

    const variant = await this.createProductVariants(
      {
        product_id: product.id,
        variant_type: input.variant_type ?? "Uitvoering",
        variant_value: input.variant_value ?? "Standaard",
      },
      sharedContext
    )

    const identifier = await this.createIdentifiers(
      {
        product_variant_id: variant.id,
        identifier_type: input.identifier_type,
        identifier_value: input.identifier_value.trim(),
        country_scope: input.country_scope ?? null,
      },
      sharedContext
    )

    let category = (
      await this.listCategories(
        { name: input.category_name },
        {},
        sharedContext
      )
    )[0]
    if (!category) {
      category = await this.createCategories(
        { name: input.category_name },
        sharedContext
      )
    }
    await this.createProductCategories(
      {
        product_id: product.id,
        category_id: category.id,
      },
      sharedContext
    )

    return {
      product_id: product.id,
      version_id: version.id,
      variant_id: variant.id,
      identifier_id: identifier.id,
      lifecycle_status: input.lifecycle_status,
    }
  }

  @InjectManager()
  async approveClaimTransfer(
    input: ApproveClaimTransferInput,
    @MedusaContext() sharedContext: Context = {}
  ) {
    return await this.approveClaimTransfer_(input, sharedContext)
  }

  @InjectTransactionManager()
  protected async approveClaimTransfer_(
    input: ApproveClaimTransferInput,
    @MedusaContext() sharedContext: Context = {}
  ) {
    const now = new Date()

    // Filter in JS: MikroORM/Medusa null-equality filters are unreliable,
    // and we must close every active row before inserting the next (partial unique).
    const ownershipRows = await this.listOwnershipRecords(
      { product_id: input.product_id },
      {},
      sharedContext
    )
    const currentOwnership = ownershipRows.filter(
      (own) => own.valid_until == null
    )
    for (const own of currentOwnership) {
      await this.updateOwnershipRecords(
        {
          id: own.id,
          valid_until: now,
        },
        sharedContext
      )
    }

    // Flush closes before insert so PG partial unique
    // (product_id WHERE valid_until IS NULL) does not see two active rows.
    const manager =
      sharedContext.transactionManager ?? sharedContext.manager
    if (manager && typeof (manager as { flush?: () => Promise<void> }).flush === "function") {
      await (manager as { flush: () => Promise<void> }).flush()
    }

    await this.createOwnershipRecords(
      {
        product_id: input.product_id,
        seller_id: input.claimant_seller_id,
        valid_from: now,
        valid_until: null,
        transfer_reason: `Claim goedgekeurd: ${input.claim_id}`,
      },
      sharedContext
    )

    const lifecyclePatch: {
      id: string
      current_owner_seller_id: string
      lifecycle_status?: string
    } = {
      id: input.product_id,
      current_owner_seller_id: input.claimant_seller_id,
    }
    if (input.current_lifecycle_status === "Retailer Created") {
      lifecyclePatch.lifecycle_status = "Concept gecontroleerd"
    }
    await this.updateProducts(lifecyclePatch, sharedContext)

    const updated = await this.updateClaims(
      {
        id: input.claim_id,
        status: "Goedgekeurd",
        decision_reason: null,
      },
      sharedContext
    )

    const others = await this.listClaims(
      {
        product_id: input.product_id,
        status: "In beoordeling",
      },
      {},
      sharedContext
    )
    for (const other of others) {
      if (other.id === input.claim_id) continue
      await this.updateClaims(
        {
          id: other.id,
          status: "Afgewezen",
          decision_reason:
            "Andere claim goedgekeurd; eigendom is overgedragen.",
        },
        sharedContext
      )
    }

    const openDisputes = await this.listDisputes(
      {
        product_id: input.product_id,
        status: "Open",
      },
      {},
      sharedContext
    )
    for (const d of openDisputes) {
      await this.updateDisputes(
        {
          id: d.id,
          status: "Overdracht",
        },
        sharedContext
      )
    }

    return Array.isArray(updated) ? updated[0] : updated
  }

  @InjectManager()
  async publishVersionGraph(
    input: PublishVersionGraphInput,
    @MedusaContext() sharedContext: Context = {}
  ) {
    return await this.publishVersionGraph_(input, sharedContext)
  }

  @InjectTransactionManager()
  protected async publishVersionGraph_(
    input: PublishVersionGraphInput,
    @MedusaContext() sharedContext: Context = {}
  ) {
    const published = await this.listProductVersions(
      {
        product_id: input.product_id,
        publication_status: "Gepubliceerd",
      },
      {},
      sharedContext
    )
    for (const prev of published) {
      await this.updateProductVersions(
        {
          id: prev.id,
          publication_status: "Gearchiveerd",
        },
        sharedContext
      )
    }

    const updated = await this.updateProductVersions(
      {
        id: input.version_id,
        publication_status: "Gepubliceerd",
      },
      sharedContext
    )
    const publishedVersion = Array.isArray(updated) ? updated[0] : updated

    let lifecycle_status = input.current_lifecycle_status
    if (
      input.current_lifecycle_status === "Retailer Created" ||
      input.current_lifecycle_status === "Concept gecontroleerd"
    ) {
      if (input.current_lifecycle_status === "Retailer Created") {
        await this.updateProducts(
          {
            id: input.product_id,
            lifecycle_status: "Concept gecontroleerd",
          },
          sharedContext
        )
      }
      const after = await this.updateProducts(
        {
          id: input.product_id,
          lifecycle_status: "Actief",
        },
        sharedContext
      )
      lifecycle_status = (Array.isArray(after) ? after[0] : after)
        .lifecycle_status
    }

    return {
      version: publishedVersion,
      lifecycle_status,
    }
  }
}

export default ProductCloudModuleService
