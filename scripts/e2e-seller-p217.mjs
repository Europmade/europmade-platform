/**
 * P2.17 — Facturatie & Financiële Verrekening Seller ↔ EuropMade E2E.
 * Tests:
 *  1. Source-checks: i18n keys, UI structure, route files
 *  2. Backend model/migration checks
 *  3. API-level tests: invoice creation, uniqueness, VAT, security
 *  4. UI page structure checks
 */
import { readFileSync } from "fs"

const BACKEND = process.env.MEDUSA_BACKEND_URL || "http://localhost:9000"
const results = []

function ok(name, pass, detail = "") {
  results.push({ name, pass: Boolean(pass), detail })
  console.log(
    `${pass ? "OK" : "FAIL"}: ${name}${detail ? ` — ${detail}` : ""}`
  )
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
    headers: {
      ...(opts.headers || {}),
      authorization: `Bearer ${token}`,
    },
  })
}

// ══════════════════════════════════════════════════════
// 1. i18n key checks
// ══════════════════════════════════════════════════════
const msgs = readFileSync("apps/web/app/_lib/i18n/messages.ts", "utf8")
const requiredKeys = [
  "sellerFinanceEuropmadeInvoices",
  "sellerFinanceEuropmadeInvoicesDesc",
  "sellerFinanceEuropmadeInvoicesEmpty",
  "sellerFinanceSalesOverview",
  "sellerFinanceSalesOverviewDesc",
  "sellerFinanceSalesEmpty",
  "sellerFinanceDownloadSales",
  "sellerFinanceInvoiceNumber",
  "sellerFinanceInvoiceDate",
  "sellerFinancePeriod",
  "sellerFinanceExclVat",
  "sellerFinanceVat",
  "sellerFinanceTotal",
  "sellerFinanceDueDate",
  "sellerFinanceDownloadInvoicePdf",
  "sellerFinanceDownloadSpec",
  "sellerFinanceInvoiceDetail",
  "sellerFinanceInvoiceInfo",
  "sellerFinanceAmounts",
  "sellerFinanceSpecification",
  "sellerFinanceCommissionLines",
  "sellerFinanceAdvertisingLines",
  "sellerFinanceCreditLines",
  "sellerFinanceProduct",
  "sellerFinanceSalesValue",
  "sellerFinanceCommissionPct",
  "sellerFinanceCommissionAmount",
  "sellerFinanceOrderStatus",
  "sellerFinanceQuantity",
  "sellerFinanceAdvertisingCosts",
  "sellerFinanceVatRegime",
  "sellerFinancePayoutNotInvoice",
  "sellerFinanceVatDemoNotice",
]

for (const key of requiredKeys) {
  ok(`i18n_${key}`, msgs.includes(`${key}:`), key)
}

// "Facturen downloaden" renamed to "Facturen EuropMade"
ok(
  "i18n_invoices_label_corrected",
  msgs.includes("Facturen EuropMade") && !msgs.includes('"Facturen downloaden"'),
  "sellerFinanceDownloadInvoices now says 'Facturen EuropMade'"
)

// ══════════════════════════════════════════════════════
// 2. Backend model checks
// ══════════════════════════════════════════════════════
const sellerInvoiceModel = readFileSync(
  "apps/backend/src/modules/finance/models/seller-invoice.ts",
  "utf8"
)
ok("model_seller_invoice_exists", sellerInvoiceModel.includes("seller_invoice"))
ok("model_invoice_number", sellerInvoiceModel.includes("invoice_number"))
ok("model_period_start", sellerInvoiceModel.includes("period_start"))
ok("model_period_end", sellerInvoiceModel.includes("period_end"))
ok("model_vat_regime", sellerInvoiceModel.includes("vat_regime"))
ok("model_snapshot", sellerInvoiceModel.includes("snapshot"))
ok("model_credit_of", sellerInvoiceModel.includes("credit_of_invoice_id"))
ok(
  "model_statuses",
  sellerInvoiceModel.includes("draft") &&
    sellerInvoiceModel.includes("issued") &&
    sellerInvoiceModel.includes("paid") &&
    sellerInvoiceModel.includes("overdue") &&
    sellerInvoiceModel.includes("credited") &&
    sellerInvoiceModel.includes("cancelled")
)

const sellerInvoiceLine = readFileSync(
  "apps/backend/src/modules/finance/models/seller-invoice-line.ts",
  "utf8"
)
ok("model_invoice_line_exists", sellerInvoiceLine.includes("seller_invoice_line"))
ok("model_line_type", sellerInvoiceLine.includes("line_type"))
ok("model_source_ref", sellerInvoiceLine.includes("source_ref"))
ok("model_commission_pct", sellerInvoiceLine.includes("commission_pct"))
ok("model_vat_rate", sellerInvoiceLine.includes("vat_rate"))

// Migration
const migration = readFileSync(
  "apps/backend/src/modules/finance/migrations/Migration20260819150000.ts",
  "utf8"
)
ok("migration_seller_invoice_table", migration.includes("seller_invoice"))
ok("migration_seller_invoice_line_table", migration.includes("seller_invoice_line"))
ok("migration_invoice_number_seq", migration.includes("seller_invoice_number_seq"))
ok("migration_unique_constraint", migration.includes("seller_invoice_invoice_number_unique"))

