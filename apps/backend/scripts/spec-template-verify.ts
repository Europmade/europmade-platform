/**
 * Generates seller + admin import workbooks and verifies Spec 1–10 / SpecDeps.
 * Run: pnpm exec ts-node --transpile-only scripts/spec-template-verify.ts
 */
import fs from "node:fs"
import path from "node:path"
import {
  buildProductImportTemplate,
  buildXlsxWorkbook,
  parseXlsxWorkbook,
} from "../src/modules/product-cloud/import-xlsx"
import { buildBrandImportWorkbook } from "../src/modules/product-cloud/brand-import-template"
import {
  IMPORT_FIELDS,
  PRODUCT_SPEC_SLOT_COUNT,
} from "../src/modules/product-cloud/import-columns"

const cats = [
  { id: "r1", name: "Tuin", slug: "tuin", parent_id: null as string | null },
  {
    id: "c1",
    name: "Grasmaaiers & Robots",
    slug: "grasmaaiers-robots",
    parent_id: "r1",
  },
  {
    id: "c2",
    name: "Tuinhandgereedschap",
    slug: "tuinhandgereedschap",
    parent_id: "r1",
  },
]

const outDir = path.resolve(__dirname, "../../../.tmp-verify")
fs.mkdirSync(outDir, { recursive: true })

const seller = buildProductImportTemplate([], { categories: cats })
const sellerBuf = buildXlsxWorkbook(seller.sheets, {
  definedNames: seller.definedNames,
})
const adminBuf = buildBrandImportWorkbook({ categories: cats })
fs.writeFileSync(path.join(outDir, "seller-spec-template.xlsx"), sellerBuf)
fs.writeFileSync(path.join(outDir, "admin-spec-template.xlsx"), adminBuf)

const s = parseXlsxWorkbook(sellerBuf)
const a = parseXlsxWorkbook(adminBuf)
const labelIdx = IMPORT_FIELDS.findIndex((f) => f.column === "spec_label_1")
const report = {
  ok:
    s.sheetNames.includes("SpecDeps") &&
    a.sheetNames.includes("SpecDeps") &&
    !s.sheetNames.includes("Specificaties") &&
    !a.sheetNames.includes("Specificaties") &&
    IMPORT_FIELDS.filter((f) => f.column.startsWith("spec_label_")).length ===
      PRODUCT_SPEC_SLOT_COUNT,
  sellerSheets: s.sheetNames,
  adminSheets: a.sheetNames,
  sellerFormula: String(
    seller.sheets.find((x) => x.name === "Producten")?.rows[1]?.[labelIdx] || ""
  ).slice(0, 120),
  definedSpecNames: seller.definedNames
    .filter((n) => n.name.startsWith("spec_"))
    .map((n) => n.name),
  sellerBytes: sellerBuf.length,
  adminBytes: adminBuf.length,
}
fs.writeFileSync(
  path.join(outDir, "spec-template-verify.json"),
  JSON.stringify(report, null, 2)
)
console.log(JSON.stringify(report, null, 2))
if (!report.ok) process.exit(1)
