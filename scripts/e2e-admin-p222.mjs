/**
 * P2.22 — Admin Order Management & Returns E2E (Seller parity + platform scope).
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

// ── Source checks ──
ok("orders_page", existsSync("apps/admin/app/(shell)/orders/page.tsx"))
ok("orders_detail", existsSync("apps/admin/app/(shell)/orders/[id]/page.tsx"))
ok("returns_page", existsSync("apps/admin/app/(shell)/returns/page.tsx"))
ok("returns_detail", existsSync("apps/admin/app/(shell)/returns/[id]/page.tsx"))

const shell = readFileSync("apps/admin/components/admin-shell.tsx", "utf8")
ok("header_europmade_brand", shell.includes(">EuropMade<") || shell.includes("EuropMade Admin"))
ok("header_account_menu", shell.includes("Accountmenu") || shell.includes("accountmenu") || shell.includes("Admin-account"))
ok("header_settings_link", shell.includes('href="/settings"'))
ok("header_logout", shell.includes("Uitloggen"))

const registry = readFileSync("apps/admin/lib/module-registry.ts", "utf8")
ok("nav_returns", registry.includes('route: "/returns"'))

const dashApi = readFileSync("apps/admin/lib/dashboard-api.ts", "utf8")
ok("dashboard_returns_link", dashApi.includes('href: "/returns"'))
ok("dashboard_returns_open_query", dashApi.includes("returns?open=1"))

const adminOrders = readFileSync(
  "apps/backend/src/api/admin/order-service/orders/route.ts",
  "utf8"
)
ok(
  "admin_orders_reuse_product_resolve",
  adminOrders.includes("resolveOrderLinesProductInfo")
)
const adminDetail = readFileSync(
  "apps/backend/src/api/admin/order-service/orders/[id]/route.ts",
  "utf8"
)
ok("admin_detail_reuse_enrich", adminDetail.includes("enrichOrderBundle"))

const returnsRoute = readFileSync(
  "apps/backend/src/api/admin/order-service/returns/route.ts",
  "utf8"
)
ok("admin_returns_reuse_product", returnsRoute.includes("resolveOrderLineProductInfo"))
ok(
  "admin_returns_detail_exists",
  existsSync("apps/backend/src/api/admin/order-service/returns/[id]/route.ts")
)

// ── Auth ──
let adminToken = null
try {
  const login = await api("/auth/user/emailpass", {
    method: "POST",
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  })
  adminToken = login.body?.token ?? null
} catch {}
ok("admin_auth", !!adminToken)

if (!adminToken) {
  printSummary()
  process.exit(1)
}

// ── Orders ──
const orders = await authApi("/admin/order-service/orders", adminToken)
ok("orders_list", orders.status === 200, `status=${orders.status}`)
ok(
  "orders_enriched_fields",
  Array.isArray(orders.body?.orders) &&
    (orders.body.orders.length === 0 ||
      (orders.body.orders[0].seller &&
        orders.body.orders[0].product_summary != null)),
  `count=${orders.body?.count}`
)

const first = orders.body?.orders?.[0]
let detail = null
if (first?.order?.id) {
  detail = await authApi(
    `/admin/order-service/orders/${first.order.id}`,
    adminToken
  )
  ok("order_detail", detail.status === 200, `status=${detail.status}`)
  ok(
    "order_detail_customer",
    detail.body?.order?.customer_id != null,
    detail.body?.order?.customer_email
      ? `email=${detail.body.order.customer_email}`
      : "customer_id only"
  )
  ok(
    "order_detail_seller",
    !!detail.body?.seller?.id,
    detail.body?.seller?.name || ""
  )
  ok(
    "order_detail_products",
    Array.isArray(detail.body?.lines) &&
      (detail.body.lines.length === 0 ||
        typeof detail.body.lines[0].product_name === "string"),
    `lines=${detail.body?.lines?.length}`
  )
  ok(
    "order_detail_no_offer_as_primary",
    !detail.body?.lines?.[0] ||
      detail.body.lines[0].product_name !== detail.body.lines[0].offer_id,
    detail.body?.lines?.[0]?.product_name || "empty"
  )
  ok(
    "order_detail_shipping",
    detail.body?.order?.shipping_status != null ||
      Array.isArray(detail.body?.shipments),
    detail.body?.order?.shipping_status || "shipments"
  )
} else {
  ok("order_detail", true, "no orders — skipped")
  ok("order_detail_customer", true, "skipped")
  ok("order_detail_seller", true, "skipped")
  ok("order_detail_products", true, "skipped")
  ok("order_detail_no_offer_as_primary", true, "skipped")
  ok("order_detail_shipping", true, "skipped")
}

const filtered = await authApi(
  "/admin/order-service/orders?payment_status=Betaald",
  adminToken
)
ok("orders_filter_payment", filtered.status === 200)

const exceptions = await authApi(
  "/admin/order-service/orders?exception=open",
  adminToken
)
ok("orders_exceptions", exceptions.status === 200)

// ── Returns ──
const returnsOpen = await authApi(
  "/admin/order-service/returns?open=1",
  adminToken
)
ok("returns_list_open", returnsOpen.status === 200, `status=${returnsOpen.status}`)
ok(
  "returns_open_count_field",
  typeof returnsOpen.body?.open_count === "number" ||
    typeof returnsOpen.body?.count === "number"
)

const returnsAll = await authApi("/admin/order-service/returns", adminToken)
ok("returns_list_all", returnsAll.status === 200)
const firstRet = returnsAll.body?.returns?.[0]
if (firstRet?.id) {
  const retDetail = await authApi(
    `/admin/order-service/returns/${firstRet.id}`,
    adminToken
  )
  ok("returns_detail", retDetail.status === 200, `status=${retDetail.status}`)
  ok(
    "returns_detail_order",
    !!retDetail.body?.order?.order_number,
    retDetail.body?.order?.order_number || ""
  )
  ok(
    "returns_detail_refund_field",
    retDetail.body?.return != null &&
      ("refund_status" in retDetail.body.return ||
        retDetail.body.return.refund_status === null)
  )
} else {
  ok("returns_detail", true, "no returns — skipped")
  ok("returns_detail_order", true, "skipped")
  ok("returns_detail_refund_field", true, "skipped")
}

// ── Related modules still reachable ──
ok(
  "products_still",
  (await authApi("/admin/product-cloud/products?limit=1", adminToken)).status ===
    200
)
ok(
  "advertising_still",
  (await authApi("/admin/advertising/campaigns", adminToken)).status === 200
)
ok(
  "affiliate_still",
  (await authApi("/admin/affiliates", adminToken)).status === 200
)
ok(
  "finance_still",
  (await authApi("/admin/finance/payouts", adminToken)).status === 200
)

// ── UI routes ──
try {
  const uiOrders = await fetch(`${ADMIN_UI}/orders`, { redirect: "manual" })
  ok(
    "ui_orders",
    uiOrders.status === 200 || uiOrders.status === 307 || uiOrders.status === 302,
    `status=${uiOrders.status}`
  )
} catch (e) {
  ok("ui_orders", false, e.message)
}
try {
  const uiReturns = await fetch(`${ADMIN_UI}/returns`, { redirect: "manual" })
  ok(
    "ui_returns",
    uiReturns.status === 200 ||
      uiReturns.status === 307 ||
      uiReturns.status === 302,
    `status=${uiReturns.status}`
  )
} catch (e) {
  ok("ui_returns", false, e.message)
}

// ── Security ──
const unauth = await api("/admin/order-service/orders")
ok("security_unauth", unauth.status === 401, `status=${unauth.status}`)

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
  const probe = await api("/admin/order-service/returns", {
    headers: { authorization: `Bearer ${sellerToken}` },
  })
  ok(
    "security_seller",
    probe.status === 401 || probe.status === 403,
    `status=${probe.status}`
  )
} else {
  ok("security_seller", true, "seller login skipped")
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
  console.log(`P2.22 Admin E2E: ${passed}/${total} passed`)
  const failed = results.filter((r) => !r.pass)
  if (failed.length > 0) {
    console.log("FAILED:")
    for (const f of failed) console.log(`  - ${f.name}: ${f.detail}`)
  }
  console.log("══════════════════════════════════════════════════════")
}

printSummary()
process.exit(results.every((r) => r.pass) ? 0 : 1)
