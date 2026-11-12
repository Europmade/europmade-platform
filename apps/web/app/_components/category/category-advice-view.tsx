import Link from "next/link"
import type { AdviceLink, CategoryAdvice } from "@europmade/utils"
import type { StorefrontLocale } from "../../_lib/i18n/locales"
import { PublicStorefrontChrome } from "../marketplace/public-storefront-chrome"

export function CategoryAdviceView({
  advice,
  locale,
  categoryName,
  categoryHref,
  selections,
}: {
  advice: CategoryAdvice
  locale: StorefrontLocale
  categoryName: string
  categoryHref: string
  selections: AdviceLink[]
}) {
  return (
    <PublicStorefrontChrome locale={locale}>
      <article className="px-4 py-6 sm:px-6">
        <nav aria-label="Broodkruimels" className="text-xs text-slate-500">
          <ol className="flex flex-wrap gap-1">
            <li>
              <Link href="/" className="hover:underline">Home</Link>
            </li>
            <li className="flex gap-1">
              <span aria-hidden>/</span>
              <Link href={categoryHref} className="hover:underline">{categoryName}</Link>
            </li>
            <li className="flex gap-1">
              <span aria-hidden>/</span>
              <span>Keuzehulp</span>
            </li>
          </ol>
        </nav>

        <header className="mt-4 overflow-hidden rounded-3xl bg-white">
          <div className="grid items-center gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <div className="py-2 lg:py-6">
              <p className="text-sm font-semibold text-[#1f8a4c]">Keuzehulp</p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#16315c] sm:text-4xl">{advice.heroTitle}</h1>
              <p className="mt-3 max-w-xl text-base leading-7 text-slate-600">{advice.heroIntro}</p>
              <Link
                href={categoryHref}
                className="mt-5 inline-flex rounded-full bg-[#1f8a4c] px-5 py-3 text-sm font-semibold text-white hover:bg-[#187a41]"
              >
                Bekijk {categoryName.toLocaleLowerCase("nl")}
              </Link>
            </div>
            <div className="relative min-h-56 overflow-hidden rounded-3xl bg-slate-100 sm:min-h-72">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={advice.imageSrc}
                alt={advice.imageAlt}
                className="absolute inset-0 h-full w-full object-cover"
                style={{ objectPosition: advice.imagePosition }}
              />
            </div>
          </div>
        </header>

        <section className="mt-8" aria-labelledby="advies-onderwerpen">
          <h2 id="advies-onderwerpen" className="text-xl font-bold text-[#16315c]">{advice.topicsTitle}</h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {advice.topics.map((topic) => (
              <li key={topic.id}>
                <a
                  href={`#${topic.id}`}
                  className="block h-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-[#16315c] hover:border-[#1f8a4c]"
                >
                  {topic.title}
                </a>
              </li>
            ))}
          </ul>
        </section>

        <div className="mt-10 space-y-10">
          {advice.sections.map((section) => (
            <section key={section.id} id={section.id} className="scroll-mt-6">
              <h2 className="text-xl font-bold text-[#16315c]">{section.title}</h2>
              <div className="mt-3 max-w-3xl space-y-3 text-sm leading-6 text-slate-700">
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph.slice(0, 48)}>{paragraph}</p>
                ))}
              </div>
              {section.bullets && section.bullets.length > 0 ? (
                <ul className="mt-4 max-w-3xl space-y-3 text-sm leading-6 text-slate-700">
                  {section.bullets.map((bullet) => (
                    <li key={bullet.slice(0, 40)} className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                      {bullet}
                    </li>
                  ))}
                </ul>
              ) : null}
              {section.links && section.links.length > 0 ? (
                <ul className="mt-4 flex flex-wrap gap-2">
                  {section.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="inline-flex rounded-full border border-[#1f8a4c] px-4 py-2 text-sm font-semibold text-[#1f8a4c]"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>
          ))}
        </div>

        <section className="mt-12" aria-labelledby="advies-vragen">
          <h2 id="advies-vragen" className="text-xl font-bold text-[#16315c]">Veelgestelde vragen</h2>
          <div className="mt-4 divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white px-4">
            {advice.faqs.map((item) => (
              <details key={item.question} className="py-3">
                <summary className="cursor-pointer font-semibold text-[#16315c]">{item.question}</summary>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-700">{item.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="mt-12" aria-labelledby="advies-selectie">
          <h2 id="advies-selectie" className="text-xl font-bold text-[#16315c]">{advice.selectionsTitle}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{advice.selectionsIntro}</p>
          {selections.length > 0 ? (
            <ul className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              {selections.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="inline-flex rounded-full bg-[#16315c] px-4 py-2 text-sm font-semibold text-white"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-slate-600">
              Er is nu geen selectie met een ingevulde eigenschap. Open het assortiment om te kijken wat er beschikbaar is.
            </p>
          )}
        </section>
      </article>
    </PublicStorefrontChrome>
  )
}
