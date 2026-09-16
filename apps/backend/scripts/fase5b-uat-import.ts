/**
 * Fase 5B UAT import — kleine testselectie onder Demo Selectie seller.
 *
 * Usage:
 *   pnpm --filter @europmade/backend fase5b:uat-preflight
 *   pnpm --filter @europmade/backend fase5b:uat-import
 */
import { readFileSync, writeFileSync } from "node:fs"
import { createRequire } from "node:module"
import { resolve, join as pathJoin } from "node:path"
import express from "express"
import { loadEnv } from "@medusajs/framework/utils"
import { container } from "@medusajs/framework"
import medusaLoader from "@medusajs/medusa/loaders/index"
import {
  FASE5B_UAT_PRODUCTS,
  FASE5B_SELECTIE_SELLER_ID,
  FASE5B_LEGACY_SELLER_ID,
  buildUatPreflightRows,
  createEmptyManifest,
  loadCategoryMappingFile,
  loadFase5bWorkbook,
  recomputeManifestSummary,
  saveManifest,
} from "../src/modules/product-cloud/fase5b-import"
import type { UatCommitReport } from "../src/modules/product-cloud/fase5b-import/uat-preflight"

const BACKEND_ROOT = resolve(__dirname, "..")
const REPO_ROOT = resolve(BACKEND_ROOT, "../..")
const DEFAULT_EXCEL = resolve(
  process.env.USERPROFILE || process.env.HOME || "",
  "Downloads/EuropMade_Fase5_Productselectie_4.xlsx"
)
const CATEGORY_MAP = resolve(REPO_ROOT, "scripts/fase5b-category-mapping.json")
const MANIFEST_PATH = resolve(REPO_ROOT, "scripts/fase5b-import-manifest.json")
const backendRequire = createRequire(pathJoin(BACKEND_ROOT, "package.json"))

const args = process.argv.slice(2)
const commit = args.includes("--commit")
const initTest = args.includes("--init-test")
const excelPath = args.find((a) => !a.startsWith("--")) || DEFAULT_EXCEL

const BACKEND = process.env.MEDUSA_BACKEND_URL || "http://127.0.0.1:9000"
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin-e2e@example.com"
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "REDACTED_ADMIN_PASSWORD"

function psql(sql: string): string {
  const { execSync } = require("node:child_process") as typeof import("node:child_process")
  const out = execSync(
    `docker exec europmade-postgres psql -U europmade -d europmade -t -A -c ${JSON.stringify(sql)}`,
    { encoding: "utf8" }
  )
  return out.trim()
}

async function buildPsqlPreflightSnapshot(
  workbook: ReturnType<typeof loadFase5bWorkbook>
) {
  const selectieExists =
    psql(
      `SELECT COUNT(*) FROM seller WHERE id = '${FASE5B_SELECTIE_SELLER_ID}' AND deleted_at IS NULL;`
    ) === "1"
  const legacyExists =
    psql(
      `SELECT COUNT(*) FROM seller WHERE id = '${FASE5B_LEGACY_SELLER_ID}' AND deleted_at IS NULL;`
    ) === "1"
  const legacyCount = Number(
    psql(
      `SELECT COUNT(*) FROM pc_product WHERE deleted_at IS NULL AND current_owner_seller_id = '${FASE5B_LEGACY_SELLER_ID}';`
    )
  )

  const conflicting_gtins: string[] = []
  const conflicting_import_refs: string[] = []
  const checked = new Set<string>()

  for (const row of workbook.products) {
    if (!FASE5B_UAT_PRODUCTS.includes(row.em_product_id as (typeof FASE5B_UAT_PRODUCTS)[number])) {
      continue
    }
    const status = row.verification_status.trim().toUpperCase()
    if (status === "REJECTED") continue

    const ean = (row.ean_gtin || "").replace(/\s/g, "")
    let key = ""
    let value = ""
    let type = ""
    if (/^\d{8}$/.test(ean) || /^\d{12,14}$/.test(ean)) {
      type = "GTIN"
      value = ean
      key = `GTIN:${ean}`
    } else {
      type = "IMPORT_REF"
      value = row.em_product_id
      key = `IMPORT_REF:${value}`
    }
    if (checked.has(key)) continue
    checked.add(key)

    const hit = psql(
      `SELECT COUNT(*) FROM identifier i JOIN pc_product_variant v ON v.id = i.product_variant_id JOIN pc_product p ON p.id = v.product_id WHERE i.deleted_at IS NULL AND p.deleted_at IS NULL AND i.identifier_type = '${type}' AND i.identifier_value = '${value.replace(/'/g, "''")}';`
    )
    if (Number(hit) > 0) {
      if (type === "GTIN") conflicting_gtins.push(value)
      else conflicting_import_refs.push(value)
    }
  }

  return {
    selectie_seller_exists: selectieExists,
    legacy_seller_exists: legacyExists,
    legacy_product_count: legacyCount,
    conflicting_gtins,
    conflicting_import_refs,
  }
}

