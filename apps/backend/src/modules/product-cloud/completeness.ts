/**
 * Product information completeness + publishability (managed rules, not AI).
 */

import type { RequirementTier } from "./category-attributes"
import { isConceptDraftIdentifier } from "./concept-identifier"
import { normalizeGtinDigits } from "./gtin-validation"

function isCatalogEanFilled(value: string | null | undefined): boolean {
  if (!value?.trim()) return false
  if (isConceptDraftIdentifier("IMPORT_REF", value, null)) return false
  return /^\d{8}$|^\d{12,14}$/.test(normalizeGtinDigits(value))
}

export type CompletenessField = {
  code: string
  name: string
  tier: RequirementTier
  filled: boolean
  value?: string | null
  group: "basis" | "category" | "compliance" | "recommended" | "optional"
}

export type CompletenessSection = {
  key: string
  label: string
  filled: number
  total: number
  fields: CompletenessField[]
}

/** Product-informatie kwaliteit (≠ offer sales_status, ≠ publishable). */
export type InformationQuality = "insufficient" | "sufficient" | "complete"

export type ComplianceReviewStatus =
  | "missing"
  | "pending_review"
  | "precheck_warning"
  | "needs_info"
  | "approved"
  | "rejected"
  | "not_required"

export type ProductGateStatus =
  | "not_sellable"
  | "ready_for_review"
  | "in_review"
  | "publishable"
  | "published"

export type SalePresentation =
  | "for_sale"
  | "blocked"
  | "paused"
  | "no_offer"
  | "not_published"

export type CompletenessDocument = {
  code: string
  name: string
  required: boolean
  present: boolean
  status: ComplianceReviewStatus
  rejection_reason?: string | null
}

export type ValidationCategory =
  | "submission"
  | "approval"
  | "publication"
  | "sale"
  | "warning"

export type ProductValidationFinding = {
  code: string
  field: string
  category: ValidationCategory
  /** Gates this one finding blocks. Sale gaps are not approval or publication. */
  blocks: ValidationCategory[]
  severity: "blocker" | "warning"
  message: string
  action: string
  status: "open"
}

export type CompletenessReport = {
  percent: number
  publishable: boolean
  /** Onvoldoende / Voldoende / Compleet — optionele velden blokkeren publishable niet. */
  information_quality: InformationQuality
  publication_blocked_reasons: string[]
  sale_blocked_reasons: string[]
  findings: ProductValidationFinding[]
  sections: CompletenessSection[]
  compliance_status:
    | "complete"
    | "incomplete"
    | "non_compliant"
    | "not_applicable"
    | "pending_review"
    | "rejected"
  compliance_review_status: ComplianceReviewStatus
  product_gate_status: ProductGateStatus
  sale_presentation: SalePresentation
  documents: CompletenessDocument[]
  missing_required: Array<{ code: string; name: string; group: string }>
}

export type BasisInput = {
  title: string | null | undefined
  brand_id: string | null | undefined
  manufacturer_id: string | null | undefined
  category_names: string[]
  identifier_value: string | null | undefined
  has_primary_image: boolean
}

export type AttributeInput = {
  code: string
  name: string
  tier: RequirementTier
  value: string | null | undefined
}

export type OfferGateInput = {
  has_offer: boolean
  has_price: boolean
  has_stock_configured: boolean
  has_delivery: boolean
  has_shipping_profile?: boolean
  sales_status?: "active" | "paused" | "mixed" | null
  is_sellable?: boolean
  sellability_reasons?: string[]
}

export type CompletenessRulesInput = {
  ce_required_for_category?: boolean
  mie_claimed?: boolean
  publication_status?: string | null
  /** EuropMade: known non-EU manufacturer blocks publication. */
  manufacturer_outside_eu?: boolean
}

export type CompletenessDocumentInput = {
  code: string
  name: string
  required: boolean
  present: boolean
  status: ComplianceReviewStatus
  rejection_reason?: string | null
}

function isFilled(value: string | null | undefined): boolean {
  if (typeof value !== "string") return false
  const trimmed = value.trim()
  if (!trimmed || trimmed === "[]") return false
  return true
}

function attrValue(
  attributes: AttributeInput[],
  code: string
): string | null {
  const row = attributes.find((a) => a.code === code)
  return row?.value?.trim() || null
}

