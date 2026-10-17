import Link from "next/link"
import { Button } from "@europmade/ui"
import type { ListingProduct } from "../../_lib/listing-products"

type CategoryEmptyProps = {
  title: string
  body: string
  homeLabel: string
  categoriesLabel: string
  alternatives?: ListingProduct[]
  alternativesLabel?: string
}

/**
 * Premium empty category — CTAs home + other categories.
 */
export function CategoryEmpty({
  title,
  body,
  homeLabel,
  categoriesLabel,
  alternatives = [],
  alternativesLabel,
}: CategoryEmptyProps) {
  return (
    <div
      role="status"
      className="rounded-2xl border border-wf-200 bg-wf-50 px-6 py-12 text-center shadow-sm"
    >
      <h2 className="text-base font-bold text-wf-900 tablet:text-lg">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-[13px] leading-relaxed text-wf-600">
        {body}
      </p>
      {alternatives.length > 0 ? (
        <div className="mx-auto mt-5 max-w-lg text-left">
          {alternativesLabel ? (
            <p className="mb-2 text-[12px] font-semibold text-wf-800">
              {alternativesLabel}
            </p>
          ) : null}
          <ul className="space-y-1">
            {alternatives.slice(0, 4).map((product) => (
              <li key={product.slug}>
                <Link href={`/product/${product.slug}`} className="text-[13px] text-wf-800 underline">
                  {product.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <div className="mt-5 flex flex-wrap justify-center gap-2.5">
        <Link href="/">
          <Button type="button" variant="primary">
            {homeLabel}
          </Button>
        </Link>
        <Link href="/categorie">
          <Button type="button" variant="secondary">
            {categoriesLabel}
          </Button>
        </Link>
      </div>
    </div>
  )
}
