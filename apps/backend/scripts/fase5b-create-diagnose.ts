/**
 * Fase 5B — read-only create-workflow diagnose (geen import, geen writes).
 *
 * Usage:
 *   pnpm --filter @europmade/backend fase5b:uat-create-diagnose
 *   pnpm --filter @europmade/backend fase5b:uat-create-diagnose --probe-workflow-error
 */
import { readFileSync } from "node:fs"
import { createRequire } from "node:module"
import { resolve, join as pathJoin } from "node:path"
import express from "express"
import { loadEnv } from "@medusajs/framework/utils"
import { container } from "@medusajs/framework"
import medusaLoader from "@medusajs/medusa/loaders/index"
import {
  FASE5B_SELECTIE_SELLER_ID,
  FASE5B_LEGACY_SELLER_ID,
  loadCategoryMappingFile,
  loadFase5bWorkbook,
  resolveFase5bIdentifier,
  buildProductDescription,
  resolveCategoryMapping,
} from "../src/modules/product-cloud/fase5b-import"
import { FASE5B_IMPORT_REF_COUNTRY_SCOPE } from "../src/modules/product-cloud/identifier-types"
import { formatWorkflowError } from "../src/modules/product-cloud/fase5b-import/workflow-error"
import type { CreateProductCloudInput } from "../src/workflows/product-cloud/create-product"

const BACKEND_ROOT = resolve(__dirname, "..")
const REPO_ROOT = resolve(BACKEND_ROOT, "../..")
const DEFAULT_EXCEL = resolve(
  process.env.USERPROFILE || process.env.HOME || "",
  "Downloads/EuropMade_Fase5_Productselectie_4.xlsx"
)
const CATEGORY_MAP = resolve(REPO_ROOT, "scripts/fase5b-category-mapping.json")
const CREATE_PRODUCT_SOURCE = resolve(
  BACKEND_ROOT,
  "src/workflows/product-cloud/create-product.ts"
)
const DIAGNOSE_EM_ID = "EM-0001"
const backendRequire = createRequire(pathJoin(BACKEND_ROOT, "package.json"))

const args = process.argv.slice(2)
const probeWorkflowError = args.includes("--probe-workflow-error")
const excelPath = args.find((a) => !a.startsWith("--")) || DEFAULT_EXCEL

function registerMedusaTypeScriptSupport(): void {
  try {
    require("ts-node").register({ transpileOnly: true })
    require("tsconfig-paths").register({})
  } catch (e) {
    console.warn("ts-node/tsconfig-paths registratie mislukt:", e)
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

function inspectCreateProductSource(): {
  imports_match_by_ean: boolean
  uses_match_by_ean: boolean
  finding: string | null
} {
  const source = readFileSync(CREATE_PRODUCT_SOURCE, "utf8")
  const uses = source.includes("matchByEanWorkflow")
  const imports =
    /import\s*\{[^}]*matchByEanWorkflow[^}]*\}/.test(source) ||
    /import\s+matchByEanWorkflow/.test(source)
  return {
    imports_match_by_ean: imports,
    uses_match_by_ean: uses,
    finding:
      uses && !imports
        ? "create-product.ts roept matchByEanWorkflow aan zonder import"
        : null,
  }
}

type DiagnosePayload = {
  row: ReturnType<typeof loadFase5bWorkbook>["products"][number]
  input: CreateProductCloudInput
  category_id: string
  lifecycle_preview: string
  audit: {
    identifier_conflicts: number
    brand_found: boolean
    manufacturer_found: boolean
  }
}

async function buildWorkflowInput(emId: string): Promise<DiagnosePayload> {
  const buf = readFileSync(excelPath)
  const workbook = loadFase5bWorkbook(buf)
  const categoryMapping = loadCategoryMappingFile(CATEGORY_MAP)
  const row = workbook.products.find((p) => p.em_product_id === emId)
  if (!row) {
    throw new Error(`Rij niet gevonden voor ${emId}`)
  }

  const partner = container.resolve("partner") as {
    retrieveSeller: (
      id: string,
      opts?: { relations?: string[] }
    ) => Promise<{
      id: string
      is_retailer: boolean
      is_producer_or_brand_owner: boolean
      company_id?: string | null
    }>
    listBrands: (
      filters: Record<string, unknown>,
      opts?: { take?: number }
    ) => Promise<Array<{ id: string; name?: string | null }>>
    listManufacturers: (
      filters: Record<string, unknown>,
      opts?: { take?: number }
    ) => Promise<Array<{ id: string; name?: string | null }>>
  }

  const productCloud = container.resolve("productCloud") as {
    listIdentifiers: (filters: Record<string, unknown>) => Promise<unknown[]>
  }

  const seller = await partner.retrieveSeller(FASE5B_SELECTIE_SELLER_ID, {
    relations: ["company"],
  })

  const identifier = resolveFase5bIdentifier({
    em_product_id: row.em_product_id,
    ean_gtin: row.ean_gtin,
    mpn: row.mpn,
  })

  const conflicts = await productCloud.listIdentifiers({
    identifier_type: identifier.identifier_type,
    identifier_value: identifier.identifier_value,
  })

  const brands = await partner.listBrands({}, { take: 500 })
  const brand =
    brands.find(
      (b) =>
        (b.name || "").trim().toLowerCase() === row.merk.trim().toLowerCase()
    ) ?? null

  const manufacturerName = (row.fabrikant || row.merk).trim()
  const manufacturers = await partner.listManufacturers({}, { take: 500 })
  const manufacturer =
    manufacturers.find(
      (m) =>
        (m.name || "").trim().toLowerCase() ===
        manufacturerName.toLowerCase()
    ) ?? null

  const category = resolveCategoryMapping(
    categoryMapping,
    row.claude_hoofdcategorie,
    row.subcategorie
  )

  const content = workbook.contentByEmId.get(emId)
  const description = buildProductDescription(content, row.productnaam)

  const lifecycle_preview =
    seller.is_retailer && seller.is_producer_or_brand_owner
      ? "Concept gecontroleerd (dual-role, create_as_retailer niet gezet)"
      : seller.is_retailer
        ? "Retailer Created"
        : "Concept gecontroleerd"

  const input: CreateProductCloudInput = {
    seller_id: seller.id,
    is_retailer: seller.is_retailer,
    is_producer_or_brand_owner: seller.is_producer_or_brand_owner,
    brand_id: brand?.id ?? "[would-resolve-or-create]",
    manufacturer_id: manufacturer?.id ?? "[would-resolve-or-create]",
    title: row.productnaam,
    description,
    category_name: category.category_name,
    identifier_type: identifier.identifier_type,
    identifier_value: identifier.identifier_value,
    country_scope: identifier.country_scope,
  }

  return {
    row,
    input,
    category_id: category.category_id,
    lifecycle_preview,
    audit: {
      identifier_conflicts: conflicts.length,
      brand_found: Boolean(brand),
      manufacturer_found: Boolean(manufacturer),
    },
  }
}

