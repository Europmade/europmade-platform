import {
  resolveCategoryCmsProfile,
  type CategoryCmsProfile,
} from "@europmade/utils"
import { PRODUCT_CLOUD_MODULE } from "../../../../modules/product-cloud"
import type ProductCloudModuleService from "../../../../modules/product-cloud/service"
import { CategoryPdError } from "../../../../modules/cms/category-published-draft"

type Scope = { resolve: (key: string) => unknown }

export async function requireCategoryProfile(
  scope: Scope,
  slug: string
): Promise<CategoryCmsProfile> {
  const productCloud = scope.resolve(
    PRODUCT_CLOUD_MODULE
  ) as ProductCloudModuleService
  const rows = await productCloud.listCategories({}, { take: 2000 })
  const resolved = resolveCategoryCmsProfile(
    rows.map((row) => {
      const record = row as {
        id: string
        slug?: string | null
        parent_category_id?: string | null
        parent_category?: { id?: string | null } | null
      }
      return {
        id: record.id,
        slug: record.slug ?? null,
        parent_id:
          record.parent_category_id ?? record.parent_category?.id ?? null,
      }
    }),
    slug
  )
  if (!resolved.ok) {
    throw new CategoryPdError(
      resolved.code,
      `No usable pc_category profile for '${slug}'`,
      { code: resolved.code }
    )
  }
  return resolved.profile
}
