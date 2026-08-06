"use client"

import {
  ProductCarousel,
  ProductThumbBlock,
  type ProductCarouselProps,
} from "../product/product-carousel"
import type { ListingProduct } from "../../_lib/listing-products"

type ProductRailsProps = {
  title: string
  subtitle?: string
  products: ListingProduct[]
  emptyHint?: string
  loading?: boolean
  /** @deprecated Prefer ProductCarousel variant="compact" */
  variant?: "page" | "drawer" | ProductCarouselProps["variant"]
  showAddToCart?: boolean
  onAddToCart?: ProductCarouselProps["onAddToCart"]
  onNavigate?: () => void
  hideWhenEmpty?: boolean
  className?: string
  lazy?: boolean
}

/**
 * Compat-wrapper → ProductCarousel (één bron voor alle rails).
 */
export function ProductRails({
  variant = "page",
  ...rest
}: ProductRailsProps) {
  const mapped =
    variant === "drawer" ? "compact" : variant === "page" ? "default" : variant
  return <ProductCarousel variant={mapped} {...rest} />
}

export { ProductThumbBlock }
export type { ProductRailsProps }
