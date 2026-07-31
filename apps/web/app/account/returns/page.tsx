"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Badge, Notice } from "@europmade/ui"
import { BuyerGate } from "../_components/buyer-gate"
import {
  OrderServiceApiError,
  listReturns,
  type ReturnView,
} from "../../_lib/order-service-api"

type ListedReturn = ReturnView & {
  order_id: string
  order_number: string
  seller_id: string
  offer_id: string
}

export default function BuyerReturnsPage() {
  const [returns, setReturns] = useState<ListedReturn[] | "loading" | "error">(
    "loading"
  )
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    listReturns()
      .then((res) => {
        if (!cancelled) setReturns(res.returns)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setReturns("error")
        setError(
          err instanceof OrderServiceApiError
            ? err.message
            : "Retouren laden mislukt."
        )
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <BuyerGate
      breadcrumb={[
        { label: "Mijn EuropMade", href: "/account" },
        { label: "Retouren" },
      ]}
    >
      <h1 className="text-[19px] font-bold text-wf-900">Retouren</h1>
      <p className="mt-1.5 text-xs text-wf-600">
        Status van je retouraanvragen. Nieuwe retour start vanuit een orderdetail.
      </p>

      {error ? (
        <Notice variant="warning" className="mt-4">
          {error}
        </Notice>
      ) : null}

      {returns === "loading" ? (
        <p className="mt-6 text-xs text-wf-600">Laden…</p>
      ) : returns === "error" || returns.length === 0 ? (
        <p className="mt-6 text-xs text-wf-600">
          Geen retouren.{" "}
          <Link href="/account/orders" className="font-semibold underline">
            Ga naar bestellingen
          </Link>
        </p>
      ) : (
        <ul className="mt-5 divide-y divide-wf-200 rounded-md border border-wf-300">
          {returns.map((ret) => (
            <li
              key={ret.id}
              className="flex flex-wrap items-center justify-between gap-3 px-3 py-3 text-xs"
            >
              <div>
                <div className="font-medium text-wf-900">
                  Order #{ret.order_number}
                </div>
                <div className="mt-0.5 text-wf-600">{ret.reason}</div>
                <div className="mt-1">
                  <Badge variant="outline">{ret.status}</Badge>
                  {ret.refund_status ? (
                    <span className="ml-2 text-wf-600">
                      Refund: {ret.refund_status}
                    </span>
                  ) : null}
                </div>
              </div>
              <Link
                href={`/account/returns/${ret.id}`}
                className="font-semibold text-wf-900 hover:underline"
              >
                Bekijken
              </Link>
            </li>
          ))}
        </ul>
      )}
    </BuyerGate>
  )
}
