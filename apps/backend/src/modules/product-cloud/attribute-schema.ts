/**
 * Product attribute schema helpers.
 * GPSR and other codes are copied per category; products with parent+child
 * links must show each code once.
 */

export type SchemaAttrLike = {
  id?: string
  code?: string | null
  value?: string | null
  sort_order?: number | null
}

function attrKey(row: SchemaAttrLike): string {
  const code = String(row.code || "").trim()
  if (code) return code
  return String(row.id || "")
}

function hasValue(row: SchemaAttrLike): boolean {
  return Boolean(String(row.value || "").trim())
}

/**
 * Keep one field per attribute code. Prefer a row that already has a value,
 * then lower sort_order, then first seen.
 */
export function dedupeAttributeSchemaByCode<T extends SchemaAttrLike>(
  fields: T[]
): T[] {
  const byKey = new Map<string, T>()
  for (const field of fields) {
    const key = attrKey(field)
    if (!key) continue
    const existing = byKey.get(key)
    if (!existing) {
      byKey.set(key, field)
      continue
    }
    const existingHas = hasValue(existing)
    const nextHas = hasValue(field)
    if (!existingHas && nextHas) {
      byKey.set(key, field)
      continue
    }
    if (existingHas === nextHas) {
      const existingOrder = existing.sort_order ?? Number.MAX_SAFE_INTEGER
      const nextOrder = field.sort_order ?? Number.MAX_SAFE_INTEGER
      if (nextOrder < existingOrder) {
        byKey.set(key, field)
      }
    }
  }
  return [...byKey.values()]
}

/**
 * Resolve attribute values by definition id, falling back to any other
 * definition that shares the same code (parent/child category catalogs).
 */
export function resolveAttributeValueByCode(
  defs: Array<{ id: string; code?: string | null }>,
  valueByDef: Map<string, { value?: string | null; id?: string } | string | null>
): Map<string, { value: string | null; attribute_value_id: string | null }> {
  const valueByCode = new Map<
    string,
    { value: string; attribute_value_id: string | null }
  >()
  for (const def of defs) {
    const raw = valueByDef.get(def.id)
    const value =
      typeof raw === "string" || raw == null
        ? raw
        : raw.value ?? null
    const valueId =
      typeof raw === "object" && raw && "id" in raw
        ? (raw.id as string | undefined) ?? null
        : null
    const trimmed = String(value || "").trim()
    if (!trimmed) continue
    const code = String(def.code || "").trim()
    if (!code || valueByCode.has(code)) continue
    valueByCode.set(code, {
      value: String(value),
      attribute_value_id: valueId,
    })
  }

  const out = new Map<
    string,
    { value: string | null; attribute_value_id: string | null }
  >()
  for (const def of defs) {
    const raw = valueByDef.get(def.id)
    const direct =
      typeof raw === "string" || raw == null
        ? raw
        : raw.value ?? null
    const directId =
      typeof raw === "object" && raw && "id" in raw
        ? (raw.id as string | undefined) ?? null
        : null
    if (String(direct || "").trim()) {
      out.set(def.id, {
        value: String(direct),
        attribute_value_id: directId,
      })
      continue
    }
    const code = String(def.code || "").trim()
    const fallback = code ? valueByCode.get(code) : undefined
    out.set(def.id, {
      value: fallback?.value ?? null,
      attribute_value_id: fallback?.attribute_value_id ?? null,
    })
  }
  return out
}
