/**
 * Fase 5B UAT — media-nabewerking voor bestaande producten (geen nieuwe producten).
 *
 * Usage:
 *   pnpm --filter @europmade/backend fase5b:uat-media-backfill
 *   pnpm --filter @europmade/backend fase5b:uat-media-backfill --preflight-only
 */
import { readFileSync, writeFileSync } from "node:fs"
import { resolve, join as pathJoin } from "node:path"
import express from "express"
import { loadEnv } from "@medusajs/framework/utils"
import { container } from "@medusajs/framework"
import medusaLoader from "@medusajs/medusa/loaders/index"
import {
  FASE5B_SELECTIE_SELLER_ID,
  FASE5B_LEGACY_SELLER_ID,
  buildMediaPlan,
  executeMediaUploadPlan,
  loadFase5bWorkbook,
  loadManifest,
  recomputeManifestSummary,
  saveManifest,
} from "../src/modules/product-cloud/fase5b-import"

const BACKEND_ROOT = resolve(__dirname, "..")
const REPO_ROOT = resolve(BACKEND_ROOT, "../..")
const DEFAULT_EXCEL = resolve(
  process.env.USERPROFILE || process.env.HOME || "",
  "Downloads/EuropMade_Fase5_Productselectie_4.xlsx"
)
const MANIFEST_PATH = resolve(REPO_ROOT, "scripts/fase5b-import-manifest.json")

const MEDIA_EM_IDS = [
  "EM-0001",
  "EM-0002",
  "EM-0003",
  "EM-0004",
  "EM-0005",
  "EM-0015",
  "EM-0016",
  "EM-0030",
  "EM-0095",
  "EM-0258",
] as const

const args = process.argv.slice(2)
const preflightOnly = args.includes("--preflight-only")
const excelPath = args.find((a) => !a.startsWith("--")) || DEFAULT_EXCEL

function registerMedusaTypeScriptSupport(): void {
  try {
    require("ts-node").register({ transpileOnly: true })
    require("tsconfig-paths").register({})
  } catch {
    /* optional */
  }
}

async function bootstrapMedusa(): Promise<void> {
  process.chdir(BACKEND_ROOT)
  registerMedusaTypeScriptSupport()
  await medusaLoader({
    directory: BACKEND_ROOT,
    expressApp: express(),
    skipLoadingEntryPoints: true,
  })
}

function psql(sql: string): string {
  const { execSync } = require("node:child_process") as typeof import("node:child_process")
  return execSync(
    `docker exec europmade-postgres psql -U europmade -d europmade -t -A -c ${JSON.stringify(sql)}`,
    { encoding: "utf8" }
  ).trim()
}

type DbProductRow = {
  em_product_id: string
  product_id: string
  version_id: string
  seller_id: string
  identifier_type: string
  identifier_value: string
}

function loadDbProducts(): DbProductRow[] {
  const sql = `SELECT CASE WHEN i.identifier_type = 'IMPORT_REF' THEN i.identifier_value WHEN i.identifier_type = 'GTIN' AND i.identifier_value = '4010118001550' THEN 'EM-0002' WHEN i.identifier_type = 'GTIN' AND i.identifier_value = '4010118474743' THEN 'EM-0003' WHEN i.identifier_type = 'GTIN' AND i.identifier_value = '4010118718175' THEN 'EM-0004' ELSE i.identifier_value END AS em_product_id, p.id AS product_id, pv.id AS version_id, p.current_owner_seller_id AS seller_id, i.identifier_type, i.identifier_value FROM pc_product p JOIN pc_product_variant v ON v.product_id = p.id AND v.deleted_at IS NULL JOIN identifier i ON i.product_variant_id = v.id AND i.deleted_at IS NULL JOIN product_version pv ON pv.product_id = p.id AND pv.deleted_at IS NULL WHERE p.deleted_at IS NULL AND p.current_owner_seller_id = '${FASE5B_SELECTIE_SELLER_ID}' ORDER BY p.created_at;`
  const raw = psql(sql)
  return raw
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const [
        em_product_id,
        product_id,
        version_id,
        seller_id,
        identifier_type,
        identifier_value,
      ] = line.split("|")
      return {
        em_product_id,
        product_id,
        version_id,
        seller_id,
        identifier_type,
        identifier_value,
      }
    })
}

function countProducts(sellerId: string): number {
  return Number(
    psql(
      `SELECT COUNT(*) FROM pc_product WHERE deleted_at IS NULL AND current_owner_seller_id = '${sellerId}';`
    )
  )
}

