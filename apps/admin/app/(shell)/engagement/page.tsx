"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Notice } from "@europmade/ui"
import {
  EngagementAdminApiError,
  eventStatusLabel,
  formatCount,
  getEngagementOverview,
  type EngagementAttentionItem,
  type EngagementOverview,
  type EngagementWorkEvent,
} from "../../../lib/engagement-admin-api"

function messageOf(err: unknown, fallback: string): string {
  return err instanceof EngagementAdminApiError ? err.message : fallback
}

function noun(count: number, one: string, many: string): string {
  return `${formatCount(count)} ${count === 1 ? one : many}`
}

function dayLabel(value: string | null): string {
  if (!value) return "Eerder"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Eerder"
  const start = (item: Date) =>
    new Date(item.getFullYear(), item.getMonth(), item.getDate()).getTime()
  const diff = Math.round((start(new Date()) - start(date)) / 86400000)
  if (diff === 0) return "Vandaag"
  if (diff === 1) return "Gisteren"
  return new Intl.DateTimeFormat("nl-NL", {
    day: "numeric",
    month: "short",
  }).format(date)
}

function party(event: EngagementWorkEvent): string | null {
  const person = event.contact_name?.trim() || ""
  const company = event.company_name?.trim() || ""
  if (person && company && person !== company) return `${person} · ${company}`
  return person || company || null
}

