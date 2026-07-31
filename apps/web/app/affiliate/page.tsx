"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Badge, Notice } from "@europmade/ui"
import { AffiliateGate } from "./_components/affiliate-gate"
import {
  AffiliateApiError,
  getAffiliateDashboard,
  type DashboardResponse,
} from "../_lib/affiliate-api"

/**
 * Affiliate Dashboard Home — affiliate-02 (S3-07-05).
 */
export default function AffiliateDashboardPage() {
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
            : "Dashboard laden mislukt."
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
        { label: "Affiliate Dashboard Home" },
      ]}
    >
      <h1 className="text-[19px] font-bold text-wf-900">Affiliate Dashboard</h1>
      <p className="mt-1.5 text-xs text-wf-600">
        Status:{" "}
        {data ? (
          <Badge variant="solid" className="align-middle">
            {data.affiliate.onboarding_status}
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
          label={`Klikken (${data?.period_days ?? 30} dagen)`}
        />
        <KpiCard
          value={data ? String(data.kpis.conversions) : "—"}
          label={`Conversies (${data?.period_days ?? 30} dagen)`}
        />
        <KpiCard
          value={data?.kpis.commission_formatted ?? "—"}
          label="Commissie deze periode"
          linkHref={null}
          linkLabel="Bekijk uitbetalingen"
        />
      </div>

      <h2 className="mt-8 text-sm font-bold text-wf-900">Snelkoppelingen</h2>
      <ul className="mt-3 divide-y divide-wf-200 rounded-md border border-wf-300">
        <li className="flex items-center justify-between gap-3 px-3 py-3 text-xs">
          <span>Nieuwe trackinglink aanmaken</span>
          <Link
            href="/affiliate/links"
            className="font-semibold text-wf-900 underline"
          >
            Aanmaken →
          </Link>
        </li>
        <li className="flex items-center justify-between gap-3 px-3 py-3 text-xs">
          <span>Statistieken per link bekijken</span>
          <Link
            href="/affiliate/stats"
            className="font-semibold text-wf-900 underline"
          >
            Bekijken →
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
}: {
  value: string
  label: string
  linkHref?: string | null
  linkLabel?: string
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
            title="Nog niet beschikbaar"
          >
            ↳ {linkLabel}
          </span>
        )
      ) : null}
    </div>
  )
}
