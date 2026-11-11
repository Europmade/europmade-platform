import { MedusaError } from "@medusajs/framework/utils"
import type { ProductValidationFinding } from "./completeness"
import {
  reviewsThatGateApproval,
  summarizeSectionReviews,
  type SectionReviewRow,
} from "./section-review-helpers"

const NOT_IN_REVIEW =
  "Geen product in wachtrij voor goedkeuring (status In review)."
const SECTIONS_BLOCKED =
  "Niet alle beoordelingsonderdelen zijn akkoord (Aanvullen/Afwijzen aanwezig)."
const NOT_PUBLISHABLE =
  "Product is niet publiceerbaar — keur eerst verplichte documenten goed en controleer completeness."

export type BulkProductSnapshot = {
  identifier: string | null
  lifecycle_status: string | null
  publication_status: string | null
  offer_status: string
  sellability: string
}

export class ApprovalRejected extends Error {
  constructor(
    readonly http: "not_found" | "not_allowed",
    message: string,
    readonly title: string | null = null,
    readonly findings: ProductValidationFinding[] = [],
    readonly preview: BulkProductSnapshot | null = null
  ) {
    super(message)
    this.name = "ApprovalRejected"
  }
}

export type ApprovalVersion = {
  id: string
  publication_status: string
  version_number: number
  title?: string | null
}

export type ApprovalProductRef = {
  id: string
  brand_id?: string | null
  manufacturer_id?: string | null
}

export type ProductApprovalDeps = {
  retrieveProduct: (productId: string) => Promise<ApprovalProductRef>
  listProductVersions: (productId: string) => Promise<ApprovalVersion[]>
  listSectionReviews: (productId: string) => Promise<SectionReviewRow[]>
  loadPublishable: (
    productId: string
  ) => Promise<{
    publishable: boolean
    reason?: string | null
    findings?: ProductValidationFinding[]
    preview?: BulkProductSnapshot | null
  }>
  assertGtin: (productId: string) => Promise<void>
  decide: (input: {
    product_id: string
    version_id: string
    actor_id: string
    reason?: string
  }) => Promise<{ version?: unknown; lifecycle_status?: string }>
}

export type ApprovalSuccess = {
  product_id: string
  title: string | null
  version_id: string
  version?: unknown
  lifecycle_status?: string
  findings?: ProductValidationFinding[]
  preview?: BulkProductSnapshot | null
}

export function matchesApprovalRelation(
  product: { brand_id?: string | null; manufacturer_id?: string | null },
  relation: { brand_id?: string; manufacturer_id?: string }
): boolean {
  if (relation.brand_id) return product.brand_id === relation.brand_id
  if (relation.manufacturer_id) {
    return product.manufacturer_id === relation.manufacturer_id
  }
  return false
}

function rejectedFrom(err: unknown, title: string | null): ApprovalRejected | null {
  if (err instanceof ApprovalRejected) return err
  if (err instanceof MedusaError) {
    return new ApprovalRejected(
      err.type === MedusaError.Types.NOT_FOUND ? "not_found" : "not_allowed",
      err.message,
      title
    )
  }
  return null
}

