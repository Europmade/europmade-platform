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
  IGNORED_IMPORT_FIELDS,
  PRODUCT_SPEC_SLOT_COUNT,
  EXTRA_IMAGE_SLOT_LABELS,
  SELLER_TAIL_DOCUMENT_FIELDS,
  SELLER_TEMPLATE_HIDDEN_COLUMNS,
  SELLER_TEMPLATE_ONLY_GARANTIEPERIODE,
  SELLER_MASTER_VIB_HEADER,
  exampleRowForHeaders,
  fieldRequirementStyle,
  importDisplayHeader,
  type ImportFieldDef,
} from "./import-columns"
import type { AttributeCatalogItem } from "./category-attributes"
import {
  partitionImportCategories,
  uniqueImportCategoryCatalog,
  type ImportCategoryCatalogEntry,
} from "./import-category"
import {
  buildCategoryExcelLists,
  dependentSubcategoryFormula,
} from "./import-category-excel"
import { parseImportGrid, type ParsedImportGrid } from "./import-table"
import {
  CATEGORY_ATTRIBUTE_CATALOGS,
  MANUAL_LANGUAGE_OPTIONS,
  resolveCatalogKey,
  slugifyCategoryName,
} from "./category-attributes"
import {
  ASSEMBLY_EU_BAND_LABELS,
  MATERIALS_EU_LEVEL_LABELS,
  PARTS_EU_LEVEL_LABELS,
} from "../verification/made-in-europe"
import { EUROPEAN_OWNERSHIP_BAND_LABELS } from "../verification/european-ownership"
import { buildSpecDepsColumns } from "./product-specifications"
import {
  templateFieldLabel,
  templateRequirementSuffix,
  templateSheetTabLabel,
  type TemplateLocale,
} from "./import-template-i18n"
import { buildDisplayReplacementPairs } from "./import-template-display-i18n"

export function importCategoryListEntries(
  rows: ImportCategoryCatalogEntry[]
): { roots: ImportCategoryCatalogEntry[]; children: ImportCategoryCatalogEntry[] } {
  return partitionImportCategories(uniqueImportCategoryCatalog(rows))
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

type DefinedName = { name: string; refersTo: string }

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
          const raw = value ?? ""
          const kind = headerStyles?.[c]
          let style = ""
          // Header cell styles + optional-column body tint (legacy).
          // Column styles below remain the primary requirement-color signal.
          if (r === 0 && kind != null) style = ` s="${kind}"`
          else if (r > 0 && kind === 2) style = ` s="2"`
          // Formula cells (no cached <v>): stay empty for our parser until Excel calculates.
          if (raw.startsWith("=")) {
            return `<c r="${ref}"${style}><f>${xmlEscape(raw.slice(1))}</f></c>`
          }
          const v = xmlEscape(raw)
          return `<c r="${ref}"${style} t="inlineStr"><is><t xml:space="preserve">${v}</t></is></c>`
        })
        .join("")
      return `<row r="${r + 1}">${tds}</row>`
    })
    .join("")
  const colCount = Math.max(
    headerStyles?.length || 0,
    ...(rows.map((row) => row.length) as number[]),
    1
  )
  // Requirement colors: style on <col> (same as last known-good Seller templates).
  // Cell s= alone is stripped more readily when Excel repairs the workbook.
  const cols =
    headerStyles && headerStyles.length
      ? `<cols>${headerStyles
          .map(
            (s, i) =>
              `<col min="${i + 1}" max="${i + 1}" width="28" style="${s}" customWidth="1"/>`
          )
          .join("")}</cols>`
      : colCount > 0
        ? `<cols>${Array.from({ length: colCount }, (_, i) => {
            return `<col min="${i + 1}" max="${i + 1}" width="28" customWidth="1"/>`
          }).join("")}</cols>`
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
  // No <dimension>: last known-good templates omitted it; keep sheetViews+bookViews aligned.
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>${cols}<sheetData>${cells}</sheetData>${dv}</worksheet>`
}

export function buildXlsxWorkbook(
  sheets: SheetInput[],
  options: { definedNames?: DefinedName[] } = {}
): Buffer {
  const stylesRid = `rId${sheets.length + 1}`
  const contentTypes = `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
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
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`
  // OPC requires package/2006 for ALL .rels parts. Using officeDocument/2006 here
  // makes desktop Excel report file-level "unreadable content" and open as Hersteld.
  const wbRels = `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
