"use client"

import { ProductCarousel } from "../product/product-carousel"
import type { ListingProduct } from "../../_lib/listing-products"
import {
  DEFAULT_STOREFRONT_LOCALE,
  type StorefrontLocale,
} from "../../_lib/i18n/locales"

/** Server → client bridge voor homepage-carrousels. */
export function HomepageCarousel({
  title,
  subtitle,
  products,
  locale = DEFAULT_STOREFRONT_LOCALE,
}: {
  title: string
  subtitle?: string
  products: ListingProduct[]
  locale?: StorefrontLocale
}) {
  return (
    <ProductCarousel
      title={title}
      subtitle={subtitle}
      products={products}
      locale={locale}
      lazy
      hideWhenEmpty
      className="!mt-0"
    />
  )
}
