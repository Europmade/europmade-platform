/**
 * Service-level UAT for European ownership (ADR-0044).
 * Usage: pnpm --filter @europmade/backend exec jiti scripts/european-ownership-uat.ts
 */
import express from "express"
import { resolve } from "node:path"
import { readFileSync } from "node:fs"
import { loadEnv } from "@medusajs/framework/utils"
import { container } from "@medusajs/framework"
import medusaLoader from "@medusajs/medusa/loaders/index"
import {
  statusAfterSellerSubmit,
} from "../src/modules/verification/european-ownership"
import { VERIFICATION_MODULE } from "../src/modules/verification"
import type VerificationModuleService from "../src/modules/verification/service"
import { PRODUCT_CLOUD_MODULE } from "../src/modules/product-cloud"
import type ProductCloudModuleService from "../src/modules/product-cloud/service"

const BACKEND_ROOT = resolve(__dirname, "..")
const REPO_ROOT = resolve(BACKEND_ROOT, "../..")
const backend = process.env.MEDUSA_BACKEND_URL || "http://127.0.0.1:9000"
const PRODUCT_ID = "prod_01M31TK384V6WWNQGWS22GCFGF"
const SELECTIE_SELLER = "sell_01M1BJCJ85X7E4B85XS08KB1G4"
const adminEmail = process.env.ADMIN_EMAIL || "admin-e2e@example.com"
const adminPassword = process.env.ADMIN_PASSWORD || "REDACTED_ADMIN_PASSWORD"
const pubKey = readFileSync(resolve(REPO_ROOT, "apps/web/.env.local"), "utf8")
  .match(/NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=(.*)/)![1]
  .trim()

async function json(url: string, init: RequestInit = {}) {
  const headers: Record<string, string> = {
    "content-type": "application/json",
    "x-publishable-api-key": pubKey,
    ...((init.headers as Record<string, string>) || {}),
  }
  const res = await fetch(url, { ...init, headers })
  const body = await res.json().catch(() => ({}))
  return { status: res.status, body: body as Record<string, any> }
}

function fail(step: string, detail: unknown): never {
  console.log("FAIL_AT", step)
  console.log("DETAIL", detail)
  process.exit(1)
}

async function main() {
  process.chdir(BACKEND_ROOT)
  loadEnv(process.env.NODE_ENV || "development", BACKEND_ROOT)
  try {
    require("ts-node").register({ transpileOnly: true })
    require("tsconfig-paths").register({})
  } catch {
    /* ignore */
  }
  await medusaLoader({
    directory: BACKEND_ROOT,
    expressApp: express(),
    skipLoadingEntryPoints: true,
  })

  const verification = container.resolve(
    VERIFICATION_MODULE
  ) as VerificationModuleService
  const productCloud = container.resolve(
    PRODUCT_CLOUD_MODULE
  ) as ProductCloudModuleService
  const product = (await productCloud.retrieveProduct(PRODUCT_ID)) as {
    manufacturer_id?: string
    current_owner_seller_id?: string
  }
  const manufacturerId = product.manufacturer_id
  console.log("PRODUCT", PRODUCT_ID, "MANUFACTURER", manufacturerId)
  if (!manufacturerId) fail("manufacturer", "missing")
  if (product.current_owner_seller_id !== SELECTIE_SELLER) {
    fail("owner", product.current_owner_seller_id)
  }

  const existing = (await verification.listEuropeanOwnershipClaims(
    { manufacturer_id: manufacturerId },
    { take: 1 }
  )) as Array<{ id: string }>
  if (existing[0]) {
    await verification.softDeleteEuropeanOwnershipClaims([existing[0].id])
  }

  const claim = (await verification.createEuropeanOwnershipClaims({
    manufacturer_id: manufacturerId,
    company_id: null,
    seller_id: SELECTIE_SELLER,
    ownership_band: "eu_100",
    source: "brand_producer",
    status: statusAfterSellerSubmit(false),
    evidence_file_id: null,
    evidence_note: null,
  })) as { id: string; status: string }

  await verification.createEuropeanOwnershipStatusEvents({
    claim_id: claim.id,
    manufacturer_id: manufacturerId,
    from_status: "Niet opgegeven",
    to_status: claim.status,
    note: "UAT seller submit without evidence",
    actor_type: "seller",
    decision: "seller_create",
  })
  console.log("CREATED", claim.id, claim.status)

  const adminLogin = await json(`${backend}/auth/user/emailpass`, {
    method: "POST",
    body: JSON.stringify({ email: adminEmail, password: adminPassword }),
  })
  const adminToken = adminLogin.body.token as string | undefined
  if (!adminToken) fail("admin_login", JSON.stringify(adminLogin.body).slice(0, 200))
  const adminHdr = { authorization: `Bearer ${adminToken}` }

  const reqInfo = await json(
    `${backend}/admin/product-cloud/european-ownership/${claim.id}`,
    {
      method: "POST",
      headers: adminHdr,
      body: JSON.stringify({
        decision: "request_info",
        note: "UAT: kun je het opgegeven percentage nader onderbouwen?",
      }),
    }
  )
  console.log(
    "REQUEST_INFO",
    reqInfo.status,
    reqInfo.body.claim?.status,
    reqInfo.body.claim?.review_note
  )
  if (reqInfo.body.claim?.status !== "Bewijs opgevraagd") {
    fail("request_info", JSON.stringify(reqInfo.body).slice(0, 400))
  }

  await verification.updateEuropeanOwnershipClaims({
    id: claim.id,
    status: statusAfterSellerSubmit(true),
    evidence_note: "UAT: openbare info Merz b. Schwanen",
  })
  await verification.createEuropeanOwnershipStatusEvents({
    claim_id: claim.id,
    manufacturer_id: manufacturerId,
    from_status: "Bewijs opgevraagd",
    to_status: "Bewijs aangeleverd",
    note: "UAT seller resubmit with note",
    actor_type: "seller",
    decision: "seller_upsert",
  })

  const approve = await json(
    `${backend}/admin/product-cloud/european-ownership/${claim.id}`,
    {
      method: "POST",
      headers: adminHdr,
      body: JSON.stringify({
        decision: "approve",
        note: "UAT: goedgekeurd.",
      }),
    }
  )
  console.log("APPROVE", approve.status, approve.body.claim?.status)
  if (approve.body.claim?.status !== "Geverifieerd door EuropMade") {
    fail("approve", JSON.stringify(approve.body).slice(0, 400))
  }

  const catalog = await json(`${backend}/store/catalog/products/${PRODUCT_ID}`)
  const eo = catalog.body.european_ownership
  const mie = catalog.body.made_in_europe
  console.log("CATALOG", {
    ownership: eo,
    mie_score: mie?.score ?? null,
    mie_is: mie?.is_made_in_europe ?? null,
  })
  if (!eo?.verified_by_europmade || eo.ownership_band !== "eu_100") {
    fail("catalog", JSON.stringify(eo))
  }
  if (eo.ownership_band_label === String(mie?.score)) {
    fail("aliased", "ownership equals mie score")
  }

  console.log("UAT_OK", claim.id)
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
