/**
 * Fase 5B UAT — publicatie + demo-offers voor bestaande producten (geen import).
 *
 * Usage:
 *   pnpm --filter @europmade/backend fase5b:uat-publish-offers
 *   pnpm --filter @europmade/backend fase5b:uat-publish-offers --preflight-only
 */
import { createRequire } from "node:module"
import { readFileSync, writeFileSync } from "node:fs"
import { resolve, join as pathJoin } from "node:path"
import express from "express"
import { loadEnv } from "@medusajs/framework/utils"
import { container } from "@medusajs/framework"
import medusaLoader from "@medusajs/medusa/loaders/index"
import {
  FASE5B_SELECTIE_SELLER_ID,
  FASE5B_LEGACY_SELLER_ID,
  FASE5B_UAT_DEMO_PRICE_EUR,
  FASE5B_UAT_DEMO_REGION,
  FASE5B_UAT_DEMO_STOCK,
  buildProductDescription,
  hasRichContent,
  loadFase5bWorkbook,
  loadManifest,
  recomputeManifestSummary,
  saveManifest,
} from "../src/modules/product-cloud/fase5b-import"
import { formatWorkflowError } from "../src/modules/product-cloud/fase5b-import/workflow-error"

const BACKEND_ROOT = resolve(__dirname, "..")
const REPO_ROOT = resolve(BACKEND_ROOT, "../..")
const DEFAULT_EXCEL = resolve(
  process.env.USERPROFILE || process.env.HOME || "",
  "Downloads/EuropMade_Fase5_Productselectie_4.xlsx"
)
const MANIFEST_PATH = resolve(REPO_ROOT, "scripts/fase5b-import-manifest.json")
const backendRequire = createRequire(pathJoin(BACKEND_ROOT, "package.json"))

const UAT_EM_IDS = [
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

const BACKEND_URL = process.env.MEDUSA_BACKEND_URL || "http://127.0.0.1:9000"
const STOREFRONT_URL = process.env.STOREFRONT_URL || "http://127.0.0.1:3000"

const args = process.argv.slice(2)
const preflightOnly = args.includes("--preflight-only")
const excelPath = args.find((a) => !a.startsWith("--")) || DEFAULT_EXCEL

type DbRow = {
  em_product_id: string
  product_id: string
  version_id: string
  seller_id: string
  identifier_id: string
  identifier_type: string
  identifier_value: string
  publication_status: string
  title: string
  description: string
  media_total: number
  media_hoofd: number
  verification_status: string
}

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

function countProducts(sellerId: string): number {
  return Number(
    psql(
      `SELECT COUNT(*) FROM pc_product WHERE deleted_at IS NULL AND current_owner_seller_id = '${sellerId}';`
    )
  )
}

function countOffers(sellerId: string): number {
  return Number(
    psql(
      `SELECT COUNT(*) FROM offer WHERE deleted_at IS NULL AND seller_id = '${sellerId}';`
    )
  )
}

function loadDbRows(): DbRow[] {
  const sql = `SELECT COALESCE(json_agg(row_to_json(q)), '[]'::json) FROM (SELECT CASE WHEN i.identifier_type = 'IMPORT_REF' THEN i.identifier_value WHEN i.identifier_type = 'GTIN' AND i.identifier_value = '4010118001550' THEN 'EM-0002' WHEN i.identifier_type = 'GTIN' AND i.identifier_value = '4010118474743' THEN 'EM-0003' WHEN i.identifier_type = 'GTIN' AND i.identifier_value = '4010118718175' THEN 'EM-0004' ELSE i.identifier_value END AS em_product_id, p.id AS product_id, pv.id AS version_id, p.current_owner_seller_id AS seller_id, i.id AS identifier_id, i.identifier_type, i.identifier_value, pv.publication_status, pv.title, pv.description, (SELECT COUNT(*)::int FROM pc_media pm WHERE pm.product_version_id = pv.id AND pm.deleted_at IS NULL) AS media_total, (SELECT COUNT(*)::int FROM pc_media pm WHERE pm.product_version_id = pv.id AND pm.deleted_at IS NULL AND pm.media_type = 'Hoofdafbeelding') AS media_hoofd FROM pc_product p JOIN pc_product_variant v ON v.product_id = p.id AND v.deleted_at IS NULL JOIN identifier i ON i.product_variant_id = v.id AND i.deleted_at IS NULL JOIN product_version pv ON pv.product_id = p.id AND pv.deleted_at IS NULL WHERE p.deleted_at IS NULL AND p.current_owner_seller_id = '${FASE5B_SELECTIE_SELLER_ID}' ORDER BY p.created_at) q;`
  const raw = psql(sql)
  const parsed = JSON.parse(raw || "[]") as Array<Omit<DbRow, "verification_status">>
  return parsed.map((row) => ({ ...row, verification_status: "" }))
}

function normalizeText(value: string): string {
  return value.replace(/\s+/g, " ").trim()
}

async function fetchJson(url: string): Promise<{ ok: boolean; status: number; body: unknown }> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15_000) })
    const text = await res.text()
    let body: unknown = text
    try {
      body = JSON.parse(text)
    } catch {
      /* html */
    }
    return { ok: res.ok, status: res.status, body }
  } catch (err) {
    return {
      ok: false,
      status: 0,
      body: err instanceof Error ? err.message : String(err),
    }
  }
}

