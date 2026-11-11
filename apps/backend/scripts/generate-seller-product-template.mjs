/**
 * Seller template definitief-v1: compleet-v1 + consistente namen, verborgen hulpbladen,
 * zichtbare waarde-controle bij categorie-wijziging. Geen DB/API/UI.
 */
import { createRequire } from "node:module"
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs"
import { inflateRawSync, deflateRawSync } from "node:zlib"
import path from "node:path"
import { fileURLToPath } from "node:url"

const require = createRequire(import.meta.url)
const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const backendRoot = path.resolve(scriptDir, "..")
const repoRoot = path.resolve(backendRoot, "../..")
const CAT_SRC_CANDIDATES = [
  "d:/tijdelijk/1 EU marketplace/Categorie opbouw/Categorie Indeling goed.xlsx",
  path.join(repoRoot, ".tmp-verify/category-tree-v1/Categorie Indeling goed.xlsx"),
]
const SPEC_SRC_CANDIDATES = [
  "d:/tijdelijk/1 EU marketplace/Categorie opbouw/Categorie specificaties top 10.xlsx",
  path.join(repoRoot, ".tmp-verify/Categorie specificaties top 10.xlsx"),
]
const CAT_SRC = CAT_SRC_CANDIDATES.find((p) => existsSync(p))
const SPEC_SRC = SPEC_SRC_CANDIDATES.find((p) => existsSync(p))
if (!CAT_SRC) throw new Error("Categorie Indeling goed.xlsx not found")
if (!SPEC_SRC) throw new Error("Categorie specificaties top 10.xlsx not found")
const outPath = path.join(
  backendRoot,
  "src/modules/product-cloud/assets/seller-product-template.xlsx"
)
const reportPath = path.join(
  repoRoot,
  ".tmp-verify/seller-product-template-asset-report.json"
)
const mirrorPath = path.join(repoRoot, ".tmp-verify/seller-template-definitief-v1.xlsx")

function parseZip(buf) {
  const files = {}
  let o = 0
  while (o + 4 <= buf.length) {
    const sig = buf.readUInt32LE(o)
    if (sig !== 0x04034b50) break
    const comp = buf.readUInt16LE(o + 8)
    const csize = buf.readUInt32LE(o + 18)
    const nlen = buf.readUInt16LE(o + 26)
    const elen = buf.readUInt16LE(o + 28)
    const name = buf.slice(o + 30, o + 30 + nlen).toString()
    const data = buf.slice(o + 30 + nlen + elen, o + 30 + nlen + elen + csize)
    files[name] = comp === 8 ? inflateRawSync(data) : comp === 0 ? data : null
    o += 30 + nlen + elen + csize
  }
  return files
}

