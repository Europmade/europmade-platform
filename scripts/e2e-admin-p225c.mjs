/**
 * P2.25-C — Advertising destination, product selection & preview E2E
 */
import { existsSync, readFileSync } from "fs"

const BACKEND = process.env.MEDUSA_BACKEND_URL || "http://127.0.0.1:9000"
const WEB = process.env.NEXT_PUBLIC_STOREFRONT_URL || "http://127.0.0.1:3000"
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

function nextMondayIso(weeksAhead = 20) {
  const d = new Date()
  d.setUTCHours(0, 0, 0, 0)
  const day = d.getUTCDay()
  const diff = day === 0 ? 1 : 8 - day
  d.setUTCDate(d.getUTCDate() + diff + weeksAhead * 7)
  return d.toISOString()
}

function printSummary() {
  console.log("\n══════════════════════════════════════════════════════")
  const passed = results.filter((r) => r.pass).length
  console.log(`P2.25-C Destination/Products E2E: ${passed}/${results.length} passed`)
  const failed = results.filter((r) => !r.pass)
  if (failed.length) {
    console.log("FAILED:")
    for (const f of failed) console.log(`  - ${f.name}: ${f.detail}`)
  }
  console.log("══════════════════════════════════════════════════════")
}

// Source checks
ok(
  "migration_product_ids",
  existsSync(
    "apps/backend/src/modules/cms/migrations/Migration20260820160000.ts"
  )
)
ok(
  "shared_banner_ui",
  existsSync("packages/ui/src/components/ad-campaign-banner.tsx")
)
ok(
  "shared_landing_preview",
  existsSync("packages/ui/src/components/ad-campaign-landing-preview.tsx")
)
ok(
  "public_seller_page",
  existsSync("apps/web/app/seller/[sellerSlug]/page.tsx")
)
ok(
  "public_campaign_page",
  existsSync(
    "apps/web/app/seller/[sellerSlug]/campaign/[campaignSlug]/page.tsx"
  )
)
const banners = readFileSync(
  "apps/web/app/seller/marketing/banners/page.tsx",
  "utf8"
)
ok("seller_no_destination_url_field", !banners.includes("adDestinationUrl"))
ok("seller_has_product_picker", banners.includes("adCampaignProducts"))
ok("seller_sends_product_ids", banners.includes("product_ids: selectedProductIds"))
ok(
  "seller_uses_shared_preview",
  banners.includes("AdCampaignLandingPreview")
)

const adminList = readFileSync(
  "apps/admin/app/(shell)/advertising/campaigns/page.tsx",
  "utf8"
)
ok(
  "admin_list_beoordelen_vs_bekijken",
  adminList.includes('pending_review" ? "Beoordelen" : "Bekijken"')
)

const adminDetail = readFileSync(
  "apps/admin/app/(shell)/advertising/campaigns/[id]/page.tsx",
  "utf8"
)
ok("admin_uses_shared_preview", adminDetail.includes("AdCampaignLandingPreview"))
ok("admin_destination_section", adminDetail.includes("Bestemming"))

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
const pkOnly = { "x-publishable-api-key": PK }

const productsRes = await api("/store/product-cloud/products", { headers: sh })
const products = productsRes.body?.products || []
ok("seller_has_products", products.length >= 1, `count=${products.length}`)
const productIds = products.slice(0, Math.min(2, products.length)).map((p) => p.id)
ok("product_ids_ready", productIds.length >= 1, productIds.join(","))

const keyword = `e2e-p225c-${Date.now()}`
const weekA = nextMondayIso(22)

const createMissingProducts = await api("/store/advertising/campaigns", {
  method: "POST",
  headers: sh,
  body: JSON.stringify({
    name: "P2.25-C missing products",
    placement: "search",
    target_value: keyword + "-miss",
    markets: ["NL"],
    week_starts: [weekA],
    headline: "No products",
    product_ids: [],
  }),
})
ok(
  "reject_empty_product_ids",
  createMissingProducts.status === 400,
  `status=${createMissingProducts.status}`
)

const createWithUrl = await api("/store/advertising/campaigns", {
  method: "POST",
  headers: sh,
  body: JSON.stringify({
    name: "P2.25-C Destination Flow",
    placement: "search",
    target_value: keyword,
    markets: ["NL"],
    week_starts: [weekA],
    destination_url: "https://evil.example/external",
    headline: "P225C Headline",
    subline: "P225C Subline",
    cta_key: "discover",
    design_key: "design_3",
    product_ids: productIds,
  }),
})
ok(
  "create_campaign",
  createWithUrl.status === 201,
  `status=${createWithUrl.status} ${createWithUrl.body?.message}`
)
const camp = createWithUrl.body?.campaign
const campaignId = camp?.id
ok(
  "auto_destination_path",
  typeof camp?.destination_url === "string" &&
    camp.destination_url.startsWith("/seller/") &&
    camp.destination_url.includes("/campaign/") &&
    !camp.destination_url.includes("evil.example"),
  camp?.destination_url
)
ok(
  "stores_product_ids",
  Array.isArray(camp?.product_ids) &&
    camp.product_ids.length === productIds.length &&
    productIds.every((id) => camp.product_ids.includes(id)),
  JSON.stringify(camp?.product_ids)
)
ok("has_campaign_slug", !!camp?.campaign_slug, camp?.campaign_slug)
ok("has_seller_public_slug", !!camp?.seller_public_slug, camp?.seller_public_slug)
ok("status_pending_review", camp?.status === "pending_review", camp?.status)

const sellerSlug = camp?.seller_public_slug
const campaignSlug = camp?.campaign_slug

