/**
 * Category CMS V2 editorial blocks that already exist on the document:
 * faq, spec_explain and related_products.
 * Product facts and relations are read from the caller. Nothing is invented here.
 */

import {
  categoryCmsAllowedBlockTypes,
  normalizeCategoryCmsDocument,
  type CategoryCmsDocumentV2,
  type CategoryCmsLocale,
  type CategoryCmsLocalized,
  type CategoryCmsProfile,
} from "./cms-category-document.ts"

export const CATEGORY_PRODUCT_RELATION_TYPES = [
  "Vergelijkbaar",
  "Accessoire",
  "Gerelateerd",
  "VaakSamenGekocht",
  "Alternatief",
] as const

export type CategoryProductRelationType = (typeof CATEGORY_PRODUCT_RELATION_TYPES)[number]

const RELATION_TYPES = new Set<string>(CATEGORY_PRODUCT_RELATION_TYPES)

export type CategoryProductRelation = {
  from_product_id: string
  to_product_id: string
  relation_type: string
}

export type SpecExplainDefinition = {
  code: string
  name: string
  dataType: string
  unit?: string | null
  optionValues?: unknown
}

export type SpecExplainView = {
  id: string
  title: string
  body: string
  recognized: boolean
  label: string | null
  dataType: string | null
  unit: string | null
  /** Stored choice-list values. Never a chart and never filled from product rows. */
  optionValues: string[]
}

export function categoryCmsLocaleText(
  value: CategoryCmsLocalized | null | undefined,
  locale: CategoryCmsLocale
): string {
  if (!value) return ""
  return (value[locale] || value.nl || "").trim()
}

export function orderedFaqItems<T extends { question: string }>(items: T[]): T[] {
  return items.filter((item) => item.question.trim().length > 0)
}

export function visibleFaqItems(
  items: Array<{ id: string; question: CategoryCmsLocalized; answer: CategoryCmsLocalized }>,
  locale: CategoryCmsLocale
): Array<{ id: string; question: string; answer: string }> {
  return orderedFaqItems(
    items.map((item) => ({
      id: item.id,
      question: categoryCmsLocaleText(item.question, locale),
      answer: categoryCmsLocaleText(item.answer, locale),
    }))
  )
}

export function categoryFaqAllowed(profile: CategoryCmsProfile): boolean {
  return categoryCmsAllowedBlockTypes(profile).has("faq")
}

/** JSON array, or an already parsed list. Any other stored text stays unused. */
export function attributeOptionValues(raw: unknown): string[] {
  const list = Array.isArray(raw)
    ? raw
    : typeof raw === "string" && raw.trim().startsWith("[")
      ? parsedArray(raw)
      : []
  const seen = new Set<string>()
  const values: string[] = []
  for (const entry of list) {
    const value = String(entry ?? "").trim()
    if (!value || seen.has(value)) continue
    seen.add(value)
    values.push(value)
  }
  return values
}

function parsedArray(raw: string): unknown[] {
  try {
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function reliableUnit(unit: string | null | undefined): string | null {
  const trimmed = String(unit ?? "").trim()
  if (!trimmed || trimmed === "-" || trimmed.toLowerCase() === "n/a") return null
  return trimmed
}

/**
 * Editorial explanations in stored order.
 * A matching attribute definition adds its label, datatype, unit and choice values.
 * Product values are not an input, so a missing value cannot become a scale.
 */
export function explainCategorySpecs(
  items: Array<{ id: string; specCode: string; title: string; body: string }>,
  definitions: SpecExplainDefinition[]
): SpecExplainView[] {
  const byCode = new Map<string, SpecExplainDefinition>()
  for (const definition of definitions) {
    const code = definition.code.trim()
    if (!code || byCode.has(code)) continue
    byCode.set(code, definition)
  }
  const views: SpecExplainView[] = []
  for (const item of items) {
    const title = item.title.trim()
    const body = item.body.trim()
    if (!title && !body) continue
    const definition = byCode.get(item.specCode.trim())
    views.push({
      id: item.id,
      title,
      body,
      recognized: Boolean(definition),
      label: definition?.name.trim() || null,
      dataType: definition?.dataType.trim() || null,
      unit: definition ? reliableUnit(definition.unit) : null,
      optionValues: definition ? attributeOptionValues(definition.optionValues) : [],
    })
  }
  return views
}

/**
 * Targets of stored relations from the category's own products.
 * Same-category products without a relation are ignored. Each target appears once.
 */
export function selectRelatedCategoryProducts<T extends { id: string }>(
  sourceIds: string[],
  relations: CategoryProductRelation[],
  candidates: T[],
  limit: number
): T[] {
  const sources = new Set(sourceIds.map((id) => id.trim()).filter(Boolean))
  const byId = new Map<string, T>()
  for (const candidate of candidates) {
    const id = candidate.id.trim()
    if (id && !byId.has(id)) byId.set(id, candidate)
  }
  const max = Number.isFinite(limit) ? Math.max(0, Math.floor(limit)) : 8
  const seen = new Set<string>()
  const selected: T[] = []
  for (const relation of relations) {
    if (selected.length >= max) break
    const fromId = relation.from_product_id.trim()
    const toId = relation.to_product_id.trim()
    if (!RELATION_TYPES.has(relation.relation_type)) continue
    if (!fromId || !toId || fromId === toId || !sources.has(fromId) || seen.has(toId)) continue
    const candidate = byId.get(toId)
    if (!candidate) continue
    seen.add(toId)
    selected.push(candidate)
  }
  return selected
}

/** Draft preview reads only the document the studio sent. */
export function categoryV2PreviewDocument(raw: unknown): CategoryCmsDocumentV2 | null {
  if (!raw || typeof raw !== "object") return null
  const row = raw as { schema_version?: unknown; profile?: unknown; blocks?: unknown }
  if (row.schema_version !== 2 || !Array.isArray(row.blocks)) return null
  if (row.profile !== "level_1" && row.profile !== "level_2" && row.profile !== "level_3") return null
  return raw as CategoryCmsDocumentV2
}

/** Storefront reads the published document only. A draft object is not an argument. */
export function categoryV2StorefrontDocument(
  published: unknown,
  profile: CategoryCmsProfile,
  slug: string
): CategoryCmsDocumentV2 {
  const stored = categoryV2PreviewDocument(published)
  if (stored && stored.profile === profile) return stored
  return normalizeCategoryCmsDocument(published ?? {}, { slug, profile })
}
