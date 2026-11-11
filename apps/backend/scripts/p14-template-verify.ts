import fs from "node:fs"
import path from "node:path"
import { inflateRawSync, inflateSync } from "node:zlib"
import {
  buildProductImportTemplate,
  buildXlsxWorkbook,
  parseXlsxWorkbook,
} from "../src/modules/product-cloud/import-xlsx"
import { buildBrandImportWorkbook } from "../src/modules/product-cloud/brand-import-template"

const outDir = path.join(__dirname, "../../../.tmp-verify")

const H = [
  { id: "cat_kleding", name: "Kleding", slug: "kleding", parent_id: null },
  { id: "cat_heren", name: "Heren", slug: "heren", parent_id: "cat_kleding" },
  { id: "cat_elek", name: "Elektronica", slug: "elektronica", parent_id: null },
  { id: "cat_audio", name: "Audio", slug: "audio", parent_id: "cat_elek" },
]

function parts(buf: Buffer): Map<string, string> {
  const out = new Map<string, string>()
  let eocd = -1
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) {
      eocd = i
      break
    }
  }
  if (eocd < 0) return out
  const cdOffset = buf.readUInt32LE(eocd + 16)
  const cdSize = buf.readUInt32LE(eocd + 12)
  let i = cdOffset
  const end = cdOffset + cdSize
  while (i + 46 <= end && buf.readUInt32LE(i) === 0x02014b50) {
    const method = buf.readUInt16LE(i + 10)
    const compSize = buf.readUInt32LE(i + 20)
    const nameLen = buf.readUInt16LE(i + 28)
    const extraLen = buf.readUInt16LE(i + 30)
    const commentLen = buf.readUInt16LE(i + 32)
    const localOffset = buf.readUInt32LE(i + 42)
    const name = buf.slice(i + 46, i + 46 + nameLen).toString("utf8")
    const lh = localOffset
    const nameLen2 = buf.readUInt16LE(lh + 26)
    const extraLen2 = buf.readUInt16LE(lh + 28)
    const start = lh + 30 + nameLen2 + extraLen2
    let data = buf.slice(start, start + compSize)
    if (method === 8) {
      try {
        data = inflateRawSync(data)
      } catch {
        data = inflateSync(data)
      }
    }
    out.set(name, data.toString("utf8"))
    i += 46 + nameLen + extraLen + commentLen
  }
  return out
}

const sellerTpl = buildProductImportTemplate([], { categories: H })
const sellerBuf = buildXlsxWorkbook(sellerTpl.sheets, {
  definedNames: sellerTpl.definedNames,
})
const adminBuf = buildBrandImportWorkbook({ categories: H })
fs.writeFileSync(path.join(outDir, "seller-template-p14.xlsx"), sellerBuf)
fs.writeFileSync(path.join(outDir, "admin-template-p14.xlsx"), adminBuf)

const sp = parts(sellerBuf)
const ap = parts(adminBuf)
const sellerParsed = parseXlsxWorkbook(sellerBuf)
const adminParsed = parseXlsxWorkbook(adminBuf)
const adminHeaders = (adminParsed.sheets.get("Importtemplate") || [])[0] || []
const kenmerken = adminParsed.sheets.get("Kenmerken") || []
const list = adminParsed.sheets.get("Lijsten") || []

const report = {
  sellerSheets: [...sellerParsed.sheets.keys()],
  adminSheets: [...adminParsed.sheets.keys()],
  sellerIndirect: [...sp.values()].some((x) => /INDIRECT\(VLOOKUP\(/.test(x)),
  adminIndirect: [...ap.values()].some((x) => /INDIRECT\(VLOOKUP\(/.test(x)),
  sellerDefined:
    (sp.get("xl/workbook.xml") || "").match(/definedName name=/g)?.length || 0,
  adminDefined:
    (ap.get("xl/workbook.xml") || "").match(/definedName name=/g)?.length || 0,
  subFormula:
    sellerTpl.sheets
      .find((s) => s.name === "Producten")
      ?.validations?.find((v) => /INDIRECT/.test(v.formula))?.formula || null,
  adminCommercialHits: ["prijs", "voorraad", "sku", "verzend", "markt", "seller"].filter(
    (n) => adminHeaders.join(" ").toLowerCase().includes(n)
  ),
  maat: kenmerken.some((r) => r[1] === "maat"),
  kleur: kenmerken.some((r) => r[1] === "kleur"),
  elektronicaKenmerk: kenmerken.some((r) => r[0] === "Elektronica"),
  adminHasImportUitlegLijsten: ["Importtemplate", "Uitleg", "Lijsten"].every((n) =>
    adminParsed.sheets.has(n)
  ),
  adminHasCatDepsKenmerken: ["CatDeps", "Kenmerken"].every((n) =>
    adminParsed.sheets.has(n)
  ),
  listMapKeys: list
    .slice(1)
    .map((r) => [r[6], r[7]])
    .filter((r) => r[0]),
  files: {
    sellerBytes: sellerBuf.length,
    adminBytes: adminBuf.length,
  },
}

fs.writeFileSync(path.join(outDir, "p14-template-verify.json"), JSON.stringify(report, null, 2))
console.log(JSON.stringify(report, null, 2))
