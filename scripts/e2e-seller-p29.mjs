/**
 * P2.9 — Made in Europe / GPSR productdetail persistence + compact UX.
 * node scripts/e2e-seller-p29.mjs
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

const createdM = await json(`${backend}/store/partner/manufacturers`, {
  method: "POST",
  headers: hdr,
  body: JSON.stringify({
    name: `P29 Fabrikant ${Date.now()}`,
    street: "Kalverstraat",
    house_number: "1",
    postal_code: "1012NX",
    city: "Amsterdam",
    country_code: "NL",
    contact_email: `p29-${Date.now()}@example.com`,
  }),
})
const manufacturerId = createdM.body?.manufacturer?.id
ok(
  "manufacturer_create_200",
  createdM.status === 200 && Boolean(manufacturerId),
  `${createdM.status} ${createdM.body?.message || ""}`.trim()
)

const listM = await json(`${backend}/store/partner/manufacturers`, { headers: hdr })
ok(
  "manufacturer_list_contains_created",
  listM.status === 200 &&
    (listM.body?.manufacturers || []).some((m) => m.id === manufacturerId),
  String(listM.status)
)

const products = await json(`${backend}/store/product-cloud/products`, {
  headers: hdr,
})
const product = (products.body?.products || [])[0]
const productId = product?.id
ok("product_found", Boolean(productId), String(products.status))

if (productId && manufacturerId) {
  const patchManu = await json(
    `${backend}/store/product-cloud/products/${encodeURIComponent(productId)}/information`,
    {
      method: "PATCH",
      headers: hdr,
      body: JSON.stringify({ manufacturer_id: manufacturerId }),
    }
  )
  ok("product_link_manufacturer", patchManu.status === 200, String(patchManu.status))
}

const brandName = `P29 Merk ${Date.now()}`
const createdBrand = await json(`${backend}/store/brands`, {
  method: "POST",
  headers: hdr,
  body: JSON.stringify({ name: brandName }),
})
const brandId = createdBrand.body?.brand?.id
ok("brand_create_200", createdBrand.status === 200 && Boolean(brandId), String(createdBrand.status))

const locA = await json(`${backend}/store/brands/${encodeURIComponent(brandId)}/facilities`, {
  method: "POST",
  headers: hdr,
  body: JSON.stringify({ country_code: "NL", name: "P29 Locatie A" }),
})
const locB = await json(`${backend}/store/brands/${encodeURIComponent(brandId)}/facilities`, {
  method: "POST",
  headers: hdr,
  body: JSON.stringify({ country_code: "DE", name: "P29 Locatie B" }),
})
const facilityA = locA.body?.facility?.id
const facilityB = locB.body?.facility?.id
ok("location_a_created", locA.status === 200 && Boolean(facilityA), String(locA.status))
ok("location_b_created", locB.status === 200 && Boolean(facilityB), String(locB.status))

if (productId && brandId && facilityA) {
  const bulk = await json(`${backend}/store/product-cloud/products/bulk-brand-location`, {
    method: "POST",
    headers: hdr,
    body: JSON.stringify({
      product_ids: [productId],
      brand_id: brandId,
      production_facility_id: facilityA,
    }),
  })
  ok("product_link_brand_location", bulk.status === 200, String(bulk.status))

  const mie = await json(
    `${backend}/store/product-cloud/products/${encodeURIComponent(productId)}/made-in-europe`,
    { headers: hdr }
  )
  ok(
    "product_detail_shows_location_after_reload",
    mie.status === 200 && mie.body?.facility?.id === facilityA,
    String(mie.body?.facility?.id || "none")
  )

  const evidence = await json(
    `${backend}/store/product-cloud/products/${encodeURIComponent(productId)}/made-in-europe/evidence`,
    { headers: hdr }
  )
  ok(
    "evidence_payload_includes_facility",
    evidence.status === 200 && evidence.body?.facility?.id === facilityA,
    String(evidence.body?.facility?.id || "none")
  )

  const listed = await json(
    `${backend}/store/brands/${encodeURIComponent(brandId)}/facilities/${encodeURIComponent(facilityA)}/products`,
    { headers: hdr }
  )
  ok(
    "brand_overview_shows_same_product",
    listed.status === 200 &&
      (listed.body?.products || []).some((p) => p.id === productId),
    String(listed.body?.count ?? listed.status)
  )

  const reassign = await json(
    `${backend}/store/product-cloud/products/${encodeURIComponent(productId)}/made-in-europe`,
    {
      method: "POST",
      headers: hdr,
      body: JSON.stringify({ production_facility_id: facilityB }),
    }
  )
  ok("location_change_200", reassign.status === 200, String(reassign.status))

  const mie2 = await json(
    `${backend}/store/product-cloud/products/${encodeURIComponent(productId)}/made-in-europe`,
    { headers: hdr }
  )
  ok(
    "location_change_persists_after_refresh",
    mie2.status === 200 && mie2.body?.facility?.id === facilityB,
    String(mie2.body?.facility?.id || "none")
  )

  const listedB = await json(
    `${backend}/store/brands/${encodeURIComponent(brandId)}/facilities/${encodeURIComponent(facilityB)}/products`,
    { headers: hdr }
  )
  ok(
    "brand_overview_follows_new_location",
    listedB.status === 200 &&
      (listedB.body?.products || []).some((p) => p.id === productId),
    String(listedB.body?.count ?? listedB.status)
  )

  const deactivate = await json(
    `${backend}/store/brands/${encodeURIComponent(brandId)}/facilities/${encodeURIComponent(facilityA)}`,
    { method: "DELETE", headers: hdr }
  )
  ok(
    "deactivate_location_soft_delete",
    deactivate.status === 200 && deactivate.body?.is_active === false,
    String(deactivate.status)
  )

  const brandDetail = await json(
    `${backend}/store/brands/${encodeURIComponent(brandId)}`,
    { headers: hdr }
  )
  const deactivated = (brandDetail.body?.facilities || []).find((f) => f.id === facilityA)
  ok(
    "deactivated_location_still_in_db",
    Boolean(deactivated) && deactivated.is_active !== true,
    `present=${Boolean(deactivated)} is_active=${String(deactivated?.is_active)}`
  )

  const stillLinked = await json(
    `${backend}/store/product-cloud/products/${encodeURIComponent(productId)}/made-in-europe`,
    { headers: hdr }
  )
  ok(
    "existing_link_not_corrupted_after_deactivate_other",
    stillLinked.body?.facility?.id === facilityB,
    String(stillLinked.body?.facility?.id || "none")
  )

  const ev1 = await json(
    `${backend}/store/product-cloud/products/${encodeURIComponent(productId)}/made-in-europe/evidence`,
    {
      method: "POST",
      headers: hdr,
      body: JSON.stringify({
        storage_reference: "https://example.com/p29-mie-1.jpg",
        document_type: "photo",
        evidence_kind: "made_in_europe",
        file_name: "p29-mie-1.jpg",
        mime_type: "image/jpeg",
        file_size_bytes: 2048,
      }),
    }
  )
  const ev2 = await json(
    `${backend}/store/product-cloud/products/${encodeURIComponent(productId)}/made-in-europe/evidence`,
    {
      method: "POST",
      headers: hdr,
      body: JSON.stringify({
        storage_reference: "https://example.com/p29-mie-2.jpg",
        document_type: "photo",
        evidence_kind: "made_in_europe",
        file_name: "p29-mie-2.jpg",
        mime_type: "image/jpeg",
        file_size_bytes: 2048,
      }),
    }
  )
  ok("mie_evidence_upload_1", ev1.status === 201 || ev1.status === 200, String(ev1.status))
  ok("mie_evidence_upload_2_multiple_allowed", ev2.status === 201 || ev2.status === 200, String(ev2.status))

  const ceDoc = await json(
    `${backend}/store/product-cloud/products/${encodeURIComponent(productId)}/made-in-europe/evidence`,
    {
      method: "POST",
      headers: hdr,
      body: JSON.stringify({
        storage_reference: "https://example.com/p29-ce.jpg",
        document_type: "photo",
        evidence_kind: "ce_marking",
        file_name: "p29-ce.jpg",
        mime_type: "image/jpeg",
        file_size_bytes: 2048,
      }),
    }
  )
  ok("compliance_document_upload", ceDoc.status === 201 || ceDoc.status === 200, String(ceDoc.status))

  const evidenceId = ev1.body?.evidence?.id
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
      selfApprove.status === 401 || selfApprove.status === 403 || selfApprove.status === 404,
      String(selfApprove.status)
    )
  } else {
    ok("seller_cannot_self_approve", false, "no evidence id")
  }

  const manager = await json(
    `${backend}/store/product-cloud/products/${encodeURIComponent(productId)}/manager`,
    { headers: hdr }
  )
  const docs = manager.body?.product?.completeness?.documents || []
  const ceDocGate = docs.find((d) => d.code === "doc.ce_marking" || d.kind === "ce_marking")
  const dataDocGate = docs.find((d) => d.code === "doc.data_usage" || d.kind === "data_usage")
  const attrs = manager.body?.product?.schema || []
  const ceValue = attrs.find((f) => f.code === "ce_marking")?.value
  const dataValue = attrs.find((f) => f.code === "collects_data")?.value
  ok(
    "ce_evidence_required_only_when_visible",
    ceValue === "Zichtbaar" ? Boolean(ceDocGate?.required) : !ceDocGate || ceDocGate.required !== true,
    `ce=${ceValue || "empty"} required=${String(ceDocGate?.required)}`
  )
  ok(
    "data_doc_required_only_when_yes",
    dataValue === "Ja" ? Boolean(dataDocGate?.required) : !dataDocGate || dataDocGate.required !== true,
    `data=${dataValue || "empty"} required=${String(dataDocGate?.required)}`
  )
  const publishable = manager.body?.product?.completeness?.publishable
  const pubStatus = manager.body?.product?.publication_status
  ok(
    "incomplete_not_auto_publishable",
    publishable === false ||
      pubStatus !== "Gepubliceerd" ||
      manager.body?.product?.completeness?.information_quality !== "complete",
    `publishable=${String(publishable)} status=${String(pubStatus)}`
  )
}

const pdp = readFileSync("apps/web/app/seller/products/[id]/page.tsx", "utf8")
ok("ui_compact_mie_overview", pdp.includes("pdpMieStatus"), "source-check")
ok("ui_gpsr_link", pdp.includes("pdpGpsrLink"), "source-check")
ok("ui_compliance_section", pdp.includes("EU Compliance"), "source-check")
const evidenceUi = readFileSync(
  "apps/web/app/seller/_components/compliance-evidence-section.tsx",
  "utf8"
)
ok("ui_evidence_compact_grid", evidenceUi.includes("tablet:grid-cols-4"), "source-check")
const brandsUi = readFileSync("apps/web/app/seller/brands/page.tsx", "utf8")
ok("ui_inline_facility_edit", brandsUi.includes("FacilityForm"), "source-check")
ok("ui_deactivate_label", brandsUi.includes("Deactiveren"), "source-check")

const gates = readFileSync(
  "apps/backend/src/modules/product-cloud/compliance-gates.ts",
  "utf8"
)
ok("ce_required_logic_unchanged", gates.includes('opts.ceValue === "Zichtbaar"'), "source-check")
ok("data_required_logic_unchanged", gates.includes('opts.collectsData === "Ja"'), "source-check")

const failed = results.filter((r) => !r.pass)
console.log(`\n${results.filter((r) => r.pass).length}/${results.length} passed`)
if (failed.length) {
  for (const f of failed) console.log(` - ${f.name}: ${f.detail}`)
  process.exit(1)
}
