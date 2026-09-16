/**
 * P2.15 — Seller Backoffice i18n / vertalingen audit + herstel.
 * Verifies that:
 *  1. All key seller pages use t() from messages.ts (no hardcoded Dutch UI chrome)
 *  2. messages.ts contains all required keys with NL/EN/DE/FR translations
 *  3. Product-status-labels accept locale parameter
 *  4. Dynamic data (product names, EAN, SKU, brand names) is NOT translated
 */
import { readFileSync } from "fs"

const results = []
function ok(name, pass, detail = "") {
  results.push({ name, pass: Boolean(pass), detail })
  console.log(`${pass ? "OK" : "FAIL"}: ${name} — ${detail || (pass ? "✓" : "✗")}`)
}

// ── 1. messages.ts has all P2.15 keys ──
const msgs = readFileSync("apps/web/app/_lib/i18n/messages.ts", "utf8")

const requiredKeys = [
  "pdpTabOverview", "pdpTabInformation", "pdpTabVariants", "pdpTabOffer",
  "pdpTabMedia", "pdpTabTranslations", "pdpTabPublication", "pdpTabHistory",
  "pdpBasicInfo", "pdpProductName", "pdpDescription",
  "pdpTierRequired", "pdpTierRecommended", "pdpTierOptional",
  "pdpTierRequiredInfo", "pdpTierRecommendedInfo", "pdpTierOptionalInfo",
  "pdpRequiredForPublication", "pdpMissingFields",
  "pdpMadeInEuropeCompliance", "pdpManufacturer", "pdpManufacturerResponsible",
  "pdpBrandIsNotManufacturer", "pdpSelectManufacturer",
  "pdpProductionLocation", "pdpSelectLocation", "pdpMieStatus",
  "pdpCeMarking", "pdpDataUsage", "pdpGpsrLink",
  "pdpAddress", "pdpContact", "pdpCountry",
  "pdpSaleLabel", "pdpPublicationLabel", "pdpInfoLabel", "pdpComplianceLabel",
  "pdpPause", "pdpResume",
  "qualityComplete", "qualitySufficient", "qualityInsufficient",
  "complianceApproved", "compliancePendingReview", "complianceRejected",
  "complianceComplete", "complianceNotApplicable", "complianceMissing",
  "saleForSale", "salePaused", "saleNoOffer", "saleBlocked",
  "pubPublished", "pubPublishable", "pubNotPublishable",
  "wfPublished", "wfPendingApproval", "wfRejected", "wfDraft",
  "plLoadFailed", "plNoProducts", "plAddProduct", "plNoResults",
  "plSelected", "plClearSelection", "plBulkAction",
  "commonSave", "commonEdit", "commonCancel", "commonBrand", "commonCategory",
]

for (const key of requiredKeys) {
  ok(`key_${key}`, msgs.includes(`${key}:`), "messages.ts")
}

