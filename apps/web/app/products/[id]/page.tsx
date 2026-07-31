"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { Notice } from "@europmade/ui"
import {
  ReviewApiError,
  getPublicProduct,
  type ReviewView,
} from "../../_lib/review-api"

/**
 * Dunne publieke productpagina met productreviews (ADR-0027 / S3-06-03).
 */
export default function PublicProductPage() {
  const params = useParams<{ id: string }>()
  const productId = params.id
  const [title, setTitle] = useState<string | null>(null)
  const [reviews, setReviews] = useState<ReviewView[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    getPublicProduct(productId)
      .then((res) => {
        if (cancelled) return
        setTitle(res.product.title)
        setReviews(res.reviews)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(
          err instanceof ReviewApiError
            ? err.message
            : "Product laden mislukt."
        )
      })
    return () => {
      cancelled = true
    }
  }, [productId])

  return (
    <main className="mx-auto min-h-screen max-w-[720px] bg-white px-4 py-8 tablet:px-6">
      <Link href="/" className="text-xs text-wf-600 underline">
        ← EuropMade
      </Link>
      {error ? (
        <Notice variant="warning" className="mt-4">
          {error}
        </Notice>
      ) : !title ? (
        <p className="mt-6 text-xs text-wf-600">Laden…</p>
      ) : (
        <>
          <h1 className="mt-4 text-[22px] font-bold text-wf-900">{title}</h1>
          <p className="mt-1 text-xs text-wf-500">
            Productreviews (publiek). Verkopersreviews staan bij de aanbieder /
            Buy Box.
          </p>

          <h2 className="mt-8 text-sm font-bold text-wf-900">Reviews</h2>
          {reviews.length === 0 ? (
            <p className="mt-2 text-xs text-wf-600">
              Nog geen productreviews.
            </p>
          ) : (
            <ul className="mt-3 space-y-3">
              {reviews.map((r) => (
                <li
                  key={r.id}
                  className="rounded-md border border-wf-300 px-3 py-3 text-xs"
                >
                  <div className="font-semibold text-wf-900">{r.score}/5</div>
                  {r.text ? (
                    <p className="mt-1 whitespace-pre-wrap text-wf-700">
                      {r.text}
                    </p>
                  ) : (
                    <p className="mt-1 text-wf-500">Geen toelichting.</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </main>
  )
}
