import { persistMediaReference, resolveMediaUrl } from "@europmade/utils"
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

    const versions = (
      (await productCloud.listProductVersions(
        { product_id: productId },
        { take: 20 }
      )) as Array<{
        id: string
        version_number?: number
        publication_status?: string
      }>
    ).sort((a, b) => (b.version_number ?? 0) - (a.version_number ?? 0))
    const published = versions.find(
      (version) => version.publication_status === "Gepubliceerd"
    )
    if (options?.requirePublished && !published) return null
    const version = published ?? versions[0]

    const preview = await buildProductCloudPreview(productCloud, productId)
    const media = version
      ? await productCloud
          .listProductMedias(
            { product_version_id: version.id },
            { order: { sort_order: "ASC" }, take: 20 }
          )
          .catch(() => [])
      : []
    const primary =
      (
        media as Array<{ media_type?: string; storage_reference?: string }>
      ).find((m) => m.media_type === "Hoofdafbeelding") ||
      (media as Array<{ media_type?: string; storage_reference?: string }>).find(
        (m) => m.media_type !== "Video"
      )
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

/** Absolute product image URLs for the browser that called the API. */
export function resolveAdvertisingCardMedia<T extends { image_url: string | null }>(
  cards: T[],
  backendOrigin: string
): T[] {
  return cards.map((card) => ({
    ...card,
    image_url: resolveMediaUrl(card.image_url, backendOrigin),
  }))
}

export async function loadResolvedAdvertisingProductCards(
  productCloud: ProductCloudModuleService,
  productIds: string[],
  backendOrigin: string,
  options?: { requirePublished?: boolean }
): Promise<AdvertisingPublicProductCard[]> {
  const cards = await loadAdvertisingProductCards(
    productCloud,
    productIds,
    options
  )
  return resolveAdvertisingCardMedia(cards, backendOrigin)
}
