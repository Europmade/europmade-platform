import { persistMediaReference } from "@europmade/utils"
import type ProductCloudModuleService from "../../../modules/product-cloud/service"
import { buildProductCloudPreview } from "../product-cloud/product-preview"

export type AdvertisingPublicProductCard = {
  id: string
  title: string | null
  slug: string | null
  image_url: string | null
  href: string
}

export async function toAdvertisingPublicProductCard(
  productCloud: ProductCloudModuleService,
  productId: string,
  options?: { requirePublished?: boolean }
): Promise<AdvertisingPublicProductCard | null> {
  try {
    const product = await productCloud.retrieveProduct(productId)
    if (product.lifecycle_status === "Gearchiveerd") return null

    if (options?.requirePublished) {
      const versions = await productCloud.listProductVersions(
        { product_id: productId, publication_status: "Gepubliceerd" },
        { take: 1 }
      )
      if (!versions.length) return null
    }

    const preview = await buildProductCloudPreview(productCloud, productId)
    const media = await productCloud
      .listProductMedias(
        { product_id: productId },
        { order: { sort_order: "ASC" }, take: 20 }
      )
      .catch(() => [])
    const primary =
      (
        media as Array<{ media_type?: string; storage_reference?: string }>
      ).find((m) => m.media_type === "Hoofdafbeelding") ||
      (media as Array<{ storage_reference?: string }>)[0]
    const title = preview.title ?? null
    // Storefront PDP resolves by product id (`/product/{prod_…}`), not title slug.
    return {
      id: productId,
      title,
      slug: productId,
      image_url: persistMediaReference(primary?.storage_reference ?? null),
      href: `/product/${encodeURIComponent(productId)}`,
    }
  } catch {
    return null
  }
}

export async function loadAdvertisingProductCards(
  productCloud: ProductCloudModuleService,
  productIds: string[],
  options?: { requirePublished?: boolean }
): Promise<AdvertisingPublicProductCard[]> {
  const out: AdvertisingPublicProductCard[] = []
  for (const id of productIds) {
    const card = await toAdvertisingPublicProductCard(
      productCloud,
      id,
      options
    )
    if (card) out.push(card)
  }
  return out
}
