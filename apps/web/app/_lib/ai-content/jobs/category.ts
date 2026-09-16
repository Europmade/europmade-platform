/**
 * Category AI content jobs — admin / seed only (never page load).
 */

import { STOREFRONT_LOCALES } from "../../i18n/locales"
import { getCategoryCmsDocument } from "../../cms/category-cms"
import { findMarketplaceCategory } from "../../marketplace-categories"
import {
  type ListingProduct,
} from "../../listing-products"
import { analyzeCategorySignals } from "../analysis/category-signals"
import { generateAiContent, shouldRegenerate } from "../engine"
import { AI_CONTENT_PROMPT_VERSION } from "../prompts/versions"
import { getAiContentDocument } from "../store/content-store"
import type {
  AiContentDocument,
  AiContentProviderId,
  AiRegenerationTrigger,
} from "../types"

function poolForSlug(_slug: string): ListingProduct[] {
  return []
}

export async function generateCategoryAiContent(input: {
  slug: string
  products?: ListingProduct[]
  trigger?: AiRegenerationTrigger
  providerId?: AiContentProviderId | null
  translationsOnly?: boolean
  force?: boolean
  publish?: boolean
}): Promise<AiContentDocument> {
  const taxonomy = findMarketplaceCategory(input.slug)
  if (!taxonomy) {
    throw new Error(`Unknown category slug: ${input.slug}`)
  }

  const existing = getAiContentDocument("category", input.slug)
  const trigger = input.trigger ?? "manual"
  if (
    !input.force &&
    !input.translationsOnly &&
    !shouldRegenerate(existing, trigger)
  ) {
    return existing!
  }

  const cms = getCategoryCmsDocument(input.slug)
  const products = input.products ?? poolForSlug(input.slug)
  const relatedLabels = cms.relatedCategorySlugs.map((s) => {
    const cat = findMarketplaceCategory(s)
    return cat?.label ?? s
  })

  const filterGroups = cms.filterGroups.map((g) => ({
    id: g.id,
    attributeKey: g.attributeKey,
    label: g.label.nl,
    type: g.type,
    options: g.options.map((o) => ({
      id: o.id,
      label: o.label.nl,
      value: o.value,
    })),
  }))

  const context = analyzeCategorySignals({
    slug: input.slug,
    label: taxonomy.label,
    products,
    filterGroups,
    relatedCategorySlugs: cms.relatedCategorySlugs,
    relatedCategoryLabels: relatedLabels,
  })

  return generateAiContent({
    providerId: input.providerId,
    publish: input.publish ?? true,
    request: {
      context,
      promptVersion: AI_CONTENT_PROMPT_VERSION,
      locales: [...STOREFRONT_LOCALES],
      trigger,
      translationsOnly: input.translationsOnly ?? false,
      previous: existing?.payload ?? null,
    },
  })
}

/** Seed popular / known CMS categories once (dev & first boot). */
export async function seedCategoryAiContent(
  slugs: string[]
): Promise<AiContentDocument[]> {
  const out: AiContentDocument[] = []
  for (const slug of slugs) {
    const doc = await generateCategoryAiContent({
      slug,
      trigger: "seed",
      force: true,
    })
    out.push(doc)
  }
  return out
}
