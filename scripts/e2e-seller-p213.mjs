/**
 * P2.13 — Vereenvoudiging Made in Europe & EU Compliance.
 * node scripts/e2e-seller-p213.mjs
 */
import { createHmac } from "node:crypto"
import { readFileSync } from "node:fs"
import { execFileSync } from "node:child_process"

const backend = process.env.BACKEND_URL || "http://127.0.0.1:9000"
const pubKey = readFileSync("apps/web/.env.local", "utf8")
  .match(/NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=(.*)/)[1]
  .trim()
const email = process.env.SELLER_EMAIL || "seller-flow-20260804144242@example.com"
const password = process.env.SELLER_PASSWORD || "REDACTED_SELLER_PASSWORD"

const ALPH = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"
function base32Decode(input) {
  const cleaned = input.replace(/=+$/, "").replace(/\s+/g, "").toUpperCase()
  let bits = 0
  let value = 0
  const out = []
  for (const ch of cleaned) {
    const idx = ALPH.indexOf(ch)
    if (idx < 0) continue
    value = (value << 5) | idx
    bits += 5
    if (bits >= 8) {
      out.push((value >> (bits - 8)) & 255)
      bits -= 8
    }
  }
  return Buffer.from(out)
}
function totp(secretB32) {
  const secret = base32Decode(secretB32)
  const counter = Math.floor(Date.now() / 1000 / 30)
  const buf = Buffer.alloc(8)
  buf.writeBigUInt64BE(BigInt(counter))
  const dig = createHmac("sha1", secret).update(buf).digest()
  const off = dig[dig.length - 1] & 0xf
  const code =
    ((dig[off] & 0x7f) << 24) |
    ((dig[off + 1] & 0xff) << 16) |
    ((dig[off + 2] & 0xff) << 8) |
    (dig[off + 3] & 0xff)
  return String(code % 1e6).padStart(6, "0")
}
function psql(sql) {
  return execFileSync(
    "docker",
    [
      "exec",
      "-i",
      "europmade-postgres",
      "psql",
      "-U",
      "europmade",
      "-d",
      "europmade",
      "-t",
      "-A",
      "-c",
      sql,
    ],
    { encoding: "utf8" }
  ).trim()
}
async function json(url, init) {
  const res = await fetch(url, init)
  const body = await res.json().catch(() => ({}))
  return { status: res.status, body }
}

const results = []
function ok(name, pass, detail = "") {
  results.push({ name, pass, detail })
  console.log(`${pass ? "OK" : "FAIL"}: ${name}${detail ? ` — ${detail}` : ""}`)
}

const secret = psql(`
SELECT mc.secret FROM mfa_credential mc
JOIN customer c ON c.id = mc.customer_id
WHERE lower(c.email)=lower('${email}') AND mc.status='active' AND mc.deleted_at IS NULL
LIMIT 1;
`)
const login = await json(`${backend}/auth/customer/emailpass`, {
  method: "POST",
  headers: {
    "content-type": "application/json",
    "x-publishable-api-key": pubKey,
  },
  body: JSON.stringify({ email, password }),
})
let token = login.body.token
if (login.body.mfa_required || login.body.mfa_challenge) {
  const challenge = await json(`${backend}/store/mfa/challenges`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-publishable-api-key": pubKey,
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ purpose: "login" }),
  })
  const verify = await json(
    `${backend}/store/mfa/challenges/${challenge.body.challenge.id}/verify`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-publishable-api-key": pubKey,
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ code: totp(secret) }),
    }
  )
  token = verify.body.token
}
const hdr = {
  "content-type": "application/json",
  "x-publishable-api-key": pubKey,
  authorization: `Bearer ${token}`,
}

const health = await json(`${backend}/health`, {})
ok("health_200", health.status === 200, String(health.status))

const stamp = Date.now()
const brandName = `P213 Merk ${stamp}`
const brandRes = await json(`${backend}/store/brands`, {
  method: "POST",
  headers: hdr,
  body: JSON.stringify({ name: brandName }),
})
const brandId = brandRes.body?.brand?.id
ok("brand_created", brandRes.status === 200 && Boolean(brandId), String(brandRes.status))

