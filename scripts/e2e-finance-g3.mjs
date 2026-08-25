/**
 * G3 — seller settlement + dienstenfactuur E2E (geen payout, geen fiscale PDF).
 */
import { readFileSync, existsSync } from "fs"

const BACKEND = process.env.MEDUSA_BACKEND_URL || "http://127.0.0.1:9000"
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin-e2e@example.com"
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "REDACTED_ADMIN_PASSWORD"

function readPublishableKey() {
  if (process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY) {
    return process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY.trim()
  }
  const envPath = "apps/web/.env.local"
  if (!existsSync(envPath)) return null
  const match = readFileSync(envPath, "utf8").match(
    /NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=(.*)/
  )
  return match ? match[1].trim() : null
}

const pubKey = readPublishableKey()

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

function inUtcMonth(iso, year, month) {
  const d = new Date(iso)
  return d.getUTCFullYear() === year && d.getUTCMonth() + 1 === month
}

ok(
  "source_settlement_model",
  existsSync("apps/backend/src/modules/finance/models/seller-settlement.ts")
)
ok(
  "source_admin_settlements_page",
  existsSync("apps/admin/app/(shell)/finance/settlements/page.tsx")
)
ok(
  "source_seller_settlements_page",
  existsSync("apps/web/app/seller/finance/settlements/page.tsx")
)

const health = await api("/health")
ok("health", health.status === 200, `status=${health.status}`)

const overviewUnauth = await api("/admin/finance/overview")
ok("admin_finance_unauth", overviewUnauth.status === 401)

const sellerSettlementsNoPk = await api("/store/finance/seller/settlements")
ok(
  "store_requires_publishable_key",
  sellerSettlementsNoPk.status === 400,
  `status=${sellerSettlementsNoPk.status}`
)

if (pubKey) {
  const sellerSettlementsNoAuth = await api(
    "/store/finance/seller/settlements",
    { headers: { "x-publishable-api-key": pubKey } }
  )
  ok(
    "seller_settlements_unauth",
    sellerSettlementsNoAuth.status === 401,
    `status=${sellerSettlementsNoAuth.status}`
  )
} else {
  ok("seller_settlements_unauth", false, "missing publishable key")
}

let adminToken = null
const login = await api("/auth/user/emailpass", {
  method: "POST",
  body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
})
adminToken = login.body?.token ?? null
ok("admin_login", Boolean(adminToken), `status=${login.status}`)

