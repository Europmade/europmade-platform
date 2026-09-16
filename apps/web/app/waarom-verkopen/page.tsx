import type { Metadata } from "next"
import Link from "next/link"
import {
  IconArrowDown,
  IconEuro,
  IconFactory,
  IconFile,
  IconGlobe,
  IconPackage,
  IconStore,
  IconTag,
  IconTranslate,
  IconUsers,
} from "../_components/commercial/commercial-icons"
import { CmsPageView } from "../_components/cms/cms-page-view"
import { PublicStorefrontChrome } from "../_components/marketplace/public-storefront-chrome"
import {
  loadFixedCmsPage,
  metadataFromCmsPage,
} from "../_lib/cms/fixed-cms-page"
import { getStorefrontLocaleFromCookies } from "../_lib/i18n/get-storefront-locale"
import { countryDisplayLabel, t } from "../_lib/i18n/messages"
import {
  PARTNER_LOGIN_HREF,
  PARTNER_REGISTER_HREF,
} from "../_lib/partner-cta"

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getStorefrontLocaleFromCookies()
  const fallback: Metadata = {
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
  const cms = await loadFixedCmsPage({ path: "/waarom-verkopen", locale })
  if (cms) return metadataFromCmsPage(cms, fallback)
  return fallback
}

const MARKET_CODES = ["NL", "DE", "FR", "BE", "AT", "ES", "IT"] as const