async function ensureImportRefMigration(): Promise<string> {
  const { execSync } = await import("node:child_process")
  const check = execSync(
    `docker exec europmade-postgres psql -U europmade -d europmade -t -A -c "SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'identifier'::regclass AND conname = 'identifier_identifier_type_check';"`,
    { encoding: "utf8" }
  ).trim()

  if (check.includes("IMPORT_REF")) {
    return "IMPORT_REF constraint al aanwezig — geen migratie uitgevoerd"
  }

  const sql = `
ALTER TABLE IF EXISTS "identifier" DROP CONSTRAINT IF EXISTS "identifier_identifier_type_check";
ALTER TABLE IF EXISTS "identifier" ADD CONSTRAINT "identifier_identifier_type_check"
  CHECK ("identifier_type" IN ('GTIN', 'MPN', 'IMPORT_REF'));
INSERT INTO mikro_orm_migrations (name, executed_at)
  SELECT 'Migration20260831120000', NOW()
  WHERE NOT EXISTS (
    SELECT 1 FROM mikro_orm_migrations WHERE name = 'Migration20260831120000'
  );
`
  execSync(
    `docker exec -i europmade-postgres psql -U europmade -d europmade -v ON_ERROR_STOP=1`,
    { input: sql, encoding: "utf8" }
  )

  const after = execSync(
    `docker exec europmade-postgres psql -U europmade -d europmade -t -A -c "SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'identifier'::regclass AND conname = 'identifier_identifier_type_check';"`,
    { encoding: "utf8" }
  ).trim()

  if (!after.includes("IMPORT_REF")) {
    throw new Error("IMPORT_REF migratie mislukt")
  }

  return "Migration20260831120000 uitgevoerd (identifier constraint → GTIN, MPN, IMPORT_REF)"
}

function printPreflightTable(
  rows: ReturnType<typeof buildUatPreflightRows>
) {
  console.log("\nPreflight per product:")
  console.log(
    "EM-ID | Naam | Merk | Verificatie | Categorie | ID-type | Afbeeldingen | Importeerbaar"
  )
  console.log("-".repeat(100))
  for (const r of rows) {
    console.log(
      [
        r.em_product_id,
        r.productnaam.slice(0, 30),
        r.merk.slice(0, 15),
        r.verification_status,
        r.category_name || "-",
        r.identifier_type || "-",
        `${r.valid_images}/${r.selected_images}`,
        r.importable ? "JA" : `NEE (${r.skip_reason})`,
      ].join(" | ")
    )
  }
}

/** Same ts-node hook as @medusajs/cli/cli.js so medusa-config.ts can be required. */
function registerMedusaTypeScriptSupport(): void {
  try {
    require("ts-node").register({ transpileOnly: true })
    require("tsconfig-paths").register({})
  } catch (e) {
    const isProduction = process.env.NODE_ENV === "production"
    if (!isProduction) {
      console.warn(
        "ts-node/tsconfig-paths kon niet worden geregistreerd; medusa-config.ts laden kan falen"
      )
      console.warn(e)
    }
  }
}

