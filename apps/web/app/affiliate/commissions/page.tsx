"use client"

import { useEffect, useState } from "react"
import { Badge, Notice } from "@europmade/ui"
import { AffiliateGate } from "../_components/affiliate-gate"
import {
  AffiliateApiError,
  getAffiliateCommissions,
  type CommissionRow,
} from "../../_lib/affiliate-api"

/**
 * Commissies — affiliate-04 (S3-07-05).
 */
export default function AffiliateCommissionsPage() {
  const [rows, setRows] = useState<CommissionRow[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    getAffiliateCommissions()
      .then((res) => {
        if (!cancelled) setRows(res.commissions)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(
          err instanceof AffiliateApiError
            ? err.message
            : "Commissies laden mislukt."
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
        { label: "Commissies" },
      ]}
    >
      <h1 className="text-[19px] font-bold text-wf-900">Commissies</h1>
      <p className="mt-1.5 text-xs text-wf-600">
        Overzicht van toegekende commissie per conversie.
      </p>

      {error ? (
        <Notice variant="warning" className="mt-4">
          {error}
        </Notice>
      ) : null}

      <div className="mt-4 overflow-x-auto rounded-md border border-wf-300">
        <table className="w-full min-w-[640px] border-collapse text-left text-xs">
          <thead className="bg-wf-100 text-wf-700">
            <tr>
              <th className="px-3 py-2 font-semibold">Datum</th>
              <th className="px-3 py-2 font-semibold">Order</th>
              <th className="px-3 py-2 font-semibold">Type</th>
              <th className="px-3 py-2 font-semibold">Bedrag</th>
              <th className="px-3 py-2 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-4 text-wf-600">
                  Nog geen commissies.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-t border-wf-200">
                  <td className="px-3 py-2.5">
                    {new Date(row.created_at).toLocaleDateString("nl-NL", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                  <td className="px-3 py-2.5">#{row.order_number}</td>
                  <td className="px-3 py-2.5">{row.attribution_type}</td>
                  <td className="px-3 py-2.5">{row.amount_formatted}</td>
                  <td className="px-3 py-2.5">
                    <Badge
                      variant={
                        row.status === "Toegekend" ? "solid" : "outline"
                      }
                    >
                      {row.ui_status}
                    </Badge>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Notice className="mt-4">
        Commissie wordt pas uitbetaald na de wettelijke herroepingstermijn van
        de onderliggende order.
      </Notice>
    </AffiliateGate>
  )
}
