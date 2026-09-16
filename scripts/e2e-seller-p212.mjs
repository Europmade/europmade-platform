/**
 * P2.12 — GPSR / EU Compliance / Made in Europe herontwerp.
 * node scripts/e2e-seller-p212.mjs
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
const createdEu = await json(`${backend}/store/partner/manufacturers`, {
  method: "POST",
  headers: hdr,
  body: JSON.stringify({
    name: `P212 Fabrikant EU ${stamp}`,
    street: "Keizersgracht",
    house_number: "21",
    postal_code: "1015CJ",
    city: "Amsterdam",
    country_code: "NL",
    contact_email: `p212-eu-${stamp}@example.com`,
    contact_phone: "+31207654321",
  }),
})
const euManufacturerId = createdEu.body?.manufacturer?.id
ok(
  "eu_manufacturer_create",
  createdEu.status === 200 && Boolean(euManufacturerId),
  `${createdEu.status} ${createdEu.body?.message || ""}`.trim()
)

const createdUs = await json(`${backend}/store/partner/manufacturers`, {
  method: "POST",
  headers: hdr,
  body: JSON.stringify({
    name: `P212 Fabrikant US ${stamp}`,
    street: "Market Street",
    house_number: "1",
    postal_code: "94103",
    city: "San Francisco",
    country_code: "US",
    contact_email: `p212-us-${stamp}@example.com`,
  }),
})
const usManufacturerId = createdUs.body?.manufacturer?.id
ok(
  "non_eu_manufacturer_create",
  createdUs.status === 200 && Boolean(usManufacturerId),
  `${createdUs.status} ${createdUs.body?.message || ""}`.trim()
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
async function patchAttrs(pairs) {
  const mgr = await manager()
  const fields = mgr.body?.product?.schema || []
  const attributes = []
  for (const [code, value] of Object.entries(pairs)) {
    const field = fields.find((f) => f.code === code)
    if (field) attributes.push({ attribute_definition_id: field.id, value })
  }
  return json(
    `${backend}/store/product-cloud/products/${encodeURIComponent(productId)}/information`,
    {
      method: "PATCH",
      headers: hdr,
      body: JSON.stringify({ attributes }),
    }
  )
}

if (productId && euManufacturerId) {
  const linked = await json(
    `${backend}/store/product-cloud/products/${encodeURIComponent(productId)}/information`,
    {
      method: "PATCH",
      headers: hdr,
      body: JSON.stringify({ manufacturer_id: euManufacturerId }),
    }
  )
  ok(
    "select_eu_manufacturer",
    linked.status === 200,
    String(linked.status)
  )
  const mgr = await manager()
  ok(
    "manufacturer_id_persists",
    mgr.body?.product?.manufacturer_id === euManufacturerId,
    String(mgr.body?.product?.manufacturer_id || "none")
  )
  const schema = mgr.body?.product?.schema || []
  const gpsrName = schema.find((f) => f.code === "gpsr_manufacturer_name")?.value
  ok(
    "manufacturer_data_from_profile",
    gpsrName === `P212 Fabrikant EU ${stamp}`,
    String(gpsrName || "")
  )
  const gpsrAddress = schema.find((f) => f.code === "gpsr_manufacturer_address")?.value
  ok(
    "manufacturer_address_from_profile",
    gpsrAddress === "Keizersgracht 21",
    String(gpsrAddress || "")
  )
  const euNameTier = schema.find((f) => f.code === "gpsr_eu_responsible_name")
    ?.requirement_tier
  ok(
    "eu_responsible_not_required_when_manufacturer_in_eu",
    euNameTier === "not_applicable",
    String(euNameTier || "missing")
  )
  const missing = mgr.body?.product?.completeness?.missing_required || []
  ok(
    "eu_responsible_not_in_missing_when_eu_manufacturer",
    !missing.some((m) => String(m.code || "").startsWith("gpsr_eu_responsible")),
    JSON.stringify(missing.filter((m) => String(m.code || "").includes("gpsr")).map((m) => m.code))
  )
  const euNameValue = schema.find((f) => f.code === "gpsr_eu_responsible_name")
    ?.value
  ok(
    "eu_responsible_not_copied_from_manufacturer",
    (euNameValue || "") !== `P212 Fabrikant EU ${stamp}`,
    String(euNameValue || "")
  )
}

if (productId && usManufacturerId) {
  const linkedUs = await json(
    `${backend}/store/product-cloud/products/${encodeURIComponent(productId)}/information`,
    {
      method: "PATCH",
      headers: hdr,
      body: JSON.stringify({ manufacturer_id: usManufacturerId }),
    }
  )
  ok(
    "select_non_eu_manufacturer",
    linkedUs.status === 200,
    String(linkedUs.status)
  )
  const mgrUs = await manager()
  const usTier = (mgrUs.body?.product?.schema || []).find(
    (f) => f.code === "gpsr_eu_responsible_name"
  )?.requirement_tier
  ok(
    "eu_responsible_required_when_manufacturer_outside_eu",
    usTier === "compliance_required",
    String(usTier || "missing")
  )
}

if (productId && euManufacturerId) {
  const restore = await json(
    `${backend}/store/product-cloud/products/${encodeURIComponent(productId)}/information`,
    {
      method: "PATCH",
      headers: hdr,
      body: JSON.stringify({ manufacturer_id: euManufacturerId }),
    }
  )
  ok("restore_eu_manufacturer", restore.status === 200, String(restore.status))
  const renamed = await json(
    `${backend}/store/partner/manufacturers/${encodeURIComponent(euManufacturerId)}`,
    {
      method: "PATCH",
      headers: hdr,
      body: JSON.stringify({ name: `P212 Fabrikant EU hernoemd ${stamp}` }),
    }
  )
  ok("manufacturer_profile_update", renamed.status === 200, String(renamed.status))
  const mgr2 = await manager()
  const gpsrName2 = (mgr2.body?.product?.schema || []).find(
    (f) => f.code === "gpsr_manufacturer_name"
  )?.value
  ok(
    "linked_product_shows_updated_manufacturer",
    gpsrName2 === `P212 Fabrikant EU hernoemd ${stamp}`,
    String(gpsrName2 || "")
  )
  ok(
    "manufacturer_id_unchanged_after_profile_edit",
    mgr2.body?.product?.manufacturer_id === euManufacturerId,
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

const brandARes = await json(`${backend}/store/brands`, {
  method: "POST",
  headers: hdr,
  body: JSON.stringify({ name: `P212 Merk A ${stamp}` }),
})
const brandBRes = await json(`${backend}/store/brands`, {
  method: "POST",
  headers: hdr,
  body: JSON.stringify({ name: `P212 Merk B ${stamp}` }),
})
const brandA = brandARes.body?.brand?.id
const brandB = brandBRes.body?.brand?.id
const locARes = await json(
  `${backend}/store/brands/${encodeURIComponent(brandA)}/facilities`,
  {
    method: "POST",
    headers: hdr,
    body: JSON.stringify({ country_code: "NL", name: "P212 Locatie A" }),
  }
)
const locBRes = await json(
  `${backend}/store/brands/${encodeURIComponent(brandB)}/facilities`,
  {
    method: "POST",
    headers: hdr,
    body: JSON.stringify({ country_code: "DE", name: "P212 Locatie B" }),
  }
)
const locA = locARes.body?.facility?.id
const locB = locBRes.body?.facility?.id
ok(
  "brand_locations_created",
  Boolean(brandA && brandB && locA && locB),
  String(locARes.status)
)

if (productId && brandA && locA && locB) {
  const setBrand = await json(
    `${backend}/store/product-cloud/products/${encodeURIComponent(productId)}/information`,
    {
      method: "PATCH",
      headers: hdr,
      body: JSON.stringify({ brand_id: brandA }),
    }
  )
  ok("product_brand_a", setBrand.status === 200, String(setBrand.status))
  const assignA = await json(
    `${backend}/store/product-cloud/products/${encodeURIComponent(productId)}/made-in-europe`,
    {
      method: "POST",
      headers: hdr,
      body: JSON.stringify({ production_facility_id: locA }),
    }
  )
  ok("assign_location_a", assignA.status === 200, String(assignA.status))
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
  const sharedUrl = `https://example.com/p212-shared-${stamp}.jpg`
  const evMie = await json(
    `${backend}/store/product-cloud/products/${encodeURIComponent(productId)}/made-in-europe/evidence`,
    {
      method: "POST",
      headers: hdr,
      body: JSON.stringify({
        storage_reference: sharedUrl,
        document_type: "photo",
        evidence_kind: "made_in_europe",
        file_name: "p212-shared.jpg",
        mime_type: "image/jpeg",
        file_size_bytes: 2048,
      }),
    }
  )
  const evCe = await json(
    `${backend}/store/product-cloud/products/${encodeURIComponent(productId)}/made-in-europe/evidence`,
    {
      method: "POST",
      headers: hdr,
      body: JSON.stringify({
        storage_reference: sharedUrl,
        document_type: "photo",
        evidence_kind: "ce_marking",
        file_name: "p212-shared.jpg",
        mime_type: "image/jpeg",
        file_size_bytes: 2048,
      }),
    }
  )
  ok(
    "shared_url_can_support_multiple_kinds",
    (evMie.status === 200 || evMie.status === 201) &&
      (evCe.status === 200 || evCe.status === 201) &&
      evMie.body?.evidence?.id !== evCe.body?.evidence?.id,
    `${evMie.status}/${evCe.status}`
  )
  const mieStatus =
    evMie.body?.evidence?.verification_status || evMie.body?.evidence?.status
  const ceStatus =
    evCe.body?.evidence?.verification_status || evCe.body?.evidence?.status
  ok(
    "shared_upload_stays_pending",
    (mieStatus === "pending" || mieStatus === "pending_review") &&
      (ceStatus === "pending" || ceStatus === "pending_review"),
    `mie=${String(mieStatus)} ce=${String(ceStatus)}`
  )
  const evidenceId = evMie.body?.evidence?.id
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
const gpsrPage = readFileSync("apps/web/app/seller/gpsr/page.tsx", "utf8")
const evidenceUi = readFileSync(
  "apps/web/app/seller/_components/compliance-evidence-section.tsx",
  "utf8"
)
ok("ui_no_gpsr_block", !pdp.includes("GPSR / productveiligheid"), "source-check")
ok("ui_no_infographic_on_pdp", !pdp.includes("Infografic"), "source-check")
ok(
  "ui_gpsr_link_to_seller_gpsr",
  pdp.includes("pdpGpsrLink") && pdp.includes('href="/seller/gpsr"'),
  "source-check"
)
ok("ui_gpsr_page_keeps_infographic", gpsrPage.includes("Infografic"), "source-check")
ok(
  "ui_one_combined_heading",
  (pdp.match(/pdpMadeInEuropeCompliance/g) || []).length >= 1,
  String((pdp.match(/pdpMadeInEuropeCompliance/g) || []).length)
)
ok(
  "ui_manufacturer_under_dropdown",
  pdp.includes("pdpManufacturer") &&
    pdp.includes("pdpAddress") &&
    pdp.includes("pdpCountry") &&
    pdp.includes("pdpContact"),
  "source-check"
)
ok(
  "ui_manufacturer_not_right_aligned",
  !pdp.includes("manufacturerLines.country") ||
    pdp.includes("<dl className=\"space-y-1 text-[11px] text-wf-800\">"),
  "source-check"
)
ok(
  "ui_eu_responsible_only_when_needed",
  pdp.includes("needsSeparateEuOperator") &&
    pdp.includes("pdpEuResponsible"),
  "source-check"
)
ok(
  "ui_datagebruik_directly_under_question",
  pdp.includes("collects_data") &&
    (pdp.includes("pdpEvidenceDocuments") ||
      readFileSync(
        "apps/web/app/seller/_components/compliance-evidence-section.tsx",
        "utf8"
      ).includes("evHeading")),
  "source-check"
)
ok("ui_compact_evidence_grid", evidenceUi.includes("h-16 w-16"), "source-check")
ok(
  "ui_compact_object_contain",
  evidenceUi.includes("object-contain"),
  "source-check"
)
ok("ui_brand_before_location", pdp.includes("pdpSelectBrandFirst"), "source-check")
ok(
  "ui_single_save_in_combined_flow",
  pdp.includes("pdpSaving") && pdp.includes("commonSave"),
  "source-check"
)

const failed = results.filter((r) => r.pass === false)
console.log(`\n${results.filter((r) => r.pass).length}/${results.length} passed`)
if (failed.length) {
  for (const f of failed) console.log(` - ${f.name}: ${f.detail}`)
  process.exit(1)
}
