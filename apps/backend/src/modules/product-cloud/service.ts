import {
  InjectManager,
  InjectTransactionManager,
  MedusaContext,
  MedusaError,
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
  ProductDocument,
  ProductTranslation,
  ProductRelation,
  ChangeProposal,
  ProductFieldChange,
  ProductSectionReview,
  ProductLinkGroup,
  ProductLinkMember,
} from "./models"
import type { ProductCloudIdentifierType } from "./identifier-types"
import {
  catalogForCategorySlug,
  categoryLookupSlugs,
  resolveRequirementTier,
  type AttributeCatalogItem,
} from "./category-attributes"
import {
  isTranslatableField,
  inferContentTypeFromField,
  normalizeLanguageCode,
  targetLanguagesForSource,
  isActiveProductCloudLanguage,
} from "./languages"
import {
  getTranslationProvider,
  TranslationProviderNotConfiguredError,
} from "./translation/provider"
import {
  resolveLocalizedFields,
  type LocalizedFieldResolution,
} from "./translation/resolve"
import {
  shouldEnqueueTarget,
  shouldMarkTranslationStale,
} from "./translation/workflow"
import { buildLanguageCoverage, pickTranslationVersion } from "./translation/coverage"
import {
  applyProductLinkGroupDecision,
  assertAdminCanDecideProductLink,
  assertMembersReadyForActivation,
  assertProductsFreeForActivation,
  isActiveConsumableLinkGroup,
  normalizeProductLinkProposal,
  serializeProductLinkGroup,
  type ProductLinkProposalInput,
} from "./product-link-groups"

