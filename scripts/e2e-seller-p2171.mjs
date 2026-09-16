/**
 * P2.17.3 — Seller Finance final verification E2E.
 * Scope: existing seller sell_01KZ6CRDV9MS9WAJSTR9NT695C and 4 reprocessed EM-2026 orders.
 */

const BACKEND = process.env.MEDUSA_BACKEND_URL || "http://localhost:9000"
const PK =
  process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ||
  "REDACTED_PUBLISHABLE_KEY"
const SELLER_EMAIL =
  process.env.SELLER_EMAIL || "seller-flow-20260804144242@example.com"
const SELLER_PASS =
  process.env.SELLER_PASSWORD || process.env.SELLER_PASS || "REDACTED_SELLER_PASSWORD"

const TARGET_SELLER_ID = "sell_01KZ6CRDV9MS9WAJSTR9NT695C"
const TARGET_ORDERS = [
  "EM-2026-10482",
  "EM-2026-10483",
  "EM-2026-20991",
  "EM-2026-30001",
]
const EXPECTED_COMM = {
  "EM-2026-10482": 3.0,
  "EM-2026-10483": 3.0,
  "EM-2026-20991": 8.99,
  "EM-2026-30001": 3.0,
}
const EXPECTED_PAYOUT = {
  "EM-2026-10482": 26.95,
  "EM-2026-10483": 26.95,
  "EM-2026-20991": 80.86,
  "EM-2026-30001": 26.95,
}

const results = []
function ok(name, pass, detail = "") {
  results.push({ name, pass: Boolean(pass), detail })
  console.log(`${pass ? "OK" : "FAIL"}: ${name}${detail ? ` — ${detail}` : ""}`)
}
function approx(a, b, eps = 0.01) {
  return Math.abs(Number(a) - Number(b)) <= eps
}

async function api(path, opts = {}) {
  const res = await fetch(`${BACKEND}${path}`, {
    ...opts,
    headers: {
      "content-type": "application/json",
      "x-publishable-api-key": PK,
      ...(opts.headers || {}),
    },
  })
  const body = await res.json().catch(() => null)
  return { status: res.status, body, headers: res.headers }
}
async function apiRaw(path, opts = {}) {
  return fetch(`${BACKEND}${path}`, {
    ...opts,
    headers: {
      "x-publishable-api-key": PK,
      ...(opts.headers || {}),
    },
  })
}
async function authApi(path, token, opts = {}) {
  return api(path, {
    ...opts,
    headers: { ...(opts.headers || {}), authorization: `Bearer ${token}` },
  })
}

let sellerToken = null
let authBody = null
try {
  const login = await api("/auth/customer/emailpass", {
    method: "POST",
    body: JSON.stringify({ email: SELLER_EMAIL, password: SELLER_PASS }),
  })
  authBody = login.body
  sellerToken = login.body?.token ?? null
} catch {}
ok(
  "seller_auth",
  !!sellerToken,
  sellerToken
    ? `token obtained (${SELLER_EMAIL})`
    : `no token (${SELLER_EMAIL}) response=${JSON.stringify(authBody)}`
)
if (!sellerToken) {
  printSummary()
  process.exit(1)
}

const account = await authApi("/store/partner/account", sellerToken)
ok("seller_account_loads", account.status === 200, `status=${account.status}`)
ok(
  "seller_scope_correct",
  account.body?.partner?.id === TARGET_SELLER_ID,
  `seller_id=${account.body?.partner?.id ?? "unknown"}`
)

const ov = await authApi("/store/finance/seller", sellerToken)
ok("finance_overview_loads", ov.status === 200, `status=${ov.status}`)
const summary = ov.body?.summary
ok(
  "finance_summary_present",
  !!summary &&
    "commission_held" in summary &&
    "net_revenue" in summary &&
    "advertising_total" in summary,
  summary
    ? `comm=${summary.commission_held} revenue=${summary.net_revenue} ad=${summary.advertising_total}`
    : "missing"
)
ok(
  "finance_advertising_costs_present",
  Number(summary?.advertising_total ?? 0) >= 0,
  `advertising_total=${summary?.advertising_total}`
)

const comms = ov.body?.commissions ?? []
const targetComms = comms.filter((c) => TARGET_ORDERS.includes(c.order_number))
ok("commission_4_orders_visible", targetComms.length === 4, `found=${targetComms.length}`)
for (const orderNo of TARGET_ORDERS) {
  const c = targetComms.find((x) => x.order_number === orderNo)
  ok(`commission_${orderNo}_exists`, !!c, c ? `amount=${c.amount} pct=${c.percentage}` : "missing")
  if (c) {
    ok(`commission_${orderNo}_pct_10`, approx(Number(c.percentage), 0.1, 0.0001), `pct=${c.percentage}`)
    ok(
      `commission_${orderNo}_amount`,
      approx(Number(c.amount), EXPECTED_COMM[orderNo]),
      `amount=${c.amount} expected=${EXPECTED_COMM[orderNo]}`
    )
  }
}

