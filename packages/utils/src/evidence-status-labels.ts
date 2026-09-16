/** Central Dutch labels for compliance / evidence review statuses. */

export type EvidenceReviewStatus =
  | "missing"
  | "pending_review"
  | "pending_evidence_review"
  | "precheck_warning"
  | "approved"
  | "rejected"
  | "not_required"
  | string

const LABELS_NL: Record<string, string> = {
  missing: "Bewijs ontbreekt",
  pending_review: "In beoordeling",
  pending_evidence_review: "In beoordeling",
  precheck_warning: "In beoordeling",
  approved: "Goedgekeurd",
  rejected: "Afgekeurd",
  not_required: "Niet vereist",
  needs_info: "Aanvulling gevraagd",
  request_info: "Aanvulling gevraagd",
}

export function evidenceStatusLabelNl(
  status: EvidenceReviewStatus | null | undefined
): string {
  if (!status) return "—"
  const key = String(status).trim().toLowerCase()
  return LABELS_NL[key] || status
}

export function complianceReviewStatusLabelNl(
  status: EvidenceReviewStatus | null | undefined
): string {
  return evidenceStatusLabelNl(status)
}
