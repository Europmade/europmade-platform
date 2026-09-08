import Link from "next/link"
import type { HomepageCategory } from "../../_lib/homepage-content"
import {
  productMockupSrc,
  CATEGORY_PRODUCT_KIND,
  type ProductMockKind,
} from "../../_lib/product-mockup"

function CategoryVisual({
  slug,
  label,
  image,
}: {
  slug: string
  label: string
  image?: string | null
}) {
  // Store/CMS fetch already rewrites media hosts; keep absolute or path as-is.
  const src = image && image.trim() ? image.trim() : null
  if (src) {
    return (
      <div
        className="relative aspect-square w-full overflow-hidden rounded-lg bg-[#f5f6f8]"
        role="img"
        aria-label={label}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt=""
          className="h-full w-full object-contain p-1.5"
          loading="lazy"
          decoding="async"
        />
      </div>
    )
  }
  const kind: ProductMockKind = CATEGORY_PRODUCT_KIND[slug] ?? "coffee"
  return (
    <div
      className="relative aspect-square w-full overflow-hidden rounded-lg bg-[#f5f6f8]"
      role="img"
      aria-label={label}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={productMockupSrc(`cat-${slug}`, kind)}
        alt=""
        className="h-full w-full object-contain p-1.5 drop-shadow-[0_8px_16px_rgba(15,23,42,0.1)]"
        loading="lazy"
        decoding="async"
      />
    </div>
  )
}

export function HomepageCategoryGrid({
  categories,
  productsSuffix = "producten",
}: {
  categories: HomepageCategory[]
  productsSuffix?: string
}) {
  return (
    <ul className="grid grid-cols-2 gap-2 tablet:grid-cols-3 tablet:gap-2.5 desktop:grid-cols-6">
      {categories.map((cat) => (
        <li key={cat.slug} className="h-full">
          <Link
            href={`/categorie/${cat.slug}`}
            className="group flex h-full flex-col rounded-xl border border-wf-200 bg-white p-1.5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-wf-300 hover:shadow-md"
          >
            <CategoryVisual slug={cat.slug} label={cat.label} image={cat.image} />
            <p className="mt-1 truncate text-[12px] font-bold leading-tight text-wf-900">
              {cat.label}
            </p>
            <p className="mt-0.5 text-[10px] text-wf-500">
              {cat.productCountHint}+ {productsSuffix}
            </p>
          </Link>
        </li>
      ))}
    </ul>
  )
}
