import { HOMEPAGE_WHY_ITEMS } from "../../_lib/homepage-content"

/**
 * Waarom EuropMade — 4 compacte premium cards.
 */
export function HomepageWhySection() {
  return (
    <section className="px-4 py-6 tablet:px-8 tablet:py-7">
      <h2 className="mb-0.5 text-base font-bold text-wf-900 tablet:text-lg">
        Waarom kiezen voor EuropMade?
      </h2>
      <p className="mb-3.5 max-w-xl text-[12.5px] text-wf-600">
        Een rustige marketplace met focus op herkomst, makers en eerlijke keuze.
      </p>
      <ul className="grid grid-cols-1 gap-2.5 tablet:grid-cols-2 desktop:grid-cols-4 desktop:gap-3">
        {HOMEPAGE_WHY_ITEMS.map((item) => (
          <li
            key={item.title}
            className="rounded-xl border border-wf-200 bg-white p-3 shadow-sm"
          >
            <span
              className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-wf-900 text-xs font-bold text-white"
              aria-hidden
            >
              ✓
            </span>
            <h3 className="mt-2 text-[13px] font-bold text-wf-900">
              {item.title}
            </h3>
            <p className="mt-1 text-[12px] leading-relaxed text-wf-600">
              {item.body}
            </p>
          </li>
        ))}
      </ul>
    </section>
  )
}
