import { Modules } from "@medusajs/framework/utils"
import type { MedusaContainer } from "@medusajs/framework/types"
import {
  outdateCategoryCmsProposals,
  type CategoryProposalRepository,
} from "./category-cms-proposal-store"

export const CATEGORY_FACTS_CHANGED = "CategoryFactsChanged"

export type CategoryFactsChangedData = {
  product_id?: string
  product_ids?: string[]
  brand_id?: string
}

/** Product writes keep succeeding when the proposal signal cannot be sent. */
export async function emitCategoryFactsChanged(
  container: MedusaContainer,
  data: CategoryFactsChangedData
): Promise<void> {
  try {
    const eventBus = container.resolve(Modules.EVENT_BUS) as {
      emit: (event: { name: string; data: CategoryFactsChangedData }) => Promise<void>
    }
    await eventBus.emit({ name: CATEGORY_FACTS_CHANGED, data })
  } catch {
    return
  }
}

export function categorySlugsForProduct(input: {
  productId: string
  links: Array<{ product_id: string; category_id: string }>
  categories: Array<{ id: string; slug: string | null; parent_id: string | null }>
}): string[] {
  const byId = new Map(input.categories.map((row) => [row.id, row]))
  const slugs = new Set<string>()
  for (const link of input.links) {
    if (link.product_id !== input.productId) continue
    const seen = new Set<string>()
    let current = byId.get(link.category_id) ?? null
    while (current && !seen.has(current.id)) {
      seen.add(current.id)
      const slug = current.slug?.trim()
      if (slug) slugs.add(slug)
      current = current.parent_id ? byId.get(current.parent_id) ?? null : null
    }
  }
  return [...slugs].sort()
}

/** Categories of every product that currently carries this brand. */
export function categorySlugsForBrand(input: {
  brandId: string
  products: Array<{ id: string; brand_id: string | null }>
  links: Array<{ product_id: string; category_id: string }>
  categories: Array<{ id: string; slug: string | null; parent_id: string | null }>
}): string[] {
  const slugs = new Set<string>()
  for (const product of input.products) {
    if (product.brand_id !== input.brandId) continue
    for (const slug of categorySlugsForProduct({
      productId: product.id,
      links: input.links,
      categories: input.categories,
    })) {
      slugs.add(slug)
    }
  }
  return [...slugs].sort()
}

/**
 * Recompute nothing and generate nothing.
 * Rows whose stored fingerprint differs from the current one become outdated.
 * A second call with the same fingerprints updates nothing.
 */
export async function handleCategoryFactsChanged(input: {
  productId?: string
  productIds?: string[]
  brandId?: string
  slugsForProduct: (productId: string) => Promise<string[]>
  slugsForBrand?: (brandId: string) => Promise<string[]>
  fingerprintFor: (slug: string) => Promise<string | null>
  repo: CategoryProposalRepository
}): Promise<{ updated: number; provider_calls: 0; slugs: string[] }> {
  const productIds = [...new Set([...(input.productIds ?? []), input.productId].filter(Boolean))] as string[]
  const slugs = new Set<string>()
  for (const productId of productIds) {
    for (const slug of await input.slugsForProduct(productId)) slugs.add(slug)
  }
  if (input.brandId && input.slugsForBrand) {
    for (const slug of await input.slugsForBrand(input.brandId)) slugs.add(slug)
  }
  const ordered = [...slugs].sort()
  const fingerprints: Record<string, string> = {}
  for (const slug of slugs) {
    const fingerprint = await input.fingerprintFor(slug)
    if (fingerprint) fingerprints[slug] = fingerprint
  }
  const result = await outdateCategoryCmsProposals(input.repo, fingerprints)
  return { ...result, slugs: ordered }
}
