/**
 * Turns one import commit and its preview into a single result table.
 * Product rows and offer rows are counted separately. Optional gaps never
 * become a failed import.
 */

export type ImportResultTone = "green" | "orange" | "red"

export type ImportResultStep = "create" | "submit" | "publication" | "sale"

export type ImportResultItem = {
  label: string
  step: ImportResultStep | "optional" | "warning" | "followup"
  kind: "brand" | "category" | "field" | "other"
}

export type ImportResultRow = {
  key: string
  row: number
  title: string
  ean: string
  brand: string
  excelCategory: string
  europmadeCategory: string | null
  categoryUncertain: boolean
  tone: ImportResultTone
  productId: string | null
  required: ImportResultItem[]
  optional: ImportResultItem[]
  warnings: ImportResultItem[]
  followUps: ImportResultItem[]
  errorReason: string | null
  action: "created" | "updated" | "reused" | "failed"
  offerCounted: "create" | "update" | "none"
}

export type ImportResultSummary = {
  processedRows: number
  importedProducts: number
  createdProducts: number
  reusedProducts: number
  updatedProducts: number
  newOffers: number
  updatedOffers: number
  skippedRows: number
  errorRows: number
  green: number
  orange: number
  red: number
}

export type ImportResultView = {
  phase: "result" | "preview"
  rows: ImportResultRow[]
  summary: ImportResultSummary
}

type Issue = {
  field: string
  message: string
  blocking?: boolean
  severity?: string
  resolution?: string
  blocks?: string[]
}

type PreviewRow = {
  row: number
  status: "new" | "existing" | "error"
  values: Record<string, string>
  issues: Issue[]
  offer_action?: "create" | "update" | "none"
  category_resolution?: {
    status?: string
    raw?: string
    matched?: { name: string } | null
  }
}

type CommitProduct = {
  row: number
  product_id: string
  title: string
  action: "created" | "updated" | "reused"
  category_status?: "linked" | "category_pending"
  category_raw?: string
  category_name?: string | null
  warning?: string | null
}

export type SellerImportCommit = {
  created_count?: number
  updated_count?: number
  reused_count?: number
  skipped_count?: number
  error_count?: number
  received_rows?: number
  products?: CommitProduct[]
  errors?: string[]
}

export type SellerImportPreview = {
  field_labels?: Array<{ column: string; nl_name: string }>
  summary?: { rows?: number; skipped_empty?: number }
  preview?: PreviewRow[]
}

const LATER = new Set(["submit", "approval", "publication", "sale"])

export function sellerImportPhase(input: {
  hasPreview: boolean
  hasResult: boolean
}): "upload" | "preview" | "result" {
  if (input.hasResult) return "result"
  if (input.hasPreview) return "preview"
  return "upload"
}

