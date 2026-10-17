import { MedusaError } from "@medusajs/framework/utils"
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

export class ApprovalRejected extends Error {
  constructor(
    readonly http: "not_found" | "not_allowed",
    message: string,
    readonly title: string | null = null
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
  ) => Promise<{ publishable: boolean; reason?: string | null }>
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
): Promise<{ version_id: string; title: string | null }> {
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
  if (summary.needs_info_count > 0 || summary.rejected_count > 0) {
    throw new ApprovalRejected("not_allowed", SECTIONS_BLOCKED, title)
  }

  const publishable = await deps.loadPublishable(productId)
  if (!publishable.publishable) {
    throw new ApprovalRejected(
      "not_allowed",
      publishable.reason?.trim() || NOT_PUBLISHABLE,
      title
    )
  }

  try {
    await deps.assertGtin(productId)
  } catch (err) {
    const rejected = rejectedFrom(err, title)
    if (rejected) throw rejected
    throw err
  }

  const target = versions.find((version) => version.publication_status === "In review")
  if (!target) throw new ApprovalRejected("not_found", NOT_IN_REVIEW, title)
  return { version_id: target.id, title: target.title || title }
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
  }
}

export type BulkApprovalRow = {
  product_id: string
  title: string | null
  status: "eligible" | "approved" | "skipped" | "failed"
  reason: string | null
}

export type BulkApprovalReport = {
  dry_run: boolean
  mode: "selected" | "relation"
  eligible_count: number
  approved_count: number
  skipped_count: number
  failed_count: number
  limit_reached: boolean
  results: BulkApprovalRow[]
}

function countReport(
  rows: BulkApprovalRow[],
  input: { dry_run: boolean; mode: "selected" | "relation"; limit_reached: boolean }
): BulkApprovalReport {
  return {
    dry_run: input.dry_run,
    mode: input.mode,
    eligible_count: rows.filter((row) => row.status === "eligible").length,
    approved_count: rows.filter((row) => row.status === "approved").length,
    skipped_count: rows.filter((row) => row.status === "skipped").length,
    failed_count: rows.filter((row) => row.status === "failed").length,
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
      return {
        product_id: productId,
        title: assessed.title,
        status: "eligible",
        reason: null,
      }
    }
    const approved = await approveProductWithDeps(deps, { productId, actorId })
    return {
      product_id: productId,
      title: approved.title,
      status: "approved",
      reason: null,
    }
  } catch (err) {
    if (err instanceof ApprovalRejected) {
      return {
        product_id: productId,
        title: err.title,
        status: "skipped",
        reason: err.message,
      }
    }
    return {
      product_id: productId,
      title: null,
      status: "failed",
      reason: err instanceof Error ? err.message : "Goedkeuren is mislukt.",
    }
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
      results.push({
        product_id: product.id,
        title: null,
        status: "skipped",
        reason: brandId
          ? "Dit product hoort niet bij het gekozen merk."
          : "Dit product hoort niet bij de gekozen fabrikant.",
      })
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
