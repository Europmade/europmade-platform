/**
 * Seller product import: draft creation and later approval are separate.
 *
 * A product may be stored as Concept when data is incomplete. Missing or
 * invalid fields are recorded on the row. They block submit, admin approval,
 * publication or sale only when an existing gate already requires them.
 * They do not block draft creation, except when the row cannot be stored
 * without inventing an identity, a title or a brand name.
 *
 * An unknown brand name is created unpublished and in review. It is not verified.
 */

import { IMPORT_FIELDS } from "./import-columns"
import { matchBrandName, normalizeBrandKey } from "./brand-import"
import {
  importDraftSeed,
  stableConceptDraftIdentifier,
} from "./concept-identifier"

export type ImportProcessStep =
  | "draft"
  | "submit"
  | "approval"
  | "publication"
  | "sale"

export type ImportFieldSeverity =
  | "valid"
  | "warning"
  | "missing"
  | "invalid"
  | "requires_review"

export type ClassifiedImportIssue = {
  row: number
  field: string
  message: string
  blocking: boolean
  severity: ImportFieldSeverity
  supplied_value: string | null
  resolution: string
  blocks: ImportProcessStep[]
}

const LATER: ImportProcessStep[] = [
  "submit",
  "approval",
  "publication",
  "sale",
]

export function classifyImportIssue(input: {
  row: number
  field: string
  message: string
  severity: ImportFieldSeverity
  supplied_value?: string | null
  resolution: string
  blocks: ImportProcessStep[]
}): ClassifiedImportIssue {
  return {
    row: input.row,
    field: input.field,
    message: input.message,
    severity: input.severity,
    supplied_value: input.supplied_value ?? null,
    resolution: input.resolution,
    blocks: input.blocks,
    blocking: input.blocks.includes("draft"),
  }
}

export function draftResolution(): string {
  return "Deze regel wordt niet als product opgeslagen. Vul productnaam, merknaam en minimaal één echte identificatie aan. Er worden geen gegevens verzonnen."
}

export function laterStepResolution(blocks: ImportProcessStep[]): string {
  const steps = blocks
    .map((step) => {
      if (step === "submit") return "indienen"
      if (step === "approval") return "admin-goedkeuring"
      if (step === "publication") return "publicatie"
      if (step === "sale") return "verkoop"
      return step
    })
    .join(", ")
  return `Het product kan als Concept worden bewaard. Corrigeer dit veld in de Seller Backoffice. Geblokkeerd tot het is opgelost: ${steps}. Niets wordt automatisch goedgekeurd of gepubliceerd.`
}

export type ImportBrandDecision =
  | { status: "skipped" }
  | { status: "missing" }
  | { status: "existing"; id: string; name: string }
  | { status: "ambiguous"; name: string; candidates: Array<{ id: string; name: string }> }
  | { status: "create"; name: string }

/** knownBrands omitted: do not decide. Empty list: every non-empty name is new. */
export function classifyImportBrand(
  raw: string,
  knownBrands: Array<{ id: string; name: string }> | undefined
): ImportBrandDecision {
  const name = raw.replace(/\s+/g, " ").trim()
  if (!knownBrands) return { status: "skipped" }
  if (!name) return { status: "missing" }
  const match = matchBrandName(name, knownBrands)
  if (match.status === "exact") {
    return { status: "existing", id: match.brand.id, name: match.brand.name }
  }
  if (match.status === "ambiguous") {
    return { status: "ambiguous", name, candidates: match.candidates }
  }
  return { status: "create", name: match.name }
}

export function uniqueNewBrandCount(
  names: string[]
): number {
  return new Set(names.map((name) => normalizeBrandKey(name)).filter(Boolean)).size
}

const SALE_FIELDS = new Set([
  "regular_price",
  "promo_price",
  "stock",
  "delivery_days",
  "shipping_cost",
  "extra_delivery_cost",
  "sales_status",
])

function blocksForConditional(column: string): ImportProcessStep[] {
  if (column === "ean") return [...LATER]
  if (SALE_FIELDS.has(column)) return ["publication", "sale"]
  return ["publication"]
}

/**
 * Empty conditional columns that are actually present on the row.
 * Absent keys were not in the file and are not treated as missing.
 * Optional columns stay silent: an empty optional value is valid.
 */
export function conditionalFieldIssues(
  values: Record<string, string>,
  excelRow: number,
  already: Array<{ field: string }>
): ClassifiedImportIssue[] {
  const seen = new Set(already.map((issue) => issue.field))
  const issues: ClassifiedImportIssue[] = []
  for (const field of IMPORT_FIELDS) {
    if (field.required !== "Voorwaardelijk verplicht") continue
    if (field.column === "ean" || field.column === "shipping_profile_id") continue
    if (field.column === "manual_languages" || field.column === "manual_url") continue
    if (!(field.column in values)) continue
    if (seen.has(field.column)) continue
    if (String(values[field.column] ?? "").trim()) continue
    const blocks = blocksForConditional(field.column)
    issues.push(
      classifyImportIssue({
        row: excelRow,
        field: field.column,
        severity: "missing",
        supplied_value: "",
        blocks,
        resolution: laterStepResolution(blocks),
        message: `Excel-regel ${excelRow}, veld ${field.nl_name} (interne naam: ${field.column}): voorwaardelijk verplicht veld is leeg. Concept-aanmaak gaat door.`,
      })
    )
  }
  if (!seen.has("shipping_profile_id") && !String(values.shipping_profile_id ?? "").trim()) {
    issues.push(
      classifyImportIssue({
        row: excelRow,
        field: "shipping_profile_id",
        severity: "warning",
        supplied_value: "",
        blocks: [],
        resolution:
          "Stel een verzendprofiel in voordat het aanbod verkoopbaar wordt. Concept, indiening, goedkeuring en publicatie gaan door.",
        message: `Excel-regel ${excelRow}, veld Verzendprofiel: stel dit in voordat het aanbod verkoopbaar wordt.`,
      })
    )
  }
  return issues
}

export { importDraftSeed, stableConceptDraftIdentifier }

export function sellerImportBrandRecord(input: {
  name: string
  slug: string
  sellerId: string
  companyId?: string | null
}) {
  return {
    name: input.name,
    slug: input.slug,
    public_page_status: "unpublished" as const,
    page_review_status: "in_review" as const,
    page_review_note:
      "Aangemaakt via productimport. Nog niet gecontroleerd en niet geverifieerd.",
    created_by_seller_id: input.sellerId,
    owner_company_id: input.companyId ?? null,
  }
}

export function importIssueReason(issue: {
  severity?: string
  blocks?: string[]
  message: string
  resolution?: string
}): string {
  return [
    issue.severity || "warning",
    (issue.blocks || []).join(","),
    issue.message,
    issue.resolution || "",
  ].join(" | ")
}
