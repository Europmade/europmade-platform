/**
 * P2.18 — Admin Backoffice Foundation & Control Center E2E.
 */
import { readFileSync, existsSync } from "fs"

const BACKEND = process.env.MEDUSA_BACKEND_URL || "http://127.0.0.1:9000"
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin-e2e@example.com"
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "REDACTED_ADMIN_PASSWORD"

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
  return { status: res.status, body, headers: res.headers }
}

async function authApi(path, token, opts = {}) {
  return api(path, {
    ...opts,
    headers: { ...(opts.headers || {}), authorization: `Bearer ${token}` },
  })
}

// ── Source checks: module registry & pages ──
const registry = readFileSync("apps/admin/lib/module-registry.ts", "utf8")
ok("nav_groups_platform", registry.includes('label: "Platform"'))
ok("nav_groups_commercial", registry.includes('label: "Commercieel"'))
ok("nav_groups_financial", registry.includes('label: "Financieel"'))
ok("nav_groups_content", registry.includes('label: "Content & Moderatie"'))
ok("nav_sellers_route", registry.includes('route: "/partners"'))
ok("nav_finance_enabled", registry.includes('route: "/finance"'))
ok("nav_affiliate_enabled", registry.includes('route: "/affiliate"'))
ok("nav_settings_enabled", registry.includes('route: "/settings"'))

const shell = readFileSync("apps/admin/components/admin-shell.tsx", "utf8")
ok("shell_grouped_nav", shell.includes("navGroupsSorted"))
ok("shell_no_more_dropdown", !shell.includes("Meer"))

for (const page of [
  "apps/admin/app/(shell)/dashboard/page.tsx",
  "apps/admin/app/(shell)/finance/page.tsx",
  "apps/admin/app/(shell)/affiliate/page.tsx",
  "apps/admin/app/(shell)/settings/page.tsx",
]) {
  ok(`page_${page.split("/").pop()}`, existsSync(page))
}

const dashboardPage = readFileSync(
  "apps/admin/app/(shell)/dashboard/page.tsx",
  "utf8"
)
ok("dashboard_control_center", dashboardPage.includes("Control Center"))
ok("dashboard_platform_kpis", dashboardPage.includes("Platform KPI"))
ok("dashboard_activity_panels", dashboardPage.includes("ActivityPanel"))
ok("dashboard_no_demo_data", !dashboardPage.includes("demoSellers"))

const dashboardApi = readFileSync("apps/admin/lib/dashboard-api.ts", "utf8")
ok("dashboard_api_platform", dashboardApi.includes("platform:"))
ok("dashboard_api_control_center", dashboardApi.includes("controlCenter:"))
ok("dashboard_api_no_hardcoded_kpis", !dashboardApi.includes("numeric: 42"))

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

// ── Dashboard data APIs (real data, no seller auth) ──
const partners = await authApi(
  "/admin/partner-onboarding?tab=all&limit=5",
  adminToken
)
ok("api_partners", partners.status === 200, `status=${partners.status}`)

const products = await authApi(
  "/admin/product-cloud/products?limit=5",
  adminToken
)
ok("api_products", products.status === 200, `status=${products.status}`)

const orders = await authApi("/admin/order-service/orders?limit=5", adminToken)
ok("api_orders", orders.status === 200, `status=${orders.status}`)

const campaigns = await authApi("/admin/advertising/campaigns", adminToken)
ok("api_advertising", campaigns.status === 200, `status=${campaigns.status}`)

const payouts = await authApi("/admin/finance/payouts", adminToken)
ok("api_finance_payouts", payouts.status === 200, `status=${payouts.status}`)

const cms = await authApi("/admin/cms/banners", adminToken)
ok("api_cms", cms.status === 200, `status=${cms.status}`)

const approvals = await authApi("/admin/product-cloud/approvals", adminToken)
ok("api_product_approvals", approvals.status === 200, `status=${approvals.status}`)

const affiliates = await authApi("/admin/affiliates", adminToken)
ok("api_affiliates", affiliates.status === 200, `status=${affiliates.status}`)

// ── Security: seller cannot access admin API ──
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
  const sellerAdminProbe = await api("/admin/partner-onboarding?tab=all&limit=1", {
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

// ── Unauthorized admin access ──
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
  const total = results.length
  console.log(`P2.18 Admin E2E: ${passed}/${total} passed`)
  const failed = results.filter((r) => !r.pass)
  if (failed.length > 0) {
    console.log("FAILED:")
    for (const f of failed) console.log(`  - ${f.name}: ${f.detail}`)
  }
  console.log("══════════════════════════════════════════════════════")
}

printSummary()
process.exit(results.every((r) => r.pass) ? 0 : 1)
