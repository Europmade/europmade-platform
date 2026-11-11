import { createHash } from "node:crypto"
import {
  createDefaultCategoryCmsDocument,
  normalizeCategoryCmsDocument,
  type CategoryCmsProfile,
} from "@europmade/utils"

export type DraftSyncState = "absent" | "in_sync" | "unpublished_changes"

export type CategoryPdRow = {
  id: string
  category_slug: string
  document?: unknown
  published?: boolean
  i18n_meta?: unknown
  published_document?: unknown
  published_at?: Date | string | null
  published_by?: string | null
  published_version?: number | null
  published_note?: string | null
  draft_document?: unknown
  draft_updated_at?: Date | string | null
  draft_updated_by?: string | null
  draft_base_version?: number | null
  draft_revision?: number | null
  draft_sync_state?: string | null
  legacy_migrated_at?: Date | string | null
  created_at?: unknown
  updated_at?: unknown
}

export function deepCopyJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

export function documentFingerprint(doc: unknown): string {
  return createHash("sha256")
    .update(JSON.stringify(doc ?? null))
    .digest("hex")
}

export function computeDraftSyncState(input: {
  publishedDocument: unknown
  draftDocument: unknown
  publishedVersion: number
}): DraftSyncState {
  if (input.draftDocument == null) return "absent"
  if (input.publishedVersion <= 0 || input.publishedDocument == null) {
    return "unpublished_changes"
  }
  return documentFingerprint(input.draftDocument) ===
    documentFingerprint(input.publishedDocument)
    ? "in_sync"
    : "unpublished_changes"
}

export function isStaleDraftBase(input: {
  draftDocument: unknown
  publishedVersion: number
  draftBaseVersion: number | null | undefined
}): boolean {
  if (input.draftDocument == null) return false
  if (input.publishedVersion <= 0) return false
  return Number(input.draftBaseVersion ?? NaN) !== input.publishedVersion
}

export function publishedVersionOf(row: CategoryPdRow): number {
  return Number(row.published_version ?? 0)
}

export function draftRevisionOf(row: CategoryPdRow): number {
  return Number(row.draft_revision ?? 0)
}

export function emptyEditorialDocument(
  slug: string,
  profile: CategoryCmsProfile
): Record<string, unknown> {
  return createDefaultCategoryCmsDocument(profile, { slug }) as unknown as Record<
    string,
    unknown
  >
}

export function computeCategoryDraftSyncState(input: {
  publishedDocument: unknown
  draftDocument: unknown
  publishedVersion: number
  slug: string
  profile: CategoryCmsProfile
}): DraftSyncState {
  if (input.draftDocument == null) return "absent"
  if (input.publishedVersion <= 0 || input.publishedDocument == null) {
    return "unpublished_changes"
  }
  const opts = { slug: input.slug, profile: input.profile }
  const published = documentFingerprint(
    normalizeCategoryCmsDocument(input.publishedDocument, opts)
  )
  const draft = documentFingerprint(
    normalizeCategoryCmsDocument(input.draftDocument, opts)
  )
  return published === draft ? "in_sync" : "unpublished_changes"
}

export function hasLivePublication(row: CategoryPdRow): boolean {
  return (
    publishedVersionOf(row) >= 1 &&
    row.published_document != null &&
    typeof row.published_document === "object"
  )
}

export class CategoryPdError extends Error {
  constructor(
    readonly code:
      | "draft_revision_conflict"
      | "stale_draft_base"
      | "draft_missing"
      | "draft_exists"
      | "publish_not_confirmed"
      | "acknowledge_required"
      | "confirm_destroy_required"
      | "no_published"
      | "revision_not_found"
      | "invalid_rebase_mode"
      | "category_unknown"
      | "taxonomy_depth"
      | "taxonomy_cycle"
      | "taxonomy_broken"
      | "profile_mismatch"
      | "document_invalid",
    message: string,
    readonly details?: Record<string, unknown>
  ) {
    super(message)
    this.name = "CategoryPdError"
  }

  get httpStatus(): number {
    switch (this.code) {
      case "draft_revision_conflict":
      case "stale_draft_base":
      case "draft_exists":
        return 409
      case "draft_missing":
      case "publish_not_confirmed":
      case "acknowledge_required":
      case "confirm_destroy_required":
      case "no_published":
      case "revision_not_found":
      case "invalid_rebase_mode":
      case "category_unknown":
      case "taxonomy_depth":
      case "taxonomy_cycle":
      case "taxonomy_broken":
      case "profile_mismatch":
      case "document_invalid":
        return 400
      default:
        return 400
    }
  }
}

export function assertDraftRevision(
  row: CategoryPdRow,
  expected: unknown
): void {
  const got = draftRevisionOf(row)
  const exp = Number(expected)
  if (!Number.isFinite(exp) || exp !== got) {
    throw new CategoryPdError(
      "draft_revision_conflict",
      "Draft revision mismatch",
      { expected: exp, actual: got }
    )
  }
}
