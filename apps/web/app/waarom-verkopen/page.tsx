import type { Metadata } from "next"
import Link from "next/link"
import { PublicStorefrontChrome } from "../_components/marketplace/public-storefront-chrome"
import { getStorefrontLocaleFromCookies } from "../_lib/i18n/get-storefront-locale"
import { countryDisplayLabel, t } from "../_lib/i18n/messages"

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getStorefrontLocaleFromCookies()
  return {
    title: `${t("whySellTitle", locale)} — EuropMade`,
    description: t("whySellMetaDesc", locale),
    alternates: { canonical: "/waarom-verkopen" },
    openGraph: {
      title: `${t("whySellTitle", locale)} — EuropMade`,
      description: t("whySellMetaDesc", locale),
      url: "/waarom-verkopen",
      type: "website",
    },
  }
}

const MARKET_CODES = ["NL", "DE", "FR", "BE", "AT", "ES", "IT"] as const

const FAQ_KEYS = [
  ["whySellFaq1Q", "whySellFaq1A"],
  ["whySellFaq2Q", "whySellFaq2A"],
  ["whySellFaq3Q", "whySellFaq3A"],
  ["whySellFaq4Q", "whySellFaq4A"],
  ["whySellFaq5Q", "whySellFaq5A"],
  ["whySellFaq6Q", "whySellFaq6A"],
  ["whySellFaq7Q", "whySellFaq7A"],
  ["whySellFaq8Q", "whySellFaq8A"],
] as const

const HOW_STEPS = [
  "whySellHowStep1",
  "whySellHowStep2",
  "whySellHowStep3",
  "whySellHowStep4",
  "whySellHowStep5",
  "whySellHowStep6",
] as const

const GROWTH_ITEMS = [
  "whySellGrowthItem1",
  "whySellGrowthItem2",
  "whySellGrowthItem3",
  "whySellGrowthItem4",
  "whySellGrowthItem5",
] as const

const AUDIENCE_ITEMS = [
  "whySellAudienceItem1",
  "whySellAudienceItem2",
  "whySellAudienceItem3",
  "whySellAudienceItem4",
] as const

const PLATFORM_BULLETS = [
  "whySellOnePlatformBullet1",
  "whySellOnePlatformBullet2",
  "whySellOnePlatformBullet3",
  "whySellOnePlatformBullet4",
] as const

/**
 * B2B landingspagina — Waarom verkopen via EuropMade (Sprint 9).
 * Geen verzonnen cijfers/claims; CTA's naar bestaande onboarding/Mie-routes.
 */
