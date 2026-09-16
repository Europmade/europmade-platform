/**
 * Pure completeness unit tests.
 * node --experimental-strip-types scripts/test-product-completeness.mjs
 */
import { computeProductCompleteness } from "../apps/backend/src/modules/product-cloud/completeness.ts"

const results = []
function ok(name, pass, detail = "") {
  results.push({ name, pass })
  console.log(`${pass ? "OK" : "FAIL"}: ${name}${detail ? " — " + detail : ""}`)
}

const incomplete = computeProductCompleteness({
  basis: {
    title: "Robotmaaier",
    brand_id: "brand_x",
    manufacturer_id: "mfr_x",
    category_names: ["Tuin"],
    identifier_value: "8720000000001",
    has_primary_image: false,
  },
  attributes: [
    {
      code: "gpsr_manufacturer_name",
      name: "Fabrikantnaam",
      tier: "compliance_required",
      value: null,
    },
    {
      code: "vermogen",
      name: "Vermogen",
      tier: "category_required",
      value: "1000",
    },
  ],
  offer: {
    has_offer: false,
    has_price: false,
    has_stock_configured: false,
    has_delivery: false,
  },
})

ok("not_publishable_when_gaps", incomplete.publishable === false)
ok("has_missing_image", incomplete.missing_required.some((m) => m.code === "primary_image"))
ok("has_missing_compliance", incomplete.missing_required.some((m) => m.code === "gpsr_manufacturer_name"))
ok("compliance_incomplete", incomplete.compliance_status === "incomplete" || incomplete.compliance_status === "non_compliant")
ok("percent_lt_100", incomplete.percent < 100, String(incomplete.percent))

const complete = computeProductCompleteness({
  basis: {
    title: "Robotmaaier Katrien",
    brand_id: "brand_x",
    manufacturer_id: "mfr_x",
    category_names: ["Tuin"],
    identifier_value: "8720000000001",
    has_primary_image: true,
  },
  attributes: [
    {
      code: "gpsr_manufacturer_name",
      name: "Fabrikantnaam",
      tier: "compliance_required",
      value: "Zoef BV",
    },
    {
      code: "gpsr_manufacturer_address",
      name: "Adres",
      tier: "compliance_required",
      value: "Straat 1",
    },
    {
      code: "gpsr_manufacturer_postal_city",
      name: "Postcode",
      tier: "compliance_required",
      value: "1000 AA Amsterdam",
    },
    {
      code: "gpsr_manufacturer_country",
      name: "Land",
      tier: "compliance_required",
      value: "NL",
    },
    {
      code: "gpsr_manufacturer_email",
      name: "Email",
      tier: "compliance_required",
      value: "info@example.com",
    },
    {
      code: "gpsr_eu_responsible_name",
      name: "EU RP",
      tier: "compliance_required",
      value: "Zoef EU",
    },
    {
      code: "gpsr_eu_responsible_address",
      name: "EU adres",
      tier: "compliance_required",
      value: "EU Straat 1",
    },
    {
      code: "gpsr_eu_responsible_contact",
      name: "EU contact",
      tier: "compliance_required",
      value: "eu@example.com",
    },
    {
      code: "vermogen",
      name: "Vermogen",
      tier: "category_required",
      value: "1000",
    },
    {
      code: "maaibreedte",
      name: "Maaibreedte",
      tier: "recommended",
      value: null,
    },
  ],
  offer: {
    has_offer: true,
    has_price: true,
    has_stock_configured: true,
    has_delivery: true,
  },
})

ok("publishable_when_required_complete", complete.publishable === true)
ok("compliance_complete", complete.compliance_status === "complete")
ok("recommended_not_blocking", complete.sections.find((s) => s.key === "recommended")?.filled === 0)

const failed = results.filter((r) => !r.pass).length
console.log(`---\nPASSED=${results.length - failed} FAILED=${failed}`)
process.exit(failed ? 1 : 0)
