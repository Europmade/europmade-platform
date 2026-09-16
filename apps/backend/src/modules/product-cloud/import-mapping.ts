/**
 * CSV/XLSX product import — column aliases, preview validation, no silent partial import.
 */

import { isValidGtin, normalizeGtinDigits } from "./gtin-validation"
import {
  CANONICAL_COLUMNS as COLUMN_LIST,
  COLUMN_ALIASES as ALIAS_MAP,
  IMPORT_FIELDS,
} from "./import-columns"
import {
  isHeaderLikeTitle,
  parseImportGrid,
  splitDelimitedText,
  canonicalFieldFromHeader,
  headerMatchKey,
  normalizeHeader as normalizeImportHeader,
  alignRowToHeaders,
} from "./import-table"

export const CANONICAL_COLUMNS = COLUMN_LIST

export type CanonicalColumn = string

export const COLUMN_ALIASES: Record<string, string[]> = ALIAS_MAP

export function normalizeHeader(value: string): string {
  return normalizeImportHeader(value)
}

function fieldLabel(canonical: string): { display: string; internal: string } {
  const row = FIELD_GUIDE.find((f) => f.column === canonical)
  return {
    display: row?.nl_name || canonical,
    internal: canonical,
  }
}

function missingMessage(excelRow: number, canonical: string, technical?: string): string {
  const { display, internal } = fieldLabel(canonical)
  if (technical) {
    return `Excel-regel ${excelRow}, veld ${display} (interne naam: ${internal}): uitlezen of mappen van de cel is mislukt. ${technical}`
  }
  return `Excel-regel ${excelRow}, veld ${display} (interne naam: ${internal}): waarde ontbreekt.`
}

function isPlaceholderIdentifier(value: string): boolean {
  const v = value.trim()
  if (!v) return true
  if (/^DRAFT-/i.test(v)) return true
  if (/^IMPORT_REF$/i.test(v)) return true
  return false
}

export type FieldGuideRow = {
  column: string
  nl_name: string
  meaning: string
  required: string
  example: string
  allowed: string
  help: string
}

export const FIELD_GUIDE: FieldGuideRow[] = IMPORT_FIELDS.map((f) => ({
  column: f.column,
  nl_name: f.nl_name,
  meaning: f.meaning,
  required: f.required,
  example: f.example,
  allowed: f.allowed,
  help: f.help,
}))

export function suggestMapping(
  headers: string[],
  extraCodes: string[] = []
): Record<string, string | null> {
  const mapping: Record<string, string | null> = {}
  const unused = [...headers]
  const take = (canonical: string, pred: (header: string) => boolean) => {
    if (mapping[canonical]) return
    const idx = unused.findIndex(pred)
    mapping[canonical] = idx >= 0 ? unused.splice(idx, 1)[0] : mapping[canonical] ?? null
  }
  for (const col of CANONICAL_COLUMNS) {
    take(col, (h) => canonicalFieldFromHeader(h, "strict") === col)
  }
  for (const col of CANONICAL_COLUMNS) {
    take(col, (h) => canonicalFieldFromHeader(h, "loose") === col)
  }
  for (const code of extraCodes) {
    take(code, (h) => {
      const n = headerMatchKey(h)
      const aliases = [code, code.replace(/_/g, " ")].map((a) => headerMatchKey(a))
      return aliases.includes(n)
    })
  }
  for (const col of CANONICAL_COLUMNS) {
    if (mapping[col] === undefined) mapping[col] = null
  }
  return mapping
}

export function headerIndexForSource(
  headers: string[],
  source: string | null | undefined
): number {
  if (!source) return -1
  const exact = headers.findIndex((h) => h === source)
  if (exact >= 0) return exact
  const key = headerMatchKey(source)
  if (!key) return -1
  return headers.findIndex((h) => headerMatchKey(h) === key)
}

