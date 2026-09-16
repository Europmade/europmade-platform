"use client"

import { useEffect, useState } from "react"
import { Button, Notice } from "@europmade/ui"
import {
  ProductApprovalAdminApiError,
  decideProductApproval,
  saveSectionReview,
  type SectionReviewKey,
  type SectionReviewRow,
  type SectionReviewStatus,
} from "../../lib/product-approval-admin-api"

const STATUS_BTN: Array<{
  status: Exclude<SectionReviewStatus, "unreviewed">
  label: string
}> = [
  { status: "ok", label: "Goed" },
  { status: "needs_info", label: "Aanvulling" },
  { status: "rejected", label: "Afwijzen" },
]

export function sectionReviewStatusLabel(status: SectionReviewStatus) {
  if (status === "ok") return "Goed"
  if (status === "needs_info") return "Aanvulling"
  if (status === "rejected") return "Afgewezen"
  return "Nog niet beoordeeld"
}

export function findSectionReview(
  rows: SectionReviewRow[],
  key: SectionReviewKey
): SectionReviewRow | undefined {
  return rows.find((r) => r.section_key === key)
}

type ControlsProps = {
  productId: string
  sectionKey: SectionReviewKey
  review: SectionReviewRow | undefined
  onSaved: () => Promise<void>
}

