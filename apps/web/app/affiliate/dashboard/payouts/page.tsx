"use client"

import { useEffect, useState } from "react"
import { Badge, Notice } from "@europmade/ui"
import { AffiliateGate } from "../../_components/affiliate-gate"
import {
  getAffiliatePayouts,
  type AffiliatePayoutRow,
} from "../../../_lib/affiliate-api"
import { formatEuro } from "../../../_components/storefront-shell"
import { useStorefrontLocale } from "../../../_lib/i18n/use-storefront-locale"
import { storefrontIntlLocale } from "../../../_lib/i18n/locales"
import { t } from "../../../_lib/i18n/messages"
import { statusLabel } from "../../../_lib/i18n/status-labels"

function payoutDisplayDate(row: AffiliatePayoutRow): string | null {
  return row.processed_at || row.eligible_at || null
}

export default function AffiliatePayoutsPage() {
  const locale = useStorefrontLocale()
  const [rows, setRows] = useState<AffiliatePayoutRow[]>([])
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoaded(false)
    setError(null)
    getAffiliatePayouts()
      .then((res) => {
        if (cancelled) return
        setRows(res.payouts ?? [])
        setLoaded(true)
      })
      .catch(() => {
        if (cancelled) return
        setRows([])
        setLoaded(true)
        setError(t("affPayoutsLoadFailed", locale))
      })
    return () => {
      cancelled = true
    }
  }, [locale])

  return (
    <AffiliateGate
      breadcrumb={[
        { label: t("affiliateNavDashboard", locale), href: "/affiliate/dashboard" },
        { label: t("affiliateNavPayouts", locale) },
      ]}
    >
      <h1 className="text-[19px] font-bold text-wf-900">
        {t("affiliateNavPayouts", locale)}
      </h1>
      <p className="mt-1.5 text-xs text-wf-600">{t("affPayoutsIntro", locale)}</p>

      {error ? (
        <Notice variant="warning" className="mt-4">
          {error}
        </Notice>
      ) : null}

      {!error && !loaded ? (
        <p className="mt-6 text-sm text-wf-600">{t("loading", locale)}</p>
      ) : null}

      {!error && loaded && rows.length === 0 ? (
        <p className="mt-6 text-sm text-wf-600">{t("affPayoutsEmpty", locale)}</p>
      ) : null}

      {!error && loaded && rows.length > 0 ? (
        <div className="mt-4 overflow-x-auto rounded-md border border-wf-300">
          <table className="w-full min-w-[480px] border-collapse text-left text-xs">
            <thead className="bg-wf-100 text-wf-700">
              <tr>
                <th className="px-3 py-2 font-semibold">
                  {t("affCommDate", locale)}
                </th>
                <th className="px-3 py-2 font-semibold">
                  {t("affCommAmount", locale)}
                </th>
                <th className="px-3 py-2 font-semibold">
                  {t("affCommStatus", locale)}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const rawDate = payoutDisplayDate(row)
                return (
                  <tr key={row.id} className="border-t border-wf-200">
                    <td className="px-3 py-2.5">
                      {rawDate
                        ? new Date(rawDate).toLocaleDateString(
                            storefrontIntlLocale(locale),
                            {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            }
                          )
                        : "—"}
                    </td>
                    <td className="px-3 py-2.5">{formatEuro(row.amount)}</td>
                    <td className="px-3 py-2.5">
                      <Badge
                        variant={row.status === "Voltooid" ? "solid" : "outline"}
                      >
                        {statusLabel(row.status, locale)}
                      </Badge>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : null}
    </AffiliateGate>
  )
}
