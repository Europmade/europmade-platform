/**
 * Minimal XLSX (Office Open XML) writer/reader for product import templates.
 * No third-party spreadsheet library — two worksheets, shared strings avoided.
 */

import { inflateRawSync, inflateSync, deflateRawSync } from "node:zlib"
import {
  CANONICAL_COLUMNS,
  FIELD_GUIDE,
} from "./import-mapping"
import {
  EU_ISO2,
  IMPORT_FIELDS,
  VARIANT_TYPES,
  exampleRowForHeaders,
  fieldRequirementStyle,
  importDisplayHeader,
  type ImportFieldDef,
} from "./import-columns"
import type { AttributeCatalogItem } from "./category-attributes"
import { uniqueImportCategoryCatalog } from "./import-category"
import { parseImportGrid, type ParsedImportGrid } from "./import-table"

function uniqueImportCategoryNames(
  rows: Array<{ id: string; name: string; slug?: string | null }>
): string[] {
  return uniqueImportCategoryCatalog(rows).map((row) => row.name)
}
function crc32(buf: Buffer): number {
  let crc = ~0
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i]
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1))
    }
  }
  return ~crc >>> 0
}

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function colName(index: number): string {
  let n = index
  let s = ""
  while (n >= 0) {
    s = String.fromCharCode((n % 26) + 65) + s
    n = Math.floor(n / 26) - 1
  }
  return s
}

function zipFiles(files: Array<{ name: string; data: Buffer }>): Buffer {
  const locals: Buffer[] = []
  const centrals: Buffer[] = []
  let offset = 0
  for (const file of files) {
    const name = Buffer.from(file.name, "utf8")
    const compressed = deflateRawSync(file.data)
    const crc = crc32(file.data)
    const local = Buffer.alloc(30 + name.length)
    local.writeUInt32LE(0x04034b50, 0)
    local.writeUInt16LE(20, 4)
    local.writeUInt16LE(0, 6)
    local.writeUInt16LE(8, 8)
    local.writeUInt16LE(0, 10)
    local.writeUInt16LE(0, 12)
    local.writeUInt32LE(crc, 14)
    local.writeUInt32LE(compressed.length, 18)
    local.writeUInt32LE(file.data.length, 22)
    local.writeUInt16LE(name.length, 26)
    local.writeUInt16LE(0, 28)
    name.copy(local, 30)
    locals.push(Buffer.concat([local, compressed]))
    const central = Buffer.alloc(46 + name.length)
    central.writeUInt32LE(0x02014b50, 0)
    central.writeUInt16LE(20, 4)
    central.writeUInt16LE(20, 6)
    central.writeUInt16LE(0, 8)
    central.writeUInt16LE(8, 10)
    central.writeUInt16LE(0, 12)
    central.writeUInt16LE(0, 14)
    central.writeUInt32LE(crc, 16)
    central.writeUInt32LE(compressed.length, 20)
    central.writeUInt32LE(file.data.length, 24)
    central.writeUInt16LE(name.length, 28)
    central.writeUInt16LE(0, 30)
    central.writeUInt16LE(0, 32)
    central.writeUInt16LE(0, 34)
    central.writeUInt16LE(0, 36)
    central.writeUInt32LE(0, 38)
    central.writeUInt32LE(offset, 42)
    name.copy(central, 46)
    centrals.push(central)
    offset += local.length + compressed.length
  }
  const localBuf = Buffer.concat(locals)
  const centralBuf = Buffer.concat(centrals)
  const end = Buffer.alloc(22)
  end.writeUInt32LE(0x06054b50, 0)
  end.writeUInt16LE(0, 4)
  end.writeUInt16LE(0, 6)
  end.writeUInt16LE(files.length, 8)
  end.writeUInt16LE(files.length, 10)
  end.writeUInt32LE(centralBuf.length, 12)
  end.writeUInt32LE(localBuf.length, 16)
  end.writeUInt16LE(0, 20)
  return Buffer.concat([localBuf, centralBuf, end])
}

type SheetValidation = { sqref: string; formula: string }

type SheetInput = {
  name: string
  rows: string[][]
  /** Style index per column on row 1 (header). */
  headerStyles?: number[]
  validations?: SheetValidation[]
}

function stylesXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="2">
    <font><sz val="11"/><name val="Calibri"/></font>
    <font><b/><sz val="11"/><name val="Calibri"/></font>
  </fonts>
  <fills count="6">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFF8D7DA"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFEEF3F8"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFFFF3CD"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFE2F0D9"/><bgColor indexed="64"/></patternFill></fill>
  </fills>
  <borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="6">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFill="1" applyFont="1"/>
    <xf numFmtId="0" fontId="1" fillId="3" borderId="0" xfId="0" applyFill="1" applyFont="1"/>
    <xf numFmtId="0" fontId="1" fillId="4" borderId="0" xfId="0" applyFill="1" applyFont="1"/>
    <xf numFmtId="0" fontId="1" fillId="5" borderId="0" xfId="0" applyFill="1" applyFont="1"/>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
  </cellXfs>
</styleSheet>`
}

function sheetXml(rows: string[][], headerStyles?: number[], validations?: SheetValidation[]): string {
  const cells = rows
    .map((row, r) => {
      const tds = row
        .map((value, c) => {
          const ref = `${colName(c)}${r + 1}`
          const v = xmlEscape(value ?? "")
          const kind = headerStyles?.[c]
          let style = ""
          if (r === 0 && kind != null) style = ` s="${kind}"`
          else if (r > 0 && kind === 2) style = ` s="2"`
          return `<c r="${ref}"${style} t="inlineStr"><is><t xml:space="preserve">${v}</t></is></c>`
        })
        .join("")
      return `<row r="${r + 1}">${tds}</row>`
    })
    .join("")
  const cols =
    headerStyles && headerStyles.length
      ? `<cols>${headerStyles
          .map(
            (s, i) =>
              `<col min="${i + 1}" max="${i + 1}" width="28" style="${s}" customWidth="1"/>`
          )
          .join("")}</cols>`
      : ""
  const dv =
    validations && validations.length
      ? `<dataValidations count="${validations.length}">${validations
          .map(
            (item) =>
              `<dataValidation type="list" allowBlank="1" sqref="${xmlEscape(item.sqref)}"><formula1>${xmlEscape(item.formula)}</formula1></dataValidation>`
          )
          .join("")}</dataValidations>`
      : ""
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>${cols}<sheetData>${cells}</sheetData>${dv}</worksheet>`
}

export function buildXlsxWorkbook(sheets: SheetInput[]): Buffer {
  const contentTypes = `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
${sheets
  .map(
    (_, i) =>
      `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`
  )
  .join("")}
</Types>`
  const rels = `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`
  const wbRels = `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
${sheets
  .map(
    (_, i) =>
      `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`
  )
  .join("")}
<Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`
  const workbook = `<?xml version="1.0" encoding="UTF-8"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets>
${sheets
  .map(
    (s, i) =>
      `<sheet name="${xmlEscape(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`
  )
  .join("")}