function sectionFromFields(
  key: string,
  label: string,
  fields: CompletenessField[]
): CompletenessSection {
  const total = fields.length
  const filled = fields.filter((f) => f.filled).length
  return { key, label, filled, total, fields }
}

/**
 * Compute completeness. Publishable requires basis + all category_required +
 * all compliance_required + primary image + offer gates + approved documents
 * where a document is required. Field fill never auto-approves compliance.
 */
export function computeProductCompleteness(input: {
  basis: BasisInput
  attributes: AttributeInput[]
  offer?: OfferGateInput | null
  rules?: CompletenessRulesInput | null
  /** Compliance evidence documents (MiE / CE / data). */
  documents?: CompletenessDocumentInput[] | null
  /**
   * Locale translation gates (title/description per target language).
   * Affects publishable only — never compliance_review_status.
   */
  translation_documents?: CompletenessDocumentInput[] | null
}): CompletenessReport {
  const basisFields: CompletenessField[] = [
    {
      code: "ean",
      name: "EAN / GTIN",
      tier: "category_required",
      filled: isCatalogEanFilled(input.basis.identifier_value),
      value: input.basis.identifier_value,
      group: "basis",
    },
    {
      code: "title",
      name: "Productnaam",
      tier: "category_required",
      filled: isFilled(input.basis.title),
      value: input.basis.title,
      group: "basis",
    },
    {
      code: "brand_id",
      name: "Merk",
      tier: "category_required",
      filled: isFilled(input.basis.brand_id),
      value: input.basis.brand_id,
      group: "basis",
    },
    {
      code: "category",
      name: "Categorie",
      tier: "category_required",
      filled: input.basis.category_names.length > 0,
      value: input.basis.category_names.join(", "),
      group: "basis",
    },
    {
      code: "primary_image",
      name: "Hoofdafbeelding",
      tier: "category_required",
      filled: input.basis.has_primary_image,
      group: "basis",
    },
    {
      code: "manufacturer_id",
      name: "Fabrikant / verantwoordelijke fabrikant",
      tier: "compliance_required",
      filled: isFilled(input.basis.manufacturer_id),
      value: input.basis.manufacturer_id,
      group: "compliance",
    },
  ]

  const attrFields: CompletenessField[] = input.attributes
    .filter((a) => a.tier !== "not_applicable")
    .map((a) => {
      const group: CompletenessField["group"] =
        a.tier === "compliance_required"
          ? "compliance"
          : a.tier === "category_required"
            ? "category"
            : a.tier === "recommended"
              ? "recommended"
              : "optional"
      return {
        code: a.code,
        name: a.name,
        tier: a.tier,
        filled: isFilled(a.value),
        value: a.value,
        group,
      }
    })

  const requiredAttr = attrFields.filter(
    (f) => f.tier === "category_required" || f.tier === "compliance_required"
  )
  const recommended = attrFields.filter((f) => f.tier === "recommended")
  const optional = attrFields.filter((f) => f.tier === "optional")
  const compliance = attrFields.filter((f) => f.tier === "compliance_required")
  const categoryRequired = attrFields.filter(
    (f) => f.tier === "category_required"
  )

  const sections = [
    sectionFromFields("basis", "Basisinformatie", basisFields),
    sectionFromFields("required", "Verplicht", [
      ...basisFields.filter((f) => f.tier === "category_required"),
      ...categoryRequired,
    ]),
    sectionFromFields("compliance", "EU Compliance", [
      ...basisFields.filter((f) => f.group === "compliance"),
      ...compliance,
    ]),
    sectionFromFields("recommended", "Aanbevolen", recommended),
    sectionFromFields("optional", "Optioneel", optional),
  ]

  const allCountable = [...basisFields, ...attrFields]
  const percent =
    allCountable.length === 0
      ? 0
      : Math.round(
          (allCountable.filter((f) => f.filled).length / allCountable.length) *
            100
        )

  const missing_required = [
    ...basisFields.filter(
      (f) =>
        (f.tier === "category_required" || f.tier === "compliance_required") &&
        !f.filled
    ),
    ...requiredAttr.filter((f) => !f.filled),
  ].map((f) => ({ code: f.code, name: f.name, group: f.group }))

  const publication_blocked_reasons: string[] = []
  for (const m of missing_required) {
    publication_blocked_reasons.push(
      m.code === "category"
        ? "Categorie niet herkend — kies een EuropMade-categorie."
        : `Ontbreekt: ${m.name}`
    )
  }

  if (input.rules?.manufacturer_outside_eu) {
    publication_blocked_reasons.push(
      "Fabrikant moet in de EU/EER gevestigd zijn"
    )
  }

  if (input.offer) {
    if (!input.offer.has_offer) {
      publication_blocked_reasons.push("Geen verkoopaanbod aanwezig")
    } else {
      if (!input.offer.has_price) {
        publication_blocked_reasons.push("Verkoopprijs invullen")
      }
      if (!input.offer.has_stock_configured) {
        publication_blocked_reasons.push("Voorraad instellen")
      }
      if (!input.offer.has_delivery) {
        publication_blocked_reasons.push("Levertijd/verzending instellen")
      }
    }
  }

  const ceValue = attrValue(input.attributes, "ce_marking")
  const collectsData = attrValue(input.attributes, "collects_data")
  const ceRequiredForCategory = Boolean(input.rules?.ce_required_for_category)
  const mieClaimed = Boolean(input.rules?.mie_claimed)

  if (ceRequiredForCategory && ceValue === "Niet van toepassing") {
    publication_blocked_reasons.push(
      "CE-markering is verplicht voor deze categorie; 'Niet van toepassing' is hier niet toegestaan."
    )
  }

  const documents: CompletenessDocument[] = (input.documents || []).map((d) => ({
    code: d.code,
    name: d.name,
    required: d.required,
    present: d.present,
    status: d.status,
    rejection_reason: d.rejection_reason ?? null,
  }))

  const translationDocuments: CompletenessDocument[] = (
    input.translation_documents || []
  ).map((d) => ({
    code: d.code,
    name: d.name,
    required: d.required,
    present: d.present,
    status: d.status,
    rejection_reason: d.rejection_reason ?? null,
  }))

  const needsCeEvidence = ceValue === "Zichtbaar"
  const needsDataDoc = collectsData === "Ja"
  const needsMieEvidence = mieClaimed

  function ensureDoc(
    code: string,
    name: string,
    required: boolean
  ): CompletenessDocument {
    const existing = documents.find((d) => d.code === code)
    if (existing) {
      existing.required = required
      return existing
    }
    const created: CompletenessDocument = {
      code,
      name,
      required,
      present: false,
      status: "missing",
      rejection_reason: null,
    }
    documents.push(created)
    return created
  }

  if (needsCeEvidence) ensureDoc("doc.ce_marking", "CE-bewijs", true)
  if (needsDataDoc) ensureDoc("doc.data_usage", "Informatie datagebruik document", true)
  if (needsMieEvidence) ensureDoc("doc.made_in_europe", "Made in Europe-bewijs", true)

  for (const doc of documents) {
    if (!doc.required) continue
    if (doc.status === "approved") continue
    if (!doc.present || doc.status === "missing") {
      publication_blocked_reasons.push(`Ontbreekt: ${doc.name}`)
    } else if (doc.status === "pending_review" || doc.status === "precheck_warning") {
      publication_blocked_reasons.push(`${doc.name} wacht op controle (niet goedgekeurd)`)
    } else if (doc.status === "needs_info") {
      publication_blocked_reasons.push(
        `${doc.name} — aanvulling gevraagd${doc.rejection_reason ? `: ${doc.rejection_reason}` : ""}`
      )
    } else if (doc.status === "rejected") {
      publication_blocked_reasons.push(
        `${doc.name} afgekeurd${doc.rejection_reason ? `: ${doc.rejection_reason}` : ""}`
      )
    }
  }

  for (const doc of translationDocuments) {
    if (!doc.required) continue
    if (doc.status === "approved") continue
    if (!doc.present || doc.status === "missing") {
      publication_blocked_reasons.push(`Ontbreekt: ${doc.name}`)
    } else if (doc.status === "pending_review") {
      publication_blocked_reasons.push(
        `${doc.name} incompleet${doc.rejection_reason ? ` (${doc.rejection_reason})` : ""}`
      )
    } else if (doc.status === "rejected") {
      publication_blocked_reasons.push(
        `${doc.name} mislukt/verouderd${doc.rejection_reason ? `: ${doc.rejection_reason}` : ""}`
      )
    }
  }

  const requiredDocs = documents.filter((d) => d.required)
  const anyRejected = requiredDocs.some((d) => d.status === "rejected")
  const anyNeedsInfo = requiredDocs.some((d) => d.status === "needs_info")
  const anyPending = requiredDocs.some(
    (d) => d.status === "pending_review" || d.status === "precheck_warning"
  )
  const anyMissingDoc = requiredDocs.some(
    (d) => !d.present || d.status === "missing"
  )
  const docsApprovedOrNone =
    requiredDocs.length === 0 || requiredDocs.every((d) => d.status === "approved")

  const complianceMissing = compliance.filter((f) => !f.filled).length
  let compliance_status: CompletenessReport["compliance_status"] =
    compliance.length === 0 && requiredDocs.length === 0
      ? "not_applicable"
      : complianceMissing === compliance.length && compliance.length > 0
        ? "non_compliant"
        : "incomplete"

  let compliance_review_status: ComplianceReviewStatus = "not_required"
  if (requiredDocs.length > 0 || compliance.length > 0) {
    if (anyRejected) {
      compliance_review_status = "rejected"
      compliance_status = "rejected"
    } else if (anyPending) {
      compliance_review_status = requiredDocs.some(
        (d) => d.status === "precheck_warning"
      )
        ? "precheck_warning"
        : "pending_review"
      compliance_status = "pending_review"
    } else if (anyNeedsInfo) {
      compliance_review_status = "needs_info"
      compliance_status = "incomplete"
    } else if (anyMissingDoc || complianceMissing > 0) {
      compliance_review_status = "missing"
      compliance_status =
        complianceMissing === compliance.length && compliance.length > 0
          ? "non_compliant"
          : "incomplete"
    } else if (docsApprovedOrNone && complianceMissing === 0) {
      compliance_review_status = requiredDocs.length ? "approved" : "not_required"
      compliance_status = "complete"
    }
  }

  const requiredInfoMissing = missing_required.length > 0
  const recommendedMissing = [
    ...basisFields.filter((f) => f.tier === "recommended" && !f.filled),
    ...recommended.filter((f) => !f.filled),
  ].length
  const optionalMissing = optional.filter((f) => !f.filled).length

  let information_quality: InformationQuality = "insufficient"
  if (!requiredInfoMissing) {
    information_quality =
      recommendedMissing === 0 && optionalMissing === 0
        ? "complete"
        : "sufficient"
  }

  const publishable = publication_blocked_reasons.length === 0
  const publicationStatus = input.rules?.publication_status || null
  const published = publicationStatus === "Gepubliceerd"

  let product_gate_status: ProductGateStatus = "not_sellable"
  if (published) product_gate_status = "published"
  else if (publishable) product_gate_status = "publishable"
  else if (anyPending) product_gate_status = "in_review"
  else if (!requiredInfoMissing && anyMissingDoc) product_gate_status = "ready_for_review"
  else product_gate_status = "not_sellable"

  const sale_blocked_reasons = [...publication_blocked_reasons]
  if (
    input.offer?.has_offer &&
    input.offer.has_shipping_profile === false &&
    !sale_blocked_reasons.includes("Verzendprofiel koppelen")
  ) {
    sale_blocked_reasons.push("Verzendprofiel koppelen")
  }
  let sale_presentation: SalePresentation = "blocked"
  if (!input.offer?.has_offer) {
    sale_presentation = "no_offer"
  } else if (input.offer.sales_status === "paused") {
    sale_presentation = "paused"
  } else if (!publishable) {
    sale_presentation = "blocked"
  } else if (!published) {
    sale_presentation = "not_published"
  } else if (input.offer.is_sellable === false) {
    sale_presentation = "blocked"
    const extra = (input.offer.sellability_reasons || []).filter(Boolean)
    if (extra.length === 0) {
      sale_blocked_reasons.push("Aanbod is technisch niet verkoopbaar")
    } else {
      for (const reason of extra) {
        if (!sale_blocked_reasons.includes(reason)) sale_blocked_reasons.push(reason)
      }
    }
  } else {
    sale_presentation = "for_sale"
  }

  const findings = buildValidationFindings({
    missing_required,
    manufacturerOutsideEu: Boolean(input.rules?.manufacturer_outside_eu),
    offer: input.offer,
    ceBlocked:
      ceRequiredForCategory && ceValue === "Niet van toepassing",
    documents,
    translationDocuments,
    recommended: [
      ...basisFields.filter((f) => f.tier === "recommended" && !f.filled),
      ...recommended.filter((f) => !f.filled),
    ],
    offerNotSellable: input.offer?.is_sellable === false,
    sellabilityReasons: input.offer?.sellability_reasons,
  })

  return {
    percent,
    publishable,
    information_quality,
    publication_blocked_reasons,
    sale_blocked_reasons,
    findings,
    sections,
    compliance_status,
    compliance_review_status,
    product_gate_status,
    sale_presentation,
    documents: [...documents, ...translationDocuments],
    missing_required,
  }
}

