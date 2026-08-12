import type { Metadata } from "next"
import Link from "next/link"
import {
  IconCheck,
  IconCross,
  IconFactory,
  IconMaterials,
  IconParts,
} from "../_components/commercial/commercial-icons"
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
 * Centrale uitleg Made in Europe — visuele score + drempel (Sprint 8 UX).
 */
export default async function MadeInEuropePage() {
  const locale = await getStorefrontLocaleFromCookies()

  return (
    <PublicStorefrontChrome locale={locale}>
      <article className="mx-auto max-w-4xl px-4 py-8 tablet:px-8">
        <h1 className="text-2xl font-bold text-wf-900 tablet:text-3xl">
          {t("miePageTitle", locale)}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-wf-700">
          {t("miePageIntro", locale)}
        </p>

        {/* Score breakdown visual */}
        <section className="mt-10 rounded-2xl border border-emerald-800/20 bg-gradient-to-b from-emerald-50/80 to-white px-4 py-8 tablet:px-8">
          <p className="text-center text-xs font-bold uppercase tracking-[0.14em] text-emerald-900">
            {t("mieVisualTotal", locale)}
          </p>
          <p className="mt-2 text-center text-4xl font-bold tabular-nums text-emerald-950 tablet:text-5xl">
            100
            <span className="ml-2 text-base font-semibold text-emerald-800/80">
              {t("mieVisualMax", locale)}
            </span>
          </p>
          <div className="mx-auto mt-3 h-px w-16 bg-emerald-800/30" />
          <div className="mt-8 grid gap-4 tablet:grid-cols-3">
            {[
              {
                icon: IconFactory,
                label: t("mieAssembly", locale),
                points: "75",
                detail: t("mieBandEu100", locale),
              },
              {
                icon: IconParts,
                label: t("mieParts", locale),
                points: "15",
                detail: t("mieLevelMajority", locale),
              },
              {
                icon: IconMaterials,
                label: t("mieMaterials", locale),
                points: "10",
                detail: t("mieLevelMajority", locale),
              },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-xl border border-wf-200 bg-white px-4 py-5 text-center shadow-sm"
              >
                <item.icon className="mx-auto h-8 w-8 text-emerald-900" />
                <p className="mt-3 text-xs font-bold uppercase tracking-wide text-wf-600">
                  {item.label}
                </p>
                <p className="mt-1 text-3xl font-bold tabular-nums text-wf-950">
                  {item.points}
                </p>
                <p className="mt-1 text-[11px] text-wf-500">{item.detail}</p>
              </div>
            ))}
          </div>
          <p className="mx-auto mt-6 max-w-2xl text-center text-xs leading-relaxed text-wf-600 tablet:text-sm">
            {t("mieScoreMeaning", locale)}
          </p>
        </section>

        {/* 50% threshold visual */}
        <section className="mt-10">
          <h2 className="text-lg font-bold text-wf-900 tablet:text-xl">
            {t("mieThresholdTitle", locale)}
          </h2>
          <div className="mt-5 overflow-hidden rounded-xl border border-wf-200">
            <div className="grid tablet:grid-cols-2">
              <div className="border-b border-wf-200 bg-wf-100 px-4 py-5 tablet:border-b-0 tablet:border-r">
                <div className="flex items-center gap-2 text-wf-600">
                  <IconCross className="h-5 w-5" />
                  <span className="text-xs font-bold uppercase tracking-wide">
                    0–49%
                  </span>
                </div>
                <p className="mt-2 text-sm font-semibold text-wf-800">
                  {t("mieThresholdFail", locale)}
                </p>
              </div>
              <div className="bg-emerald-50 px-4 py-5">
                <div className="flex items-center gap-2 text-emerald-900">
                  <IconCheck className="h-5 w-5" />
                  <span className="text-xs font-bold uppercase tracking-wide">
                    50–100%
                  </span>
                </div>
                <p className="mt-2 text-sm font-semibold text-emerald-950">
                  {t("mieThresholdPass", locale)}
                </p>
              </div>
            </div>
            <div className="relative h-3 bg-gradient-to-r from-wf-300 via-wf-300 to-emerald-600">
              <div className="absolute left-1/2 top-1/2 h-5 w-0.5 -translate-x-1/2 -translate-y-1/2 bg-wf-900" />
            </div>
          </div>
        </section>

        <section className="mt-10">
          <h2 className="text-lg font-bold text-wf-900">
            {t("mieDoesNotCountTitle", locale)}
          </h2>
          <ul className="mt-4 grid gap-3 tablet:grid-cols-3">
            {[
              t("mieDoesNotCount1", locale),
              t("mieDoesNotCount2", locale),
              t("mieDoesNotCount3", locale),
            ].map((label) => (
              <li
                key={label}
                className="flex items-start gap-2 rounded-lg border border-wf-200 bg-white px-3 py-3 text-sm text-wf-800"
              >
                <IconCross className="mt-0.5 h-4 w-4 text-wf-500" />
                {label}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm leading-relaxed text-wf-700">
            {t("mieNotEligibleBody", locale)}
          </p>
        </section>

        <section className="mt-10 space-y-3 border-t border-wf-200 pt-8 text-sm leading-relaxed text-wf-700">
          <p>{t("whyBuyPoint4Body", locale)}</p>
          <ol className="list-decimal space-y-2 pl-5 text-wf-800">
            <li>
              {t("mieAssembly", locale)}: {t("mieBandEu100", locale)} (75),{" "}
              {t("mieBandEu7599", locale)} (56), {t("mieBandEu5074", locale)}{" "}
              (38).
            </li>
            <li>
              {t("mieParts", locale)}: {t("mieLevelMajority", locale)} (15),{" "}
              {t("mieLevelPartial", locale)} (8), {t("mieLevelNone", locale)}{" "}
              (0).
            </li>
            <li>
              {t("mieMaterials", locale)}: {t("mieLevelMajority", locale)} (10),{" "}
              {t("mieLevelPartial", locale)} (5), {t("mieLevelNone", locale)}{" "}
              (0).
            </li>
          </ol>
        </section>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/waarom-kopen"
            className="rounded bg-wf-900 px-4 py-2 text-sm font-semibold text-white"
          >
            {t("whyBuyTitle", locale)}
          </Link>
          <Link
            href="/waarom-verkopen"
            className="rounded border border-wf-300 px-4 py-2 text-sm font-semibold text-wf-800"
          >
            {t("whySellTitle", locale)}
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