function WorkCard({
  title,
  countText,
  description,
  items,
  hrefFor,
  actionHref,
  actionLabel,
}: {
  title: string
  countText: string
  description: string
  items: EngagementAttentionItem[]
  hrefFor: (item: EngagementAttentionItem) => string
  actionHref: string
  actionLabel: string
}) {
  const empty = countText.startsWith("0 ")
  return (
    <section className="flex h-full min-w-0 flex-col rounded-lg border border-wf-300 bg-white p-3">
      <h2 className="text-[11px] font-semibold uppercase tracking-wide text-wf-500">
        {title}
      </h2>
      <p className="mt-1 text-sm font-semibold text-wf-900">{countText}</p>
      <p className="mt-1 text-[11px] leading-snug text-wf-600">
        {empty ? "Geen items die nu aandacht nodig hebben." : description}
      </p>
      {items.length > 0 ? (
        <ul className="mt-2 space-y-1.5">
          {items.map((item) => (
            <li key={item.id}>
              <Link href={hrefFor(item)} className="block min-w-0 hover:underline">
                <span className="block truncate text-xs font-medium text-wf-900">
                  {item.title}
                </span>
                {item.subtitle ? (
                  <span className="block truncate text-[11px] text-wf-600">
                    {item.subtitle}
                  </span>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
      <Link
        href={actionHref}
        className="mt-auto pt-3 text-[11px] font-medium text-wf-900 underline"
      >
        {empty ? "Bekijk lijst" : actionLabel}
      </Link>
    </section>
  )
}

export default function EngagementOverviewPage() {
  const [data, setData] = useState<EngagementOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    getEngagementOverview()
      .then((overview) => {
        if (cancelled) return
        setData(overview)
        setError(null)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(messageOf(err, "Werkoverzicht laden mislukt."))
        setData(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const groups: Array<{ label: string; items: EngagementWorkEvent[] }> = []
  for (const event of data?.recent ?? []) {
    const label = dayLabel(event.created_at)
    const current = groups[groups.length - 1]
    if (current?.label === label) current.items.push(event)
    else groups.push({ label, items: [event] })
  }

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="text-[19px] font-bold text-wf-900">Vandaag</h1>
      <p className="mt-1 text-xs text-wf-600">Dit vraagt vandaag je aandacht.</p>
      {error ? (
        <div className="mt-3">
          <Notice variant="warning">{error}</Notice>
        </div>
      ) : null}
      {loading ? (
        <p className="mt-3 text-xs text-wf-500">Laden…</p>
      ) : data ? (
        <>
          <div className="mt-3 grid grid-cols-1 gap-2 tablet:grid-cols-2 desktop:grid-cols-4">
            <WorkCard
              title="Opvolging nodig"
              countText={noun(data.follow_up.count, "prospect", "prospects")}
              description="Prospects die persoonlijke opvolging nodig hebben."
              items={data.follow_up.items}
              hrefFor={(item) => `/engagement/prospects/${item.id}`}
              actionHref="/engagement/prospects?status=opvolging_nodig"
              actionLabel="Alle opvolging bekijken"
            />
            <WorkCard
              title="Te benaderen"
              countText={noun(data.to_approach.count, "prospect", "prospects")}
              description="Nieuwe prospects die nog benaderd moeten worden."
              items={data.to_approach.items}
              hrefFor={(item) => `/engagement/prospects/${item.id}`}
              actionHref="/engagement/prospects?status=te_benaderen"
              actionLabel="Alle prospects bekijken"
            />
            <WorkCard
              title="Onboarding wacht"
              countText={noun(data.onboarding.count, "verkoper", "verkopers")}
              description="Onboardingtrajecten die nog wachten op een volgende stap."
              items={data.onboarding.items}
              hrefFor={(item) => `/partners/${item.id}`}
              actionHref="/partners?tab=queue"
              actionLabel="Bekijk onboarding"
            />
            <section className="flex h-full min-w-0 flex-col rounded-lg border border-wf-300 bg-white p-3">
              <h2 className="text-[11px] font-semibold uppercase tracking-wide text-wf-500">
                Communicatie
              </h2>
              <p className="mt-1 text-sm font-semibold text-wf-900">
                {noun(
                  data.communication.count,
                  "bericht in wachtrij",
                  "berichten in wachtrij"
                )}
              </p>
              <p className="mt-1 text-[11px] leading-snug text-wf-600">
                {data.communication.count === 0
                  ? "Geen items die nu aandacht nodig hebben."
                  : "Berichten die nog in behandeling zijn."}
              </p>
              {data.communication.items.length > 0 ? (
                <ul className="mt-2 space-y-1.5">
                  {data.communication.items.map((event) => {
                    const who = party(event)
                    return (
                      <li key={event.id}>
                        <Link
                          href={`/engagement/history/${event.id}`}
                          className="block min-w-0 hover:underline"
                        >
                          <span className="block truncate text-xs font-medium text-wf-900">
                            {event.template_name || "Bericht"}
                          </span>
                          {who ? (
                            <span className="block truncate text-[11px] text-wf-600">
                              {who}
                            </span>
                          ) : null}
                          <span className="block text-[11px] text-wf-700">
                            {eventStatusLabel(event.status)}
                          </span>
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              ) : null}
              <Link
                href="/engagement/history"
                className="mt-auto pt-3 text-[11px] font-medium text-wf-900 underline"
              >
                {data.communication.count === 0 ? "Bekijk lijst" : "Bekijk historie"}
              </Link>
            </section>
          </div>
          <section className="mt-3 rounded-lg border border-wf-300 bg-white p-3">
            <h2 className="text-[11px] font-semibold uppercase tracking-wide text-wf-500">
              Recente activiteit
            </h2>
            {groups.length === 0 ? (
              <p className="mt-2 text-xs text-wf-600">Nog geen recente communicatie.</p>
            ) : (
              <ul className="mt-2 divide-y divide-wf-200">
                {groups.flatMap((group) =>
                  group.items.map((event, index) => {
                    const who = party(event)
                    return (
                      <li key={event.id} className="py-2">
                        <Link
                          href={`/engagement/history/${event.id}`}
                          className="grid min-w-0 grid-cols-1 gap-0.5 desktop:grid-cols-[6.5rem_minmax(0,1.4fr)_minmax(0,1fr)_7rem] desktop:items-center desktop:gap-3"
                        >
                          <span className="text-[11px] text-wf-500">
                            {index === 0 ? group.label : ""}
                          </span>
                          <span className="truncate text-xs font-medium text-wf-900">
                            {event.template_name || "Bericht"}
                          </span>
                          <span className="truncate text-[11px] text-wf-600">
                            {who || ""}
                          </span>
                          <span className="text-[11px] text-wf-700">
                            {eventStatusLabel(event.status)}
                          </span>
                        </Link>
                      </li>
                    )
                  })
                )}
              </ul>
            )}
          </section>
        </>
      ) : null}
    </div>
  )
}
