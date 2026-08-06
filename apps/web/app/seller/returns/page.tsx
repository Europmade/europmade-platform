"use client"

import Link from "next/link"
import { Badge } from "@europmade/ui"
import { SellerGate } from "../_components/seller-gate"
import { EmptyState } from "../_components/empty-state"
import { formatEuro } from "../../_components/storefront-shell"
import { useDemoReturns } from "../_lib/demo-store"

export default function SellerReturnsPage() {
  const [returns] = useDemoReturns()

  return (
    <SellerGate
      breadcrumb={[
        { label: "Seller Dashboard", href: "/seller" },
        { label: "Retouren" },
      ]}
    >
      <h1 className="text-[19px] font-bold text-wf-900">Retouren</h1>
      <p className="mt-1.5 text-xs text-wf-600">
        Beoordeel retouraanvragen: accepteren, afwijzen of informatie vragen.
      </p>

      {returns.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="Geen retouren"
            description="Retouraanvragen van klanten verschijnen hier zodra ze zijn ingediend."
          />
        </div>
      ) : (
        <ul className="mt-5 space-y-3">
          {returns.map((ret) => (
            <li
              key={ret.id}
              className="rounded-lg border border-wf-300 bg-white p-4 text-xs"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="font-semibold text-wf-900">
                    {ret.return_number} · Order #{ret.order_number}
                  </div>
                  <div className="mt-1 text-wf-700">{ret.reason}</div>
                  <div className="mt-1 text-wf-500">
                    {ret.customer_name} ·{" "}
                    {new Date(ret.created_at).toLocaleDateString("nl-NL")} ·{" "}
                    {formatEuro(ret.amount)}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="outline">{ret.status}</Badge>
                  <Link
                    href={`/seller/returns/${ret.id}`}
                    className="font-semibold underline"
                  >
                    Openen
                  </Link>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </SellerGate>
  )
}
