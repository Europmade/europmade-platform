import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { PRODUCT_CLOUD_MODULE } from "../../../../../modules/product-cloud"
import type ProductCloudModuleService from "../../../../../modules/product-cloud/service"
import { resolveApprovedSeller } from "../../resolve-seller"
import { assertSellerCanDirectEditCatalog } from "../../catalog-edit-guard"
import { sellerCanDirectEditCatalog } from "../../catalog-edit-guard"
import { catalogGapsFromCurrent } from "../../../../../modules/product-cloud/catalog-gap-fill"
import type { StorePatchProductCategoriesBodyInput } from "../../validators"
import { resolveImportCategory, uniqueImportCategoryCatalog } from "../../../../../modules/product-cloud/import-category"

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
  const access = await sellerCanDirectEditCatalog(req.scope, product, seller)
  const isOwner = access.allowed

  if (!isOwner) {
    const ownProposals = await productCloud.listChangeProposals({
      product_id: id,
      submitter_seller_id: seller.id,
    })
    const versions = (await productCloud.listProductVersions(
      { product_id: id },
      { order: { version_number: "DESC" }, take: 5 }
    )) as Array<{
      id: string
      title: string
      description: string
      publication_status: string
      version_number: number
    }>
    const working =
      versions.find((v) => v.publication_status === "Gepubliceerd") ||
      versions[0] ||
      null
    const linkMap = await productCloud.listProductLinkSummariesForProducts([id])
    const catalog_gaps = catalogGapsFromCurrent({
      title: working?.title,
      description: working?.description,
      brand_id: product.brand_id,
      manufacturer_id: product.manufacturer_id,
    })
    const hasGaps = Object.values(catalog_gaps).some(Boolean)

    let attributes: Array<{
      attribute_definition_id: string
      code: string | null
      name: string
      value: string
    }> = []
    if (working) {
      const vals = (await productCloud.listAttributeValues({
        product_version_id: working.id,
      })) as Array<{
        attribute_definition_id: string
        value: string
      }>
      const defIds = [
        ...new Set(vals.map((v) => v.attribute_definition_id).filter(Boolean)),
      ]
      const defs =
        defIds.length > 0
          ? ((await productCloud.listAttributeDefinitions({
              id: defIds,
            })) as Array<{ id: string; code?: string; name?: string }>)
          : []
      const defById = new Map(defs.map((d) => [d.id, d]))
      attributes = vals.map((v) => {
        const def = defById.get(v.attribute_definition_id)
        return {
          attribute_definition_id: v.attribute_definition_id,
          code: def?.code ?? null,
          name: def?.name || v.attribute_definition_id,
          value: v.value ?? "",
        }
      })
    }

    res.json({
      product: {
        id: product.id,
        lifecycle_status: product.lifecycle_status,
        brand_id: product.brand_id,
        manufacturer_id: product.manufacturer_id,
        current_owner_seller_id: product.current_owner_seller_id,
        product_manager_kind: (product as { product_manager_kind?: string })
          .product_manager_kind,
        product_manager_seller_id: (
          product as { product_manager_seller_id?: string | null }
        ).product_manager_seller_id,
        catalog_owner: false,
        title: working?.title ?? null,
        description: working?.description ?? null,
        publication_status: working?.publication_status ?? null,
      },
      versions: working
        ? [
            {
              id: working.id,
              title: working.title,
              description: working.description,
              publication_status: working.publication_status,
              version_number: working.version_number,
            },
          ]
        : [],
      ownership_records: [],
      attributes,
      own_change_proposals: ownProposals,
      product_link_group: linkMap.get(id) ?? null,
      catalog_gaps,
      can_gap_fill: hasGaps,
      can_propose_change: true,
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
    product: {
      ...product,
      catalog_owner: true,
    },
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
  await assertSellerCanDirectEditCatalog(req.scope, product, seller)

  const uniqueNames = req.validatedBody.category_names
    .map((name) => name.trim())
    .filter(Boolean)
    .filter((name, index, arr) => arr.indexOf(name) === index)

  const existingLinks = (await productCloud.listProductCategories({
    product_id: id,
  })) as ProductCategoryLink[]
  const existingCategoryIds = new Set(existingLinks.map((link) => link.category_id))

  const catalog = uniqueImportCategoryCatalog(
    (await productCloud.listCategories(
      {},
      { take: 500 }
    )) as Array<{ id: string; name: string; slug?: string | null }>
  )

  for (const categoryName of uniqueNames) {
    const resolved = resolveImportCategory(categoryName, catalog)
    const category = resolved.matched
    if (!category) {
      res.status(400).json({
        message: `Categorie niet herkend — kies een EuropMade-categorie.`,
      })
      return
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
