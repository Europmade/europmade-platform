/**
 * CSV/XLSX product import — column aliases and preview validation.
 * Incomplete rows become Concept drafts. Only a row that cannot be stored
 * without inventing identity, title or brand name is a technical failure.
 * One failed row does not reject the other rows. Nothing is published here.
 */

import { isValidGtin, normalizeGtinDigits } from "./gtin-validation"
import {
  classifyImportBrand,
  classifyImportIssue,
  conditionalFieldIssues,
  draftResolution,
  laterStepResolution,
  uniqueNewBrandCount,
  type ClassifiedImportIssue,
  type ImportBrandDecision,
} from "./import-row-policy"
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

export type ImportIssue = ClassifiedImportIssue

export type ImportBrandResolution = ImportBrandDecision

export const SELLER_IMPORT_REUSE_CONFIRMATION =
  "Bestaande centrale producten worden hergebruikt. De centrale productinformatie blijft ongewijzigd. Alleen je eigen offers worden aangemaakt of bijgewerkt."

export function importRowWantsOffer(values: Record<string, string>): boolean {
  return Boolean(
    values.regular_price?.trim() ||
      values.stock?.trim() ||
      values.shipping_cost?.trim() ||
      values.sku?.trim() ||
      values.delivery_days?.trim() ||
      values.promo_price?.trim() ||
      values.sales_status?.trim()
  )
}

