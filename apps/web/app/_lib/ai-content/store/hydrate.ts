/**
 * Process-boot CMS hydrate — offline-analyzer payloads written once into the store.
 * Not a page-load LLM call: storefront only reads getAiContentDocument afterwards.
 */

import { STOREFRONT_LOCALES } from "../../i18n/locales"
import { CATEGORY_CMS_BY_SLUG } from "../../cms/category-cms"
import { MARKETPLACE_CATEGORIES } from "../../marketplace-categories"
import {
  LISTING_PRODUCTS,
  productsForCategory,
} from "../../listing-products"
import { analyzeCategorySignals } from "../analysis/category-signals"
import { offlineAnalyzerProvider } from "../providers/offline-analyzer"
import { AI_CONTENT_PROMPT_VERSION, AI_CONTENT_REFRESH_MONTHS } from "../prompts/versions"
import { getAiContentDocument, upsertAiContentDocument } from "./content-store"
import type { AiContentDocument } from "../types"

const g = globalThis as typeof globalThis & {
  __emAiContentHydrated?: boolean
}

function pool(slug: string) {
  const seed = productsForCategory(slug)
  return seed.length > 0
    ? seed
    : LISTING_PRODUCTS.filter((p) => p.categorySlugs.includes(slug))
}

async function hydrateOne(slug: string): Promise<void> {
  if (getAiContentDocument("category", slug)) return
  const taxonomy = MARKETPLACE_CATEGORIES.find((c) => c.slug === slug)
  if (!taxonomy) return
  const cms = CATEGORY_CMS_BY_SLUG[slug] ?? null
  const relatedSlugs = cms?.relatedCategorySlugs ?? []
  const relatedLabels = relatedSlugs.map(
    (s) => MARKETPLACE_CATEGORIES.find((c) => c.slug === s)?.label ?? s
  )
  const filterGroups = (cms?.filterGroups ?? []).map((fg) => ({
    id: fg.id,
    attributeKey: fg.attributeKey,
    label: fg.label.nl,
    type: fg.type,
    options: fg.options.map((o) => ({
      id: o.id,
      label: o.label.nl,
      value: o.value,
    })),
  }))

  const context = analyzeCategorySignals({
    slug,
    label: taxonomy.label,
    products: pool(slug),
    filterGroups,
    relatedCategorySlugs: relatedSlugs,
    relatedCategoryLabels: relatedLabels,
  })

  const result = await offlineAnalyzerProvider.generate({
    context,
    promptVersion: AI_CONTENT_PROMPT_VERSION,
    locales: [...STOREFRONT_LOCALES],
    trigger: "seed",
  })

  const now = new Date().toISOString()
  const refresh = new Date(now)
  refresh.setMonth(refresh.getMonth() + AI_CONTENT_REFRESH_MONTHS)

  const doc: AiContentDocument = {
    id: `ai_category_${slug}`,
    entityType: "category",
    entityId: slug,
    payload: result.payload,
    generationStatus: "ready",
    published: true,
    lastGenerated: now,
    generatedBy: result.providerId,
    promptVersion: result.promptVersion,
    localeCoverage: [...STOREFRONT_LOCALES],
    lastTrigger: "seed",
    errorMessage: null,
    refreshAfter: refresh.toISOString(),
  }
  upsertAiContentDocument(doc)
}

/** Idempotent hydrate for known categories (CMS boot). */
export async function hydrateAiContentStore(): Promise<void> {
  if (g.__emAiContentHydrated) return
  g.__emAiContentHydrated = true
  const slugs = [
    ...Object.keys(CATEGORY_CMS_BY_SLUG),
    ...MARKETPLACE_CATEGORIES.filter((c) => c.popular).map((c) => c.slug),
  ]
  for (const slug of [...new Set(slugs)]) {
    await hydrateOne(slug)
  }
}
