"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Notice } from "@europmade/ui"
import { SellerGate } from "./_components/seller-gate"
import {
  OrderServiceApiError,
  listSellerOrders,
  listSellerReturns,
} from "../_lib/order-service-api"
import { formatEuro } from "../_components/storefront-shell"

/**
 * Seller Dashboard Home (S3-13-02) — KPI’s/taken op basis van order-service data.
 * Omzet/voorraadwaarschuwingen blijven lichtgewicht tot Finance/Inventory-epic.
 */
export default function SellerDashboardPage() {
  const [openOrders, setOpenOrders] = useState(0)
  const [pendingReturns, setPendingReturns] = useState(0)
  const [monthRevenue, setMonthRevenue] = useState(0)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([listSellerOrders(), listSellerReturns()])
      .then(([ordersRes, returnsRes]) => {
        if (cancelled) return
        setOpenOrders(ordersRes.count)
        setPendingReturns(
          returnsRes.returns.filter((r) =>
            ["Aangevraagd", "Bevestigd", "Ontvangen", "Geëscaleerd"].includes(
              r.status
            )
          ).length
        )
        const now = new Date()
        let revenue = 0
        for (const item of ordersRes.orders) {
          const created = new Date(item.order.created_at)
          if (
            created.getUTCFullYear() === now.getUTCFullYear() &&
            created.getUTCMonth() === now.getUTCMonth()
          ) {
            for (const line of item.lines) {
              const unit =
                typeof line.unit_price_snapshot === "number"
                  ? line.unit_price_snapshot
                  : Number(line.unit_price_snapshot)
              if (Number.isFinite(unit)) {
                revenue += unit * line.quantity
              }
            }
          }
        }
        setMonthRevenue(Math.round(revenue * 100) / 100)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(
          err instanceof OrderServiceApiError
            ? err.message
            : "Dashboard laden mislukt."
        )
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <SellerGate
      breadcrumb={[
        { label: "Seller Dashboard", href: "/seller" },
        { label: "Dashboard" },
      ]}
    >
      <h1 className="text-[19px] font-bold text-wf-900">Dashboard</h1>
      <p className="mt-1.5 text-xs text-wf-600">
        Snel overzicht van status en to-do&apos;s.
      </p>

      {error ? (
        <Notice variant="warning" className="mt-4">
          {error}
        </Notice>
      ) : null}

      <div className="mt-5 grid gap-3 tablet:grid-cols-3">
        <div className="rounded-md border border-wf-300 bg-wf-50 p-4">
          <div className="text-[22px] font-bold text-wf-900">
            {formatEuro(monthRevenue)}
          </div>
          <div className="mt-1 text-[11px] text-wf-600">Omzet deze maand</div>
          <div className="mt-2 text-[11px] text-wf-500">
            Op basis van geplaatste orderregels (snapshots)
          </div>
        </div>
        <div className="rounded-md border border-wf-300 bg-wf-50 p-4">
          <div className="text-[22px] font-bold text-wf-900">{openOrders}</div>
          <div className="mt-1 text-[11px] text-wf-600">Orders (totaal)</div>
          <Link
            href="/seller/orders"
            className="mt-2 inline-block text-[11px] font-semibold text-wf-800 hover:underline"
          >
            ↳ Bekijk orders
          </Link>
        </div>
        <div className="rounded-md border border-wf-300 bg-wf-50 p-4">
          <div className="text-[22px] font-bold text-wf-900">
            {pendingReturns}
          </div>
          <div className="mt-1 text-[11px] text-wf-600">Openstaande retouren</div>
          <Link
            href="/seller/returns"
            className="mt-2 inline-block text-[11px] font-semibold text-wf-800 hover:underline"
          >
            ↳ Bekijk retouren
          </Link>
        </div>
      </div>

      <h2 className="mt-8 text-sm font-bold text-wf-900">Taken</h2>
      <ul className="mt-3 divide-y divide-wf-200 rounded-md border border-wf-300 text-xs">
        <li className="flex items-center justify-between px-3 py-2.5">
          <span>
            {pendingReturns} retourverzoek(en) wacht(en) op beoordeling
          </span>
          <Link
            href="/seller/returns"
            className="font-semibold text-wf-900 hover:underline"
          >
            Bekijken →
          </Link>
        </li>
        <li className="flex items-center justify-between px-3 py-2.5 text-wf-500">
          <span>Berichten van klanten</span>
          <span>Volgt in S3-05-07</span>
        </li>
      </ul>
    </SellerGate>
  )
}
