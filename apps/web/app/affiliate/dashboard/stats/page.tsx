"use client"

import { useEffect, useState } from "react"
import { Notice } from "@europmade/ui"
import { AffiliateGate } from "../../_components/affiliate-gate"
import { AffiliateProductLabel } from "../../_components/affiliate-product-label"
import {
  AffiliateApiError,
  getAffiliateStats,
  type DashboardResponse,
} from "../../../_lib/affiliate-api"
import {
  resolveAffiliateProductTitles,
  titleForAffiliateTarget,
} from "../../../_lib/affiliate-product-label"
import { useStorefrontLocale } from "../../../_lib/i18n/use-storefront-locale"
import { storefrontIntlLocale } from "../../../_lib/i18n/locales"
import { t, tFormat } from "../../../_lib/i18n/messages"

export default function AffiliateStatsPage() {
  const locale = useStorefrontLocale()
  const [rows, setRows] = useState<DashboardResponse["link_stats"]>([])
  const [titles, setTitles] = useState<Map<string, string>>(new Map())
  const [periodDays, setPeriodDays] = useState(30)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    getAffiliateStats()
      .then(async (res) => {
        if (cancelled) return
        let nextTitles = new Map<string, string>()
        try {
          nextTitles = await resolveAffiliateProductTitles(
            res.link_stats.map((row) => row.target_url)
          )
        } catch {
          nextTitles = new Map()
        }
        if (cancelled) return
        setTitles(nextTitles)
        setRows(res.link_stats)
        setPeriodDays(res.period_days)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(
          err instanceof AffiliateApiError
            ? err.message
            : t("affStatsLoadFailed", locale)
        )
      })
    return () => {
      cancelled = true
    }
  }, [locale])

  const unknownTitle = t("affUnknownProduct", locale)

  return (
    <AffiliateGate
      breadcrumb={[
        { label: t("affiliateNavDashboard", locale), href: "/affiliate/dashboard" },
        { label: t("affiliateNavStats", locale) },
      ]}
    >
      <h1 className="text-[19px] font-bold text-wf-900">
        {t("affiliateNavStats", locale)}
      </h1>
      <p className="mt-1.5 text-xs text-wf-600">
        {tFormat("affStatsIntro", locale, { days: periodDays })}
      </p>

      {error ? (
        <Notice variant="warning" className="mt-4">
          {error}
        </Notice>
      ) : null}

      <div className="mt-4 overflow-x-auto rounded-md border border-wf-300">
        <table className="w-full border-collapse text-left text-xs">
          <thead className="bg-wf-100 text-wf-700">
            <tr>
              <th className="px-3 py-2 font-semibold">
                {t("affProductCol", locale)}
              </th>
              <th className="px-3 py-2 font-semibold">
                {t("affClicks", locale)}
              </th>
              <th className="px-3 py-2 font-semibold">
                {t("affConversions", locale)}
              </th>
              <th className="px-3 py-2 font-semibold">
                {t("affConversionRate", locale)}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3 py-4 text-wf-600">
                  {t("affStatsEmpty", locale)}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.link_id} className="border-t border-wf-200">
                  <td className="px-3 py-2.5">
                    <AffiliateProductLabel
                      targetUrl={row.target_url}
                      title={titleForAffiliateTarget(
                        row.target_url,
                        titles,
                        unknownTitle
                      )}
                      trackingParam={row.tracking_param}
                    />
                  </td>
                  <td className="px-3 py-2.5">{row.clicks}</td>
                  <td className="px-3 py-2.5">{row.conversions}</td>
                  <td className="px-3 py-2.5">
                    {row.conversion_rate.toLocaleString(
                      storefrontIntlLocale(locale),
                      { maximumFractionDigits: 1 }
                    )}
                    %
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </AffiliateGate>
  )
}