/** Same gates as POST /admin/product-cloud/products/:id/approval decision=approved. */
export async function assessProductApproval(
  deps: ProductApprovalDeps,
  productId: string
): Promise<{
  version_id: string
  title: string | null
  findings: ProductValidationFinding[]
  preview: BulkProductSnapshot | null
}> {
  let title: string | null = null
  try {
    await deps.retrieveProduct(productId)
  } catch (err) {
    const rejected = rejectedFrom(err, null)
    if (rejected) throw rejected
    throw err
  }

  let versions: ApprovalVersion[] = []
  try {
    versions = await deps.listProductVersions(productId)
  } catch (err) {
    const rejected = rejectedFrom(err, null)
    if (rejected) throw rejected
    throw err
  }
  title =
    versions.find((version) => version.publication_status === "In review")?.title ||
    versions[0]?.title ||
    null

  const summary = summarizeSectionReviews(
    reviewsThatGateApproval(await deps.listSectionReviews(productId))
  )
  const blocking: ProductValidationFinding[] = []
  if (summary.needs_info_count > 0 || summary.rejected_count > 0) {
    blocking.push({
      code: "section_reviews",
      field: "Beoordelingsonderdelen",
      category: "approval",
      blocks: ["approval", "publication"],
      severity: "blocker",
      message: SECTIONS_BLOCKED,
      action: "Werk de gevraagde onderdelen bij of rond de beoordeling af.",
      status: "open",
    })
  }

  const publishable = await deps.loadPublishable(productId)
  const preview = publishable.preview ?? null
  const reported = publishable.findings || []
  const productBlocking = reported.filter(
    (finding) =>
      finding.severity === "blocker" &&
      finding.blocks.some((gate) => gate !== "sale" && gate !== "warning")
  )
  const informational = reported.filter(
    (finding) =>
      finding.severity === "warning" || finding.blocks.includes("sale")
  )
  if (!publishable.publishable) {
    if (productBlocking.length > 0) blocking.push(...productBlocking)
    else {
      blocking.push({
        code: "publication",
        field: "Product",
        category: "approval",
        blocks: ["approval", "publication"],
        severity: "blocker",
        message: publishable.reason?.trim() || NOT_PUBLISHABLE,
        action: "Los de genoemde productblokkade op en sla op.",
        status: "open",
      })
    }
  }

  try {
    await deps.assertGtin(productId)
  } catch (err) {
    const rejected = rejectedFrom(err, title)
    const message = rejected?.message || (err instanceof Error ? err.message : "EAN/GTIN is vereist")
    if (!blocking.some((finding) => finding.message === message || finding.code === "ean")) {
      blocking.push({
        code: "ean",
        field: "EAN / GTIN",
        category: "submission",
        blocks: ["submission", "approval", "publication"],
        severity: "blocker",
        message,
        action: "Vul een geldige EAN/GTIN in en sla op.",
        status: "open",
      })
    }
    if (!rejected && !(err instanceof MedusaError)) throw err
  }

  if (blocking.length > 0) {
    throw new ApprovalRejected(
      "not_allowed",
      blocking.map((finding) => finding.message).join(" "),
      title,
      [...blocking, ...informational],
      preview
    )
  }

  const target = versions.find((version) => version.publication_status === "In review")
  if (!target) throw new ApprovalRejected("not_found", NOT_IN_REVIEW, title, informational, preview)
  return {
    version_id: target.id,
    title: target.title || title,
    findings: informational,
    preview,
  }
}

export async function approveProductWithDeps(
  deps: ProductApprovalDeps,
  input: { productId: string; actorId: string; reason?: string }
): Promise<ApprovalSuccess> {
  const assessed = await assessProductApproval(deps, input.productId)
  const decided = await deps.decide({
    product_id: input.productId,
    version_id: assessed.version_id,
    actor_id: input.actorId,
    reason: input.reason,
  })
  return {
    product_id: input.productId,
    title: assessed.title,
    version_id: assessed.version_id,
    version: decided.version,
    lifecycle_status: decided.lifecycle_status,
    findings: assessed.findings,
    preview: assessed.preview,
  }
}

export type BulkApprovalRow = {
  product_id: string
  title: string | null
  identifier: string | null
  lifecycle_status: string | null
  publication_status: string | null
  offer_status: string | null
  sellability: string | null
  status: "eligible" | "approved" | "skipped" | "failed"
  outcome_label: string
  reason: string | null
  decided_by: string | null
  findings?: ProductValidationFinding[]
}

export type BulkApprovalReport = {
  dry_run: boolean
  mode: "selected" | "relation"
  selected_count: number
  eligible_count: number
  approved_count: number
  skipped_count: number
  failed_count: number
  warning_count: number
  partial: boolean
  limit_reached: boolean
  results: BulkApprovalRow[]
}

export function describeOfferStatus(input: {
  offer_count?: number
  sales_status?: string | null
}): string {
  if (!input.offer_count) return "Geen aanbod"
  if (input.sales_status === "paused") return "Gepauzeerd"
  if (input.sales_status === "active" || input.sales_status === "mixed") return "Actief"
  return "Aanwezig"
}

export function describeSellability(sale: string | null | undefined): string {
  if (sale === "for_sale") return "Te koop"
  if (sale === "paused") return "Gepauzeerd"
  if (sale === "no_offer") return "Geen aanbod"
  if (sale === "not_published") return "Niet in winkel"
  return "Niet verkoopbaar"
}

export function bulkOutcomeLabel(
  status: BulkApprovalRow["status"],
  findings: ProductValidationFinding[] = []
): string {
  if (status === "approved") return "Goedgekeurd en gepubliceerd"
  if (status === "failed") return "Technisch mislukt"
  if (status === "eligible") return "Geschikt voor goedkeuring"
  const blocksApproval = findings.some(
    (finding) =>
      finding.severity === "blocker" &&
      finding.blocks.some((gate) => gate !== "sale" && gate !== "warning")
  )
  return blocksApproval ? "Niet goedgekeurd" : "Overgeslagen"
}

function rowBase(
  productId: string,
  title: string | null,
  status: BulkApprovalRow["status"],
  reason: string | null,
  findings: ProductValidationFinding[],
  preview: BulkProductSnapshot | null,
  decidedBy: string | null
): BulkApprovalRow {
  return {
    product_id: productId,
    title,
    identifier: preview?.identifier ?? null,
    lifecycle_status: preview?.lifecycle_status ?? null,
    publication_status: preview?.publication_status ?? null,
    offer_status: preview?.offer_status ?? null,
    sellability: preview?.sellability ?? null,
    status,
    outcome_label: bulkOutcomeLabel(status, findings),
    reason,
    decided_by: decidedBy,
    findings,
  }
}