const brandMfr = await json(`${backend}/store/partner/manufacturers`, {
  method: "POST",
  headers: hdr,
  body: JSON.stringify({
    name: brandName,
    street: "Keizersgracht",
    house_number: "13",
    postal_code: "1015CJ",
    city: "Amsterdam",
    country_code: "NL",
    contact_email: `p213-brand-${stamp}@example.com`,
    contact_phone: "+31201111111",
  }),
})
const brandManufacturerId = brandMfr.body?.manufacturer?.id
ok(
  "brand_manufacturer_profile_created",
  brandMfr.status === 200 && Boolean(brandManufacturerId),
  String(brandMfr.status)
)

const otherMfr = await json(`${backend}/store/partner/manufacturers`, {
  method: "POST",
  headers: hdr,
  body: JSON.stringify({
    name: `P213 Andere Fabriek ${stamp}`,
    street: "Market Street",
    house_number: "9",
    postal_code: "94103",
    city: "San Francisco",
    country_code: "US",
    contact_email: `p213-other-${stamp}@example.com`,
  }),
})
const otherManufacturerId = otherMfr.body?.manufacturer?.id
ok(
  "other_manufacturer_created",
  otherMfr.status === 200 && Boolean(otherManufacturerId),
  String(otherMfr.status)
)

const products = await json(`${backend}/store/product-cloud/products`, {
  headers: hdr,
})
const productId = (products.body?.products || [])[0]?.id
ok("product_found", Boolean(productId), String(products.status))

async function manager() {
  return json(
    `${backend}/store/product-cloud/products/${encodeURIComponent(productId)}/manager`,
    { headers: hdr }
  )
}
async function patchInfo(body) {
  return json(
    `${backend}/store/product-cloud/products/${encodeURIComponent(productId)}/information`,
    {
      method: "PATCH",
      headers: hdr,
      body: JSON.stringify(body),
    }
  )
}
async function patchAttrs(pairs) {
  const mgr = await manager()
  const fields = mgr.body?.product?.schema || []
  const attributes = []
  for (const [code, value] of Object.entries(pairs)) {
    const field = fields.find((f) => f.code === code)
    if (field) attributes.push({ attribute_definition_id: field.id, value })
  }
  return patchInfo({ attributes })
}

if (productId && brandId) {
  const asBrand = await patchInfo({
    brand_id: brandId,
    brand_is_manufacturer: true,
  })
  ok("brand_is_manufacturer_saved", asBrand.status === 200, String(asBrand.status))
  const mgr = await manager()
  ok(
    "manufacturer_defaults_to_brand_profile",
    mgr.body?.product?.manufacturer_id === brandManufacturerId,
    String(mgr.body?.product?.manufacturer_id || "none")
  )
  const gpsrName = (mgr.body?.product?.schema || []).find(
    (f) => f.code === "gpsr_manufacturer_name"
  )?.value
  ok(
    "gpsr_name_equals_brand_name",
    gpsrName === brandName,
    String(gpsrName || "")
  )
  const euTier = (mgr.body?.product?.schema || []).find(
    (f) => f.code === "gpsr_eu_responsible_name"
  )?.requirement_tier
  ok(
    "eu_responsible_hidden_for_eu_brand_manufacturer",
    euTier === "not_applicable",
    String(euTier || "missing")
  )
}

if (productId && otherManufacturerId && brandId) {
  const exception = await patchInfo({
    brand_id: brandId,
    brand_is_manufacturer: false,
    manufacturer_id: otherManufacturerId,
  })
  ok("exception_manufacturer_saved", exception.status === 200, String(exception.status))
  const mgr = await manager()
  ok(
    "exception_keeps_other_manufacturer",
    mgr.body?.product?.manufacturer_id === otherManufacturerId,
    String(mgr.body?.product?.manufacturer_id || "none")
  )
  const usTier = (mgr.body?.product?.schema || []).find(
    (f) => f.code === "gpsr_eu_responsible_name"
  )?.requirement_tier
  ok(
    "eu_responsible_required_outside_eu",
    usTier === "compliance_required",
    String(usTier || "missing")
  )
  const restore = await patchInfo({
    brand_id: brandId,
    brand_is_manufacturer: true,
  })
  ok("restore_brand_as_manufacturer", restore.status === 200, String(restore.status))
  const mgr2 = await manager()
  ok(
    "restore_uses_brand_manufacturer_again",
    mgr2.body?.product?.manufacturer_id === brandManufacturerId,
    String(mgr2.body?.product?.manufacturer_id || "none")
  )
}

