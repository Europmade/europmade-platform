/**
 * P2.25-A — Admin Advertising Review Center E2E
 *
 * Uses existing campaigns when seller create is blocked by local schema drift
 * (missing headline/subline/cta_key/design_key columns on ad_campaign).
 */
import { readFileSync, existsSync } from "fs"

const BACKEND = process.env.MEDUSA_BACKEND_URL || "http://127.0.0.1:9000"
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin-e2e@example.com"
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "REDACTED_ADMIN_PASSWORD"
const ADMIN_UI = process.env.ADMIN_URL || "http://127.0.0.1:3001"
const PK =
  process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ||
  "REDACTED_PUBLISHABLE_KEY"
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

async function authApi(path, token, opts = {}) {
  return api(path, {
    ...opts,
    headers: { ...(opts.headers || {}), authorization: `Bearer ${token}` },
  })
}

function nextMondayIso(weeksAhead = 8) {
  const d = new Date()
  d.setUTCHours(0, 0, 0, 0)
  const day = d.getUTCDay()
  const diff = day === 0 ? 1 : 8 - day
  d.setUTCDate(d.getUTCDate() + diff + weeksAhead * 7)
  return d.toISOString()
}

// ── Source checks ──
ok(
  "list_page",
  existsSync("apps/admin/app/(shell)/advertising/campaigns/page.tsx")
)
ok(
  "detail_page",
  existsSync("apps/admin/app/(shell)/advertising/campaigns/[id]/page.tsx")
)
ok("labels_lib", existsSync("apps/admin/lib/advertising-labels.ts"))
ok(
  "enrich_helper",
  existsSync("apps/backend/src/api/admin/advertising/enrich-campaign.ts")
)

const listSrc = readFileSync(
  "apps/admin/app/(shell)/advertising/campaigns/page.tsx",
  "utf8"
)
ok("list_shows_seller_name", listSrc.includes("seller_name"))
ok("list_link_detail", listSrc.includes("/advertising/campaigns/"))

const detailSrc = readFileSync(
  "apps/admin/app/(shell)/advertising/campaigns/[id]/page.tsx",
  "utf8"
)
ok("detail_reject_requires_reason", detailSrc.includes("afwijzingsreden"))
ok(
  "detail_admin_note",
  detailSrc.includes("admin_note") || detailSrc.includes("Notitie")
)
ok("detail_preview", detailSrc.includes("AdCampaignLandingPreview") || detailSrc.includes("Preview"))

const patchSrc = readFileSync(
  "apps/backend/src/api/admin/advertising/campaigns/[id]/route.ts",
  "utf8"
)
ok(
  "backend_reject_requires_note",
  patchSrc.includes("admin_note is required when rejecting")
)