function validationFinding(
  input: Omit<ProductValidationFinding, "status" | "severity"> & {
    severity?: ProductValidationFinding["severity"]
  }
): ProductValidationFinding {
  return {
    ...input,
    severity: input.severity ?? "blocker",
    status: "open",
  }
}

function buildValidationFindings(input: {
  missing_required: Array<{ code: string; name: string; group: string }>
  manufacturerOutsideEu: boolean
  offer?: OfferGateInput | null
  ceBlocked: boolean
  documents: CompletenessDocument[]
  translationDocuments: CompletenessDocument[]
  recommended: CompletenessField[]
  offerNotSellable: boolean
  sellabilityReasons?: string[]
}): ProductValidationFinding[] {
  const findings: ProductValidationFinding[] = []
  const seen = new Set<string>()
  const add = (finding: ProductValidationFinding) => {
    if (seen.has(finding.code)) return
    seen.add(finding.code)
    findings.push(finding)
  }

  for (const missing of input.missing_required) {
    const message =
      missing.code === "category"
        ? "Categorie niet herkend — kies een EuropMade-categorie."
        : `Ontbreekt: ${missing.name}`
    const action =
      missing.code === "category"
        ? "Kies een EuropMade-categorie en sla op."
        : missing.code === "ean"
          ? "Vul een geldige EAN/GTIN in en sla op."
          : missing.code === "primary_image"
            ? "Upload een hoofdafbeelding en sla op."
            : `Vul ${missing.name} in en sla op.`
    add(
      validationFinding({
        code: missing.code,
        field: missing.name,
        category: "submission",
        blocks: ["submission", "approval", "publication"],
        message,
        action,
      })
    )
  }

  if (input.manufacturerOutsideEu) {
    add(
      validationFinding({
        code: "manufacturer_outside_eu",
        field: "Fabrikant",
        category: "approval",
        blocks: ["approval", "publication"],
        message: "Fabrikant moet in de EU/EER gevestigd zijn",
        action: "Koppel een fabrikant die in de EU/EER gevestigd is en sla op.",
      })
    )
  }

  if (input.ceBlocked) {
    add(
      validationFinding({
        code: "ce_marking",
        field: "CE-markering",
        category: "approval",
        blocks: ["approval", "publication"],
        message:
          "CE-markering is verplicht voor deze categorie; 'Niet van toepassing' is hier niet toegestaan.",
        action: "Kies de juiste CE-markering voor deze categorie en sla op.",
      })
    )
  }

  for (const doc of [...input.documents, ...input.translationDocuments]) {
    if (!doc.required || doc.status === "approved") continue
    const translation = doc.code.startsWith("translation.")
    let message = `Ontbreekt: ${doc.name}`
    let action = `Voeg ${doc.name} toe en sla op.`
    if (doc.status === "pending_review" || doc.status === "precheck_warning") {
      message = translation
        ? `${doc.name} incompleet${doc.rejection_reason ? ` (${doc.rejection_reason})` : ""}`
        : `${doc.name} wacht op controle (niet goedgekeurd)`
      action = translation
        ? `Vul ${doc.name} aan en sla op.`
        : `Wacht op controle van ${doc.name}, of lever de gevraagde aanvulling aan.`
    } else if (doc.status === "needs_info") {
      message = `${doc.name} — aanvulling gevraagd${doc.rejection_reason ? `: ${doc.rejection_reason}` : ""}`
      action = `Pas ${doc.name} aan zoals gevraagd en sla op.`
    } else if (doc.status === "rejected") {
      message = translation
        ? `${doc.name} mislukt/verouderd${doc.rejection_reason ? `: ${doc.rejection_reason}` : ""}`
        : `${doc.name} afgekeurd${doc.rejection_reason ? `: ${doc.rejection_reason}` : ""}`
      action = `Vervang ${doc.name} en sla op.`
    }
    add(
      validationFinding({
        code: doc.code,
        field: doc.name,
        category: translation ? "publication" : "approval",
        blocks: ["approval", "publication"],
        message,
        action,
      })
    )
  }

  if (input.offer) {
    if (!input.offer.has_offer) {
      add(
        validationFinding({
          code: "offer",
          field: "Verkoopaanbod",
          category: "sale",
          blocks: ["sale"],
          message: "Geen verkoopaanbod aanwezig",
          action: "Maak een verkoopaanbod. Dit wijzigt de productgoedkeuring niet.",
        })
      )
    } else {
      if (!input.offer.has_price) {
        add(
          validationFinding({
            code: "price",
            field: "Verkoopprijs",
            category: "sale",
            blocks: ["sale"],
            message: "Verkoopprijs invullen",
            action: "Vul de verkoopprijs in en sla het aanbod op.",
          })
        )
      }
      if (!input.offer.has_stock_configured) {
        add(
          validationFinding({
            code: "stock",
            field: "Voorraad",
            category: "sale",
            blocks: ["sale"],
            message: "Voorraad instellen",
            action: "Stel de voorraad in en sla het aanbod op.",
          })
        )
      }
      if (!input.offer.has_delivery) {
        add(
          validationFinding({
            code: "delivery",
            field: "Levertijd",
            category: "sale",
            blocks: ["sale"],
            message: "Levertijd/verzending instellen",
            action: "Stel de levertijd in en sla het aanbod op.",
          })
        )
      }
      if (input.offer.has_shipping_profile === false) {
        add(
          validationFinding({
            code: "shipping_profile",
            field: "Verzendprofiel",
            category: "sale",
            blocks: ["sale"],
            message: "Verzendprofiel koppelen",
            action: "Koppel een verzendprofiel en sla het aanbod op.",
          })
        )
      }
      if (input.offerNotSellable) {
        const provided = input.sellabilityReasons?.filter(Boolean)
        if (!provided || provided.length === 0) {
          add(
            validationFinding({
              code: "offer_not_sellable",
              field: "Verkoopaanbod",
              category: "sale",
              blocks: ["sale"],
              message: "Aanbod is technisch niet verkoopbaar",
              action: "Maak het aanbod verkoopbaar. De productpublicatie blijft staan.",
            })
          )
        } else {
          provided.forEach((message, index) => {
            if (findings.some((finding) => finding.message === message)) return
            add(
              validationFinding({
                code: `offer_not_sellable_${index}`,
                field: "Verkoopaanbod",
                category: "sale",
                blocks: ["sale"],
                message,
                action: "Maak het aanbod verkoopbaar. De productpublicatie blijft staan.",
              })
            )
          })
        }
      }
    }
  }

  for (const field of input.recommended) {
    add(
      validationFinding({
        code: field.code,
        field: field.name,
        category: "warning",
        blocks: ["warning"],
        severity: "warning",
        message: `Aanbevolen: ${field.name} is nog leeg.`,
        action: `Vul ${field.name} in als de waarde bekend is. Dit blokkeert indienen niet.`,
      })
    )
  }

  return findings
}

export type ImportHistoryNote = {
  id?: string
  field_code: string
  field: string
  detail: string
}

/** Import notes stay history. They are not a second current validation. */
export function historicalImportNotes(
  changes: Array<{
    id?: string
    field_code?: string | null
    field_label?: string | null
    new_value?: string | null
    reason?: string | null
  }>
): ImportHistoryNote[] {
  return changes
    .filter((change) => change.field_code?.startsWith("import.issue."))
    .map((change) => ({
      id: change.id,
      field_code: change.field_code || "",
      field: change.field_label || change.field_code || "",
      detail: [change.new_value || "leeg", change.reason || ""]
        .filter(Boolean)
        .join(" — "),
    }))
}

/**
 * Current blockers come only from live completeness.
 * A stored import note is not copied into that list.
 */
export function currentValidation(
  findings: ProductValidationFinding[],
  notes: ImportHistoryNote[]
): { current: ProductValidationFinding[]; history: ImportHistoryNote[] } {
  return { current: findings, history: notes }
}