</sheets></workbook>`
  const files = [
    { name: "[Content_Types].xml", data: Buffer.from(contentTypes, "utf8") },
    { name: "_rels/.rels", data: Buffer.from(rels, "utf8") },
    { name: "xl/workbook.xml", data: Buffer.from(workbook, "utf8") },
    { name: "xl/_rels/workbook.xml.rels", data: Buffer.from(wbRels, "utf8") },
    { name: "xl/styles.xml", data: Buffer.from(stylesXml(), "utf8") },
    ...sheets.map((s, i) => ({
      name: `xl/worksheets/sheet${i + 1}.xml`,
      data: Buffer.from(
        sheetXml(s.rows, s.headerStyles, s.validations),
        "utf8"
      ),
    })),
  ]
  return zipFiles(files)
}

function inflateZipPayload(method: number, compressed: Buffer): Buffer {
  if (method === 0) return compressed
  if (method === 8) {
    try {
      return inflateRawSync(compressed)
    } catch {
      return inflateSync(compressed)
    }
  }
  return compressed
}

function readZipEntries(buf: Buffer): Map<string, Buffer> {
  const out = new Map<string, Buffer>()

  let eocd = -1
  const searchStart = Math.max(0, buf.length - 65557)
  for (let i = buf.length - 22; i >= searchStart; i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) {
      eocd = i
      break
    }
  }

  if (eocd >= 0) {
    const cdOffset = buf.readUInt32LE(eocd + 16)
    const cdSize = buf.readUInt32LE(eocd + 12)
    let i = cdOffset
    const end = cdOffset + cdSize
    while (i + 46 <= end && buf.readUInt32LE(i) === 0x02014b50) {
      const method = buf.readUInt16LE(i + 10)
      const compSize = buf.readUInt32LE(i + 20)
      const uncompSize = buf.readUInt32LE(i + 24)
      const nameLen = buf.readUInt16LE(i + 28)
      const extraLen = buf.readUInt16LE(i + 30)
      const commentLen = buf.readUInt16LE(i + 32)
      const localOffset = buf.readUInt32LE(i + 42)
      const name = buf.slice(i + 46, i + 46 + nameLen).toString("utf8")

      const lh = localOffset
      const nameLen2 = buf.readUInt16LE(lh + 26)
      const extraLen2 = buf.readUInt16LE(lh + 28)
      const start = lh + 30 + nameLen2 + extraLen2
      const compressed = buf.slice(start, start + compSize)
      const data = inflateZipPayload(method, compressed)
      if (uncompSize && data.length > uncompSize) {
        out.set(name, data.subarray(0, uncompSize))
      } else {
        out.set(name, data)
      }

      i += 46 + nameLen + extraLen + commentLen
    }
    if (out.size > 0) return out
  }

  let pos = 0
  while (pos + 30 <= buf.length && buf.readUInt32LE(pos) === 0x04034b50) {
    const method = buf.readUInt16LE(pos + 8)
    const compSize = buf.readUInt32LE(pos + 18)
    const uncompSize = buf.readUInt32LE(pos + 22)
    const nameLen = buf.readUInt16LE(pos + 26)
    const extraLen = buf.readUInt16LE(pos + 28)
    const name = buf.slice(pos + 30, pos + 30 + nameLen).toString("utf8")
    const start = pos + 30 + nameLen + extraLen
    const compressed = buf.slice(start, start + compSize)
    const data = inflateZipPayload(method, compressed)
    if (uncompSize && data.length > uncompSize) {
      out.set(name, data.subarray(0, uncompSize))
    } else {
      out.set(name, data)
    }
    pos = start + compSize
  }
  return out
}

function colLettersToIndex(col: string): number {
  let n = 0
  for (const ch of col) n = n * 26 + (ch.charCodeAt(0) - 64)
  return n - 1
}

function parseCellRef(ref: string): { col: number; row: number } | null {
  const m = /^([A-Z]+)(\d+)$/.exec(ref)
  if (!m) return null
  return { col: colLettersToIndex(m[1]), row: Number(m[2]) - 1 }
}

function decodeXmlText(value: string): string {
  return value
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

function cellTextNodes(xml: string): string {
  return [...xml.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)]
    .map((m) => decodeXmlText(m[1]))
    .join("")
}

function expandSelfClosingCells(rowXml: string): string {
  // Excel omits empty values as <c r="C2" s="4"/>. A non-greedy </c> match
  // would swallow the next real cell (D2) and steal its <v>.
  return rowXml.replace(/<c\b([^>]*)\/>/g, "<c$1></c>")
}

function parseSheetCells(xml: string, shared: string[]): string[][] {
  const rowMap = new Map<number, Map<number, string>>()
  let maxCol = 0
  let maxRow = -1

  const rowRe = /<row\b([^>]*)>([\s\S]*?)<\/row>/g
  let rowMatch: RegExpExecArray | null
  let rowIndex = 0
  while ((rowMatch = rowRe.exec(xml))) {
    const rowAttrs = rowMatch[1]
    const rowXml = expandSelfClosingCells(rowMatch[2])
    const explicitRow = /(?:\br|\br:)=?"(\d+)"/.exec(rowAttrs)?.[1]
    const rowNum = explicitRow ? Number(explicitRow) - 1 : rowIndex
    rowIndex += 1

    const cellRe = /<c\b([^>]*)>([\s\S]*?)<\/c>/g
    let cellMatch: RegExpExecArray | null
    let nextCol = 0
    while ((cellMatch = cellRe.exec(rowXml))) {
      const attrs = cellMatch[1]
      const body = cellMatch[2]
      const type = /t="([^"]+)"/.exec(attrs)?.[1]
      let value = ""
      const texts = cellTextNodes(body)
      const v = /<v>([\s\S]*?)<\/v>/.exec(body)
      if (type === "s" && v) {
        value = shared[Number(v[1])] ?? ""
      } else if (texts) {
        value = texts
      } else if (v) {
        value = decodeXmlText(v[1])
      }

      const ref = /\br="([^"]+)"/.exec(attrs)?.[1]
      const pos = ref ? parseCellRef(ref) : { col: nextCol, row: rowNum }
      if (!pos) continue
      nextCol = pos.col + 1

      maxCol = Math.max(maxCol, pos.col)
      maxRow = Math.max(maxRow, pos.row)
      const cols = rowMap.get(pos.row) || new Map<number, string>()
      cols.set(pos.col, value.trim())
      rowMap.set(pos.row, cols)
    }
  }

  const rows: string[][] = []
  for (let r = 0; r <= maxRow; r++) {
    const cols = rowMap.get(r)
    if (!cols) continue
    const line: string[] = []
    for (let c = 0; c <= maxCol; c++) {
      line.push(cols.get(c) || "")
    }
    if (line.some((cell) => cell !== "")) rows.push(line)
  }
  return rows
}

/** Test/diag helper: worksheet XML → grid, same cell rules as the XLSX reader. */
export function parseXlsxSheetXml(
  xml: string,
  shared: string[] = []
): string[][] {
  return parseSheetCells(xml, shared)
}

const NON_PRODUCT_SHEET = /^(uitleg|lijsten|legenda|lists|legend|readme)/i

export function parseXlsxFirstSheet(buf: Buffer): { headers: string[]; rows: string[][] } {
  const grid = parseXlsxProductGrid(buf)
  return { headers: grid.headers, rows: grid.rows }
}

export function parseXlsxProductGrid(buf: Buffer): ParsedImportGrid {
  const workbook = parseXlsxWorkbook(buf)
  const productSheet =
    workbook.sheetNames.find((n) => /^producten$/i.test(n.trim())) ||
    workbook.sheetNames.find((n) => /product/i.test(n) && !NON_PRODUCT_SHEET.test(n.trim()))
  const skip = new Set(
    workbook.sheetNames.filter((n) => NON_PRODUCT_SHEET.test(n.trim()))
  )
  const chosenName =
    productSheet ||
    workbook.sheetNames.find((n) => !skip.has(n)) ||
    workbook.sheetNames[0]
  const table = (chosenName && workbook.sheets.get(chosenName)) || []
  if (process.env.IMPORT_DIAG === "1") {
    const headers = table[0] || []
    const row2 = table[1] || []
    const titleIdx = headers.findIndex((h) =>
      /productnaam/i.test(String(h || ""))
    )
    console.info(
      JSON.stringify({
        import_diag: true,
        sheet: chosenName,
        headers: headers.map((h, i) => ({
          index: i,
          letter:
            i < 26
              ? String.fromCharCode(65 + i)
              : `A${String.fromCharCode(65 + (i % 26))}`,
          header: h,
        })),
        excel_row_2_cells: row2,
        productnaam_cell: {
          header_index: titleIdx,
          header: titleIdx >= 0 ? headers[titleIdx] : null,
          value: titleIdx >= 0 ? row2[titleIdx] : null,
        },
      })
    )
  }
  return parseImportGrid(table)
}

export type ParsedXlsxWorkbook = {
  sheetNames: string[]
  sheets: Map<string, string[][]>
}

/** Parse all worksheets from an XLSX buffer (Fase 5B multi-sheet import). */
export function parseXlsxWorkbook(buf: Buffer): ParsedXlsxWorkbook {
  const files = readZipEntries(buf)
  const sharedXml = files.get("xl/sharedStrings.xml")?.toString("utf8") || ""
  const shared: string[] = []
  const siRe = /<si>([\s\S]*?)<\/si>/g
  let si: RegExpExecArray | null
  while ((si = siRe.exec(sharedXml))) {
    shared.push(cellTextNodes(si[1]))
  }

  const wbXml = files.get("xl/workbook.xml")?.toString("utf8") || ""
  const relsXml = files.get("xl/_rels/workbook.xml.rels")?.toString("utf8") || ""
  const relById = new Map<string, string>()
  const relRe = /<Relationship\b([^>]*)\/>/g
  let relMatch: RegExpExecArray | null
  while ((relMatch = relRe.exec(relsXml))) {
    const attrs = relMatch[1]
    const id = /Id="([^"]+)"/.exec(attrs)?.[1]
    const target = /Target="([^"]+)"/.exec(attrs)?.[1]
    if (id && target) relById.set(id, target)
  }

  const sheetNames: string[] = []
  const sheets = new Map<string, string[][]>()
  const sheetRe = /<sheet\b([^>]*)\/>/g
  let sheetMatch: RegExpExecArray | null
  while ((sheetMatch = sheetRe.exec(wbXml))) {
    const attrs = sheetMatch[1]
    const name = /name="([^"]+)"/.exec(attrs)?.[1]
    const rid = /r:id="([^"]+)"/.exec(attrs)?.[1]
    if (!name || !rid) continue
    const target = relById.get(rid)
    if (!target) continue
    const path = target.startsWith("/") ? target.slice(1) : `xl/${target}`
    const sheetXml = files.get(path)?.toString("utf8") || ""
    const table = parseSheetCells(sheetXml, shared)
    sheetNames.push(name)
    sheets.set(name, table)
  }

  return { sheetNames, sheets }
}

export function sheetToRecords(
  table: string[][],
  headerRow = 0
): Array<Record<string, string>> {
  if (!table.length) return []
  const headers = table[headerRow] || []
  const out: Array<Record<string, string>> = []
  for (let r = headerRow + 1; r < table.length; r++) {
    const row = table[r]
    if (!row?.some((c) => String(c).trim() !== "")) continue
    const rec: Record<string, string> = {}
    headers.forEach((h, i) => {
      rec[h] = row[i] ?? ""
    })
    out.push(rec)
  }
  return out
}

export function toCsv(rows: string[][]): string {
  return rows
    .map((row) =>
      row
        .map((cell) => {
          const v = cell ?? ""
          if (/[",\n\r]/.test(v)) return `"${v.replace(/"/g, '""')}"`
          return v
        })
        .join(",")
    )
    .join("\r\n")
}