// ── 2. All keys have 4-language translations (L(nl, en, de, fr)) ──
const keyPattern = /^\s+(pdp|quality|compliance|sale|pub|wf|pl|form)\w+:\s+L\(/gm
const keyMatches = [...msgs.matchAll(keyPattern)]
ok("p215_keys_use_L_helper", keyMatches.length >= 60, `${keyMatches.length} keys`)

// ── 3. Product detail page uses t() instead of hardcoded Dutch ──
const pdp = readFileSync("apps/web/app/seller/products/[id]/page.tsx", "utf8")

ok("pdp_no_hardcoded_tabs", !pdp.includes('label: "Productinformatie"'), "tab labels via t()")
ok("pdp_no_hardcoded_tier_verplicht", !pdp.includes('"Verplichte informatie"'), "tier via t()")
ok("pdp_no_hardcoded_tier_aanbevolen", !pdp.includes('"Aanbevolen informatie"'), "tier via t()")
ok("pdp_no_hardcoded_tier_optioneel", !pdp.includes('"Optionele informatie"'), "tier via t()")
ok("pdp_no_hardcoded_opslaan", !pdp.includes('{saving ? "Opslaan…" : "Opslaan"}'), "save via t()")
ok("pdp_no_hardcoded_publicatiecontrole", !pdp.includes('"Publicatiecontrole"'), "via t()")
ok("pdp_no_hardcoded_basisinformatie", !pdp.includes('"Basisinformatie"'), "via t()")
ok("pdp_uses_t_for_brand", pdp.includes('t("commonBrand"'), "brand label via t()")
ok("pdp_uses_t_for_category", pdp.includes('t("commonCategory"'), "category label via t()")
ok("pdp_uses_t_for_manufacturer", pdp.includes('t("pdpManufacturer"'), "manufacturer via t()")
ok("pdp_uses_t_for_compliance", pdp.includes('t("pdpComplianceLabel"'), "compliance via t()")
ok("pdp_uses_t_for_sale", pdp.includes('t("pdpSaleLabel"'), "sale via t()")
ok("pdp_uses_t_for_publication", pdp.includes('t("pdpPublicationLabel"'), "publication via t()")
ok("pdp_no_hardcoded_fabrikant_label", !pdp.includes('<dt className="text-wf-500">Fabrikant</dt>'), "via t()")
ok("pdp_no_hardcoded_adres_label", !pdp.includes('<dt className="text-wf-500">Adres</dt>'), "via t()")

// ── 4. Product list page uses t() ──
const pl = readFileSync("apps/web/app/seller/products/page.tsx", "utf8")

ok("pl_no_hardcoded_onvoldoende", !pl.includes('label: "Onvoldoende"'), "quality via t()")
ok("pl_no_hardcoded_compleet", !pl.includes('label: "Compleet"'), "quality via t()")
ok("pl_no_hardcoded_voldoende", !pl.includes('label: "Voldoende"'), "quality via t()")
ok("pl_no_hardcoded_load_failed", !pl.includes('"Producten konden niet worden geladen."'), "via t()")
ok("pl_no_hardcoded_no_products", !pl.includes('"Je hebt nog geen producten."'), "via t()")
ok("pl_no_hardcoded_add_product", !pl.includes('label: "Product toevoegen"'), "via t()")
ok("pl_uses_locale_for_quality", pl.includes("qualityLabel(p.completeness, locale)"), "locale passed")
ok("pl_uses_locale_for_compliance", pl.includes("complianceReviewLabel(p.completeness, locale)"), "locale passed")

// ── 5. Product-status-labels accepts locale parameter ──
const psl = readFileSync("apps/web/app/seller/_lib/product-status-labels.ts", "utf8")

ok("psl_imports_t", psl.includes('import { t }'), "imports t()")
ok("psl_imports_locale_type", psl.includes("StorefrontLocale"), "imports StorefrontLocale")
ok("psl_compliance_accepts_locale", psl.includes("complianceReviewLabel(\n  c?: CompletenessReport | null,\n  locale: StorefrontLocale"), "locale param")
ok("psl_sale_accepts_locale", psl.includes("locale: StorefrontLocale = \"nl\""), "locale param")
ok("psl_publication_accepts_locale", psl.includes("publicationGateLabel(product:"), "function exists")
ok("psl_no_hardcoded_goedgekeurd", !psl.includes('label: "Goedgekeurd"'), "via t()")
ok("psl_no_hardcoded_afgekeurd", !psl.includes('label: "Afgekeurd"'), "via t()")
ok("psl_no_hardcoded_te_koop", !psl.includes('label: "Te koop"'), "via t()")
ok("psl_no_hardcoded_gepubliceerd", !psl.includes('label: "Gepubliceerd"'), "via t()")

// ── 6. Dynamic data is NOT translated (product names, EAN, SKU stay as-is) ──
ok("pdp_product_title_not_translated", pdp.includes("product.title"), "title from API")
ok("pdp_ean_not_translated", pdp.includes("product.identifier_value"), "EAN from API")
ok("pdp_brand_name_from_api", pdp.includes("product.brand_name"), "brand name from API")

// ── 7. Locale system is intact ──
ok("locale_cookie_exists", msgs.includes("em_storefront_locale") || readFileSync("apps/web/app/_lib/i18n/locales.ts", "utf8").includes("em_storefront_locale"), "cookie")
const locales = readFileSync("apps/web/app/_lib/i18n/locales.ts", "utf8")
ok("locale_4_languages", locales.includes('"nl"') && locales.includes('"en"') && locales.includes('"de"') && locales.includes('"fr"'), "NL/EN/DE/FR")

// ── 8. Messages consistency: same term has same key everywhere ──
const brandKeyCount = (msgs.match(/commonBrand/g) || []).length
ok("consistent_brand_key", brandKeyCount >= 1, `commonBrand used ${brandKeyCount}x in messages`)

// ── Summary ──
const failed = results.filter((r) => r.pass === false)
console.log(`\n${results.filter((r) => r.pass).length}/${results.length} passed`)
if (failed.length) {
  for (const f of failed) console.log(` - ${f.name}: ${f.detail}`)
  process.exit(1)
}
