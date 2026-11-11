/**
 * Row-oriented product import: header row once, each following non-empty
 * row is exactly one product. Never treats columns as products.
 */

import {
  COLUMN_ALIASES,
  CANONICAL_COLUMNS,
  IGNORED_IMPORT_COLUMNS,
  IGNORED_IMPORT_FIELDS,
} from "./import-columns"

const REQUIREMENT_LABEL =
  [
    "verplicht",
    "optioneel",
    "optionele?",
    "voorwaardelijk verplicht",
    "automatisch",
    "admincontrole",
    "via seller-wizard",
    // EN / DE / FR suffixes used by localized Seller templates
    "conditionally required",
    "required",
    "optional",
    "conditional",
    "automatic",
    "pflicht",
    "bedingt erforderlich",
    "bedingt",
    "automatisch",
    "obligatoire sous condition",
    "obligatoire",
    "facultatif",
    "conditionnel",
    "automatique",
  ].join("|")

export function decodeImportText(value: string): string {
  return String(value || "")
    .replace(/&#x0*a;/gi, "\n")
    .replace(/&#x0*d;/gi, "\n")
    .replace(/&#10;/g, "\n")
    .replace(/&#13;/g, "\n")
    .replace(/&nbsp;/gi, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
}

export function normalizeHeader(value: string): string {
  return decodeImportText(value)
    .replace(/[\u00a0\u1680\u2000-\u200b\u202f\u205f\u3000]/g, " ")
    .replace(/[\r\n\t]+/g, " ")
    .trim()
    .toLowerCase()
    .replace(/[_./]+/g, " ")
    .replace(/\s+/g, " ")
}

export const CORE_IMPORT_HEADER_FIELDS = [
  "title",
  "brand",
  "category",
  "ean",
  "mpn",
  "sku",
] as const

export const HEADER_MISSING_MESSAGE =
  "Geen herkenbare kolomkoppen gevonden. Zet op de eerste regel minimaal: Productnaam, Merk, Categorie, en EAN/GTIN, Fabrikantnummer/MPN of Seller SKU."

export const TRANSPOSE_MESSAGE =
  "Het bestand lijkt getransponeerd: veldnamen staan in de eerste kolom in plaats van op de kopregel. Zet kolomkoppen op regel 1 en elk product op een eigen gegevensregel."

export const NO_DATA_ROWS_MESSAGE =
  "Geen geldige gegevensregels gevonden onder de kolomkoppen."

const HEADER_LIKE_TITLES = new Set(
  [
    "productnaam",
    "merk",
    "categorie",
    "productcategorie",
    "ean",
    "ean gtin",
    "gtin",
    "mpn",
    "fabrikantnummer",
    "seller sku",
    "sku",
    "artikelnummer",
    "ce",
    "gpsr",
    "hoofdafbeelding",
    "title",
    "brand",
    "category",
    "processor",
    "vermogen",
    "kleur",
    "nederlandse naam",
    "kolomnaam",
  ].map((v) => normalizeHeader(v))
)

export type ParsedImportGrid = {
  headers: string[]
  rows: string[][]
  excel_row_numbers: number[]
  header_excel_row: number
  skipped_empty: number
  skipped_header_rows: number
  structure_error: string | null
  transposed: boolean
}

export function stripRequirementSuffix(normalized: string): string {
  let n = normalized.trim()
  const paren = new RegExp(
    `\\s*[\\(\\[](?:${REQUIREMENT_LABEL})[\\)\\]]\\s*$`,
    "i"
  )
  const trailing = new RegExp(`\\s+(?:${REQUIREMENT_LABEL})\\s*$`, "i")
  const leading = new RegExp(
    `^(?:${REQUIREMENT_LABEL}|optionele?)\\s+`,
    "i"
  )
  for (let i = 0; i < 3; i++) {
    const next = n.replace(paren, "").replace(trailing, "").replace(leading, "").trim()
    if (next === n) break
    n = next
  }
  return n
}

export function headerMatchKey(value: string): string {
  return stripRequirementSuffix(normalizeHeader(value))
}

export function padCells(cells: string[], width: number): string[] {
  const row = (cells || []).map((c) => String(c ?? ""))
  while (row.length < width) row.push("")
  return row
}

/**
 * Excel often omits empty A–C cells. Headers then start at index 3 while
 * packed data starts at index 0. Shift packed rows so column indexes match.
 */
export function alignRowToHeaders(headers: string[], cells: string[]): string[] {
  const width = Math.max(headers.length, cells.length)
  const row = padCells(cells, width)
  const firstHeader = headers.findIndex((h) => String(h || "").trim() !== "")
  const firstData = row.findIndex((c) => String(c || "").trim() !== "")
  if (firstHeader > 0 && firstData === 0) {
    return padCells([...Array(firstHeader).fill(""), ...row], width)
  }
  return padCells(row, headers.length)
}

export function canonicalFieldFromHeader(
  cell: string,
  mode: "strict" | "loose" = "loose"
): string | null {
  const n = stripRequirementSuffix(normalizeHeader(cell))
  if (!n) return null
  for (const col of CANONICAL_COLUMNS) {
    const aliases = (COLUMN_ALIASES[col] || [col]).map((a) =>
      stripRequirementSuffix(normalizeHeader(a))
    )
    if (aliases.includes(n)) return col
    if (mode === "strict") continue
    const hit = aliases.find(
      (a) => a.length >= 5 && (n === a || n.startsWith(`${a} `) || a.startsWith(`${n} `))
    )
    if (hit) return col
  }
  return null
}

export function headerMatchScore(cells: string[]): {
  score: number
  fields: string[]
} {
  const fields: string[] = []
  for (const cell of cells) {
    const field = canonicalFieldFromHeader(cell, "strict")
    if (field && !fields.includes(field)) fields.push(field)
  }
  const coreHits = CORE_IMPORT_HEADER_FIELDS.filter((f) => fields.includes(f))
  return { score: coreHits.length, fields }
}

export function isHeaderLikeTitle(value: string | undefined): boolean {
  const n = stripRequirementSuffix(normalizeHeader(value || ""))
  return Boolean(n) && HEADER_LIKE_TITLES.has(n)
}

function firstColumnCells(table: string[][]): string[] {
  return table.map((row) => row[0] || "")
}

export function parseImportGrid(rawRows: string[][]): ParsedImportGrid {
  const nonemptyMeta = rawRows
    .map((row, idx) => ({ row, excelRow: idx + 1 }))
    .filter(({ row }) => row.some((c) => String(c || "").trim() !== ""))
  const skipped_empty = rawRows.length - nonemptyMeta.length

  const empty: ParsedImportGrid = {
    headers: [],
    rows: [],
    excel_row_numbers: [],
    header_excel_row: 1,
    skipped_empty,
    skipped_header_rows: 0,
    structure_error: HEADER_MISSING_MESSAGE,
    transposed: false,
  }
  if (!nonemptyMeta.length) return empty

  const table = nonemptyMeta.map((m) => m.row)
  const rowScore = headerMatchScore(table[0] || [])
  const colScore = headerMatchScore(firstColumnCells(table))
  const transposed = colScore.score >= 3 && colScore.score > rowScore.score
  if (transposed) {
    return {
      ...empty,
      headers: table[0] || [],
      transposed: true,
      structure_error: TRANSPOSE_MESSAGE,
    }
  }

  let headerIndex = table.findIndex((row) => headerMatchScore(row).score >= 2)
  if (headerIndex < 0) {
    return {
      ...empty,
      headers: table[0] || [],
      structure_error: HEADER_MISSING_MESSAGE,
    }
  }

  const headerRow = (table[headerIndex] || []).map((h) =>
    decodeImportText(h).replace(/[\u00a0]/g, " ").replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").trim()
  )
  const headerFields = headerMatchScore(headerRow).fields
  const hasTitleBrandCategory =
    headerFields.includes("title") &&
    headerFields.includes("brand") &&
    headerFields.includes("category")
  const hasIdentityHeader =
    headerFields.includes("ean") ||
    headerFields.includes("mpn") ||
    headerFields.includes("sku")
  if (!hasTitleBrandCategory && !(headerFields.includes("title") && hasIdentityHeader)) {
    return {
      ...empty,
      headers: headerRow,
      header_excel_row: nonemptyMeta[headerIndex]?.excelRow ?? 1,
      structure_error: HEADER_MISSING_MESSAGE,
    }
  }

  const rows: string[][] = []
  const excel_row_numbers: number[] = []
  let skipped_header_rows = 0
  let skippedEmptyTemplateRows = 0
  const coreImportFields = new Set([
    "title",
    "brand",
    "ean",
    "mpn",
    "sku",
    "category",
    "subcategory",
    "subcategory_l3",
  ])
  for (let i = headerIndex + 1; i < table.length; i++) {
    const row = table[i]
    if (headerMatchScore(row).score >= 3) {
      skipped_header_rows += 1
      continue
    }
    const aligned = alignRowToHeaders(headerRow, row)
    const titleIdx = headerRow.findIndex((h) => canonicalFieldFromHeader(h) === "title")
    const titleCell = titleIdx >= 0 ? aligned[titleIdx] : aligned[0]
    if (isHeaderLikeTitle(titleCell) && headerMatchScore(row).score >= 1) {
      skipped_header_rows += 1
      continue
    }
    // Skip pre-filled Excel template rows that only have auto formulas/warnings
    // (no product identity or category content yet).
    const hasCoreContent = headerRow.some((header, colIdx) => {
      const field = canonicalFieldFromHeader(header)
      if (!field || !coreImportFields.has(field)) return false
      return String(aligned[colIdx] || "").trim() !== ""
    })
    if (!hasCoreContent) {
      skippedEmptyTemplateRows += 1
      continue
    }
    rows.push(aligned)
    excel_row_numbers.push(nonemptyMeta[i]?.excelRow ?? i + 1)
  }

  return {
    headers: headerRow,
    rows,
    excel_row_numbers,
    header_excel_row: nonemptyMeta[headerIndex]?.excelRow ?? 1,
    skipped_empty: skipped_empty + skippedEmptyTemplateRows,
    skipped_header_rows,
    structure_error: rows.length ? null : NO_DATA_ROWS_MESSAGE,
    transposed: false,
  }
}

function isIgnoredImportHeader(header: string): boolean {
  const n = stripRequirementSuffix(normalizeHeader(header))
  if (!n) return false
  for (const field of IGNORED_IMPORT_FIELDS) {
    const aliases = [
      field.column,
      field.nl_name,
      ...(COLUMN_ALIASES[field.column] || field.aliases || []),
    ].map((a) => stripRequirementSuffix(normalizeHeader(a)))
    if (aliases.includes(n)) return true
    if (
      aliases.some(
        (a) => a.length >= 5 && (n === a || n.startsWith(`${a} `) || a.startsWith(`${n} `))
      )
    ) {
      return true
    }
  }
  return IGNORED_IMPORT_COLUMNS.has(n.replace(/\s+/g, "_"))
}

export function unknownImportColumns(
  headers: string[],
  mapping: Record<string, string | null>
): string[] {
  const used = new Set(
    Object.values(mapping).filter((v): v is string => Boolean(v))
  )
  return headers.filter((h) => {
    if (!h.trim() || used.has(h)) return false
    if (isIgnoredImportHeader(h)) return false
    return true
  })
}

export function splitDelimitedText(text: string): string[][] {
  const src = text.replace(/^\uFEFF/, "")
  const firstLine = src.split(/\r?\n/).find((l) => l.trim()) || ""
  const commas = (firstLine.match(/,/g) || []).length
  const semis = (firstLine.match(/;/g) || []).length
  const tabs = (firstLine.match(/\t/g) || []).length
  let delimiter = ","
  if (tabs > commas && tabs > semis) delimiter = "\t"
  else if (semis > commas) delimiter = ";"

  const rows: string[][] = []
  let row: string[] = []
  let cell = ""
  let inQuotes = false
  for (let i = 0; i < src.length; i++) {
    const ch = src[i]
    const next = src[i + 1]
    if (inQuotes) {
      if (ch === '"' && next === '"') {
        cell += '"'
        i++
      } else if (ch === '"') {
        inQuotes = false
      } else {
        cell += ch
      }
      continue
    }
    if (ch === '"') {
      inQuotes = true
      continue
    }
    if (ch === delimiter) {
      row.push(cell.trim())
      cell = ""
      continue
    }
    if (ch === "\n" || (ch === "\r" && next === "\n") || ch === "\r") {
      row.push(cell.trim())
      cell = ""
      rows.push(row)
      row = []
      if (ch === "\r" && next === "\n") i++
      continue
    }
    cell += ch
  }
  row.push(cell.trim())
  if (row.some((c) => c !== "")) rows.push(row)
  return rows
}
