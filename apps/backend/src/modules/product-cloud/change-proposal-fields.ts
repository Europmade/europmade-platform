/**
 * Structured central-field change proposals (extends title/description).
 * Backward compatible: proposed_title / proposed_description remain primary
 * for legacy rows; proposed_fields.changes carries additional central fields.
 */

export const PROPOSABLE_CENTRAL_FIELDS = [
  "title",
  "description",
  "brand_id",
  "manufacturer_id",
  "attribute",
  "media_note",
  "product_manager",
] as const

export type ProposableCentralField = (typeof PROPOSABLE_CENTRAL_FIELDS)[number]

export type ProposedFieldChange = {
  field: ProposableCentralField
  label: string
  current_value: string | null
  proposed_value: string
  attribute_definition_id?: string
  /** Staged media refs (upload only; not live product media until approve). */
  storage_references?: string[]
}

export type ProposedFieldsPayload = {
  changes: ProposedFieldChange[]
}

export function isProposedFieldsPayload(
  value: unknown
): value is ProposedFieldsPayload {
  if (!value || typeof value !== "object") return false
  const changes = (value as { changes?: unknown }).changes
  if (!Array.isArray(changes)) return false
  return changes.every(
    (row) =>
      row &&
      typeof row === "object" &&
      typeof (row as ProposedFieldChange).field === "string" &&
      typeof (row as ProposedFieldChange).label === "string" &&
      typeof (row as ProposedFieldChange).proposed_value === "string"
  )
}

export function normalizeProposedFields(
  value: unknown
): ProposedFieldsPayload | null {
  if (!isProposedFieldsPayload(value)) return null
  const changes = value.changes
    .map((row) => {
      const refs = Array.isArray(
        (row as ProposedFieldChange).storage_references
      )
        ? (row as ProposedFieldChange).storage_references!.map((r) =>
            String(r).trim()
          ).filter(Boolean)
        : undefined
      return {
        field: row.field,
        label: String(row.label || row.field).trim(),
        current_value:
          row.current_value == null ? null : String(row.current_value),
        proposed_value: String(row.proposed_value).trim(),
        attribute_definition_id: row.attribute_definition_id
          ? String(row.attribute_definition_id)
          : undefined,
        storage_references: refs?.length ? refs : undefined,
      }
    })
    .filter(
      (row) =>
        row.proposed_value.length > 0 ||
        (row.storage_references && row.storage_references.length > 0)
    )
  if (!changes.length) return null
  return { changes }
}

export function hasAnyProposalContent(input: {
  proposed_title?: string | null
  proposed_description?: string | null
  proposed_fields?: unknown
}): boolean {
  if (input.proposed_title?.trim()) return true
  if (input.proposed_description?.trim()) return true
  return Boolean(normalizeProposedFields(input.proposed_fields))
}

export function titleDescriptionFromProposedFields(
  fields: ProposedFieldsPayload | null
): { title?: string; description?: string } {
  if (!fields) return {}
  const title = fields.changes.find((c) => c.field === "title")?.proposed_value
  const description = fields.changes.find(
    (c) => c.field === "description"
  )?.proposed_value
  return {
    title: title || undefined,
    description: description || undefined,
  }
}

export function summarizeProposedFields(
  fields: ProposedFieldsPayload | null
): string[] {
  if (!fields) return []
  return fields.changes.map((c) => c.label)
}

/** Match admin product search: every token must appear somewhere in the haystack. */
export function adminProductSearchMatches(
  haystack: string,
  query: string
): boolean {
  const hay = haystack.toLowerCase()
  const tokens = query
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean)
  if (!tokens.length) return true
  return tokens.every((token) => hay.includes(token))
}
