"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Badge, Notice } from "@europmade/ui"
import { AffiliateGate } from "../_components/affiliate-gate"
import {
  AffiliateApiError,
  getAffiliateDashboard,
  type DashboardResponse,
} from "../../_lib/affiliate-api"
import { useStorefrontLocale } from "../../_lib/i18n/use-storefront-locale"
import { t, tFormat } from "../../_lib/i18n/messages"
import { statusLabel } from "../../_lib/i18n/status-labels"

/**
 * Affiliate Dashboard Home — /affiliate/dashboard
 */
export default function AffiliateDashboardHomePage() {
  const locale = useStorefrontLocale()
  const [data, setData] = useState<DashboardResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    getAffiliateDashboard()
      .then((res) => {
        if (!cancelled) setData(res)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(
          err instanceof AffiliateApiError
            ? err.message
            : t("affDashLoadFailed", locale)
        )
      })
    return () => {
      cancelled = true
    }
  }, [locale])

  const periodDays = data?.period_days ?? 30

  return (
    <AffiliateGate
      breadcrumb={[
        { label: t("affiliateBrand", locale), href: "/affiliate" },
        { label: t("affiliateNavDashboard", locale), href: "/affiliate/dashboard" },
        { label: t("affiliateNavOverview", locale) },
      ]}
    >
      <h1 className="text-[19px] font-bold text-wf-900">
        {t("affiliateNavOverview", locale)}
      </h1>
      <p className="mt-1.5 text-xs text-wf-600">
        {t("affCommStatus", locale)}:{" "}
        {data ? (
          <Badge variant="solid" className="align-middle">
            {statusLabel(data.affiliate.onboarding_status, locale)}
          </Badge>
        ) : (
          "…"
        )}
      </p>

      {error ? (
        <Notice variant="warning" className="mt-4">
          {error}
        </Notice>
      ) : null}

      <div className="mt-6 grid gap-3 tablet:grid-cols-3">
        <KpiCard
          value={data ? String(data.kpis.clicks) : "—"}
          label={tFormat("affDashClicksPeriod", locale, { days: periodDays })}
        />
        <KpiCard
          value={data ? String(data.kpis.conversions) : "—"}
          label={tFormat("affDashConversionsPeriod", locale, {
            days: periodDays,
          })}
        />
        <KpiCard
          value={data?.kpis.commission_formatted ?? "—"}
          label={t("affDashCommissionPeriod", locale)}
          linkHref={null}
          linkLabel={t("affDashViewPayouts", locale)}
          unavailableTitle={t("notAvailableYet", locale)}
        />
      </div>

      <h2 className="mt-8 text-sm font-bold text-wf-900">
        {t("affDashShortcuts", locale)}
      </h2>
      <ul className="mt-3 divide-y divide-wf-200 rounded-md border border-wf-300">
        <li className="flex items-center justify-between gap-3 px-3 py-3 text-xs">
          <span>{t("affDashSearchProducts", locale)}</span>
          <Link
            href="/affiliate/dashboard/products"
            className="font-semibold text-wf-900 underline"
          >
            {t("affDashSearchCta", locale)}
          </Link>
        </li>
        <li className="flex items-center justify-between gap-3 px-3 py-3 text-xs">
          <span>{t("affDashMyLinks", locale)}</span>
          <Link
            href="/affiliate/dashboard/links"
            className="font-semibold text-wf-900 underline"
          >
            {t("affDashViewCta", locale)}
          </Link>
        </li>
        <li className="flex items-center justify-between gap-3 px-3 py-3 text-xs">
          <span>{t("affDashStatsPerLink", locale)}</span>
          <Link
            href="/affiliate/dashboard/stats"
            className="font-semibold text-wf-900 underline"
          >
            {t("affDashViewCta", locale)}
          </Link>
        </li>
      </ul>
    </AffiliateGate>
  )
}

function KpiCard({
  value,
  label,
  linkHref,
  linkLabel,
  unavailableTitle,
}: {
  value: string
  label: string
  linkHref?: string | null
  linkLabel?: string
  unavailableTitle?: string
}) {
  return (
    <div className="rounded-md border border-wf-300 bg-white px-4 py-4">
      <div className="text-2xl font-bold text-wf-900">{value}</div>
      <div className="mt-1.5 text-[11.5px] text-wf-600">{label}</div>
      {linkLabel ? (
        linkHref ? (
          <Link
            href={linkHref}
            className="mt-2 inline-block text-[11px] font-semibold text-wf-800 underline"
          >
            ↳ {linkLabel}
          </Link>
        ) : (
          <span
            className="mt-2 inline-block cursor-not-allowed text-[11px] font-semibold text-wf-400"
            title={unavailableTitle}
          >
            ↳ {linkLabel}
          </span>
        )
      ) : null}
    </div>
  )
}
