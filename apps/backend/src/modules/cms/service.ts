import {
  Context,
  InjectManager,
  InjectTransactionManager,
  MedusaContext,
  MedusaService,
} from "@medusajs/framework/utils"
import {
  noteCategoryAssortmentChange,
  planCategoryStructureDraft,
  type CategoryCmsDocumentV2,
  type CategoryCmsProfile,
} from "@europmade/utils"
import { prepareCategoryCmsWrite } from "./category-cms-write"
import {
  CmsHomepage,
  CmsBanner,
  CmsPage,
  CmsAsset,
  CmsCategory,
  CmsCategoryRevision,
  CmsCategoryProposal,
  CmsCategoryProposalCost,
  CmsProduct,
  AdCampaign,
  AdCampaignWeek,
  AdPricing,
  CommercialNavRank,
  CommercialNavVisit,
  CommercialNavIcon,
} from "./models"
import {
  assertDraftRevision,
  CategoryPdError,
  computeCategoryDraftSyncState,
  computeDraftSyncState,
  deepCopyJson,
  hasLivePublication,
  isStaleDraftBase,
  publishedVersionOf,
  draftRevisionOf,
  type CategoryPdRow,
} from "./category-published-draft"

type EnsureRowOpts = { slug: string; i18n_meta?: unknown }