async function main() {
  loadEnv(process.env.NODE_ENV || "development", BACKEND_ROOT)

  console.log("=== Fase 5B UAT publicatie + demo-offers ===\n")

  const legacyBefore = countProducts(FASE5B_LEGACY_SELLER_ID)
  const selectieBefore = countProducts(FASE5B_SELECTIE_SELLER_ID)
  const offersBefore = countOffers(FASE5B_SELECTIE_SELLER_ID)
  const legacyOffersBefore = countOffers(FASE5B_LEGACY_SELLER_ID)

  const buf = readFileSync(excelPath)
  const workbook = loadFase5bWorkbook(buf)
  const dbRows = loadDbRows()
  const dbByEm = new Map(dbRows.map((r) => [r.em_product_id, r]))

  const contentIssues: string[] = []
  for (const emId of UAT_EM_IDS) {
    const row = workbook.products.find((p) => p.em_product_id === emId)
    const content = workbook.contentByEmId.get(emId)
    const db = dbByEm.get(emId)
    if (!row || !db) continue

    if (row.verification_status.trim().toUpperCase() === "REJECTED") {
      contentIssues.push(`${emId}: REJECTED in bron`)
    }
    if (!content || !hasRichContent(content)) {
      contentIssues.push(`${emId}: geen 06_Content`)
      continue
    }
    const expectedDesc = buildProductDescription(content, row.productnaam)
    const dbTitle = normalizeText(db.title)
    const expectedTitle = normalizeText(row.productnaam)
    if (dbTitle !== expectedTitle) {
      contentIssues.push(`${emId}: titel mismatch (db="${dbTitle}" excel="${expectedTitle}")`)
    }
    const dbDesc = normalizeText(db.description)
    const expDesc = normalizeText(expectedDesc)
    if (!dbDesc.includes(normalizeText(content.usps.split("\n")[0] || "")) && content.usps.trim()) {
      contentIssues.push(`${emId}: USP's niet in beschrijving`)
    }
    if (!dbDesc.includes(normalizeText(content.specificaties.split("\n")[0] || "")) && content.specificaties.trim()) {
      contentIssues.push(`${emId}: specificaties niet in beschrijving`)
    }
    if (dbDesc.length < 20) {
      contentIssues.push(`${emId}: beschrijving te kort`)
    }
    if (expDesc && dbDesc !== expDesc && !dbDesc.includes(expDesc.slice(0, 40))) {
      contentIssues.push(`${emId}: beschrijving wijkt af van 06_Content-build`)
    }
  }

  const missing = UAT_EM_IDS.filter((id) => !dbByEm.has(id))
  const wrongSeller = dbRows.filter((r) => r.seller_id !== FASE5B_SELECTIE_SELLER_ID)
  const rejected = UAT_EM_IDS.filter((emId) => {
    const row = workbook.products.find((p) => p.em_product_id === emId)
    return row?.verification_status.trim().toUpperCase() === "REJECTED"
  })
  const mediaIssues = UAT_EM_IDS.filter((emId) => {
    const db = dbByEm.get(emId)
    if (!db) return true
    if (emId === "EM-0016") return false
    return db.media_total < 1
  })

  const preflight = {
    selectie_product_count: selectieBefore,
    legacy_product_count: legacyBefore,
    db_rows: dbRows.length,
    expected_em_ids: UAT_EM_IDS.length,
    missing_em_ids: missing,
    wrong_seller_rows: wrongSeller.length,
    rejected_em_ids: rejected,
    media_issues: mediaIssues,
    content_issues: contentIssues,
    offers_before: offersBefore,
  }

  console.log("Read-only preflight:")
  console.log(JSON.stringify(preflight, null, 2))

  const preflightOk =
    selectieBefore === 10 &&
    legacyBefore === 232 &&
    missing.length === 0 &&
    wrongSeller.length === 0 &&
    rejected.length === 0 &&
    mediaIssues.length === 0 &&
    dbRows.length === 10 &&
    dbRows.every((r) => r.version_id && r.identifier_id)

  if (!preflightOk) {
    console.error("\nPreflight mislukt — gestopt.")
    process.exit(1)
  }

  if (contentIssues.length > 0) {
    console.warn("\nContent-waarschuwingen (bron niet gewijzigd):")
    for (const issue of contentIssues) console.warn(`  - ${issue}`)
  }

  if (preflightOnly) {
    console.log("\nPreflight-only afgerond.")
    process.exit(0)
  }

  await bootstrapMedusa()

  const { publishVersionWorkflow } = backendRequire(
    "./src/workflows/product-cloud/versions"
  ) as {
    publishVersionWorkflow: (container: unknown) => {
      run: (input: { input: unknown }) => Promise<{ errors?: unknown[] }>
    }
  }
  const { upsertOfferWorkflow } = backendRequire(
    "./src/workflows/commerce-cloud/upsert-offer"
  ) as {
    upsertOfferWorkflow: (container: unknown) => {
      run: (input: { input: unknown }) => Promise<{ errors?: unknown[]; result?: unknown }>
    }
  }

  const results: Array<{
    em_product_id: string
    product_cloud_id: string
    version_id: string
    publication_status: string
    offer_status: string
    offer_id?: string
    media_total: number
    error?: string
  }> = []

  for (const emId of UAT_EM_IDS) {
    const db = dbByEm.get(emId)!
    let publicationStatus = db.publication_status
    let offerStatus = "none"
    let offerId: string | undefined
    let error: string | undefined

    console.log(`\n${emId} → ${db.product_id} (pub=${publicationStatus}, media=${db.media_total})...`)

    try {
      if (publicationStatus !== "Gepubliceerd") {
        if (db.media_hoofd < 1) {
          throw new Error(
            "Geen Hoofdafbeelding — publicatie vereist minimaal één Hoofdafbeelding"
          )
        }
        const pubOutcome = await publishVersionWorkflow(container).run({
          input: {
            product_id: db.product_id,
            version_id: db.version_id,
            seller_id: FASE5B_SELECTIE_SELLER_ID,
          },
        })
        if (pubOutcome.errors?.length) {
          throw pubOutcome.errors[0]
        }
        publicationStatus = "Gepubliceerd"
      }

      const offerOutcome = await upsertOfferWorkflow(container).run({
        input: {
          seller_id: FASE5B_SELECTIE_SELLER_ID,
          identifier_id: db.identifier_id,
          region_code: FASE5B_UAT_DEMO_REGION,
          quantity_available: FASE5B_UAT_DEMO_STOCK,
          base_price: FASE5B_UAT_DEMO_PRICE_EUR,
          shipping_cost: 5.95,
          vat_rate: 0.21,
          seller_sku: emId,
          sales_status: "active",
          delivery_days_max: 3,
        },
      })
      if (offerOutcome.errors?.length) {
        throw offerOutcome.errors[0]
      }
      const offerResult = offerOutcome.result as { offer_id?: string } | undefined
      offerId = offerResult?.offer_id
      offerStatus = "active_uat_demo"

      console.log(`  → gepubliceerd, offer=${offerId ?? "ok"}`)
    } catch (err) {
      error = formatWorkflowError(err)
      console.error(`  → FOUT: ${error}`)
    }

    results.push({
      em_product_id: emId,
      product_cloud_id: db.product_id,
      version_id: db.version_id,
      publication_status: publicationStatus,
      offer_status: offerStatus,
      offer_id: offerId,
      media_total: db.media_total,
      error,
    })
  }

  const manifest = loadManifest(MANIFEST_PATH)
  for (const r of results) {
    const entry = manifest.products.find((p) => p.em_product_id === r.em_product_id)
    if (!entry) continue
    entry.product_cloud_id = r.product_cloud_id
    entry.publication_status = r.publication_status
    entry.offer_status = r.offer_status
    entry.timestamp = new Date().toISOString()
    if (r.error) {
      entry.error = r.error
    } else {
      entry.error = null
      entry.import_status = "validated"
    }
  }
  manifest.completed_at = new Date().toISOString()
  saveManifest(MANIFEST_PATH, recomputeManifestSummary(manifest))

  const legacyAfter = countProducts(FASE5B_LEGACY_SELLER_ID)
  const selectieAfter = countProducts(FASE5B_SELECTIE_SELLER_ID)
  const offersAfter = countOffers(FASE5B_SELECTIE_SELLER_ID)
  const legacyOffersAfter = countOffers(FASE5B_LEGACY_SELLER_ID)

  const publishedCount = results.filter(
    (r) => r.publication_status === "Gepubliceerd"
  ).length
  const offerCount = results.filter((r) => r.offer_status === "active_uat_demo").length

  const catalogRes = await fetchJson(
    `${BACKEND_URL}/store/catalog/products?limit=100&region_code=NL`
  )
  const catalogBody = catalogRes.body as {
    products?: Array<{ id: string; title?: string }>
    count?: number
  }
  const catalogIds = new Set(
    (catalogBody.products || []).map((p) => p.id)
  )
  const uatInCatalog = UAT_EM_IDS.filter((emId) => {
    const db = dbByEm.get(emId)!
    return catalogIds.has(db.product_id)
  })

  const sampleEm = UAT_EM_IDS.find((emId) => {
    const db = dbByEm.get(emId)!
    return catalogIds.has(db.product_id)
  })
  let pdpCheck: Record<string, unknown> = { skipped: true }
  if (sampleEm) {
    const sampleId = dbByEm.get(sampleEm)!.product_id
    const pdpRes = await fetchJson(
      `${BACKEND_URL}/store/catalog/products/${sampleId}?region_code=NL`
    )
    const pdp = pdpRes.body as {
      product?: { title?: string; description?: string; categories?: string[] }
      media?: Array<{ url?: string }>
      buy_box_offer?: { base_price?: number; seller_sku?: string }
    }
    pdpCheck = {
      em_product_id: sampleEm,
      product_id: sampleId,
      http_ok: pdpRes.ok,
      has_title: Boolean(pdp?.product?.title),
      has_description: Boolean(pdp?.product?.description?.length),
      has_image: (pdp?.media?.length ?? 0) > 0,
      has_category: (pdp?.product?.categories?.length ?? 0) > 0,
      has_price: typeof pdp?.buy_box_offer?.base_price === "number",
      price: pdp?.buy_box_offer?.base_price,
      seller_sku: pdp?.buy_box_offer?.seller_sku,
    }
  }

  const homeRes = await fetchJson(STOREFRONT_URL)
  const homeHtml = typeof homeRes.body === "string" ? homeRes.body : ""
  const storefrontSampleTitle =
    sampleEm && dbByEm.get(sampleEm)
      ? workbook.products.find((p) => p.em_product_id === sampleEm)?.productnaam
      : undefined
  const homeHasProduct =
    Boolean(storefrontSampleTitle) &&
    homeHtml.includes(storefrontSampleTitle!.slice(0, 20))

  const ts = new Date().toISOString().replace(/[:.]/g, "").slice(0, 15)
  const reportPath = resolve(
    REPO_ROOT,
    `scripts/fase5b-uat-publish-offers-report-${ts}.json`
  )
  const report = {
    published_count: publishedCount,
    offer_count: offerCount,
    planned: UAT_EM_IDS.length,
    products: results,
    media_summary: {
      total_uploaded_previously: 25,
      em_0016_media: dbByEm.get("EM-0016")?.media_total ?? 0,
    },
    catalog: {
      http_ok: catalogRes.ok,
      total_in_catalog: catalogBody.count ?? 0,
      uat_in_catalog: uatInCatalog.length,
      uat_em_ids_in_catalog: uatInCatalog,
      missing_from_catalog: UAT_EM_IDS.filter(
        (emId) => !uatInCatalog.includes(emId)
      ),
    },
    pdp_check: pdpCheck,
    storefront: {
      home_http_ok: homeRes.ok,
      home_shows_sample_product: homeHasProduct,
      storefront_url: STOREFRONT_URL,
    },
    counts: {
      selectie_before: selectieBefore,
      selectie_after: selectieAfter,
      legacy_before: legacyBefore,
      legacy_after: legacyAfter,
      offers_before: offersBefore,
      offers_after: offersAfter,
      legacy_offers_before: legacyOffersBefore,
      legacy_offers_after: legacyOffersAfter,
    },
    content_issues: contentIssues,
  }
  writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8")

  console.log("\n=== Samenvatting ===")
  console.log(`Publicatie: ${publishedCount}/${UAT_EM_IDS.length}`)
  console.log(`Offers: ${offerCount}/${UAT_EM_IDS.length}`)
  console.log(`Catalogus (UAT in lijst): ${uatInCatalog.length}/${UAT_EM_IDS.length}`)
  console.log(`Selectie: ${selectieBefore} → ${selectieAfter}`)
  console.log(`Legacy: ${legacyBefore} → ${legacyAfter}`)
  console.log(`Offers selectie: ${offersBefore} → ${offersAfter}`)
  console.log(`Rapport: ${reportPath}`)

  if (selectieAfter !== selectieBefore || legacyAfter !== legacyBefore) {
    console.error("\nWAARSCHUWING: product-count gewijzigd!")
    process.exit(1)
  }
  if (legacyOffersAfter !== legacyOffersBefore) {
    console.error("\nWAARSCHUWING: legacy offers gewijzigd!")
    process.exit(1)
  }

  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
