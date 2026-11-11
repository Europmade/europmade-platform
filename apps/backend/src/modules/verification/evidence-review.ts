/**
 * Shared compliance evidence decision.
 * Evidence status stays independent of product origin and the Made in Europe score.
 */

export type EvidenceReviewDecision = "approved" | "rejected" | "needs_info"

export class EvidenceReviewRejected extends Error {
  constructor(message: string) {
    super(message)
    this.name = "EvidenceReviewRejected"
  }
}

export type EvidenceReviewPlan = {
  verification_status: EvidenceReviewDecision
  verification_notes: string
  verified_by: string
  verification_method: "human_review"
  field_code: string
  field_label: string
  field_status: "approved" | "rejected" | "pending"
  new_value: string
  updates_origin: false
  updates_score: false
}

export function planEvidenceReview(input: {
  status: EvidenceReviewDecision
  reason?: string | null
  actor_id?: string | null
  uploaded_by_customer_id?: string | null
}): EvidenceReviewPlan {
  const actor = input.actor_id?.trim() || ""
  if (!actor) {
    throw new EvidenceReviewRejected(
      "Alleen een bevoegde admin kan bewijs beoordelen."
    )
  }
  if (
    input.uploaded_by_customer_id &&
    input.uploaded_by_customer_id === actor
  ) {
    throw new EvidenceReviewRejected(
      "Een seller mag eigen bewijs niet goedkeuren."
    )
  }
  const reason = input.reason?.trim() || ""
  if (input.status === "rejected" && !reason) {
    throw new EvidenceReviewRejected("Bij afwijzen is een reden verplicht.")
  }
  if (input.status === "needs_info" && !reason) {
    throw new EvidenceReviewRejected(
      "Bij aanvullend bewijs is een toelichting verplicht."
    )
  }

  const notes =
    reason ||
    (input.status === "approved" ? "Goedgekeurd door EuropMade" : "")

  const field =
    input.status === "approved"
      ? {
          field_code: "compliance.approved",
          field_label: "Compliance goedgekeurd",
          field_status: "approved" as const,
        }
      : input.status === "rejected"
        ? {
            field_code: "compliance.rejected",
            field_label: "Compliance afgekeurd",
            field_status: "rejected" as const,
          }
        : {
            field_code: "compliance.needs_info",
            field_label: "Aanvullend bewijs gevraagd",
            field_status: "pending" as const,
          }

  return {
    verification_status: input.status,
    verification_notes: notes,
    verified_by: actor,
    verification_method: "human_review",
    new_value: reason || input.status,
    updates_origin: false,
    updates_score: false,
    ...field,
  }
}

export type EvidenceSummaryStatus =
  | "missing"
  | "pending_review"
  | "needs_info"
  | "approved"
  | "rejected"

/** Evidence summary only. Origin status and score are returned unchanged. */
export function summarizeProductEvidence(input: {
  statuses: string[]
  score_qualifies: boolean
  origin_status: string | null
  score: number | null
}): {
  evidence_status: EvidenceSummaryStatus
  is_made_in_europe_score: boolean
  is_made_in_europe_verified: boolean
  origin_status: string | null
  score: number | null
} {
  const active = input.statuses.filter((status) => status !== "superseded")
  const hasApproved = active.includes("approved")
  const hasPending = active.some(
    (status) => status === "pending" || status === "pending_review"
  )
  const hasNeedsInfo = active.includes("needs_info")
  const hasRejected = active.includes("rejected")
  let evidence_status: EvidenceSummaryStatus = "missing"
  if (hasApproved) evidence_status = "approved"
  else if (hasPending) evidence_status = "pending_review"
  else if (hasNeedsInfo) evidence_status = "needs_info"
  else if (hasRejected) evidence_status = "rejected"
  return {
    evidence_status,
    is_made_in_europe_score: input.score_qualifies,
    is_made_in_europe_verified: input.score_qualifies && hasApproved,
    origin_status: input.origin_status,
    score: input.score,
  }
}
