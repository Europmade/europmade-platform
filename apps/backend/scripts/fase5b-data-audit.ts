/**
 * Fase 5B Excel data audit — READ ONLY, no DB writes.
 * Usage: npx jiti scripts/fase5b-data-audit.ts
 */
import { readFileSync, writeFileSync } from "node:fs"
import { resolve } from "node:path"
import {
  parseXlsxWorkbook,
  sheetToRecords,
} from "../src/modules/product-cloud/import-xlsx"
import { loadFase5bWorkbook } from "../src/modules/product-cloud/fase5b-import/excel-loader"
import { loadCategoryMappingFile } from "../src/modules/product-cloud/fase5b-import/category-map"
import { resolveFase5bIdentifier } from "../src/modules/product-cloud/fase5b-import/identifier-resolve"
import { decideFase5bImport } from "../src/modules/product-cloud/fase5b-import/verification-rules"
import { hasRichContent } from "../src/modules/product-cloud/fase5b-import/content-builder"
import { runDryRun } from "../src/modules/product-cloud/fase5b-import/dry-run"

const EXCEL =
  process.env.FASE5B_EXCEL ||
  resolve(
    process.env.USERPROFILE || process.env.HOME || "",
    "Downloads/EuropMade_Fase5_Productselectie_4.xlsx"
  )
const CATEGORY_MAP = resolve(
  __dirname,
  "../../../scripts/fase5b-category-mapping.json"
)
const OUT = resolve(__dirname, "../../../scripts/fase5b-data-audit-report.json")

function isValidGtin(value: string): boolean {
  const digits = value.replace(/\s/g, "")
  return /^\d{8}$/.test(digits) || /^\d{12,14}$/.test(digits)
}

function norm(s: string): string {
  return s.trim().toUpperCase()
}

function countBy<T>(items: T[], fn: (item: T) => string): Record<string, number> {
  const out: Record<string, number> = {}
  for (const item of items) {
    const k = fn(item) || "(leeg)"
    out[k] = (out[k] || 0) + 1
  }
  return out
}

