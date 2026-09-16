/**
 * Fase 5B import — read-only preflight + dry-run (no DB writes, no product import).
 *
 * Usage:
 *   pnpm --filter @europmade/backend exec jiti scripts/fase5b-dry-run.ts
 *   pnpm --filter @europmade/backend exec jiti scripts/fase5b-dry-run.ts --test-only
 */
import { readFileSync, writeFileSync } from "node:fs"
import { resolve } from "node:path"
import {
  FASE5B_DEFAULT_TEST_PRODUCTS,
  buildDbPreflightSnapshot,
  createHttpDbPreflightClient,
  createEmptyManifest,
  loadCategoryMappingFile,
  loadFase5bWorkbook,
  recomputeManifestSummary,
  runDryRun,
  runPreflight,
  saveManifest,
} from "../src/modules/product-cloud/fase5b-import"

const REPO_ROOT = resolve(__dirname, "../../..")
const DEFAULT_EXCEL = resolve(
  process.env.USERPROFILE || process.env.HOME || "",
  "Downloads/EuropMade_Fase5_Productselectie_4.xlsx"
)
const CATEGORY_MAP = resolve(REPO_ROOT, "scripts/fase5b-category-mapping.json")
const MANIFEST_PATH = resolve(REPO_ROOT, "scripts/fase5b-import-manifest.json")

const args = process.argv.slice(2)
const testOnly = args.includes("--test-only")
const excelPath = args.find((a) => !a.startsWith("--")) || DEFAULT_EXCEL

const BACKEND = process.env.MEDUSA_BACKEND_URL || "http://127.0.0.1:9000"
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin-e2e@example.com"
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "REDACTED_ADMIN_PASSWORD"

async function sampleUnreachableUrls(
  workbook: ReturnType<typeof loadFase5bWorkbook>,
  limit = 5
): Promise<string[]> {
  const urls: string[] = []
  for (const [, rows] of workbook.selectedImagesByEmId) {
    for (const row of rows) {
      const url = row.afbeelding_url.trim()
      if (!url.startsWith("https://")) continue
      urls.push(url)
      if (urls.length >= limit) break
    }
    if (urls.length >= limit) break
  }

  const bad: string[] = []
  for (const url of urls) {
    try {
      const ctrl = new AbortController()
      const timer = setTimeout(() => ctrl.abort(), 8000)
      const res = await fetch(url, {
        method: "HEAD",
        signal: ctrl.signal,
        redirect: "follow",
      })
      clearTimeout(timer)
      if (!res.ok) bad.push(url)
    } catch {
      bad.push(url)
    }
  }
  return bad
}

async function main() {
  console.log("=== Fase 5B Import — Preflight + Dry-run (READ ONLY) ===\n")
  console.log(`Excel: ${excelPath}`)
  console.log(`Category map: ${CATEGORY_MAP}`)
  console.log(`Target seller: sell_01M1BJCJ85X7E4B85XS08KB1G4\n`)

  const buf = readFileSync(excelPath)
  const workbook = loadFase5bWorkbook(buf)
  const categoryMapping = loadCategoryMappingFile(CATEGORY_MAP)

  let dbSnapshot = null
  try {
    const client = createHttpDbPreflightClient({
      backendUrl: BACKEND,
      adminEmail: ADMIN_EMAIL,
      adminPassword: ADMIN_PASSWORD,
    })
    dbSnapshot = await buildDbPreflightSnapshot(client, workbook)
    console.log("DB snapshot (read-only):")
    console.log(
      JSON.stringify(
        {
          selectie_seller_exists: dbSnapshot.selectie_seller_exists,
          legacy_seller_exists: dbSnapshot.legacy_seller_exists,
          legacy_product_count: dbSnapshot.legacy_product_count,
          categories_in_db: dbSnapshot.category_ids_present.length,
          gtin_conflicts: dbSnapshot.conflicting_gtins.length,
          import_ref_conflicts: dbSnapshot.conflicting_import_refs.length,
        },
        null,
        2
      )
    )
    console.log()
  } catch (err) {
    console.warn(
      "DB preflight overgeslagen (backend niet bereikbaar):",
      err instanceof Error ? err.message : err
    )
    console.log()
  }

  let unreachable: string[] = []
  try {
    unreachable = await sampleUnreachableUrls(workbook, 5)
  } catch {
    unreachable = []
  }

  const preflight = runPreflight({
    workbook,
    excelPath,
    categoryMapping,
    db: dbSnapshot,
    sampleUnreachableUrls: unreachable,
  })

  console.log("Preflight:")
  console.log(`  ok: ${preflight.ok}`)
  console.log(`  counts: ${JSON.stringify(preflight.counts)}`)
  for (const issue of preflight.issues) {
    console.log(`  [${issue.level}] ${issue.code}: ${issue.message}`)
  }
  console.log()

  const emFilter = testOnly ? [...FASE5B_DEFAULT_TEST_PRODUCTS] : undefined
  const dryRun = runDryRun({
    workbook,
    categoryMapping,
    emFilter,
  })

  console.log("Dry-run summary:")
  console.log(JSON.stringify(dryRun.summary, null, 2))
  console.log()

  for (const p of dryRun.products) {
    console.log(
      `${p.em_product_id} | ${p.action}${p.skip_reason ? ` (${p.skip_reason})` : ""} | ${p.identifier_type ?? "-"}=${p.identifier_value ?? "-"} | cat=${p.category_id || "-"} | media=${p.valid_media_count}/${p.selected_media_count} | ${p.verification_status}`
    )
  }

  const manifest = createEmptyManifest({
    import_batch: testOnly ? "fase5b-test-dry-run" : "fase5b-full-dry-run",
    source_file: excelPath.split(/[/\\]/).pop() || "EuropMade_Fase5_Productselectie_4.xlsx",
    em_ids: dryRun.products.map((p) => p.em_product_id),
  })

  const now = new Date().toISOString()
  for (const entry of manifest.products) {
    const plan = dryRun.products.find((p) => p.em_product_id === entry.em_product_id)
    if (!plan) continue
    entry.verification_status = plan.verification_status
    entry.identifier_type =
      (plan.identifier_type as typeof entry.identifier_type) ?? null
    entry.identifier_value = plan.identifier_value
    entry.category_id = plan.category_id || null
    entry.import_status =
      plan.action === "skip" ? "skipped_rejected" : "dry_run_ready"
    entry.media_status = plan.valid_media_count > 0 ? "planned" : "pending"
    entry.timestamp = now
    if (plan.skip_reason) entry.error = plan.skip_reason
  }

  saveManifest(MANIFEST_PATH, recomputeManifestSummary(manifest))
  console.log(`\nManifest bijgewerkt (dry-run metadata): ${MANIFEST_PATH}`)

  const reportPath = resolve(
    REPO_ROOT,
    `scripts/fase5b-dry-run-report-${testOnly ? "test" : "full"}-${now.replace(/[:.]/g, "").slice(0, 15)}.json`
  )
  writeFileSync(
    reportPath,
    JSON.stringify({ preflight, dryRun }, null, 2),
    "utf8"
  )
  console.log(`Rapport: ${reportPath}`)
  console.log(
    "\nIMPORTENGINE GEBOUWD EN DRY-RUN KLAAR — GEEN PRODUCTEN GEÏMPORTEERD"
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
