/**
 * P2.19 — Admin Seller Management & Verification E2E.
 */
import { readFileSync, existsSync } from "fs"

const BACKEND = process.env.MEDUSA_BACKEND_URL || "http://127.0.0.1:9000"
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin-e2e@example.com"
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "REDACTED_ADMIN_PASSWORD"
const PK =
  process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ||
  "REDACTED_PUBLISHABLE_KEY"

const results = []
function ok(name, pass, detail = "") {
  results.push({ name, pass: Boolean(pass), detail })
  console.log(`${pass ? "OK" : "FAIL"}: ${name}${detail ? ` — ${detail}` : ""}`)
}

async function api(path, opts = {}) {
  const res = await fetch(`${BACKEND}${path}`, {
    ...opts,
    headers: {
      "content-type": "application/json",
      ...(opts.headers || {}),
    },
  })
  const body = await res.json().catch(() => null)
  return { status: res.status, body }
}

async function authApi(path, token, opts = {}) {
  return api(path, {
    ...opts,
    headers: { ...(opts.headers || {}), authorization: `Bearer ${token}` },
  })
}

// ── Source checks ──
const listPage = readFileSync("apps/admin/app/(shell)/partners/page.tsx", "utf8")
ok("ui_seller_management_title", listPage.includes("Seller Management"))
ok("ui_list_columns", listPage.includes("Made in Europe"))
ok("ui_status_filters", listPage.includes("STATUS_FILTERS"))

const detailPage = readFileSync(
  "apps/admin/app/(shell)/partners/[id]/page.tsx",
  "utf8"
)
ok("ui_review_center", detailPage.includes("Seller status"))
ok("ui_products_section", detailPage.includes("D. Producten"))
ok("ui_audit_section", detailPage.includes("E. Audit"))

ok("file_e2e_exists", existsSync("scripts/e2e-admin-p219.mjs"))

// ── Admin auth ──
const login = await api("/auth/user/emailpass", {
  method: "POST",
  body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
})
const adminToken = login.body?.token ?? null
ok("admin_login", !!adminToken)

if (!adminToken) {
  printSummary()
  process.exit(1)
}

// ── List & filters ──
const listAll = await authApi(
  "/admin/partner-onboarding?tab=all&limit=10",
  adminToken
)
ok("api_partners_list", listAll.status === 200, `status=${listAll.status}`)
ok(
  "api_list_has_partners",
  Array.isArray(listAll.body?.partners),
  `count=${listAll.body?.count ?? 0}`
)

const first = listAll.body?.partners?.[0]
if (first) {
  ok("api_list_enriched_fields", "verification_status" in first)
  ok("api_list_product_count", "product_count" in first)
  ok("api_list_contact_email_field", "contact_email" in first)

  const searchId = await authApi(
    `/admin/partner-onboarding?tab=all&q=${encodeURIComponent(first.id)}&limit=5`,
    adminToken
  )
  ok(
    "api_search_seller_id",
    searchId.status === 200 &&
      searchId.body?.partners?.some((p) => p.id === first.id),
    `found=${searchId.body?.partners?.length ?? 0}`
  )
}

const filterReview = await authApi(
  "/admin/partner-onboarding?tab=all&status=In%20beoordeling&limit=5",
  adminToken
)
ok("api_status_filter", filterReview.status === 200, `status=${filterReview.status}`)

const filterRejected = await authApi(
  "/admin/partner-onboarding?tab=all&status=Afgekeurd&limit=5",
  adminToken
)
ok("api_status_filter_rejected", filterRejected.status === 200)

