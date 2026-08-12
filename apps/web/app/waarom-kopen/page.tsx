import type { Metadata } from "next"
import Link from "next/link"
import { PublicStorefrontChrome } from "../_components/marketplace/public-storefront-chrome"
import { getStorefrontLocaleFromCookies } from "../_lib/i18n/get-storefront-locale"
import { t } from "../_lib/i18n/messages"

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getStorefrontLocaleFromCookies()
  return {
    title: `${t("whyBuyTitle", locale)} — EuropMade`,
    description: t("whyBuyLead", locale),
    alternates: { canonical: "/waarom-kopen" },
  }
}

/**
 * Commerciële "Waarom kopen bij EuropMade?" — geen verzonnen cijfers/claims.
 */
export default async function WhyBuyPage() {
  const locale = await getStorefrontLocaleFromCookies()

  const points = [
    { title: "whyBuyPoint1Title", body: "whyBuyPoint1Body" },
    { title: "whyBuyPoint2Title", body: "whyBuyPoint2Body" },
    { title: "whyBuyPoint3Title", body: "whyBuyPoint3Body" },
    { title: "whyBuyPoint4Title", body: "whyBuyPoint4Body" },
  ] as const

  return (
    <PublicStorefrontChrome locale={locale}>
      <div className="relative overflow-hidden border-b border-wf-200 bg-gradient-to-br from-[#eef6f1] via-white to-[#f3f1ea]">
        <div className="mx-auto max-w-4xl px-4 py-12 tablet:px-8 tablet:py-16">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-800">
            EuropMade
          </p>
          <h1 className="mt-3 max-w-2xl text-3xl font-bold tracking-tight text-wf-950 tablet:text-5xl">
            {t("whyBuyHero", locale)}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-wf-700 tablet:text-lg">
            {t("whyBuyLead", locale)}
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              href="/zoeken"
              className="rounded-md bg-wf-900 px-4 py-2.5 text-sm font-semibold text-white"
            >
              {t("whyBuyCtaBrowse", locale)}
            </Link>
            <Link
              href="/made-in-europe"
              className="rounded-md border border-wf-400 bg-white/80 px-4 py-2.5 text-sm font-semibold text-wf-900"
            >
              {t("whyBuyCtaMie", locale)}
            </Link>
          </div>
        </div>
      </div>

      <section className="mx-auto grid max-w-4xl gap-6 px-4 py-10 tablet:grid-cols-2 tablet:px-8">
        {points.map((point) => (
          <article
            key={point.title}
            className="border-t border-wf-200 pt-4"
          >
            <h2 className="text-lg font-bold text-wf-900">
              {t(point.title, locale)}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-wf-700">
              {t(point.body, locale)}
            </p>
          </article>
        ))}
      </section>

      <section className="border-t border-wf-200 bg-wf-50">
        <div className="mx-auto max-w-4xl px-4 py-10 tablet:px-8">
          <h2 className="text-xl font-bold text-wf-900">
            {t("miePageTitle", locale)}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-wf-700">
            {t("mieScoreMeaning", locale)}
          </p>
          <Link
            href="/made-in-europe"
            className="mt-4 inline-flex text-sm font-semibold text-wf-900 underline"
          >
            {t("mieHowDetermined", locale)}
          </Link>
        </div>
      </section>
    </PublicStorefrontChrome>
  )
}
