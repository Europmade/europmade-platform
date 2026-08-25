"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Badge } from "@europmade/ui"
import { SellerGate } from "../../_components/seller-gate"
import { EmptyState } from "../../_components/empty-state"
import { formatEuro } from "../../../_components/storefront-shell"

type Row = {
  id: string
  period_start: string
  period_end: string
  status: string
  net_sales: number
  invoice_total: number
  net_settlement: number
  invoice_id: string | null
}

const BACKEND_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? "http://localhost:9000"
const PK = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? ""

export default function SellerSettlementsPage() {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${BACKEND_URL}/store/finance/seller/settlements`, {
      credentials: "include",
      headers: {
        "content-type": "application/json",
        ...(PK ? { "x-publishable-api-key": PK } : {}),
      },
    })
      .then((r) => (r.ok ? r.json() : { settlements: [] }))
      .then((d) => setRows(d.settlements ?? []))
      .finally(() => setLoading(false))
  }, [])

  return (
    <SellerGate
      breadcrumb={[
        { label: "Seller", href: "/seller" },
        { label: "Finance", href: "/seller/finance" },
        { label: "Settlements" },
      ]}
    >
      <h1 className="text-[19px] font-bold text-wf-900">Settlements</h1>
      <p className="mt-1.5 text-xs text-wf-600">
        Periodiek overzicht van verkopen, retouren en EuropMade-diensten. Dit is
        geen verkoopfactuur aan de consument.
      </p>
      {!loading && rows.length === 0 ? (
        <div className="mt-6">
          <EmptyState title="Nog geen settlements." description="" />
        </div>
      ) : (
        <div className="mt-5 overflow-x-auto rounded-lg border border-wf-300 bg-white">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr>
                {["Periode", "Status", "Netto verkoop", "EuropMade-factuur", "Netto"].map(
                  (h) => (
                    <th
                      key={h}
                      className="border-b border-wf-400 px-4 py-2.5 text-left text-[10px] uppercase text-wf-500"
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-wf-200">
                  <td className="px-4 py-2.5">
                    <Link
                      className="underline"
                      href={`/seller/finance/settlements/${row.id}`}
                    >
                      {new Date(row.period_start).toLocaleDateString("nl-NL")} –{" "}
                      {new Date(row.period_end).toLocaleDateString("nl-NL")}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5">
                    <Badge variant="outline">{row.status}</Badge>
                  </td>
                  <td className="px-4 py-2.5">{formatEuro(row.net_sales)}</td>
                  <td className="px-4 py-2.5">{formatEuro(row.invoice_total)}</td>
                  <td className="px-4 py-2.5 font-medium">
                    {formatEuro(row.net_settlement)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SellerGate>
  )
}