class CmsModuleService extends MedusaService({
  CmsHomepage,
  CmsBanner,
  CmsPage,
  CmsAsset,
  CmsCategory,
  CmsCategoryRevision,
  CmsCategoryProposal,
  CmsCategoryProposalCost,
  CmsProduct,
  AdCampaign,
  AdCampaignWeek,
  AdPricing,
  CommercialNavRank,
  CommercialNavVisit,
  CommercialNavIcon,
}) {
  async getCategoryBySlug(
    slug: string,
    @MedusaContext() sharedContext: Context = {}
  ): Promise<CategoryPdRow | null> {
    const rows = await this.listCmsCategories(
      { category_slug: slug },
      { take: 1 },
      sharedContext
    )
    return (rows[0] as CategoryPdRow | undefined) ?? null
  }

  async ensureCategoryRow(
    opts: EnsureRowOpts,
    @MedusaContext() sharedContext: Context = {}
  ): Promise<CategoryPdRow> {
    const existing = await this.getCategoryBySlug(opts.slug, sharedContext)
    if (existing) return existing
    const created = await this.createCmsCategories(
      {
        category_slug: opts.slug,
        document: {},
        published: false,
        i18n_meta: opts.i18n_meta ?? null,
        published_document: null,
        published_version: 0,
        draft_document: null,
        draft_revision: 0,
        draft_sync_state: "absent",
      },
      sharedContext
    )
    return created as unknown as CategoryPdRow
  }

  @InjectManager()
  async createCategoryDraft(
    input: {
      slug: string
      from: "published" | "empty"
      overwrite?: boolean
      actorId?: string | null
      profile: CategoryCmsProfile
    },
    @MedusaContext() sharedContext: Context = {}
  ): Promise<CategoryPdRow> {
    return await this.createCategoryDraft_(input, sharedContext)
  }

  @InjectTransactionManager()
  protected async createCategoryDraft_(
    input: {
      slug: string
      from: "published" | "empty"
      overwrite?: boolean
      actorId?: string | null
      profile: CategoryCmsProfile
    },
    @MedusaContext() sharedContext: Context = {}
  ): Promise<CategoryPdRow> {
    const row = await this.ensureCategoryRow(
      { slug: input.slug },
      sharedContext
    )
    if (row.draft_document != null && !input.overwrite) {
      throw new CategoryPdError(
        "draft_exists",
        "Draft already exists; pass overwrite=true to replace"
      )
    }
    let draftDoc: unknown
    let baseVersion: number | null
    if (input.from === "published") {
      if (!hasLivePublication(row)) {
        throw new CategoryPdError(
          "no_published",
          "No published document to copy into draft"
        )
      }
      draftDoc = prepareCategoryCmsWrite({
        raw: deepCopyJson(row.published_document),
        slug: input.slug,
        profile: input.profile,
        previous: row.published_document,
      })
      baseVersion = publishedVersionOf(row)
    } else {
      draftDoc = prepareCategoryCmsWrite({
        raw: {},
        slug: input.slug,
        profile: input.profile,
      })
      baseVersion = hasLivePublication(row) ? publishedVersionOf(row) : null
    }
    const sync = computeCategoryDraftSyncState({
      publishedDocument: row.published_document,
      draftDocument: draftDoc,
      publishedVersion: publishedVersionOf(row),
      slug: input.slug,
      profile: input.profile,
    })
    const updated = await this.updateCmsCategories(
      {
        id: row.id,
        draft_document: draftDoc,
        draft_updated_at: new Date(),
        draft_updated_by: input.actorId ?? null,
        draft_base_version: baseVersion,
        draft_revision: 1,
        draft_sync_state: sync,
      },
      sharedContext
    )
    return updated as unknown as CategoryPdRow
  }

  /**
   * Maakt of corrigeert alleen het Draft-document. Published blijft onaangeroerd.
   * Een bestaand document met het juiste profiel wordt niet herschreven.
   */
  @InjectManager()
  async ensureCategoryStructureDraft(
    input: { slug: string; profile: CategoryCmsProfile; actorId?: string | null },
    @MedusaContext() sharedContext: Context = {}
  ): Promise<{ action: "skip" | "write"; reason: string }> {
    const slug = input.slug.trim().toLowerCase()
    const row = await this.getCategoryBySlug(slug, sharedContext)
    const plan = planCategoryStructureDraft({
      slug,
      profile: input.profile,
      draft: row?.draft_document ?? null,
      published: row?.published_document ?? null,
      excluded: false,
    })
    if (plan.action === "skip" || !plan.document) {
      return { action: "skip", reason: plan.reason }
    }
    await this.writeCategoryStructureDraft_(
      {
        slug,
        profile: input.profile,
        document: plan.document,
        actorId: input.actorId ?? null,
      },
      sharedContext
    )
    return { action: "write", reason: plan.reason }
  }

  @InjectManager()
  async markCategoryEditorialReview(
    input: { slug: string; notedAt?: string },
    @MedusaContext() sharedContext: Context = {}
  ): Promise<{ action: "skip" | "write" }> {
    const slug = input.slug.trim().toLowerCase()
    const row = await this.getCategoryBySlug(slug, sharedContext)
    const draft = row?.draft_document
    if (!row || !draft || typeof draft !== "object" || (draft as { schema_version?: unknown }).schema_version !== 2) {
      return { action: "skip" }
    }
    const noted = noteCategoryAssortmentChange(
      draft as CategoryCmsDocumentV2,
      input.notedAt ?? new Date().toISOString()
    )
    if (!noted.changed) return { action: "skip" }
    await this.markCategoryEditorialReview_(
      {
        id: row.id,
        document: noted.document,
        revision: draftRevisionOf(row) + 1,
      },
      sharedContext
    )
    return { action: "write" }
  }

  @InjectTransactionManager()
  protected async markCategoryEditorialReview_(
    input: { id: string; document: CategoryCmsDocumentV2; revision: number },
    @MedusaContext() sharedContext: Context = {}
  ): Promise<void> {
    await this.updateCmsCategories(
      {
        id: input.id,
        draft_document: input.document,
        draft_updated_at: new Date(),
        draft_revision: input.revision,
        draft_sync_state: "unpublished_changes",
      },
      sharedContext
    )
  }

  @InjectTransactionManager()
  protected async writeCategoryStructureDraft_(
    input: {
      slug: string
      profile: CategoryCmsProfile
      document: CategoryCmsDocumentV2
      actorId?: string | null
    },
    @MedusaContext() sharedContext: Context = {}
  ): Promise<CategoryPdRow> {
    const row = await this.ensureCategoryRow({ slug: input.slug }, sharedContext)
    const sync = computeCategoryDraftSyncState({
      publishedDocument: row.published_document,
      draftDocument: input.document,
      publishedVersion: publishedVersionOf(row),
      slug: input.slug,
      profile: input.profile,
    })
    const updated = await this.updateCmsCategories(
      {
        id: row.id,
        draft_document: input.document,
        draft_updated_at: new Date(),
        draft_updated_by: input.actorId ?? null,
        draft_base_version: hasLivePublication(row) ? publishedVersionOf(row) : null,
        draft_revision: draftRevisionOf(row) + 1,
        draft_sync_state: sync,
      },
      sharedContext
    )
    return updated as unknown as CategoryPdRow
  }

  @InjectManager()
  async saveCategoryDraft(
    input: {
      slug: string
      document: unknown
      expectedDraftRevision: unknown
      actorId?: string | null
      i18nMeta?: unknown
      profile: CategoryCmsProfile
    },
    @MedusaContext() sharedContext: Context = {}
  ): Promise<CategoryPdRow> {
    return await this.saveCategoryDraft_(input, sharedContext)
  }

  @InjectTransactionManager()
  protected async saveCategoryDraft_(
    input: {
      slug: string
      document: unknown
      expectedDraftRevision: unknown
      actorId?: string | null
      i18nMeta?: unknown
      profile: CategoryCmsProfile
    },
    @MedusaContext() sharedContext: Context = {}
  ): Promise<CategoryPdRow> {
    const row = await this.getCategoryBySlug(input.slug, sharedContext)
    if (!row || row.draft_document == null) {
      throw new CategoryPdError("draft_missing", "No draft to save")
    }
    assertDraftRevision(row, input.expectedDraftRevision)
    const draftDoc = prepareCategoryCmsWrite({
      raw: input.document && typeof input.document === "object" ? input.document : {},
      slug: input.slug,
      profile: input.profile,
      previous: row.draft_document,
    })
    const nextRevision = draftRevisionOf(row) + 1
    const sync = computeCategoryDraftSyncState({
      publishedDocument: row.published_document,
      draftDocument: draftDoc,
      publishedVersion: publishedVersionOf(row),
      slug: input.slug,
      profile: input.profile,
    })
    const updated = await this.updateCmsCategories(
      {
        id: row.id,
        draft_document: draftDoc,
        draft_updated_at: new Date(),
        draft_updated_by: input.actorId ?? null,
        draft_revision: nextRevision,
        draft_sync_state: sync,
        ...(input.i18nMeta !== undefined ? { i18n_meta: input.i18nMeta } : {}),
        // Do not touch published_* fields
      },
      sharedContext
    )
    return updated as unknown as CategoryPdRow
  }

  @InjectManager()
  async deleteCategoryDraft(
    slug: string,
    @MedusaContext() sharedContext: Context = {}
  ): Promise<CategoryPdRow> {
    return await this.deleteCategoryDraft_(slug, sharedContext)
  }

  @InjectTransactionManager()
  protected async deleteCategoryDraft_(
    slug: string,
    @MedusaContext() sharedContext: Context = {}
  ): Promise<CategoryPdRow> {
    const row = await this.getCategoryBySlug(slug, sharedContext)
    if (!row) {
      throw new CategoryPdError("draft_missing", "Category not found")
    }
    const updated = await this.updateCmsCategories(
      {
        id: row.id,
        draft_document: null,
        draft_updated_at: null,
        draft_updated_by: null,
        draft_base_version: null,
        draft_revision: 0,
        draft_sync_state: "absent",
      },
      sharedContext
    )
    return updated as unknown as CategoryPdRow
  }

  @InjectManager()
  async publishCategoryDraft(
    input: {
      slug: string
      confirm: boolean
      expectedDraftRevision: unknown
      note?: string | null
      actorId?: string | null
      source?: "editor_publish" | "restore_and_publish"
      restoredFromVersion?: number | null
      __testFaultAfterRevision?: boolean
      profile: CategoryCmsProfile
    },
    @MedusaContext() sharedContext: Context = {}
  ): Promise<CategoryPdRow> {
    return await this.publishCategoryDraft_(input, sharedContext)
  }

  @InjectTransactionManager()
  protected async publishCategoryDraft_(
    input: {
      slug: string
      confirm: boolean
      expectedDraftRevision: unknown
      note?: string | null
      actorId?: string | null
      source?: "editor_publish" | "restore_and_publish"
      restoredFromVersion?: number | null
      /** Test-only: throw after revision insert (slug must start with __pd_). */
      __testFaultAfterRevision?: boolean
      profile: CategoryCmsProfile
    },
    @MedusaContext() sharedContext: Context = {}
  ): Promise<CategoryPdRow> {
    if (!input.confirm) {
      throw new CategoryPdError(
        "publish_not_confirmed",
        "Publish requires confirm=true"
      )
    }
    const row = await this.getCategoryBySlug(input.slug, sharedContext)
    if (!row || row.draft_document == null) {
      throw new CategoryPdError("draft_missing", "No draft to publish")
    }
    assertDraftRevision(row, input.expectedDraftRevision)
    const pubVersion = publishedVersionOf(row)
    if (
      isStaleDraftBase({
        draftDocument: row.draft_document,
        publishedVersion: pubVersion,
        draftBaseVersion: row.draft_base_version,
      })
    ) {
      throw new CategoryPdError(
        "stale_draft_base",
        "Draft is based on an older published version",
        {
          published_version: pubVersion,
          draft_base_version: row.draft_base_version ?? null,
        }
      )
    }

    const nextVersion = pubVersion + 1
    const liveCopy = prepareCategoryCmsWrite({
      raw: deepCopyJson(row.draft_document),
      slug: input.slug,
      profile: input.profile,
      previous: row.draft_document,
    })
    const superseded =
      row.published_document != null
        ? deepCopyJson(row.published_document)
        : null
    const now = new Date()

    await this.createCmsCategoryRevisions(
      {
        category_slug: row.category_slug,
        kind:
          input.source === "restore_and_publish" ? "restore_publish" : "publish",
        version: nextVersion,
        document: liveCopy,
        superseded_document: superseded,
        published_at: now,
        published_by: input.actorId ?? null,
        note: input.note ?? null,
        source: input.source ?? "editor_publish",
        restored_from_version: input.restoredFromVersion ?? null,
      },
      sharedContext
    )

    if (
      input.__testFaultAfterRevision === true &&
      input.slug.startsWith("__pd_")
    ) {
      throw new Error("EUROPMADE_CMS_PD_FAULT_AFTER_REVISION")
    }

    const updated = await this.updateCmsCategories(
      {
        id: row.id,
        published_document: liveCopy,
        published_version: nextVersion,
        published_at: now,
        published_by: input.actorId ?? null,
        published_note: input.note ?? null,
        // Keep draft equal to live
        draft_document: liveCopy,
        draft_base_version: nextVersion,
        draft_sync_state: "in_sync",
        draft_updated_at: now,
        draft_updated_by: input.actorId ?? null,
        // Keep draft_revision as-is (or bump? design keeps draft; revision can stay)
        // Legacy mirror for temporary store compat until phase D fully cuts over
        document: liveCopy,
        published: true,
      },
      sharedContext
    )
    return updated as unknown as CategoryPdRow
  }

  @InjectManager()
  async rebaseCategoryDraft(
    input: {
      slug: string
      mode: "keep_draft_content" | "replace_with_live"
      expectedDraftRevision: unknown
      acknowledgeUnmergedLive?: boolean
      confirmDestroyDraftChanges?: boolean
      actorId?: string | null
      profile: CategoryCmsProfile
    },
    @MedusaContext() sharedContext: Context = {}
  ): Promise<CategoryPdRow> {
    return await this.rebaseCategoryDraft_(input, sharedContext)
  }

  @InjectTransactionManager()
  protected async rebaseCategoryDraft_(
    input: {
      slug: string
      mode: "keep_draft_content" | "replace_with_live"
      expectedDraftRevision: unknown
      acknowledgeUnmergedLive?: boolean
      confirmDestroyDraftChanges?: boolean
      actorId?: string | null
      profile: CategoryCmsProfile
    },
    @MedusaContext() sharedContext: Context = {}
  ): Promise<CategoryPdRow> {
    const row = await this.getCategoryBySlug(input.slug, sharedContext)
    if (!row || row.draft_document == null) {
      throw new CategoryPdError("draft_missing", "No draft to rebase")
    }
    if (!hasLivePublication(row)) {
      throw new CategoryPdError("no_published", "No live version to rebase onto")
    }
    assertDraftRevision(row, input.expectedDraftRevision)
    const pubVersion = publishedVersionOf(row)
    const nextRevision = draftRevisionOf(row) + 1
    const now = new Date()

    if (input.mode === "keep_draft_content") {
      if (!input.acknowledgeUnmergedLive) {
        throw new CategoryPdError(
          "acknowledge_required",
          "keep_draft_content requires acknowledge_unmerged_live=true"
        )
      }
      // Do not touch draft_document
      const sync = computeCategoryDraftSyncState({
        publishedDocument: row.published_document,
        draftDocument: row.draft_document,
        publishedVersion: pubVersion,
        slug: input.slug,
        profile: input.profile,
      })
      const updated = await this.updateCmsCategories(
        {
          id: row.id,
          draft_base_version: pubVersion,
          draft_revision: nextRevision,
          draft_sync_state: sync,
          draft_updated_at: now,
          draft_updated_by: input.actorId ?? null,
        },
        sharedContext
      )
      return updated as unknown as CategoryPdRow
    }

    if (input.mode === "replace_with_live") {
      if (!input.confirmDestroyDraftChanges) {
        throw new CategoryPdError(
          "confirm_destroy_required",
          "replace_with_live requires confirm_destroy_draft_changes=true"
        )
      }
      const draftDoc = prepareCategoryCmsWrite({
        raw: deepCopyJson(row.published_document),
        slug: input.slug,
        profile: input.profile,
        previous: row.published_document,
      })
      const sync = computeCategoryDraftSyncState({
        publishedDocument: row.published_document,
        draftDocument: draftDoc,
        publishedVersion: pubVersion,
        slug: input.slug,
        profile: input.profile,
      })
      const updated = await this.updateCmsCategories(
        {
          id: row.id,
          draft_document: draftDoc,
          draft_base_version: pubVersion,
          draft_revision: nextRevision,
          draft_sync_state: sync,
          draft_updated_at: now,
          draft_updated_by: input.actorId ?? null,
        },
        sharedContext
      )
      return updated as unknown as CategoryPdRow
    }

    throw new CategoryPdError("invalid_rebase_mode", "Unknown rebase mode")
  }

  @InjectManager()
  async restoreRevisionToDraft(
    input: {
      slug: string
      version: number
      confirm?: boolean
      actorId?: string | null
    },
    @MedusaContext() sharedContext: Context = {}
  ): Promise<{ row: CategoryPdRow; restoredFromVersion: number }> {
    return await this.restoreRevisionToDraft_(input, sharedContext)
  }

  @InjectTransactionManager()
  protected async restoreRevisionToDraft_(
    input: {
      slug: string
      version: number
      confirm?: boolean
      actorId?: string | null
    },
    @MedusaContext() sharedContext: Context = {}
  ): Promise<{ row: CategoryPdRow; restoredFromVersion: number }> {
    if (input.confirm === false) {
      throw new CategoryPdError(
        "publish_not_confirmed",
        "Restore requires confirm"
      )
    }
    const row = await this.ensureCategoryRow(
      { slug: input.slug },
      sharedContext
    )
    const revisions = await this.listCmsCategoryRevisions(
      { category_slug: input.slug, version: input.version },
      { take: 1 },
      sharedContext
    )
    const rev = revisions[0] as
      | { document?: unknown; version?: number }
      | undefined
    if (!rev) {
      throw new CategoryPdError(
        "revision_not_found",
        `Revision v${input.version} not found`
      )
    }
    const draftDoc = deepCopyJson(rev.document ?? {})
    const pubVersion = publishedVersionOf(row)
    const sync = computeDraftSyncState({
      publishedDocument: row.published_document,
      draftDocument: draftDoc,
      publishedVersion: pubVersion,
    })
    const nextRevision = Math.max(1, draftRevisionOf(row) + 1)
    const updated = await this.updateCmsCategories(
      {
        id: row.id,
        draft_document: draftDoc,
        draft_base_version: pubVersion > 0 ? pubVersion : null,
        draft_revision: nextRevision,
        draft_sync_state: sync,
        draft_updated_at: new Date(),
        draft_updated_by: input.actorId ?? null,
      },
      sharedContext
    )
    return {
      row: updated as unknown as CategoryPdRow,
      restoredFromVersion: Number(rev.version ?? input.version),
    }
  }

  @InjectManager()
  async restoreRevisionAndPublish(
    input: {
      slug: string
      version: number
      confirm: boolean
      note?: string | null
      actorId?: string | null
      expectedDraftRevision?: unknown
      profile: CategoryCmsProfile
    },
    @MedusaContext() sharedContext: Context = {}
  ): Promise<CategoryPdRow> {
    return await this.restoreRevisionAndPublish_(input, sharedContext)
  }

  @InjectTransactionManager()
  protected async restoreRevisionAndPublish_(
    input: {
      slug: string
      version: number
      confirm: boolean
      note?: string | null
      actorId?: string | null
      expectedDraftRevision?: unknown
      profile: CategoryCmsProfile
    },
    @MedusaContext() sharedContext: Context = {}
  ): Promise<CategoryPdRow> {
    const restored = await this.restoreRevisionToDraft_(
      {
        slug: input.slug,
        version: input.version,
        confirm: true,
        actorId: input.actorId,
      },
      sharedContext
    )
    // Always use the revision produced by restore-to-draft in this same transaction.
    return await this.publishCategoryDraft_(
      {
        slug: input.slug,
        confirm: input.confirm,
        expectedDraftRevision: restored.row.draft_revision,
        note: input.note ?? `Herstel van v${input.version}`,
        actorId: input.actorId,
        source: "restore_and_publish",
        restoredFromVersion: restored.restoredFromVersion,
        profile: input.profile,
      },
      sharedContext
    )
  }
}

export default CmsModuleService