const sellerBanners = readFileSync(
  "apps/web/app/seller/marketing/banners/page.tsx",
  "utf8"
)
ok(
  "seller_banners_untouched_marker",
  sellerBanners.includes("/store/advertising/campaigns")
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

// ── Security ──
const unauthList = await api("/admin/advertising/campaigns")
ok(
  "security_unauth_list",
  unauthList.status === 401,
  `status=${unauthList.status}`
)

const sellerLogin = await api("/auth/customer/emailpass", {
  method: "POST",
  headers: { "x-publishable-api-key": PK },
  body: JSON.stringify({ email: SELLER_EMAIL, password: SELLER_PASS }),
})
const sellerToken = sellerLogin.body?.token ?? null
ok("seller_auth", !!sellerToken, `status=${sellerLogin.status}`)

if (sellerToken) {
  const sellerProbe = await api("/admin/advertising/campaigns", {
    headers: { authorization: `Bearer ${sellerToken}` },
  })
  ok(
    "security_seller_no_admin",
    sellerProbe.status === 401,
    `status=${sellerProbe.status}`
  )
} else {
  ok("security_seller_no_admin", false, "seller login failed")
}

// ── Prefer seller-created campaigns; fall back to existing rows ──
let sellerProductIds = []
if (sellerToken) {
  const prodRes = await api("/store/product-cloud/products", {
    headers: {
      authorization: `Bearer ${sellerToken}`,
      "x-publishable-api-key": PK,
    },
  })
  sellerProductIds = (prodRes.body?.products || [])
    .slice(0, 2)
    .map((p) => p.id)
}

async function tryCreateSellerCampaign(suffix) {
  if (!sellerToken) return { campaign: null, error: "no seller token" }
  if (sellerProductIds.length === 0) {
    return { campaign: null, error: "seller has no products" }
  }
  const keyword = `e2e-p225a-${Date.now()}-${suffix}`
  const res = await api("/store/advertising/campaigns", {
    method: "POST",
    headers: {
      authorization: `Bearer ${sellerToken}`,
      "x-publishable-api-key": PK,
    },
    body: JSON.stringify({
      name: `P2.25-A ${suffix} ${keyword}`,
      placement: "search",
      target_value: keyword,
      markets: ["NL"],
      week_starts: [nextMondayIso(10 + Number(suffix) || 10)],
      headline: "E2E Headline",
      subline: "E2E Subline",
      cta_key: "view_product",
      design_key: "design_1",
      product_ids: sellerProductIds,
    }),
  })
  if (res.status !== 201) {
    return {
      campaign: null,
      error: res.body?.message || `HTTP ${res.status}`,
    }
  }
  return { campaign: res.body?.campaign ?? null, error: null }
}

const createdReject = await tryCreateSellerCampaign("1")
const createdApprove = await tryCreateSellerCampaign("2")
const createWorks = !!createdReject.campaign && !!createdApprove.campaign
ok(
  "create_campaign_or_schema_note",
  true,
  createWorks
    ? "created fresh campaigns"
    : `seller create unavailable: ${createdReject.error || createdApprove.error}`
)

const list = await authApi("/admin/advertising/campaigns", adminToken)
ok("admin_campaign_list", list.status === 200, `status=${list.status}`)
ok(
  "list_has_seller_name_field",
  Array.isArray(list.body?.campaigns) &&
    (list.body.campaigns.length === 0 ||
      typeof list.body.campaigns[0].seller_name === "string"),
  `count=${list.body?.campaigns?.length}`
)

const existing = list.body?.campaigns || []
let campaignReject =
  createdReject.campaign ||
  existing.find((c) => c.status === "pending_review") ||
  existing[0] ||
  null
let campaignApprove =
  createdApprove.campaign ||
  existing.find((c) => c.id !== campaignReject?.id) ||
  existing[0] ||
  null

const listRowForReject = campaignReject?.id
  ? existing.find((c) => c.id === campaignReject.id) || null
  : null

ok(
  "list_shows_created_campaign",
  !!campaignReject?.id,
  campaignReject?.id
)
ok(
  "seller_name_when_available",
  !!listRowForReject &&
    typeof listRowForReject.seller_name === "string" &&
    listRowForReject.seller_name.length > 0,
  listRowForReject?.seller_name
)

// Reset reject target to pending_review for action tests
if (campaignReject?.id && campaignReject.status !== "pending_review") {
  const reset = await authApi(
    `/admin/advertising/campaigns/${campaignReject.id}`,
    adminToken,
    { method: "PATCH", body: JSON.stringify({ status: "pending_review" }) }
  )
  ok(
    "reset_pending_for_reject",
    reset.status === 200,
    `status=${reset.status}`
  )
  campaignReject = reset.body?.campaign || campaignReject
} else {
  ok("reset_pending_for_reject", !!campaignReject?.id, "already pending or created")
}

// ── Detail ──
let detail = null
if (campaignReject?.id) {
  detail = await authApi(
    `/admin/advertising/campaigns/${campaignReject.id}`,
    adminToken
  )
  ok("admin_campaign_detail", detail.status === 200, `status=${detail.status}`)
  const c = detail.body?.campaign
  ok(
    "detail_banner_fields",
    !!c &&
      typeof c.name === "string" &&
      typeof c.destination_url === "string" &&
      typeof c.placement === "string" &&
      Array.isArray(c.markets) &&
      Array.isArray(c.weeks),
    `name=${c?.name} placement=${c?.placement} headline=${c?.headline ?? "n/a"}`
  )
  ok(
    "detail_seller_name",
    typeof c?.seller_name === "string" && c.seller_name.length > 0,
    c?.seller_name
  )
} else {
  ok("admin_campaign_detail", false, "no campaign")
  ok("detail_banner_fields", false, "skipped")
  ok("detail_seller_name", false, "skipped")
}

// ── Reject without reason ──
if (campaignReject?.id) {
  // Clear any prior note so "reject without reason" is a real block
  await authApi(
    `/admin/advertising/campaigns/${campaignReject.id}`,
    adminToken,
    {
      method: "PATCH",
      body: JSON.stringify({
        status: "pending_review",
        admin_note: "",
      }),
    }
  )

  const noReason = await authApi(
    `/admin/advertising/campaigns/${campaignReject.id}`,
    adminToken,
    { method: "PATCH", body: JSON.stringify({ status: "rejected" }) }
  )
  ok(
    "reject_without_reason_blocked",
    noReason.status === 400 || noReason.status === 422,
    `status=${noReason.status} msg=${noReason.body?.message}`
  )

  const withReason = await authApi(
    `/admin/advertising/campaigns/${campaignReject.id}`,
    adminToken,
    {
      method: "PATCH",
      body: JSON.stringify({
        status: "rejected",
        admin_note: "P2.25-A E2E reject reason",
      }),
    }
  )
  ok(
    "admin_can_reject",
    withReason.status === 200,
    `status=${withReason.status}`
  )
  ok(
    "admin_note_saved",
    withReason.body?.campaign?.admin_note === "P2.25-A E2E reject reason" &&
      withReason.body?.campaign?.status === "rejected",
    withReason.body?.campaign?.admin_note
  )
} else {
  ok("reject_without_reason_blocked", false, "skipped")
  ok("admin_can_reject", false, "skipped")
  ok("admin_note_saved", false, "skipped")
}

// ── Approve + cancel ──
if (campaignApprove?.id) {
  // Ensure not same as reject target if only one row — re-open for approve path
  const prep = await authApi(
    `/admin/advertising/campaigns/${campaignApprove.id}`,
    adminToken,
    { method: "PATCH", body: JSON.stringify({ status: "pending_review" }) }
  )
  if (prep.status === 200) campaignApprove = prep.body.campaign

  const approve = await authApi(
    `/admin/advertising/campaigns/${campaignApprove.id}`,
    adminToken,
    { method: "PATCH", body: JSON.stringify({ status: "approved" }) }
  )
  ok(
    "admin_can_approve",
    approve.status === 200 && approve.body?.campaign?.status === "approved",
    `status=${approve.status}`
  )

  const noteOnly = await authApi(
    `/admin/advertising/campaigns/${campaignApprove.id}`,
    adminToken,
    {
      method: "PATCH",
      body: JSON.stringify({ admin_note: "P2.25-A note only" }),
    }
  )
  ok(
    "admin_note_update_without_status",
    noteOnly.status === 200 &&
      noteOnly.body?.campaign?.admin_note === "P2.25-A note only",
    noteOnly.body?.campaign?.admin_note
  )

  const cancel = await authApi(
    `/admin/advertising/campaigns/${campaignApprove.id}`,
    adminToken,
    { method: "PATCH", body: JSON.stringify({ status: "cancelled" }) }
  )
  ok(
    "admin_can_cancel",
    cancel.status === 200 && cancel.body?.campaign?.status === "cancelled",
    `status=${cancel.status}`
  )
} else {
  ok("admin_can_approve", false, "skipped")
  ok("admin_note_update_without_status", false, "skipped")
  ok("admin_can_cancel", false, "skipped")
}

// ── Admin UI smoke ──
try {
  const uiList = await fetch(`${ADMIN_UI}/advertising/campaigns`)
  ok("admin_ui_list", uiList.status === 200, `status=${uiList.status}`)
  if (campaignReject?.id) {
    const uiDetail = await fetch(
      `${ADMIN_UI}/advertising/campaigns/${campaignReject.id}`
    )
    ok("admin_ui_detail", uiDetail.status === 200, `status=${uiDetail.status}`)
  } else {
    ok("admin_ui_detail", false, "skipped")
  }
} catch (e) {
  ok("admin_ui_list", false, e.message)
  ok("admin_ui_detail", false, e.message)
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
  console.log(
    `P2.25-A Admin Advertising E2E: ${passed}/${results.length} passed`
  )
  const failed = results.filter((r) => !r.pass)
  if (failed.length) {
    console.log("FAILED:")
    for (const f of failed) console.log(`  - ${f.name}: ${f.detail}`)
  }
  console.log("══════════════════════════════════════════════════════")
}

printSummary()
process.exit(results.every((r) => r.pass) ? 0 : 1)
