"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { useStorefrontLocale } from "../../../_lib/i18n/use-storefront-locale"
import { t, type StorefrontMessageKey } from "../../../_lib/i18n/messages"

type Topic = { key: string; enabled: boolean }

const TOPIC_LABEL: Record<string, StorefrontMessageKey> = {
  news: "newsletterTopicNews",
  brands: "newsletterTopicBrands",
  offers: "newsletterTopicOffers",
}

export default function UnsubscribePage() {
  const params = useParams<{ token: string }>()
  const token = params.token
  const locale = useStorefrontLocale()
  const [message, setMessage] = useState(t("loading", locale))
  const [topics, setTopics] = useState<Topic[]>([])
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!token) return
    let cancelled = false
    fetch(`/api/nieuwsbrief/uitschrijven/${encodeURIComponent(token)}`)
      .then(async (res) => {
        const body = (await res.json().catch(() => null)) as {
          message?: string
          newsletters?: Topic[]
        } | null
        if (cancelled) return
        setMessage(body?.message || t("newsletterUnsubscribeTitle", locale))
        setTopics(body?.newsletters ?? [])
      })
      .catch(() => {
        if (!cancelled) setMessage(t("newsletterUnsubscribeTitle", locale))
      })
    return () => {
      cancelled = true
    }
  }, [token, locale])

  async function save(next: Topic[] | null) {
    setBusy(true)
    try {
      const res = await fetch(`/api/nieuwsbrief/uitschrijven/${encodeURIComponent(token)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          next
            ? {
                topics: {
                  news: next.find((item) => item.key === "news")?.enabled === true,
                  brands: next.find((item) => item.key === "brands")?.enabled === true,
                  offers: next.find((item) => item.key === "offers")?.enabled === true,
                },
              }
            : {}
        ),
      })
      const body = (await res.json().catch(() => null)) as {
        message?: string
        newsletters?: Topic[]
      } | null
      setMessage(body?.message || t("newsletterUnsubscribeTitle", locale))
      if (body?.newsletters) setTopics(body.newsletters)
    } catch {
      setMessage(t("newsletterUnsubscribeTitle", locale))
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-16">
      <h1 className="text-xl font-bold text-wf-900">{t("newsletterUnsubscribeTitle", locale)}</h1>
      <p className="mt-3 text-sm text-wf-800">{message}</p>
      {topics.length > 0 ? (
        <ul className="mt-4 space-y-2">
          {topics.map((item) => (
            <li key={item.key}>
              <label className="flex items-center gap-2 text-sm text-wf-800">
                <input
                  type="checkbox"
                  checked={item.enabled}
                  disabled={busy}
                  onChange={(event) =>
                    setTopics((current) =>
                      current.map((row) =>
                        row.key === item.key ? { ...row, enabled: event.target.checked } : row
                      )
                    )
                  }
                />
                {TOPIC_LABEL[item.key] ? t(TOPIC_LABEL[item.key], locale) : item.key}
              </label>
            </li>
          ))}
        </ul>
      ) : null}
      {topics.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            className="h-10 rounded bg-wf-900 px-4 text-sm font-medium text-white disabled:opacity-50"
            onClick={() => void save(topics)}
          >
            {t("newsletterUnsubscribeSave", locale)}
          </button>
          <button
            type="button"
            disabled={busy}
            className="h-10 rounded border border-wf-400 px-4 text-sm text-wf-900 disabled:opacity-50"
            onClick={() => void save(null)}
          >
            {t("newsletterUnsubscribeAll", locale)}
          </button>
        </div>
      ) : null}
    </main>
  )
}