export type CreateProductGraphInput = {
  seller_id: string
  brand_id: string
  manufacturer_id: string
  lifecycle_status: "Retailer Created" | "Concept gecontroleerd"
  title: string
  description: string
  category_name: string
  category_names?: string[]
  identifier_type: ProductCloudIdentifierType
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
  /** Optional manufacturer part number (separate from GTIN / seller SKU). */
  mpn?: string | null
  source_language_code?: string | null
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
  ProductDocument,
  ProductTranslation,
  ProductRelation,
  ChangeProposal,
  ProductFieldChange,
  ProductSectionReview,
  ProductLinkGroup,
  ProductLinkMember,
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
        source_language_code: input.source_language_code
          ? normalizeLanguageCode(input.source_language_code)
          : null,
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

    const mpn = input.mpn?.trim()
    if (mpn && !(input.identifier_type === "MPN" && input.identifier_value.trim() === mpn)) {
      await this.createIdentifiers(
        {
          product_variant_id: variant.id,
          identifier_type: "MPN",
          identifier_value: mpn,
          country_scope: null,
        },
        sharedContext
      )
    }

    const categoryNames = [
      ...(input.category_names ?? []),
      input.category_name,
    ]
      .map((name) => name.trim())
      .filter(Boolean)
      .filter((name, index, arr) => arr.indexOf(name) === index)

    for (const categoryName of categoryNames) {
      let category: Category | undefined
      for (const slug of categoryLookupSlugs(categoryName)) {
        category = (
          await this.listCategories({ slug }, {}, sharedContext)
        )[0]
        if (category) break
      }
      if (!category) {
        category = (
          await this.listCategories(
            { name: categoryName },
            {},
            sharedContext
          )
        )[0]
      }
      if (!category) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `Categorie bestaat niet: ${categoryName}. Kies een bestaande categorie of stel er een voor.`
        )
      }
      await this.createProductCategories(
        {
          product_id: product.id,
          category_id: category.id,
        },
        sharedContext
      )
    }

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
      lifecycle_status?:
        | "Retailer Created"
        | "Concept gecontroleerd"
        | "Actief"
        | "Verified™"
        | "Uitlopend"
        | "Niet meer leverbaar"
        | "Gearchiveerd"
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

  /** Ensure category-scoped attribute definitions exist (idempotent). */
  @InjectManager()
  async ensureCategoryAttributeCatalog(
    categoryId: string,
    categorySlug: string,
    @MedusaContext() sharedContext: Context = {}
  ): Promise<{ created: number; existing: number }> {
    return await this.ensureCategoryAttributeCatalog_(
      categoryId,
      categorySlug,
      sharedContext
    )
  }

  @InjectTransactionManager()
  protected async ensureCategoryAttributeCatalog_(
    categoryId: string,
    categorySlug: string,
    @MedusaContext() sharedContext: Context = {}
  ): Promise<{ created: number; existing: number }> {
    const catalog = catalogForCategorySlug(categorySlug)
    let created = 0
    let existing = 0
    for (const item of catalog) {
      const found = (
        await this.listAttributeDefinitions(
          { category_id: categoryId, code: item.code },
          {},
          sharedContext
        )
      )[0]
      if (found) {
        existing += 1
        // Upgrade tier / is_required if catalog is stricter
        const tier = resolveRequirementTier(item)
        const nextOptions = item.option_values
          ? JSON.stringify(item.option_values)
          : null
        if (
          found.requirement_tier !== tier ||
          found.is_required !== item.is_required ||
          found.name !== item.name ||
          found.option_values !== nextOptions ||
          (item.help_text && found.help_text !== item.help_text) ||
          (item.unit && found.unit !== item.unit)
        ) {
          await this.updateAttributeDefinitions(
            {
              id: found.id,
              name: item.name,
              requirement_tier: tier,
              is_required: item.is_required,
              option_values: nextOptions,
              unit: item.unit ?? found.unit ?? null,
              help_text: item.help_text ?? found.help_text ?? null,
            },
            sharedContext
          )
        }
        continue
      }
      await this.createAttributeDefinitions(
        {
          category_id: categoryId,
          name: item.name,
          code: item.code,
          data_type: item.data_type,
          is_required: item.is_required,
          requirement_tier: resolveRequirementTier(item),
          unit: item.unit ?? null,
          help_text: item.help_text ?? null,
          is_active: true,
          is_filterable: item.is_filterable ?? true,
          is_comparable: item.is_comparable ?? true,
          sort_order: item.sort_order ?? 0,
          option_values: item.option_values
            ? JSON.stringify(item.option_values)
            : null,
        },
        sharedContext
      )
      created += 1
    }
    return { created, existing }
  }

  /** Upsert structured attribute values on a product version. */
  @InjectManager()
  async setVersionAttributeValues(
    input: {
      product_version_id: string
      values: Array<{ attribute_definition_id: string; value: string }>
    },
    @MedusaContext() sharedContext: Context = {}
  ) {
    const out: unknown[] = []
    for (const row of input.values) {
      const existing = (
        await this.listAttributeValues(
          {
            product_version_id: input.product_version_id,
            attribute_definition_id: row.attribute_definition_id,
          },
          {},
          sharedContext
        )
      )[0]
      if (existing) {
        out.push(
          await this.updateAttributeValues(
            { id: existing.id, value: row.value },
            sharedContext
          )
        )
      } else {
        out.push(
          await this.createAttributeValues(
            {
              product_version_id: input.product_version_id,
              attribute_definition_id: row.attribute_definition_id,
              value: row.value,
            },
            sharedContext
          )
        )
      }
    }
    return out
  }

  /** Upsert a localized field (ADR-0039: versioning + origin). */
  @InjectManager()
  async upsertTranslation(
    input: {
      entity_type: "product_version" | "category" | "attribute_definition"
      entity_id: string
      field_name: string
      language_code: string
      value: string
      source_language_code?: string | null
      source_value?: string | null
      translation_status?:
        | "Ontbreekt"
        | "Concept"
        | "Machine"
        | "Beoordeeld"
        | "Gepubliceerd"
        | "Verouderd"
        | "Mislukt"
      translation_version?: number
      source_version?: number
      origin?: "machine" | "manual"
      updated_by?: string | null
      /** When false (default), refuse to overwrite origin=manual unless force. */
      force_overwrite_manual?: boolean
    },
    @MedusaContext() sharedContext: Context = {}
  ) {
    const existing = (
      await this.listProductTranslations(
        {
          entity_type: input.entity_type,
          entity_id: input.entity_id,
          field_name: input.field_name,
          language_code: input.language_code,
        },
        {},
        sharedContext
      )
    )[0]

    if (
      existing &&
      existing.origin === "manual" &&
      !input.force_overwrite_manual &&
      input.origin !== "manual"
    ) {
      return existing
    }

    const payload = {
      value: input.value,
      source_language_code: input.source_language_code ?? null,
      source_value: input.source_value ?? null,
      translation_status: input.translation_status ?? "Concept",
      translation_version:
        input.translation_version ??
        (existing ? Number(existing.translation_version) + 1 : 1),
      source_version: input.source_version ?? existing?.source_version ?? 1,
      origin: input.origin ?? existing?.origin ?? "machine",
      updated_by: input.updated_by ?? existing?.updated_by ?? null,
    }
    if (existing) {
      return await this.updateProductTranslations(
        { id: existing.id, ...payload },
        sharedContext
      )
    }
    return await this.createProductTranslations(
      {
        entity_type: input.entity_type,
        entity_id: input.entity_id,
        field_name: input.field_name,
        language_code: input.language_code,
        ...payload,
      },
      sharedContext
    )
  }

  @InjectManager()
  async addProductDocument(
    input: {
      product_version_id: string
      document_type:
        | "CE-certificaat"
        | "Overig compliance-document"
        | "Autorisatiebewijs"
        | "Handleiding"
        | "Veiligheidsinformatieblad"
        | "Garantiebewijs"
        | "Conformiteitsverklaring"
      storage_reference: string
      distributor_authorization_id?: string | null
    },
    @MedusaContext() sharedContext: Context = {}
  ) {
    return await this.createProductDocuments(
      {
        product_version_id: input.product_version_id,
        document_type: input.document_type,
        storage_reference: input.storage_reference,
        distributor_authorization_id:
          input.distributor_authorization_id ?? null,
      },
      sharedContext
    )
  }

  @InjectManager()
  async linkProducts(
    input: {
      from_product_id: string
      to_product_id: string
      relation_type:
        | "Vergelijkbaar"
        | "Accessoire"
        | "Gerelateerd"
        | "VaakSamenGekocht"
        | "Alternatief"
    },
    @MedusaContext() sharedContext: Context = {}
  ) {
    const existing = (
      await this.listProductRelations(
        {
          from_product_id: input.from_product_id,
          to_product_id: input.to_product_id,
          relation_type: input.relation_type,
        },
        {},
        sharedContext
      )
    )[0]
    if (existing) return existing
    return await this.createProductRelations(input, sharedContext)
  }

  @InjectManager()
  async submitProductLinkGroupProposal(
    input: ProductLinkProposalInput,
    submitterSellerId: string,
    @MedusaContext() sharedContext: Context = {}
  ) {
    return await this.submitProductLinkGroupProposal_(
      input,
      submitterSellerId,
      sharedContext
    )
  }

  @InjectTransactionManager()
  protected async submitProductLinkGroupProposal_(
    input: ProductLinkProposalInput,
    submitterSellerId: string,
    @MedusaContext() sharedContext: Context = {}
  ) {
    const requestedIds = [
      ...new Set(
        (input.members || [])
          .map((m) => (typeof m?.product_id === "string" ? m.product_id.trim() : ""))
          .filter(Boolean)
      ),
    ]
    const found =
      requestedIds.length > 0
        ? await this.listProducts({ id: requestedIds }, {}, sharedContext)
        : []
    const existingIds = new Set(
      (found as Array<{ id: string }>).map((row) => row.id)
    )
    const normalized = normalizeProductLinkProposal(
      input,
      submitterSellerId,
      existingIds
    )
    const group = await this.createProductLinkGroups(
      {
        name: normalized.name,
        dimensions: normalized.dimensions,
        status: "proposed",
        submitter_seller_id: normalized.submitter_seller_id,
        note: normalized.note,
      },
      sharedContext
    )
    const members = await this.createProductLinkMembers(
      normalized.members.map((member) => ({
        group_id: (group as { id: string }).id,
        product_id: member.product_id,
        values: member.values,
        values_key: member.values_key,
        sort_order: member.sort_order,
        is_active_slot: false,
      })),
      sharedContext
    )
    return serializeProductLinkGroup(
      group as Parameters<typeof serializeProductLinkGroup>[0],
      members as Parameters<typeof serializeProductLinkGroup>[1]
    )
  }

  @InjectManager()
  async listSerializedProductLinkGroups(
    filter: Record<string, unknown> = {},
    @MedusaContext() sharedContext: Context = {}
  ) {
    const groups = (await this.listProductLinkGroups(
      filter,
      { order: { created_at: "DESC" }, take: 200 },
      sharedContext
    )) as Array<Parameters<typeof serializeProductLinkGroup>[0] & { id: string }>
    const groupIds = groups.map((g) => g.id)
    const members =
      groupIds.length > 0
        ? ((await this.listProductLinkMembers(
            { group_id: groupIds },
            {},
            sharedContext
          )) as Array<
            Parameters<typeof serializeProductLinkGroup>[1][number] & {
              group_id: string
            }
          >)
        : []
    const byGroup = new Map<string, typeof members>()
    for (const member of members) {
      const list = byGroup.get(member.group_id) || []
      list.push(member)
      byGroup.set(member.group_id, list)
    }
    const serialized = groups.map((group) =>
      serializeProductLinkGroup(group, byGroup.get(group.id) || [])
    )
    return this.enrichProductLinkGroupsWithTitles_(serialized, sharedContext)
  }

  @InjectManager()
  async retrieveSerializedProductLinkGroup(
    id: string,
    @MedusaContext() sharedContext: Context = {}
  ) {
    const group = (await this.retrieveProductLinkGroup(
      id,
      {},
      sharedContext
    )) as Parameters<typeof serializeProductLinkGroup>[0] & { id: string }
    const members = (await this.listProductLinkMembers(
      { group_id: id },
      { order: { sort_order: "ASC" } },
      sharedContext
    )) as Parameters<typeof serializeProductLinkGroup>[1]
    const [enriched] = await this.enrichProductLinkGroupsWithTitles_(
      [serializeProductLinkGroup(group, members)],
      sharedContext
    )
    return enriched
  }

  @InjectManager()
  async getActiveProductLinkGroupForProduct(
    productId: string,
    @MedusaContext() sharedContext: Context = {}
  ) {
    const slots = (await this.listProductLinkMembers(
      { product_id: productId, is_active_slot: true },
      {},
      sharedContext
    )) as Array<{ group_id: string }>
    if (!slots.length) return null
    const group = (await this.retrieveProductLinkGroup(
      slots[0].group_id,
      {},
      sharedContext
    )) as Parameters<typeof serializeProductLinkGroup>[0] & {
      id: string
      status: string
    }
    if (group.status !== "active") return null
    const members = (await this.listProductLinkMembers(
      { group_id: group.id },
      { order: { sort_order: "ASC" } },
      sharedContext
    )) as Parameters<typeof serializeProductLinkGroup>[1]
    if (!isActiveConsumableLinkGroup(group, members)) return null
    const [enriched] = await this.enrichProductLinkGroupsWithTitles_(
      [serializeProductLinkGroup(group, members)],
      sharedContext
    )
    return enriched
  }

  @InjectManager()
  async decideProductLinkGroup(
    groupId: string,
    input: { decision: string; decision_reason?: string | null },
    actor: { actor_id: string; actor_type?: string },
    @MedusaContext() sharedContext: Context = {}
  ) {
    return await this.decideProductLinkGroup_(
      groupId,
      input,
      actor,
      sharedContext
    )
  }

  @InjectTransactionManager()
  protected async decideProductLinkGroup_(
    groupId: string,
    input: { decision: string; decision_reason?: string | null },
    actor: { actor_id: string; actor_type?: string },
    @MedusaContext() sharedContext: Context = {}
  ) {
    assertAdminCanDecideProductLink(actor.actor_type)
    const group = (await this.retrieveProductLinkGroup(
      groupId,
      {},
      sharedContext
    )) as Parameters<typeof serializeProductLinkGroup>[0] & {
      id: string
      status: string
    }
    const members = (await this.listProductLinkMembers(
      { group_id: groupId },
      { order: { sort_order: "ASC" } },
      sharedContext
    )) as Array<
      Parameters<typeof serializeProductLinkGroup>[1][number] & {
        id: string
        product_id: string
        values_key: string
      }
    >
    const decision = applyProductLinkGroupDecision({
      currentStatus: group.status,
      decision: input.decision,
      decision_reason: input.decision_reason,
      decided_by: actor.actor_id,
    })
    if (decision.status === "active") {
      const productIds = members.map((m) => m.product_id)
      const found =
        productIds.length > 0
          ? await this.listProducts({ id: productIds }, {}, sharedContext)
          : []
      assertMembersReadyForActivation(
        members,
        new Set((found as Array<{ id: string }>).map((row) => row.id))
      )
      const activeSlots =
        productIds.length > 0
          ? ((await this.listProductLinkMembers(
              { product_id: productIds, is_active_slot: true },
              {},
              sharedContext
            )) as Array<{ product_id: string; group_id: string }>)
          : []
      assertProductsFreeForActivation(
        productIds,
        activeSlots
          .filter((slot) => slot.group_id !== groupId)
          .map((slot) => slot.product_id)
      )
    }

    const updatedGroup = await this.updateProductLinkGroups(
      {
        id: groupId,
        status: decision.status,
        decision_reason: decision.decision_reason,
        decided_by: decision.decided_by,
        decided_at: decision.decided_at,
      },
      sharedContext
    )
    let updatedMembers = members
    if (decision.members_active_slot) {
      for (const member of members) {
        await this.updateProductLinkMembers(
          { id: member.id, is_active_slot: true },
          sharedContext
        )
      }
      updatedMembers = (await this.listProductLinkMembers(
        { group_id: groupId },
        { order: { sort_order: "ASC" } },
        sharedContext
      )) as typeof members
    }

    const serialized = serializeProductLinkGroup(
      updatedGroup as Parameters<typeof serializeProductLinkGroup>[0],
      updatedMembers
    )
    const [enriched] = await this.enrichProductLinkGroupsWithTitles_(
      [serialized],
      sharedContext
    )
    return enriched
  }

  protected async enrichProductLinkGroupsWithTitles_(
    groups: Array<ReturnType<typeof serializeProductLinkGroup>>,
    sharedContext: Context
  ) {
    const productIds = [
      ...new Set(groups.flatMap((g) => g.members.map((m) => m.product_id))),
    ]
    if (!productIds.length) return groups
    const versions = (await this.listProductVersions(
      { product_id: productIds },
      { take: 500, order: { version_number: "DESC" } },
      sharedContext
    )) as Array<{
      product_id: string
      title: string
      publication_status: string
      version_number: number
    }>
    const titles = new Map<string, string>()
    for (const version of versions) {
      if (version.publication_status === "Gepubliceerd") {
        titles.set(version.product_id, version.title)
      } else if (!titles.has(version.product_id)) {
        titles.set(version.product_id, version.title)
      }
    }
    return groups.map((group) => ({
      ...group,
      members: group.members.map((member) => ({
        ...member,
        product_title: titles.get(member.product_id) ?? null,
      })),
    }))
  }

  /**
   * Resolve localized fields with source fallback (ADR-0039).
   * Storefront mode: only Gepubliceerd. Never overwrites source content.
   */
  @InjectManager()
  async resolveLocalizedEntityFields(
    input: {
      entity_type: "product_version" | "category" | "attribute_definition"
      entity_id: string
      locale: string
      source_language_code?: string | null
      source_fields: Record<string, string>
      mode?: "storefront" | "preview"
    },
    @MedusaContext() sharedContext: Context = {}
  ): Promise<LocalizedFieldResolution[]> {
    const translations = await this.listProductTranslations(
      {
        entity_type: input.entity_type,
        entity_id: input.entity_id,
      },
      {},
      sharedContext
    )
    return resolveLocalizedFields({
      locale: input.locale,
      source_language_code: input.source_language_code,
      source_fields: input.source_fields,
      mode: input.mode ?? "storefront",
      translations: translations.map((t) => ({
        field_name: t.field_name,
        language_code: t.language_code,
        value: t.value,
        source_language_code: t.source_language_code,
        source_value: t.source_value,
        translation_status: t.translation_status,
        origin: t.origin,
        source_version: t.source_version,
      })),
    })
  }

  /**
   * Mark existing translations stale after source content changed.
   * Does NOT overwrite values or auto-retranslate (ADR-0039).
   */
  @InjectManager()
  async markTranslationsStale(
    input: {
      entity_type: "product_version" | "category" | "attribute_definition"
      entity_id: string
      new_source_version: number
      field_names?: string[]
    },
    @MedusaContext() sharedContext: Context = {}
  ) {
    const rows = await this.listProductTranslations(
      {
        entity_type: input.entity_type,
        entity_id: input.entity_id,
      },
      {},
      sharedContext
    )
    const updated = []
    for (const row of rows) {
      if (
        input.field_names &&
        !input.field_names.includes(row.field_name)
      ) {
        continue
      }
      if (
        !shouldMarkTranslationStale({
          translation_status: row.translation_status,
          source_version: Number(row.source_version),
          new_source_version: input.new_source_version,
        })
      ) {
        continue
      }
      updated.push(
        await this.updateProductTranslations(
          {
            id: row.id,
            translation_status: "Verouderd",
          },
          sharedContext
        )
      )
    }
    return { marked: updated.length, translations: updated }
  }

  /** Publish a translation for storefront use. */
  @InjectManager()
  async publishTranslation(
    input: {
      entity_type: "product_version" | "category" | "attribute_definition"
      entity_id: string
      field_name: string
      language_code: string
      updated_by?: string | null
    },
    @MedusaContext() sharedContext: Context = {}
  ) {
    const existing = (
      await this.listProductTranslations(
        {
          entity_type: input.entity_type,
          entity_id: input.entity_id,
          field_name: input.field_name,
          language_code: input.language_code,
        },
        {},
        sharedContext
      )
    )[0]
    if (!existing || !existing.value?.trim()) {
      throw new Error("cannot_publish_empty_translation")
    }
    if (
      existing.translation_status === "Ontbreekt" ||
      existing.translation_status === "Mislukt"
    ) {
      throw new Error("cannot_publish_failed_or_missing")
    }
    return await this.updateProductTranslations(
      {
        id: existing.id,
        translation_status: "Gepubliceerd",
        updated_by: input.updated_by ?? existing.updated_by,
      },
      sharedContext
    )
  }

  /** Manual override — protected from automatic overwrite. */
  @InjectManager()
  async saveManualTranslation(
    input: {
      entity_type: "product_version" | "category" | "attribute_definition"
      entity_id: string
      field_name: string
      language_code: string
      value: string
      source_language_code?: string | null
      source_value?: string | null
      source_version?: number
      updated_by?: string | null
      publish?: boolean
    },
    @MedusaContext() sharedContext: Context = {}
  ) {
    return await this.upsertTranslation(
      {
        entity_type: input.entity_type,
        entity_id: input.entity_id,
        field_name: input.field_name,
        language_code: input.language_code,
        value: input.value,
        source_language_code: input.source_language_code,
        source_value: input.source_value,
        source_version: input.source_version,
        origin: "manual",
        translation_status: input.publish ? "Gepubliceerd" : "Beoordeeld",
        updated_by: input.updated_by ?? null,
        force_overwrite_manual: true,
      },
      sharedContext
    )
  }

  /**
   * Enqueue / run machine translation for source → other active languages.
   * Without provider: Ontbreekt placeholders. Manual rows skipped unless force.
   */
  @InjectManager()
  async enqueueMachineTranslations(
    input: {
      entity_type: "product_version" | "category" | "attribute_definition"
      entity_id: string
      source_language_code: string
      source_fields: Record<string, string>
      target_language_codes?: string[]
      source_version?: number
      content_type?: string
      category?: string
      force_overwrite_manual?: boolean
      only_stale?: boolean
      /** Only create/update when row is missing or Ontbreekt. */
      only_missing?: boolean
      /** Only retry rows with status Mislukt. */
      only_failed?: boolean
      auto_publish?: boolean
      updated_by?: string | null
    },
    @MedusaContext() sharedContext: Context = {}
  ): Promise<{
    provider_id: string
    provider_configured: boolean
    results: Array<{
      field_name: string
      language_code: string
      translation_status: string
      value: string
      origin?: string
      skipped?: boolean
      error?: string
    }>
  }> {
    const source = normalizeLanguageCode(input.source_language_code)
    const targets =
      input.target_language_codes?.map(normalizeLanguageCode).filter(Boolean) ??
      targetLanguagesForSource(source)
    const sourceVersion = input.source_version ?? 1

    const provider = getTranslationProvider()
    const providerConfigured = provider.id !== "none"
    const results: Array<{
      field_name: string
      language_code: string
      translation_status: string
      value: string
      origin?: string
      skipped?: boolean
      error?: string
    }> = []

    for (const [field_name, source_value] of Object.entries(
      input.source_fields
    )) {
      if (!isTranslatableField(field_name)) {
        results.push({
          field_name,
          language_code: source,
          translation_status: "skipped",
          value: source_value,
          skipped: true,
          error: "field_not_translatable",
        })
        continue
      }
      if (!source_value?.trim()) continue

      const contentType =
        input.content_type ?? inferContentTypeFromField(field_name)

      for (const target of targets) {
        if (target === source) continue

        const existing = (
          await this.listProductTranslations(
            {
              entity_type: input.entity_type,
              entity_id: input.entity_id,
              field_name,
              language_code: target,
            },
            {},
            sharedContext
          )
        )[0]

        const decision = shouldEnqueueTarget({
          existing_status: existing?.translation_status,
          existing_origin: existing?.origin,
          force_overwrite_manual: input.force_overwrite_manual,
          only_stale: input.only_stale,
          only_missing: input.only_missing,
          only_failed: input.only_failed,
        })
        if (!decision.enqueue) {
          results.push({
            field_name,
            language_code: target,
            translation_status: existing?.translation_status ?? "Ontbreekt",
            value: existing?.value ?? "",
            origin: existing?.origin,
            skipped: true,
            error: decision.skip_reason,
          })
          continue
        }

        if (!providerConfigured) {
          await this.upsertTranslation(
            {
              entity_type: input.entity_type,
              entity_id: input.entity_id,
              field_name,
              language_code: target,
              value: "",
              source_language_code: source,
              source_value,
              translation_status: "Ontbreekt",
              source_version: sourceVersion,
              origin: "machine",
              force_overwrite_manual: input.force_overwrite_manual,
              updated_by: input.updated_by,
            },
            sharedContext
          )
          results.push({
            field_name,
            language_code: target,
            translation_status: "Ontbreekt",
            value: "",
            origin: "machine",
            error: "provider_not_configured",
          })
          continue
        }

        try {
          const translated = await provider.translate({
            text: source_value,
            source_language: source,
            target_language: target,
            field_name,
            content_type: contentType,
            entity_type: input.entity_type,
            entity_id: input.entity_id,
            category: input.category,
          })
          const status = input.auto_publish ? "Gepubliceerd" : "Machine"
          await this.upsertTranslation(
            {
              entity_type: input.entity_type,
              entity_id: input.entity_id,
              field_name,
              language_code: target,
              value: translated.text,
              source_language_code: source,
              source_value,
              translation_status: status,
              source_version: sourceVersion,
              origin: "machine",
              force_overwrite_manual: input.force_overwrite_manual,
              updated_by: input.updated_by,
            },
            sharedContext
          )
          results.push({
            field_name,
            language_code: target,
            translation_status: status,
            value: translated.text,
            origin: "machine",
          })
        } catch (err) {
          const message =
            err instanceof TranslationProviderNotConfiguredError
              ? err.message
              : err instanceof Error
                ? err.message
                : "translation_failed"
          await this.upsertTranslation(
            {
              entity_type: input.entity_type,
              entity_id: input.entity_id,
              field_name,
              language_code: target,
              value: existing?.value ?? "",
              source_language_code: source,
              source_value,
              translation_status: "Mislukt",
              source_version: sourceVersion,
              origin: "machine",
              force_overwrite_manual: input.force_overwrite_manual,
              updated_by: input.updated_by,
            },
            sharedContext
          )
          results.push({
            field_name,
            language_code: target,
            translation_status: "Mislukt",
            value: existing?.value ?? "",
            origin: "machine",
            error: message,
          })
        }
      }
    }

    return {
      provider_id: provider.id,
      provider_configured: providerConfigured,
      results,
    }
  }

  @InjectManager()
  async setProductVersionSourceLanguage(
    input: {
      version_id: string
      source_language_code: string
    },
    @MedusaContext() sharedContext: Context = {}
  ) {
    const code = normalizeLanguageCode(input.source_language_code)
    if (!isActiveProductCloudLanguage(code)) {
      throw new Error("unsupported_source_language")
    }
    return await this.updateProductVersions(
      {
        id: input.version_id,
        source_language_code: code,
      },
      sharedContext
    )
  }

  @InjectManager()
  async getProductVersionTranslationSummary(
    input: { version_id: string },
    @MedusaContext() sharedContext: Context = {}
  ) {
    const version = await this.retrieveProductVersion(
      input.version_id,
      {},
      sharedContext
    )
    const translations = await this.listProductTranslations(
      {
        entity_type: "product_version",
        entity_id: version.id,
      },
      {},
      sharedContext
    )
    const coverage = buildLanguageCoverage({
      source_language_code: version.source_language_code,
      translations: translations.map((t) => ({
        field_name: t.field_name,
        language_code: t.language_code,
        translation_status: t.translation_status,
        value: t.value,
        origin: t.origin,
        source_version: t.source_version,
        translation_version: t.translation_version,
      })),
    })
    return {
      version: {
        id: version.id,
        product_id: version.product_id,
        title: version.title,
        description: version.description,
        source_language_code: version.source_language_code,
        version_number: version.version_number,
        publication_status: version.publication_status,
      },
      ...coverage,
      translations,
      provider_id: getTranslationProvider().id,
      provider_configured: getTranslationProvider().id !== "none",
      machine_translation_active: getTranslationProvider().id !== "none",
    }
  }

  @InjectManager()
  async listTranslationProductOverview(
    input: { limit?: number } = {},
    @MedusaContext() sharedContext: Context = {}
  ) {
    const limit = Math.min(Math.max(input.limit ?? 50, 1), 100)
    const products = await this.listProducts({}, { take: limit }, sharedContext)
    const items = []
    for (const product of products) {
      const versions = await this.listProductVersions(
        { product_id: product.id },
        {},
        sharedContext
      )
      const version = pickTranslationVersion(versions)
      if (!version) continue
      const summary = await this.getProductVersionTranslationSummary(
        { version_id: version.id },
        sharedContext
      )
      items.push({
        product_id: product.id,
        current_owner_seller_id: product.current_owner_seller_id,
        lifecycle_status: product.lifecycle_status,
        version_id: version.id,
        title: version.title,
        source_language_code: version.source_language_code,
        targets: summary.targets,
        attention_count: summary.targets.filter((t) =>
          ["Ontbreekt", "Verouderd", "Mislukt"].includes(t.translation_status)
        ).length,
      })
    }
    return { items, count: items.length }
  }
}

export default ProductCloudModuleService

export type { AttributeCatalogItem }
