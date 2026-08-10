"use client"

import { FormEvent, Suspense, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Notice } from "@europmade/ui"
import { BuyerGate } from "../../_components/buyer-gate"
import {
  ReviewApiError,
  submitReview,
  type ReviewType,
} from "../../../_lib/review-api"
import { useStorefrontLocale } from "../../../_lib/i18n/use-storefront-locale"
import type { StorefrontLocale } from "../../../_lib/i18n/locales"
import { t, tFormat } from "../../../_lib/i18n/messages"

function parseType(raw: string | null): ReviewType | null {
  if (raw === "Productreview" || raw === "Verkopersreview") return raw
  return null
}

function reviewTypeLabel(type: string, locale: StorefrontLocale): string {
  if (type === "Productreview") return t("buyerProductReview", locale)
  if (type === "Verkopersreview") return t("buyerSellerReview", locale)
  return type
}

function NewReviewForm() {
  const locale = useStorefrontLocale()
  const router = useRouter()
  const params = useSearchParams()
  const orderLineId = params.get("order_line_id")?.trim() ?? ""
  const reviewType = useMemo(
    () => parseType(params.get("type")),
    [params]
  )
  const [score, setScore] = useState(5)
  const [text, setText] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!orderLineId || !reviewType) {
      setError(t("buyerReviewFieldsRequired", locale))
      return
    }
    setBusy(true)
    setError(null)
    try {
      await submitReview({
        order_line_id: orderLineId,
        review_type: reviewType,
        score,
        text: text.trim() || undefined,
      })
      router.push("/account/reviews")
    } catch (err: unknown) {
      setError(
        err instanceof ReviewApiError
          ? err.message
          : t("buyerReviewSubmitFailed", locale)
      )
    } finally {
      setBusy(false)
    }
  }

  const typeLabel = reviewType
    ? reviewTypeLabel(reviewType, locale)
    : null

  return (
    <BuyerGate
      breadcrumb={[
        { label: t("buyerPortalTitle", locale), href: "/account" },
        { label: t("buyerNavReviews", locale), href: "/account/reviews" },
        { label: typeLabel ?? t("buyerNewReview", locale) },
      ]}
    >
      <h1 className="text-[19px] font-bold text-wf-900">
        {typeLabel
          ? tFormat("buyerPlaceReview", locale, { type: typeLabel })
          : t("buyerWriteReview", locale)}
      </h1>
      <p className="mt-1.5 text-xs text-wf-600">
        {t("buyerReviewFormIntro", locale)}
      </p>

      {!orderLineId || !reviewType ? (
        <Notice variant="warning" className="mt-4">
          {t("buyerInvalidReviewLink", locale)}
        </Notice>
      ) : (
        <form onSubmit={onSubmit} className="mt-5 max-w-md space-y-4">
          {error ? <Notice variant="warning">{error}</Notice> : null}
          <label className="block text-xs">
            <span className="font-semibold text-wf-800">
              {t("buyerScore", locale)}
            </span>
            <select
              className="mt-1 w-full rounded-md border border-wf-400 px-3 py-2"
              value={score}
              onChange={(ev) => setScore(Number(ev.target.value))}
            >
              {[5, 4, 3, 2, 1].map((n) => (
                <option key={n} value={n}>
                  {n} / 5
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs">
            <span className="font-semibold text-wf-800">
              {t("buyerExplanation", locale)}
            </span>
            <textarea
              className="mt-1 w-full rounded-md border border-wf-400 px-3 py-2"
              rows={4}
              maxLength={5000}
              value={text}
              onChange={(ev) => setText(ev.target.value)}
              placeholder={t("buyerOptional", locale)}
            />
          </label>
          <button
            type="submit"
            disabled={busy}
            className="rounded-md bg-wf-900 px-4 py-2 text-xs font-semibold text-white hover:bg-wf-800 disabled:opacity-50"
          >
            {busy ? t("buyerBusy", locale) : t("buyerSubmitReview", locale)}
          </button>
        </form>
      )}
    </BuyerGate>
  )
}

function NewReviewFallback() {
  const locale = useStorefrontLocale()
  return (
    <BuyerGate
      breadcrumb={[
        { label: t("buyerPortalTitle", locale), href: "/account" },
        { label: t("buyerNavReviews", locale), href: "/account/reviews" },
        { label: t("loading", locale) },
      ]}
    >
      <p className="text-xs text-wf-600">{t("loading", locale)}</p>
    </BuyerGate>
  )
}

export default function NewReviewPage() {
  return (
    <Suspense fallback={<NewReviewFallback />}>
      <NewReviewForm />
    </Suspense>
  )
}