/** Compact review controls — place directly under section content. */
export function SectionReviewControls({
  productId,
  sectionKey,
  review,
  onSaved,
}: ControlsProps) {
  const [status, setStatus] = useState<SectionReviewStatus>(
    review?.status ?? "unreviewed"
  )
  const [comment, setComment] = useState(review?.comment || "")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedHint, setSavedHint] = useState<string | null>(null)

  useEffect(() => {
    setStatus(review?.status ?? "unreviewed")
    setComment(review?.comment || "")
  }, [review?.status, review?.comment, review?.decided_at, review?.id])

  async function save() {
    if (
      (status === "needs_info" || status === "rejected") &&
      !comment.trim()
    ) {
      setError(
        `Opmerking is verplicht bij ${status === "needs_info" ? "Aanvulling" : "Afwijzen"}.`
      )
      return
    }
    if (status === "unreviewed") {
      setError("Kies Goed, Aanvulling of Afwijzen voordat je opslaat.")
      return
    }
    setBusy(true)
    setError(null)
    setSavedHint(null)
    try {
      await saveSectionReview(productId, {
        section_key: sectionKey,
        status,
        comment: comment.trim() || null,
      })
      setSavedHint("Beoordeling opgeslagen.")
      await onSaved()
    } catch (err) {
      setError(
        err instanceof ProductApprovalAdminApiError
          ? err.message
          : "Beoordeling opslaan mislukt."
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mt-4 border-t border-wf-200 pt-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-wf-500">
          Beoordeling
        </p>
        <span className="text-[11px] font-medium text-wf-700">
          {sectionReviewStatusLabel(status)}
        </span>
      </div>
      {review?.decided_at ? (
        <p className="mb-2 text-[10px] text-wf-500">
          Laatst opgeslagen: {new Date(review.decided_at).toLocaleString("nl-NL")}
          {review.decided_by ? ` · ${review.decided_by}` : ""}
        </p>
      ) : null}
      {error ? (
        <Notice variant="warning" className="mb-2">
          {error}
        </Notice>
      ) : null}
      {savedHint ? (
        <Notice variant="info" className="mb-2">
          {savedHint}
        </Notice>
      ) : null}
      <div className="mb-2 flex flex-wrap gap-2">
        {STATUS_BTN.map((btn) => (
          <Button
            key={btn.status}
            size="sm"
            variant={status === btn.status ? "primary" : "secondary"}
            disabled={busy}
            onClick={() => setStatus(btn.status)}
          >
            {btn.label}
          </Button>
        ))}
      </div>
      <label className="mb-1 block text-[11px] font-semibold text-wf-500">
        Opmerking
      </label>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Wat ontbreekt of wat is gecontroleerd?"
        className="mb-2 min-h-[56px] w-full rounded border border-wf-400 px-3 py-2 text-xs"
      />
      <Button size="sm" disabled={busy} onClick={() => void save()}>
        {busy ? "Opslaan…" : "Opslaan beoordeling"}
      </Button>
    </div>
  )
}

type EndProps = {
  productId: string
  sectionReviews: SectionReviewRow[]
  approvalActions: {
    approve: boolean
    reject: boolean
    request_info: boolean
    request_info_reason: string
  }
  publishable: boolean
  publicationStatusLabel: string | null
  adminReviewOutcome: string | null | undefined
  sellerFeedback: string | null | undefined
  blockedReasons: string[]
  onChanged: () => Promise<void>
}

/** Eindbeoordeling onderaan de volledige productweergave. */
export function ProductEndReviewBlock({
  productId,
  sectionReviews,
  approvalActions,
  publishable,
  publicationStatusLabel,
  adminReviewOutcome,
  sellerFeedback,
  blockedReasons,
  onChanged,
}: EndProps) {
  const [endBusy, setEndBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [endReason, setEndReason] = useState("")

  async function endDecision(
    decision: "approved" | "rejected" | "request_info"
  ) {
    setEndBusy(true)
    setError(null)
    setSuccess(null)
    try {
      await decideProductApproval(productId, {
        decision,
        reason: endReason.trim() || undefined,
      })
      setEndReason("")
      setSuccess(
        decision === "approved"
          ? "Product goedgekeurd (publicatie volgens bestaande regels)."
          : decision === "request_info"
            ? "Aanvulling gevraagd — feedback is opgeslagen voor de seller."
            : "Product afgewezen."
      )
      await onChanged()
    } catch (err) {
      setError(
        err instanceof ProductApprovalAdminApiError
          ? err.message
          : "Eindbeslissing mislukt."
      )
    } finally {
      setEndBusy(false)
    }
  }

  const outcomeLabel =
    adminReviewOutcome === "needs_info"
      ? "Aanvulling gevraagd"
      : adminReviewOutcome === "approved"
        ? "Goedgekeurd"
        : adminReviewOutcome === "rejected"
          ? "Afgewezen"
          : "Nog geen eindbeslissing"

  return (
    <div className="rounded-lg border border-wf-300 bg-white p-5">
      <h2 className="text-sm font-bold uppercase tracking-wide text-wf-900">
        Eindstatus product
      </h2>
      <p className="mt-1 text-xs text-wf-600">
        Op basis van de sectiebeoordelingen hierboven. Publicatie blijft
        afhankelijk van bestaande approval- en compliance-gates.
      </p>

      <div className="mt-3 grid gap-2 text-xs tablet:grid-cols-2">
        <div>
          <span className="text-wf-500">Publicatie: </span>
          <span className="font-medium text-wf-800">
            {publicationStatusLabel || "—"}
          </span>
        </div>
        <div>
          <span className="text-wf-500">Publiceerbaar: </span>
          <span className="font-medium text-wf-800">
            {publishable ? "ja" : "nee"}
          </span>
        </div>
        <div>
          <span className="text-wf-500">Einduitkomst: </span>
          <span className="font-medium text-wf-800">{outcomeLabel}</span>
        </div>
      </div>

      {sellerFeedback ? (
        <div className="mt-3 rounded border border-wf-200 bg-wf-50 p-3 text-xs text-wf-800">
          <p className="mb-1 font-semibold text-wf-700">Feedback aan seller</p>
          <p className="whitespace-pre-wrap">{sellerFeedback}</p>
        </div>
      ) : null}

      <ul className="mt-3 space-y-1 text-xs text-wf-800">
        {sectionReviews.map((s) => (
          <li key={s.section_key} className="flex justify-between gap-3">
            <span>{s.label_nl}</span>
            <span className="font-medium">
              {sectionReviewStatusLabel(s.status)}
            </span>
          </li>
        ))}
      </ul>

      {blockedReasons.length > 0 ? (
        <ul className="mt-3 list-disc pl-4 text-[11px] text-red-800">
          {blockedReasons.slice(0, 6).map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
      ) : null}

      {error ? (
        <Notice variant="warning" className="mt-3">
          {error}
        </Notice>
      ) : null}
      {success ? (
        <Notice variant="info" className="mt-3">
          {success}
        </Notice>
      ) : null}

      <textarea
        value={endReason}
        onChange={(e) => setEndReason(e.target.value)}
        placeholder="Optionele toelichting bij eindbeslissing"
        className="mt-3 min-h-[56px] w-full rounded border border-wf-400 px-3 py-2 text-xs"
      />
      <div className="mt-3 flex flex-col gap-2 tablet:flex-row">
        <Button
          disabled={endBusy || !approvalActions.approve}
          title={
            approvalActions.approve
              ? undefined
              : "Vereist: In beoordeling + alle onderdelen akkoord + compliance publiceerbaar"
          }
          onClick={() => void endDecision("approved")}
        >
          Goedkeuren product
        </Button>
        <Button
          variant="secondary"
          disabled={endBusy || !approvalActions.request_info}
          title={
            approvalActions.request_info
              ? undefined
              : approvalActions.request_info_reason
          }
          onClick={() => void endDecision("request_info")}
        >
          Aanvulling vragen
        </Button>
        <Button
          variant="destructive"
          disabled={endBusy || !approvalActions.reject}
          onClick={() => void endDecision("rejected")}
        >
          Afwijzen product
        </Button>
      </div>
    </div>
  )
}
