/**
 * P2.21 — Admin Control Center 2.0 E2E.
 */
import { readFileSync, existsSync } from "fs"

const BACKEND = process.env.MEDUSA_BACKEND_URL || "http://127.0.0.1:9000"
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin-e2e@example.com"
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "REDACTED_ADMIN_PASSWORD"
const ADMIN_UI = process.env.ADMIN_URL || "http://127.0.0.1:3001"

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

function hasUndefinedOrNaN(value, path = "root") {
  if (typeof value === "number" && Number.isNaN(value)) return path
  if (value === undefined) return path
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      const hit = hasUndefinedOrNaN(value[i], `${path}[${i}]`)
      if (hit) return hit
    }
  } else if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) {
      const hit = hasUndefinedOrNaN(v, `${path}.${k}`)
      if (hit) return hit
    }
  }
  return null
}

// ── Source structure ──
ok(
  "dashboard_page_exists",
  existsSync("apps/admin/app/(shell)/dashboard/page.tsx")
)
ok(
  "control_center_lib_exists",
  existsSync("apps/admin/lib/control-center.ts")
)

const dashPage = readFileSync(
  "apps/admin/app/(shell)/dashboard/page.tsx",
  "utf8"
)
ok("ui_control_center_title", dashPage.includes("Control Center"))
ok("ui_period_filter", dashPage.includes("CONTROL_CENTER_PERIOD_OPTIONS"))
ok("ui_attention", dashPage.includes("Aandacht vereist"))
ok("ui_recent_orders", dashPage.includes("Recente orders"))
ok("ui_sellers", dashPage.includes("Nieuwe seller-aanvragen"))
ok("ui_products", dashPage.includes("Producten wachtend op goedkeuring"))
ok("ui_advertising", dashPage.includes("Openstaande advertising-campagnes"))
ok("ui_finance", dashPage.includes('title="Finance"') || dashPage.includes(">Finance<"))
ok("ui_moderation", dashPage.includes('title="Moderatie"') || dashPage.includes(">Moderatie<"))
ok("ui_system", dashPage.includes("Systeemstatus"))
ok("ui_no_marketplace_perf", !dashPage.includes("Marketplace Performance"))
ok("ui_links_partners", dashPage.includes('href="/partners"'))
ok("ui_links_approvals", dashPage.includes("/product-cloud/products/approvals"))
ok("ui_links_orders", dashPage.includes('href="/orders"'))

const dashApi = readFileSync("apps/admin/lib/dashboard-api.ts", "utf8")
ok("api_no_demo_metric_hardcode", !dashApi.includes("numeric: 42"))
ok("api_pending_review_ads", dashApi.includes("pending_review"))
ok("api_recent_order_number", dashApi.includes("order_number"))
ok("api_order_detail_href", dashApi.includes("`/orders/${"))

const cc = readFileSync("apps/admin/lib/control-center.ts", "utf8")
ok("kpi_source_map", cc.includes("CONTROL_CENTER_KPI_SOURCES"))
ok("period_options_five", cc.includes("previous_month"))

// ── Admin auth ──
let adminToken = null
try {
  const login = await api("/auth/user/emailpass", {
    method: "POST",
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  })
  adminToken = login.body?.token ?? null
} catch {}
ok("admin_auth", !!adminToken, adminToken ? "token obtained" : "no token")

if (!adminToken) {
  printSummary()
  process.exit(1)
}

// ── Dashboard data endpoints used by Control Center ──
const partners = await authApi(
  "/admin/partner-onboarding?tab=all&limit=5",
  adminToken
)
ok("api_partners", partners.status === 200, `status=${partners.status}`)

const queue = await authApi(
  "/admin/partner-onboarding?tab=queue&limit=5",
  adminToken
)
ok("api_seller_queue", queue.status === 200, `status=${queue.status}`)

const products = await authApi(
  "/admin/product-cloud/products?limit=5",
  adminToken
)
ok("api_products", products.status === 200, `status=${products.status}`)