if (!adminToken) {
  console.log("SKIP remaining live API tests (no admin token)")
} else {
  const overview = await authApi("/admin/finance/overview?period=all_time", adminToken)
  ok("admin_finance_overview", overview.status === 200)

  const payouts = await authApi("/admin/finance/payouts?period=all_time", adminToken)
  ok("admin_finance_payouts", payouts.status === 200)

  const affiliates = await authApi(
    "/admin/finance/affiliates?period=all_time",
    adminToken
  )
  ok("admin_affiliates_unchanged", affiliates.status === 200)

  const sellersRes = await authApi("/admin/finance/sellers?period=all_time", adminToken)
  ok("admin_sellers", sellersRes.status === 200)

  const listBefore = await authApi("/admin/finance/settlements", adminToken)
  const existing = listBefore.body?.settlements ?? []
  const now = new Date()
  const year = now.getUTCFullYear()
  const month = now.getUTCMonth() + 1

  const incompleteSellerIds = new Set(
    existing
      .filter(
        (s) =>
          s.status === "closed" &&
          !s.invoice_id &&
          inUtcMonth(s.period_start, year, month)
      )
      .map((s) => s.seller_id)
  )
  const completeThisPeriod = existing.find(
    (s) =>
      s.invoice_id &&
      s.status === "closed" &&
      inUtcMonth(s.period_start, year, month)
  )
  const sellerRows = sellersRes.body?.sellers ?? []
  const sellerId =
    process.env.G3_SELLER_ID ||
    completeThisPeriod?.seller_id ||
    sellerRows.find((s) => !incompleteSellerIds.has(s.seller_id))?.seller_id ||
    null

  ok(
    "usable_test_seller",
    Boolean(sellerId),
    sellerId
      ? `seller=${sellerId}`
      : "no seller without incomplete closed settlement"
  )

  const closeBody = sellerId ? { seller_id: sellerId, year, month } : { year, month }

  const close1 = await authApi("/admin/finance/invoicing", adminToken, {
    method: "POST",
    body: JSON.stringify(closeBody),
  })
  const settlementId =
    close1.body?.settlement_id ?? close1.body?.result?.settlement_id ?? null
  const invoiceId =
    close1.body?.invoice_id ?? close1.body?.result?.invoice_id ?? null
  ok(
    "period_close",
    close1.status === 200 && Boolean(settlementId),
    `status=${close1.status} ${JSON.stringify(close1.body)?.slice(0, 180)}`
  )

  const close2 = await authApi("/admin/finance/invoicing", adminToken, {
    method: "POST",
    body: JSON.stringify(closeBody),
  })
  const id2 = close2.body?.settlement_id ?? close2.body?.result?.settlement_id
  const invoiceId2 = close2.body?.invoice_id ?? close2.body?.result?.invoice_id
  ok(
    "period_close_idempotent",
    close2.status === 200 &&
      Boolean(settlementId) &&
      settlementId === id2 &&
      invoiceId === invoiceId2,
    `id1=${settlementId} id2=${id2} inv1=${invoiceId} inv2=${invoiceId2}`
  )

  const list = await authApi("/admin/finance/settlements", adminToken)
  ok("admin_list_settlements", list.status === 200)

  if (settlementId) {
    const detail = await authApi(
      `/admin/finance/settlements/${settlementId}`,
      adminToken
    )
    const settlement = detail.body?.settlement
    const invoice = detail.body?.invoice
    const lines = detail.body?.lines ?? []
    ok("admin_settlement_detail", detail.status === 200)
    ok(
      "invoice_created",
      Boolean(invoiceId) && Boolean(invoice?.id),
      `invoice_id=${invoiceId}`
    )
    ok(
      "invoice_linked",
      settlement?.invoice_id === invoiceId && invoice?.id === invoiceId,
      `settlement.invoice_id=${settlement?.invoice_id}`
    )
    ok(
      "invoice_settlement_match",
      invoice?.settlement_id === settlementId,
      `invoice.settlement_id=${invoice?.settlement_id}`
    )
    ok(
      "settlement_seller_match",
      settlement?.seller_id === sellerId,
      `settlement.seller_id=${settlement?.seller_id}`
    )
    ok(
      "invoice_lines_present",
      Array.isArray(lines) && lines.length > 0,
      `lines=${lines.length}`
    )
    ok(
      "invoice_totals_match",
      typeof settlement?.net_settlement === "number" &&
        typeof invoice?.total === "number" &&
        Number(settlement.invoice_total) === Number(invoice.total),
      `invoice_total=${settlement?.invoice_total} invoice.total=${invoice?.total}`
    )
  } else {
    ok("admin_settlement_detail", false, "no settlement_id from close")
    ok("invoice_created", false, "no close")
    ok("invoice_linked", false, "no close")
    ok("invoice_settlement_match", false, "no close")
    ok("settlement_seller_match", false, "no close")
    ok("invoice_lines_present", false, "no close")
    ok("invoice_totals_match", false, "no close")
  }

  if (pubKey) {
    const adminAsCustomer = await api(
      `/store/finance/seller/settlements/${settlementId || "sset_x"}`,
      {
        headers: {
          "x-publishable-api-key": pubKey,
          authorization: `Bearer ${adminToken}`,
        },
      }
    )
    ok(
      "seller_api_rejects_admin_as_customer",
      adminAsCustomer.status === 401 || adminAsCustomer.status === 403,
      `status=${adminAsCustomer.status}`
    )
  } else {
    ok("seller_api_rejects_admin_as_customer", false, "missing publishable key")
  }
}

const unitFile = readFileSync(
  "apps/backend/src/modules/finance/__tests__/seller-period-close.unit.spec.ts",
  "utf8"
)
ok("unit_spec_present", unitFile.includes("computeNetSettlement"))

const failed = results.filter((r) => !r.pass)
console.log(`\n${results.length - failed.length}/${results.length} passed`)
process.exit(failed.length ? 1 : 0)
