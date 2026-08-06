"use client"

import { useMemo, useState } from "react"
import { Badge, Button, Input } from "@europmade/ui"
import { SellerGate } from "../_components/seller-gate"
import { EmptyState } from "../_components/empty-state"
import { KpiCard } from "../_components/kpi-card"
import { DashboardSection } from "../_components/dashboard-section"
import { DEMO_REVIEWS, type DemoReview } from "../_lib/demo-data"

type ReviewFilter =
  | "all"
  | "unanswered"
  | "1"
  | "2"
  | "3"
  | "4"
  | "5"

export default function SellerReviewsPage() {
  const [reviews] = useState<DemoReview[]>(DEMO_REVIEWS)
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState<ReviewFilter>("all")
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({})
  const [replyNote, setReplyNote] = useState<string | null>(null)

  const average = useMemo(() => {
    if (reviews.length === 0) return null
    const sum = reviews.reduce((acc, r) => acc + r.score, 0)
    return Math.round((sum / reviews.length) * 10) / 10
  }, [reviews])

  const unanswered = reviews.filter((r) => !r.answered).length

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return reviews.filter((r) => {
      if (filter === "unanswered" && r.answered) return false
      if (
        filter !== "all" &&
        filter !== "unanswered" &&
        String(r.score) !== filter
      )
        return false
      if (!q) return true
      return [r.text, r.product_title, String(r.score)]
        .join(" ")
        .toLowerCase()
        .includes(q)
    })
  }, [reviews, query, filter])

  const filterButtons: Array<{ key: ReviewFilter; label: string }> = [
    { key: "all", label: "Alle" },
    { key: "unanswered", label: "Onbeantwoord" },
    { key: "1", label: "1 ster" },
    { key: "2", label: "2 sterren" },
    { key: "3", label: "3 sterren" },
    { key: "4", label: "4 sterren" },
    { key: "5", label: "5 sterren" },
  ]

  return (
    <SellerGate
      breadcrumb={[
        { label: "Seller Dashboard", href: "/seller" },
        { label: "Reviews" },
      ]}
    >
      <div className="mb-5">
        <h1 className="text-[19px] font-bold text-wf-900">Reviews</h1>
        <p className="mt-1.5 text-xs text-wf-600">
          Filter op onbeantwoord en sterren. Beantwoord reviews vanuit dit
          overzicht.
        </p>
      </div>

      {replyNote ? (
        <p className="mb-4 text-xs text-wf-600">{replyNote}</p>
      ) : null}

      <DashboardSection title="Samenvatting" wrapChildren={false}>
        <div className="mt-2 grid grid-cols-1 gap-4 tablet:grid-cols-3">
          <KpiCard
            value={String(reviews.length)}
            label="Totaal reviews"
            source="api"
          />
          <KpiCard
            value={average == null ? "—" : String(average)}
            label="Gemiddelde score"
            source="api"
          />
          <KpiCard
            value={String(unanswered)}
            label="Wachten op reactie"
            source="api"
          />
        </div>
      </DashboardSection>

      <div className="mb-4">
        <Input
          label="Zoeken"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Zoek in tekst of product…"
        />
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {filterButtons.map((btn) => (
          <button
            key={btn.key}
            type="button"
            onClick={() => setFilter(btn.key)}
            className={`rounded-md border px-3 py-1.5 text-xs ${
              filter === btn.key
                ? "border-wf-900 bg-wf-900 font-semibold text-white"
                : "border-wf-400 bg-white text-wf-700"
            }`}
          >
            {btn.label}
          </button>
        ))}
      </div>

      {reviews.length === 0 ? (
        <EmptyState
          title="Geen reviews"
          description="Zodra klanten reviews achterlaten, verschijnen ze hier."
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="Geen resultaten"
          description="Pas je filters of zoekopdracht aan."
        />
      ) : (
        <div className="space-y-4">
          {filtered.map((r) => {
            const created = new Date(r.created_at)
            return (
              <div
                key={r.id}
                className="rounded-lg border border-wf-300 bg-white px-5 py-5"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{r.score}/5</Badge>
                  <span className="text-[11px] text-wf-500">
                    {created.toLocaleDateString("nl-NL")}
                  </span>
                  <Badge>{r.answered ? "Beantwoord" : "Onbeantwoord"}</Badge>
                </div>
                <p className="mt-2 text-[11.5px] font-semibold text-wf-700">
                  {r.product_title}
                </p>
                <p className="mt-2 text-xs leading-relaxed text-wf-800">
                  {r.text}
                </p>
                {r.answered && r.reply ? (
                  <p className="mt-3 border-l-2 border-wf-300 pl-3 text-[11.5px] leading-relaxed text-wf-600">
                    Jouw reactie: {r.reply}
                  </p>
                ) : (
                  <div className="mt-4 grid gap-3 tablet:grid-cols-[1fr_auto] tablet:items-end">
                    <Input
                      label="Jouw reactie"
                      value={replyDrafts[r.id] ?? ""}
                      onChange={(e) =>
                        setReplyDrafts((prev) => ({
                          ...prev,
                          [r.id]: e.target.value,
                        }))
                      }
                      placeholder="Schrijf een reactie…"
                    />
                    <Button
                      type="button"
                      onClick={() =>
                        setReplyNote("Reactie opgeslagen (demo).")
                      }
                    >
                      Beantwoorden
                    </Button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </SellerGate>
  )
}