async function main() {
  loadEnv(process.env.NODE_ENV || "development", BACKEND_ROOT)

  const legacyBefore = countProducts(FASE5B_LEGACY_SELLER_ID)
  const selectieBefore = countProducts(FASE5B_SELECTIE_SELLER_ID)

  console.log("=== Fase 5B UAT media-nabewerking ===\n")

  const buf = readFileSync(excelPath)
  const workbook = loadFase5bWorkbook(buf)
  const dbProducts = loadDbProducts()

  const expectedImages: Record<string, number> = {}
  let plannedTotal = 0
  for (const emId of MEDIA_EM_IDS) {
    const images = workbook.selectedImagesByEmId.get(emId) || []
    const plan = buildMediaPlan(emId, images)
    const uploadable = plan.items.filter((i) => i.status === "would_upload").length
    expectedImages[emId] = uploadable
    plannedTotal += uploadable
  }

  console.log("Geplande afbeeldingen per EM-ID:")
  for (const emId of MEDIA_EM_IDS) {
    console.log(`  ${emId}: ${expectedImages[emId]}`)
  }
  console.log(`  Totaal gepland (would_upload): ${plannedTotal}\n`)

  const dbByEm = new Map(dbProducts.map((r) => [r.em_product_id, r]))
  const missing = MEDIA_EM_IDS.filter((id) => !dbByEm.has(id))
  const wrongSeller = dbProducts.filter(
    (r) => r.seller_id !== FASE5B_SELECTIE_SELLER_ID
  )

  console.log("Read-only preflight:")
  console.log(
    JSON.stringify(
      {
        selectie_product_count: selectieBefore,
        legacy_product_count: legacyBefore,
        db_rows: dbProducts.length,
        expected_em_ids: MEDIA_EM_IDS.length,
        missing_em_ids: missing,
        wrong_seller_rows: wrongSeller.length,
        all_on_selectie_seller:
          dbProducts.length === 10 &&
          missing.length === 0 &&
          wrongSeller.length === 0,
      },
      null,
      2
    )
  )

  if (
    selectieBefore !== 10 ||
    legacyBefore !== 232 ||
    missing.length > 0 ||
    wrongSeller.length > 0 ||
    dbProducts.length !== 10
  ) {
    console.error("\nPreflight mislukt — media-upload gestopt.")
    process.exit(1)
  }

  if (preflightOnly) {
    console.log("\nPreflight-only afgerond.")
    process.exit(0)
  }

  await bootstrapMedusa()

  const manifest = loadManifest(MANIFEST_PATH)
  const reportProducts: Array<{
    em_product_id: string
    product_cloud_id: string
    version_id: string
    planned: number
    uploaded: number
    failed: number
    media: Array<{
      source_url: string
      status: string
      media_id?: string
      error?: string
    }>
  }> = []

  let uploadedTotal = 0
  let failedTotal = 0

  for (const emId of MEDIA_EM_IDS) {
    const row = dbByEm.get(emId)!
    const images = workbook.selectedImagesByEmId.get(emId) || []
    const plan = buildMediaPlan(emId, images)
    const planned = plan.items.filter((i) => i.status === "would_upload").length

    console.log(`\nUpload ${emId} → ${row.product_id} (${planned} afbeeldingen)...`)

    const results = await executeMediaUploadPlan({
      product_id: row.product_id,
      version_id: row.version_id,
      seller_id: FASE5B_SELECTIE_SELLER_ID,
      items: plan.items,
      container,
    })

    const uploaded = results.filter((r) => r.status === "uploaded").length
    const failed = results.filter((r) => r.status === "failed").length
    uploadedTotal += uploaded
    failedTotal += failed

    reportProducts.push({
      em_product_id: emId,
      product_cloud_id: row.product_id,
      version_id: row.version_id,
      planned,
      uploaded,
      failed,
      media: results.map((r) => ({
        source_url: r.source_url,
        status: r.status,
        media_id: r.media_id,
        error: r.error,
      })),
    })

    const entry = manifest.products.find((p) => p.em_product_id === emId)
    if (entry) {
      entry.product_cloud_id = row.product_id
      entry.media_status =
        uploaded > 0
          ? "uploaded"
          : "failed"
      entry.import_status =
        uploaded > 0 ? "media_done" : entry.import_status
      entry.timestamp = new Date().toISOString()
      entry.error =
        failed > 0
          ? results
              .filter((r) => r.status === "failed")
              .map((r) => `${r.source_url}: ${r.error}`)
              .join("; ")
          : null
    }

    console.log(`  → ${uploaded}/${planned} geüpload, ${failed} mislukt`)
  }

  manifest.completed_at = new Date().toISOString()
  saveManifest(MANIFEST_PATH, recomputeManifestSummary(manifest))

  const legacyAfter = countProducts(FASE5B_LEGACY_SELLER_ID)
  const selectieAfter = countProducts(FASE5B_SELECTIE_SELLER_ID)

  const ts = new Date().toISOString().replace(/[:.]/g, "").slice(0, 15)
  const reportPath = resolve(
    REPO_ROOT,
    `scripts/fase5b-uat-media-backfill-report-${ts}.json`
  )
  writeFileSync(
    reportPath,
    JSON.stringify(
      {
        planned_total: plannedTotal,
        uploaded_total: uploadedTotal,
        failed_total: failedTotal,
        products: reportProducts,
        counts: {
          selectie_before: selectieBefore,
          selectie_after: selectieAfter,
          legacy_before: legacyBefore,
          legacy_after: legacyAfter,
        },
      },
      null,
      2
    ),
    "utf8"
  )

  console.log("\n=== Samenvatting ===")
  console.log(`Gecontroleerde producten: ${MEDIA_EM_IDS.length}`)
  console.log(`Geüpload: ${uploadedTotal}/${plannedTotal}`)
  console.log(`Mislukt: ${failedTotal}`)
  console.log(`Selectie: ${selectieBefore} → ${selectieAfter}`)
  console.log(`Legacy: ${legacyBefore} → ${legacyAfter}`)
  console.log(`Manifest: ${MANIFEST_PATH}`)
  console.log(`Rapport: ${reportPath}`)

  if (selectieAfter !== selectieBefore || legacyAfter !== legacyBefore) {
    console.error("\nWAARSCHUWING: product-count gewijzigd!")
    process.exit(1)
  }

  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