/** Bootstrap Medusa DI using the same loader path as `medusa exec`. */
async function bootstrapMedusaForImport(): Promise<void> {
  process.chdir(BACKEND_ROOT)
  registerMedusaTypeScriptSupport()
  await medusaLoader({
    directory: BACKEND_ROOT,
    expressApp: express(),
    skipLoadingEntryPoints: true,
  })
}

function loadUatCommitModule(): {
  runUatImportCommit: (input: unknown) => Promise<UatCommitReport>
} {
  return backendRequire(
    "./src/modules/product-cloud/fase5b-import/commit"
  ) as {
    runUatImportCommit: (input: unknown) => Promise<UatCommitReport>
  }
}

/** Read-only: prove container + commit module load; no product writes. */
async function runInitTest(opts: {
  workbook: ReturnType<typeof loadFase5bWorkbook>
  categoryMapping: ReturnType<typeof loadCategoryMappingFile>
  emFilter: string[]
  legacyCountBefore: number
}): Promise<void> {
  console.log("\n=== Init-test (read-only, geen writes) ===\n")
  await bootstrapMedusaForImport()

  const productCloudKey = "productCloud"
  if (!container.hasRegistration(productCloudKey)) {
    throw new Error("productCloud module niet geregistreerd in container")
  }

  const { runUatImportCommit } = loadUatCommitModule()
  if (typeof runUatImportCommit !== "function") {
    throw new Error("commit-module niet geladen")
  }

  const preflightRows = buildUatPreflightRows({
    workbook: opts.workbook,
    categoryMapping: opts.categoryMapping,
    emFilter: opts.emFilter,
  })
  const importable = preflightRows.filter((r) => r.importable)
  console.log(`Commit-module geladen: runUatImportCommit`)
  console.log(`Container modules: productCloud=${container.hasRegistration(productCloudKey)}`)
  console.log(`Voorbereid voor import: ${importable.length} producten`)
  console.log(
    importable.map((r) => r.em_product_id).join(", ")
  )

  const legacyAfter = Number(
    psql(
      `SELECT COUNT(*) FROM pc_product WHERE deleted_at IS NULL AND current_owner_seller_id = '${FASE5B_LEGACY_SELLER_ID}';`
    )
  )
  const selectieAfter = Number(
    psql(
      `SELECT COUNT(*) FROM pc_product WHERE deleted_at IS NULL AND current_owner_seller_id = '${FASE5B_SELECTIE_SELLER_ID}';`
    )
  )

  if (legacyAfter !== opts.legacyCountBefore) {
    throw new Error(
      `Legacy count gewijzigd: ${opts.legacyCountBefore} → ${legacyAfter}`
    )
  }

  console.log(`\nLegacy producten: ${legacyAfter} (ongewijzigd)`)
  console.log(`Selectie seller producten: ${selectieAfter} (geen import uitgevoerd)`)
  console.log("\nInit-test geslaagd — container klaar, geen writes.")
}

