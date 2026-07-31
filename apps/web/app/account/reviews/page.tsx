"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Notice } from "@europmade/ui"
import { BuyerGate } from "../_components/buyer-gate"
import {
  ReviewApiError,
  listEligibleReviews,
  listMyReviews,
  type EligibleLine,
  type ReviewView,
} from "../../_lib/review-api"

export default function BuyerReviewsPage() {
  const [eligible, setEligible] = useState<EligibleLine[]>([])
  const [mine, setMine] = useState<ReviewView[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([listEligibleReviews(), listMyReviews()])
      .then(([e, m]) => {
        if (cancelled) return
        setEligible(e.eligible)
        setMine(m.reviews)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(
          err instanceof ReviewApiError
            ? err.message
            : "Reviews laden mislukt."
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
        { label: "Reviews" },
      ]}
    >
      <h1 className="text-[19px] font-bold text-wf-900">Reviews</h1>
      <p className="mt-1.5 text-xs text-wf-600">
        Plaats een productreview en/of verkopersreview na aankoop. Beide typen
        zijn strikt gescheiden.
      </p>

      {error ? <Notice variant="warning" className="mt-4">{error}</Notice> : null}

      <h2 className="mt-6 text-sm font-bold text-wf-900">Te reviewen</h2>
      {eligible.length === 0 ? (
        <p className="mt-2 text-xs text-wf-600">
          Geen openstaande reviewmogelijkheden.
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-wf-200 rounded-md border border-wf-300">
          {eligible.map((line) => (
            <li
              key={line.order_line_id}
              className="flex flex-wrap items-center justify-between gap-3 px-3 py-3 text-xs"
            >
              <div>
                <div className="font-medium text-wf-900">
                  Order #{line.order_number}
                </div>
                <div className="mt-0.5 text-wf-600">
                  Offer {line.offer_id}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {line.can_product_review ? (
                  <Link
                    href={`/account/reviews/new?order_line_id=${line.order_line_id}&type=Productreview`}
                    className="rounded-md bg-wf-900 px-3 py-1.5 font-semibold text-white hover:bg-wf-800"
                  >
                    Productreview
                  </Link>
                ) : null}
                {line.can_seller_review ? (
                  <Link
                    href={`/account/reviews/new?order_line_id=${line.order_line_id}&type=Verkopersreview`}
                    className="rounded-md border border-wf-400 px-3 py-1.5 font-semibold text-wf-900 hover:bg-wf-100"
                  >
                    Verkopersreview
                  </Link>
                ) : null}
                {line.product_id ? (
                  <Link
                    href={`/products/${line.product_id}`}
                    className="px-2 py-1.5 text-wf-700 underline"
                  >
                    Product bekijken
                  </Link>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}

      <h2 className="mt-8 text-sm font-bold text-wf-900">Mijn reviews</h2>
      {mine.length === 0 ? (
        <p className="mt-2 text-xs text-wf-600">Nog geen reviews geplaatst.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {mine.map((r) => (
            <li
              key={r.id}
              className="rounded-md border border-wf-300 px-3 py-3 text-xs"
            >
              <div className="font-semibold text-wf-900">
                {r.review_type} · {r.score}/5
              </div>
              {r.text ? (
                <p className="mt-1 whitespace-pre-wrap text-wf-700">{r.text}</p>
              ) : null}
              {r.product_id ? (
                <Link
                  href={`/products/${r.product_id}`}
                  className="mt-2 inline-block underline"
                >
                  Naar product
                </Link>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </BuyerGate>
  )
}