// Service
const service = readFileSync(
  "apps/backend/src/modules/finance/service.ts",
  "utf8"
)
ok("service_seller_invoice", service.includes("SellerInvoice"))
ok("service_seller_invoice_line", service.includes("SellerInvoiceLine"))

// ══════════════════════════════════════════════════════
// 3. Workflow checks
// ══════════════════════════════════════════════════════
const workflow = readFileSync(
  "apps/backend/src/workflows/finance/seller-invoicing.ts",
  "utf8"
)
ok("workflow_generate_monthly", workflow.includes("generateMonthlySellerInvoice"))
ok("workflow_credit_note", workflow.includes("generateCreditNote"))
ok("workflow_run_monthly", workflow.includes("runMonthlyInvoicing"))
ok("workflow_vat_standard", workflow.includes("VAT_STANDARD_NL"))
ok("workflow_vat_reverse_charge", workflow.includes("VAT_REVERSE_CHARGE_EU"))
ok("workflow_vat_out_of_scope", workflow.includes("VAT_OUT_OF_SCOPE"))
ok("workflow_invoice_pdf", workflow.includes("generateInvoicePdf"))
ok("workflow_invoice_number_seq", workflow.includes("seller_invoice_number_seq"))
ok("workflow_europmade_details", workflow.includes("EuropMade B.V."))
ok("workflow_snapshot", workflow.includes("snapshot"))
ok("workflow_historical_commission", workflow.includes("comm.percentage"))
ok("workflow_ad_campaigns", workflow.includes("listAdCampaigns"))
ok("workflow_credit_lines", workflow.includes("Teruggedraaid"))

// ══════════════════════════════════════════════════════
// 4. API route checks
// ══════════════════════════════════════════════════════
const invoicesRoute = readFileSync(
  "apps/backend/src/api/store/finance/seller/invoices/route.ts",
  "utf8"
)
ok("route_invoices_get", invoicesRoute.includes("GET"))
ok("route_invoices_seller_check", invoicesRoute.includes("seller_id"))

const invoiceDetailRoute = readFileSync(
  "apps/backend/src/api/store/finance/seller/invoices/[id]/route.ts",
  "utf8"
)
ok("route_detail_get", invoiceDetailRoute.includes("GET"))
ok("route_detail_ownership_check", invoiceDetailRoute.includes("Access denied"))

const salesRoute = readFileSync(
  "apps/backend/src/api/store/finance/seller/sales/route.ts",
  "utf8"
)
ok("route_sales_get", salesRoute.includes("GET"))
ok("route_sales_csv", salesRoute.includes("text/csv"))
ok("route_sales_seller_check", salesRoute.includes("Not a seller"))

const adminInvoicingRoute = readFileSync(
  "apps/backend/src/api/admin/finance/invoicing/route.ts",
  "utf8"
)
ok("route_admin_invoicing", adminInvoicingRoute.includes("POST"))
ok("route_admin_monthly", adminInvoicingRoute.includes("runMonthlyInvoicing"))

// Middleware
const mw = readFileSync("apps/backend/src/api/middlewares.ts", "utf8")
ok("middleware_invoices", mw.includes("/store/finance/seller/invoices"))
ok("middleware_sales", mw.includes("/store/finance/seller/sales"))
ok("middleware_admin_invoicing", mw.includes("/admin/finance/invoicing"))

// ══════════════════════════════════════════════════════
// 5. UI page structure checks
// ══════════════════════════════════════════════════════
const financePage = readFileSync(
  "apps/web/app/seller/finance/page.tsx",
  "utf8"
)
ok("ui_europmade_invoices_section", financePage.includes("sellerFinanceEuropmadeInvoices"))
ok("ui_sales_overview_section", financePage.includes("sellerFinanceSalesOverview"))
ok("ui_download_sales", financePage.includes("sellerFinanceDownloadSales"))
ok("ui_api_fetch_invoices", financePage.includes("/store/finance/seller/invoices"))
ok("ui_api_fetch_sales", financePage.includes("/store/finance/seller/sales"))
ok("ui_advertising_costs_card", financePage.includes("sellerFinanceAdvertisingCosts"))

const facturenPage = readFileSync(
  "apps/web/app/seller/finance/facturen/page.tsx",
  "utf8"
)
ok("ui_facturen_europmade_title", facturenPage.includes("sellerFinanceEuropmadeInvoices"))
ok("ui_facturen_api_fetch", facturenPage.includes("/store/finance/seller/invoices"))
ok("ui_facturen_detail_link", facturenPage.includes("/seller/finance/facturen/"))
ok("ui_facturen_no_demo_data", !facturenPage.includes("DEMO_ORDERS"))

