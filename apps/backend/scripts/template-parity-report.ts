import fs from "node:fs"
import path from "node:path"
import {
  buildProductImportTemplate,
  buildXlsxWorkbook,
  parseXlsxWorkbook,
} from "../src/modules/product-cloud/import-xlsx"
import { buildBrandImportWorkbook } from "../src/modules/product-cloud/brand-import-template"
import { BRAND_COMMERCIAL_FIELDS } from "../src/modules/product-cloud/brand-import"
import { IMPORT_FIELDS } from "../src/modules/product-cloud/import-columns"

const HIERARCHY = [
  { id: "cat_kleding", name: "Kleding", slug: "kleding", parent_id: null },
  {
    id: "cat_heren",
    name: "Heren",
    slug: "heren",
    parent_category_id: "cat_kleding",
  },
]

const root = path.resolve(__dirname, "../../..")
const sellerTpl = buildProductImportTemplate([], { categories: HIERARCHY })
const sellerBuf = buildXlsxWorkbook(sellerTpl.sheets, {
  definedNames: sellerTpl.definedNames,
})
const adminBuf = buildBrandImportWorkbook({ categories: HIERARCHY })

fs.writeFileSync(
  path.join(root, ".tmp-verify/seller-template-european.xlsx"),
  sellerBuf
)
fs.writeFileSync(
  path.join(root, ".tmp-verify/admin-template-european.xlsx"),
  adminBuf
)

const seller = parseXlsxWorkbook(sellerBuf)
const admin = parseXlsxWorkbook(adminBuf)
const sellerHeaders = (seller.sheets.get("Producten") || [])[0] || []
const adminHeaders = (admin.sheets.get("Importtemplate") || [])[0] || []
const strip = (h: string) => h.replace(/\s*\([^)]*\)\s*$/, "").trim()
const sellerNl = sellerHeaders.map(strip)
const commerceNl = IMPORT_FIELDS.filter((f) =>
  (BRAND_COMMERCIAL_FIELDS as readonly string[]).includes(f.column)
).map((f) => f.nl_name)
const commerceSet = new Set(commerceNl)
const missingInAdmin = sellerNl.filter(
  (n) => !commerceSet.has(n) && !adminHeaders.includes(n)
)
const commerceInAdmin = commerceNl.filter((n) =>
  adminHeaders.some((h) => String(h).includes(n))
)
const intentionalCommerceAbsent = commerceNl.filter((n) => sellerNl.includes(n))
const required = [
  "Assemblage",
  "Onderdelen",
  "Materialen",
  "Europees eigendom van het merk",
  "Belangrijkste kenmerk 1",
  "Belangrijkste kenmerk 2",
]
const sellerHas = Object.fromEntries(
  required.map((r) => [r, sellerNl.some((h) => h === r || h.startsWith(r))])
)
const adminHas = Object.fromEntries(
  required.map((r) => [
    r,
    adminHeaders.some((h) => String(h) === r || String(h).startsWith(r)),
  ])
)
const list = seller.sheets.get("Lijsten") || []
const report = {
  seller_header_count: sellerHeaders.length,
  admin_header_count: adminHeaders.length,
  seller_sheets: [...seller.sheets.keys()],
  admin_sheets: [...admin.sheets.keys()],
  required_in_seller: sellerHas,
  required_in_admin: adminHas,
  missing_central_in_admin: missingInAdmin,
  intentional_commerce_absent_from_admin: intentionalCommerceAbsent,
  commerce_leaked_in_admin: commerceInAdmin,
  commerce_column_count: commerceNl.length,
  seller_list_headers: list[0],
  mie_assembly_options: list.slice(1).map((r) => r[9]).filter(Boolean),
  eo_options: list.slice(1).map((r) => r[12]).filter(Boolean),
  has_catdeps: seller.sheets.has("CatDeps") && admin.sheets.has("CatDeps"),
  has_kenmerken: seller.sheets.has("Kenmerken") && admin.sheets.has("Kenmerken"),
  pass:
    missingInAdmin.length === 0 &&
    commerceInAdmin.length === 0 &&
    Object.values(sellerHas).every(Boolean) &&
    Object.values(adminHas).every(Boolean),
}
fs.writeFileSync(
  path.join(root, ".tmp-verify/template-parity-report.json"),
  JSON.stringify(report, null, 2)
)
console.log(JSON.stringify(report, null, 2))
