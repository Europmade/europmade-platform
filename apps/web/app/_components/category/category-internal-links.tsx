import Link from "next/link"

type LinkItem = { id: string; label: string; href: string }
type RefItem = { id: string; label: string; href: string }

type CategoryInternalLinksProps = {
  title: string
  links: LinkItem[]
  brandsTitle: string
  brands: RefItem[]
  producersTitle: string
  producers: RefItem[]
  combinedTitle: string
  combined: RefItem[]
}

/**
 * AI-generated internal links + related brands/producers (CMS-stored).
 */
export function CategoryInternalLinks({
  title,
  links,
  brandsTitle,
  brands,
  producersTitle,
  producers,
  combinedTitle,
  combined,
}: CategoryInternalLinksProps) {
  if (
    links.length === 0 &&
    brands.length === 0 &&
    producers.length === 0 &&
    combined.length === 0
  ) {
    return null
  }

  return (
    <section
      className="border-t border-wf-100 px-4 py-4 tablet:px-8 tablet:py-5"
      data-ai-content-block="internal-links"
    >
      {links.length > 0 ? (
        <div className="mb-4">
          <h2 className="mb-2.5 text-base font-bold text-wf-900 tablet:text-lg">
            {title}
          </h2>
          <ul className="flex flex-wrap gap-2">
            {links.map((l) => (
              <li key={l.id}>
                <Link
                  href={l.href}
                  className="inline-flex rounded-xl border border-wf-200 bg-white px-3 py-2 text-[12px] font-semibold text-wf-800 shadow-sm transition hover:-translate-y-0.5 hover:border-wf-300 hover:shadow-md"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <RefRow title={brandsTitle} items={brands} />
      <RefRow title={producersTitle} items={producers} />
      <RefRow title={combinedTitle} items={combined} />
    </section>
  )
}

function RefRow({ title, items }: { title: string; items: RefItem[] }) {
  if (items.length === 0) return null
  return (
    <div className="mb-3 last:mb-0">
      <h3 className="mb-1.5 text-[13px] font-bold text-wf-900">{title}</h3>
      <ul className="flex flex-wrap gap-1.5">
        {items.map((item) => (
          <li key={item.id}>
            <Link
              href={item.href}
              className="inline-flex rounded-lg border border-wf-200 bg-wf-50 px-2.5 py-1 text-[11.5px] font-semibold text-wf-800 hover:border-wf-400"
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
