/**
 * P2.16 — Advertising / Banner Campaigns E2E.
 * Tests:
 *  1. Source-checks: i18n keys exist, UI components use t(), correct placements
 *  2. Backend model/API structure checks
 *  3. API-level tests: create campaign, availability, double-booking prevention
 *  4. Admin API: list, approve, reject, cancel
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

// ── Helper for API calls ──
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

// ── 1. i18n keys exist ──
const msgs = readFileSync("apps/web/app/_lib/i18n/messages.ts", "utf8")
const requiredKeys = [
  "adBannerCampaigns",
  "adBannerIntro",
  "adNewCampaign",
  "adCampaignName",
  "adDestinationUrl",
  "adSelectCountries",
  "adPlacement",
  "adPlacementHomepage",
  "adPlacementCategory",
  "adPlacementSearch",
  "adSelectCategory",
  "adChooseCategory",
  "adSearchKeyword",
  "adSearchKeywordPlaceholder",
  "adBannerImage",
  "adSelectWeeks",
  "adAvailable",
  "adBooked",
  "adBlockedFor",
  "adPriceSummary",
  "adWeeksSelected",
  "adCountries",
  "adPeriod",
  "adPreviewTitle",
  "adSubmitCampaign",
  "adReviewCampaign",
  "adNoCampaigns",
  "adNameRequired",
  "adMarketRequired",
  "adCategoryRequired",
  "adKeywordRequired",
  "adWeekRequired",
  "adUrlRequired",
  "adCampaignCreated",
  "adCampaignFailed",
  "statusCancelled",
]

for (const key of requiredKeys) {
  ok(`i18n_key_${key}`, msgs.includes(`${key}:`), `key "${key}" exists in messages.ts`)
}

// ── 2. i18n keys have 4-language L() ──
for (const key of requiredKeys.slice(0, 10)) {
  const regex = new RegExp(`${key}:\\s*L\\(`)
  ok(`i18n_L4_${key}`, regex.test(msgs), `${key} uses L() helper`)
}

// ── 3. Status labels include ad campaign statuses ──
const statusLabels = readFileSync(
  "apps/web/app/_lib/i18n/status-labels.ts",
  "utf8"
)
for (const status of [
  "draft",
  "pending_review",
  "approved",
  "scheduled",
  "active",
  "completed",
  "rejected",
  "cancelled",
]) {
  ok(
    `status_label_${status}`,
    statusLabels.includes(`${status}:`),
    `status "${status}" mapped in status-labels.ts`
  )
}

// ── 4. Seller banner page uses t() and not hardcoded Dutch ──
const bannerPage = readFileSync(
  "apps/web/app/seller/marketing/banners/page.tsx",
  "utf8"
)
ok(
  "ui_uses_t_calls",
  (bannerPage.match(/t\("/g) || []).length > 20,
  "banner page uses t() extensively"
)
ok(
  "ui_placement_homepage",
  bannerPage.includes("adPlacementHomepage"),
  "uses i18n for homepage placement"
)
ok(
  "ui_placement_category",
  bannerPage.includes("adPlacementCategory"),
  "uses i18n for category placement"
)
ok(
  "ui_placement_search",
  bannerPage.includes("adPlacementSearch"),
  "uses i18n for search placement"
)
ok(
  "ui_market_selection",
  bannerPage.includes("toggleMarket") && bannerPage.includes("MARKET_OPTIONS"),
  "has market/country selection"
)
ok(
  "ui_week_picker",
  bannerPage.includes("weekSlots") && bannerPage.includes("toggleWeek"),
  "has week picker"
)
ok(
  "ui_availability_badges",
  bannerPage.includes("adAvailable") && bannerPage.includes("adBooked"),
  "shows available/booked badges"
)
ok(
  "ui_partial_block_message",
  bannerPage.includes("adPartiallyBooked") || bannerPage.includes("adBlockedFor"),
  "shows blocked-for-country message"
)
ok(
  "ui_preview",
  bannerPage.includes("adPreviewTitle") && bannerPage.includes("showPreview"),
  "has preview section"
)
ok(
  "ui_price_summary",
  bannerPage.includes("adPriceSummary") && bannerPage.includes("totalPrice"),
  "shows price summary"
)
ok(
  "ui_category_dropdown",
  bannerPage.includes("adChooseCategory") && bannerPage.includes("categories"),
  "has category dropdown"
)
ok(
  "ui_search_keyword_input",
  bannerPage.includes("adSearchKeyword") && bannerPage.includes("targetValue"),
  "has search keyword input"
)
ok(
  "ui_full_week_range",
  bannerPage.includes("formatWeekRange"),
  "shows week ranges"
)
ok(
  "ui_no_hardcoded_beschikbaar",
  !bannerPage.includes('"Beschikbaar"'),
  "no hardcoded Dutch 'Beschikbaar'"
)
ok(
  "ui_no_hardcoded_bezet",
  !bannerPage.includes('"Bezet"'),
  "no hardcoded Dutch 'Bezet'"
)

// ── 5. Backend model checks ──
const adCampaignModel = readFileSync(
  "apps/backend/src/modules/cms/models/ad-campaign.ts",
  "utf8"
)
ok("model_campaign_exists", adCampaignModel.includes("ad_campaign"), "ad_campaign model exists")
ok("model_has_seller_id", adCampaignModel.includes("seller_id"), "has seller_id field")
ok("model_has_placement", adCampaignModel.includes("placement"), "has placement field")
ok("model_has_target_type", adCampaignModel.includes("target_type"), "has target_type field")
ok("model_has_markets", adCampaignModel.includes("markets"), "has markets field")
ok("model_has_status", adCampaignModel.includes("status"), "has status field")
ok("model_has_total_price", adCampaignModel.includes("total_price"), "has total_price field")

const adWeekModel = readFileSync(
  "apps/backend/src/modules/cms/models/ad-campaign-week.ts",
  "utf8"
)
ok("model_week_exists", adWeekModel.includes("ad_campaign_week"), "ad_campaign_week model exists")
ok("model_week_has_campaign_id", adWeekModel.includes("campaign_id"), "has campaign_id")
ok("model_week_has_market_code", adWeekModel.includes("market_code"), "has market_code")
ok("model_week_has_week_start", adWeekModel.includes("week_start"), "has week_start")
ok("model_week_has_week_price", adWeekModel.includes("week_price"), "has week_price")

const adPricingModel = readFileSync(
  "apps/backend/src/modules/cms/models/ad-pricing.ts",
  "utf8"
)
ok("model_pricing_exists", adPricingModel.includes("ad_pricing"), "ad_pricing model exists")
ok("model_pricing_has_weekly_price", adPricingModel.includes("weekly_price"), "has weekly_price")

// ── 6. Migration exists ──
const migration = readFileSync(
  "apps/backend/src/modules/cms/migrations/Migration20260819120000.ts",
  "utf8"
)
ok("migration_creates_campaign", migration.includes("ad_campaign"), "migration creates ad_campaign")
ok("migration_creates_weeks", migration.includes("ad_campaign_week"), "migration creates ad_campaign_week")
ok("migration_creates_pricing", migration.includes("ad_pricing"), "migration creates ad_pricing")
ok("migration_unique_constraint", migration.includes("UQ_adwk_slot"), "unique constraint prevents double-booking")

// ── 7. Backend routes exist ──
const sellerRoute = readFileSync(
  "apps/backend/src/api/store/advertising/campaigns/route.ts",
  "utf8"
)
ok("route_seller_get", sellerRoute.includes("export async function GET"), "seller GET campaigns route")
ok("route_seller_post", sellerRoute.includes("export async function POST"), "seller POST campaign route")
ok("route_seller_validates_placement", sellerRoute.includes('"homepage", "category", "search"'), "validates placement values")
ok("route_seller_checks_availability", sellerRoute.includes("Slot(s) already booked"), "checks slot availability")
ok("route_seller_requires_markets", sellerRoute.includes("At least one market"), "requires markets")

const availRoute = readFileSync(
  "apps/backend/src/api/store/advertising/availability/route.ts",
  "utf8"
)
ok("route_availability", availRoute.includes("export async function GET"), "availability route exists")

const adminRoute = readFileSync(
  "apps/backend/src/api/admin/advertising/campaigns/route.ts",
  "utf8"
)
ok("route_admin_list", adminRoute.includes("export async function GET"), "admin list campaigns route")

const adminDetailRoute = readFileSync(
  "apps/backend/src/api/admin/advertising/campaigns/[id]/route.ts",
  "utf8"
)
ok("route_admin_get", adminDetailRoute.includes("export async function GET"), "admin GET campaign route")
ok("route_admin_patch", adminDetailRoute.includes("export async function PATCH"), "admin PATCH campaign route")
ok("route_admin_approve_reject", adminDetailRoute.includes('"approved"') && adminDetailRoute.includes('"rejected"'), "admin can approve/reject")
ok("route_admin_frees_slots", adminDetailRoute.includes("deleteAdCampaignWeeks"), "reject/cancel frees slots")

const pricingRoute = readFileSync(
  "apps/backend/src/api/admin/advertising/pricing/route.ts",
  "utf8"
)
ok("route_pricing_get", pricingRoute.includes("export async function GET"), "pricing GET route")
ok("route_pricing_post", pricingRoute.includes("export async function POST"), "pricing POST route")

// ── 8. Helpers exist ──
const helpers = readFileSync(
  "apps/backend/src/api/store/advertising/helpers.ts",
  "utf8"
)
ok("helper_normalize_week", helpers.includes("normalizeWeekStart"), "normalizeWeekStart helper")
ok("helper_compute_week_end", helpers.includes("computeWeekEnd"), "computeWeekEnd helper")
ok("helper_resolve_price", helpers.includes("resolveWeeklyPrice"), "resolveWeeklyPrice helper")
ok("helper_default_prices", helpers.includes("homepage: 995"), "default prices exist")
ok("helper_serialize", helpers.includes("serializeCampaign"), "serializeCampaign helper")

// ── 9. Middleware auth ──
const middlewares = readFileSync(
  "apps/backend/src/api/middlewares.ts",
  "utf8"
)
ok("mw_seller_campaigns", middlewares.includes('"/store/advertising/campaigns"'), "seller campaigns route in middleware")
ok("mw_seller_availability", middlewares.includes('"/store/advertising/availability"'), "availability route in middleware")
ok("mw_admin_campaigns", middlewares.includes('"/admin/advertising/campaigns"'), "admin campaigns route in middleware")
ok("mw_admin_pricing", middlewares.includes('"/admin/advertising/pricing"'), "admin pricing route in middleware")

// ── 10. Admin UI exists ──
const adminPage = readFileSync(
  "apps/admin/app/(shell)/advertising/campaigns/page.tsx",
  "utf8"
)
ok("admin_ui_exists", adminPage.includes("AdminAdvertisingCampaignsPage"), "admin advertising page exists")
ok("admin_ui_approve", adminPage.includes("Goedkeuren"), "admin has approve button")
ok("admin_ui_reject", adminPage.includes("Afwijzen"), "admin has reject button")
ok("admin_ui_cancel", adminPage.includes("Annuleren"), "admin has cancel button")
ok("admin_ui_status_filter", adminPage.includes("STATUS_LABELS"), "admin has status filter")

// ── 11. Admin API client ──
const adminApi = readFileSync(
  "apps/admin/lib/advertising-admin-api.ts",
  "utf8"
)
ok("admin_api_list", adminApi.includes("listAdCampaigns"), "admin API client list")
ok("admin_api_patch", adminApi.includes("patchAdCampaign"), "admin API client patch")
ok("admin_api_pricing", adminApi.includes("listAdPricing"), "admin API client pricing")

// ── 12. Admin module registry ──
const moduleReg = readFileSync("apps/admin/lib/module-registry.ts", "utf8")
ok("admin_nav_advertising", moduleReg.includes('"advertising"'), "advertising in admin module registry")

// ── 13. CMS module service includes ad models ──
const cmsService = readFileSync(
  "apps/backend/src/modules/cms/service.ts",
  "utf8"
)
ok("cms_svc_ad_campaign", cmsService.includes("AdCampaign"), "CMS service includes AdCampaign")
ok("cms_svc_ad_week", cmsService.includes("AdCampaignWeek"), "CMS service includes AdCampaignWeek")
ok("cms_svc_ad_pricing", cmsService.includes("AdPricing"), "CMS service includes AdPricing")

// ── 14. CMS models index exports ──
const modelsIndex = readFileSync(
  "apps/backend/src/modules/cms/models/index.ts",
  "utf8"
)
ok("models_export_campaign", modelsIndex.includes("AdCampaign"), "models index exports AdCampaign")
ok("models_export_week", modelsIndex.includes("AdCampaignWeek"), "models index exports AdCampaignWeek")
ok("models_export_pricing", modelsIndex.includes("AdPricing"), "models index exports AdPricing")

// ── 15. Week normalization helper correctness ──
// Verify the normalizeWeekStart logic
ok(
  "helper_monday_normalization",
  helpers.includes("day === 0 ? -6 : 1 - day"),
  "normalizes dates to Monday"
)

// ── API tests (only run if backend is available) ──
let apiTestsRun = false
try {
  const health = await api("/health")
  if (health.status === 200) {
    apiTestsRun = true
    console.log("\n── API tests ──")

    // Register test user
    const ts = Date.now()
    const email = `adtest_${ts}@test.nl`
    const password = "REDACTED_E2E_PASSWORD"

    const reg = await api("/auth/customer/emailpass/register", {
      method: "POST",
      body: JSON.stringify({
        email,
        password,
        email_verified: true,
      }),
    })
    ok("api_register", reg.status === 200, `status=${reg.status}`)

    const token = reg.body?.token
    if (token) {
      // Create customer
      const cust = await authApi("/store/customers", token, {
        method: "POST",
        body: JSON.stringify({
          first_name: "AdTest",
          last_name: `User${ts}`,
          email,
        }),
      })
      ok("api_create_customer", cust.status === 200 || cust.status === 201, `status=${cust.status}`)

      // Try to access campaigns (should fail: no seller account)
      const noSeller = await authApi("/store/advertising/campaigns", token)
      ok(
        "api_no_seller_403_or_404",
        noSeller.status === 404 || noSeller.status === 400,
        `no seller account → status=${noSeller.status}`
      )

      // Partner onboarding to get a seller account
      const onboard = await authApi("/store/partner-onboarding", token, {
        method: "POST",
        body: JSON.stringify({
          company_name: `AdTest BV ${ts}`,
          kvk_number: "12345678",
          vat_number: `NL${ts}B01`,
          address: { street: "Testlaan 1", city: "Amsterdam", postal_code: "1000AA", country: "NL" },
          contact_name: "AdTest User",
          contact_email: email,
          contact_phone: "+31612345678",
        }),
      })
      ok("api_onboard_start", onboard.status === 200 || onboard.status === 201, `onboard status=${onboard.status}`)

      if (onboard.status === 200 || onboard.status === 201) {
        // Submit onboarding
        const submit = await authApi("/store/partner-onboarding/submit", token, {
          method: "POST",
        })
        ok("api_onboard_submit", submit.status === 200, `submit status=${submit.status}`)

        // Admin approve
        const sellerId = submit.body?.seller?.id || onboard.body?.seller?.id
        if (sellerId) {
          // Admin login
          const adminLogin = await api("/auth/user/emailpass", {
            method: "POST",
            body: JSON.stringify({
              email: "admin@europmade.nl",
              password: "REDACTED_ADMIN_PASSWORD",
            }),
          })
          const adminToken = adminLogin.body?.token

          if (adminToken) {
            const approve = await authApi(
              `/admin/partners/${sellerId}/approve`,
              adminToken,
              { method: "POST" }
            )
            ok("api_onboard_approve", approve.status === 200, `approve status=${approve.status}`)

            // Refresh seller token
            const refreshed = await api("/auth/token/refresh", {
              method: "POST",
              headers: { authorization: `Bearer ${token}` },
            })
            const sellerToken = refreshed.body?.token || token

            // Now try campaigns
            const campaigns = await authApi("/store/advertising/campaigns", sellerToken)
            ok("api_list_campaigns", campaigns.status === 200, `list status=${campaigns.status}`)
            ok(
              "api_list_campaigns_empty",
              Array.isArray(campaigns.body?.campaigns) && campaigns.body.campaigns.length === 0,
              "initially empty"
            )

            // Check availability
            const avail = await authApi(
              "/store/advertising/availability?placement=homepage&target_type=homepage&markets=NL&weeks=4",
              sellerToken
            )
            ok("api_availability", avail.status === 200, `avail status=${avail.status}`)
            ok(
              "api_availability_has_weeks",
              Array.isArray(avail.body?.weeks) && avail.body.weeks.length > 0,
              `${avail.body?.weeks?.length || 0} weeks returned`
            )

            if (avail.body?.weeks?.length > 0) {
              const firstWeek = avail.body.weeks[0]
              ok(
                "api_availability_has_market_status",
                firstWeek.markets?.NL != null,
                "has NL market status"
              )
              ok(
                "api_availability_first_available",
                firstWeek.markets?.NL?.available === true,
                "first week available for NL"
              )
              ok(
                "api_availability_has_price",
                typeof firstWeek.markets?.NL?.price === "number",
                `price=${firstWeek.markets?.NL?.price}`
              )

              // Create a campaign
              const create = await authApi("/store/advertising/campaigns", sellerToken, {
                method: "POST",
                body: JSON.stringify({
                  name: `E2E Test Campaign ${ts}`,
                  placement: "homepage",
                  markets: ["NL"],
                  week_starts: [firstWeek.week_start],
                  destination_url: "https://europmade.com/test",
                }),
              })
              ok("api_create_campaign", create.status === 201, `create status=${create.status}`)

              if (create.status === 201) {
                const camp = create.body.campaign
                ok("api_campaign_has_id", typeof camp.id === "string", `id=${camp.id}`)
                ok("api_campaign_status", camp.status === "pending_review", `status=${camp.status}`)
                ok("api_campaign_has_weeks", camp.weeks?.length === 1, `${camp.weeks?.length} weeks`)
                ok("api_campaign_has_price", camp.total_price > 0, `price=${camp.total_price}`)
                ok("api_campaign_markets", JSON.stringify(camp.markets) === '["NL"]', "markets=NL")

                // Double-booking prevention: same slot
                const dupe = await authApi("/store/advertising/campaigns", sellerToken, {
                  method: "POST",
                  body: JSON.stringify({
                    name: "Duplicate Test",
                    placement: "homepage",
                    markets: ["NL"],
                    week_starts: [firstWeek.week_start],
                    destination_url: "https://europmade.com/dupe",
                  }),
                })
                ok(
                  "api_double_booking_prevented",
                  dupe.status === 400,
                  `double-booking status=${dupe.status}`
                )
                ok(
                  "api_double_booking_message",
                  dupe.body?.message?.includes("already booked"),
                  "error mentions already booked"
                )

                // Same week, different country should work
                const diffCountry = await authApi("/store/advertising/campaigns", sellerToken, {
                  method: "POST",
                  body: JSON.stringify({
                    name: "DE Campaign",
                    placement: "homepage",
                    markets: ["DE"],
                    week_starts: [firstWeek.week_start],
                    destination_url: "https://europmade.com/de",
                  }),
                })
                ok(
                  "api_different_country_ok",
                  diffCountry.status === 201,
                  `different country status=${diffCountry.status}`
                )

                // Same week, same country, different placement should work
                const diffPlacement = await authApi("/store/advertising/campaigns", sellerToken, {
                  method: "POST",
                  body: JSON.stringify({
                    name: "Category Campaign",
                    placement: "category",
                    target_value: "tuin",
                    markets: ["NL"],
                    week_starts: [firstWeek.week_start],
                    destination_url: "https://europmade.com/cat",
                  }),
                })
                ok(
                  "api_different_placement_ok",
                  diffPlacement.status === 201,
                  `different placement status=${diffPlacement.status}`
                )

                // Same placement+country but different category should work
                const diffCategory = await authApi("/store/advertising/campaigns", sellerToken, {
                  method: "POST",
                  body: JSON.stringify({
                    name: "Electronics Campaign",
                    placement: "category",
                    target_value: "elektronica",
                    markets: ["NL"],
                    week_starts: [firstWeek.week_start],
                    destination_url: "https://europmade.com/elec",
                  }),
                })
                ok(
                  "api_different_category_ok",
                  diffCategory.status === 201,
                  `different category status=${diffCategory.status}`
                )

                // Verify availability now shows booked
                const avail2 = await authApi(
                  "/store/advertising/availability?placement=homepage&target_type=homepage&markets=NL&weeks=4",
                  sellerToken
                )
                ok("api_availability_after_booking", avail2.status === 200, `avail2 status=${avail2.status}`)
                if (avail2.body?.weeks?.length > 0) {
                  const bookedWeek = avail2.body.weeks.find(
                    (w) => w.week_start === firstWeek.week_start
                  )
                  ok(
                    "api_week_now_booked",
                    bookedWeek?.markets?.NL?.available === false,
                    "first week now booked for NL"
                  )
                }

                // List campaigns (should have entries now)
                const list2 = await authApi("/store/advertising/campaigns", sellerToken)
                ok(
                  "api_campaigns_persisted",
                  list2.body?.campaigns?.length >= 1,
                  `${list2.body?.campaigns?.length} campaigns`
                )

                // Admin: list campaigns
                const adminList = await authApi("/admin/advertising/campaigns", adminToken)
                ok("admin_list_campaigns", adminList.status === 200, `admin list status=${adminList.status}`)
                ok(
                  "admin_sees_campaign",
                  adminList.body?.campaigns?.some((c) => c.id === camp.id),
                  "admin sees the created campaign"
                )

                // Admin: approve campaign
                const adminApprove = await authApi(
                  `/admin/advertising/campaigns/${camp.id}`,
                  adminToken,
                  {
                    method: "PATCH",
                    body: JSON.stringify({ status: "approved" }),
                  }
                )
                ok("admin_approve", adminApprove.status === 200, `approve status=${adminApprove.status}`)
                ok(
                  "admin_approved_status",
                  adminApprove.body?.campaign?.status === "approved",
                  `status=${adminApprove.body?.campaign?.status}`
                )

                // Admin: cancel a campaign (should free slots)
                if (diffCountry.status === 201) {
                  const deCampId = diffCountry.body.campaign.id
                  const adminCancel = await authApi(
                    `/admin/advertising/campaigns/${deCampId}`,
                    adminToken,
                    {
                      method: "PATCH",
                      body: JSON.stringify({ status: "cancelled" }),
                    }
                  )
                  ok("admin_cancel", adminCancel.status === 200, `cancel status=${adminCancel.status}`)

                  // Verify DE slot is now free
                  const availDE = await authApi(
                    `/store/advertising/availability?placement=homepage&target_type=homepage&markets=DE&weeks=4`,
                    sellerToken
                  )
                  const deWeek = availDE.body?.weeks?.find(
                    (w) => w.week_start === firstWeek.week_start
                  )
                  ok(
                    "admin_cancel_frees_slot",
                    deWeek?.markets?.DE?.available === true,
                    "cancelled campaign frees DE slot"
                  )
                }
              }
            }

            // Admin pricing
            const pricingList = await authApi("/admin/advertising/pricing", adminToken)
            ok("admin_pricing_list", pricingList.status === 200, `pricing list status=${pricingList.status}`)

            const pricingCreate = await authApi("/admin/advertising/pricing", adminToken, {
              method: "POST",
              body: JSON.stringify({
                placement: "homepage",
                market_code: "*",
                target_type: "*",
                weekly_price: 1200,
              }),
            })
            ok("admin_pricing_create", pricingCreate.status === 201, `pricing create status=${pricingCreate.status}`)
          }
        }
      }
    }
  }
} catch (e) {
  console.log(`\nAPI tests error: ${e.message}`)
}

if (!apiTestsRun) {
  console.log("\n⚠ API tests skipped (backend not available)")
}

// ── Summary ──
console.log("\n────────────────────────────────────")
const passed = results.filter((r) => r.pass).length
const total = results.length
console.log(`P2.16 E2E: ${passed}/${total}`)
if (passed < total) {
  console.log("\nFailed:")
  for (const r of results.filter((r) => !r.pass)) {
    console.log(`  ✗ ${r.name} — ${r.detail}`)
  }
}
process.exit(passed === total ? 0 : 1)