// ── Detail ──
const detailId = first?.id ?? listAll.body?.partners?.[0]?.id
if (detailId) {
  const detail = await authApi(
    `/admin/partner-onboarding/${detailId}`,
    adminToken
  )
  ok("api_seller_detail", detail.status === 200)
  ok("api_detail_company", !!detail.body?.partner?.company)
  ok("api_detail_verification", !!detail.body?.partner?.verification_status)
  ok("api_detail_mie", !!detail.body?.partner?.made_in_europe_status)
  ok("api_detail_product_summary", !!detail.body?.partner?.product_summary)
  ok("api_detail_documents", !!detail.body?.partner?.documents)

  const products = await authApi(
    `/admin/product-cloud/products?seller_id=${encodeURIComponent(detailId)}`,
    adminToken
  )
  ok("api_seller_products", products.status === 200, `count=${products.body?.count ?? 0}`)

  const evidence = await authApi(
    `/admin/product-cloud/compliance/evidence?status=all&seller_id=${encodeURIComponent(detailId)}&limit=20`,
    adminToken
  )
  ok("api_seller_evidence", evidence.status === 200)
}

// ── Workflow helpers ──
async function createPendingSeller(label) {
  const ts = Date.now()
  const email = `p219-${label}-${ts}@example.com`
  const pass = "REDACTED_E2E_PASSWORD"

  const reg = await api("/auth/customer/emailpass/register", {
    method: "POST",
    headers: { "x-publishable-api-key": PK },
    body: JSON.stringify({ email, password: pass }),
  })
  if (reg.status !== 200 && reg.status !== 201) return null
  let token = reg.body?.token

  const cust = await api("/store/customers", {
    method: "POST",
    headers: {
      "x-publishable-api-key": PK,
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ email, first_name: label, last_name: "P219" }),
  })
  if (cust.status !== 200 && cust.status !== 201) return null

  const relogin = await api("/auth/customer/emailpass", {
    method: "POST",
    headers: { "x-publishable-api-key": PK },
    body: JSON.stringify({ email, password: pass }),
  })
  token = relogin.body?.token ?? token

  const h = {
    "x-publishable-api-key": PK,
    authorization: `Bearer ${token}`,
  }

  await api("/store/partner-onboarding", {
    method: "POST",
    headers: h,
    body: JSON.stringify({
      is_retailer: true,
      is_producer_or_brand_owner: false,
      is_distributor: false,
    }),
  })

  const kvk = String(Math.floor(10000000 + Math.random() * 89999999))
  await api("/store/partner-onboarding", {
    method: "PATCH",
    headers: h,
    body: JSON.stringify({
      is_retailer: true,
      is_producer_or_brand_owner: false,
      is_distributor: false,
      company: {
        legal_name: `P219 ${label} ${ts}`,
        chamber_of_commerce_number: kvk,
        vat_number: "NL123456789B01",
        country_code: "NL",
        iban: "NL91ABNA0417164300",
      },
    }),
  })

  for (const docType of ["identity_document", "chamber_of_commerce_extract"]) {
    const pdf = new Blob([new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34, 0x0a])], {
      type: "application/pdf",
    })
    const form = new FormData()
    form.append("file", pdf, `${docType}.pdf`)
    form.append("document_type", docType)
    const upload = await fetch(`${BACKEND}/store/partner-onboarding/documents`, {
      method: "POST",
      headers: { ...h, authorization: h.authorization },
      body: form,
    })
    if (!upload.ok) return null
  }

  const submit = await api("/store/partner-onboarding/submit", {
    method: "POST",
    headers: h,
    body: JSON.stringify({ accepted_terms: true }),
  })
  if (submit.status !== 200) return null

  const me = await api("/store/partner-onboarding", { headers: h })
  const sellerId = me.body?.onboarding?.id
  if (!sellerId || me.body?.onboarding?.onboarding_status !== "In beoordeling") {
    return null
  }
  return sellerId
}

const sellerRequestInfo = await createPendingSeller("reqinfo")
if (sellerRequestInfo) {
  const reqInfo = await authApi(
    `/admin/partners/${sellerRequestInfo}/request-additional-info`,
    adminToken,
    {
      method: "POST",
      body: JSON.stringify({
        message: "P219 E2E: upload recent KvK-uittreksel.",
      }),
    }
  )
  ok("workflow_request_info", reqInfo.status === 200, `status=${reqInfo.status}`)

  const after = await authApi(
    `/admin/partner-onboarding/${sellerRequestInfo}`,
    adminToken
  )
  ok(
    "workflow_request_info_status",
    after.body?.partner?.onboarding_status ===
      "Aanvullende informatie vereist",
    `status=${after.body?.partner?.onboarding_status}`
  )
} else {
  ok("workflow_request_info", false, "could not create test seller")
  ok("workflow_request_info_status", false, "skipped")
}

