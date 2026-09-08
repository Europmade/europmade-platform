type WhyItem = { id?: string; title: string; body: string; image?: string | null }

export function HomepageWhySection({
  title,
  subtitle,
  image,
  items,
  honestEmpty,
}: {
  title: string
  subtitle: string
  image?: string | null
  items: readonly WhyItem[]
  honestEmpty?: boolean
}) {
  if (!title && items.length === 0) return null
  if (!title && !honestEmpty) return null

  return (
    <section className="px-4 py-3.5 tablet:px-8 tablet:py-4">
      {title ? (
        <h2 className="mb-0.5 text-base font-bold text-wf-900 tablet:text-lg">
          {title}
        </h2>
      ) : null}
      {subtitle ? (
        <p className="mb-2 max-w-xl text-[12px] text-wf-600">{subtitle}</p>
      ) : null}
      {image ? (
        <div className="mb-3 aspect-[16/9] overflow-hidden rounded-xl border border-wf-200 bg-wf-50">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
          />
        </div>
      ) : null}
      {items.length === 0 ? (
        honestEmpty ? (
          <p className="text-[13px] text-wf-500">Geen USP&apos;s ingesteld</p>
        ) : null
      ) : (
        <ul className="grid grid-cols-1 gap-2 tablet:grid-cols-2 desktop:grid-cols-4 desktop:gap-2.5">
          {items.map((item) => (
            <li
              key={item.id ?? item.title}
              className="flex h-full flex-col overflow-hidden rounded-xl border border-wf-200 bg-white shadow-sm"
            >
              {item.image ? (
                <div className="aspect-[16/10] w-full shrink-0 overflow-hidden bg-wf-50">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.image}
                    alt=""
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                </div>
              ) : null}
              <div className="flex flex-1 flex-col p-2.5">
                <h3 className="text-[12.5px] font-bold text-wf-900">
                  {item.title}
                </h3>
                <p className="mt-0.5 text-[11.5px] leading-snug text-wf-600">
                  {item.body}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