function decode(s) {
  return String(s || "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
}

function sharedStrings(xml) {
  const out = []
  if (!xml) return out
  for (const m of xml.matchAll(/<si>([\s\S]*?)<\/si>/g)) {
    const t = [...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((x) => x[1]).join("")
    out.push(decode(t))
  }
  return out
}

function sheetRows(xml, sst) {
  const rows = []
  for (const rm of xml.matchAll(/<row[^>]* r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g)) {
    const rowNum = Number(rm[1])
    const cells = {}
    for (const cm of rm[2].matchAll(/<c r="([A-Z]+)(\d+)"([^>]*)>([\s\S]*?)<\/c>/g)) {
      const col = cm[1]
      const attrs = cm[3] || ""
      const body = cm[4] || ""
      let val = ""
      if (/t="s"/.test(attrs)) {
        const v = body.match(/<v>([\s\S]*?)<\/v>/)
        val = sst[Number(v?.[1])] || ""
      } else if (/t="inlineStr"/.test(attrs) || /<is>/.test(body)) {
        val = [...body.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((x) => x[1]).join("")
      } else {
        const v = body.match(/<v>([\s\S]*?)<\/v>/)
        val = v?.[1] || ""
      }
      cells[col] = decode(val)
    }
    rows.push({ rowNum, cells })
  }
  return rows
}

function resolveSheetPath(target) {
  let t = String(target || "").replace(/^\//, "")
  if (!t.startsWith("xl/")) t = "xl/" + t
  return t
}

function loadWorkbook(filePath) {
  const z = parseZip(readFileSync(filePath))
  const wb = z["xl/workbook.xml"].toString()
  const rels = z["xl/_rels/workbook.xml.rels"].toString()
  const ridToTarget = {}
  for (const m of rels.matchAll(/<Relationship\b([^>]+)\/>/g)) {
    const attrs = m[1]
    const id = attrs.match(/\bId="([^"]+)"/)?.[1]
    const target = attrs.match(/\bTarget="([^"]+)"/)?.[1]
    if (id && target) ridToTarget[id] = target
  }
  const sheets = {}
  for (const m of wb.matchAll(/<sheet\b([^>/]+)\/?>/g)) {
    const attrs = m[1]
    const name = attrs.match(/\bname="([^"]+)"/)?.[1]
    const rid = attrs.match(/\br:id="(rId\d+)"/)?.[1]
    if (!name || !rid || !ridToTarget[rid]) continue
    sheets[name] = resolveSheetPath(ridToTarget[rid])
  }
  const sst = sharedStrings(z["xl/sharedStrings.xml"]?.toString())
  const out = {}
  for (const [name, file] of Object.entries(sheets)) {
    out[name] = sheetRows(z[file].toString(), sst)
  }
  return out
}

function slugify(name) {
  return String(name)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " en ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
}

function uniqueSlug(base, used) {
  let s = base || "categorie"
  if (!used.has(s)) {
    used.add(s)
    return s
  }
  let i = 2
  while (used.has(`${s}-${i}`)) i++
  const out = `${s}-${i}`
  used.add(out)
  return out
}

function isRealUnit(eenheid) {
  const e = String(eenheid || "").trim()
  if (!e || e === "ja" || e === "nee") return false
  return true
}

function displayUnit(eenheid) {
  return isRealUnit(eenheid) ? String(eenheid).trim() : ""
}

// --- Load sources ---
const catWb = loadWorkbook(CAT_SRC)
const catRows = catWb["Boom niveau 1-3"]
if (!catRows) throw new Error("Boom niveau 1-3 missing")
const paths = []
for (const r of catRows.slice(1)) {
  const l1 = (r.cells.A || "").trim()
  const l2 = (r.cells.B || "").trim()
  const l3 = (r.cells.C || "").trim()
  if (!l1 && !l2 && !l3) continue
  if (!l1 || !l2 || !l3) throw new Error(`Incomplete category path row ${r.rowNum}`)
  paths.push({ l1, l2, l3, path: `${l1} > ${l2} > ${l3}`, isAlles: /^Alles in /i.test(l3) })
}
const pathSet = new Set(paths.map((p) => p.path))
if (pathSet.size !== paths.length) throw new Error("Duplicate category paths")

const specWb = loadWorkbook(SPEC_SRC)
const topRows = specWb["Top 10 specificaties"]
const lijstRows = specWb["Lijst (1 spec per rij)"]
const boekRows = specWb["Specificatie-woordenboek"]
if (!topRows || !lijstRows || !boekRows) throw new Error("Spec sheets missing")

const topByPath = new Map()
for (const r of topRows.slice(1)) {
  const l1 = (r.cells.A || "").trim()
  const l2 = (r.cells.B || "").trim()
  const l3 = (r.cells.C || "").trim()
  if (!l1) continue
  const p = `${l1} > ${l2} > ${l3}`
  const specs = ["D", "E", "F", "G", "H", "I", "J", "K", "L", "M"].map((c) =>
    String(r.cells[c] || "").trim()
  )
  topByPath.set(p, specs)
}

const lijstByPath = new Map()
for (const r of lijstRows.slice(1)) {
  const l1 = (r.cells.A || "").trim()
  const l2 = (r.cells.B || "").trim()
  const l3 = (r.cells.C || "").trim()
  if (!l1) continue
  const p = `${l1} > ${l2} > ${l3}`
  const item = {
    rang: Number(r.cells.D || 0),
    bron: String(r.cells.E || "").trim(),
    spec_code: String(r.cells.F || "").trim(),
    spec_naam_nl: String(r.cells.G || "").trim(),
    scope: String(r.cells.H || "").trim(),
    data_type: String(r.cells.I || "").trim(),
    eenheid: String(r.cells.J || "").trim(),
    multi_value: String(r.cells.K || "").trim(),
    verplichting: String(r.cells.L || "").trim(),
  }
  if (!lijstByPath.has(p)) lijstByPath.set(p, [])
  lijstByPath.get(p).push(item)
}
for (const [, arr] of lijstByPath) arr.sort((a, b) => a.rang - b.rang)

const boekByCode = new Map()
for (const r of boekRows.slice(1)) {
  const code = String(r.cells.A || "").trim()
  if (!code) continue
  boekByCode.set(code, {
    spec_code: code,
    spec_naam_nl: String(r.cells.B || "").trim(),
    data_type: String(r.cells.C || "").trim(),
    eenheid: String(r.cells.D || "").trim(),
    multi_value: String(r.cells.E || "").trim(),
    verplichting: String(r.cells.F || "").trim(),
  })
}

const inconsistencies = {
  pathMissingInTop: [],
  pathMissingInLijst: [],
  pathExtraInTop: [],
  wrongSpecCount: [],
  nameMismatchTopVsLijst: [],
  metaMismatchLijstVsBoek: [],
  missingInWoordenboek: [],
  nameResolvedViaWoordenboek: 0,
  keuzelijstWithoutOptions: 0,
  multiValueJaInLijst: 0,
  multiValueEmptyInLijst: 0,
  allVerplichtingOptional: true,
}

for (const p of paths) {
  if (!topByPath.has(p.path)) inconsistencies.pathMissingInTop.push(p.path)
  if (!lijstByPath.has(p.path)) inconsistencies.pathMissingInLijst.push(p.path)
}
for (const p of topByPath.keys()) {
  if (!pathSet.has(p)) inconsistencies.pathExtraInTop.push(p)
}

const pathSpecs = [] // final joined records
for (const p of paths) {
  const top = topByPath.get(p.path) || []
  const list = lijstByPath.get(p.path) || []
  if (top.filter(Boolean).length !== 10 || list.length !== 10) {
    inconsistencies.wrongSpecCount.push({
      path: p.path,
      top: top.filter(Boolean).length,
      lijst: list.length,
    })
  }
  const slots = []
  for (let i = 0; i < 10; i++) {
    const topName = top[i] || ""
    const item = list[i]
    if (!item) continue
    const def = boekByCode.get(item.spec_code)
    if (topName !== item.spec_naam_nl) {
      inconsistencies.nameMismatchTopVsLijst.push({
        path: p.path,
        slot: i + 1,
        top: topName,
        lijst: item.spec_naam_nl,
        woordenboek: def?.spec_naam_nl || "",
        code: item.spec_code,
      })
      inconsistencies.nameResolvedViaWoordenboek++
    }
    if (def) {
      const diffs = []
      if (def.data_type !== item.data_type) diffs.push(`data_type:${item.data_type}!=${def.data_type}`)
      if (def.eenheid !== item.eenheid) diffs.push(`eenheid:${item.eenheid}!=${def.eenheid}`)
      if (def.multi_value !== item.multi_value) {
        diffs.push(`multi:${item.multi_value || "(leeg)"}!=${def.multi_value || "(leeg)"}`)
      }
      if (def.verplichting !== item.verplichting) {
        diffs.push(`verplicht:${item.verplichting}!=${def.verplichting}`)
      }
      if (diffs.length) {
        inconsistencies.metaMismatchLijstVsBoek.push({
          path: p.path,
          slot: i + 1,
          code: item.spec_code,
          diffs,
        })
      }
    }
    if (item.data_type === "Keuzelijst") inconsistencies.keuzelijstWithoutOptions++
    if (item.multi_value === "ja") inconsistencies.multiValueJaInLijst++
    if (!item.multi_value) inconsistencies.multiValueEmptyInLijst++
    if (item.verplichting && item.verplichting !== "optioneel") {
      inconsistencies.allVerplichtingOptional = false
    }
    // Officiële zichtbare naam = woordenboek; eenheid apart (geen dubbele weergave).
    const officialName = (def?.spec_naam_nl || item.spec_naam_nl || topName).trim()
    if (!def) {
      inconsistencies.missingInWoordenboek = inconsistencies.missingInWoordenboek || []
      inconsistencies.missingInWoordenboek.push({
        path: p.path,
        slot: i + 1,
        code: item.spec_code,
        lijst: item.spec_naam_nl,
      })
    }
    slots.push({
      slot: i + 1,
      display_name: officialName,
      spec_code: item.spec_code,
      spec_naam_nl: item.spec_naam_nl,
      woordenboek_naam: def?.spec_naam_nl || "",
      top_naam: topName,
      data_type: item.data_type,
      eenheid: item.eenheid,
      eenheid_display: displayUnit(item.eenheid),
      multi_value: item.multi_value || "",
      verplichting: item.verplichting || "optioneel",
      bron: item.bron,
      scope: item.scope,
    })
  }
  pathSpecs.push({ ...p, key: `sp_${String(pathSpecs.length + 1).padStart(3, "0")}`, slots })
}

// Rebuild keys after push order is known
pathSpecs.forEach((ps, idx) => {
  ps.key = `sp_${String(idx + 1).padStart(3, "0")}`
})

// --- Category nodes for template builder (same as v2) ---
const usedSlugs = new Set()
const l1Nodes = new Map()
const l2Nodes = new Map()
const l3Nodes = new Map()
for (const p of paths) {
  if (!l1Nodes.has(p.l1)) {
    l1Nodes.set(p.l1, { name: p.l1, slug: uniqueSlug(slugify(p.l1), usedSlugs) })
  }
  const l2Key = `${p.l1}\0${p.l2}`
  if (!l2Nodes.has(l2Key)) {
    const l1slug = l1Nodes.get(p.l1).slug
    let base = slugify(p.l2)
    if (usedSlugs.has(base)) base = `${l1slug}-${base}`
    l2Nodes.set(l2Key, {
      name: p.l2,
      slug: uniqueSlug(base, usedSlugs),
      parentName: p.l1,
    })
  }
  const l3Key = `${p.l1}\0${p.l2}\0${p.l3}`
  if (!l3Nodes.has(l3Key)) {
    const l2 = l2Nodes.get(l2Key)
    let base = slugify(p.l3)
    if (usedSlugs.has(base)) base = `${l2.slug}-${base}`
    l3Nodes.set(l3Key, {
      name: p.l3,
      slug: uniqueSlug(base, usedSlugs),
      l1: p.l1,
      l2: p.l2,
    })
  }
}

const categories = []
for (const [name, n] of l1Nodes) {
  categories.push({
    id: `src_l1_${n.slug}`,
    name,
    slug: n.slug,
    parent_id: null,
    parent_category_id: null,
  })
}
for (const [, n] of l2Nodes) {
  const parent = l1Nodes.get(n.parentName)
  categories.push({
    id: `src_l2_${parent.slug}__${n.slug}`,
    name: n.name,
    slug: n.slug,
    parent_id: `src_l1_${parent.slug}`,
    parent_category_id: `src_l1_${parent.slug}`,
  })
}
for (const [, n] of l3Nodes) {
  const l1 = l1Nodes.get(n.l1)
  const l2 = l2Nodes.get(`${n.l1}\0${n.l2}`)
  categories.push({
    id: `src_l3_${l1.slug}__${l2.slug}__${n.slug}`,
    name: n.name,
    slug: n.slug,
    parent_id: `src_l2_${l1.slug}__${l2.slug}`,
    parent_category_id: `src_l2_${l1.slug}__${l2.slug}`,
  })
}

const { createJiti } = require(
  require.resolve("jiti", { paths: [backendRoot] })
)
const jiti = createJiti(import.meta.url)
const { buildProductImportTemplate, buildXlsxWorkbook } = jiti(
  path.join(backendRoot, "src/modules/product-cloud/import-xlsx.ts")
)
const { buildCategoryExcelLists } = jiti(
  path.join(backendRoot, "src/modules/product-cloud/import-category-excel.ts")
)

const lists = buildCategoryExcelLists(categories, { skipVisibilityFilter: true })
const rebuilt = []
for (const [l1, l2s] of lists.childrenByRootName) {
  for (const l2 of l2s) {
    for (const l3 of lists.l3ByL2Name.get(l2) || []) {
      rebuilt.push(`${l1} > ${l2} > ${l3}`)
    }
  }
}
const missingPaths = [...pathSet].filter((p) => !rebuilt.includes(p)).sort()
const extraPaths = rebuilt.filter((p) => !pathSet.has(p)).sort()
if (missingPaths.length || extraPaths.length) {
  throw new Error(
    `Category path mismatch missing=${missingPaths.length} extra=${extraPaths.length}`
  )
}

const tpl = buildProductImportTemplate([], {
  categories,
  skipCategoryVisibilityFilter: true,
})

function colName(index) {
  let n = index
  let s = ""
  while (n >= 0) {
    s = String.fromCharCode((n % 26) + 65) + s
    n = Math.floor(n / 26) - 1
  }
  return s
}

const producten = tpl.sheets.find((s) => s.name === "Producten")
const lijsten = tpl.sheets.find((s) => s.name === "Lijsten")
const specDepsSheet = tpl.sheets.find((s) => s.name === "SpecDeps")
const legenda = tpl.sheets.find((s) => s.name === "Legenda")
const uitleg = tpl.sheets.find((s) => s.name === "Uitleg velden")
if (!producten || !lijsten || !specDepsSheet) throw new Error("Template sheets missing")

const headers = producten.rows[0]
const findHeader = (pred) => headers.findIndex((h) => pred(String(h || "")))
const l1Idx = findHeader((h) => h.startsWith("Niveau 1"))
const l2Idx = findHeader((h) => h.startsWith("Niveau 2"))
const l3Idx = findHeader((h) => h.startsWith("Niveau 3"))
const specLabelIdx = []
const specValueIdx = []
for (let i = 1; i <= 10; i++) {
  specLabelIdx.push(findHeader((h) => h.startsWith(`Specificatie ${i} (`)))
  specValueIdx.push(findHeader((h) => h.startsWith(`Waarde ${i}`)))
}
if (l1Idx < 0 || l2Idx < 0 || l3Idx < 0 || specLabelIdx.some((i) => i < 0)) {
  throw new Error("Could not locate Niveau/Spec columns")
}
const l1Col = colName(l1Idx)
const l2Col = colName(l2Idx)
const l3Col = colName(l3Idx)

// Build SpecDeps: 10 label rows + 10 unit rows + 10 datatype rows + 10 code rows
const specDepHeader = pathSpecs.map((p) => p.key)
const specDepRows = [specDepHeader]
for (let slot = 0; slot < 10; slot++) {
  specDepRows.push(pathSpecs.map((p) => p.slots[slot]?.display_name || ""))
}
for (let slot = 0; slot < 10; slot++) {
  specDepRows.push(pathSpecs.map((p) => p.slots[slot]?.eenheid_display || ""))
}
for (let slot = 0; slot < 10; slot++) {
  specDepRows.push(pathSpecs.map((p) => p.slots[slot]?.data_type || ""))
}
for (let slot = 0; slot < 10; slot++) {
  specDepRows.push(pathSpecs.map((p) => p.slots[slot]?.spec_code || ""))
}
specDepsSheet.rows = specDepRows

// Append helper columns at end (does not shift existing DV column letters)
const pathActiefIdx = headers.length
headers.push("Categoriepad (actief)")
if (producten.headerStyles) producten.headerStyles.push(1)

const waardeControleIdx = headers.length
headers.push("Waarde-controle (automatisch)")
if (producten.headerStyles) producten.headerStyles.push(1)

const eenheidColIdx = []
for (let i = 1; i <= 10; i++) {
  eenheidColIdx.push(headers.length)
  headers.push(`Eenheid ${i} (automatisch)`)
  if (producten.headerStyles) producten.headerStyles.push(1)
}

const pathLookupLast = pathSpecs.length + 1
const pathLookupExpr = (excelRow) =>
  `${l1Col}${excelRow}&" > "&${l2Col}${excelRow}&" > "&${l3Col}${excelRow}`
const specLabelFormula = (excelRow, slot) =>
  `=IFERROR(INDEX(INDIRECT(VLOOKUP(${pathLookupExpr(excelRow)},Lijsten!$N$2:$O$${pathLookupLast},2,FALSE)),${slot}),"")`
const eenheidFormula = (excelRow, slot) =>
  `=IFERROR(INDEX(INDIRECT(VLOOKUP(${pathLookupExpr(excelRow)},Lijsten!$N$2:$O$${pathLookupLast},2,FALSE)),${10 + slot}),"")`
const valueColsExcel = specValueIdx.map((i) => colName(i))

for (let r = 1; r < producten.rows.length; r++) {
  const excelRow = r + 1
  const row = producten.rows[r]
  while (row.length < headers.length) row.push("")
  for (let slot = 1; slot <= 10; slot++) {
    const li = specLabelIdx[slot - 1]
    if (li >= 0) row[li] = specLabelFormula(excelRow, slot)
    const ei = eenheidColIdx[slot - 1]
    if (ei >= 0) row[ei] = eenheidFormula(excelRow, slot)
  }
  row[pathActiefIdx] =
    `=IF(OR(${l1Col}${excelRow}="",${l2Col}${excelRow}="",${l3Col}${excelRow}=""),"",${l1Col}${excelRow}&" > "&${l2Col}${excelRow}&" > "&${l3Col}${excelRow})`
  // Do not use COUNTA on Waarde cells: Excel counts formula-returned "" as non-empty.
  const anyValueFilled = valueColsExcel
    .map((c) => `${c}${excelRow}<>""`)
    .join(",")
  row[waardeControleIdx] =
    `=IF(OR(${anyValueFilled}),IF(OR(${l1Col}${excelRow}="",${l2Col}${excelRow}="",${l3Col}${excelRow}=""),"Vul Niveau 1–3 volledig in of wist Waarde 1–10.","LET OP: na categorie-wijziging blijven oude waarden staan — wist of corrigeer Waarde 1–10 handmatig zodat ze bij het actieve categoriepad horen."),"")`
}

// Rebuild Lijsten columns N/O (index 13/14) with full path map; keep other cols
const listHeader = lijsten.rows[0]
while (listHeader.length < 18) listHeader.push("")
listHeader[13] = "spec_categoriepad"
listHeader[14] = "spec_lijst_sleutel"

const maxList = Math.max(lijsten.rows.length - 1, pathSpecs.length, 2)
while (lijsten.rows.length < maxList + 1) {
  lijsten.rows.push(Array(listHeader.length).fill(""))
}
for (let i = 0; i < maxList; i++) {
  const row = lijsten.rows[i + 1]
  while (row.length < listHeader.length) row.push("")
  const ps = pathSpecs[i]
  row[13] = ps ? ps.path : ""
  row[14] = ps ? ps.key : ""
}

// definedNames: drop old spec_* then add path-keyed ranges (labels+units = 20 rows used by INDEX)
tpl.definedNames = (tpl.definedNames || []).filter((d) => !/^spec_/i.test(d.name))
pathSpecs.forEach((ps, colIdx) => {
  const letter = colName(colIdx)
  // rows 2..21 = labels(10)+units(10); datatype/code available below for audit
  tpl.definedNames.push({
    name: ps.key,
    refersTo: `'SpecDeps'!$${letter}$2:$${letter}$21`,
  })
})

// SpecMeta audit sheet (hidden later)
const metaRows = [
  [
    "categoriepad",
    "niveau_1",
    "niveau_2",
    "niveau_3",
    "spec_slot",
    "spec_code",
    "spec_naam_zichtbaar",
    "spec_naam_woordenboek",
    "spec_naam_nl_lijst",
    "spec_naam_top10",
    "data_type",
    "eenheid",
    "eenheid_display",
    "multi_value",
    "verplichting",
    "scope",
    "bron",
    "excel_key",
  ],
]
for (const ps of pathSpecs) {
  for (const s of ps.slots) {
    metaRows.push([
      ps.path,
      ps.l1,
      ps.l2,
      ps.l3,
      String(s.slot),
      s.spec_code,
      s.display_name,
      s.woordenboek_naam,
      s.spec_naam_nl,
      s.top_naam,
      s.data_type,
      s.eenheid,
      s.eenheid_display,
      s.multi_value,
      s.verplichting,
      s.scope,
      s.bron,
      ps.key,
    ])
  }
}
const metaIdx = tpl.sheets.findIndex((s) => s.name === "SpecDeps")
tpl.sheets.splice(metaIdx + 1, 0, { name: "SpecMeta", rows: metaRows })

if (legenda) {
  for (const row of legenda.rows) {
    if (String(row[0] || "").includes("Specificatie")) {
      row[2] =
        "Namen = officiële woordenboeknaam via SpecDeps (Niveau 1+2+3). Eenheid staat in Eenheid 1–10, niet dubbel in de naam. Vul alleen Waarde 1–10 in. Kolom Waarde-controle waarschuwt bij gevulde waarden: Excel zonder macro's wist waarden níet automatisch bij categorie-wijziging."
    }
  }
  legenda.rows.push([
    "Waarde-controle",
    "Waarschuwing",
    "Verschijnt zodra minstens één Waarde is gevuld. Na categorie-wijziging blijven oude waarden staan — wist of corrigeer handmatig.",
  ])
  legenda.rows.push([
    "Hulpbladen",
    "Verborgen",
    "CatDeps, CatDepsL3, SpecDeps, SpecMeta en Lijsten zijn verborgen; dropdowns en formules blijven werken.",
  ])
}
if (uitleg) {
  uitleg.rows.push([
    "(specificaties_definitief)",
    "Productspecificaties per categoriepad",
    "Top 10 slots per L1+L2+L3; zichtbare naam uit Specificatie-woordenboek",
    "Optioneel (alle bron-specs zijn optioneel)",
    "Materiaal, Vermogen, …",
    "Zie Eenheid-kolommen / bron",
    "Namen en eenheden vullen automatisch. Geen verzonnen keuzelijstwaarden. Bij categorie-wijziging: controleer Waarde 1–10 (worden niet automatisch gewist).",
  ])
}

function crc32(buf) {
  let crc = ~0
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i]
    for (let j = 0; j < 8; j++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1))
  }
  return ~crc >>> 0
}

