import type { MedusaContainer } from "@medusajs/framework/types"
import { cmsProposalRepository } from "./category-cms-proposal-db"
import { outdateCategoryCmsProposals } from "./category-cms-proposal-store"
import { CMS_MODULE } from "./index"
import type CmsModuleService from "./service"

/**
 * A new category link can make existing draft text stale.
 * Proposals are marked outdated and the draft is flagged. The text is not rewritten.
 */
export async function noteImportedCategoryLinks(
  container: MedusaContainer,
  slugs: string[]
): Promise<void> {
  const unique = [...new Set(slugs.map((slug) => slug.trim().toLowerCase()).filter(Boolean))]
  if (unique.length === 0) return
  const cms = container.resolve(CMS_MODULE) as CmsModuleService
  const notedAt = new Date().toISOString()
  await outdateCategoryCmsProposals(
    cmsProposalRepository(cms),
    Object.fromEntries(unique.map((slug) => [slug, `assortment:${notedAt}`]))
  )
  for (const slug of unique) {
    await cms.markCategoryEditorialReview({ slug, notedAt })
  }
}