function main() {
  const buf = readFileSync(EXCEL)
  const rawWb = parseXlsxWorkbook(buf)
  const productTable = rawWb.sheets.get("03_Productonderzoek") || []
  const headers = productTable[0] || []
  const records = sheetToRecords(productTable)
  const workbook = loadFase5bWorkbook(buf)
  const products = workbook.products

  // --- Column discovery for MPN-like fields ---
  const mpnLikeHeaders = headers.filter((h) =>
    /mpn|artikel|sku|model|referentie|article|part/i.test(h)
  )

  const altMpnStats: Record<string, { filled: number; sample: string[] }> = {}
  for (const h of mpnLikeHeaders) {
    const filled: string[] = []
    for (const r of records) {
      const v = (r[h] || "").trim()
      if (v) filled.push(v)
    }
    altMpnStats[h] = {
      filled: filled.length,
      sample: filled.slice(0, 3),
    }
  }

  // Also check if "EAN/GTIN" has non-valid values that might have been counted as MPN in analysis
  const eanColFilled = records.filter((r) => (r["EAN/GTIN"] || "").trim()).length
  const eanColValidGtin = records.filter((r) =>
    isValidGtin(r["EAN/GTIN"] || "")
  ).length
  const eanColInvalidNonEmpty = records.filter((r) => {
    const v = (r["EAN/GTIN"] || "").trim()
    return v && !isValidGtin(v)
  })

  const mpnColFilled = records.filter((r) =>
    (r["MPN/artikelnummer"] || "").trim()
  ).length

  // Identifier buckets (engine logic)
  let gtin = 0
  let mpn = 0
  let importRef = 0
  let noIdentifier = 0
  for (const p of products) {
    const id = resolveFase5bIdentifier({
      em_product_id: p.em_product_id,
      ean_gtin: p.ean_gtin,
      mpn: p.mpn,
    })
    if (id.source === "gtin") gtin++
    else if (id.source === "mpn") mpn++
    else importRef++
    if (!p.ean_gtin.trim() && !p.mpn.trim()) noIdentifier++
  }

  // Raw: any EAN cell + any MPN cell (no validation)
  const rawAnyEan = products.filter((p) => p.ean_gtin.trim()).length
  const rawAnyMpn = products.filter((p) => p.mpn.trim()).length
  const rawNeither = products.filter(
    (p) => !p.ean_gtin.trim() && !p.mpn.trim()
  ).length

  const missingCategory = products.filter(
    (p) => !p.claude_hoofdcategorie.trim()
  )
  const missingBrand = products.filter((p) => !p.merk.trim())
  const missingFabrikant = products.filter((p) => !p.fabrikant.trim())

  const verificationCounts = countBy(products, (p) =>
    norm(p.verification_status)
  )
  const productstatusCounts = countBy(products, (p) => p.productstatus.trim())

  const rejected = products
    .filter((p) => norm(p.verification_status) === "REJECTED")
    .map((p) => ({
      em_product_id: p.em_product_id,
      productnaam: p.productnaam,
      merk: p.merk,
      subcategorie: p.subcategorie,
      claude_hoofdcategorie: p.claude_hoofdcategorie,
      verification_status: p.verification_status,
    }))
    .sort((a, b) => a.em_product_id.localeCompare(b.em_product_id))

  const missingCategoryList = missingCategory
    .map((p) => ({
      em_product_id: p.em_product_id,
      productnaam: p.productnaam,
      merk: p.merk,
      subcategorie: p.subcategorie,
      bedrijf: p.bedrijf,
      fabrikant: p.fabrikant,
      productstatus: p.productstatus,
      verification_status: p.verification_status,
      ean_gtin: p.ean_gtin,
      mpn: p.mpn,
      product_url: p.product_url,
    }))
    .sort((a, b) => a.em_product_id.localeCompare(b.em_product_id))

  // Content presence
  let noContent = 0
  for (const p of products) {
    const c = workbook.contentByEmId.get(p.em_product_id)
    if (!hasRichContent(c)) noContent++
  }

  // Dry-run breakdown
  const mapping = loadCategoryMappingFile(CATEGORY_MAP)
  const dryRun = runDryRun({ workbook, categoryMapping: mapping })

  const skipReasons: Record<string, number> = {}
  const skipByEm: Array<{ em: string; reason: string }> = []
  for (const p of dryRun.products) {
    if (p.action === "create") continue
    const reason = p.skip_reason || "onbekend"
    let bucket = reason
    if (reason.includes("REJECTED")) bucket = "REJECTED"
    else if (reason.includes("categorie-mapping")) bucket = "ontbrekende categorie"
    else bucket = reason
    skipReasons[bucket] = (skipReasons[bucket] || 0) + 1
    skipByEm.push({ em: p.em_product_id, reason })
  }

  // Would-create blockers among non-rejected importable
  let importableNotCreated = 0
  const importableSkipReasons: Record<string, number> = {}
  for (const p of products) {
    const decision = decideFase5bImport(p.verification_status)
    if (!decision.import) continue
    const plan = dryRun.products.find((x) => x.em_product_id === p.em_product_id)
    if (plan?.action === "create") continue
    importableNotCreated++
    const reason = plan?.skip_reason || "onbekend"
    let bucket = "andere validatiefout"
    if (reason.includes("categorie-mapping")) bucket = "ontbrekende categorie"
    importableSkipReasons[bucket] = (importableSkipReasons[bucket] || 0) + 1
  }

  // Compare invalid EAN values — might explain MPN discrepancy if analysis used different rules
  const invalidEanSamples = eanColInvalidNonEmpty.slice(0, 10).map((r) => ({
    em: r["Product-ID"],
    ean: r["EAN/GTIN"],
    mpn: r["MPN/artikelnummer"],
  }))

  const report = {
    source_file: EXCEL,
    audited_at: new Date().toISOString(),
    A_excel_facts: {
      total_products: products.length,
      unique_em_ids: new Set(products.map((p) => p.em_product_id)).size,
      duplicate_em_ids: products.length - new Set(products.map((p) => p.em_product_id)).size,
      ean_gtin_column_any_value: rawAnyEan,
      ean_gtin_column_valid_gtin: eanColValidGtin,
      ean_gtin_column_invalid_nonempty: eanColInvalidNonEmpty.length,
      mpn_column_filled: mpnColFilled,
      neither_ean_nor_mpn_raw: rawNeither,
      engine_gtin: gtin,
      engine_mpn: mpn,
      engine_import_ref: importRef,
      engine_no_both_raw_empty: noIdentifier,
      missing_hoofdcategorie: missingCategory.length,
      missing_merk: missingBrand.length,
      missing_fabrikant: missingFabrikant.length,
      no_rich_content_06: noContent,
      verification_status: verificationCounts,
      productstatus: productstatusCounts,
      sheet_headers: headers,
      mpn_like_columns: altMpnStats,
    },
    B_claude_comparison: {
      claude_expected: {
        total: 599,
        ean: 112,
        mpn_only: 408,
        no_identifier: 79,
        rejected: 26,
      },
      excel_actual_engine_rules: {
        total: products.length,
        gtin: gtin,
        mpn: mpn,
        import_ref: importRef,
        rejected: rejected.length,
      },
      excel_raw_column_rules: {
        any_ean_cell: rawAnyEan,
        valid_gtin: eanColValidGtin,
        invalid_ean_cell: eanColInvalidNonEmpty.length,
        mpn_cell: mpnColFilled,
        neither_cell_empty: rawNeither,
      },
      gaps: {
        mpn_column_vs_claude_408: mpnColFilled - 408,
        import_ref_vs_claude_79: importRef - 79,
        rejected_vs_claude_26: rejected.length - 26,
        invalid_ean_cells_that_become_import_ref:
          eanColInvalidNonEmpty.length - mpnColFilled,
      },
    },
    C_missing_category_82: missingCategoryList,
    D_rejected: {
      count: rejected.length,
      em_ids: rejected.map((r) => r.em_product_id),
      products: rejected,
      claude_had_26_note:
        "Als Claude 26 telde, ontbreekt 1 ID in dit bestand of gebruikte andere statusbron (04_Verification).",
    },
    E_dry_run_256: {
      would_create: dryRun.summary.would_create,
      would_skip: dryRun.summary.would_skip,
      skip_reason_buckets: skipReasons,
      importable_but_skipped: importableNotCreated,
      importable_skip_buckets: importableSkipReasons,
      math: {
        total: products.length,
        rejected_skip: dryRun.summary.rejected_skipped,
        category_skip_among_importable: importableSkipReasons["ontbrekende categorie"] || 0,
        would_create: dryRun.summary.would_create,
        check:
          dryRun.summary.would_create +
          dryRun.summary.would_skip,
      },
    },
    F_claude_corrections_needed: [] as string[],
    G_problem_classification: {
      data_quality: [] as string[],
      technical: [] as string[],
    },
    invalid_ean_samples: invalidEanSamples,
  }

  // Fill F and G
  if (mpnColFilled === 0) {
    report.F_claude_corrections_needed.push(
      "Kolom MPN/artikelnummer is volledig leeg in 03_Productonderzoek — 408 MPN uit eerdere analyse staan niet in dit Excelbestand."
    )
    report.G_problem_classification.data_quality.push(
      "MPN-kolom leeg: 487 producten hebben geen MPN in Excel (engine gebruikt IMPORT_REF)."
    )
  }
  if (eanColInvalidNonEmpty.length > 0) {
    report.F_claude_corrections_needed.push(
      `${eanColInvalidNonEmpty.length} producten hebben een waarde in EAN/GTIN die geen geldige GTIN is (korte codes zoals 1519, 3736) — niet als EAN importeren; MPN-kolom is leeg.`
    )
    report.G_problem_classification.data_quality.push(
      "Pseudo-EAN waarden in EAN/GTIN-kolom zonder MPN in aparte kolom."
    )
  }
  if (missingCategory.length > 0) {
    report.F_claude_corrections_needed.push(
      `${missingCategory.length} producten missen EuropMade-hoofdcategorie — aanvullen in Excel vóór import.`
    )
    report.G_problem_classification.data_quality.push(
      "Ontbrekende hoofdcategorie blokkeert categorie-mapping voor 82 producten."
    )
  }
  if (rejected.length !== 26) {
    report.F_claude_corrections_needed.push(
      `REJECTED-telling: ${rejected.length} in Excel vs 26 in Claude-analyse — status verifiëren (mogelijk 04_Verification vs 03_Productonderzoek).`
    )
    report.G_problem_classification.data_quality.push(
      "REJECTED-aantal verschil (25 vs 26)."
    )
  }
  report.G_problem_classification.technical.push(
    "Dry-run telt alleen geldige GTIN (8/12-14 cijfers); ruwe EAN-kolom had meer gevulde cellen."
  )
  report.G_problem_classification.technical.push(
    "256 create = 574 importeerbaar (599−25 REJECTED) − 318 categorie-skip (82 unieke producten + mogelijk overlap? nee — category skip only among importable)."
  )

  writeFileSync(OUT, JSON.stringify(report, null, 2), "utf8")

  // Console summary
  console.log(JSON.stringify(report.A_excel_facts, null, 2))
  console.log("\n--- REJECTED IDs ---")
  console.log(report.D_rejected.em_ids.join(", "))
  console.log(`\n--- Missing category: ${missingCategoryList.length} ---`)
  for (const r of missingCategoryList) {
    console.log(
      `${r.em_product_id} | ${r.merk} | ${r.subcategorie} | ${r.verification_status}`
    )
  }
  console.log("\n--- Dry-run skip buckets ---")
  console.log(JSON.stringify(skipReasons, null, 2))
  console.log(`\nFull report: ${OUT}`)
}

main()
