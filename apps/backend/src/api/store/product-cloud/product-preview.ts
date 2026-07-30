import type ProductCloudModuleService from "../../../modules/product-cloud/service"

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
  const product = (await productCloud.retrieveProduct(
    productId
  )) as ProductRow

  const versions = (await productCloud.listProductVersions({
    product_id: productId,
  })) as VersionRow[]

  const links = (await productCloud.listProductCategories({
    product_id: productId,
  })) as ProductCategoryRow[]
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
      const gtin =
        preferred ?? ids.find((i) => i.identifier_type === "GTIN") ?? ids[0]
      if (gtin) {
        identifier_id = gtin.id
        identifier_type = gtin.identifier_type
        identifier_value = gtin.identifier_value
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
