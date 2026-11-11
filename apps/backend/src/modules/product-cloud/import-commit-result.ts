export type ImportCommitProduct = {
  row: number
  product_id: string
  title: string
  action: "created" | "updated" | "reused"
  lifecycle_status: string | null
  publication_status: string
  category_status: "linked" | "category_pending"
  category_raw: string
  category_name: string | null
  category_suggestions: string[]
  warning: string | null
}

export type ImportCommitResult = {
  success: true
  imported: number
  updated: number
  created_count: number
  updated_count: number
  reused_count: number
  warning_count: number
  skipped_count: number
  error_count: number
  product_ids: string[]
  products: ImportCommitProduct[]
  warnings: string[]
  errors: string[]
  message: string
  source_language_code: string
  translations: {
    provider_configured: boolean
    queued: number
    skipped_manual: number
  }
  received_rows?: number
  attention_count?: number
  new_brands?: number
  technical_error_rows?: number
}

export function categoryStatusFromResolution(input: {
  matched: { name: string } | null
  status?: string
}): "linked" | "category_pending" {
  return input.matched ? "linked" : "category_pending"
}

export function categoryPendingWarning(raw: string): string {
  const label = raw.trim() || "onbekend"
  return `Categorie niet herkend (${label}) — kies een EuropMade-categorie.`
}

export function buildImportCommitMessage(input: {
  created_count: number
  updated_count: number
  reused_count?: number
  warning_count: number
  error_count: number
}): string {
  const stored =
    input.created_count + input.updated_count + (input.reused_count ?? 0)
  if (input.error_count > 0 && stored === 0) {
    return "Import mislukt."
  }
  if (input.error_count > 0) {
    return "Import deels geslaagd. Technisch onverwerkbare regels zijn overgeslagen."
  }
  if (input.warning_count > 0) {
    return "Import geslaagd, met waarschuwingen."
  }
  return "Import geslaagd."
}

export function buildImportCommitResult(input: {
  products: ImportCommitProduct[]
  skipped_count?: number
  errors?: string[]
  source_language_code: string
  translations: ImportCommitResult["translations"]
}): ImportCommitResult {
  const created = input.products.filter((p) => p.action === "created")
  const updated = input.products.filter((p) => p.action === "updated")
  const reused = input.products.filter((p) => p.action === "reused")
  const warnings = input.products
    .map((p) => p.warning)
    .filter((w): w is string => Boolean(w))
  const errors = input.errors || []
  const created_count = created.length
  const updated_count = updated.length
  const warning_count = warnings.length
  const error_count = errors.length
  return {
    success: true,
    imported: created_count,
    updated: updated_count,
    created_count,
    updated_count,
    reused_count: reused.length,
    warning_count,
    skipped_count: input.skipped_count ?? 0,
    error_count,
    product_ids: input.products.map((p) => p.product_id),
    products: input.products,
    warnings,
    errors,
    message: buildImportCommitMessage({
      created_count,
      updated_count,
      reused_count: reused.length,
      warning_count,
      error_count,
    }),
    source_language_code: input.source_language_code,
    translations: input.translations,
  }
}

/** Shared by API client tests: 200 + warnings is success, not an unknown error. */
export function importCommitShouldShowUnknownError(input: {
  httpOk: boolean
  body: unknown
}): boolean {
  if (input.httpOk) return false
  const body = input.body
  if (body && typeof body === "object" && "product_ids" in body) {
    const ids = (body as { product_ids?: unknown }).product_ids
    if (Array.isArray(ids) && ids.length > 0) return false
  }
  return true
}

export function isGenericUnknownApiMessage(message: string): boolean {
  return /unknown error occurred/i.test(message.trim())
}

export function sanitizeImportUserMessage(
  message: string,
  fallback = "Import mislukt."
): string {
  if (!message.trim() || isGenericUnknownApiMessage(message)) return fallback
  return message
}

export function readImportApiErrorMessage(
  body: unknown,
  fallback = "Import mislukt."
): string {
  if (!body || typeof body !== "object") return fallback
  const record = body as {
    message?: unknown
    error?: { message?: unknown }
  }
  if (typeof record.message === "string" && record.message.trim()) {
    return sanitizeImportUserMessage(record.message, fallback)
  }
  if (typeof record.error?.message === "string" && record.error.message.trim()) {
    return sanitizeImportUserMessage(record.error.message, fallback)
  }
  return fallback
}

export function recoverImportCommitFromCatalog(input: {
  catalog: Array<{
    id: string
    title: string | null
    lifecycle_status?: string | null
    publication_status?: string | null
    category_assignment_status?: string | null
    category_names?: string[]
    identifier_value?: string | null
  }>
  preview: Array<{
    title: string
    ean?: string
    category_raw?: string
    suggestions?: string[]
  }>
  source_language_code?: string
}): ImportCommitResult | null {
  const products: ImportCommitProduct[] = []
  for (const [index, row] of input.preview.entries()) {
    const ean = (row.ean || "").replace(/\D/g, "")
    const want = row.title.trim().toLowerCase()
    const hit = input.catalog.find((item) => {
      const idValue = (item.identifier_value || "").replace(/\D/g, "")
      if (ean && idValue === ean) return true
      return Boolean(want) && (item.title || "").trim().toLowerCase() === want
    })
    if (!hit) continue
    const pending =
      hit.category_assignment_status === "category_pending" ||
      !(hit.category_names && hit.category_names.length)
    products.push({
      row: index + 2,
      product_id: hit.id,
      title: hit.title || row.title,
      action: "created",
      lifecycle_status: hit.lifecycle_status ?? "Concept",
      publication_status: hit.publication_status || "Concept",
      category_status: pending ? "category_pending" : "linked",
      category_raw: row.category_raw || "",
      category_name: hit.category_names?.[0] ?? null,
      category_suggestions: row.suggestions || [],
      warning: pending
        ? categoryPendingWarning(row.category_raw || "")
        : null,
    })
  }
  if (!products.length) return null
  return buildImportCommitResult({
    products,
    source_language_code: input.source_language_code || "nl",
    translations: {
      provider_configured: false,
      queued: 0,
      skipped_manual: 0,
    },
  })
}
