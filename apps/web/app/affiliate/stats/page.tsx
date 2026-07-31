"use client"

import { useEffect, useState } from "react"
import { Notice } from "@europmade/ui"
import { AffiliateGate } from "../_components/affiliate-gate"
import {
  AffiliateApiError,
  getAffiliateStats,
  type DashboardResponse,
} from "../../_lib/affiliate-api"

/**
 * Statistieken — affiliate-03 (S3-07-05).
 */
export default function AffiliateStatsPage() {
  const [rows, setRows] = useState<DashboardResponse["link_stats"]>([])
  const [periodDays, setPeriodDays] = useState(30)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    getAffiliateStats()
      .then((res) => {
        if (cancelled) return
        setRows(res.link_stats)
        setPeriodDays(res.period_days)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(
          err instanceof AffiliateApiError
            ? err.message
            : "Statistieken laden mislukt."
        )
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <AffiliateGate
      breadcrumb={[
        { label: "Affiliate Dashboard", href: "/affiliate" },
        { label: "Statistieken" },
      ]}
    >
      <h1 className="text-[19px] font-bold text-wf-900">Statistieken</h1>
      <p className="mt-1.5 text-xs text-wf-600">
        Klikken en conversies per trackinglink en periode.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <span className="rounded-full border border-wf-400 bg-white px-3 py-1 text-[11px] text-wf-700">
          Laatste {periodDays} dagen
        </span>
        <span className="rounded-full border border-wf-400 bg-white px-3 py-1 text-[11px] text-wf-700">
          Alle links
        </span>
      </div>

      {error ? (
        <Notice variant="warning" className="mt-4">
          {error}
        </Notice>
      ) : null}

      <div className="mt-4 overflow-x-auto rounded-md border border-wf-300">
        <table className="w-full min-w-[560px] border-collapse text-left text-xs">
          <thead className="bg-wf-100 text-wf-700">
            <tr>
              <th className="px-3 py-2 font-semibold">Link</th>
              <th className="px-3 py-2 font-semibold">Klikken</th>
              <th className="px-3 py-2 font-semibold">Conversies</th>
              <th className="px-3 py-2 font-semibold">Conversieratio</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3 py-4 text-wf-600">
                  Nog geen trackinglinks.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.link_id} className="border-t border-wf-200">
                  <td className="px-3 py-2.5 text-wf-900">{row.display_url}</td>
                  <td className="px-3 py-2.5">{row.clicks}</td>
                  <td className="px-3 py-2.5">{row.conversions}</td>
                  <td className="px-3 py-2.5">
                    {row.conversion_rate.toLocaleString("nl-NL", {
                      maximumFractionDigits: 1,
                    })}
                    %
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {rows.length > 0 ? (
        <p className="mt-2 text-[11px] text-wf-500">
          1–{rows.length} van {rows.length}
        </p>
      ) : null}
    </AffiliateGate>
  )
}