function zipFiles(files) {
  const locals = []
  const centrals = []
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
    locals.push(local, compressed)
    centrals.push(central)
    offset += local.length + compressed.length
  }
  const centralBuf = Buffer.concat(centrals)
  const end = Buffer.alloc(22)
  end.writeUInt32LE(0x06054b50, 0)
  end.writeUInt16LE(0, 4)
  end.writeUInt16LE(0, 6)
  end.writeUInt16LE(files.length, 8)
  end.writeUInt16LE(files.length, 10)
  end.writeUInt32LE(centralBuf.length, 12)
  end.writeUInt32LE(offset, 16)
  end.writeUInt16LE(0, 20)
  return Buffer.concat([...locals, centralBuf, end])
}

/** Hide technical sheets in workbook.xml while keeping formulas/names intact. */
function hideHelperSheets(xlsxBuf, sheetNamesToHide) {
  const z = parseZip(xlsxBuf)
  const wbPath = "xl/workbook.xml"
  let wb = z[wbPath].toString()
  for (const name of sheetNamesToHide) {
    const esc = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    const re = new RegExp(`<sheet name="${esc}"([^>]*)/>`, "g")
    wb = wb.replace(re, (full, attrs) => {
      const cleaned = String(attrs).replace(/\s*state="[^"]*"/g, "")
      return `<sheet name="${name}"${cleaned} state="hidden"/>`
    })
  }
  z[wbPath] = Buffer.from(wb, "utf8")
  const files = Object.entries(z)
    .filter(([, data]) => data)
    .map(([name, data]) => ({ name, data }))
  return zipFiles(files)
}

