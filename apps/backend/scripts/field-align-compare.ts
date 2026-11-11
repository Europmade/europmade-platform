import fs from "node:fs"
import path from "node:path"
import {
  buildProductImportTemplate,
  buildXlsxWorkbook,
  parseXlsxWorkbook,
} from "../src/modules/product-cloud/import-xlsx"
import {
  brandTemplateHeaders,
  buildBrandImportWorkbook,
} from "../src/modules/product-cloud/brand-import-template"
import { IMPORT_FIELDS } from "../src/modules/product-cloud/import-columns"
import { BRAND_COMMERCIAL_FIELDS } from "../src/modules/product-cloud/brand-import"

const H = [
  { id: "cat_kleding", name: "Kleding", slug: "kleding", parent_id: null },
  { id: "cat_heren", name: "Heren", slug: "heren", parent_id: "cat_kleding" },
  { id: "cat_elek", name: "Elektronica", slug: "elektronica", parent_id: null },
]

function headersOf(file: string): { sheets: string[]; headers: string[] } {
  const buf = fs.readFileSync(file)
  const parsed = parseXlsxWorkbook(buf)
  const sheets = [...parsed.sheets.keys()]
  const first = parsed.sheets.get(sheets[0]) || []
  return { sheets, headers: first[0] || [] }
}

function diff(a: string[], b: string[]) {
  const as = new Set(a)
  const bs = new Set(b)
  return {
    onlyA: a.filter((x) => !bs.has(x)),
    onlyB: b.filter((x) => !as.has(x)),
  }
}

const outDir = path.join(__dirname, "../../../.tmp-verify")
const attachedSeller =
  "C:/Users/sjoer/Downloads/EuropMade product template Selleraccount.xlsx"
const attachedAdmin = "C:/Users/sjoer/Downloads/europmade-importbestand admin.xlsx"

const sellerTpl = buildProductImportTemplate([], { categories: H })
const sellerBuf = buildXlsxWorkbook(sellerTpl.sheets, {
  definedNames: sellerTpl.definedNames,
})
const adminBuf = buildBrandImportWorkbook({ categories: H })
fs.writeFileSync(path.join(outDir, "seller-template-align.xlsx"), sellerBuf)
fs.writeFileSync(path.join(outDir, "admin-template-align.xlsx"), adminBuf)

const aS = headersOf(attachedSeller)
const aA = headersOf(attachedAdmin)
const gS = headersOf(path.join(outDir, "seller-template-align.xlsx"))
const gA = headersOf(path.join(outDir, "admin-template-align.xlsx"))

const commercialNl = IMPORT_FIELDS.filter((f) =>
  (BRAND_COMMERCIAL_FIELDS as readonly string[]).includes(f.column)
).map((f) => f.nl_name)

const brandLabels = brandTemplateHeaders()
const sellerNl = IMPORT_FIELDS.map((f) => f.nl_name)

const report = {
  attachedSeller: { sheets: aS.sheets, n: aS.headers.length, headers: aS.headers },
  attachedAdmin: { sheets: aA.sheets, n: aA.headers.length, headers: aA.headers },
  generatedSeller: { sheets: gS.sheets, n: gS.headers.length, headers: gS.headers },
  generatedAdmin: { sheets: gA.sheets, n: gA.headers.length, headers: gA.headers },
  attachedSellerVsGenerated: diff(aS.headers, gS.headers),
  attachedAdminVsGenerated: diff(aA.headers, gA.headers),
  generatedSellerOnlyCommerceVsAdmin: gS.headers.filter(
    (h) => !gA.headers.includes(h) && commercialNl.includes(h)
  ),
  generatedSellerOnlyNonCommerceVsAdmin: gS.headers.filter(
    (h) => !gA.headers.includes(h) && !commercialNl.includes(h)
  ),
  generatedAdminOnlyVsSeller: gA.headers.filter((h) => !gS.headers.includes(h)),
  brandLabelsMissingFromAdminGen: brandLabels.filter((h) => !gA.headers.includes(h)),
  sellerCentralNlNotInAdminGen: sellerNl.filter(
    (h) =>
      !commercialNl.includes(h) &&
      !gA.headers.includes(h) &&
      !["Seller SKU / artikelnummer"].includes(h)
  ),
  commercialNl,
}

fs.writeFileSync(path.join(outDir, "field-align-compare.json"), JSON.stringify(report, null, 2))
console.log(JSON.stringify(report, null, 2))