const sales = await authApi("/store/finance/seller/sales", sellerToken)
ok("sales_loads", sales.status === 200, `status=${sales.status}`)
const salesRows = sales.body?.sales ?? []
const targetSales = salesRows.filter((s) => TARGET_ORDERS.includes(s.order_number))
ok("sales_4_orders_visible", targetSales.length === 4, `found=${targetSales.length}`)
for (const orderNo of TARGET_ORDERS) {
  const row = targetSales.find((x) => x.order_number === orderNo)
  ok(`sales_${orderNo}_exists`, !!row, row ? `sales=${row.sales_value}` : "missing")
  if (row) {
    ok(
      `sales_${orderNo}_commission_not_empty`,
      row.commission_amount !== null && row.commission_amount !== undefined,
      `commission_amount=${row.commission_amount}`
    )
  }
}

const csv = await apiRaw("/store/finance/seller/sales?format=csv", {
  headers: { authorization: `Bearer ${sellerToken}` },
})
ok("csv_download_200", csv.status === 200, `status=${csv.status}`)
const csvText = await csv.text()
ok(
  "csv_no_publishable_key_error",
  !csvText.toLowerCase().includes("publishable api key"),
  csvText.substring(0, 100)
)
ok(
  "csv_contains_target_orders",
  TARGET_ORDERS.some((o) => csvText.includes(o)),
  `matched_orders=${TARGET_ORDERS.filter((o) => csvText.includes(o)).length}`
)

const invList = await authApi("/store/finance/seller/invoices", sellerToken)
ok("invoice_list_loads", invList.status === 200, `status=${invList.status}`)
const invoices = invList.body?.invoices ?? []
ok("invoice_list_has_rows", invoices.length > 0, `count=${invoices.length}`)
if (invoices[0]) {
  ok("invoice_has_number", !!invoices[0].invoice_number, `invoice_number=${invoices[0].invoice_number}`)
  ok("invoice_has_period", !!invoices[0].period || !!invoices[0].period_label, `period=${invoices[0].period ?? invoices[0].period_label}`)
  ok(
    "invoice_has_amounts",
    invoices[0].subtotal !== undefined || invoices[0].total !== undefined || invoices[0].total_amount !== undefined,
    `subtotal=${invoices[0].subtotal} total=${invoices[0].total ?? invoices[0].total_amount}`
  )
  const invDetail = await authApi(`/store/finance/seller/invoices/${invoices[0].id}`, sellerToken)
  ok("invoice_detail_loads", invDetail.status === 200, `status=${invDetail.status}`)
}

const payoutRows = ov.body?.payouts ?? []
ok("payouts_loads", Array.isArray(payoutRows), `count=${payoutRows.length}`)
const targetPayouts = payoutRows.filter((p) => TARGET_ORDERS.includes(p.order_number))
ok("payouts_4_orders_visible", targetPayouts.length === 4, `found=${targetPayouts.length}`)
for (const orderNo of TARGET_ORDERS) {
  const p = targetPayouts.find((x) => x.order_number === orderNo)
  ok(`payout_${orderNo}_exists`, !!p, p ? `amount=${p.amount} status=${p.status}` : "missing")
  if (p) {
    ok(`payout_${orderNo}_status_gepland`, String(p.status || "").toLowerCase() === "gepland", `status=${p.status}`)
    ok(
      `payout_${orderNo}_amount`,
      approx(Number(p.amount), EXPECTED_PAYOUT[orderNo]),
      `amount=${p.amount} expected=${EXPECTED_PAYOUT[orderNo]}`
    )
  }
}

const vatRows = ov.body?.vat_by_country ?? []
ok("vat_page_loads", Array.isArray(vatRows), `count=${vatRows.length}`)
ok("vat_no_runtime_error_shape", Array.isArray(vatRows), `array=${Array.isArray(vatRows)}`)

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
  console.log(`P2.17.1 E2E: ${passed}/${total} passed`)
  const failed = results.filter((r) => !r.pass)
  if (failed.length > 0) {
    console.log("FAILED:")
    for (const f of failed) console.log(`  - ${f.name}: ${f.detail}`)
  }
  console.log("══════════════════════════════════════════════════════")
}
printSummary()