if (productId) {
  const dataNee = await patchAttrs({ collects_data: "Nee" })
  ok("datagebruik_nee_saved", dataNee.status === 200, String(dataNee.status))
  const docsNee = (await manager()).body?.product?.completeness?.documents || []
  ok(
    "datagebruik_nee_not_required",
    !docsNee.some((d) => d.code === "doc.data_usage" && d.required),
    JSON.stringify(docsNee.map((d) => `${d.code}:${d.required}`))
  )
  const dataJa = await patchAttrs({ collects_data: "Ja" })
  ok("datagebruik_ja_saved", dataJa.status === 200, String(dataJa.status))
  const docsJa = (await manager()).body?.product?.completeness?.documents || []
  ok(
    "datagebruik_ja_required",
    Boolean(docsJa.find((d) => d.code === "doc.data_usage")?.required),
    JSON.stringify(docsJa.map((d) => `${d.code}:${d.required}`))
  )
  await patchAttrs({ collects_data: "Nee" })
  const ceOff = await patchAttrs({ ce_marking: "Niet van toepassing" })
  ok("ce_not_visible_saved", ceOff.status === 200, String(ceOff.status))
  const docsCeOff = (await manager()).body?.product?.completeness?.documents || []
  ok(
    "ce_not_visible_not_required",
    !docsCeOff.some((d) => d.code === "doc.ce_marking" && d.required),
    JSON.stringify(docsCeOff.map((d) => `${d.code}:${d.required}`))
  )
  const ceOn = await patchAttrs({ ce_marking: "Zichtbaar" })
  ok("ce_visible_saved", ceOn.status === 200, String(ceOn.status))
  const docsCeOn = (await manager()).body?.product?.completeness?.documents || []
  ok(
    "ce_visible_required",
    Boolean(docsCeOn.find((d) => d.code === "doc.ce_marking")?.required),
    JSON.stringify(docsCeOn.map((d) => `${d.code}:${d.required}`))
  )
}

const locARes = await json(
  `${backend}/store/brands/${encodeURIComponent(brandId)}/facilities`,
  {
    method: "POST",
    headers: hdr,
    body: JSON.stringify({ country_code: "NL", name: "P213 Locatie A" }),
  }
)
const brandBRes = await json(`${backend}/store/brands`, {
  method: "POST",
  headers: hdr,
  body: JSON.stringify({ name: `P213 Merk B ${stamp}` }),
})
const brandB = brandBRes.body?.brand?.id
const locBRes = await json(
  `${backend}/store/brands/${encodeURIComponent(brandB)}/facilities`,
  {
    method: "POST",
    headers: hdr,
    body: JSON.stringify({ country_code: "DE", name: "P213 Locatie B" }),
  }
)
const locA = locARes.body?.facility?.id
const locB = locBRes.body?.facility?.id
ok("locations_created", Boolean(locA && locB), String(locARes.status))

if (productId && locA && locB) {
  const assignA = await json(
    `${backend}/store/product-cloud/products/${encodeURIComponent(productId)}/made-in-europe`,
    {
      method: "POST",
      headers: hdr,
      body: JSON.stringify({ production_facility_id: locA }),
    }
  )
  ok("assign_brand_location", assignA.status === 200, String(assignA.status))
  const cross = await json(
    `${backend}/store/product-cloud/products/${encodeURIComponent(productId)}/made-in-europe`,
    {
      method: "POST",
      headers: hdr,
      body: JSON.stringify({ production_facility_id: locB }),
    }
  )
  ok(
    "reject_other_brand_location",
    cross.status === 400 || cross.status === 403,
    String(cross.status)
  )
  const mie = await json(
    `${backend}/store/product-cloud/products/${encodeURIComponent(productId)}/made-in-europe`,
    { headers: hdr }
  )
  ok(
    "location_persists_after_refresh",
    mie.body?.facility?.id === locA,
    String(mie.body?.facility?.id || "none")
  )
}

