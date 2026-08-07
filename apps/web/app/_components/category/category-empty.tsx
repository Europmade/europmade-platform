import Link from "next/link"
import { Button } from "@europmade/ui"

type CategoryEmptyProps = {
  title: string
  body: string
  homeLabel: string
  categoriesLabel: string
}

/**
 * Premium empty category — CTAs home + other categories.
 */
export function CategoryEmpty({
  title,
  body,
  homeLabel,
  categoriesLabel,
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
