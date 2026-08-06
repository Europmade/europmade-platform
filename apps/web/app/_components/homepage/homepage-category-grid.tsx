import Link from "next/link"
import { hashHue } from "../../_lib/cart-line-meta"
import type { HomepageCategory } from "../../_lib/homepage-content"

function CategoryVisual({ slug, label }: { slug: string; label: string }) {
  const hue = hashHue(slug)
  return (
    <div
      className="aspect-[5/4] w-full overflow-hidden rounded-lg"
      style={{
        background: `linear-gradient(145deg, hsl(${hue} 32% 90%), hsl(${(hue + 35) % 360} 26% 76%))`,
      }}
      role="img"
      aria-label={`Categorie ${label}`}
    />
  )
}

/**
 * Premium categoriekaarten — 2 / 3 / 6 (mobiel / tablet / desktop).
 */
export function HomepageCategoryGrid({
  categories,
}: {
  categories: HomepageCategory[]
}) {
  return (
    <ul className="grid grid-cols-2 gap-2.5 tablet:grid-cols-3 tablet:gap-3 desktop:grid-cols-6">
      {categories.map((cat) => (
        <li key={cat.slug}>
          <Link
            href={`/categorie/${cat.slug}`}
            className="group block h-full rounded-xl border border-wf-200 bg-white p-2 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-wf-300 hover:shadow-md"
          >
            <CategoryVisual slug={cat.slug} label={cat.label} />
            <p className="mt-1.5 truncate text-[12.5px] font-bold text-wf-900">
              {cat.label}
            </p>
            <p className="mt-0.5 text-[10.5px] text-wf-500">
              {cat.productCountHint}+ producten
            </p>
          </Link>
        </li>
      ))}
    </ul>
  )
}
