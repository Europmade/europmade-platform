/**
 * Multi-column USP import/export helpers.
 * Storage remains a single newline-separated `usps` translation field.
 * Category attributes (maat/kleur/…) stay on the Kenmerken sheet — separate group.
 */

export const USP_COLUMN_COUNT = 5

export const USP_FIELD_CODES = Array.from(
  { length: USP_COLUMN_COUNT },
  (_, i) => `usp_${i + 1}`
) as string[]

export function uspFieldNlName(index1Based: number): string {
  return `Belangrijkste kenmerk ${index1Based}`
}

/** Split stored usps text into up to N columns (no data loss beyond column cap: extras join into last). */
export function splitUspsToColumns(
  raw: string | null | undefined,
  count = USP_COLUMN_COUNT
): string[] {
  const lines = String(raw || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
  const cols = Array.from({ length: count }, () => "")
  if (lines.length === 0) return cols
  for (let i = 0; i < lines.length; i++) {
    if (i < count - 1) cols[i] = lines[i]
    else if (i === count - 1) cols[i] = lines[i]
    else cols[count - 1] = [cols[count - 1], lines[i]].filter(Boolean).join("\n")
  }
  return cols
}

/** Join multi-column + legacy single usps cell into storage value. */
export function joinUspsFromImportValues(
  values: Record<string, string>
): string {
  const fromCols = USP_FIELD_CODES.map((code) =>
    String(values[code] || "").trim()
  ).filter(Boolean)
  if (fromCols.length) return fromCols.join("\n")
  return String(values.usps || "").trim()
}

/**
 * Normalize import row values: set `usps` from multi-columns (or legacy),
 * without wiping an existing usps when all usp_N cells are empty and legacy empty.
 */
export function coalesceUspsIntoValues(
  values: Record<string, string>
): Record<string, string> {
  const joined = joinUspsFromImportValues(values)
  if (!joined) return values
  return { ...values, usps: joined }
}
