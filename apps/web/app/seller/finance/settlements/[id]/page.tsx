"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { Badge, Notice } from "@europmade/ui"
import { SellerGate } from "../../../_components/seller-gate"
import { formatEuro } from "../../../../_components/storefront-shell"
import { medusaBackendUrl } from "../../../../_lib/medusa-backend-url"

const PK = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? ""

export default function SellerSettlementDetailPage() {
  const params = useParams()
  const id = params?.id as string
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    fetch(`${medusaBackendUrl()}/store/finance/seller/settlements/${id}`, {
      credentials: "include",
      headers: {
        "content-type": "application/json",
        ...(PK ? { "x-publishable-api-key": PK } : {}),
      },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        setData(d)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [id])

  const s = data?.settlement
  const inv = data?.invoice

  return (
    <SellerGate
      breadcrumb={[
        { label: "Seller", href: "/seller" },
        { label: "Finance", href: "/seller/finance" },
        { label: "Settlements", href: "/seller/finance/settlements" },
        { label: s ? "Detail" : "…" },
      ]}
    >
      {loading ? (
        <p className="text-xs text-wf-500">Laden…</p>
      ) : !s ? (
        <Notice variant="warning">Settlement niet gevonden.</Notice>
      ) : (
        <>
          <h1 className="text-[19px] font-bold text-wf-900">Settlement</h1>
          <p className="mt-1 text-xs text-wf-600">
            {new Date(s.period_start).toLocaleDateString("nl-NL")} –{" "}
            {new Date(s.period_end).toLocaleDateString("nl-NL")}{" "}
            <Badge variant="outline">{s.status}</Badge>
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3 text-xs tablet:grid-cols-3">
            <Row label="Verkoopwaarde" value={s.gross_sales} />
            <Row label="Retouren" value={s.refunds} />
            <Row label="Netto verkoop" value={s.net_sales} />
            <Row label="EuropMade-kosten (commissie)" value={s.platform_commission} />
            <Row label="Advertising" value={s.advertising_amount} />
            <Row label="Totaal gefactureerde diensten" value={s.invoice_total} />
            <Row label="Netto settlement" value={s.net_settlement} />
          </div>
          <section className="mt-5 rounded-lg border border-wf-300 bg-white px-4 py-3 text-xs">
            <h2 className="mb-2 font-semibold">Gekoppelde factuur</h2>
            {inv ? (
              <>
                <p>
                  {inv.invoice_number} · status {inv.status} ·{" "}
                  {formatEuro(inv.total)}
                </p>
                <Link
                  className="mt-2 inline-block underline"
                  href={`/seller/finance/facturen/${inv.id}`}
                >
                  Factuurdetail (specificatie)
                </Link>
                <p className="mt-2 text-wf-500">
                  PDF-download volgt na fiscale goedkeuring. Geen wettelijke
                  layout in G3.
                </p>
              </>
            ) : (
              <p>Geen dienstenfactuur in deze periode.</p>
            )}
          </section>
        </>
      )}
    </SellerGate>
  )
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded border border-wf-300 bg-white px-3 py-2">
      <p className="text-[10px] uppercase text-wf-500">{label}</p>
      <p className="font-medium">{formatEuro(value)}</p>
    </div>
  )
}
