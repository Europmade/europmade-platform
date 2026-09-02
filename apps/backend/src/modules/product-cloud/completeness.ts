/**
 * Product information completeness + publishability (managed rules, not AI).
 */

import type { RequirementTier } from "./category-attributes"

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

export type CompletenessReport = {
  percent: number
  publishable: boolean
  /** Onvoldoende / Voldoende / Compleet — optionele velden blokkeren publishable niet. */
  information_quality: InformationQuality
  publication_blocked_reasons: string[]
  sale_blocked_reasons: string[]
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
}

export type CompletenessRulesInput = {
  ce_required_for_category?: boolean
  mie_claimed?: boolean
  publication_status?: string | null
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
  documents?: CompletenessDocumentInput[] | null
}): CompletenessReport {
  const basisFields: CompletenessField[] = [
    {
      code: "ean",
      name: "EAN / GTIN",
      tier: "category_required",
      filled: isFilled(input.basis.identifier_value),
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
    publication_blocked_reasons.push(`Ontbreekt: ${m.name}`)
  }

  if (input.offer) {
    if (!input.offer.has_offer) {
      publication_blocked_reasons.push("Geen seller-offer aanwezig")
    } else {
      if (!input.offer.has_price) {
        publication_blocked_reasons.push("Prijs ontbreekt op offer")
      }
      if (!input.offer.has_stock_configured) {
        publication_blocked_reasons.push("Voorraad niet ingesteld")
      }
      if (!input.offer.has_delivery) {
        publication_blocked_reasons.push("Levertijd/verzending niet ingesteld")
      }
      if (input.offer.has_shipping_profile === false) {
        publication_blocked_reasons.push("Verzendprofiel ontbreekt")
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
    } else if (doc.status === "rejected") {
      publication_blocked_reasons.push(
        `${doc.name} afgekeurd${doc.rejection_reason ? `: ${doc.rejection_reason}` : ""}`
      )
    }
  }

  const requiredDocs = documents.filter((d) => d.required)
  const anyRejected = requiredDocs.some((d) => d.status === "rejected")
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
    sale_blocked_reasons.push("Offer is technisch niet verkoopbaar")
  } else {
    sale_presentation = "for_sale"
  }

  return {
    percent,
    publishable,
    information_quality,
    publication_blocked_reasons,
    sale_blocked_reasons,
    sections,
    compliance_status,
    compliance_review_status,
    product_gate_status,
    sale_presentation,
    documents,
    missing_required,
  }
}