export function parseCsv(text: string): { headers: string[]; rows: string[][] } {
  const grid = parseImportGrid(splitDelimitedText(text))
  return { headers: grid.headers, rows: grid.rows }
}

export type ImportIssue = {
  row: number
  field: string
  message: string
  blocking?: boolean
}

export type ImportPreviewRow = {
  row: number
  values: Record<string, string>
  status: "new" | "existing" | "error"
  issues: ImportIssue[]
  category_resolution?: {
    status: "linked" | "suggested" | "pending"
    raw: string
    matched: { id: string; name: string; slug: string } | null
    suggestions: Array<{ id: string; name: string; slug: string }>
  }
}

export function mappingColumnIndexes(
  headers: string[],
  mapping: Record<string, string | null>
): Record<string, number> {
  const indexes: Record<string, number> = {}
  for (const [field, source] of Object.entries(mapping)) {
    indexes[field] = source ? headerIndexForSource(headers, source) : -1
  }
  return indexes
}

export type MappedImportRecord = {
  values: Record<string, string>
  read_errors: Record<string, string>
}

/**
 * Single representation: headers + column indexes + aligned cells.
 * Preview, validation and commit must all use this output.
 */
export function materializeMappedRows(
  headers: string[],
  rows: string[][],
  mapping: Record<string, string | null>
): { indexes: Record<string, number>; records: MappedImportRecord[] } {
  const indexes = mappingColumnIndexes(headers, mapping)
  const records = rows.map((cells) => {
    const aligned = alignRowToHeaders(headers, cells)
    const values: Record<string, string> = {}
    const read_errors: Record<string, string> = {}
    for (const [field, idx] of Object.entries(indexes)) {
      if (idx < 0) continue
      if (idx >= aligned.length) {
        read_errors[field] =
          `kolomindex ${idx} valt buiten de gegevensregel (${aligned.length} cellen)`
        values[field] = ""
        continue
      }
      values[field] = String(aligned[idx] ?? "").trim()
    }
    return { values, read_errors }
  })
  return { indexes, records }
}

export function applyMapping(
  headers: string[],
  rows: string[][],
  mapping: Record<string, string | null>
): Record<string, string>[] {
  return materializeMappedRows(headers, rows, mapping).records.map((r) => r.values)
}

