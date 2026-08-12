import type { Metadata } from "next"
import Link from "next/link"
import { PublicStorefrontChrome } from "../_components/marketplace/public-storefront-chrome"
import { getStorefrontLocaleFromCookies } from "../_lib/i18n/get-storefront-locale"
import { t } from "../_lib/i18n/messages"

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getStorefrontLocaleFromCookies()
  return {
    title: `${t("miePageTitle", locale)} — EuropMade`,
    description: t("miePageIntro", locale),
    alternates: { canonical: "/made-in-europe" },
  }
}

/**
 * Centrale uitleg Made in Europe — herbruikbaar vanaf PDP, merkpagina en Waarom kopen.
 */
export default async function MadeInEuropePage() {
  const locale = await getStorefrontLocaleFromCookies()

  return (
    <PublicStorefrontChrome locale={locale}>
      <article className="mx-auto max-w-3xl px-4 py-8 tablet:px-8">
        <h1 className="text-2xl font-bold text-wf-900 tablet:text-3xl">
          {t("miePageTitle", locale)}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-wf-700">
          {t("miePageIntro", locale)}
        </p>

        <section className="mt-8 space-y-4 text-sm leading-relaxed text-wf-800">
          <p>{t("mieScoreMeaning", locale)}</p>
          <ol className="list-decimal space-y-3 pl-5">
            <li>{t("mieNotEligibleBody", locale)}</li>
            <li>
              {t("mieAssembly", locale)}: max. 75 — {t("mieBandEu100", locale)}{" "}
              (75), {t("mieBandEu7599", locale)} (56), {t("mieBandEu5074", locale)}{" "}
              (38).
            </li>
            <li>
              {t("mieParts", locale)}: max. 15 — {t("mieLevelMajority", locale)}{" "}
              (15), {t("mieLevelPartial", locale)} (8), {t("mieLevelNone", locale)}{" "}
              (0).
            </li>
            <li>
              {t("mieMaterials", locale)}: max. 10 — {t("mieLevelMajority", locale)}{" "}
              (10), {t("mieLevelPartial", locale)} (5), {t("mieLevelNone", locale)}{" "}
              (0).
            </li>
          </ol>
          <p>{t("whyBuyPoint4Body", locale)}</p>
        </section>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/waarom-kopen"
            className="rounded bg-wf-900 px-4 py-2 text-sm font-semibold text-white"
          >
            {t("whyBuyTitle", locale)}
          </Link>
          <Link
            href="/zoeken"
            className="rounded border border-wf-300 px-4 py-2 text-sm font-semibold text-wf-800"
          >
            {t("whyBuyCtaBrowse", locale)}
          </Link>
        </div>
      </article>
    </PublicStorefrontChrome>
  )
}