function countReport(
  rows: BulkApprovalRow[],
  input: { dry_run: boolean; mode: "selected" | "relation"; limit_reached: boolean }
): BulkApprovalReport {
  const eligible_count = rows.filter((row) => row.status === "eligible").length
  const approved_count = rows.filter((row) => row.status === "approved").length
  const skipped_count = rows.filter((row) => row.status === "skipped").length
  const failed_count = rows.filter((row) => row.status === "failed").length
  return {
    dry_run: input.dry_run,
    mode: input.mode,
    selected_count: rows.length,
    eligible_count,
    approved_count,
    skipped_count,
    failed_count,
    warning_count: rows.filter((row) =>
      (row.findings || []).some((finding) => finding.severity === "warning")
    ).length,
    partial: approved_count > 0 && (skipped_count > 0 || failed_count > 0),
    limit_reached: input.limit_reached,
    results: rows,
  }
}

async function decideOne(
  deps: ProductApprovalDeps,
  productId: string,
  actorId: string,
  dryRun: boolean
): Promise<BulkApprovalRow> {
  try {
    if (dryRun) {
      const assessed = await assessProductApproval(deps, productId)
      return rowBase(
        productId,
        assessed.title,
        "eligible",
        null,
        assessed.findings,
        assessed.preview,
        null
      )
    }
    const approved = await approveProductWithDeps(deps, { productId, actorId })
    return rowBase(
      productId,
      approved.title,
      "approved",
      null,
      approved.findings || [],
      approved.preview ?? null,
      actorId
    )
  } catch (err) {
    if (err instanceof ApprovalRejected) {
      const blocking = err.findings.filter(
        (finding) =>
          finding.severity === "blocker" &&
          finding.blocks.some((gate) => gate !== "sale" && gate !== "warning")
      )
      return rowBase(
        productId,
        err.title,
        "skipped",
        blocking.length
          ? blocking.map((finding) => `${finding.field}: ${finding.message}`).join(" · ")
          : err.message,
        err.findings,
        err.preview,
        null
      )
    }
    return rowBase(
      productId,
      null,
      "failed",
      err instanceof Error ? err.message : "Goedkeuren is mislukt.",
      [],
      null,
      null
    )
  }
}

export async function runBulkProductApproval(
  deps: ProductApprovalDeps & {
    listProducts: (filter: {
      brand_id?: string
      manufacturer_id?: string
    }) => Promise<ApprovalProductRef[]>
  },
  input: {
    mode: "selected" | "relation"
    product_ids?: string[]
    brand_id?: string
    manufacturer_id?: string
    dry_run?: boolean
    actor_id: string
  }
): Promise<BulkApprovalReport> {
  const dryRun = input.dry_run !== false
  if (input.mode === "selected") {
    const ids = [...new Set((input.product_ids || []).map((id) => id.trim()).filter(Boolean))]
    if (ids.length === 0) {
      throw new ApprovalRejected("not_allowed", "Selecteer minimaal één product.")
    }
    const results: BulkApprovalRow[] = []
    for (const productId of ids) {
      results.push(await decideOne(deps, productId, input.actor_id, dryRun))
    }
    return countReport(results, { dry_run: dryRun, mode: "selected", limit_reached: false })
  }

  const brandId = input.brand_id?.trim() || ""
  const manufacturerId = input.manufacturer_id?.trim() || ""
  if (brandId && manufacturerId) {
    throw new ApprovalRejected("not_allowed", "Kies een merk of een fabrikant, niet beide.")
  }
  if (!brandId && !manufacturerId) {
    throw new ApprovalRejected("not_allowed", "Kies een merk of een fabrikant.")
  }
  const relation = brandId
    ? { brand_id: brandId }
    : { manufacturer_id: manufacturerId }
  const products = await deps.listProducts(relation)
  const limitReached = products.length >= 500
  const results: BulkApprovalRow[] = []
  const seen = new Set<string>()
  for (const product of products) {
    if (!product.id || seen.has(product.id)) continue
    seen.add(product.id)
    if (!matchesApprovalRelation(product, relation)) {
      results.push(
        rowBase(
          product.id,
          null,
          "skipped",
          brandId
            ? "Dit product hoort niet bij het gekozen merk."
            : "Dit product hoort niet bij de gekozen fabrikant.",
          [],
          null,
          null
        )
      )
      continue
    }
    results.push(await decideOne(deps, product.id, input.actor_id, dryRun))
  }
  return countReport(results, {
    dry_run: dryRun,
    mode: "relation",
    limit_reached: limitReached,
  })
}