const approvals = await authApi("/admin/product-cloud/approvals", adminToken)
ok("api_product_approvals", approvals.status === 200, `status=${approvals.status}`)
ok(
  "product_approvals_shape",
  Array.isArray(approvals.body?.products) &&
    typeof approvals.body?.count === "number",
  `count=${approvals.body?.count}`
)

const orders = await authApi("/admin/order-service/orders", adminToken)
ok("api_orders", orders.status === 200, `status=${orders.status}`)
const firstOrder = orders.body?.orders?.[0]?.order
ok(
  "orders_have_number",
  !firstOrder || typeof firstOrder.order_number === "string",
  firstOrder ? `number=${firstOrder.order_number}` : "empty list ok"
)

const campaigns = await authApi("/admin/advertising/campaigns", adminToken)
ok("api_advertising", campaigns.status === 200, `status=${campaigns.status}`)

const payouts = await authApi("/admin/finance/payouts", adminToken)
ok("api_finance_payouts", payouts.status === 200, `status=${payouts.status}`)

const moderation = await authApi("/admin/moderation/queues", adminToken)
ok("api_moderation", moderation.status === 200, `status=${moderation.status}`)

const audit = await authApi("/admin/audit-log?limit=5", adminToken)
ok("api_audit", audit.status === 200, `status=${audit.status}`)

const nanHit = hasUndefinedOrNaN({
  partners: partners.body,
  queue: queue.body,
  products: products.body,
  approvals: approvals.body,
  orders: orders.body,
  campaigns: campaigns.body,
  payouts: payouts.body,
  moderation: moderation.body,
})
ok("no_undefined_nan_in_payloads", !nanHit, nanHit || "clean")

// ── Admin UI reachable ──
try {
  const ui = await fetch(`${ADMIN_UI}/dashboard`, { redirect: "manual" })
  ok(
    "admin_dashboard_reachable",
    ui.status === 200 || ui.status === 307 || ui.status === 302,
    `status=${ui.status}`
  )
} catch (e) {
  ok("admin_dashboard_reachable", false, e.message)
}

// ── Security ──
const unauth = await api("/admin/partner-onboarding?tab=all&limit=1")
ok("security_unauth_admin", unauth.status === 401, `status=${unauth.status}`)

const SELLER_EMAIL =
  process.env.SELLER_EMAIL || "seller-flow-20260804144242@example.com"
const SELLER_PASS =
  process.env.SELLER_PASSWORD || process.env.SELLER_PASS || "REDACTED_SELLER_PASSWORD"
const PK =
  process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ||
  "REDACTED_PUBLISHABLE_KEY"

let sellerToken = null
try {
  const sellerLogin = await api("/auth/customer/emailpass", {
    method: "POST",
    headers: { "x-publishable-api-key": PK },
    body: JSON.stringify({ email: SELLER_EMAIL, password: SELLER_PASS }),
  })
  sellerToken = sellerLogin.body?.token ?? null
} catch {}

if (sellerToken) {
  const sellerAdminProbe = await api("/admin/order-service/orders", {
    headers: { authorization: `Bearer ${sellerToken}` },
  })
  ok(
    "security_seller_no_admin",
    sellerAdminProbe.status === 401 || sellerAdminProbe.status === 403,
    `status=${sellerAdminProbe.status}`
  )
} else {
  ok("security_seller_no_admin", true, "seller login skipped")
}

try {
  const health = await fetch(`${BACKEND}/health`)
  ok("health", health.status === 200, `status=${health.status}`)
} catch (e) {
  ok("health", false, e.message)
}

function printSummary() {
  console.log("\n══════════════════════════════════════════════════════")
  const passed = results.filter((r) => r.pass).length
  const total = results.length
  console.log(`P2.21 Admin E2E: ${passed}/${total} passed`)
  const failed = results.filter((r) => !r.pass)
  if (failed.length > 0) {
    console.log("FAILED:")
    for (const f of failed) console.log(`  - ${f.name}: ${f.detail}`)
  }
  console.log("══════════════════════════════════════════════════════")
}

printSummary()
process.exit(results.every((r) => r.pass) ? 0 : 1)
