"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Notice } from "@europmade/ui"
import {
  loadAdminDashboard,
  type AdminDashboardData,
  type DashboardMetric,
} from "../../../lib/dashboard-api"

/**
 * Marketplace-overzicht — Product Cloud-KPI's (bestaande admin-API's).
 */
export default function MarketplacePage() {
  const [data, setData] = useState<AdminDashboardData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    loadAdminDashboard()
      .then((d) => {
        if (!cancelled) setData(d)
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Marketplace laden mislukt."
          )
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (error) {
    return <Notice variant="warning">{error}</Notice>
  }

  if (!data) {
    return <p className="text-xs text-wf-600">Marketplace laden…</p>
  }

  return (
    <div>
      <p className="mb-4 text-[11.5px] text-wf-500">
        Marketplace &gt;{" "}
        <b className="font-semibold text-wf-800">Overzicht</b>
      </p>
      <h1 className="text-[19px] font-bold text-wf-900">Marketplace</h1>
      <p className="mb-5 mt-1.5 text-xs text-wf-600">
        Product Cloud-KPI&apos;s en partnerstatus.
      </p>

      <div className="mb-6 grid grid-cols-1 gap-4 tablet:grid-cols-2 desktop:grid-cols-3">
        <MiniKpi metric={data.marketplace.activeProducts} label="Actieve producten" />
        <MiniKpi
          metric={data.marketplace.newProductsToday}
          label="Nieuwe producten vandaag"
        />
        <MiniKpi
          metric={data.marketplace.pendingPartnerRequests}
          label="Pending partneraanvragen"
          linkLabel="Naar Partnerbeheer"
        />
        <MiniKpi
          metric={data.hero.activeSellers}
          label="Actieve Sellers"
          linkLabel="Naar Partnerbeheer"
        />
        <MiniKpi
          metric={data.marketplace.pendingVerifications}
          label="Pending verificaties"
        />
      </div>

      <Link href="/dashboard" className="text-xs text-wf-700 underline">
        Terug naar Dashboard
      </Link>
    </div>
  )
}

function MiniKpi({
  metric,
  label,
  linkLabel,
}: {
  metric: DashboardMetric
  label: string
  linkLabel?: string
}) {
  return (
    <div className="rounded-lg border border-wf-300 bg-white px-5 py-[18px]">
      <div className="text-[26px] font-bold leading-none text-wf-900">
        {metric.value}
      </div>
      <div className="mt-1.5 text-[11.5px] text-wf-600">{label}</div>
      {metric.source === "unavailable" ? (
        <div className="mt-1 text-[10.5px] text-wf-500">
          {metric.note ?? "Niet beschikbaar"}
        </div>
      ) : null}
      {linkLabel && metric.href ? (
        <Link
          href={metric.href}
          className="mt-2 inline-block text-[11px] text-wf-700 underline"
        >
          ↳ {linkLabel}
        </Link>
      ) : null}
    </div>
  )
}