export type ImportPreviewRow = {
  row: number
  values: Record<string, string>
  status: "new" | "existing" | "error"
  issues: ImportIssue[]
  brand_resolution?: ImportBrandResolution
  offer_action?: "create" | "update" | "none"
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
/**
 * Collect Afbeelding 2–10 (in order) then legacy Overige / mapped extra_image_urls.
 * Dedupes URLs; empty slots ignored. Does not invent columns.
 */
export function mergeExtraImageSlotsIntoValues(
  headers: string[],
  alignedCells: string[],
  values: Record<string, string>
): Record<string, string> {
  const seen = new Set<string>()
  const extras: string[] = []
  const add = (raw: string) => {
    const url = String(raw || "").trim()
    if (!url || seen.has(url)) return
    seen.add(url)
    extras.push(url)
  }
  for (let n = 2; n <= 10; n++) {
    const idx = headers.findIndex((h) => {
      const key = headerMatchKey(h)
      return (
        key === `afbeelding ${n}` ||
        key === `image ${n}` ||
        key === `bild ${n}`
      )
    })
    if (idx >= 0) add(String(alignedCells[idx] ?? ""))
  }
  for (const part of String(values.extra_image_urls || "").split(/[|;,\n]/)) {
    add(part)
  }
  // Primary is separate; keep at most 9 extras (10 images total with hoofdafbeelding).
  return {
    ...values,
    extra_image_urls: extras.slice(0, 9).join(" | "),
  }
}

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
    return {
      values: mergeExtraImageSlotsIntoValues(headers, aligned, values),
      read_errors,
    }
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

function collectProductSpecIssues(
  values: Record<string, string>,
  excelRow: number
): ImportIssue[] {
  // Lazy require keeps import-mapping free of circular init with product-specifications.
  const { mergeProductSpecSlotsIntoValues } = require("./product-specifications") as {
    mergeProductSpecSlotsIntoValues: (v: Record<string, string>) => {
      errors: string[]
    }
  }
  return mergeProductSpecSlotsIntoValues(values).errors.map((message) =>
    classifyImportIssue({
      row: excelRow,
      field: "specifications",
      severity: "invalid",
      supplied_value: null,
      blocks: ["publication"],
      resolution: laterStepResolution(["publication"]),
      message: `Excel-regel ${excelRow}: ${message} De oorspronkelijke specificatie blijft op de regel staan en wordt niet verzonnen of goedgekeurd.`,
    })
  )
}

export function validateImportRows(
  mapped: Record<string, string>[],
  existingEans: Set<string>,
  foreignEans: Set<string> = new Set(),
  existingMpns: Set<string> = new Set(),
  foreignMpns: Set<string> = new Set(),
  excelRowNumbers?: number[],
  readErrors?: Array<Record<string, string>>,
  sellerOfferKeys: Set<string> = new Set(),
  options?: {
    knownBrands?: Array<{ id: string; name: string }>
    sellerSkus?: Set<string>
  }
): {
  preview: ImportPreviewRow[]
  summary: {
    rows: number
    new_products: number
    existing_products: number
    error_rows: number
    technical_error_rows: number
    attention_rows: number
    recoverable_rows: number
    new_brands: number
    missing_ean: number
    missing_required: number
    concept_without_ean: number
    offers_to_create: number
    offers_to_update: number
  }
} {
  const preview: ImportPreviewRow[] = []
  let missing_ean = 0
  let missing_required = 0
  let concept_without_ean = 0
  const newBrandNames: string[] = []
  for (let i = 0; i < mapped.length; i++) {
    const values = mapped[i]
    const issues: ImportIssue[] = []
    const excelRow = excelRowNumbers?.[i] ?? i + 2
    const eanRaw = (values.ean || "").replace(/\s/g, "")
    const ean = eanRaw && !isPlaceholderIdentifier(eanRaw) ? normalizeGtinDigits(eanRaw) : ""
    const mpn = isPlaceholderIdentifier(values.mpn || "") ? "" : (values.mpn || "").trim()
    const sku = isPlaceholderIdentifier(values.sku || "") ? "" : (values.sku || "").trim()
    const rowReadErrors = readErrors?.[i] || {}
    const eanValid = Boolean(ean && isValidGtin(ean))
    if (!eanValid) missing_ean += 1
    if (ean && !eanValid) {
      issues.push(
        classifyImportIssue({
          row: excelRow,
          field: "ean",
          severity: "invalid",
          supplied_value: values.ean || eanRaw,
          blocks: ["submit", "approval", "publication", "sale"],
          resolution: laterStepResolution([
            "submit",
            "approval",
            "publication",
            "sale",
          ]),
          message:
            "EAN/GTIN is ongeldig (checksum of lengte). De aangeleverde waarde blijft bewaard. Het Concept wordt wel aangemaakt; indienen blijft geblokkeerd.",
        })
      )
    } else if (!ean && (mpn || sku)) {
      issues.push(
        classifyImportIssue({
          row: excelRow,
          field: "ean",
          severity: "missing",
          supplied_value: "",
          blocks: ["submit", "approval", "publication", "sale"],
          resolution: laterStepResolution([
            "submit",
            "approval",
            "publication",
            "sale",
          ]),
          message:
            "EAN/GTIN ontbreekt. Het Concept wordt aangemaakt. Indienen, goedkeuring, publicatie en verkoop blijven geblokkeerd tot een geldige EAN/GTIN is ingevuld.",
        })
      )
    }
    if (values.subcategory_error || values.subcategory_status === "invalid") {
      issues.push(
        classifyImportIssue({
          row: excelRow,
          field: "subcategory",
          severity: "invalid",
          supplied_value: values.subcategory || null,
          blocks: ["publication", "sale"],
          resolution: laterStepResolution(["publication", "sale"]),
          message:
            values.subcategory_error ||
            "Niveau 2 hoort niet bij de gekozen niveau-1-categorie.",
        })
      )
    }
    if (values.subcategory_l3_error || values.subcategory_l3_status === "invalid") {
      issues.push(
        classifyImportIssue({
          row: excelRow,
          field: "subcategory_l3",
          severity: "invalid",
          supplied_value: values.subcategory_l3 || null,
          blocks: ["publication", "sale"],
          resolution: laterStepResolution(["publication", "sale"]),
          message:
            values.subcategory_l3_error ||
            "Niveau 3 hoort niet bij de gekozen niveau-2-categorie.",
        })
      )
    }
    const existingGtin = eanValid
      ? existingEans.has(ean) || foreignEans.has(ean)
      : false
    const existingMpn = !eanValid && mpn ? existingMpns.has(mpn) : false
    const skuAlreadyOffered = Boolean(sku && options?.sellerSkus?.has(sku))
    let existing = existingGtin || existingMpn || skuAlreadyOffered
    if (!eanValid && mpn && foreignMpns.has(mpn)) {
      issues.push(
        classifyImportIssue({
          row: excelRow,
          field: "mpn",
          severity: "requires_review",
          supplied_value: mpn,
          blocks: ["draft"],
          resolution:
            "MPN hoort bij een product van een andere seller. Er wordt geen tweede product aangemaakt, om een duplicaat te voorkomen.",
          message: "MPN hoort bij een product van een andere seller",
        })
      )
    }
    const blockedByForeign =
      Boolean(eanValid && foreignEans.has(ean)) ||
      Boolean(!eanValid && mpn && foreignMpns.has(mpn))
    if (blockedByForeign) existing = existingGtin
    let brandResolution: ImportBrandResolution | undefined
    if (!existing && !blockedByForeign) {
      if (!eanValid) concept_without_ean += 1
      const hasIdentity = Boolean(ean || mpn || sku)
      if (!hasIdentity) {
        missing_required += 1
        issues.push(
          classifyImportIssue({
            row: excelRow,
            field: "identifier",
            severity: "missing",
            supplied_value: null,
            blocks: ["draft"],
            resolution: draftResolution(),
            message: `Excel-regel ${excelRow}, veld identificatie (interne naam: identifier): vul minimaal één echte identificatie in (EAN/GTIN, MPN of Seller SKU). DRAFT- en IMPORT_REF tellen niet mee.`,
          })
        )
      }
      if (rowReadErrors.title) {
        missing_required += 1
        issues.push(
          classifyImportIssue({
            row: excelRow,
            field: "title",
            severity: "invalid",
            supplied_value: null,
            blocks: ["draft"],
            resolution: draftResolution(),
            message: missingMessage(excelRow, "title", rowReadErrors.title),
          })
        )
      } else if (!values.title) {
        missing_required += 1
        issues.push(
          classifyImportIssue({
            row: excelRow,
            field: "title",
            severity: "missing",
            supplied_value: "",
            blocks: ["draft"],
            resolution: draftResolution(),
            message: missingMessage(excelRow, "title"),
          })
        )
      } else if (isHeaderLikeTitle(values.title)) {
        missing_required += 1
        issues.push(
          classifyImportIssue({
            row: excelRow,
            field: "title",
            severity: "invalid",
            supplied_value: values.title,
            blocks: ["draft"],
            resolution: draftResolution(),
            message: `Excel-regel ${excelRow}, veld Productnaam (interne naam: title): deze regel lijkt een kolomkop, geen product.`,
          })
        )
      }
      if (rowReadErrors.brand) {
        missing_required += 1
        issues.push(
          classifyImportIssue({
            row: excelRow,
            field: "brand",
            severity: "invalid",
            supplied_value: null,
            blocks: ["draft"],
            resolution: draftResolution(),
            message: missingMessage(excelRow, "brand", rowReadErrors.brand),
          })
        )
      } else if (!values.brand) {
        missing_required += 1
        issues.push(
          classifyImportIssue({
            row: excelRow,
            field: "brand",
            severity: "missing",
            supplied_value: "",
            blocks: ["draft"],
            resolution: draftResolution(),
            message: missingMessage(excelRow, "brand"),
          })
        )
      } else if (isHeaderLikeTitle(values.brand) && values.brand === values.title) {
        issues.push(
          classifyImportIssue({
            row: excelRow,
            field: "brand",
            severity: "invalid",
            supplied_value: values.brand,
            blocks: ["draft"],
            resolution: draftResolution(),
            message: `Excel-regel ${excelRow}, veld Merk (interne naam: brand): kolomkoppen mogen niet als productwaarden worden opgeslagen.`,
          })
        )
      }
      if (rowReadErrors.category) {
        issues.push(
          classifyImportIssue({
            row: excelRow,
            field: "category",
            severity: "invalid",
            supplied_value: null,
            blocks: ["publication", "sale"],
            resolution: laterStepResolution(["publication", "sale"]),
            message: missingMessage(excelRow, "category", rowReadErrors.category),
          })
        )
      } else if (!values.category && !values.category_raw) {
        issues.push(
          classifyImportIssue({
            row: excelRow,
            field: "category",
            severity: "missing",
            supplied_value: "",
            blocks: ["publication", "sale"],
            resolution: laterStepResolution(["publication", "sale"]),
            message: missingMessage(excelRow, "category"),
          })
        )
      } else if (
        values.category_status === "pending" ||
        values.category_status === "suggested"
      ) {
        issues.push(
          classifyImportIssue({
            row: excelRow,
            field: "category",
            severity: "requires_review",
            supplied_value: values.category_raw || values.category || null,
            blocks: ["publication", "sale"],
            resolution: laterStepResolution(["publication", "sale"]),
            message: "Categorie niet herkend — kies een EuropMade-categorie.",
          })
        )
      }
      if (values.brand && !rowReadErrors.brand) {
        brandResolution = classifyImportBrand(values.brand, options?.knownBrands)
        if (brandResolution.status === "create") {
          newBrandNames.push(brandResolution.name)
          issues.push(
            classifyImportIssue({
              row: excelRow,
              field: "brand",
              severity: "requires_review",
              supplied_value: brandResolution.name,
              blocks: [],
              resolution:
                "Nieuw merk wordt als niet-geverifieerd aangemaakt (in review). Het product wordt als Concept gekoppeld. Een beheerder controleert, vult aan, keurt goed, voegt samen of wijst af.",
              message: `Merk '${brandResolution.name}' bestaat nog niet. Het wordt ter beoordeling aangemaakt en niet automatisch geverifieerd.`,
            })
          )
        } else if (brandResolution.status === "ambiguous") {
          issues.push(
            classifyImportIssue({
              row: excelRow,
              field: "brand",
              severity: "requires_review",
              supplied_value: values.brand,
              blocks: ["draft"],
              resolution: `Merk '${values.brand}' lijkt op ${brandResolution.candidates.map((c) => c.name).join(", ")}. Kies het bestaande merk of een duidelijk afwijkende naam. Er wordt geen extra merk aangemaakt.`,
              message: `Excel-regel ${excelRow}, merk '${values.brand}': komt overeen met ${brandResolution.candidates.map((c) => c.name).join(", ")}. Bevestig welk merk.`,
            })
          )
        }
      }
    }
    if (values.regular_price && Number.isNaN(Number(values.regular_price.replace(",", ".")))) {
      issues.push(
        classifyImportIssue({
          row: excelRow,
          field: "regular_price",
          severity: "invalid",
          supplied_value: values.regular_price,
          blocks: ["sale"],
          resolution: laterStepResolution(["sale"]),
          message:
            "Prijs is geen getal. De aangeleverde waarde blijft bewaard. Er wordt geen prijs 0 opgeslagen.",
        })
      )
    }
    issues.push(...collectProductSpecIssues(values, excelRow))
    issues.push(...conditionalFieldIssues(values, excelRow, issues))
    const blockingIssues = issues.filter((issue) => issue.blocking)
    const status = blockingIssues.length ? "error" : existing ? "existing" : "new"
    preview.push({
      row: excelRow,
      values,
      status,
      issues,
      brand_resolution: brandResolution,
    })
  }
  let offers_to_create = 0
  let offers_to_update = 0
  for (const row of preview) {
    const priceInvalid = row.issues.some(
      (issue) => issue.field === "regular_price" && issue.severity === "invalid"
    )
    if (row.status === "error" || priceInvalid || !importRowWantsOffer(row.values)) {
      row.offer_action = "none"
      continue
    }
    const eanRaw = (row.values.ean || "").replace(/\s/g, "")
    const ean =
      eanRaw && !isPlaceholderIdentifier(eanRaw) ? normalizeGtinDigits(eanRaw) : ""
    const mpn = isPlaceholderIdentifier(row.values.mpn || "")
      ? ""
      : (row.values.mpn || "").trim()
    const sku = isPlaceholderIdentifier(row.values.sku || "")
      ? ""
      : (row.values.sku || "").trim()
    const key = ean && isValidGtin(ean) ? ean : mpn
    const updates =
      Boolean(key && sellerOfferKeys.has(key)) ||
      Boolean(sku && options?.sellerSkus?.has(sku))
    if (updates) {
      offers_to_update += 1
      row.offer_action = "update"
    } else {
      offers_to_create += 1
      row.offer_action = "create"
    }
  }
  const error_rows = preview.filter((p) => p.status === "error").length
  const attention_rows = preview.filter(
    (p) => p.status !== "error" && p.issues.length > 0
  ).length
  return {
    preview,
    summary: {
      rows: mapped.length,
      new_products: preview.filter((p) => p.status === "new").length,
      existing_products: preview.filter((p) => p.status === "existing").length,
      error_rows,
      technical_error_rows: error_rows,
      attention_rows,
      recoverable_rows: attention_rows,
      new_brands: uniqueNewBrandCount(newBrandNames),
      missing_ean,
      missing_required,
      concept_without_ean,
      offers_to_create,
      offers_to_update,
    },
  }
}