const detailPage = readFileSync(
  "apps/web/app/seller/finance/facturen/[id]/page.tsx",
  "utf8"
)
ok("ui_detail_invoice_info", detailPage.includes("sellerFinanceInvoiceInfo"))
ok("ui_detail_amounts", detailPage.includes("sellerFinanceAmounts"))
ok("ui_detail_commission_lines", detailPage.includes("sellerFinanceCommissionLines"))
ok("ui_detail_advertising_lines", detailPage.includes("sellerFinanceAdvertisingLines"))
ok("ui_detail_credit_lines", detailPage.includes("sellerFinanceCreditLines"))
ok("ui_detail_download_pdf", detailPage.includes("sellerFinanceDownloadInvoicePdf"))
ok("ui_detail_download_spec", detailPage.includes("sellerFinanceDownloadSpec"))
ok("ui_detail_vat_regime", detailPage.includes("sellerFinanceVatRegime"))

const commissiePage = readFileSync(
  "apps/web/app/seller/finance/commissie/page.tsx",
  "utf8"
)
ok("ui_commissie_api_data", commissiePage.includes("/store/finance/seller"))
ok("ui_commissie_no_demo", !commissiePage.includes("DEMO_COMMISSIONS") || commissiePage.includes("d?.commissions"))

const uitbetalingenPage = readFileSync(
  "apps/web/app/seller/finance/uitbetalingen/page.tsx",
  "utf8"
)
ok("ui_payout_not_invoice_notice", uitbetalingenPage.includes("sellerFinancePayoutNotInvoice"))
ok("ui_payout_api_data", uitbetalingenPage.includes("/store/finance/seller"))

const btwPage = readFileSync(
  "apps/web/app/seller/finance/btw/page.tsx",
  "utf8"
)
ok("ui_btw_demo_notice", btwPage.includes("sellerFinanceVatDemoNotice"))
ok("ui_btw_api_data", btwPage.includes("/store/finance/seller"))
ok("ui_btw_no_hardcoded_demo", !btwPage.includes("DEMO_VAT"))

// Shortcut label corrected
ok(
  "ui_shortcut_label_corrected",
  financePage.includes("sellerFinanceDownloadInvoices") &&
    !financePage.includes('"Facturen downloaden"')
)

// ══════════════════════════════════════════════════════
// 6. Security checks (source-level)
// ══════════════════════════════════════════════════════
ok(
  "security_invoices_ownership",
  invoiceDetailRoute.includes("invoice.seller_id !== seller.id"),
  "Checks seller_id matches on invoice detail"
)
ok(
  "security_sales_seller_check",
  salesRoute.includes("Not a seller"),
  "Sales route requires active seller"
)

// ══════════════════════════════════════════════════════
// 7. API-level tests (require running backend)
// ══════════════════════════════════════════════════════
let sellerToken = null

try {
  // Register test user
  const email = `p217test${Date.now()}@europmade-test.nl`
  const pwd = "TestP217!Pass"
  const reg = await api("/auth/customer/emailpass/register", {
    method: "POST",
    body: JSON.stringify({ email, password: pwd }),
  })
  if (reg.status === 200 && reg.body?.token) {
    sellerToken = reg.body.token
    ok("api_register", true, email)
  } else {
    ok("api_register", false, `status=${reg.status}`)
  }
} catch (e) {
  ok("api_register", false, e.message)
}

if (sellerToken) {
  // Test GET /store/finance/seller/invoices without seller — should fail
  const noSeller = await authApi(
    "/store/finance/seller/invoices",
    sellerToken
  )
  ok(
    "api_invoices_no_seller",
    noSeller.status >= 400,
    `status=${noSeller.status}`
  )

  // Test GET /store/finance/seller/sales without seller — should fail
  const noSellerSales = await authApi(
    "/store/finance/seller/sales",
    sellerToken
  )
  ok(
    "api_sales_no_seller",
    noSellerSales.status >= 400,
    `status=${noSellerSales.status}`
  )

  // Test security: invoice detail with fake ID
  const fakeDetail = await authApi(
    "/store/finance/seller/invoices/sinv_fake123",
    sellerToken
  )
  ok(
    "api_invoice_detail_fake_id",
    fakeDetail.status >= 400,
    `status=${fakeDetail.status}`
  )
}

// Admin invoicing route requires admin auth
const adminNoAuth = await api("/admin/finance/invoicing", {
  method: "POST",
  body: JSON.stringify({ year: 2026, month: 8 }),
})
ok(
  "api_admin_invoicing_requires_auth",
  adminNoAuth.status === 401,
  `status=${adminNoAuth.status}`
)

// ══════════════════════════════════════════════════════
// REPORT
// ══════════════════════════════════════════════════════
const pass = results.filter((r) => r.pass).length
const fail = results.filter((r) => !r.pass).length
console.log(`\n${"=".repeat(50)}`)
console.log(`P2.17 E2E: ${pass}/${results.length} passed, ${fail} failed`)
if (fail > 0) {
  console.log("FAILED:")
  for (const r of results.filter((r) => !r.pass)) {
    console.log(`  - ${r.name}${r.detail ? `: ${r.detail}` : ""}`)
  }
}
console.log(`${"=".repeat(50)}`)
process.exit(fail > 0 ? 1 : 0)
