/**
 * Pure Product Cloud translation workflow helpers (ADR-0039).
 * Testable without Medusa DI — used by ProductCloudModuleService.
 */

export type TranslationStatus =
  | "Ontbreekt"
  | "Concept"
  | "Machine"
  | "Beoordeeld"
  | "Gepubliceerd"
  | "Verouderd"
  | "Mislukt"

export type TranslationOrigin = "machine" | "manual"

/**
 * Sprint UI labels ↔ ADR-0039 enum (no duplicate status architecture):
 * - Ontbreekt → Ontbreekt
 * - In wachtrij → Concept
 * - Bezig → Machine (in-flight / unpublished MT result)
 * - Beschikbaar → Gepubliceerd (storefront-ready)
 * - Verouderd → Verouderd
 * - Mislukt → Mislukt
 */

export type EnqueueFilter = {
  only_stale?: boolean
  only_missing?: boolean
  only_failed?: boolean
}

/** Manual machine overwrite is blocked unless force is set. */
export function isManualOverrideProtected(
  origin: TranslationOrigin | null | undefined,
  forceOverwriteManual: boolean | undefined
): boolean {
  return origin === "manual" && forceOverwriteManual !== true
}

/**
 * Whether mark-stale should set Verouderd for this row.
 * Ontbreekt/Mislukt stay as-is; value is never cleared by stale.
 */
export function shouldMarkTranslationStale(input: {
  translation_status: TranslationStatus | string
  source_version: number
  new_source_version: number
}): boolean {
  if (
    input.translation_status === "Ontbreekt" ||
    input.translation_status === "Mislukt"
  ) {
    return false
  }
  return Number(input.source_version) < Number(input.new_source_version)
}

/**
 * Filter for enqueue/retranslate.
 * When no filter flags are set, all non-manual rows are eligible.
 * Flags may be combined (OR): match if any selected filter matches.
 */
export function shouldEnqueueTarget(input: {
  existing_status?: TranslationStatus | string | null
  existing_origin?: TranslationOrigin | null
  force_overwrite_manual?: boolean
  only_stale?: boolean
  only_missing?: boolean
  only_failed?: boolean
}): { enqueue: boolean; skip_reason?: string } {
  if (
    isManualOverrideProtected(
      input.existing_origin,
      input.force_overwrite_manual
    )
  ) {
    return { enqueue: false, skip_reason: "manual_override_protected" }
  }

  const filtersActive =
    input.only_stale === true ||
    input.only_missing === true ||
    input.only_failed === true

  if (!filtersActive) {
    return { enqueue: true }
  }

  const status = input.existing_status ?? null
  const matches: string[] = []

  if (input.only_stale === true) {
    if (status === "Verouderd") matches.push("stale")
  }
  if (input.only_missing === true) {
    if (!status || status === "Ontbreekt") matches.push("missing")
  }
  if (input.only_failed === true) {
    if (status === "Mislukt") matches.push("failed")
  }

  if (matches.length === 0) {
    if (input.only_stale) return { enqueue: false, skip_reason: "not_stale" }
    if (input.only_missing) return { enqueue: false, skip_reason: "not_missing" }
    if (input.only_failed) return { enqueue: false, skip_reason: "not_failed" }
    return { enqueue: false, skip_reason: "filtered_out" }
  }

  return { enqueue: true }
}
