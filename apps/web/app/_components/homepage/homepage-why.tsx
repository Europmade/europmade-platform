type WhyItem = { id?: string; title: string; body: string }

export function HomepageWhySection({
  title,
  subtitle,
  items,
}: {
  title: string
  subtitle: string
  items: readonly WhyItem[]
}) {
  if (!title || items.length === 0) return null

  return (
    <section className="px-4 py-3.5 tablet:px-8 tablet:py-4">
      <h2 className="mb-0.5 text-base font-bold text-wf-900 tablet:text-lg">
        {title}
      </h2>
      {subtitle ? (
        <p className="mb-2 max-w-xl text-[12px] text-wf-600">{subtitle}</p>
      ) : null}
      <ul className="grid grid-cols-1 gap-2 tablet:grid-cols-2 desktop:grid-cols-4 desktop:gap-2.5">
        {items.map((item) => (
          <li
            key={item.id ?? item.title}
            className="rounded-xl border border-wf-200 bg-white p-2.5 shadow-sm"
          >
            <span
              className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-wf-900 text-[11px] font-bold text-white"
              aria-hidden
            >
              ✓
            </span>
            <h3 className="mt-1.5 text-[12.5px] font-bold text-wf-900">
              {item.title}
            </h3>
            <p className="mt-0.5 text-[11.5px] leading-snug text-wf-600">
              {item.body}
            </p>
          </li>
        ))}
      </ul>
    </section>
  )
}
