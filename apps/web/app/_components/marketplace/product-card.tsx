import type { ListingProduct } from "../../_lib/listing-products"
import {
  DEFAULT_STOREFRONT_LOCALE,
  type StorefrontLocale,
} from "../../_lib/i18n/locales"
import { ProductCarouselCard } from "../product/product-carousel"

type ProductCardProps = {
  product: ListingProduct
  /** Behouden voor bestaande aanroepen. Elke weergave gebruikt dezelfde kaart. */
  layout?: "grid" | "list"
  locale?: StorefrontLocale
}

/** Zoek- en partneroverzichten gebruiken dezelfde productkaart als de homepage. */
export function ProductCard({
  product,
  locale = DEFAULT_STOREFRONT_LOCALE,
}: ProductCardProps) {
  return <ProductCarouselCard product={product} layout="grid" locale={locale} />
}
