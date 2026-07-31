"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Notice } from "@europmade/ui"
import { SellerGate } from "../_components/seller-gate"
import {
  OrderServiceApiError,
  listSellerMessageThreads,
  type MessageThreadSummary,
} from "../../_lib/order-service-api"

export default function SellerMessagesPage() {
  const [threads, setThreads] = useState<
    MessageThreadSummary[] | "loading" | "error"
  >("loading")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    listSellerMessageThreads()
      .then((res) => {
        if (!cancelled) setThreads(res.threads)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setThreads("error")
        setError(
          err instanceof OrderServiceApiError
            ? err.message
            : "Berichten laden mislukt."
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
        { label: "Berichten" },
      ]}
    >
      <h1 className="text-[19px] font-bold text-wf-900">Berichten</h1>
      <p className="mt-1.5 text-xs text-wf-600">
        Conversaties met klanten over jullie gedeelde orders.
      </p>

      {error ? (
        <Notice variant="warning" className="mt-4">
          {error}
        </Notice>
      ) : null}

      {threads === "loading" ? (
        <p className="mt-6 text-xs text-wf-600">Laden…</p>
      ) : threads === "error" || threads.length === 0 ? (
        <p className="mt-6 text-xs text-wf-600">Nog geen gesprekken.</p>
      ) : (
        <ul className="mt-5 divide-y divide-wf-200 rounded-md border border-wf-300">
          {threads.map((t) => (
            <li key={t.order_id}>
              <Link
                href={`/seller/messages/${t.order_id}`}
                className="flex flex-wrap items-center justify-between gap-2 px-3 py-3 text-xs hover:bg-wf-50"
              >
                <div>
                  <div className="font-semibold text-wf-900">
                    Order #{t.order_number}
                  </div>
                  <div className="mt-0.5 text-wf-600">
                    {t.last_body_preview ?? "Nog geen berichten"}
                  </div>
                </div>
                <span className="text-wf-500">{t.message_count}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </SellerGate>
  )
}