async function main() {
  loadEnv(process.env.NODE_ENV || "development", BACKEND_ROOT)

  console.log("=== Fase 5B UAT Import ===\n")
  console.log(`Excel: ${excelPath}`)
  console.log(`Target seller: ${FASE5B_SELECTIE_SELLER_ID}`)
  console.log(`EM-IDs: ${FASE5B_UAT_PRODUCTS.join(", ")}\n`)

  const buf = readFileSync(excelPath)
  const workbook = loadFase5bWorkbook(buf)
  const categoryMapping = loadCategoryMappingFile(CATEGORY_MAP)
  const emFilter = [...FASE5B_UAT_PRODUCTS]

  const dbSnapshot = await buildPsqlPreflightSnapshot(workbook)

  if (dbSnapshot) {
    console.log("DB preflight:")
    console.log(
      JSON.stringify(
        {
          selectie_seller_exists: dbSnapshot.selectie_seller_exists,
          legacy_seller_exists: dbSnapshot.legacy_seller_exists,
          legacy_product_count: dbSnapshot.legacy_product_count,
          gtin_conflicts: dbSnapshot.conflicting_gtins.length,
          import_ref_conflicts: dbSnapshot.conflicting_import_refs.length,
        },
        null,
        2
      )
    )
    if (!dbSnapshot.selectie_seller_exists) {
      throw new Error("Target seller bestaat niet")
    }
    if (
      dbSnapshot.conflicting_gtins.length > 0 ||
      dbSnapshot.conflicting_import_refs.length > 0
    ) {
      throw new Error("Identifier-conflicten gedetecteerd — import gestopt")
    }
  }

  const preflightRows = buildUatPreflightRows({
    workbook,
    categoryMapping,
    emFilter,
  })
  printPreflightTable(preflightRows)

  const importable = preflightRows.filter((r) => r.importable)
  console.log(
    `\nPreflight geslaagd: ${importable.length}/${preflightRows.length}`
  )

  if (initTest) {
    await runInitTest({
      workbook,
      categoryMapping,
      emFilter,
      legacyCountBefore: dbSnapshot.legacy_product_count,
    })
    process.exit(0)
  }

  if (!commit) {
    console.log(
      "\nRead-only preflight afgerond. Voer import uit met: pnpm --filter @europmade/backend fase5b:uat-import"
    )
    return
  }

  if (importable.length === 0) {
    console.error("Geen importeerbare producten — import afgebroken")
    process.exit(1)
  }

  const migrationResult = await ensureImportRefMigration()
  console.log(`\nMigratie: ${migrationResult}`)

  await bootstrapMedusaForImport()

  const { runUatImportCommit } = loadUatCommitModule()

  const report: UatCommitReport = await runUatImportCommit({
    container,
    workbook,
    categoryMapping,
    emFilter,
  })

  console.log("\nImport resultaten:")
  for (const p of report.products) {
    console.log(
      `${p.em_product_id} → ${p.product_cloud_id ?? "—"} | ${p.import_status} | pub=${p.publication_status} | offer=${p.offer_status} | media=${p.images_uploaded}/${p.images_selected}${p.error ? ` | ERR: ${p.error}` : ""}`
    )
  }

  console.log(
    `\nLegacy producten: ${report.legacy_product_count_before} → ${report.legacy_product_count_after} (moet gelijk blijven)`
  )

  const manifest = createEmptyManifest({
    import_batch: "fase5b-uat-import",
    source_file: excelPath.split(/[/\\]/).pop() || "EuropMade_Fase5_Productselectie_4.xlsx",
    em_ids: emFilter,
  })

  const ts = new Date().toISOString()
  for (const entry of manifest.products) {
    const result = report.products.find(
      (p) => p.em_product_id === entry.em_product_id
    )
    if (!result) continue
    entry.product_cloud_id = result.product_cloud_id
    entry.identifier_type =
      (result.identifier_type as typeof entry.identifier_type) ?? null
    entry.identifier_value = result.identifier_value
    entry.category_id = result.category_id || null
    entry.verification_status = result.verification_status
    entry.import_status =
      result.import_status === "created"
        ? "created"
        : result.import_status === "skipped"
          ? "skipped_rejected"
          : "failed"
    entry.media_status =
      result.media_status === "uploaded"
        ? "uploaded"
        : result.media_status === "partial"
          ? "planned"
          : result.media_status === "failed"
            ? "failed"
            : "pending"
    entry.publication_status = result.publication_status
    entry.offer_status = result.offer_status
    entry.timestamp = result.timestamp
    entry.error = result.error
  }
  manifest.completed_at = ts
  saveManifest(MANIFEST_PATH, recomputeManifestSummary(manifest))

  const reportPath = resolve(
    REPO_ROOT,
    `scripts/fase5b-uat-import-report-${ts.replace(/[:.]/g, "").slice(0, 15)}.json`
  )
  writeFileSync(
    reportPath,
    JSON.stringify(
      {
        seller_id: FASE5B_SELECTIE_SELLER_ID,
        legacy_seller_id: FASE5B_LEGACY_SELLER_ID,
        migration: migrationResult,
        report,
      },
      null,
      2
    ),
    "utf8"
  )
  console.log(`\nManifest: ${MANIFEST_PATH}`)
  console.log(`Rapport: ${reportPath}`)
  console.log(
    "\nUAT-IMPORT VOLTOOID — ALLEEN TESTSELECTIE GEÏMPORTEERD — WACHT OP UAT"
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
