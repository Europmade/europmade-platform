import { z } from "@medusajs/framework/zod"
import {
  CATEGORY_CMS_PROFILE_ALLOWLIST,
  mergeCategoryCmsEditorWrite,
  mergeUspManualOverrides,
  normalizeCategoryCmsDocument,
  validateCategoryCmsDocument,
  type CategoryCmsBlockType,
  type CategoryCmsDocumentV2,
  type CategoryCmsProfile,
} from "@europmade/utils"
import { CategoryPdError } from "./category-published-draft"

const LocalizedSchema = z.object({
  nl: z.string(),
  en: z.string(),
  de: z.string(),
  fr: z.string(),
})

const ProvenanceSchema = z
  .object({
    source: z.enum(["product_cloud", "cms", "ai", "hybrid", "advertising"]),
    dynamic: z.boolean(),
    ai_may_propose: z.boolean(),
    manual_override: z.union([z.boolean(), z.record(z.string(), z.boolean())]),
    approval_required: z.boolean(),
    content_version: z.string(),
  })
  .passthrough()

export function categoryCmsDocumentSchema(expected: {
  slug: string
  profile: CategoryCmsProfile
}) {
  return z
    .object({
      schema_version: z.literal(2),
      profile: z.enum(["level_1", "level_2", "level_3"]),
      path_key: z.string().nullable(),
      locale_policy: z.object({
        source_locale: z.literal("nl"),
        locales: z.array(z.enum(["nl", "en", "de", "fr"])),
      }),
      blocks: z.array(
        z
          .object({
            id: z.string().min(1),
            type: z.string().min(1),
            visible: z.boolean(),
          })
          .passthrough()
      ),
      seo: z.object({
        title: LocalizedSchema,
        meta_description: LocalizedSchema,
        h1: LocalizedSchema,
        structured_data_type: z.literal("CollectionPage"),
      }),
      block_meta: z.record(z.string(), ProvenanceSchema),
    })
    .passthrough()
    .superRefine((doc, ctx) => {
      const issues = validateCategoryCmsDocument(
        doc as CategoryCmsDocumentV2,
        expected
      )
      for (const issue of issues) {
        ctx.addIssue({
          code: "custom",
          message: `${issue.code}: ${issue.message}`,
          path: [issue.code],
        })
      }
    })
}

function assertV2BlockOrder(raw: unknown, profile: CategoryCmsProfile): void {
  if (!raw || typeof raw !== "object") return
  const row = raw as { schema_version?: unknown; blocks?: Array<{ type?: string }> }
  if (row.schema_version !== 2 || !Array.isArray(row.blocks)) return
  const allow = CATEGORY_CMS_PROFILE_ALLOWLIST[profile]
  const seen = row.blocks
    .map((block) => block.type)
    .filter((type): type is CategoryCmsBlockType =>
      allow.includes(type as CategoryCmsBlockType)
    )
  if (seen.join(",") !== allow.join(",")) {
    throw new CategoryPdError(
      "document_invalid",
      "Required blocks are missing or out of profile order",
      { expected: allow, actual: seen }
    )
  }
}

function isEditorV2(raw: unknown): raw is CategoryCmsDocumentV2 {
  if (!raw || typeof raw !== "object") return false
  const row = raw as { schema_version?: unknown; blocks?: unknown }
  return row.schema_version === 2 && Array.isArray(row.blocks)
}

function storedV2(raw: unknown, profile: CategoryCmsProfile): CategoryCmsDocumentV2 | null {
  if (!isEditorV2(raw) || raw.profile !== profile) return null
  return raw
}

function assertProfileLock(raw: unknown, profile: CategoryCmsProfile): void {
  if (!raw || typeof raw !== "object") return
  const row = raw as { schema_version?: unknown; profile?: unknown }
  if (row.schema_version === 2 && row.profile && row.profile !== profile) {
    throw new CategoryPdError(
      "profile_mismatch",
      "Document profile does not match the category taxonomy",
      { document_profile: row.profile, taxonomy_profile: profile }
    )
  }
}

export function prepareCategoryCmsWrite(input: {
  raw: unknown
  slug: string
  profile: CategoryCmsProfile
  previous?: unknown
}): CategoryCmsDocumentV2 {
  assertProfileLock(input.raw, input.profile)
  if (input.previous != null) assertProfileLock(input.previous, input.profile)
  const opts = { slug: input.slug, profile: input.profile }
  const previousV2 =
    input.previous == null
      ? null
      : storedV2(input.previous, input.profile) ??
        normalizeCategoryCmsDocument(input.previous, opts)
  let next: CategoryCmsDocumentV2
  if (isEditorV2(input.raw)) {
    assertV2BlockOrder(input.raw, input.profile)
    const base =
      previousV2 ??
      normalizeCategoryCmsDocument({}, opts)
    next = mergeCategoryCmsEditorWrite(base, input.raw, opts)
  } else {
    next = normalizeCategoryCmsDocument(input.raw ?? {}, opts)
  }
  if (previousV2) {
    next = mergeUspManualOverrides(previousV2, next)
  }
  const parsed = categoryCmsDocumentSchema({
    slug: input.slug,
    profile: input.profile,
  }).safeParse(next)
  if (!parsed.success) {
    throw new CategoryPdError(
      "document_invalid",
      "Category document failed validation",
      {
        issues: parsed.error.issues.map((issue) => issue.message),
      }
    )
  }
  return next
}