let buf = buildXlsxWorkbook(tpl.sheets, { definedNames: tpl.definedNames })
buf = hideHelperSheets(buf, [
  "CatDeps",
  "CatDepsL3",
  "SpecDeps",
  "SpecMeta",
  "Lijsten",
])
mkdirSync(path.dirname(outPath), { recursive: true })
writeFileSync(outPath, buf)
mkdirSync(path.dirname(mirrorPath), { recursive: true })
writeFileSync(mirrorPath, buf)

// Verification: meta+code exact from Lijst; display name = woordenboek
let exactSpecMatches = 0
let totalSpecSlots = 0
let displayNameOfficial = 0
for (const ps of pathSpecs) {
  const list = lijstByPath.get(ps.path) || []
  for (let i = 0; i < 10; i++) {
    totalSpecSlots++
    const slot = ps.slots[i]
    const def = boekByCode.get(list[i]?.spec_code)
    const expectedName = (def?.spec_naam_nl || list[i]?.spec_naam_nl || "").trim()
    if (
      slot &&
      slot.display_name === expectedName &&
      slot.spec_code === list[i]?.spec_code &&
      slot.spec_naam_nl === list[i]?.spec_naam_nl &&
      slot.data_type === list[i]?.data_type &&
      slot.eenheid === list[i]?.eenheid &&
      slot.multi_value === (list[i]?.multi_value || "") &&
      slot.verplichting === list[i]?.verplichting
    ) {
      exactSpecMatches++
    }
    if (slot && def && slot.display_name === def.spec_naam_nl) displayNameOfficial++
  }
}

