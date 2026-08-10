import { ProductCarousel } from "../product/product-carousel"
import type { ListingProduct } from "../../_lib/listing-products"
import type { CategoryDynamicBlockKey } from "../../_lib/cms/category-cms"
import {
  DEFAULT_STOREFRONT_LOCALE,
  type StorefrontLocale,
} from "../../_lib/i18n/locales"

type DynamicBlock = {
  id: string
  key: CategoryDynamicBlockKey
  title: string
  subtitle: string
  products: ListingProduct[]
}

type CategoryDynamicBlocksProps = {
  blocks: DynamicBlock[]
  locale?: StorefrontLocale
}

/**
 * Optional CMS/AI blocks (popular brands, best rated, etc.).
 * Visibility & order come from CMS; content is precomputed (no AI on request).
 */
export function CategoryDynamicBlocks({
  blocks,
  locale = DEFAULT_STOREFRONT_LOCALE,
}: CategoryDynamicBlocksProps) {
  const visible = blocks.filter((b) => b.products.length > 0)
  if (visible.length === 0) return null

  return (
    <div className="space-y-0 border-t border-wf-100">
      {visible.map((block) => (
        <section
          key={block.id}
          className="px-4 pb-3 pt-2.5 tablet:px-8 tablet:pb-3.5 tablet:pt-3"
          data-dynamic-block={block.key}
        >
          <ProductCarousel
            title={block.title}
            subtitle={block.subtitle || undefined}
            products={block.products}
            locale={locale}
            lazy
          />
        </section>
      ))}
    </div>
  )
}
