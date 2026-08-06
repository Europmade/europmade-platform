"use client"

import { ProductCarousel } from "../product/product-carousel"
import type { ListingProduct } from "../../_lib/listing-products"

/** Server → client bridge voor homepage-carrousels. */
export function HomepageCarousel({
  title,
  subtitle,
  products,
}: {
  title: string
  subtitle?: string
  products: ListingProduct[]
}) {
  return (
    <ProductCarousel
      title={title}
      subtitle={subtitle}
      products={products}
      lazy
      hideWhenEmpty
      className="!mt-0"
    />
  )
}