export default async function WhySellPage() {
  const locale = await getStorefrontLocaleFromCookies()

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ_KEYS.map(([qKey, aKey]) => ({
      "@type": "Question",
      name: t(qKey, locale),
      acceptedAnswer: {
        "@type": "Answer",
        text: t(aKey, locale),
      },
    })),
  }

  return (
    <PublicStorefrontChrome locale={locale}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      {/* 1. Hero */}
      <section className="relative overflow-hidden border-b border-wf-200 bg-gradient-to-br from-[#e8f2ec] via-white to-[#f4f1ea]">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.35]"
          aria-hidden
          style={{
            backgroundImage:
              "radial-gradient(circle at 12% 20%, rgba(16,85,58,0.12), transparent 42%), radial-gradient(circle at 88% 10%, rgba(30,58,95,0.10), transparent 38%)",
          }}
        />
        <div className="relative mx-auto max-w-5xl px-4 py-12 tablet:px-8 tablet:py-20">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-900">
            EuropMade
          </p>
          <h1 className="mt-3 max-w-3xl text-3xl font-bold tracking-tight text-wf-950 tablet:text-5xl">
            {t("whySellHero", locale)}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-wf-700 tablet:text-lg">
            {t("whySellLead", locale)}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/partner-onboarding"
              className="rounded-md bg-wf-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-wf-800"
            >
              {t("whySellCtaStart", locale)}
            </Link>
            <Link
              href="#hoe-het-werkt"
              className="rounded-md border border-wf-400 bg-white/80 px-5 py-2.5 text-sm font-semibold text-wf-900 hover:bg-white"
            >
              {t("whySellCtaHow", locale)}
            </Link>
            <Link
              href="/made-in-europe"
              className="rounded-md border border-transparent px-5 py-2.5 text-sm font-semibold text-wf-800 underline-offset-2 hover:underline"
            >
              {t("whySellCtaMie", locale)}
            </Link>
          </div>
        </div>
      </section>

      {/* 2. Probleem */}
      <section className="mx-auto max-w-5xl px-4 py-12 tablet:px-8">
        <h2 className="max-w-2xl text-2xl font-bold tracking-tight text-wf-950 tablet:text-3xl">
          {t("whySellProblemTitle", locale)}
        </h2>
        <p className="mt-4 max-w-3xl text-sm leading-relaxed text-wf-700 tablet:text-base">
          {t("whySellProblemBody", locale)}
        </p>
        <p className="mt-4 max-w-3xl text-sm font-medium leading-relaxed text-wf-900 tablet:text-base">
          {t("whySellProblemClose", locale)}
        </p>
      </section>

      {/* 3. Eén platform */}
      <section className="border-y border-wf-200 bg-wf-50">
        <div className="mx-auto max-w-5xl px-4 py-12 tablet:px-8">
          <h2 className="text-2xl font-bold tracking-tight text-wf-950 tablet:text-3xl">
            {t("whySellOnePlatformTitle", locale)}
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-wf-700 tablet:text-base">
            {t("whySellOnePlatformLead", locale)}
          </p>

          <div className="mt-8 grid gap-4 tablet:grid-cols-[1fr_auto_1fr_auto_1.4fr] tablet:items-center">
            <div className="rounded-xl border border-wf-200 bg-white px-4 py-5 text-center shadow-sm">
              <p className="text-sm font-bold text-wf-900">
                {t("whySellOnePlatformProducer", locale)}
              </p>
            </div>
            <p className="hidden text-center text-wf-400 tablet:block" aria-hidden>
              →
            </p>
            <div className="rounded-xl border border-emerald-800/25 bg-emerald-50/80 px-4 py-5 text-center shadow-sm">
              <p className="text-sm font-bold text-emerald-950">
                {t("whySellOnePlatformHub", locale)}
              </p>
            </div>
            <p className="hidden text-center text-wf-400 tablet:block" aria-hidden>
              →
            </p>
            <div className="rounded-xl border border-wf-200 bg-white px-4 py-5 shadow-sm">
              <p className="text-center text-xs font-bold uppercase tracking-wide text-wf-600">
                {t("whySellOnePlatformMarkets", locale)}
              </p>
              <ul className="mt-3 flex flex-wrap justify-center gap-2">
                {MARKET_CODES.map((code) => (
                  <li
                    key={code}
                    className="rounded-full border border-wf-200 bg-wf-50 px-2.5 py-1 text-[11px] font-semibold text-wf-800"
                  >
                    {countryDisplayLabel(code, locale)}
                  </li>
                ))}
                <li className="rounded-full border border-dashed border-wf-300 px-2.5 py-1 text-[11px] font-semibold text-wf-500">
                  …
                </li>
              </ul>
            </div>
          </div>

          <ul className="mt-8 grid gap-3 tablet:grid-cols-2">
            {PLATFORM_BULLETS.map((key) => (
              <li
                key={key}
                className="border-l-2 border-emerald-800/40 pl-3 text-sm leading-relaxed text-wf-800"
              >
                {t(key, locale)}
              </li>
            ))}
          </ul>
          <p className="mt-6 max-w-3xl text-xs leading-relaxed text-wf-600 tablet:text-sm">
            {t("whySellOnePlatformNuance", locale)}
          </p>
        </div>
      </section>

      {/* 4. Europese doelgroep */}
      <section className="mx-auto max-w-5xl px-4 py-12 tablet:px-8">
        <h2 className="text-2xl font-bold tracking-tight text-wf-950 tablet:text-3xl">
          {t("whySellAudienceTitle", locale)}
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-wf-700 tablet:text-base">
          {t("whySellAudienceBody", locale)}
        </p>
        <ul className="mt-6 grid gap-3 tablet:grid-cols-2">
          {AUDIENCE_ITEMS.map((key) => (
            <li
              key={key}
              className="rounded-lg border border-wf-200 bg-white px-4 py-3 text-sm font-semibold text-wf-900"
            >
              {t(key, locale)}
            </li>
          ))}
        </ul>
      </section>

      {/* 5. Made in Europe */}
      <section className="border-y border-wf-200 bg-[#f7faf8]">
        <div className="mx-auto max-w-5xl px-4 py-12 tablet:px-8">
          <h2 className="text-2xl font-bold tracking-tight text-wf-950 tablet:text-3xl">
            {t("whySellMieTitle", locale)}
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-wf-700 tablet:text-base">
            {t("whySellMieBody", locale)}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/made-in-europe"
              className="rounded-md bg-emerald-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800"
            >
              {t("whySellCtaMie", locale)}
            </Link>
            <Link
              href="/waarom-kopen"
              className="rounded-md border border-wf-300 bg-white px-4 py-2.5 text-sm font-semibold text-wf-900"
            >
              {t("whyBuyTitle", locale)}
            </Link>
          </div>
        </div>
      </section>

      {/* 6. Merk + productie */}
      <section className="mx-auto max-w-5xl px-4 py-12 tablet:px-8">
        <h2 className="text-2xl font-bold tracking-tight text-wf-950 tablet:text-3xl">
          {t("whySellBrandTitle", locale)}
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-wf-700 tablet:text-base">
          {t("whySellBrandBody", locale)}
        </p>
        <Link
          href="/partner-onboarding"
          className="mt-5 inline-flex text-sm font-semibold text-wf-900 underline underline-offset-2"
        >
          {t("whySellCtaProducer", locale)} ›
        </Link>
      </section>

      {/* 7. Verkoopmogelijkheden */}
      <section className="border-y border-wf-200 bg-wf-50">
        <div className="mx-auto max-w-5xl px-4 py-12 tablet:px-8">
          <h2 className="text-2xl font-bold tracking-tight text-wf-950 tablet:text-3xl">
            {t("whySellGrowthTitle", locale)}
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-wf-700 tablet:text-base">
            {t("whySellGrowthBody", locale)}
          </p>
          <ul className="mt-6 space-y-2">
            {GROWTH_ITEMS.map((key) => (
              <li
                key={key}
                className="flex gap-2 text-sm leading-relaxed text-wf-800"
              >
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-wf-900" />
                {t(key, locale)}
              </li>
            ))}
          </ul>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/affiliate"
              className="text-sm font-semibold text-wf-900 underline underline-offset-2"
            >
              {t("footerAffiliate", locale)}
            </Link>
          </div>
        </div>
      </section>

      {/* 8. Europese positionering */}
      <section className="mx-auto max-w-5xl px-4 py-12 tablet:px-8">
        <h2 className="text-2xl font-bold tracking-tight text-wf-950 tablet:text-3xl">
          {t("whySellPositionTitle", locale)}
        </h2>
        <div className="mt-4 max-w-3xl space-y-4 text-sm leading-relaxed text-wf-700 tablet:text-base">
          <p>{t("whySellPositionBody1", locale)}</p>
          <p>{t("whySellPositionBody2", locale)}</p>
          <p>{t("whySellPositionBody3", locale)}</p>
        </div>
      </section>

      {/* 9. Introductieprogramma */}
      <section className="border-y border-wf-200 bg-gradient-to-br from-wf-900 to-[#1a3a2e] text-white">
        <div className="mx-auto max-w-5xl px-4 py-12 tablet:px-8">
          <h2 className="text-2xl font-bold tracking-tight tablet:text-3xl">
            {t("whySellIntroTitle", locale)}
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-white/85 tablet:text-base">
            {t("whySellIntroLead", locale)}
          </p>
          <p className="mt-6 max-w-2xl text-xl font-bold tracking-tight tablet:text-2xl">
            {t("whySellIntroOffer", locale)}
          </p>
          <p className="mt-3 max-w-3xl text-xs leading-relaxed text-white/70 tablet:text-sm">
            {t("whySellIntroTerms", locale)}
          </p>
          <Link
            href="/partner-onboarding"
            className="mt-7 inline-flex rounded-md bg-white px-5 py-2.5 text-sm font-semibold text-wf-900 hover:bg-wf-100"
          >
            {t("whySellCtaPartner", locale)}
          </Link>
        </div>
      </section>

      {/* 10. Hoe het werkt */}
      <section
        id="hoe-het-werkt"
        className="scroll-mt-6 mx-auto max-w-5xl px-4 py-12 tablet:px-8"
      >
        <h2 className="text-2xl font-bold tracking-tight text-wf-950 tablet:text-3xl">
          {t("whySellHowTitle", locale)}
        </h2>
        <ol className="mt-8 space-y-4">
          {HOW_STEPS.map((key, index) => (
            <li key={key} className="flex gap-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-wf-900 text-sm font-bold text-white">
                {index + 1}
              </span>
              <p className="pt-1 text-sm leading-relaxed text-wf-800 tablet:text-base">
                {t(key, locale)}
              </p>
            </li>
          ))}
        </ol>
        <div className="mt-8">
          <Link
            href="/partner-onboarding"
            className="rounded-md bg-wf-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-wf-800"
          >
            {t("whySellCtaStart", locale)}
          </Link>
        </div>
      </section>

      {/* 11. FAQ */}
      <section className="border-t border-wf-200 bg-wf-50">
        <div className="mx-auto max-w-5xl px-4 py-12 tablet:px-8">
          <h2 className="text-2xl font-bold tracking-tight text-wf-950 tablet:text-3xl">
            {t("whySellFaqTitle", locale)}
          </h2>
          <div className="mt-6 max-w-3xl divide-y divide-wf-200 border-y border-wf-200">
            {FAQ_KEYS.map(([qKey, aKey]) => (
              <details key={qKey} className="group py-3">
                <summary className="cursor-pointer list-none text-sm font-bold text-wf-900 marker:content-none [&::-webkit-details-marker]:hidden">
                  <span className="flex items-start justify-between gap-3">
                    {t(qKey, locale)}
                    <span className="mt-0.5 text-wf-400 transition group-open:rotate-180">
                      ▾
                    </span>
                  </span>
                </summary>
                <p className="mt-2 pr-6 text-sm leading-relaxed text-wf-700">
                  {t(aKey, locale)}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* 12. Final CTA */}
      <section className="mx-auto max-w-5xl px-4 py-14 tablet:px-8 tablet:py-16">
        <h2 className="max-w-3xl text-2xl font-bold tracking-tight text-wf-950 tablet:text-4xl">
          {t("whySellFinalTitle", locale)}
        </h2>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-wf-700 tablet:text-base">
          {t("whySellFinalLead", locale)}
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/partner-onboarding"
            className="rounded-md bg-wf-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-wf-800"
          >
            {t("whySellFinalCta", locale)}
          </Link>
          <Link
            href="/made-in-europe"
            className="rounded-md border border-wf-300 px-5 py-2.5 text-sm font-semibold text-wf-900"
          >
            {t("whySellCtaMie", locale)}
          </Link>
          <Link
            href="/waarom-kopen"
            className="rounded-md border border-transparent px-5 py-2.5 text-sm font-semibold text-wf-800 underline-offset-2 hover:underline"
          >
            {t("whyBuyTitle", locale)}
          </Link>
        </div>
      </section>
    </PublicStorefrontChrome>
  )
}
