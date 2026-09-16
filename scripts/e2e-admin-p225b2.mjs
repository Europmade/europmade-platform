/**
 * P2.25-B2 — Seller Advertising edit & resubmit E2E
 */
import { existsSync, readFileSync } from "fs"

const BACKEND = process.env.MEDUSA_BACKEND_URL || "http://127.0.0.1:9000"
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin-e2e@example.com"
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "REDACTED_ADMIN_PASSWORD"
const PK =
  process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ||
  readFileSync("apps/web/.env.local", "utf8").match(
    /NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=(.*)/
  )?.[1]?.trim() ||
  ""
const SELLER_EMAIL =
  process.env.SELLER_EMAIL || "seller-flow-20260804144242@example.com"
const SELLER_PASS =
  process.env.SELLER_PASSWORD || process.env.SELLER_PASS || "REDACTED_SELLER_PASSWORD"

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

function nextMondayIso(weeksAhead = 16) {
  const d = new Date()
  d.setUTCHours(0, 0, 0, 0)
  const day = d.getUTCDay()
  const diff = day === 0 ? 1 : 8 - day
  d.setUTCDate(d.getUTCDate() + diff + weeksAhead * 7)
  return d.toISOString()
}

// Source
ok(
  "store_campaign_id_route",
  existsSync("apps/backend/src/api/store/advertising/campaigns/[id]/route.ts")
)
ok(
  "campaign_input_shared",
  existsSync("apps/backend/src/api/store/advertising/campaign-input.ts")
)
const banners = readFileSync(
  "apps/web/app/seller/marketing/banners/page.tsx",
  "utf8"
)
ok("seller_shows_admin_note", banners.includes("admin_note"))
ok("seller_edit_resubmit_ui", banners.includes("adEditResubmit") || banners.includes("startEdit"))
ok("seller_patch_resubmit", banners.includes("method: \"PATCH\""))

const mw = readFileSync("apps/backend/src/api/middlewares.ts", "utf8")
ok(
  "middleware_campaign_id",
  mw.includes('/store/advertising/campaigns/:id')
)

// Auth
const sellerLogin = await api("/auth/customer/emailpass", {
  method: "POST",
  headers: { "x-publishable-api-key": PK },
  body: JSON.stringify({ email: SELLER_EMAIL, password: SELLER_PASS }),
})
const sellerToken = sellerLogin.body?.token
ok("seller_auth", !!sellerToken, `status=${sellerLogin.status}`)

const adminLogin = await api("/auth/user/emailpass", {
  method: "POST",
  body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
})
const adminToken = adminLogin.body?.token
ok("admin_auth", !!adminToken)

if (!sellerToken || !adminToken) {
  printSummary()
  process.exit(1)
}

const sh = {
  authorization: `Bearer ${sellerToken}`,
  "x-publishable-api-key": PK,
}
const ah = { authorization: `Bearer ${adminToken}` }

const productsRes = await api("/store/product-cloud/products", { headers: sh })
const products = productsRes.body?.products || []
ok("seller_has_products", products.length >= 1, `count=${products.length}`)
const productIds = products.slice(0, Math.min(2, products.length)).map((p) => p.id)

const keyword = `e2e-p225b2-${Date.now()}`
const weekA = nextMondayIso(18)
const weekB = nextMondayIso(19)

const create = await api("/store/advertising/campaigns", {
  method: "POST",
  headers: sh,
  body: JSON.stringify({
    name: "P2.25-B2 Edit Flow",
    placement: "search",
    target_value: keyword,
    markets: ["NL"],
    week_starts: [weekA],
    headline: "Original Headline",
    subline: "Original Subline",
    cta_key: "view_product",
    design_key: "design_1",
    product_ids: productIds,
  }),
})
ok("create_campaign", create.status === 201, `status=${create.status} ${create.body?.message}`)
const campaignId = create.body?.campaign?.id
ok(
  "create_auto_destination",
  typeof create.body?.campaign?.destination_url === "string" &&
    create.body.campaign.destination_url.startsWith("/seller/"),
  create.body?.campaign?.destination_url
)

const reject = await api(`/admin/advertising/campaigns/${campaignId}`, {
  method: "PATCH",
  headers: ah,
  body: JSON.stringify({
    status: "rejected",
    admin_note: "P2.25-B2 please fix headline",
  }),
})
ok(
  "admin_reject_with_note",
  reject.status === 200 && reject.body?.campaign?.status === "rejected",
  `status=${reject.status}`
)

