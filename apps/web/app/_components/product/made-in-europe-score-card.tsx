"use client"

import Link from "next/link"
import { useEffect, useId, useRef, useState } from "react"
import type { StorefrontLocale } from "../../_lib/i18n/locales"
import { countryDisplayLabel, t } from "../../_lib/i18n/messages"
import type { PdpMadeInEurope } from "../../_lib/pdp-seed"

type MadeInEuropeScoreCardProps = {
  data: PdpMadeInEurope
  locale: StorefrontLocale
  countryLabel?: string
  manufacturer?: string
  brandSlug?: string
  /** @deprecated Always compact; kept for call-site compatibility. */
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
 * Compact PDP EU Verified / Made in Europe presentation.
 * Score is always server-computed (`data.score`); this component only renders it.
 */
export function MadeInEuropeScoreCard({
  data,
  locale,
  countryLabel,
  manufacturer,
  brandSlug,
}: MadeInEuropeScoreCardProps) {
  const [open, setOpen] = useState(false)
  const titleId = useId()
  const closeRef = useRef<HTMLButtonElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const eligible = data.is_made_in_europe && data.score != null

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    closeRef.current?.focus()

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false)
    }
    window.addEventListener("keydown", onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener("keydown", onKey)
      triggerRef.current?.focus()
    }
  }, [open])

  const originLine =
    countryLabel || manufacturer ? (
      <p className="m-0 mt-1 text-[12px] leading-snug text-wf-800">
        {countryLabel ? (
          <span>
            {t("madeInLabel", locale)} {countryLabel}
          </span>
        ) : null}
        {countryLabel && manufacturer ? (
          <span className="text-wf-400"> · </span>
        ) : null}
        {manufacturer ? (
          brandSlug ? (
            <Link
              href={`/merk/${brandSlug}#productie`}
              className="font-semibold underline-offset-2 hover:underline"
            >
              {t("producerLabel", locale)} {manufacturer} ›
            </Link>
          ) : (
            <span>
              {t("producerLabel", locale)} {manufacturer}
            </span>
          )
        ) : null}
      </p>
    ) : null

  return (
    <div data-made-in-europe-score={eligible ? data.score : undefined}>
      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
        {eligible ? (
          <span className="inline-flex items-center gap-1.5 text-[13px] font-bold leading-none text-wf-900">
            <span aria-hidden="true">✓</span>
            <span>
              {t("euVerified", locale)}™ {data.score}%
            </span>
          </span>
        ) : (
          <span className="text-[13px] font-semibold leading-snug text-wf-800">
            {t("mieNotEligibleTitle", locale)}
          </span>
        )}
        <button
          ref={triggerRef}
          type="button"
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[15px] leading-none text-wf-600 transition-colors hover:bg-wf-100 hover:text-wf-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wf-900"
          aria-label={t("mieInfoAria", locale)}
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={() => setOpen(true)}
        >
          <span aria-hidden="true">ⓘ</span>
        </button>
      </div>
      {originLine}

      {open ? (
        <div className="fixed inset-0 z-[90] flex items-end justify-center p-0 tablet:items-center tablet:p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/40 backdrop-blur-[1px]"
            aria-label={t("vpClose", locale)}
            onClick={() => setOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="relative z-[1] flex max-h-[min(92vh,640px)] w-full max-w-lg flex-col rounded-t-2xl border border-wf-300 bg-white shadow-xl tablet:rounded-2xl"
          >
            <div className="flex items-start justify-between gap-3 border-b border-wf-200 px-4 py-3">
              <h2
                id={titleId}
                className="m-0 text-base font-bold leading-snug text-wf-900"
              >
                {eligible
                  ? `${t("euVerified", locale)}™ ${data.score}%`
                  : t("mieNotEligibleTitle", locale)}
              </h2>
              <button
                ref={closeRef}
                type="button"
                className="inline-flex h-8 shrink-0 items-center rounded-md px-2 text-sm font-semibold text-wf-700 hover:bg-wf-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wf-900"
                onClick={() => setOpen(false)}
              >
                {t("vpClose", locale)}
              </button>
            </div>

            <div className="overflow-y-auto px-4 py-4 text-sm text-wf-800">
              <section>
                <h3 className="m-0 text-[13px] font-bold text-wf-900">
                  {t("mieVerifiedMeaningTitle", locale)}
                </h3>
                <p className="mt-1.5 m-0 text-[13px] leading-relaxed text-wf-700">
                  {t("mieVerifiedMeaningBody", locale)}
                </p>
                <p className="mt-1.5 m-0 text-[13px] leading-relaxed text-wf-700">
                  {t("mieVerifiedMeaningBuyBox", locale)}
                </p>
                <Link
                  href="/verified"
                  className="mt-2 inline-block text-[12px] font-semibold text-wf-900 underline underline-offset-2"
                  onClick={() => setOpen(false)}
                >
                  {t("mieVerifiedReadMore", locale)}
                </Link>
              </section>

              <section className="mt-5 border-t border-wf-200 pt-4">
                <h3 className="m-0 text-[13px] font-bold text-wf-900">
                  {t("mieHowDetermined", locale)}
                </h3>
                <p className="mt-1.5 m-0 text-[13px] leading-relaxed text-wf-700">
                  {eligible
                    ? t("mieScoreMeaning", locale)
                    : t("mieNotEligibleBody", locale)}
                </p>
                <Link
                  href="/made-in-europe"
                  className="mt-2 inline-block text-[12px] font-semibold text-wf-900 underline underline-offset-2"
                  onClick={() => setOpen(false)}
                >
                  {t("mieHowDetermined", locale)}
                </Link>
              </section>

              {eligible ? (
                <section className="mt-5 border-t border-wf-200 pt-4">
                  <h3 className="m-0 text-[13px] font-bold text-wf-900">
                    {t("mieProductScoreTitle", locale)}
                  </h3>
                  <p className="mt-1.5 m-0 text-2xl font-bold tabular-nums text-wf-950">
                    {data.score}%
                  </p>
                  <ul className="mt-3 space-y-1.5 text-[13px] text-wf-800">
                    <li>
                      {t("mieAssembly", locale)}: {data.assembly_points} /{" "}
                      {data.max_assembly}{" "}
                      <span className="text-wf-500">
                        ({bandLabel(locale, data.assembly_eu_band)})
                      </span>
                    </li>
                    <li>
                      {t("mieParts", locale)}: {data.parts_points} /{" "}
                      {data.max_parts}{" "}
                      <span className="text-wf-500">
                        ({levelLabel(locale, data.parts_eu_level)})
                      </span>
                    </li>
                    <li>
                      {t("mieMaterials", locale)}: {data.materials_points} /{" "}
                      {data.max_materials}{" "}
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
                        {countryDisplayLabel(
                          data.primary_assembly_country,
                          locale
                        )}
                      </li>
                    ) : null}
                  </ul>
                </section>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