export function buildProductImportTemplate(
  _extraFields: AttributeCatalogItem[] = [],
  options: {
    categories?: Array<{ id: string; name: string; slug?: string | null }>
  } = {}
): {
  sheets: SheetInput[]
  csv: string
} {
  const productHeaders = IMPORT_FIELDS.map(importDisplayHeader)
  const example = exampleRowForHeaders(CANONICAL_COLUMNS)
  const headerStyles = IMPORT_FIELDS.map((f) => {
    const kind = fieldRequirementStyle(f.required)
    if (kind === "required") return 1
    if (kind === "optional") return 2
    if (kind === "conditional") return 3
    if (kind === "automatic") return 4
    return 2
  })

  const categoryNames = uniqueImportCategoryNames(options.categories || [])
  const categoryLast = Math.max(categoryNames.length, 1) + 1
  const listCols: Record<NonNullable<ImportFieldDef["list"]>, string> = {
    land: "'Lijsten'!$A$2:$A$32",
    sales_status: "'Lijsten'!$B$2:$B$3",
    ce_marking: "'Lijsten'!$C$2:$C$3",
    ja_nee: "'Lijsten'!$D$2:$D$3",
    variant_type: "'Lijsten'!$E$2:$E$9",
    category: `'Lijsten'!$F$2:$F$${categoryLast}`,
  }
  const validations: SheetValidation[] = []
  IMPORT_FIELDS.forEach((f, idx) => {
    if (!f.list) return
    const col = colName(idx)
    validations.push({
      sqref: `${col}2:${col}200`,
      formula: listCols[f.list],
    })
  })

  const guideHeader = [
    "kolomnaam",
    "nederlandse_naam",
    "betekenis",
    "verplicht_label",
    "voorbeeld",
    "toegestane_waarden",
    "invulinstructie",
  ]
  const guideRows = [
    guideHeader,
    ...FIELD_GUIDE.map((r) => [
      r.column,
      r.nl_name,
      r.meaning,
      r.required,
      r.example,
      r.allowed,
      r.help,
    ]),
    [
      "(categorievelden)",
      "Categorie-afhankelijke kenmerken",
      "Velden van de gekozen productcategorie",
      "Voorwaardelijk verplicht",
      "zuigkracht, maat, processor, …",
      "Zie Product Cloud per categorie",
      "Categorie-afhankelijke kenmerken staan niet in dit algemene blad. Na upload volgt een tweede stap met de velden van de herkende categorie.",
    ],
    [
      "(product_id)",
      "Product-ID",
      "Interne EuropMade-ID",
      "Automatisch",
      "prod_…",
      "—",
      "Niet invullen. Wordt bij import aangemaakt.",
    ],
    [
      "(draft_ean)",
      "Concept zonder EAN",
      "Tijdelijke IMPORT_REF",
      "Automatisch",
      "DRAFT-…",
      "—",
      "Als EAN leeg is, maakt het systeem dezelfde DRAFT-referentie als de wizard. Status blijft Concept tot er een geldige EAN is.",
    ],
    [
      "(valuta)",
      "Valuta",
      "Munt van de markt",
      "Automatisch",
      "EUR",
      "—",
      "Volgt de gekozen markt/regio. Niet als kolom invullen.",
    ],
    [
      "(mie_score)",
      "Made in Europe-score",
      "Berekende herkomstscore",
      "Automatisch",
      "—",
      "—",
      "Berekend uit productieland/faciliteit. Bewijs keurt de admin goed.",
    ],
    [
      "(admin_evidence)",
      "Bewijsstukken CE / MiE / GPSR / handleiding",
      "Bestanden in de productwizard",
      "Via seller-wizard",
      "—",
      "—",
      "CE-bewijs: via seller-wizard uploaden. Made in Europe-bewijs: via seller-wizard uploaden. GPSR-documenten: via seller-wizard uploaden. Handleiding/documentatie: via seller-wizard uploaden. Excel heeft hiervoor geen bestandskolommen.",
    ],
    [
      "(vertalingen)",
      "Vertalingen",
      "Doeltalen via bestaande AI-vertaalflow",
      "Automatisch",
      "EN / FR / DE (configureerbaar)",
      "—",
      "Geen aparte taalkolommen voor titel of beschrijving. Kies bij import de brontaal. Het systeem vertaalt titel en beschrijving naar de vereiste doeltalen. Handmatige vertalingen worden niet overschreven.",
    ],
    [
      "(categorie_stap)",
      "Categoriekenmerken",
      "Extra velden na categoriedetectie",
      "Voorwaardelijk verplicht",
      "processor, zuigkracht, …",
      "—",
      "Niet in dit algemene blad. Na upload toont de import een tweede stap met de velden van de herkende categorie. Vul die in vóór indienen ter controle.",
    ],
  ]

  const maxLand = Math.max(
    EU_ISO2.length,
    VARIANT_TYPES.length,
    categoryNames.length,
    2
  )
  const listRows: string[][] = [
    [
      "landcodes",
      "sales_status",
      "ce_marking",
      "ja_nee",
      "variant_type",
      "categorieen",
    ],
  ]
  for (let i = 0; i < maxLand; i++) {
    listRows.push([
      EU_ISO2[i] || "",
      i === 0 ? "active" : i === 1 ? "paused" : "",
      i === 0 ? "Zichtbaar" : i === 1 ? "Niet van toepassing" : "",
      i === 0 ? "Ja" : i === 1 ? "Nee" : "",
      VARIANT_TYPES[i] || "",
      categoryNames[i] || "",
    ])
  }

  const legendRows = [
    ["Kleur in koprij Producten", "Tekstlabel", "Betekenis"],
    [
      "Roodachtig",
      "Verplicht",
      "Moet ingevuld zijn om een nieuw product aan te maken (titel, merk, categorie).",
    ],
    [
      "Lichtblauw",
      "Optioneel",
      "Mag leeg. Helpt de productpagina, blokkeert Concept niet.",
    ],
    [
      "Geel",
      "Voorwaardelijk verplicht",
      "Nodig vóór indienen, goedkeuring, publicatie of verkoop (bijv. EAN, GPSR, hoofdafbeelding, prijs).",
    ],
    [
      "Groen (alleen in uitleg)",
      "Automatisch",
      "Vult het systeem in. Niet in de invoerkolommen zetten.",
    ],
    [
      "—",
      "Admincontrole",
      "Seller levert data/bestanden; EuropMade-admin keurt goed. Geen seller-kolom voor de beslissing zelf.",
    ],
    [
      "—",
      "Via seller-wizard",
      "CE-bewijs, Made in Europe-bewijs, GPSR-documenten en handleiding: via seller-wizard uploaden. Geen Excel-bestandskolom.",
    ],
    [
      "Hoofdafbeelding",
      "Vrijstaand",
      "De hoofdfoto moet vrijstaand / achtergrondvrij zijn. Overige sfeerfoto's mogen een achtergrond hebben.",
    ],
  ]

  const sheets: SheetInput[] = [
    {
      name: "Producten",
      rows: [productHeaders, example],
      headerStyles,
      validations,
    },
    { name: "Uitleg velden", rows: guideRows, headerStyles: [1, 1, 1, 1, 1, 1, 1] },
    { name: "Lijsten", rows: listRows },
    { name: "Legenda", rows: legendRows, headerStyles: [1, 1, 1] },
  ]
  return { sheets, csv: toCsv([productHeaders, example]) }
}

