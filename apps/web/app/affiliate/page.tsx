import type { Metadata } from "next"
import Link from "next/link"
import { CmsPageView } from "../_components/cms/cms-page-view"
import { PublicStorefrontChrome } from "../_components/marketplace/public-storefront-chrome"
import {
  loadFixedCmsPage,
  metadataFromCmsPage,
} from "../_lib/cms/fixed-cms-page"
import { getStorefrontLocaleFromCookies } from "../_lib/i18n/get-storefront-locale"
import { t, type StorefrontMessageKey } from "../_lib/i18n/messages"

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getStorefrontLocaleFromCookies()
  const fallback: Metadata = {
    title: `${t("affLandingTitle", locale)} — EuropMade`,
    description: t("affLandingMetaDesc", locale),
    alternates: { canonical: "/affiliate" },
  }
  const cms = await loadFixedCmsPage({ path: "/affiliate", locale })
  if (cms) return metadataFromCmsPage(cms, fallback)
  return fallback
}

const HOW_STEPS: StorefrontMessageKey[] = [
  "affLandingHow1",
  "affLandingHow2",
  "affLandingHow3",
  "affLandingHow4",
  "affLandingHow5",
]

const BENEFITS: StorefrontMessageKey[] = [
  "affLandingBenefit1",
  "affLandingBenefit2",
  "affLandingBenefit3",
  "affLandingBenefit4",
  "affLandingBenefit5",
]

const FAQ: Array<[StorefrontMessageKey, StorefrontMessageKey]> = [
  ["affLandingFaq1Q", "affLandingFaq1A"],
  ["affLandingFaq2Q", "affLandingFaq2A"],
  ["affLandingFaq3Q", "affLandingFaq3A"],
  ["affLandingFaq4Q", "affLandingFaq4A"],
  ["affLandingFaq5Q", "affLandingFaq5A"],
]

/**
 * Publieke affiliate marketingpagina (F2).
 * Geen auth — dashboard staat op /affiliate/dashboard.
 * CMS page slug "affiliate" overrides when published + live.
 */
export default async function AffiliateLandingPage() {
  const locale = await getStorefrontLocaleFromCookies()
  const cms = await loadFixedCmsPage({ path: "/affiliate", locale })
  if (cms) return <CmsPageView page={cms} locale={locale} />

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map(([qKey, aKey]) => ({
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

      <section className="relative overflow-hidden border-b border-wf-200 bg-gradient-to-br from-[#e8f2ec] via-white to-[#eef3f8]">
        <div className="relative mx-auto max-w-5xl px-4 py-12 tablet:px-8 tablet:py-16">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-900">
            EuropMade
          </p>
          <h1 className="mt-3 max-w-3xl text-3xl font-bold tracking-tight text-wf-950 tablet:text-5xl">
            {t("affLandingHero", locale)}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-wf-700 tablet:text-lg">
            {t("affLandingLead", locale)}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/affiliate/register"
              className="rounded-md bg-wf-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-wf-800"
            >
              {t("affLandingCtaRegister", locale)}
            </Link>
            <Link
              href={`/login?redirect=${encodeURIComponent("/affiliate/dashboard")}`}
              className="rounded-md border border-wf-400 bg-white/80 px-5 py-2.5 text-sm font-semibold text-wf-900"
            >
              {t("affLandingCtaLogin", locale)}
            </Link>
            <Link
              href="#hoe-het-werkt"
              className="rounded-md px-5 py-2.5 text-sm font-semibold text-wf-700 underline-offset-2 hover:underline"
            >
              {t("affLandingCtaHow", locale)}
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-10 tablet:px-8">
        <h2 className="text-xl font-bold text-wf-900">
          {t("affLandingExplainTitle", locale)}
        </h2>
        <div className="mt-4 grid gap-4 tablet:grid-cols-3">
          <article className="rounded-xl border border-wf-200 bg-white px-5 py-5">
            <h3 className="text-sm font-bold text-wf-900">
              {t("affLandingExplainWhatTitle", locale)}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-wf-700">
              {t("affLandingExplainWhat", locale)}
            </p>
          </article>
          <article className="rounded-xl border border-wf-200 bg-white px-5 py-5">
            <h3 className="text-sm font-bold text-wf-900">
              {t("affLandingExplainRoleTitle", locale)}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-wf-700">
              {t("affLandingExplainRole", locale)}
            </p>
          </article>
          <article className="rounded-xl border border-emerald-800/20 bg-emerald-50/50 px-5 py-5">
            <h3 className="text-sm font-bold text-emerald-950">
              {t("affLandingExplainCommissionTitle", locale)}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-emerald-950/85">
              {t("affLandingExplainCommission", locale)}
            </p>
          </article>
        </div>
      </section>

      <section
        id="hoe-het-werkt"
        className="border-y border-wf-200 bg-wf-50/80"
      >
        <div className="mx-auto max-w-5xl px-4 py-10 tablet:px-8">
          <h2 className="text-xl font-bold text-wf-900">
            {t("affLandingHowTitle", locale)}
          </h2>
          <ol className="mt-6 space-y-3">
            {HOW_STEPS.map((key, i) => (
              <li
                key={key}
                className="flex gap-3 rounded-lg border border-wf-200 bg-white px-4 py-3 text-sm text-wf-800"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-wf-900 text-xs font-bold text-white">
                  {i + 1}
                </span>
                <span className="pt-1">{t(key, locale)}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-10 tablet:px-8">
        <h2 className="text-xl font-bold text-wf-900">
          {t("affLandingBenefitsTitle", locale)}
        </h2>
        <ul className="mt-5 grid gap-3 tablet:grid-cols-2">
          {BENEFITS.map((key) => (
            <li
              key={key}
              className="rounded-lg border border-wf-200 bg-white px-4 py-3 text-sm text-wf-800"
            >
              {t(key, locale)}
            </li>
          ))}
        </ul>
      </section>

      <section className="border-t border-wf-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-10 tablet:px-8">
          <h2 className="text-xl font-bold text-wf-900">
            {t("affLandingFaqTitle", locale)}
          </h2>
          <dl className="mt-6 space-y-4">
            {FAQ.map(([qKey, aKey]) => (
              <div
                key={qKey}
                className="rounded-lg border border-wf-200 px-4 py-4"
              >
                <dt className="text-sm font-bold text-wf-900">
                  {t(qKey, locale)}
                </dt>
                <dd className="mt-2 text-sm leading-relaxed text-wf-700">
                  {t(aKey, locale)}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="border-t border-wf-200 bg-wf-900">
        <div className="mx-auto flex max-w-5xl flex-col items-start gap-4 px-4 py-12 tablet:flex-row tablet:items-center tablet:justify-between tablet:px-8">
          <div>
            <h2 className="text-xl font-bold text-white">
              {t("affLandingCtaBottomTitle", locale)}
            </h2>
            <p className="mt-2 max-w-xl text-sm text-white/80">
              {t("affLandingCtaBottomBody", locale)}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/affiliate/register"
              className="rounded-md bg-white px-5 py-2.5 text-sm font-semibold text-wf-900 hover:bg-wf-100"
            >
              {t("affLandingCtaRegister", locale)}
            </Link>
            <Link
              href={`/login?redirect=${encodeURIComponent("/affiliate/dashboard")}`}
              className="rounded-md border border-white/40 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/10"
            >
              {t("affLandingCtaLogin", locale)}
            </Link>
          </div>
        </div>
      </section>
    </PublicStorefrontChrome>
  )
}