export function validateImportRows(
  mapped: Record<string, string>[],
  existingEans: Set<string>,
  foreignEans: Set<string> = new Set(),
  existingMpns: Set<string> = new Set(),
  foreignMpns: Set<string> = new Set(),
  excelRowNumbers?: number[],
  readErrors?: Array<Record<string, string>>
): {
  preview: ImportPreviewRow[]
  summary: {
    rows: number
    new_products: number
    existing_products: number
    error_rows: number
    missing_ean: number
    missing_required: number
    concept_without_ean: number
  }
} {
  const preview: ImportPreviewRow[] = []
  let missing_ean = 0
  let missing_required = 0
  let concept_without_ean = 0
  for (let i = 0; i < mapped.length; i++) {
    const values = mapped[i]
    const issues: ImportIssue[] = []
    const excelRow = excelRowNumbers?.[i] ?? i + 2
    const eanRaw = (values.ean || "").replace(/\s/g, "")
    const ean = eanRaw && !isPlaceholderIdentifier(eanRaw) ? normalizeGtinDigits(eanRaw) : ""
    const mpn = isPlaceholderIdentifier(values.mpn || "") ? "" : (values.mpn || "").trim()
    const sku = isPlaceholderIdentifier(values.sku || "") ? "" : (values.sku || "").trim()
    const rowReadErrors = readErrors?.[i] || {}
    if (!ean) missing_ean += 1
    if (ean && !isValidGtin(ean)) {
      issues.push({
        row: excelRow,
        field: "ean",
        message: "EAN/GTIN is ongeldig (checksum of lengte)",
      })
    }
    const existingGtin = ean ? existingEans.has(ean) : false
    const existingMpn = !ean && mpn ? existingMpns.has(mpn) : false
    const existing = existingGtin || existingMpn
    if (ean && foreignEans.has(ean)) {
      issues.push({
        row: excelRow,
        field: "ean",
        message: "EAN hoort bij een product van een andere seller",
      })
    }
    if (!ean && mpn && foreignMpns.has(mpn)) {
      issues.push({
        row: excelRow,
        field: "mpn",
        message: "MPN hoort bij een product van een andere seller",
      })
    }
    const blockedByForeign =
      Boolean(ean && foreignEans.has(ean)) ||
      Boolean(!ean && mpn && foreignMpns.has(mpn))
    if (!existing && !blockedByForeign) {
      if (!ean) concept_without_ean += 1
      if (!ean && !mpn && !sku) {
        missing_required += 1
        issues.push({
          row: excelRow,
          field: "identifier",
          message: `Excel-regel ${excelRow}, veld identificatie (interne naam: identifier): vul minimaal één echte identificatie in (EAN/GTIN, MPN of Seller SKU). DRAFT- en IMPORT_REF tellen niet mee.`,
        })
      }
      if (rowReadErrors.title) {
        missing_required += 1
        issues.push({
          row: excelRow,
          field: "title",
          message: missingMessage(excelRow, "title", rowReadErrors.title),
        })
      } else if (!values.title) {
        missing_required += 1
        issues.push({
          row: excelRow,
          field: "title",
          message: missingMessage(excelRow, "title"),
        })
      } else if (isHeaderLikeTitle(values.title)) {
        missing_required += 1
        issues.push({
          row: excelRow,
          field: "title",
          message: `Excel-regel ${excelRow}, veld Productnaam (interne naam: title): deze regel lijkt een kolomkop, geen product.`,
        })
      }
      if (rowReadErrors.brand) {
        missing_required += 1
        issues.push({
          row: excelRow,
          field: "brand",
          message: missingMessage(excelRow, "brand", rowReadErrors.brand),
        })
      } else if (!values.brand) {
        missing_required += 1
        issues.push({
          row: excelRow,
          field: "brand",
          message: missingMessage(excelRow, "brand"),
        })
      } else if (isHeaderLikeTitle(values.brand) && values.brand === values.title) {
        issues.push({
          row: excelRow,
          field: "brand",
          message: `Excel-regel ${excelRow}, veld Merk (interne naam: brand): kolomkoppen mogen niet als productwaarden worden opgeslagen.`,
        })
      }
      if (rowReadErrors.category) {
        missing_required += 1
        issues.push({
          row: excelRow,
          field: "category",
          message: missingMessage(excelRow, "category", rowReadErrors.category),
        })
      } else if (!values.category && !values.category_raw) {
        missing_required += 1
        issues.push({
          row: excelRow,
          field: "category",
          message: missingMessage(excelRow, "category"),
        })
      } else if (
        values.category_status === "pending" ||
        values.category_status === "suggested"
      ) {
        issues.push({
          row: excelRow,
          field: "category",
          blocking: false,
          message:
            "Categorie niet herkend — kies een EuropMade-categorie.",
        })
      }
    }
    if (values.regular_price && Number.isNaN(Number(values.regular_price.replace(",", ".")))) {
      issues.push({
        row: excelRow,
        field: "regular_price",
        message: "Prijs is geen getal",
      })
    }
    const blockingIssues = issues.filter((issue) => issue.blocking !== false)
    preview.push({
      row: excelRow,
      values,
      status: blockingIssues.length ? "error" : existing ? "existing" : "new",
      issues,
    })
  }
  return {
    preview,
    summary: {
      rows: mapped.length,
      new_products: preview.filter((p) => p.status === "new").length,
      existing_products: preview.filter((p) => p.status === "existing").length,
      error_rows: preview.filter((p) => p.status === "error").length,
      missing_ean,
      missing_required,
      concept_without_ean,
    },
  }
}
