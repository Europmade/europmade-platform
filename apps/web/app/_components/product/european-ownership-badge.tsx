"use client"

import Link from "next/link"
import type { StorefrontLocale } from "../../_lib/i18n/locales"
import { t } from "../../_lib/i18n/messages"

export type EuropeanOwnershipView = {
  ownership_band: string
  ownership_band_label: string
  status: string
  verified_by_europmade: boolean
}

type Props = {
  data: EuropeanOwnershipView
  locale: StorefrontLocale
  manufacturerHref?: string
}

/**
 * PDP badge for European ownership — separate from Made in Europe score.
 */
export function EuropeanOwnershipBadge({
  data,
  locale,
  manufacturerHref,
}: Props) {
  const statusLabel = data.verified_by_europmade
    ? t("euOwnershipVerified", locale)
    : t("euOwnershipDeclared", locale)

  return (
    <div
      className="inline-flex max-w-full flex-wrap items-center gap-x-2 gap-y-1 rounded border border-wf-300 bg-wf-50 px-2.5 py-1.5 text-[12px] text-wf-800"
      data-european-ownership-badge=""
    >
      <span className="font-bold text-wf-900">
        {t("euOwnership", locale)}
      </span>
      <span className="font-semibold">{data.ownership_band_label}</span>
      <span
        className="cursor-help text-wf-500"
        title={t("euOwnershipTooltip", locale)}
        aria-label={t("euOwnershipTooltip", locale)}
      >
        ⓘ
      </span>
      <span className="text-wf-600">
        {data.verified_by_europmade ? `✓ ${statusLabel}` : statusLabel}
      </span>
      {manufacturerHref ? (
        <Link
          href={manufacturerHref}
          className="font-semibold underline-offset-2 hover:underline"
        >
          ›
        </Link>
      ) : null}
    </div>
  )
}