${sheets
  .map(
    (_, i) =>
      `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`
  )
  .join("")}
<Relationship Id="${stylesRid}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`
  const defined =
    options.definedNames && options.definedNames.length
      ? `<definedNames>${options.definedNames
          .map(
            (d) =>
              `<definedName name="${xmlEscape(d.name)}">${xmlEscape(d.refersTo)}</definedName>`
          )
          .join("")}</definedNames>`
      : ""
  // bookViews required: sheets use workbookViewId="0". Avoid fileVersion/calcId=0/dimension —
  // those extras still triggered Excel repair after the first OB-01 pass.
  const workbook = `<?xml version="1.0" encoding="UTF-8"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<workbookPr/>
<bookViews><workbookView xWindow="0" yWindow="0" windowWidth="24000" windowHeight="12000"/></bookViews>
<sheets>
${sheets
  .map(
    (s, i) =>
      `<sheet name="${xmlEscape(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`
  )
  .join("")}
</sheets>${defined}<calcPr fullCalcOnLoad="1"/></workbook>`
  const created = new Date().toISOString().replace(/\.\d{3}Z$/, "Z")
  const core = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
<dc:creator>EuropMade</dc:creator>
<cp:lastModifiedBy>EuropMade</cp:lastModifiedBy>
<dcterms:created xsi:type="dcterms:W3CDTF">${created}</dcterms:created>
<dcterms:modified xsi:type="dcterms:W3CDTF">${created}</dcterms:modified>
</cp:coreProperties>`
  const app = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