export function publicImportFieldLabel(
  field: string,
  message: string,
  labels: Record<string, string>
): string {
  const known = labels[field]?.trim()
  if (known) return known
  const parsed = /veld\s+(.+?)\s+\(interne naam:/i.exec(message)
  if (parsed?.[1]?.trim()) return parsed[1].trim()
  if (field.includes("_")) return ""
  return field
}

function stripInternalNames(text: string): string {
  return text
    .replace(/\s*\(interne naam:[^)]+\)/gi, "")
    .replace(/\b[a-z]+_[a-z0-9_]+\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim()
}

function stepFor(blocks: string[]): ImportResultStep {
  if (blocks.includes("submit") || blocks.includes("approval")) return "submit"
  if (blocks.includes("sale")) return "sale"
  if (blocks.includes("publication")) return "publication"
  return "create"
}

function offerWasStored(action: "create" | "update" | "none", warning: string | null): "create" | "update" | "none" {
  if (action === "none") return "none"
  if (warning && /verkoopaanbod|geen prijs 0|price/i.test(warning)) return "none"
  return action
}

function classifyIssue(
  issue: Issue,
  labels: Record<string, string>
): { bucket: "required" | "optional" | "warning" | "error" | "followup"; item: ImportResultItem } | null {
  if (issue.field === "manual_languages" || issue.field === "manual_url") return null
  const label = publicImportFieldLabel(issue.field, issue.message, labels) || issue.field
  if (issue.field === "shipping_profile_id") {
    return {
      bucket: "followup",
      item: { label, step: "followup", kind: "field" },
    }
  }
  const blocks = issue.blocks || []
  const later = blocks.filter((step) => LATER.has(step))
  if (issue.blocking || blocks.includes("draft")) {
    return {
      bucket: "error",
      item: { label, step: "create", kind: "field" },
    }
  }
  if (issue.field === "brand" && issue.severity === "requires_review" && later.length === 0) {
    return {
      bucket: "warning",
      item: { label, step: "warning", kind: "brand" },
    }
  }
  if (issue.field === "category" && (issue.severity === "requires_review" || later.length > 0)) {
    return {
      bucket: "required",
      item: { label, step: stepFor(later.length ? later : ["publication"]), kind: "category" },
    }
  }
  if (later.length > 0 || issue.severity === "missing" || issue.severity === "invalid") {
    return {
      bucket: "required",
      item: { label, step: stepFor(later), kind: "field" },
    }
  }
  if (issue.severity === "requires_review") {
    return {
      bucket: "warning",
      item: { label, step: "warning", kind: "other" },
    }
  }
  return {
    bucket: "optional",
    item: { label, step: "optional", kind: "field" },
  }
}

function emptySummary(skipped: number): ImportResultSummary {
  return {
    processedRows: 0,
    importedProducts: 0,
    createdProducts: 0,
    reusedProducts: 0,
    updatedProducts: 0,
    newOffers: 0,
    updatedOffers: 0,
    skippedRows: skipped,
    errorRows: 0,
    green: 0,
    orange: 0,
    red: 0,
  }
}

export function buildSellerImportResult(
  commit: SellerImportCommit,
  preview: SellerImportPreview | null
): ImportResultView {
  const labels: Record<string, string> = {}
  for (const field of preview?.field_labels || []) {
    if (field.column && field.nl_name) labels[field.column] = field.nl_name
  }
  const products = commit.products || []
  const byRow = new Map(products.map((product) => [product.row, product]))
  const previewRows = preview?.preview || []
  const seen = new Set<number>()
  const rows: ImportResultRow[] = []

  const pushStored = (
    product: CommitProduct,
    source: PreviewRow | undefined
  ) => {
    seen.add(product.row)
    const required: ImportResultItem[] = []
    const optional: ImportResultItem[] = []
    const warnings: ImportResultItem[] = []
    const followUps: ImportResultItem[] = []
    for (const issue of source?.issues || []) {
      const classified = classifyIssue(issue, labels)
      if (!classified) continue
      if (classified.bucket === "required") required.push(classified.item)
      else if (classified.bucket === "optional") optional.push(classified.item)
      else if (classified.bucket === "warning") warnings.push(classified.item)
      else if (classified.bucket === "followup") followUps.push(classified.item)
    }
    const linkedName =
      product.category_status === "linked" ? product.category_name || null : null
    const categoryUncertain =
      product.category_status === "category_pending" ||
      source?.category_resolution?.status === "pending" ||
      source?.category_resolution?.status === "suggested"
    if (categoryUncertain && !required.some((item) => item.kind === "category")) {
      required.push({
        label: labels.category || "",
        step: "publication",
        kind: "category",
      })
    }
    const tone: ImportResultTone =
      required.length > 0 || warnings.length > 0 ? "orange" : "green"
    const offerAction = source?.offer_action || "none"
    rows.push({
      key: product.product_id || `row-${product.row}`,
      row: product.row,
      title: product.title || source?.values.title || "",
      ean: source?.values.ean || source?.values.gtin || "",
      brand: source?.values.brand || "",
      excelCategory:
        source?.category_resolution?.raw ||
        source?.values.category_raw ||
        source?.values.category ||
        product.category_raw ||
        "",
      europmadeCategory: linkedName,
      categoryUncertain,
      tone,
      productId: product.product_id,
      required,
      optional,
      warnings,
      followUps,
      errorReason: null,
      action: product.action,
      offerCounted: offerWasStored(offerAction, product.warning || null),
    })
  }

  for (const source of previewRows) {
    const product = byRow.get(source.row)
    if (product) {
      pushStored(product, source)
      continue
    }
    seen.add(source.row)
    const blocking = source.issues.find(
      (issue) => issue.blocking || (issue.blocks || []).includes("draft")
    )
    const reason = stripInternalNames(
      blocking?.message ||
        source.issues[0]?.message ||
        ""
    )
    rows.push({
      key: `failed-${source.row}`,
      row: source.row,
      title: source.values.title || "",
      ean: source.values.ean || source.values.gtin || "",
      brand: source.values.brand || "",
      excelCategory:
        source.category_resolution?.raw ||
        source.values.category_raw ||
        source.values.category ||
        "",
      europmadeCategory: null,
      categoryUncertain: true,
      tone: "red",
      productId: null,
      required: [],
      optional: [],
      warnings: [],
      followUps: [],
      errorReason: reason || null,
      action: "failed",
      offerCounted: "none",
    })
  }

  for (const product of products) {
    if (!seen.has(product.row)) pushStored(product, undefined)
  }

  rows.sort((a, b) => a.row - b.row)
  const summary = emptySummary(
    commit.skipped_count ?? preview?.summary?.skipped_empty ?? 0
  )
  summary.processedRows = rows.length
  for (const row of rows) {
    if (row.tone === "red") {
      summary.red += 1
      summary.errorRows += 1
      continue
    }
    summary.importedProducts += 1
    if (row.tone === "green") summary.green += 1
    else summary.orange += 1
    if (row.action === "created") summary.createdProducts += 1
    else if (row.action === "updated") summary.updatedProducts += 1
    else if (row.action === "reused") summary.reusedProducts += 1
    if (row.offerCounted === "create") summary.newOffers += 1
    else if (row.offerCounted === "update") summary.updatedOffers += 1
  }
  return { phase: "result", rows, summary }
}

function tally(rows: ImportResultRow[], skipped: number): ImportResultSummary {
  const summary = emptySummary(skipped)
  summary.processedRows = rows.length
  for (const row of rows) {
    if (row.tone === "red") {
      summary.red += 1
      summary.errorRows += 1
      continue
    }
    summary.importedProducts += 1
    if (row.tone === "green") summary.green += 1
    else summary.orange += 1
    if (row.action === "created") summary.createdProducts += 1
    else if (row.action === "updated") summary.updatedProducts += 1
    else if (row.action === "reused") summary.reusedProducts += 1
    if (row.offerCounted === "create") summary.newOffers += 1
    else if (row.offerCounted === "update") summary.updatedOffers += 1
  }
  return summary
}

/** Preview rows use the same green / orange / red rules as the import result. */
export function buildSellerImportPreview(
  preview: SellerImportPreview,
  categoryOverrides?: Record<string, string>
): ImportResultView {
  const labels: Record<string, string> = {}
  for (const field of preview.field_labels || []) {
    if (field.column && field.nl_name) labels[field.column] = field.nl_name
  }
  const rows: ImportResultRow[] = (preview.preview || []).map((source) => {
    const required: ImportResultItem[] = []
    const optional: ImportResultItem[] = []
    const warnings: ImportResultItem[] = []
    const followUps: ImportResultItem[] = []
    let failed = source.status === "error"
    let errorReason: string | null = null
    for (const issue of source.issues || []) {
      const classified = classifyIssue(issue, labels)
      if (!classified) continue
      if (classified.bucket === "error") {
        failed = true
        errorReason = errorReason || stripInternalNames(issue.message)
      } else if (classified.bucket === "required") required.push(classified.item)
      else if (classified.bucket === "optional") optional.push(classified.item)
      else if (classified.bucket === "followup") followUps.push(classified.item)
      else warnings.push(classified.item)
    }
    const chosen = categoryOverrides?.[String(source.row)]?.trim() || ""
    const matchedName =
      source.category_resolution?.status === "linked"
        ? source.category_resolution.matched?.name || null
        : source.category_resolution?.matched?.name &&
            source.category_resolution.status !== "pending" &&
            source.category_resolution.status !== "suggested"
          ? source.category_resolution.matched.name
          : null
    const europmadeCategory = chosen || matchedName
    const categoryUncertain = !europmadeCategory
    if (
      categoryUncertain &&
      !failed &&
      !required.some((item) => item.kind === "category")
    ) {
      required.push({
        label: labels.category || "",
        step: "publication",
        kind: "category",
      })
    }
    const tone: ImportResultTone = failed
      ? "red"
      : required.length > 0 || warnings.length > 0
        ? "orange"
        : "green"
    const action =
      tone === "red" ? "failed" : source.status === "existing" ? "reused" : "created"
    return {
      key: `preview-${source.row}`,
      row: source.row,
      title: source.values.title || "",
      ean: source.values.ean || source.values.gtin || "",
      brand: source.values.brand || "",
      excelCategory:
        source.category_resolution?.raw ||
        source.values.category_raw ||
        source.values.category ||
        "",
      europmadeCategory,
      categoryUncertain,
      tone,
      productId: null,
      required: tone === "red" ? [] : required,
      optional: tone === "red" ? [] : optional,
      warnings: tone === "red" ? [] : warnings,
      followUps: tone === "red" ? [] : followUps,
      errorReason: tone === "red" ? errorReason : null,
      action,
      offerCounted:
        tone === "red"
          ? "none"
          : offerWasStored(source.offer_action || "none", null),
    }
  })
  return {
    phase: "preview",
    rows,
    summary: tally(rows, preview.summary?.skipped_empty ?? 0),
  }
}
