"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Notice } from "@europmade/ui"
import { BuyerGate } from "../_components/buyer-gate"
import {
  OrderServiceApiError,
  listMessageThreads,
  type MessageThreadSummary,
} from "../../_lib/order-service-api"

export default function BuyerMessagesPage() {
  const [threads, setThreads] = useState<
    MessageThreadSummary[] | "loading" | "error"
  >("loading")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    listMessageThreads()
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
    <BuyerGate
      breadcrumb={[
        { label: "Mijn EuropMade", href: "/account" },
        { label: "Berichten" },
      ]}
    >
      <h1 className="text-[19px] font-bold text-wf-900">Berichten</h1>
      <p className="mt-1.5 text-xs text-wf-600">
        Communicatie met verkopers, uitsluitend gekoppeld aan een bestelling.
      </p>

      {error ? (
        <Notice variant="warning" className="mt-4">
          {error}
        </Notice>
      ) : null}

      {threads === "loading" ? (
        <p className="mt-6 text-xs text-wf-600">Laden…</p>
      ) : threads === "error" || threads.length === 0 ? (
        <p className="mt-6 text-xs text-wf-600">
          Nog geen gesprekken. Open een{" "}
          <Link href="/account/orders" className="font-semibold underline">
            bestelling
          </Link>{" "}
          om een bericht te sturen.
        </p>
      ) : (
        <ul className="mt-5 divide-y divide-wf-200 rounded-md border border-wf-300">
          {threads.map((t) => (
            <li key={t.order_id}>
              <Link
                href={`/account/messages/${t.order_id}`}
                className="flex flex-wrap items-center justify-between gap-2 px-3 py-3 text-xs hover:bg-wf-50"
              >
                <div>
                  <div className="font-semibold text-wf-900">
                    Order #{t.order_number}
                  </div>
                  <div className="mt-0.5 text-wf-600">
                    {t.last_body_preview ?? "Nog geen berichten — start een gesprek"}
                  </div>
                </div>
                <span className="text-wf-500">{t.message_count} berichten</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </BuyerGate>
  )
}
