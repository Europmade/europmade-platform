"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Badge, Notice } from "@europmade/ui"
import {
  QUEUE_LABELS,
  listQueue,
  listQueueSummary,
  ModerationAdminApiError,
  type QueueItem,
  type QueueKey,
  type QueueSummary,
} from "../../../lib/moderation-admin-api"

const TABS: QueueKey[] = [
  "claims",
  "ownership",
  "matching",
  "disputes",
  "fraude",
  "meldingen",
  "hoog-risico",
]

/**
 * Moderatiewachtrij overzicht — moderatie-01 (S3-11-03).
 */
export default function ModerationQueuePage() {
  const [tab, setTab] = useState<QueueKey>("fraude")
  const [summary, setSummary] = useState<QueueSummary[]>([])
  const [items, setItems] = useState<QueueItem[] | "loading">("loading")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    listQueueSummary()
      .then((res) => setSummary(res.queues))
      .catch(() => setSummary([]))
  }, [])

  useEffect(() => {
    let cancelled = false
    setItems("loading")
    listQueue(tab)
      .then((res) => {
        if (!cancelled) setItems(res.items)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(
          err instanceof ModerationAdminApiError
            ? err.message
            : "Wachtrij laden mislukt."
        )
        setItems([])
      })
    return () => {
      cancelled = true
    }
  }, [tab])

  function countFor(key: QueueKey): number {
    return summary.find((q) => q.key === key)?.count ?? 0
  }

  return (
    <div>
      <h1 className="text-[19px] font-bold text-wf-900">Moderatiewachtrij</h1>
      <p className="mt-1.5 text-xs text-wf-600">
        Zeven wachtrijtypen, hier getoond als gefilterde tabs.
      </p>

      <div className="mt-4 flex flex-wrap gap-0 border-b border-wf-300">
        {TABS.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={
              tab === key
                ? "border-b-2 border-wf-900 px-3 py-2 text-xs font-semibold text-wf-900"
                : "px-3 py-2 text-xs text-wf-600"
            }
          >
            {QUEUE_LABELS[key]}{" "}
            <span className="text-wf-500">({countFor(key)})</span>
          </button>
        ))}
      </div>

      {error ? (
        <Notice variant="warning" className="mt-4">
          {error}
        </Notice>
      ) : null}

      {items === "loading" ? (
        <p className="mt-6 text-xs text-wf-600">Laden…</p>
      ) : items.length === 0 ? (
        <p className="mt-6 text-xs text-wf-600">Geen open items in deze wachtrij.</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-wf-300 text-wf-600">
                <th className="py-2 pr-3 font-semibold">Type</th>
                <th className="py-2 pr-3 font-semibold">Item</th>
                <th className="py-2 pr-3 font-semibold">Signaal</th>
                <th className="py-2 pr-3 font-semibold">Leeftijd</th>
                <th className="py-2 font-semibold" />
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-wf-200 text-wf-800">
                  <td className="py-2.5 pr-3">{item.item_type}</td>
                  <td className="py-2.5 pr-3">{item.title}</td>
                  <td className="py-2.5 pr-3">
                    {item.signal_code ? (
                      <Badge variant="outline">{item.signal_code}</Badge>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="py-2.5 pr-3">{item.age_hours} u</td>
                  <td className="py-2.5">
                    <Link
                      href={`/moderation/${item.queue}/${item.id}`}
                      className="font-semibold underline"
                    >
                      Beoordelen
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
