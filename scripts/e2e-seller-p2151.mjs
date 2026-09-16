/**
 * P2.15.1 — Seller Backoffice i18n full audit.
 * Verifies that:
 *  1. variants-panel.tsx uses locale prop (no hardcoded "nl")
 *  2. All Seller pages use t() for Dutch UI strings
 *  3. New P2.15.1 message keys exist with 4-language L() definitions
 *  4. compliance-evidence-section uses locale parameter
 *  5. Status labels are locale-aware
 *  6. No known hardcoded Dutch UI strings remain in audited files
 */
import { readFileSync } from "fs"

const results = []
function ok(name, pass, detail = "") {
  results.push({ name, pass: Boolean(pass), detail })
  console.log(`${pass ? "OK" : "FAIL"}: ${name} — ${detail || (pass ? "✓" : "✗")}`)
}

// ── 1. variants-panel.tsx uses locale prop, not hardcoded "nl" ──
const vp = readFileSync("apps/web/app/seller/products/[id]/_components/variants-panel.tsx", "utf8")

ok("vp_locale_prop", vp.includes("locale: StorefrontLocale"), "has locale prop in type")
ok("vp_no_hardcoded_nl", !vp.includes('"nl"'), 'no hardcoded "nl" in variants panel')
ok("vp_imports_t", vp.includes('import { t }'), "imports t() from messages")
ok("vp_imports_locale_type", vp.includes("StorefrontLocale"), "imports StorefrontLocale")
ok("vp_uses_t_calls", (vp.match(/t\("/g) || []).length > 20, "uses t() extensively (>20 calls)")

// No hardcoded Dutch labels in variants panel
const vpDutchStrings = [
  "Kleur", "Maat", "Inhoud", "Vermogen", "Spanning", "Materiaal", "Uitvoering", "Bundel",
  "Geen aanbod", "Gepauzeerd", "Actief", "Variant aangemaakt", "Variant bijgewerkt",
  "Variant verwijderd", "Verwijderen mislukt", "Verkoopaanbod opgeslagen",
  "Offer opslaan mislukt", "Nog geen varianten", "Bewerken", "Annuleren",
  "Opslaan", "Sluiten", "Verwijderen"
]
for (const s of vpDutchStrings) {
  ok(`vp_no_dutch_${s.substring(0, 15)}`, !vp.includes(`"${s}"`), `no hardcoded "${s}"`)
}

// ── 2. Parent page passes locale to SellerVariantsPanel ──
const pdp = readFileSync("apps/web/app/seller/products/[id]/page.tsx", "utf8")
ok("pdp_passes_locale_to_vp", pdp.includes("locale={locale}") && pdp.includes("SellerVariantsPanel"), "passes locale to variants panel")

// ── 3. compliance-evidence-section uses locale ──
const cev = readFileSync("apps/web/app/seller/_components/compliance-evidence-section.tsx", "utf8")
ok("cev_has_locale", cev.includes("locale"), "has locale parameter")
ok("cev_imports_t", cev.includes('import { t }'), "imports t()")
ok("cev_uses_t", (cev.match(/t\("/g) || []).length > 15, "uses t() extensively (>15 calls)")
ok("cev_no_goedgekeurd", !cev.includes('"Goedgekeurd"'), 'no hardcoded "Goedgekeurd"')
ok("cev_no_ontbreekt", !cev.includes('"Ontbreekt"'), 'no hardcoded "Ontbreekt"')
ok("cev_no_bewijs_verwijderd", !cev.includes('"Bewijs verwijderd."'), 'no hardcoded "Bewijs verwijderd."')

// ── 4. New P2.15.1 message keys exist in messages.ts ──
const msgs = readFileSync("apps/web/app/_lib/i18n/messages.ts", "utf8")

const p2151Keys = [
  // Variants panel keys
  "vpAxisColor", "vpAxisSize", "vpAxisContent", "vpAxisPower", "vpAxisVoltage",
  "vpAxisMaterial", "vpAxisVariant", "vpAxisBundle",
  "vpNoOffer", "vpFillAxis", "vpEanRequired", "vpCreated", "vpCreateFailed",
  "vpUpdated", "vpUpdateFailed", "vpDeleted", "vpDeleteFailed",
  "vpOfferSaved", "vpOfferSaveFailed", "vpStructureHint", "vpAddVariant",
  "vpAxes", "vpVariant", "vpPromoPrice", "vpDeliveryTime", "vpNoVariants",
  "vpClose", "vpDelete", "vpEditOffer", "vpGoToOffer",
  // Offer tab keys
  "offerPriceHint", "offerSinglePriceHint", "offerPromoLabel",
  "offerShippingLabel", "offerHandlingLabel", "offerEffectivePrice",
  "offerStock", "offerDeliveryDays", "offerRegionMarket", "offerSaveBtn",
  "offerPauseHint", "offerPriceInvalid",
  // Media tab keys
  "mediaGuidelines", "mediaImageHint", "mediaMaxSize", "mediaVideoHint",
  "mediaUploadFile", "mediaAddUrl", "mediaNoMedia",
  "mediaOrderSaved", "mediaOrderFailed",
  // Publication tab keys
  "pubStatusLabel", "pubInfoQuality", "pubPublishableLabel",
  "pubYes", "pubNo", "pubRejectedLabel", "pubAwaitingApproval",
  "pubSaleBlocked", "pubWhyNotPublishable", "pubAllGreen",
  "pubSubmitting", "pubSubmitBtn",
  // History tab keys
  "historyHint", "historyAll", "historyPrice", "historyVariants", "historyRest",
  // Evidence section keys
  "evCeProof", "evDataUsageInfo", "evNotRequired", "evMissing",
  "evUrlOrFile", "evUploadFailed", "evDeleteConfirm", "evDeleted",
  "evDeleteFailed", "evAddFile", "evOrUrl", "evAddUrl",
  "evAutoReviewHint", "evHeading", "evExplain",
  // Product list keys
  "plSearchPlaceholder", "plSelectAll", "plHeaderProduct",
  "plHeaderVariants", "plHeaderStock", "plHeaderPrice",
  "plHeaderDelivery", "plHeaderSale",
  "plBulkBrandFailed", "plBulkEuFailed", "plBulkActionFailed",
  "plChooseBrandFirst", "plFillOneField",
  "plManufacturerName", "plManufacturerAddress",
  // Brand keys
  "brandNoDescription", "brandNamePlaceholder", "brandDescPlaceholder",
  "brandCreated", "brandCreateFailed", "brandSaved", "brandSaveFailed",
  "brandFacilitySaved", "brandFacilitySaveFailed",
  "brandFacilityDeactivated", "brandFacilityDeactivateFailed",
  "brandNoAddress", "brandFacilityNamePlaceholder", "brandCountryRequired",
  // Form keys
  "formStreet", "formHouseNumber", "formPostalCode", "formCity",
  "formNameCountryEmailRequired",
  // Compliance
  "compliancePending", "compliancePrecheck",
]

let keyMissing = 0
for (const key of p2151Keys) {
  const found = msgs.includes(`${key}:`)
  if (!found) keyMissing++
  ok(`key_${key}`, found, found ? "exists" : "MISSING")
}
ok("all_p2151_keys_present", keyMissing === 0, `${p2151Keys.length - keyMissing}/${p2151Keys.length} keys found`)

// ── 5. All new keys use L(nl, en, de, fr) helper ──
let keysWithoutL = 0
for (const key of p2151Keys) {
  const regex = new RegExp(`${key}:\\s*L\\(`)
  if (!regex.test(msgs)) keysWithoutL++
}
ok("all_keys_use_L", keysWithoutL === 0, `${p2151Keys.length - keysWithoutL}/${p2151Keys.length} use L()`)

// ── 6. Product detail page — no known Dutch UI strings ──
const pdpDutchChecks = [
  "Prijs, verzendkosten en voorraad moeten geldige getallen zijn.",
  "Foto-volgorde opgeslagen.",
  "Volgorde opslaan mislukt.",
  "Inclusief productvelden en Commerce Cloud-wijzigingen",
  "Eén centrale productprijs",
  "Richtlijnen",
  "Bestand uploaden",
  "Toevoegen via URL",
  "Nog geen media.",
  "Publicatiestatus: ",
  "Informatiekwaliteit: ",
  "Publiceerbaar: ",
  "Verkoop geblokkeerd",
  "Waarom niet publiceerbaar",
  "Ter goedkeuring aanbieden",
]
for (const s of pdpDutchChecks) {
  ok(`pdp_no_dutch_${s.substring(0, 20)}`, !pdp.includes(`"${s}"`), `no hardcoded "${s.substring(0, 30)}"`)
}

// ── 7. Product list — no known Dutch UI strings ──
const pl = readFileSync("apps/web/app/seller/products/page.tsx", "utf8")
const plDutchChecks = [
  "Zoek op naam, EAN, SKU, product-ID",
  "Selecteer alle producten op deze pagina",
  "Naamloos product",
  "Kies eerst een merk",
  "Vul minstens één EU Compliance",
  "Bulk merk-koppeling mislukt.",
  "Actie mislukt.",
]
for (const s of plDutchChecks) {
  ok(`pl_no_dutch_${s.substring(0, 20)}`, !pl.includes(`"${s}`), `no hardcoded "${s.substring(0, 30)}"`)
}

// ── 8. Brands page — no known Dutch UI strings ──
const bp = readFileSync("apps/web/app/seller/brands/page.tsx", "utf8")
const bpDutchChecks = [
  "Merkdetails laden mislukt.",
  "Merk aangemaakt.",
  "Merk opgeslagen.",
  "Productielocatie opgeslagen.",
  "Deactiveren mislukt.",
  "Geen beschrijving",
  "Geen adresgegevens",
]
for (const s of bpDutchChecks) {
  ok(`bp_no_dutch_${s.substring(0, 20)}`, !bp.includes(`"${s}"`), `no hardcoded "${s.substring(0, 30)}"`)
}

// ── 9. Made-in-Europe page — no known Dutch UI strings ──
const mie = readFileSync("apps/web/app/seller/made-in-europe/page.tsx", "utf8")
ok("mie_no_dutch_brand_country", !mie.includes('"Merk en land zijn verplicht."'), "no hardcoded Dutch")
ok("mie_no_dutch_facility_saved", !mie.includes('"Productielocatie opgeslagen en geselecteerd."'), "no hardcoded Dutch")

// ── 10. Import page — no known Dutch UI strings ──
const imp = readFileSync("apps/web/app/seller/products/import/page.tsx", "utf8")
ok("imp_no_dutch_choose", !imp.includes('"Kies eerst een CSV"'), "no hardcoded Dutch")
ok("imp_no_dutch_blocked", !imp.includes('"Importeren is geblokkeerd"'), "no hardcoded Dutch")
ok("imp_no_dutch_download", !imp.includes('"Download mislukt."'), "no hardcoded Dutch")

// ── 11. Status labels are locale-aware ──
const psl = readFileSync("apps/web/app/seller/_lib/product-status-labels.ts", "utf8")
ok("psl_locale_param", psl.includes("locale: StorefrontLocale"), "status labels accept locale param")
ok("psl_uses_t", psl.includes("t("), "uses t() for labels")

// ── 12. Brands detail page ──
const bd = readFileSync("apps/web/app/seller/brands/[id]/page.tsx", "utf8")
ok("bd_no_dutch_land", !bd.includes('"Land is verplicht."'), "no hardcoded Dutch")
ok("bd_no_dutch_facility", !bd.includes('"Facility opslaan mislukt."'), "no hardcoded Dutch")
ok("bd_no_dutch_deactivate", !bd.includes('"Facility deactiveren mislukt."'), "no hardcoded Dutch")
ok("bd_no_dutch_locations", !bd.includes('"Nog geen productielocaties."'), "no hardcoded Dutch")
ok("bd_uses_t", (bd.match(/t\("/g) || []).length > 10, "uses t() extensively")

// ── Summary ──
const total = results.length
const passed = results.filter((r) => r.pass).length
const failed = results.filter((r) => !r.pass)

console.log("\n=========================")
console.log(`P2.15.1 E2E: ${passed}/${total} passed`)
if (failed.length > 0) {
  console.log("FAILURES:")
  for (const f of failed) console.log(`  - ${f.name}: ${f.detail}`)
}
console.log("=========================")

process.exit(failed.length > 0 ? 1 : 0)