async function runWorkflowErrorProbe(input: CreateProductCloudInput): Promise<{
  thrown: boolean
  serialized_error: string | null
}> {
  const { createProductCloudWorkflow } = backendRequire(
    "./src/workflows/product-cloud/create-product"
  ) as typeof import("../src/workflows/product-cloud/create-product")

  try {
    const outcome = await createProductCloudWorkflow(container).run({ input })
    if (outcome.errors?.length) {
      return {
        thrown: true,
        serialized_error: formatWorkflowError(
          outcome.errors.length === 1 ? outcome.errors[0] : outcome.errors
        ),
      }
    }
    return { thrown: false, serialized_error: null }
  } catch (err) {
    return { thrown: true, serialized_error: formatWorkflowError(err) }
  }
}

async function main() {
  loadEnv(process.env.NODE_ENV || "development", BACKEND_ROOT)

  const legacyBefore = countProducts(FASE5B_LEGACY_SELLER_ID)
  const selectieBefore = countProducts(FASE5B_SELECTIE_SELLER_ID)

  console.log("=== Fase 5B create-workflow diagnose (read-only) ===\n")
  console.log(`EM-ID: ${DIAGNOSE_EM_ID}`)
  console.log(`Legacy vóór: ${legacyBefore}`)
  console.log(`Selectie vóór: ${selectieBefore}\n`)

  const sourceCheck = inspectCreateProductSource()
  console.log("Static source check (create-product.ts):")
  console.log(JSON.stringify(sourceCheck, null, 2))
  console.log()

  await bootstrapMedusa()

  const built = await buildWorkflowInput(DIAGNOSE_EM_ID)

  console.log("Payload checklist:")
  console.log(
    JSON.stringify(
      {
        em_product_id: DIAGNOSE_EM_ID,
        identifier_type: built.input.identifier_type,
        identifier_value: built.input.identifier_value,
        country_scope: built.input.country_scope,
        expected_import_ref_scope: FASE5B_IMPORT_REF_COUNTRY_SCOPE,
        category_id: built.category_id,
        category_name: built.input.category_name,
        brand_id: built.input.brand_id,
        manufacturer_id: built.input.manufacturer_id,
        seller_id: built.input.seller_id,
        is_retailer: built.input.is_retailer,
        is_producer_or_brand_owner: built.input.is_producer_or_brand_owner,
        create_as_retailer: built.input.create_as_retailer ?? null,
        lifecycle_preview: built.lifecycle_preview,
        title_present: Boolean(built.input.title?.trim()),
        description_present: Boolean(built.input.description?.trim()),
        identifier_conflicts: built.audit.identifier_conflicts,
        brand_found_in_db: built.audit.brand_found,
        manufacturer_found_in_db: built.audit.manufacturer_found,
        workflow_input: built.input,
      },
      null,
      2
    )
  )
  console.log()

  if (probeWorkflowError) {
    console.log(
      "Probe: workflow.run() voor exacte fout (controleert DB-counts na afloop)...\n"
    )
    const probeResult = await runWorkflowErrorProbe(built.input)
    console.log("Probe resultaat:")
    console.log(JSON.stringify(probeResult, null, 2))
    console.log()
  } else {
    console.log(
      "Geen workflow-probe uitgevoerd (read-only). Gebruik --probe-workflow-error voor exacte runtime-fout.\n"
    )
  }

  const legacyAfter = countProducts(FASE5B_LEGACY_SELLER_ID)
  const selectieAfter = countProducts(FASE5B_SELECTIE_SELLER_ID)

  console.log("DB na diagnose:")
  console.log(
    JSON.stringify(
      {
        legacy_before: legacyBefore,
        legacy_after: legacyAfter,
        selectie_before: selectieBefore,
        selectie_after: selectieAfter,
        legacy_unchanged: legacyBefore === legacyAfter && legacyAfter === 232,
        selectie_unchanged: selectieBefore === selectieAfter,
        products_created: selectieAfter - selectieBefore,
      },
      null,
      2
    )
  )

  if (legacyAfter !== legacyBefore || selectieAfter !== selectieBefore) {
    console.error("\nWAARSCHUWING: product-count gewijzigd tijdens diagnose.")
    process.exit(1)
  }

  process.exit(0)
}

main().catch((err) => {
  console.error(formatWorkflowError(err))
  process.exit(1)
})