const unresolvedNameIssues = inconsistencies.missingInWoordenboek.slice()
const limitations = [
  "Geen keuzelijst-optiewaarden in de bron → vrije tekstinvoer (geen verzonnen dropdowns).",
  "Geen betrouwbare per-cel datatype-validatie over gemengde rijen zonder VBA.",
  "Zonder macro's worden Waarde-cellen niet automatisch gewist bij categorie-wijziging; kolom Waarde-controle toont een duidelijke waarschuwing.",
  "Kolom eenheid in bron bevat ook ja/nee; alleen echte eenheden (cm, kg, …) in Eenheid N.",
  "Lijst multi_value is vaak leeg terwijl Woordenboek soms 'ja' heeft — Lijst-waarde per pad exact overgenomen.",
]

if (inconsistencies.metaMismatchLijstVsBoek.length) {
  limitations.push(
    `Lijst vs Woordenboek metamismatches (niet stilzwijgend gecorrigeerd): ${inconsistencies.metaMismatchLijstVsBoek.length}`
  )
}

const report = {
  outPath,
  bytes: buf.length,
  categorySource: CAT_SRC,
  specSource: SPEC_SRC,
  categoriePadenGecontroleerd: paths.length,
  specificatiesExactOvereenkomend: exactSpecMatches,
  specificatiesTotaalSlots: totalSpecSlots,
  displayNameOfficial,
  nameResolvedViaWoordenboek: inconsistencies.nameResolvedViaWoordenboek,
  unresolvedNameIssues: unresolvedNameIssues.length,
  unresolvedNameSample: unresolvedNameIssues.slice(0, 10),
  ontbrekendeOfAfwijkendePaden:
    missingPaths.length + extraPaths.length + inconsistencies.pathMissingInTop.length,
  hiddenSheets: ["CatDeps", "CatDepsL3", "SpecDeps", "SpecMeta", "Lijsten"],
  improvements: [
    "Hulpbladen CatDeps/CatDepsL3/SpecDeps/SpecMeta/Lijsten verborgen",
    "Zichtbare specificatienaam = Specificatie-woordenboek (geen eenheid in naam; Eenheid-kolom apart)",
    "50 Top10-vs-Lijst naamverschillen opgelost via woordenboek + aparte eenheid",
    "Kolommen Categoriepad (actief) en Waarde-controle (waarschuwing zonder VBA)",
  ],
  L1: lists.roots.length,
  L2: lists.children.length,
  L3: lists.grandchildren.length,
  inconsistencies: {
    pathMissingInTop: inconsistencies.pathMissingInTop.length,
    pathMissingInLijst: inconsistencies.pathMissingInLijst.length,
    wrongSpecCount: inconsistencies.wrongSpecCount.length,
    nameMismatchTopVsLijstResolved: inconsistencies.nameMismatchTopVsLijst.length,
    metaMismatchLijstVsBoek: inconsistencies.metaMismatchLijstVsBoek.length,
    missingInWoordenboek: inconsistencies.missingInWoordenboek.length,
    keuzelijstWithoutOptions: inconsistencies.keuzelijstWithoutOptions,
    multiValueEmptyInLijst: inconsistencies.multiValueEmptyInLijst,
    allVerplichtingOptional: inconsistencies.allVerplichtingOptional,
  },
  limitations,
}

writeFileSync(reportPath, JSON.stringify(report, null, 2))
console.log(JSON.stringify(report, null, 2))
if (report.ontbrekendeOfAfwijkendePaden !== 0) process.exitCode = 1
if (exactSpecMatches !== totalSpecSlots) {
  console.warn(`WARN: exactSpecMatches ${exactSpecMatches}/${totalSpecSlots}`)
}
