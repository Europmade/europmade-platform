/**
 * Compliance document gates + file pre-check (no AI / no auto-approval).
 */

export const EVIDENCE_KINDS = [
  "made_in_europe",
  "ce_marking",
  "data_usage",
] as const

export type EvidenceKind = (typeof EVIDENCE_KINDS)[number]

export type ReviewStatus =
  | "missing"
  | "pending_review"
  | "precheck_warning"
  | "needs_info"
  | "approved"
  | "rejected"

export type ComplianceDocumentGate = {
  code: string
  name: string
  kind: EvidenceKind
  required: boolean
  present: boolean
  status: ReviewStatus
  rejection_reason: string | null
  precheck_result: "PASS" | "WARNING" | "FAIL" | null
}

export type EvidenceRow = {
  evidence_kind?: string | null
  verification_status?: string | null
  verification_notes?: string | null
  verification_result?: string | null
  file_size_bytes?: number | null
  mime_type?: string | null
  storage_reference?: string | null
}

export function isEvidenceKind(value: string | null | undefined): value is EvidenceKind {
  return !!value && (EVIDENCE_KINDS as readonly string[]).includes(value)
}

export function evidenceKindOf(row: EvidenceRow): EvidenceKind {
  return isEvidenceKind(row.evidence_kind) ? row.evidence_kind : "made_in_europe"
}

/**
 * Deterministic file pre-check. Not a legal decision and not AI.
 */
export function filePrecheck(input: {
  storage_reference?: string | null
  mime_type?: string | null
  file_size_bytes?: number | null
  kind: EvidenceKind
}): { result: "PASS" | "WARNING" | "FAIL"; notes: string } {
  const ref = (input.storage_reference || "").trim()
  if (!ref) {
    return { result: "FAIL", notes: "Geen bestand of verwijzing." }
  }
  const size = input.file_size_bytes ?? 0
  if (size <= 0 && !/^https?:\/\//i.test(ref)) {
    return { result: "FAIL", notes: "Bestand is leeg." }
  }
  const mime = (input.mime_type || "").toLowerCase()
  const imageOk = ["image/jpeg", "image/png", "image/webp"].includes(mime)
  const pdfOk = mime === "application/pdf"
  if (input.kind === "data_usage") {
    if (mime && !pdfOk) {
      return { result: "FAIL", notes: "Datagebruikdocument moet PDF zijn." }
    }
  } else if (mime && !imageOk && !pdfOk) {
    return { result: "FAIL", notes: "Toegestaan: JPG, PNG, WebP of PDF." }
  }
  if (size > 0 && size < 1024) {
    return {
      result: "WARNING",
      notes: "Bestand is erg klein; controleer of het leesbaar bewijs is.",
    }
  }
  return {
    result: "PASS",
    notes:
      "Bestand aanwezig en type/omvang lijken in orde. Dit is geen juridische goedkeuring.",
  }
}

export type CompletenessDocumentInput = {
  code: string
  name: string
  required: boolean
  present: boolean
  status: ReviewStatus
  rejection_reason?: string | null
}

export function isPdfEvidence(row: EvidenceRow): boolean {
  const mime = (row.mime_type || "").toLowerCase()
  const ref = (row.storage_reference || "").toLowerCase()
  return mime === "application/pdf" || ref.includes(".pdf")
}

/**
 * Exact kind match. One physical file can still cover CE + Made in Europe when
 * the upload registers both kinds (two evidence rows / evidence_kinds[]).
 * Datagebruik blijft altijd een apart PDF-document.
 */
export function coveringRowsForKind(
  rows: EvidenceRow[],
  kind: EvidenceKind
): EvidenceRow[] {
  const active = rows.filter((r) => r.verification_status !== "superseded")
  return active.filter((r) => evidenceKindOf(r) === kind)
}

export function summarizeEvidenceKind(
  rows: EvidenceRow[],
  kind: EvidenceKind,
  required: boolean,
  name: string
): ComplianceDocumentGate {
  const active = coveringRowsForKind(rows, kind)
  const approved = active.find((r) => r.verification_status === "approved")
  const pending = active.find(
    (r) =>
      r.verification_status === "pending" ||
      r.verification_status === "pending_review"
  )
  const needsInfo = active.find((r) => r.verification_status === "needs_info")
  const rejected = active.find((r) => r.verification_status === "rejected")
  const warning = active.find(
    (r) =>
      (r.verification_result || "").toUpperCase() === "WARNING" ||
      (r.verification_result || "").toUpperCase() === "FAIL"
  )

  let status: ReviewStatus = "missing"
  // New uploads (pending) reopen review even if older rows are needs_info/rejected.
  if (approved) status = "approved"
  else if (pending && warning) status = "precheck_warning"
  else if (pending) status = "pending_review"
  else if (needsInfo) status = "needs_info"
  else if (rejected) status = "rejected"

  const present = active.length > 0 && status !== "missing"
  const rejection_reason =
    status === "needs_info"
      ? needsInfo?.verification_notes?.trim() ||
        "Aanvulling gevraagd door EuropMade."
      : status === "rejected"
        ? rejected?.verification_notes?.trim() || "Afgekeurd door EuropMade."
        : null

  return {
    code: `doc.${kind}`,
    name,
    kind,
    required,
    present,
    status: present ? status : "missing",
    rejection_reason,
    precheck_result: pending
      ? ((pending.verification_result as "PASS" | "WARNING" | "FAIL") ?? null)
      : approved
        ? ((approved.verification_result as "PASS" | "WARNING" | "FAIL") ?? null)
        : null,
  }
}

export function buildDocumentInputs(opts: {
  mieClaimed: boolean
  ceValue: string | null
  collectsData: string | null
  ceRequiredForCategory: boolean
  evidence: EvidenceRow[]
}): CompletenessDocumentInput[] {
  const needsCe = opts.ceValue === "Zichtbaar"
  const needsData = opts.collectsData === "Ja"
  const hasMieEvidence = coveringRowsForKind(opts.evidence, "made_in_europe").length > 0
  const docs: CompletenessDocumentInput[] = []
  if (opts.mieClaimed || hasMieEvidence) {
    docs.push(
      summarizeEvidenceKind(
        opts.evidence,
        "made_in_europe",
        true,
        "Made in Europe-bewijs"
      )
    )
  }
  if (needsCe) {
    docs.push(
      summarizeEvidenceKind(opts.evidence, "ce_marking", true, "CE-bewijs")
    )
  }
  if (needsData) {
    docs.push(
      summarizeEvidenceKind(
        opts.evidence,
        "data_usage",
        true,
        "Informatie datagebruik document"
      )
    )
  }
  return docs
}
