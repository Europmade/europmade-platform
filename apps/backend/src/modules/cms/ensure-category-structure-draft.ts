import type { MedusaContainer } from "@medusajs/framework/types"
import { categoryCmsListExclusion, resolveCategoryCmsProfile } from "@europmade/utils"
import { PRODUCT_CLOUD_MODULE } from "../product-cloud"
import { parentIdOf } from "../product-cloud/category-admin"
import type ProductCloudModuleService from "../product-cloud/service"
import { CMS_MODULE } from "./index"
import type CmsModuleService from "./service"

/**
 * Zorgt dat een categorie een Draft heeft dat bij de taxonomiediepte hoort.
 * Published en een al kloppend Draft blijven staan.
 */
export async function ensureCategoryStructureDraftForId(
  container: MedusaContainer,
  categoryId: string
): Promise<{ action: "skip" | "write"; reason: string }> {
  const productCloud = container.resolve(PRODUCT_CLOUD_MODULE) as ProductCloudModuleService
  const cms = container.resolve(CMS_MODULE) as CmsModuleService
  const categories = await productCloud.listCategories(
    {},
    { take: 4000, relations: ["parent_category"] }
  )
  const category = categories.find((row) => row.id === categoryId)
  const slug = typeof category?.slug === "string" ? category.slug.trim() : ""
  if (!category || !slug) return { action: "skip", reason: "category_unknown" }
  if (categoryCmsListExclusion({ name: category.name, slug })) {
    return { action: "skip", reason: "excluded" }
  }
  const resolved = resolveCategoryCmsProfile(
    categories.map((row) => ({
      id: row.id,
      slug: row.slug ?? null,
      parent_id: parentIdOf(row),
    })),
    slug
  )
  if (!resolved.ok) return { action: "skip", reason: resolved.code }
  return cms.ensureCategoryStructureDraft({ slug, profile: resolved.profile })
}
