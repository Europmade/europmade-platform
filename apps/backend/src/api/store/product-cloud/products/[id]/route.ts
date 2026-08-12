import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { PRODUCT_CLOUD_MODULE } from "../../../../../modules/product-cloud"
import type ProductCloudModuleService from "../../../../../modules/product-cloud/service"
import { resolveApprovedSeller } from "../../resolve-seller"
import type { StorePatchProductCategoriesBodyInput } from "../../validators"
import { slugifyCategoryName } from "../../../../../modules/product-cloud/category-attributes"

type RouteParams = { id: string }
type ProductCategoryLink = { product_id: string; category_id: string }
type CategoryRow = { id: string; name: string; slug?: string | null }

export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const seller = await resolveApprovedSeller(
    req.scope,
    req.auth_context.actor_id
  )
  const { id } = req.params as RouteParams
  const productCloud = req.scope.resolve(
    PRODUCT_CLOUD_MODULE
  ) as ProductCloudModuleService

  const product = await productCloud.retrieveProduct(id)
  const isOwner = product.current_owner_seller_id === seller.id

  if (!isOwner) {
    const ownProposals = await productCloud.listChangeProposals({
      product_id: id,
      submitter_seller_id: seller.id,
    })
    res.json({
      product: {
        id: product.id,
        lifecycle_status: product.lifecycle_status,
        brand_id: product.brand_id,
        manufacturer_id: product.manufacturer_id,
        current_owner_seller_id: product.current_owner_seller_id,
      },
      versions: [],
      ownership_records: [],
      own_change_proposals: ownProposals,
    })
    return
  }

  const versions = await productCloud.listProductVersions(
    { product_id: id },
    { relations: ["media_items"] }
  )
  const ownership = await productCloud.listOwnershipRecords({
    product_id: id,
  })

  res.json({
    product,
    versions,
    ownership_records: ownership,
  })
}

export async function PATCH(
  req: AuthenticatedMedusaRequest<StorePatchProductCategoriesBodyInput>,
  res: MedusaResponse
) {
  const seller = await resolveApprovedSeller(
    req.scope,
    req.auth_context.actor_id
  )
  const { id } = req.params as RouteParams
  const productCloud = req.scope.resolve(
    PRODUCT_CLOUD_MODULE
  ) as ProductCloudModuleService

  const product = await productCloud.retrieveProduct(id)
  if (product.current_owner_seller_id !== seller.id) {
    res.status(403).json({ message: "Alleen de eigenaar mag categorieen wijzigen." })
    return
  }

  const uniqueNames = req.validatedBody.category_names
    .map((name) => name.trim())
    .filter(Boolean)
    .filter((name, index, arr) => arr.indexOf(name) === index)

  const existingLinks = (await productCloud.listProductCategories({
    product_id: id,
  })) as ProductCategoryLink[]
  const existingCategoryIds = new Set(existingLinks.map((link) => link.category_id))

  for (const categoryName of uniqueNames) {
    let category = ((await productCloud.listCategories({
      name: categoryName,
    })) as CategoryRow[])[0]
    if (!category) {
      const slug = slugifyCategoryName(categoryName)
      category = (await productCloud.createCategories({
        name: categoryName,
        slug,
      })) as CategoryRow
      await productCloud.ensureCategoryAttributeCatalog(category.id, slug)
    } else if (!category.slug) {
      const updated = (await productCloud.updateCategories({
        id: category.id,
        slug: slugifyCategoryName(categoryName),
      })) as CategoryRow | CategoryRow[]
      category = Array.isArray(updated) ? updated[0] : updated
    }

    if (!existingCategoryIds.has(category.id)) {
      await productCloud.createProductCategories({
        product_id: id,
        category_id: category.id,
      })
      existingCategoryIds.add(category.id)
    }
  }

  const previewCategories = (await productCloud.listProductCategories({
    product_id: id,
  })) as ProductCategoryLink[]
  const categories = previewCategories.length
    ? ((await productCloud.listCategories({
        id: previewCategories.map((link) => link.category_id),
      })) as CategoryRow[])
    : []

  res.json({
    product_id: id,
    category_names: categories.map((c) => c.name),
    category_count: categories.length,
  })
}
