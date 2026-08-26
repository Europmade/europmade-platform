import type { CompletenessReport } from "./completeness"

export function resolveWorkflowStatus(input: {
  publication_status: string | null
  approval_rejection_reason?: string | null
  completeness: Pick<
    CompletenessReport,
    "compliance_review_status" | "publishable" | "information_quality"
  >
  offer_paused?: boolean
}): string {
  const pub = input.publication_status
  if (pub === "Gepubliceerd") return "published"
  if (pub === "In review") return "pending_admin_approval"
  if (input.approval_rejection_reason) return "rejected"
  if (input.completeness.compliance_review_status === "pending_review")
    return "pending_evidence_review"
  if (input.offer_paused) return "paused"
  if (input.completeness.publishable) return "complete"
  if (input.completeness.information_quality === "insufficient")
    return "incomplete"
  return "concept"
}

export function resolveProductActions(row: {
  publication_status: string | null
  lifecycle_status: string
  offer: { has_offer?: boolean; sales_status?: string | null }
  offers?: { offer_count?: number; sales_status?: string | null }
  completeness: Pick<CompletenessReport, "publishable">
}) {
  const published = row.publication_status === "Gepubliceerd"
  const inReview = row.publication_status === "In review"
  const archived =
    row.lifecycle_status === "Gearchiveerd" ||
    row.lifecycle_status === "Niet meer leverbaar"
  const agg = row.offers
  const canPause =
    (agg &&
      agg.offer_count > 0 &&
      (agg.sales_status === "active" || agg.sales_status === "mixed")) ||
    (row.offer.has_offer && row.offer.sales_status === "active")
  const canResume =
    (agg &&
      agg.offer_count > 0 &&
      (agg.sales_status === "paused" || agg.sales_status === "mixed")) ||
    (row.offer.has_offer && row.offer.sales_status === "paused")

  return {
    manage: true,
    edit_information: !archived,
    manage_variants: !archived,
    manage_offer: true,
    manage_media: !archived,
    manage_changes: true,
    pause_offer: !!canPause,
    resume_offer: !!canResume,
    pause: !!canPause,
    publish: false,
    submit_for_approval:
      row.completeness.publishable && !published && !inReview && !archived,
    withdraw: published,
    manage_stock: row.offer.has_offer || (agg?.offer_count ?? 0) > 0,
    view_history: true,
    delete:
      row.publication_status === "Concept" ||
      row.publication_status === "In review" ||
      row.publication_status == null,
  }
}