if (productId) {
  const sharedUrl = `https://example.com/p213-shared-${stamp}.jpg`
  const ev = await json(
    `${backend}/store/product-cloud/products/${encodeURIComponent(productId)}/made-in-europe/evidence`,
    {
      method: "POST",
      headers: hdr,
      body: JSON.stringify({
        storage_reference: sharedUrl,
        document_type: "photo",
        evidence_kind: "made_in_europe",
        file_name: "p213-shared.jpg",
        mime_type: "image/jpeg",
        file_size_bytes: 2048,
      }),
    }
  )
  ok(
    "unified_upload_pending",
    (ev.status === 200 || ev.status === 201) &&
      (ev.body?.evidence?.verification_status === "pending" ||
        ev.body?.evidence?.status === "pending"),
    `${ev.status} ${ev.body?.evidence?.verification_status || ""}`
  )
  const afterEv = await manager()
  const docs = afterEv.body?.product?.completeness?.documents || []
  const mieDoc = docs.find((d) => d.code === "doc.made_in_europe")
  const ceDoc = docs.find((d) => d.code === "doc.ce_marking")
  ok(
    "one_document_covers_mie_and_ce",
    Boolean(mieDoc?.present) && Boolean(ceDoc?.present),
    JSON.stringify(docs.map((d) => `${d.code}:${d.present}:${d.status}`))
  )
  ok(
    "shared_document_stays_pending",
    mieDoc?.status === "pending_review" && ceDoc?.status === "pending_review",
    `mie=${String(mieDoc?.status)} ce=${String(ceDoc?.status)}`
  )
  const evidenceId = ev.body?.evidence?.id
  if (evidenceId) {
    const selfApprove = await json(
      `${backend}/admin/product-cloud/products/${encodeURIComponent(productId)}/evidence/${encodeURIComponent(evidenceId)}/review`,
      {
        method: "POST",
        headers: hdr,
        body: JSON.stringify({ status: "approved" }),
      }
    )
    ok(
      "seller_cannot_self_approve",
      selfApprove.status === 401 ||
        selfApprove.status === 403 ||
        selfApprove.status === 404,
      String(selfApprove.status)
    )
  } else {
    ok("seller_cannot_self_approve", false, "no evidence id")
  }
}

const pdp = readFileSync("apps/web/app/seller/products/[id]/page.tsx", "utf8")
const evidenceUi = readFileSync(
  "apps/web/app/seller/_components/compliance-evidence-section.tsx",
  "utf8"
)
ok("ui_combined_heading", pdp.includes("pdpMadeInEuropeCompliance"), "source-check")
ok(
  "ui_compliance_after_recommended",
  pdp.indexOf('"pdpTierRecommendedInfo"') > -1 &&
    pdp.indexOf('id="section-compliance"') >
      pdp.indexOf('"pdpTierRecommendedInfo"') &&
    pdp.indexOf('id="section-compliance"') ===
      pdp.lastIndexOf('id="section-compliance"') &&
    (pdp.match(/pdpMadeInEuropeCompliance/g) || []).length >= 1,
  "source-check"
)
ok(
  "ui_brand_is_manufacturer_checkbox",
  pdp.includes("pdpBrandIsNotManufacturer"),
  "source-check"
)
ok("ui_checkbox_default_off", pdp.includes("checked={brandIsNotManufacturer}"), "source-check")
ok(
  "ui_no_separate_mie_evidence_section",
  !pdp.includes('title="Made in Europe-bewijs"'),
  "source-check"
)
ok("ui_no_separate_ce_evidence_section", !pdp.includes('title="CE-bewijs"'), "source-check")
ok(
  "ui_unified_evidence_section",
  evidenceUi.includes("evHeading"),
  "source-check"
)
ok("ui_compact_thumbs", evidenceUi.includes("h-16 w-16"), "source-check")
ok("ui_gpsr_link", pdp.includes("pdpGpsrLink") && pdp.includes('href="/seller/gpsr"'), "source-check")
ok("ui_no_infographic", !pdp.includes("Infografic"), "source-check")
ok("ui_no_gpsr_block", !pdp.includes("GPSR / productveiligheid"), "source-check")
ok(
  "ui_manufacturer_stacked",
  pdp.includes("pdpManufacturer") &&
    pdp.includes("pdpAddress"),
  "source-check"
)

const failed = results.filter((r) => r.pass === false)
console.log(`\n${results.filter((r) => r.pass).length}/${results.length} passed`)
if (failed.length) {
  for (const f of failed) console.log(` - ${f.name}: ${f.detail}`)
  process.exit(1)
}
