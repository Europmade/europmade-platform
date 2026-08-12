"use client"

import Link from "next/link"
import type { StorefrontLocale } from "../../_lib/i18n/locales"
import { countryDisplayLabel, t } from "../../_lib/i18n/messages"
import type { PdpMadeInEurope } from "../../_lib/pdp-seed"

type MadeInEuropeScoreCardProps = {
  data: PdpMadeInEurope
  locale: StorefrontLocale
  compact?: boolean
}

function bandLabel(locale: StorefrontLocale, band: string): string {
  switch (band) {
    case "eu_100":
      return t("mieBandEu100", locale)
    case "eu_75_99":
      return t("mieBandEu7599", locale)
    case "eu_50_74":
      return t("mieBandEu5074", locale)
    case "eu_below_50":
      return t("mieBandBelow50", locale)
    default:
      return band
  }
}

function levelLabel(locale: StorefrontLocale, level: string): string {
  switch (level) {
    case "eu_majority":
      return t("mieLevelMajority", locale)
    case "eu_partial":
      return t("mieLevelPartial", locale)
    case "eu_none":
      return t("mieLevelNone", locale)
    default:
      return level
  }
}

/**
 * PDP / brand Made in Europe score card — score is always server-computed.
 */
export function MadeInEuropeScoreCard({
  data,
  locale,
  compact = false,
}: MadeInEuropeScoreCardProps) {
  if (!data.is_made_in_europe || data.score == null) {
    return (
      <div className="rounded-lg border border-wf-300 bg-wf-50 px-3 py-2 text-sm text-wf-700">
        <p className="m-0 font-semibold">{t("mieNotEligibleTitle", locale)}</p>
        <p className="mt-1 m-0 text-xs text-wf-600">{t("mieNotEligibleBody", locale)}</p>
        <Link
          href="/made-in-europe"
          className="mt-2 inline-block text-xs font-semibold text-wf-900 underline"
        >
          {t("mieHowDetermined", locale)}
        </Link>
      </div>
    )
  }

  return (
    <div
      className={`rounded-lg border border-emerald-700/30 bg-emerald-50/60 ${compact ? "px-3 py-2" : "px-4 py-3"}`}
      data-made-in-europe-score={data.score}
    >
      <div className="flex flex-wrap items-baseline gap-2">
        <span className="text-sm font-bold text-emerald-900">
          {t("madeInEurope", locale)}
        </span>
        <span className="text-2xl font-bold tabular-nums text-emerald-950">
          {data.score}%
        </span>
      </div>
      <p className="mt-1 text-[11px] leading-snug text-emerald-900/80">
        {t("mieScoreMeaning", locale)}
      </p>
      {!compact ? (
        <ul className="mt-2 space-y-1 text-xs text-wf-800">
          <li>
            {t("mieAssembly", locale)}: {data.assembly_points} / {data.max_assembly}{" "}
            <span className="text-wf-500">
              ({bandLabel(locale, data.assembly_eu_band)})
            </span>
          </li>
          <li>
            {t("mieParts", locale)}: {data.parts_points} / {data.max_parts}{" "}
            <span className="text-wf-500">
              ({levelLabel(locale, data.parts_eu_level)})
            </span>
          </li>
          <li>
            {t("mieMaterials", locale)}: {data.materials_points} / {data.max_materials}{" "}
            <span className="text-wf-500">
              ({levelLabel(locale, data.materials_eu_level)})
            </span>
          </li>
          {data.facility ? (
            <li>
              {t("mieFacility", locale)}: {data.facility.name}
              {data.facility.country_code
                ? ` (${countryDisplayLabel(data.facility.country_code, locale)})`
                : ""}
            </li>
          ) : data.primary_assembly_country ? (
            <li>
              {t("mieAssemblyCountry", locale)}:{" "}
              {countryDisplayLabel(data.primary_assembly_country, locale)}
            </li>
          ) : null}
        </ul>
      ) : null}
      <Link
        href="/made-in-europe"
        className="mt-2 inline-block text-xs font-semibold text-emerald-950 underline"
      >
        {t("mieHowDetermined", locale)}
      </Link>
    </div>
  )
}