const list = await api("/store/advertising/campaigns", { headers: sh })
const row = (list.body?.campaigns || []).find((c) => c.id === campaignId)
ok("seller_sees_rejected", row?.status === "rejected", row?.status)
ok(
  "seller_sees_admin_note",
  row?.admin_note === "P2.25-B2 please fix headline",
  row?.admin_note
)

const detail = await api(`/store/advertising/campaigns/${campaignId}`, {
  headers: sh,
})
ok("seller_get_detail", detail.status === 200, `status=${detail.status}`)
ok(
  "detail_loads_fields",
  detail.body?.campaign?.headline === "Original Headline" &&
    typeof detail.body?.campaign?.destination_url === "string" &&
    detail.body.campaign.destination_url.startsWith("/seller/"),
  detail.body?.campaign?.headline
)

const resubmit = await api(`/store/advertising/campaigns/${campaignId}`, {
  method: "PATCH",
  headers: sh,
  body: JSON.stringify({
    name: "P2.25-B2 Resubmitted",
    placement: "search",
    target_value: keyword + "-v2",
    markets: ["NL"],
    week_starts: [weekB],
    headline: "Updated Headline",
    subline: "Updated Subline",
    cta_key: "more_info",
    design_key: "design_2",
    product_ids: productIds,
  }),
})
ok(
  "seller_resubmit",
  resubmit.status === 200 &&
    resubmit.body?.campaign?.status === "pending_review",
  `status=${resubmit.status} camp=${resubmit.body?.campaign?.status} msg=${resubmit.body?.message}`
)
ok(
  "resubmit_fields_updated",
  resubmit.body?.campaign?.headline === "Updated Headline" &&
    resubmit.body?.campaign?.design_key === "design_2" &&
    resubmit.body?.campaign?.name === "P2.25-B2 Resubmitted",
  resubmit.body?.campaign?.headline
)
ok(
  "admin_note_cleared",
  resubmit.body?.campaign?.admin_note == null ||
    resubmit.body?.campaign?.admin_note === "",
  String(resubmit.body?.campaign?.admin_note)
)
ok(
  "weeks_rebooked",
  Array.isArray(resubmit.body?.campaign?.weeks) &&
    resubmit.body.campaign.weeks.length === 1,
  `weeks=${resubmit.body?.campaign?.weeks?.length}`
)

const patchWhilePending = await api(
  `/store/advertising/campaigns/${campaignId}`,
  {
    method: "PATCH",
    headers: sh,
    body: JSON.stringify({
      name: "Illegal edit",
      placement: "search",
      target_value: keyword + "-v3",
      markets: ["NL"],
      week_starts: [weekB],
      product_ids: productIds,
    }),
  }
)
ok(
  "patch_only_when_rejected",
  patchWhilePending.status === 400,
  `status=${patchWhilePending.status}`
)

const adminDetail = await api(`/admin/advertising/campaigns/${campaignId}`, {
  headers: ah,
})
ok(
  "admin_sees_pending",
  adminDetail.status === 200 &&
    adminDetail.body?.campaign?.status === "pending_review",
  adminDetail.body?.campaign?.status
)
ok(
  "admin_sees_updated_headline",
  adminDetail.body?.campaign?.headline === "Updated Headline",
  adminDetail.body?.campaign?.headline
)

const approve = await api(`/admin/advertising/campaigns/${campaignId}`, {
  method: "PATCH",
  headers: ah,
  body: JSON.stringify({ status: "approved" }),
})
ok(
  "admin_can_reapprove",
  approve.status === 200 && approve.body?.campaign?.status === "approved",
  `status=${approve.status}`
)

const cancel = await api(`/admin/advertising/campaigns/${campaignId}`, {
  method: "PATCH",
  headers: ah,
  body: JSON.stringify({ status: "cancelled" }),
})
ok(
  "admin_can_cancel",
  cancel.status === 200 && cancel.body?.campaign?.status === "cancelled",
  `status=${cancel.status}`
)

try {
  const health = await fetch(`${BACKEND}/health`)
  ok("health", health.status === 200, `status=${health.status}`)
} catch (e) {
  ok("health", false, e.message)
}

function printSummary() {
  console.log("\n══════════════════════════════════════════════════════")
  const passed = results.filter((r) => r.pass).length
  console.log(`P2.25-B2 Seller Edit/Resubmit E2E: ${passed}/${results.length} passed`)
  const failed = results.filter((r) => !r.pass)
  if (failed.length) {
    console.log("FAILED:")
    for (const f of failed) console.log(`  - ${f.name}: ${f.detail}`)
  }
  console.log("══════════════════════════════════════════════════════")
}

printSummary()
process.exit(results.every((r) => r.pass) ? 0 : 1)