const FAQ_KEYS = [
  ["whySellFaq9Q", "whySellFaq9A"],
  ["whySellFaq3Q", "whySellFaq3A"],
  ["whySellFaq10Q", "whySellFaq10A"],
  ["whySellFaq11Q", "whySellFaq11A"],
  ["whySellFaq12Q", "whySellFaq12A"],
  ["whySellFaq6Q", "whySellFaq6A"],
  ["whySellFaq4Q", "whySellFaq4A"],
  ["whySellFaq13Q", "whySellFaq13A"],
  ["whySellFaq7Q", "whySellFaq7A"],
  ["whySellFaq14Q", "whySellFaq14A"],
  ["whySellFaq2Q", "whySellFaq2A"],
  ["whySellFaq1Q", "whySellFaq1A"],
  ["whySellFaq5Q", "whySellFaq5A"],
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

/**
 * B2B landingspagina — visueel + conversion naar registratie (Sprint 8/9 UX).
 * CMS page slug "waarom-verkopen" overrides when published + live.
 */
export default async function WhySellPage() {
  const locale = await getStorefrontLocaleFromCookies()
  const cms = await loadFixedCmsPage({ path: "/waarom-verkopen", locale })
  if (cms) return <CmsPageView page={cms} locale={locale} />

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ_KEYS.map(([qKey, aKey]) => ({
      "@type": "Question",
      name: t(qKey, locale),
      acceptedAnswer: { "@type": "Answer", text: t(aKey, locale) },
    })),
  }

  return (
    <PublicStorefrontChrome locale={locale}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      {/* Hero + commercial funnel visual */}
      <section className="relative overflow-hidden border-b border-wf-200 bg-gradient-to-br from-[#e8f2ec] via-white to-[#f4f1ea]">
        <div className="relative mx-auto max-w-5xl px-4 py-12 tablet:px-8 tablet:py-16">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-900">
            EuropMade
          </p>
          <h1 className="mt-3 max-w-3xl text-3xl font-bold tracking-tight text-wf-950 tablet:text-5xl">
            {t("whySellHero", locale)}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-wf-700 tablet:text-lg">
            {t("whySellLead", locale)}
          </p>

          <div className="mt-8 flex max-w-xl flex-col items-center rounded-2xl border border-wf-200 bg-white/90 px-4 py-6 shadow-sm">
            <p className="rounded-full bg-wf-900 px-3 py-1 text-xs font-bold text-white">
              {t("whySellHeroVisualProduct", locale)}
            </p>
            <IconArrowDown className="my-2 h-4 w-4 text-wf-400" />
            <p className="rounded-full bg-emerald-900 px-3 py-1 text-xs font-bold text-white">
              EuropMade
            </p>
            <IconArrowDown className="my-2 h-4 w-4 text-wf-400" />
            <ul className="flex flex-wrap justify-center gap-1.5">
              {MARKET_CODES.map((code) => (
                <li
                  key={code}
                  className="rounded-full border border-wf-200 bg-wf-50 px-2 py-0.5 text-[10px] font-semibold text-wf-800"
                >
                  {countryDisplayLabel(code, locale)}
                </li>
              ))}
            </ul>
            <IconArrowDown className="my-2 h-4 w-4 text-wf-400" />
            <p className="flex items-center gap-2 text-sm font-bold text-wf-900">
              <IconUsers className="h-5 w-5 text-emerald-900" />
              {t("whySellHeroVisualCustomers", locale)}
            </p>
            <p className="mt-4 text-center text-base font-bold text-emerald-950">
              {t("whySellHeroVisualTagline", locale)}
            </p>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href={PARTNER_REGISTER_HREF}
              className="rounded-md bg-wf-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-wf-800"
            >
              {t("whySellCtaStart", locale)}
            </Link>
            <Link
              href="#hoe-het-werkt"
              className="rounded-md border border-wf-400 bg-white/80 px-5 py-2.5 text-sm font-semibold text-wf-900"
            >
              {t("whySellCtaHow", locale)}
            </Link>
            <Link
              href={PARTNER_LOGIN_HREF}
              className="rounded-md px-5 py-2.5 text-sm font-semibold text-wf-700 underline-offset-2 hover:underline"
            >
              {t("whySellCtaExisting", locale)}
            </Link>
          </div>
        </div>
      </section>

      {/* Quick start + no cost */}
      <section className="mx-auto grid max-w-5xl gap-4 px-4 py-10 tablet:grid-cols-2 tablet:px-8">
        <article className="rounded-xl border border-wf-200 bg-white px-5 py-5 shadow-sm">
          <h2 className="text-lg font-bold text-wf-900">
            {t("whySellQuickStartTitle", locale)}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-wf-700">
            {t("whySellQuickStartBody", locale)}
          </p>
        </article>
        <article className="rounded-xl border border-emerald-800/20 bg-emerald-50/60 px-5 py-5">
          <h2 className="text-lg font-bold text-emerald-950">
            {t("whySellNoCostTitle", locale)}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-emerald-950/80">
            {t("whySellNoCostBody", locale)}
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="flex h-full flex-col items-center justify-start rounded-lg border border-wf-200 bg-white px-3 py-3 text-center">
              <IconEuro className="h-6 w-6 shrink-0 text-wf-800" aria-hidden />
              <p className="mt-2 text-xl font-bold leading-none tabular-nums text-wf-950">
                €0
              </p>
              <p className="mt-2 text-[11px] font-semibold leading-snug text-wf-600">
                {t("whySellNoCostZero", locale)}
              </p>
            </div>
            <div className="flex h-full flex-col items-center justify-start rounded-lg border border-wf-200 bg-white px-3 py-3 text-center">
              <span className="block h-6 w-6 shrink-0" aria-hidden />
              <p className="mt-2 text-xl font-bold leading-none tabular-nums text-wf-950">
                10%
              </p>
              <p className="mt-2 text-[11px] font-semibold leading-snug text-wf-600">
                {t("whySellNoCostCommission", locale)}
              </p>
            </div>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-wf-600">
            {t("whySellNoCostNote", locale)}
          </p>
        </article>
      </section>

      {/* Problem */}
      <section className="mx-auto max-w-5xl px-4 pb-10 tablet:px-8">
        <h2 className="max-w-2xl text-2xl font-bold tracking-tight text-wf-950">
          {t("whySellProblemTitle", locale)}
        </h2>
        <p className="mt-4 max-w-3xl text-sm leading-relaxed text-wf-700 tablet:text-base">
          {t("whySellProblemBody", locale)}
        </p>
        <p className="mt-3 max-w-3xl text-sm font-medium text-wf-900 tablet:text-base">
          {t("whySellProblemClose", locale)}
        </p>
      </section>

      {/* One platform Europe */}
      <section className="border-y border-wf-200 bg-wf-50">
        <div className="mx-auto max-w-5xl px-4 py-12 tablet:px-8">
          <h2 className="text-2xl font-bold tracking-tight text-wf-950">
            {t("whySellOnePlatformTitle", locale)}
          </h2>
          <p className="mt-3 max-w-3xl text-sm text-wf-700 tablet:text-base">
            {t("whySellOnePlatformLead", locale)}
          </p>
          <div className="mt-8 rounded-2xl border border-wf-200 bg-white px-4 py-6 shadow-sm">
            <p className="text-center text-sm font-bold text-emerald-950">
              EuropMade
            </p>
            <IconArrowDown className="mx-auto my-3 h-4 w-4 text-wf-400" />
            <ul className="mx-auto grid max-w-2xl grid-cols-2 gap-2 tablet:grid-cols-4">
              {MARKET_CODES.map((code) => (
                <li
                  key={code}
                  className="rounded-lg border border-wf-200 bg-wf-50 px-2 py-2 text-center text-xs font-semibold text-wf-800"
                >
                  {countryDisplayLabel(code, locale)}
                </li>
              ))}
            </ul>
            <IconArrowDown className="mx-auto my-3 h-4 w-4 text-wf-400" />
            <p className="text-center text-sm font-bold text-wf-900">
              {t("whySellHeroVisualCustomers", locale)}
            </p>
          </div>
          <p className="mt-4 text-sm font-medium text-wf-800">
            {t("whySellDesignedFor", locale)}
          </p>
          <p className="mt-2 max-w-3xl text-xs leading-relaxed text-wf-600 tablet:text-sm">
            {t("whySellOnePlatformNuance", locale)}
          </p>
        </div>
      </section>

      {/* Translations */}
      <section className="mx-auto max-w-5xl px-4 py-12 tablet:px-8">
        <div className="flex items-start gap-3">
          <IconTranslate className="mt-1 h-7 w-7 text-emerald-900" />
          <div>
            <h2 className="text-2xl font-bold text-wf-950">
              {t("whySellTranslateTitle", locale)}
            </h2>
            <p className="mt-3 max-w-3xl text-sm text-wf-700 tablet:text-base">
              {t("whySellTranslateLead", locale)}
            </p>
          </div>
        </div>
        <div className="mt-8 flex flex-col items-center gap-2">
          <p className="rounded-lg border border-wf-200 bg-white px-4 py-2 text-sm font-semibold">
            {t("whySellTranslateSource", locale)}
          </p>
          <IconArrowDown className="h-4 w-4 text-wf-400" />
          <p className="rounded-lg border border-emerald-800/25 bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-950">
            {t("whySellTranslateEngine", locale)}
          </p>
          <IconArrowDown className="h-4 w-4 text-wf-400" />
          <ul className="flex flex-wrap justify-center gap-2">
            {(["NL", "EN", "DE", "FR"] as const).map((code) => (
              <li
                key={code}
                className="rounded-full border border-wf-200 bg-wf-50 px-3 py-1 text-xs font-bold text-wf-800"
              >
                {code}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Product data */}
      <section className="border-y border-wf-200 bg-wf-50">
        <div className="mx-auto max-w-5xl px-4 py-12 tablet:px-8">
          <h2 className="text-2xl font-bold text-wf-950">
            {t("whySellDataTitle", locale)}
          </h2>
          <p className="mt-3 max-w-3xl text-sm text-wf-700 tablet:text-base">
            {t("whySellDataLead", locale)}
          </p>
          <div className="mt-8 grid gap-3 tablet:grid-cols-2">
            {[
              { icon: IconPackage, label: t("whySellDataManual", locale) },
              { icon: IconFile, label: t("whySellDataCsv", locale) },
              { icon: IconStore, label: t("whySellDataExisting", locale) },
              { icon: IconGlobe, label: t("whySellDataApi", locale) },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center gap-3 rounded-xl border border-wf-200 bg-white px-4 py-3"
              >
                <item.icon className="h-6 w-6 text-emerald-900" />
                <p className="text-sm font-semibold text-wf-900">{item.label}</p>
              </div>
            ))}
          </div>
          <IconArrowDown className="mx-auto my-4 h-4 w-4 text-wf-400" />
          <p className="text-center text-sm font-bold text-wf-900">
            {t("whySellDataOnline", locale)}
          </p>
        </div>
      </section>

      {/* Bulk */}
      <section className="mx-auto max-w-5xl px-4 py-12 tablet:px-8">
        <h2 className="text-2xl font-bold text-wf-950">
          {t("whySellBulkTitle", locale)}
        </h2>
        <p className="mt-3 max-w-3xl text-sm text-wf-700 tablet:text-base">
          {t("whySellBulkLead", locale)}
        </p>
        <div className="mt-8 flex flex-col items-center gap-2">
          <p className="rounded-xl border border-wf-200 bg-white px-4 py-3 text-sm font-bold shadow-sm">
            {t("whySellBulkFactory", locale)}
          </p>
          <IconArrowDown className="h-4 w-4 text-wf-400" />
          <p className="rounded-xl border border-emerald-800/25 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-950">
            {t("whySellBulkProducts", locale)}
          </p>
        </div>
        <Link
          href="/made-in-europe"
          className="mt-6 inline-flex text-sm font-semibold text-wf-900 underline"
        >
          {t("whySellCtaMie", locale)}
        </Link>
      </section>

      {/* Roles */}
      <section className="border-y border-wf-200 bg-wf-50">
        <div className="mx-auto max-w-5xl px-4 py-12 tablet:px-8">
          <h2 className="text-2xl font-bold text-wf-950">
            {t("whySellRolesTitle", locale)}
          </h2>
          <div className="mt-6 grid gap-4 tablet:grid-cols-3">
            {[
              {
                icon: IconFactory,
                title: t("whySellRoleProducerTitle", locale),
                body: t("whySellRoleProducerBody", locale),
              },
              {
                icon: IconTag,
                title: t("whySellRoleBrandTitle", locale),
                body: t("whySellRoleBrandBody", locale),
              },
              {
                icon: IconStore,
                title: t("whySellRoleSellerTitle", locale),
                body: t("whySellRoleSellerBody", locale),
              },
            ].map((role) => (
              <article
                key={role.title}
                className="rounded-xl border border-wf-200 bg-white px-4 py-5 shadow-sm"
              >
                <role.icon className="h-7 w-7 text-emerald-900" />
                <h3 className="mt-3 text-base font-bold text-wf-900">
                  {role.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-wf-700">
                  {role.body}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Positioning + intro offer (kept lean) */}
      <section className="mx-auto max-w-5xl px-4 py-12 tablet:px-8">
        <h2 className="text-2xl font-bold text-wf-950">
          {t("whySellPositionTitle", locale)}
        </h2>
        <div className="mt-4 max-w-3xl space-y-3 text-sm leading-relaxed text-wf-700 tablet:text-base">
          <p>{t("whySellPositionBody1", locale)}</p>
          <p>{t("whySellPositionBody2", locale)}</p>
        </div>
      </section>

      <section className="border-y border-wf-200 bg-gradient-to-br from-wf-900 to-[#1a3a2e] text-white">
        <div className="mx-auto max-w-5xl px-4 py-12 tablet:px-8">
          <h2 className="text-2xl font-bold tablet:text-3xl">
            {t("whySellIntroTitle", locale)}
          </h2>
          <p className="mt-3 max-w-3xl text-sm text-white/85 tablet:text-base">
            {t("whySellIntroLead", locale)}
          </p>
          <p className="mt-6 text-xl font-bold tablet:text-2xl">
            {t("whySellIntroOffer", locale)}
          </p>
          <p className="mt-3 max-w-3xl text-xs text-white/70 tablet:text-sm">
            {t("whySellIntroTerms", locale)}
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              href={PARTNER_REGISTER_HREF}
              className="rounded-md bg-white px-5 py-2.5 text-sm font-semibold text-wf-900"
            >
              {t("whySellCtaPartner", locale)}
            </Link>
            <Link
              href={PARTNER_LOGIN_HREF}
              className="rounded-md border border-white/40 px-5 py-2.5 text-sm font-semibold text-white"
            >
              {t("whySellCtaExisting", locale)}
            </Link>
          </div>
        </div>
      </section>

      {/* How it works — horizontal on desktop */}
      <section
        id="hoe-het-werkt"
        className="scroll-mt-6 mx-auto max-w-5xl px-4 py-12 tablet:px-8"
      >
        <h2 className="text-2xl font-bold text-wf-950">
          {t("whySellHowTitle", locale)}
        </h2>
        <ol className="mt-8 flex flex-col gap-3 tablet:flex-row tablet:flex-wrap tablet:gap-2">
          {HOW_STEPS.map((key, index) => (
            <li
              key={key}
              className="flex flex-1 items-start gap-3 rounded-xl border border-wf-200 bg-white px-3 py-3 tablet:min-w-[30%] tablet:flex-col"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-wf-900 text-xs font-bold text-white">
                {index + 1}
              </span>
              <p className="text-sm font-semibold leading-snug text-wf-800">
                {t(key, locale)}
              </p>
            </li>
          ))}
        </ol>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href={PARTNER_REGISTER_HREF}
            className="rounded-md bg-wf-900 px-5 py-2.5 text-sm font-semibold text-white"
          >
            {t("whySellCtaStart", locale)}
          </Link>
          <Link
            href={PARTNER_LOGIN_HREF}
            className="text-sm font-semibold text-wf-700 underline-offset-2 hover:underline"
          >
            {t("whySellCtaExisting", locale)}
          </Link>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-wf-200 bg-wf-50">
        <div className="mx-auto max-w-5xl px-4 py-12 tablet:px-8">
          <h2 className="text-2xl font-bold text-wf-950">
            {t("whySellFaqTitle", locale)}
          </h2>
          <div className="mt-6 max-w-3xl divide-y divide-wf-200 border-y border-wf-200">
            {FAQ_KEYS.map(([qKey, aKey]) => (
              <details key={qKey} className="group py-3">
                <summary className="cursor-pointer list-none text-sm font-bold text-wf-900 [&::-webkit-details-marker]:hidden">
                  <span className="flex items-start justify-between gap-3">
                    {t(qKey, locale)}
                    <span className="text-wf-400 transition group-open:rotate-180">
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

      {/* Final CTA */}
      <section className="mx-auto max-w-5xl px-4 py-14 tablet:px-8">
        <h2 className="max-w-3xl text-2xl font-bold tracking-tight text-wf-950 tablet:text-4xl">
          {t("whySellFinalTitle", locale)}
        </h2>
        <p className="mt-4 max-w-2xl text-sm text-wf-700 tablet:text-base">
          {t("whySellFinalLead", locale)}
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href={PARTNER_REGISTER_HREF}
            className="rounded-md bg-wf-900 px-5 py-2.5 text-sm font-semibold text-white"
          >
            {t("whySellFinalCta", locale)}
          </Link>
          <Link
            href={PARTNER_LOGIN_HREF}
            className="rounded-md border border-wf-300 px-5 py-2.5 text-sm font-semibold text-wf-900"
          >
            {t("whySellCtaExisting", locale)}
          </Link>
          <Link
            href="/made-in-europe"
            className="rounded-md px-5 py-2.5 text-sm font-semibold text-wf-800 underline-offset-2 hover:underline"
          >
            {t("whySellCtaMie", locale)}
          </Link>
        </div>
      </section>
    </PublicStorefrontChrome>
  )
}