<Application>EuropMade</Application>
<HeadingPairs>
<vt:vector size="2" baseType="variant">
<vt:variant><vt:lpstr>Worksheets</vt:lpstr></vt:variant>
<vt:variant><vt:i4>${sheets.length}</vt:i4></vt:variant>
</vt:vector>
</HeadingPairs>
<TitlesOfParts>
<vt:vector size="${sheets.length}" baseType="lpstr">
${sheets.map((s) => `<vt:lpstr>${xmlEscape(s.name)}</vt:lpstr>`).join("")}
</vt:vector>
</TitlesOfParts>
</Properties>`
  const files = [
    { name: "[Content_Types].xml", data: Buffer.from(contentTypes, "utf8") },
    { name: "_rels/.rels", data: Buffer.from(rels, "utf8") },
    { name: "docProps/core.xml", data: Buffer.from(core, "utf8") },
    { name: "docProps/app.xml", data: Buffer.from(app, "utf8") },
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

/**
 * Rewrite the approved Seller XLSX for the seller account language:
 * - Producten headers + sheet tabs
 * - Category / spec / list display labels (central display-i18n catalog)
 * Named-range keys (cat_…) stay NL-slug based; VLOOKUP maps are rewritten
 * together with dropdown values so dependent lists keep working.
 * Import mapping stays locale-independent via aliases + resolveNlDisplayName.
 */
export function localizeApprovedSellerTemplateXlsx(
  buf: Buffer,
  locale: TemplateLocale
): Buffer {
  if (locale === "nl") return buf

  const reqLabel = (kind: "required" | "optional" | "conditional" | "automatic") =>
    templateRequirementSuffix(kind, locale)

  const replacements = new Map<string, string>()
  const add = (from: string, to: string) => {
    if (from && to && from !== to) replacements.set(from, to)
  }

  const localizeFieldHeader = (f: ImportFieldDef) => {
    const base = templateFieldLabel(f.column, locale, f.nl_name)
    const kind = fieldRequirementStyle(f.required)
    const suffix =
      kind === "required" ||
      kind === "optional" ||
      kind === "conditional" ||
      kind === "automatic"
        ? reqLabel(kind)
        : f.required
    add(importDisplayHeader(f), `${base} (${suffix})`)
    add(f.nl_name, base)
  }

  for (const f of IMPORT_FIELDS) {
    if (SELLER_TEMPLATE_HIDDEN_COLUMNS.has(f.column)) continue
    localizeFieldHeader(f)
  }
  for (const f of SELLER_TAIL_DOCUMENT_FIELDS) localizeFieldHeader(f)
  localizeFieldHeader({
    column: "warranty_period",
    nl_name: SELLER_TEMPLATE_ONLY_GARANTIEPERIODE.nl_name,
    meaning: "",
    required: SELLER_TEMPLATE_ONLY_GARANTIEPERIODE.required,
    example: "",
    allowed: "",
    help: "",
    aliases: [],
  })
  add(
    SELLER_TEMPLATE_ONLY_GARANTIEPERIODE.displayHeader,
    `${templateFieldLabel("warranty_period", locale, "Garantieperiode")} (${reqLabel("conditional")})`
  )
  add(
    SELLER_MASTER_VIB_HEADER,
    `${templateFieldLabel("safety_sheet_url", locale, "Veiligheidsinformatieblad")} (${locale === "fr" ? "facultatif" : locale === "de" ? "optional" : "optional"})`
  )

  for (let i = 0; i < EXTRA_IMAGE_SLOT_LABELS.length; i++) {
    const n = i + 2
    const nl = `${EXTRA_IMAGE_SLOT_LABELS[i]} (Optioneel)`
    const localized =
      locale === "de"
        ? `Bild ${n} (Optional)`
        : locale === "fr"
          ? `Image ${n} (Facultatif)`
          : `Image ${n} (Optional)`
    add(nl, localized)
  }

  add(
    "Categoriepad (actief)",
    locale === "de"
      ? "Kategoriepfad (aktiv)"
      : locale === "fr"
        ? "Chemin de catégorie (actif)"
        : "Category path (active)"
  )
  add(
    "Waarde-controle (automatisch)",
    `${locale === "de" ? "Wertprüfung" : locale === "fr" ? "Contrôle de valeur" : "Value check"} (${reqLabel("automatic")})`
  )
  for (let i = 1; i <= PRODUCT_SPEC_SLOT_COUNT; i++) {
    add(
      `Eenheid ${i} (automatisch)`,
      `${templateFieldLabel(`unit_${i}`, locale, `Eenheid ${i}`)} (${reqLabel("automatic")})`
    )
  }

  for (const [from, to] of buildDisplayReplacementPairs(locale)) {
    add(from, to)
  }

  // Longest keys first so nested replacements stay stable.
  const ordered = [...replacements.entries()].sort(
    (a, b) => b[0].length - a[0].length
  )

  const applyTextReplacements = (xml: string): string => {
    let next = xml
    for (const [from, to] of ordered) {
      const needle = xmlEscape(from)
      const repl = xmlEscape(to)
      if (needle && next.includes(needle)) {
        next = next.split(needle).join(repl)
      }
    }
    return next
  }

  const files = readZipEntries(buf)
  for (const [name, data] of files) {
    if (!/xl\/worksheets\/sheet\d+\.xml$/i.test(name)) continue
    const xml = data.toString("utf8")
    const localizedXml = applyTextReplacements(xml)
    if (localizedXml !== xml) {
      files.set(name, Buffer.from(localizedXml, "utf8"))
    }
  }

  const wbPath = "xl/workbook.xml"
  const wbXml = files.get(wbPath)?.toString("utf8")
  if (wbXml) {
    let next = wbXml
    for (const nlName of ["Producten", "Uitleg velden", "Kenmerken", "Legenda"]) {
      const localized = templateSheetTabLabel(nlName, locale)
      if (localized === nlName) continue
      next = next.replace(
        new RegExp(
          `name="${nlName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`,
          "g"
        ),
        `name="${xmlEscape(localized)}"`
      )
    }
    files.set(wbPath, Buffer.from(next, "utf8"))
  }

  return zipFiles([...files.entries()].map(([name, data]) => ({ name, data })))
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

const NON_PRODUCT_SHEET =
  /^(uitleg|lijsten|legenda|lists|legend|readme|catdeps|catdepsl3|specdeps|specmeta|kenmerken)/i

