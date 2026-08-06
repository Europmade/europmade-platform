"use client"

import { ProductCarouselCard } from "../product/product-carousel"
import type { ListingProduct } from "../../_lib/listing-products"

/**
 * Grid van dezelfde kaarten als ProductCarousel (homepage uitgelicht).
 */
export function HomepageProductGrid({
  products,
}: {
  products: ListingProduct[]
}) {
  if (!products.length) return null
  return (
    <ul className="grid grid-cols-2 gap-2.5 tablet:grid-cols-3 tablet:gap-3 desktop:grid-cols-4 desktop:gap-4">
      {products.map((product) => (
        <li key={product.slug} className="min-w-0">
          <ProductCarouselCard product={product} layout="grid" />
        </li>
      ))}
    </ul>
  )
}