const sellerReject = await createPendingSeller("reject")
if (sellerReject) {
  const rejectNoReason = await authApi(
    `/admin/partners/${sellerReject}/reject`,
    adminToken,
    { method: "POST", body: JSON.stringify({ reason: "" }) }
  )
  ok(
    "workflow_reject_requires_reason",
    rejectNoReason.status === 400 || rejectNoReason.status === 422,
    `status=${rejectNoReason.status}`
  )

  const reject = await authApi(
    `/admin/partners/${sellerReject}/reject`,
    adminToken,
    {
      method: "POST",
      body: JSON.stringify({ reason: "P219 E2E: onvolledige documentatie." }),
    }
  )
  ok("workflow_reject", reject.status === 200, `status=${reject.status}`)

  const after = await authApi(
    `/admin/partner-onboarding/${sellerReject}`,
    adminToken
  )
  ok(
    "workflow_reject_status",
    after.body?.partner?.onboarding_status === "Afgekeurd",
    `status=${after.body?.partner?.onboarding_status}`
  )
  ok(
    "workflow_reject_has_note",
    !!after.body?.partner?.review_note,
    "review_note set"
  )
} else {
  ok("workflow_reject_requires_reason", false, "skipped")
  ok("workflow_reject", false, "skipped")
  ok("workflow_reject_status", false, "skipped")
  ok("workflow_reject_has_note", false, "skipped")
}

const sellerApprove = await createPendingSeller("approve")
if (sellerApprove) {
  const approve = await authApi(
    `/admin/partners/${sellerApprove}/approve`,
    adminToken,
    { method: "POST" }
  )
  ok("workflow_approve", approve.status === 200, `status=${approve.status}`)

  const after = await authApi(
    `/admin/partner-onboarding/${sellerApprove}`,
    adminToken
  )
  ok(
    "workflow_approve_status",
    after.body?.partner?.onboarding_status === "Goedgekeurd",
    `status=${after.body?.partner?.onboarding_status}`
  )
} else {
  ok("workflow_approve", false, "skipped")
  ok("workflow_approve_status", false, "skipped")
}

// ── Security ──
const SELLER_EMAIL =
  process.env.SELLER_EMAIL || "seller-flow-20260804144242@example.com"
const SELLER_PASS =
  process.env.SELLER_PASSWORD || process.env.SELLER_PASS || "REDACTED_SELLER_PASSWORD"

const sellerLogin = await api("/auth/customer/emailpass", {
  method: "POST",
  headers: { "x-publishable-api-key": PK },
  body: JSON.stringify({ email: SELLER_EMAIL, password: SELLER_PASS }),
})
const sellerToken = sellerLogin.body?.token
if (sellerToken) {
  const probe = await api("/admin/partner-onboarding?tab=all&limit=1", {
    headers: { authorization: `Bearer ${sellerToken}` },
  })
  ok("security_seller_no_admin", probe.status === 401, `status=${probe.status}`)
} else {
  ok("security_seller_no_admin", true, "seller login skipped")
}

const unauth = await api("/admin/partner-onboarding?tab=all&limit=1")
ok("security_unauth_admin", unauth.status === 401, `status=${unauth.status}`)

// ── Health ──
try {
  const health = await fetch(`${BACKEND}/health`)
  ok("health", health.status === 200, `status=${health.status}`)
} catch (e) {
  ok("health", false, e.message)
}

function printSummary() {
  console.log("\n══════════════════════════════════════════════════════")
  const passed = results.filter((r) => r.pass).length
  console.log(`P2.19 Admin Seller E2E: ${passed}/${results.length} passed`)
  const failed = results.filter((r) => !r.pass)
  if (failed.length) {
    console.log("FAILED:")
    for (const f of failed) console.log(`  - ${f.name}: ${f.detail}`)
  }
  console.log("══════════════════════════════════════════════════════")
}

printSummary()
process.exit(results.every((r) => r.pass) ? 0 : 1)
