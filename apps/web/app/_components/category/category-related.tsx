import Link from "next/link"
import {
  productMockupSrc,
  type ProductMockKind,
} from "../../_lib/product-mockup"

type RelatedItem = {
  slug: string
  label: string
  href: string
  productCount: number
  imageKind: string
}

type CategoryRelatedProps = {
  title: string
  productsSuffix: string
  items: RelatedItem[]
}

/**
 * Related categories — same card language as homepage category grid.
 * Images: studio PNG/WebP with transparent background (seller first photo later).
 */
export function CategoryRelated({
  title,
  productsSuffix,
  items,
}: CategoryRelatedProps) {
  if (items.length === 0) return null

  return (
    <section className="border-t border-wf-100 px-4 py-4 tablet:px-8 tablet:py-5">
      <h2 className="mb-2.5 text-base font-bold text-wf-900 tablet:text-lg">
        {title}
      </h2>
      <ul className="grid grid-cols-2 gap-2 tablet:grid-cols-3 tablet:gap-2.5 desktop:grid-cols-4">
        {items.map((item) => {
          const kind = item.imageKind as ProductMockKind
          return (
            <li key={item.slug} className="h-full">
              <Link
                href={item.href}
                className="group flex h-full flex-col rounded-xl border border-wf-200 bg-white p-1.5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-wf-300 hover:shadow-md"
                data-related-image-source="seller-first-photo-ready"
              >
                <div
                  className="relative aspect-square w-full overflow-hidden rounded-lg bg-[#f5f6f8]"
                  role="img"
                  aria-label={item.label}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={productMockupSrc(`related-${item.slug}`, kind)}
                    alt=""
                    className="h-full w-full object-contain p-1.5 drop-shadow-[0_8px_16px_rgba(15,23,42,0.1)]"
                    loading="lazy"
                    decoding="async"
                  />
                </div>
                <p className="mt-1 truncate text-[12px] font-bold leading-tight text-wf-900">
                  {item.label}
                </p>
                <p className="mt-0.5 text-[10px] text-wf-500">
                  {item.productCount} {productsSuffix}
                </p>
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
