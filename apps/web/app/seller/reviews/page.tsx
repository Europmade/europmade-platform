"use client"

import { useMemo, useState } from "react"
import { Badge, Button, Input } from "@europmade/ui"
import { SellerGate } from "../_components/seller-gate"
import { EmptyState } from "../_components/empty-state"
import { KpiCard } from "../_components/kpi-card"
import { DashboardSection } from "../_components/dashboard-section"
import { DEMO_REVIEWS, type DemoReview } from "../_lib/demo-data"
import { useStorefrontLocale } from "../../_lib/i18n/use-storefront-locale"
import { storefrontIntlLocale } from "../../_lib/i18n/locales"
import { t, tFormat } from "../../_lib/i18n/messages"
import { statusLabel } from "../../_lib/i18n/status-labels"

type ReviewFilter =
  | "all"
  | "unanswered"
  | "1"
  | "2"
  | "3"
  | "4"
  | "5"

export default function SellerReviewsPage() {
  const locale = useStorefrontLocale()
  const intl = storefrontIntlLocale(locale)
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
    { key: "all", label: t("commonAll", locale) },
    { key: "unanswered", label: statusLabel("Onbeantwoord", locale) },
    { key: "1", label: t("sellerReviewsStar", locale) },
    {
      key: "2",
      label: tFormat("sellerReviewsStars", locale, { count: 2 }),
    },
    {
      key: "3",
      label: tFormat("sellerReviewsStars", locale, { count: 3 }),
    },
    {
      key: "4",
      label: tFormat("sellerReviewsStars", locale, { count: 4 }),
    },
    {
      key: "5",
      label: tFormat("sellerReviewsStars", locale, { count: 5 }),
    },
  ]

  return (
    <SellerGate
      breadcrumb={[
        { label: t("sellerDashboardTitle", locale), href: "/seller" },
        { label: t("sellerNavReviews", locale) },
      ]}
    >
      <div className="mb-5">
        <h1 className="text-[19px] font-bold text-wf-900">
          {t("sellerNavReviews", locale)}
        </h1>
        <p className="mt-1.5 text-xs text-wf-600">
          {t("sellerReviewsIntro", locale)}
        </p>
      </div>

      {replyNote ? (
        <p className="mb-4 text-xs text-wf-600">{replyNote}</p>
      ) : null}

      <DashboardSection title={t("commonSummary", locale)} wrapChildren={false}>
        <div className="mt-2 grid grid-cols-1 gap-4 tablet:grid-cols-3">
          <KpiCard
            value={String(reviews.length)}
            label={t("sellerReviewsTotal", locale)}
            source="api"
          />
          <KpiCard
            value={average == null ? "—" : String(average)}
            label={t("sellerReviewsAverage", locale)}
            source="api"
          />
          <KpiCard
            value={String(unanswered)}
            label={t("sellerReviewsAwaitingReply", locale)}
            source="api"
          />
        </div>
      </DashboardSection>

      <div className="mb-4">
        <Input
          label={t("commonSearch", locale)}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("sellerReviewsSearchPlaceholder", locale)}
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
          title={t("sellerReviewsEmptyTitle", locale)}
          description={t("sellerReviewsEmptyDesc", locale)}
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={t("commonEmptyFilter", locale)}
          description={t("commonEmptyFilterHint", locale)}
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
                    {created.toLocaleDateString(intl)}
                  </span>
                  <Badge>
                    {statusLabel(
                      r.answered ? "Beantwoord" : "Onbeantwoord",
                      locale
                    )}
                  </Badge>
                </div>
                <p className="mt-2 text-[11.5px] font-semibold text-wf-700">
                  {r.product_title}
                </p>
                <p className="mt-2 text-xs leading-relaxed text-wf-800">
                  {r.text}
                </p>
                {r.answered && r.reply ? (
                  <p className="mt-3 border-l-2 border-wf-300 pl-3 text-[11.5px] leading-relaxed text-wf-600">
                    {tFormat("sellerReviewsYourReply", locale, {
                      reply: r.reply,
                    })}
                  </p>
                ) : (
                  <div className="mt-4 grid gap-3 tablet:grid-cols-[1fr_auto] tablet:items-end">
                    <Input
                      label={t("sellerReviewsReplyLabel", locale)}
                      value={replyDrafts[r.id] ?? ""}
                      onChange={(e) =>
                        setReplyDrafts((prev) => ({
                          ...prev,
                          [r.id]: e.target.value,
                        }))
                      }
                      placeholder={t("sellerReviewsReplyPlaceholder", locale)}
                    />
                    <Button
                      type="button"
                      onClick={() =>
                        setReplyNote(t("sellerReviewsReplySaved", locale))
                      }
                    >
                      {t("sellerReviewsReplyAction", locale)}
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