const publicCampaign = await api(
  `/store/advertising/public/sellers/${encodeURIComponent(sellerSlug)}/campaigns/${encodeURIComponent(campaignSlug)}`,
  { headers: pkOnly }
)
ok("public_campaign_api", publicCampaign.status === 200, `status=${publicCampaign.status}`)
ok(
  "public_campaign_products",
  Array.isArray(publicCampaign.body?.products) &&
    publicCampaign.body.products.length === productIds.length,
  `n=${publicCampaign.body?.products?.length}`
)
ok(
  "public_product_href_uses_id",
  Array.isArray(publicCampaign.body?.products) &&
    publicCampaign.body.products.every(
      (p) =>
        typeof p.href === "string" &&
        p.href.startsWith("/product/") &&
        productIds.some((id) => p.href.includes(id))
    ),
  publicCampaign.body?.products?.[0]?.href
)
ok(
  "public_campaign_banner_fields",
  publicCampaign.body?.campaign?.headline === "P225C Headline" &&
    publicCampaign.body?.campaign?.design_key === "design_3",
  publicCampaign.body?.campaign?.headline
)

const publicSeller = await api(
  `/store/advertising/public/sellers/${encodeURIComponent(sellerSlug)}`,
  { headers: pkOnly }
)
ok("public_seller_api", publicSeller.status === 200, `status=${publicSeller.status}`)
ok(
  "public_seller_name",
  !!publicSeller.body?.seller?.name,
  publicSeller.body?.seller?.name
)

try {
  const webCamp = await fetch(
    `${WEB}/seller/${encodeURIComponent(sellerSlug)}/campaign/${encodeURIComponent(campaignSlug)}`
  )
  ok(
    "web_campaign_page",
    webCamp.status === 200,
    `status=${webCamp.status}`
  )
  const html = await webCamp.text()
  ok(
    "web_campaign_shows_headline",
    html.includes("P225C Headline"),
    "headline in html"
  )
  ok(
    "web_campaign_more_link",
    html.includes("Bekijk meer producten van deze verkoper"),
    "more link"
  )
} catch (e) {
  ok("web_campaign_page", false, e.message)
  ok("web_campaign_shows_headline", false, e.message)
  ok("web_campaign_more_link", false, e.message)
}

try {
  const webSeller = await fetch(
    `${WEB}/seller/${encodeURIComponent(sellerSlug)}`
  )
  ok("web_seller_page", webSeller.status === 200, `status=${webSeller.status}`)
} catch (e) {
  ok("web_seller_page", false, e.message)
}

const adminDetailRes = await api(`/admin/advertising/campaigns/${campaignId}`, {
  headers: ah,
})
ok(
  "admin_review_loads",
  adminDetailRes.status === 200 &&
    adminDetailRes.body?.campaign?.status === "pending_review",
  adminDetailRes.body?.campaign?.status
)
ok(
  "admin_sees_products",
  Array.isArray(adminDetailRes.body?.campaign?.products) &&
    adminDetailRes.body.campaign.products.length >= 1,
  `n=${adminDetailRes.body?.campaign?.products?.length}`
)
ok(
  "admin_sees_auto_destination",
  adminDetailRes.body?.campaign?.destination_url === camp.destination_url,
  adminDetailRes.body?.campaign?.destination_url
)

const approve = await api(`/admin/advertising/campaigns/${campaignId}`, {
  method: "PATCH",
  headers: ah,
  body: JSON.stringify({ status: "approved" }),
})
ok(
  "admin_approve",
  approve.status === 200 && approve.body?.campaign?.status === "approved",
  approve.body?.campaign?.status
)

const sellerList = await api("/store/advertising/campaigns", { headers: sh })
const row = (sellerList.body?.campaigns || []).find((c) => c.id === campaignId)
ok("seller_sees_approved", row?.status === "approved", row?.status)

// Reject + resubmit regression
const weekB = nextMondayIso(23)
const create2 = await api("/store/advertising/campaigns", {
  method: "POST",
  headers: sh,
  body: JSON.stringify({
    name: "P2.25-C Reject Flow",
    placement: "search",
    target_value: keyword + "-rej",
    markets: ["NL"],
    week_starts: [weekB],
    headline: "Reject me",
    product_ids: productIds.slice(0, 1),
  }),
})
const id2 = create2.body?.campaign?.id
ok("create_for_reject", create2.status === 201, `status=${create2.status}`)

const reject = await api(`/admin/advertising/campaigns/${id2}`, {
  method: "PATCH",
  headers: ah,
  body: JSON.stringify({
    status: "rejected",
    admin_note: "P2.25-C fix products",
  }),
})
ok(
  "admin_reject",
  reject.status === 200 && reject.body?.campaign?.status === "rejected",
  reject.body?.campaign?.status
)

const weekC = nextMondayIso(24)
const resubmit = await api(`/store/advertising/campaigns/${id2}`, {
  method: "PATCH",
  headers: sh,
  body: JSON.stringify({
    name: "P2.25-C Resubmitted",
    placement: "search",
    target_value: keyword + "-rej-v2",
    markets: ["NL"],
    week_starts: [weekC],
    headline: "Fixed",
    product_ids: productIds,
  }),
})
ok(
  "seller_resubmit_with_products",
  resubmit.status === 200 &&
    resubmit.body?.campaign?.status === "pending_review" &&
    (resubmit.body?.campaign?.admin_note == null ||
      resubmit.body?.campaign?.admin_note === ""),
  `status=${resubmit.status} note=${resubmit.body?.campaign?.admin_note}`
)

try {
  const health = await fetch(`${BACKEND}/health`)
  ok("health", health.status === 200, `status=${health.status}`)
} catch (e) {
  ok("health", false, e.message)
}

printSummary()
process.exit(results.every((r) => r.pass) ? 0 : 1)
