import type ProductCloudModuleService from "../../../modules/product-cloud/service"
import {
  isConceptDraftIdentifier,
  resolveCatalogGtinValue,
} from "../../../modules/product-cloud/concept-identifier"

export type ProductCloudPreview = {
  product_id: string
  title: string | null
  brand_id: string
  manufacturer_id: string
  lifecycle_status: string
  category_names: string[]
  identifier_id: string | null
  identifier_type: string | null
  identifier_value: string | null
}

type VersionRow = {
  id: string
  product_id: string
  version_number: number
  title: string
  publication_status: string
}

type ProductRow = {
  id: string
  brand_id: string
  manufacturer_id: string
  lifecycle_status: string
}

type ProductCategoryRow = {
  product_id: string
  category_id: string
}

type CategoryRow = {
  id: string
  name: string
}

type VariantRow = {
  id: string
  product_id: string
}

type IdentifierRow = {
  id: string
  product_variant_id: string
  identifier_type: string
  identifier_value: string
  country_scope?: string | null
}

function pickCatalogIdentifier(ids: IdentifierRow[]): IdentifierRow | null {
  const gtin = ids.find(
    (i) =>
      i.identifier_type === "GTIN" &&
      resolveCatalogGtinValue(i.identifier_type, i.identifier_value, i.country_scope)
  )
  if (gtin) return gtin
  const mpn = ids.find((i) => i.identifier_type === "MPN")
  if (mpn) return mpn
  return (
    ids.find(
      (i) =>
        !isConceptDraftIdentifier(
          i.identifier_type,
          i.identifier_value,
          i.country_scope
        )
    ) ?? null
  )
}

function pickDisplayTitle(versions: VersionRow[]): string | null {
  const published = versions
    .filter((v) => v.publication_status === "Gepubliceerd")
    .sort((a, b) => b.version_number - a.version_number)[0]
  if (published) return published.title

  const latest = [...versions].sort(
    (a, b) => b.version_number - a.version_number
  )[0]
  return latest?.title ?? null
}

/**
 * Publieke Product Cloud-weergave voor match/lijst (ADR-0013).
 */
export async function buildProductCloudPreview(
  productCloud: ProductCloudModuleService,
  productId: string,
  preferredIdentifier?: {
    identifier_id?: string
    identifier_type?: string
    identifier_value?: string
  }
): Promise<ProductCloudPreview> {
  const [product, versions, links] = (await Promise.all([
    productCloud.retrieveProduct(productId),
    productCloud.listProductVersions({ product_id: productId }),
    productCloud.listProductCategories({ product_id: productId }),
  ])) as [ProductRow, VersionRow[], ProductCategoryRow[]]
  const categoryIds = links.map((l) => l.category_id)
  const categories =
    categoryIds.length > 0
      ? ((await productCloud.listCategories({
          id: categoryIds,
        })) as CategoryRow[])
      : []

  let identifier_id: string | null =
    preferredIdentifier?.identifier_id ?? null
  let identifier_type: string | null =
    preferredIdentifier?.identifier_type ?? null
  let identifier_value: string | null =
    preferredIdentifier?.identifier_value ?? null

  if (!identifier_value || !identifier_id) {
    const variants = (await productCloud.listProductVariants({
      product_id: productId,
    })) as VariantRow[]
    for (const variant of variants) {
      const ids = (await productCloud.listIdentifiers({
        product_variant_id: variant.id,
      })) as IdentifierRow[]
      const preferred =
        identifier_value != null
          ? ids.find((i) => i.identifier_value === identifier_value)
          : undefined
      const hit = preferred ?? pickCatalogIdentifier(ids)
      if (hit) {
        identifier_id = hit.id
        identifier_type = hit.identifier_type
        identifier_value =
          hit.identifier_type === "GTIN"
            ? resolveCatalogGtinValue(
                hit.identifier_type,
                hit.identifier_value,
                hit.country_scope
              )
            : isConceptDraftIdentifier(
                  hit.identifier_type,
                  hit.identifier_value,
                  hit.country_scope
                )
              ? null
              : hit.identifier_value
        break
      }
    }
  }

  return {
    product_id: product.id,
    title: pickDisplayTitle(versions),
    brand_id: product.brand_id,
    manufacturer_id: product.manufacturer_id,
    lifecycle_status: product.lifecycle_status,
    category_names: categories.map((c) => c.name),
    identifier_id,
    identifier_type,
    identifier_value,
  }
}