export function parseXlsxFirstSheet(buf: Buffer): { headers: string[]; rows: string[][] } {
  const grid = parseXlsxProductGrid(buf)
  return { headers: grid.headers, rows: grid.rows }
}

export function parseXlsxProductGrid(buf: Buffer): ParsedImportGrid {
  const workbook = parseXlsxWorkbook(buf)
  const productSheet =
    workbook.sheetNames.find((n) => /^(producten|importtemplate)$/i.test(n.trim())) ||
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
    categories?: Array<{
      id: string
      name: string
      slug?: string | null
      parent_id?: string | null
      parent_category_id?: string | null
    }>
    /** When true, do not hide Mode/Duurzaam/Algemeen/E2E (used for exact bronboom templates). */
    skipCategoryVisibilityFilter?: boolean
    /** Visible CSV/XLSX header language; technical columns stay English. */
    headerLocale?: TemplateLocale
  } = {}
): {
  sheets: SheetInput[]
  csv: string
  definedNames: DefinedName[]
} {
  const headerLocale: TemplateLocale = options.headerLocale || "nl"
  const visibleHeader = (f: ImportFieldDef) => {
    if (headerLocale === "nl") return importDisplayHeader(f)
    const base = templateFieldLabel(f.column, headerLocale, f.nl_name)
    const kind = fieldRequirementStyle(f.required)
    if (
      kind === "required" ||
      kind === "optional" ||
      kind === "conditional" ||
      kind === "automatic"
    ) {
      return `${base} (${templateRequirementSuffix(kind, headerLocale)})`
    }
    return base
  }
  type SellerCol = {
    header: string
    style: number
    /** Index in IMPORT_FIELDS, or -1 for inserted Afbeelding 2–10 slots. */
    fieldIndex: number
  }
  const styleForField = (f: ImportFieldDef): number => {
    const kind = fieldRequirementStyle(f.required)
    if (kind === "required") return 1
    if (kind === "optional") return 2
    if (kind === "conditional") return 3
    if (kind === "automatic") return 4
    return 2
  }
  const sellerCols: SellerCol[] = []
  IMPORT_FIELDS.forEach((f, idx) => {
    // Master V2: Veiligheidswaarschuwingen is not a Seller template column
    // (distinct from Veiligheidsinformatieblad). Still importable from older files.
    if (SELLER_TEMPLATE_HIDDEN_COLUMNS.has(f.column)) return
    sellerCols.push({
      header: visibleHeader(f),
      style: styleForField(f),
      fieldIndex: idx,
    })
    if (f.column === "primary_image_url") {
      for (let i = 0; i < EXTRA_IMAGE_SLOT_LABELS.length; i++) {
        const n = i + 2
        const header =
          headerLocale === "nl"
            ? `${EXTRA_IMAGE_SLOT_LABELS[i]} (Optioneel)`
            : headerLocale === "de"
              ? `Bild ${n} (Optional)`
              : headerLocale === "fr"
                ? `Image ${n} (Facultatif)`
                : `Image ${n} (Optional)`
        sellerCols.push({
          header,
          style: 2,
          fieldIndex: -1,
        })
      }
    }
  })
  // Master V2 tail order: evidence → CE → Garantieperiode → SDS → Handleiding → Garantiebewijs.
  // CE covers Conformiteitsverklaring (no separate column). Document URL import/storage deferred.
  const pushTailField = (f: ImportFieldDef, headerOverride?: string) => {
    sellerCols.push({
      header: headerOverride || visibleHeader(f),
      style: styleForField(f),
      fieldIndex: -1,
    })
  }
  pushTailField(SELLER_TAIL_DOCUMENT_FIELDS[0]) // eu_production_evidence_url
  pushTailField(SELLER_TAIL_DOCUMENT_FIELDS[1]) // ce_certificate_url
  sellerCols.push({
    header: SELLER_TEMPLATE_ONLY_GARANTIEPERIODE.displayHeader,
    style: 3,
    fieldIndex: -1,
  })
  pushTailField(SELLER_TAIL_DOCUMENT_FIELDS[2], SELLER_MASTER_VIB_HEADER)
  pushTailField(SELLER_TAIL_DOCUMENT_FIELDS[3]) // manual_url
  pushTailField(SELLER_TAIL_DOCUMENT_FIELDS[4]) // warranty_url
  const productHeaders = sellerCols.map((c) => c.header)
  const headerStyles = sellerCols.map((c) => c.style)
  const exampleCanonical = exampleRowForHeaders(CANONICAL_COLUMNS)
  const example = sellerCols.map((c) =>
    c.fieldIndex >= 0 ? exampleCanonical[c.fieldIndex] || "" : ""
  )

  const lists = buildCategoryExcelLists(options.categories || [], {
    skipVisibilityFilter: Boolean(options.skipCategoryVisibilityFilter),
  })
  const rootNames = lists.roots.map((r) => r.name)
  const childNames = lists.children.map((c) => c.name)
  const l3Names = lists.grandchildren.map((c) => c.name)
  const categoryLast = Math.max(rootNames.length, 1) + 1
  const mapLast = Math.max(rootNames.length, 1) + 1
  const l2MapLast = Math.max(childNames.length, 1) + 1
  const hasDependent = lists.childrenByRootName.size > 0
  const hasL3Dependent = [...lists.l3ByL2Name.values()].some((v) => v.length > 0)

  const categoryFieldIdx = IMPORT_FIELDS.findIndex((f) => f.column === "category")
  const subcategoryFieldIdx = IMPORT_FIELDS.findIndex(
    (f) => f.column === "subcategory"
  )
  const subcategoryL3FieldIdx = IMPORT_FIELDS.findIndex(
    (f) => f.column === "subcategory_l3"
  )
  const categoryColIdx = sellerCols.findIndex((c) => c.fieldIndex === categoryFieldIdx)
  const subcategoryColIdx = sellerCols.findIndex(
    (c) => c.fieldIndex === subcategoryFieldIdx
  )
  const subcategoryL3ColIdx = sellerCols.findIndex(
    (c) => c.fieldIndex === subcategoryL3FieldIdx
  )
  const categoryCol = colName(Math.max(categoryColIdx, 0))
  const subcategoryColLetter = colName(Math.max(subcategoryColIdx, 0))

  const assemblyLabels = Object.values(ASSEMBLY_EU_BAND_LABELS)
  const partsLabels = Object.values(PARTS_EU_LEVEL_LABELS)
  const materialsLabels = Object.values(MATERIALS_EU_LEVEL_LABELS)
  const eoLabels = Object.values(EUROPEAN_OWNERSHIP_BAND_LABELS)

  const listCols: Record<
    Exclude<NonNullable<ImportFieldDef["list"]>, "variant_type">,
    string
  > = {
    land: "'Lijsten'!$A$2:$A$32",
    sales_status: "'Lijsten'!$B$2:$B$3",
    ce_marking: "'Lijsten'!$C$2:$C$3",
    ja_nee: "'Lijsten'!$D$2:$D$3",
    category: `'Lijsten'!$E$2:$E$${categoryLast}`,
    subcategory: hasDependent
      ? dependentSubcategoryFormula(
          `${categoryCol}2`,
          "Lijsten",
          2,
          mapLast,
          "G",
          "H"
        )
      : `'Lijsten'!$F$2:$F$${Math.max(childNames.length, 1) + 1}`,
    subcategory_l3: hasL3Dependent
      ? dependentSubcategoryFormula(
          `${subcategoryColLetter}2`,
          "Lijsten",
          2,
          l2MapLast,
          "P",
          "Q"
        )
      : `'Lijsten'!$R$2:$R$${Math.max(l3Names.length, 1) + 1}`,
    mie_assembly: `'Lijsten'!$J$2:$J$${assemblyLabels.length + 1}`,
    mie_parts: `'Lijsten'!$K$2:$K$${partsLabels.length + 1}`,
    mie_materials: `'Lijsten'!$L$2:$L$${materialsLabels.length + 1}`,
    european_ownership: `'Lijsten'!$M$2:$M$${eoLabels.length + 1}`,
  }
  const validations: SheetValidation[] = []
  sellerCols.forEach((colDef, idx) => {
    if (colDef.fieldIndex < 0) return
    const f = IMPORT_FIELDS[colDef.fieldIndex]
    if (!f?.list) return
    if (f.list === "subcategory" && !hasDependent && childNames.length === 0) {
      return
    }
    if (f.list === "subcategory_l3" && !hasL3Dependent && l3Names.length === 0) {
      return
    }
    const col = colName(idx)
    let formula = listCols[f.list]
    if (f.list === "subcategory" && hasDependent && subcategoryColIdx >= 0) {
      // Per-row relative reference: Excel expands sqref using top-left formula.
      formula = dependentSubcategoryFormula(
        `${categoryCol}2`,
        "Lijsten",
        2,
        mapLast,
        "G",
        "H"
      )
    }
    if (f.list === "subcategory_l3" && hasL3Dependent && subcategoryL3ColIdx >= 0) {
      formula = dependentSubcategoryFormula(
        `${subcategoryColLetter}2`,
        "Lijsten",
        2,
        l2MapLast,
        "P",
        "Q"
      )
    }
    validations.push({
      sqref: `${col}2:${col}200`,
      formula,
    })
  })

  const specDepsColumns = buildSpecDepsColumns(
    (options.categories || []).map((c) => ({
      name: c.name,
      slug: c.slug,
      parent_id: c.parent_id ?? c.parent_category_id ?? null,
    }))
  )
  const subcategoryCol = colName(Math.max(subcategoryColIdx, 0))
  const specMapLast = Math.max(specDepsColumns.length, 1) + 1

  const specLabelFormulaForRow = (excelRow: number, slot: number) => {
    if (!specDepsColumns.length) return ""
    // VLOOKUP subcategory display → SpecDeps named range, INDEX slot row.
    return `=IFERROR(INDEX(INDIRECT(VLOOKUP(${subcategoryCol}${excelRow},Lijsten!$N$2:$O$${specMapLast},2,FALSE)),${slot}),"")`
  }

  const productDataRows: string[][] = []
  const TEMPLATE_DATA_ROWS = 200
  for (let excelRow = 2; excelRow <= TEMPLATE_DATA_ROWS; excelRow++) {
    const base =
      excelRow === 2 ? [...example] : sellerCols.map(() => "")
    while (base.length < sellerCols.length) base.push("")
    for (let slot = 1; slot <= PRODUCT_SPEC_SLOT_COUNT; slot++) {
      const fieldIdx = IMPORT_FIELDS.findIndex(
        (f) => f.column === `spec_label_${slot}`
      )
      if (fieldIdx < 0) continue
      const colIdx = sellerCols.findIndex((c) => c.fieldIndex === fieldIdx)
      if (colIdx < 0) continue
      base[colIdx] = specLabelFormulaForRow(excelRow, slot)
    }
    productDataRows.push(base)
  }

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
      "(variantkolommen)",
      "Varianttype / Variantwaarde",
      "Niet in dit bestand",
      "Automatisch",
      "—",
      "—",
      "Deze kolommen horen niet in het importbestand. Staan ze in een ouder bestand, dan worden ze genegeerd. Nieuwe producten krijgen standaard Uitvoering / Standaard.",
    ],
    [
      "(mie_score)",
      "Made in Europe-score",
      "Berekende herkomstscore",
      "Automatisch",
      "—",
      "—",
      "Score volgt uit kolommen Assemblage, Onderdelen en Materialen (zelfde keuzes als de UI). Bewijs upload je via de seller-wizard; admin keurt goed.",
    ],
    ...IGNORED_IMPORT_FIELDS.map((field) => [
      field.column,
      field.nl_name,
      field.meaning,
      "Genegeerd",
      field.example,
      field.allowed,
      field.help,
    ]),
    [
      "(admin_evidence)",
      "Bewijsstukken CE / MiE / GPSR / handleiding",
      "URL-kolommen in dit bestand + wizard-upload",
      "Voorwaardelijk verplicht / Optioneel",
      "—",
      "https-URL",
      "Master V2: EuropMade-bewijs, CE-certificaat (tevens Conformiteitsverklaring), Veiligheidsinformatieblad, Handleiding en Garantiebewijs staan als URL-kolommen in de template. Seller-importmapping en -opslag voor deze URL's zijn nog niet uitgebreid (latere fase). Garantieperiode staat in de template zonder opslagmapping. Veiligheidswaarschuwingen (tekst) staat niet in deze template; oude imports blijven herkend. Wizard-upload blijft beschikbaar.",
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
    rootNames.length,
    childNames.length,
    l3Names.length,
    MANUAL_LANGUAGE_OPTIONS.length,
    assemblyLabels.length,
    partsLabels.length,
    materialsLabels.length,
    eoLabels.length,
    specDepsColumns.length,
    2
  )
  const listRows: string[][] = [
    [
      "landcodes",
      "sales_status",
      "ce_marking",
      "ja_nee",
      "niveau1",
      "niveau2_flat",
      "niveau1_naam",
      "niveau2_lijst_sleutel",
      "talen",
      "mie_assemblage",
      "mie_onderdelen",
      "mie_materialen",
      "europees_eigendom",
      "spec_subcategorie_naam",
      "spec_lijst_sleutel",
      "niveau2_naam",
      "niveau3_lijst_sleutel",
      "niveau3_flat",
    ],
  ]
  for (let i = 0; i < maxLand; i++) {
    const rootName = rootNames[i] || ""
    const l2Name = childNames[i] || ""
    const specCol = specDepsColumns[i]
    listRows.push([
      EU_ISO2[i] || "",
      i === 0 ? "active" : i === 1 ? "paused" : "",
      i === 0 ? "Zichtbaar" : i === 1 ? "Niet van toepassing" : "",
      i === 0 ? "Ja" : i === 1 ? "Nee" : "",
      rootName,
      childNames[i] || "",
      rootName,
      rootName ? lists.keyByRootName.get(rootName) || "" : "",
      MANUAL_LANGUAGE_OPTIONS[i] || "",
      assemblyLabels[i] || "",
      partsLabels[i] || "",
      materialsLabels[i] || "",
      eoLabels[i] || "",
      specCol?.displayName || "",
      specCol?.key || "",
      l2Name,
      l2Name ? lists.keyByL2Name.get(l2Name) || "" : "",
      l3Names[i] || "",
    ])
  }

  const rootOrder = rootNames
  const maxChildren = Math.max(
    1,
    ...[...lists.childrenByRootName.values()].map((c) => c.length),
    1
  )
  const catDepHeader = rootOrder.map(
    (name) => lists.keyByRootName.get(name) || excelKeyFallback(name)
  )
  const catDepRows: string[][] = [catDepHeader]
  for (let r = 0; r < maxChildren; r++) {
    catDepRows.push(
      rootOrder.map((name) => lists.childrenByRootName.get(name)?.[r] || "")
    )
  }

  const l2Order = childNames
  const maxL3 = Math.max(
    1,
    ...[...lists.l3ByL2Name.values()].map((c) => c.length),
    1
  )
  const catDepL3Header = l2Order.map(
    (name) => lists.keyByL2Name.get(name) || excelKeyFallback(`2_${name}`)
  )
  const catDepL3Rows: string[][] = [catDepL3Header]
  for (let r = 0; r < maxL3; r++) {
    catDepL3Rows.push(
      l2Order.map((name) => lists.l3ByL2Name.get(name)?.[r] || "")
    )
  }

  const definedNames: DefinedName[] = []
  if (hasDependent) {
    rootOrder.forEach((name, colIdx) => {
      const key = lists.keyByRootName.get(name)
      if (!key) return
      const col = colName(colIdx)
      const last = Math.max(
        (lists.childrenByRootName.get(name) || []).length,
        1
      )
      definedNames.push({
        name: key,
        refersTo: `'CatDeps'!$${col}$2:$${col}$${last + 1}`,
      })
    })
  }
  if (hasL3Dependent) {
    l2Order.forEach((name, colIdx) => {
      const key = lists.keyByL2Name.get(name)
      if (!key) return
      const col = colName(colIdx)
      const last = Math.max((lists.l3ByL2Name.get(name) || []).length, 1)
      definedNames.push({
        name: key,
        refersTo: `'CatDepsL3'!$${col}$2:$${col}$${last + 1}`,
      })
    })
  }

  const specDepHeader = specDepsColumns.map((c) => c.key)
  const specDepRows: string[][] = [
    specDepHeader.length ? specDepHeader : ["(geen specificaties)"],
  ]
  for (let slot = 0; slot < PRODUCT_SPEC_SLOT_COUNT; slot++) {
    specDepRows.push(
      specDepsColumns.map((c) => c.labels[slot] || "")
    )
  }
  specDepsColumns.forEach((col, colIdx) => {
    const letter = colName(colIdx)
    const last = Math.max(col.labels.length, 1)
    definedNames.push({
      name: col.key,
      refersTo: `'SpecDeps'!$${letter}$2:$${letter}$${last + 1}`,
    })
  })

  // SpecValDeps + INDIRECT(...&"_sN") value DVs removed: Excel treated those
  // concatenated list validations as unreadable content (Hersteld). Keuzelijst
  // value dropdowns stay deferred; SpecDeps name formulas remain.

  const kenmerkRows: string[][] = [
    ["categorie", "kenmerkcode", "kenmerknaam", "toegestane_waarden", "verplicht"],
  ]
  for (const root of rootOrder) {
    const key = resolveCatalogKey(slugifyCategoryName(root), [root])
    const items = CATEGORY_ATTRIBUTE_CATALOGS[key] || []
    for (const item of items) {
      kenmerkRows.push([
        root,
        item.code,
        item.name,
        (item.option_values || []).join(" | "),
        item.requirement_tier === "category_required" || item.is_required
          ? "voorwaardelijk verplicht"
          : "optioneel",
      ])
    }
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
      "De hoofdfoto moet vrijstaand / achtergrondvrij zijn. Vul daarna optioneel Afbeelding 2–10 (volgorde). Overige afbeeldingen blijft legacy (| of ;). Samen max. 10 unieke URL's.",
    ],
    [
      "Niveau 2 / Niveau 3",
      "Afhankelijk",
      "Niveau 2 toont kinderen van niveau 1; niveau 3 toont kinderen van niveau 2 (Excel INDIRECT via CatDeps / CatDepsL3).",
    ],
    [
      "Specificatie 1–10",
      "Automatisch",
      "Namen volgen uit SpecDeps via de gekozen niveau-2-categorie (INDEX/INDIRECT). Vul alleen Waarde 1–10 in. Geen apart Specificaties-blad.",
    ],
  ]

  const sheets: SheetInput[] = [
    {
      name: "Producten",
      rows: [productHeaders, ...productDataRows],
      headerStyles,
      validations,
    },
    { name: "Uitleg velden", rows: guideRows, headerStyles: [1, 1, 1, 1, 1, 1, 1] },
    { name: "Lijsten", rows: listRows },
    { name: "CatDeps", rows: hasDependent ? catDepRows : [["(geen hiërarchie)"]] },
    {
      name: "CatDepsL3",
      rows: hasL3Dependent ? catDepL3Rows : [["(geen niveau-3-hiërarchie)"]],
    },
    {
      name: "SpecDeps",
      rows:
        specDepsColumns.length > 0
          ? specDepRows
          : [["(geen subcategorie-specificaties)"]],
    },
    {
      name: "Kenmerken",
      rows:
        kenmerkRows.length > 1
          ? kenmerkRows
          : [
              [
                "categorie",
                "kenmerkcode",
                "kenmerknaam",
                "toegestane_waarden",
                "verplicht",
              ],
              ["—", "—", "Geen categoriegebonden kenmerken in catalogus", "", ""],
            ],
    },
    { name: "Legenda", rows: legendRows, headerStyles: [1, 1, 1] },
  ]
  return {
    sheets,
    csv: toCsv([productHeaders, example]),
    definedNames,
  }
}

function excelKeyFallback(name: string): string {
  return `cat_${slugifyCategoryName(name).replace(/-/g, "_") || "x"}`
}

