/**
 * P2.10 — Made in Europe / Compliance UX + brand–productielocatie koppeling.
 * node scripts/e2e-seller-p210.mjs
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
const brandARes = await json(`${backend}/store/brands`, {
  method: "POST",
  headers: hdr,
  body: JSON.stringify({ name: `P210 Merk A ${stamp}` }),
})
const brandBRes = await json(`${backend}/store/brands`, {
  method: "POST",
  headers: hdr,
  body: JSON.stringify({ name: `P210 Merk B ${stamp}` }),
})
const brandA = brandARes.body?.brand?.id
const brandB = brandBRes.body?.brand?.id
ok("brand_a_created", brandARes.status === 200 && Boolean(brandA), String(brandARes.status))
ok("brand_b_created", brandBRes.status === 200 && Boolean(brandB), String(brandBRes.status))

const locARes = await json(`${backend}/store/brands/${encodeURIComponent(brandA)}/facilities`, {
  method: "POST",
  headers: hdr,
  body: JSON.stringify({ country_code: "NL", name: "P210 Locatie A" }),
})
const locA2Res = await json(`${backend}/store/brands/${encodeURIComponent(brandA)}/facilities`, {
  method: "POST",
  headers: hdr,
  body: JSON.stringify({ country_code: "DE", name: "P210 Locatie A2" }),
})
const locBRes = await json(`${backend}/store/brands/${encodeURIComponent(brandB)}/facilities`, {
  method: "POST",
  headers: hdr,
  body: JSON.stringify({ country_code: "FR", name: "P210 Locatie B" }),
})
const locA = locARes.body?.facility?.id
const locA2 = locA2Res.body?.facility?.id
const locB = locBRes.body?.facility?.id
ok("location_a_created", locARes.status === 200 && Boolean(locA), String(locARes.status))
ok("location_b_created", locBRes.status === 200 && Boolean(locB), String(locBRes.status))

const products = await json(`${backend}/store/product-cloud/products`, { headers: hdr })
const productId = (products.body?.products || [])[0]?.id
ok("product_found", Boolean(productId), String(products.status))

async function manager() {
  return json(
    `${backend}/store/product-cloud/products/${encodeURIComponent(productId)}/manager`,
    { headers: hdr }
  )
}
async function mieGet() {
  return json(
    `${backend}/store/product-cloud/products/${encodeURIComponent(productId)}/made-in-europe`,
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
async function assignLoc(facilityId) {
  return json(
    `${backend}/store/product-cloud/products/${encodeURIComponent(productId)}/made-in-europe`,
    {
      method: "POST",
      headers: hdr,
      body: JSON.stringify({ production_facility_id: facilityId }),
    }
  )
}
async function patchAttrs(pairs) {
  const mgr = await manager()
  const schema = mgr.body?.product?.schema || []
  const attributes = []
  for (const [code, value] of Object.entries(pairs)) {
    const field = schema.find((f) => f.code === code)
    if (field) attributes.push({ attribute_definition_id: field.id, value })
  }
  return patchInfo({ attributes })
}

if (productId && brandA && locA && locB && brandB) {
  const brandADetail = await json(
    `${backend}/store/brands/${encodeURIComponent(brandA)}`,
    { headers: hdr }
  )
  const aFacilities = brandADetail.body?.facilities || []
  ok(
    "brand_a_locations_only_own",
    aFacilities.some((f) => f.id === locA) && !aFacilities.some((f) => f.id === locB),
    `count=${aFacilities.length}`
  )

  const setBrandA = await patchInfo({ brand_id: brandA })
  ok("product_brand_a_200", setBrandA.status === 200, String(setBrandA.status))

  const assignA = await assignLoc(locA)
  ok("assign_brand_a_location_a", assignA.status === 200, String(assignA.status))

  const afterA = await mieGet()
  ok(
    "product_keeps_location_a_after_refresh",
    afterA.status === 200 && afterA.body?.facility?.id === locA,
    String(afterA.body?.facility?.id || "none")
  )
  ok(
    "facility_payload_includes_brand",
    afterA.body?.facility?.brand_id === brandA,
    String(afterA.body?.facility?.brand_id || "none")
  )

  const cross = await assignLoc(locB)
  ok(
    "reject_brand_b_location_on_brand_a_product",
    cross.status === 400 || cross.status === 403,
    String(cross.status)
  )

  const stillA = await mieGet()
  ok(
    "mismatch_does_not_change_existing_link",
    stillA.body?.facility?.id === locA,
    String(stillA.body?.facility?.id || "none")
  )

  const switchBrand = await patchInfo({ brand_id: brandB })
  ok("switch_brand_b_200", switchBrand.status === 200, String(switchBrand.status))
  const afterSwitch = await mieGet()
  ok(
    "brand_change_invalidates_other_brand_location",
    !afterSwitch.body?.facility?.id || afterSwitch.body.facility.id !== locA,
    String(afterSwitch.body?.facility?.id || "cleared")
  )

  const assignB = await assignLoc(locB)
  ok("assign_brand_b_location_b", assignB.status === 200, String(assignB.status))
  const afterB = await mieGet()
  ok(
    "new_brand_location_persists",
    afterB.body?.facility?.id === locB,
    String(afterB.body?.facility?.id || "none")
  )

  const bulkMismatch = await json(
    `${backend}/store/product-cloud/products/bulk-brand-location`,
    {
      method: "POST",
      headers: hdr,
      body: JSON.stringify({
        product_ids: [productId],
        brand_id: brandA,
        production_facility_id: locB,
      }),
    }
  )
  ok(
    "bulk_rejects_location_of_other_brand",
    bulkMismatch.status === 400 || bulkMismatch.status === 403,
    String(bulkMismatch.status)
  )

  const bulkOk = await json(
    `${backend}/store/product-cloud/products/bulk-brand-location`,
    {
      method: "POST",
      headers: hdr,
      body: JSON.stringify({
        product_ids: [productId],
        brand_id: brandA,
        production_facility_id: locA,
      }),
    }
  )
  ok("bulk_brand_location_persists", bulkOk.status === 200, String(bulkOk.status))
  const afterBulk = await mieGet()
  ok(
    "bulk_result_after_refresh",
    afterBulk.body?.facility?.id === locA,
    String(afterBulk.body?.facility?.id || "none")
  )

  const dataNee = await patchAttrs({ collects_data: "Nee" })
  ok("datagebruik_nee_saved", dataNee.status === 200, String(dataNee.status))
  const mgrNee = await manager()
  const docsNee = mgrNee.body?.product?.completeness?.documents || []
  ok(
    "datagebruik_nee_document_not_required",
    !docsNee.some((d) => d.code === "doc.data_usage" && d.required),
    JSON.stringify(docsNee.map((d) => d.code))
  )

  const dataJa = await patchAttrs({ collects_data: "Ja" })
  ok("datagebruik_ja_saved", dataJa.status === 200, String(dataJa.status))
  const mgrJa = await manager()
  const docsJa = mgrJa.body?.product?.completeness?.documents || []
  const dataGate = docsJa.find((d) => d.code === "doc.data_usage")
  ok(
    "datagebruik_ja_document_required",
    Boolean(dataGate?.required),
    `required=${String(dataGate?.required)} status=${String(dataGate?.status)}`
  )

  const ceOff = await patchAttrs({ ce_marking: "Niet van toepassing" })
  ok("ce_not_visible_saved", ceOff.status === 200, String(ceOff.status))
  const mgrCeOff = await manager()
  const docsCeOff = mgrCeOff.body?.product?.completeness?.documents || []
  ok(
    "ce_not_visible_evidence_not_required",
    !docsCeOff.some((d) => d.code === "doc.ce_marking" && d.required),
    JSON.stringify(docsCeOff.map((d) => d.code))
  )

  const ceOn = await patchAttrs({ ce_marking: "Zichtbaar" })
  ok("ce_visible_saved", ceOn.status === 200, String(ceOn.status))
  const mgrCeOn = await manager()
  const docsCeOn = mgrCeOn.body?.product?.completeness?.documents || []
  const ceGate = docsCeOn.find((d) => d.code === "doc.ce_marking")
  ok(
    "ce_visible_evidence_required",
    Boolean(ceGate?.required),
    `required=${String(ceGate?.required)} status=${String(ceGate?.status)}`
  )

  const ev1 = await json(
    `${backend}/store/product-cloud/products/${encodeURIComponent(productId)}/made-in-europe/evidence`,
    {
      method: "POST",
      headers: hdr,
      body: JSON.stringify({
        storage_reference: "https://example.com/p210-mie-1.jpg",
        document_type: "photo",
        evidence_kind: "made_in_europe",
        file_name: "p210-mie-1.jpg",
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
        storage_reference: "https://example.com/p210-mie-2.jpg",
        document_type: "photo",
        evidence_kind: "made_in_europe",
        file_name: "p210-mie-2.jpg",
        mime_type: "image/jpeg",
        file_size_bytes: 2048,
      }),
    }
  )
  ok("mie_evidence_upload_1", ev1.status === 201 || ev1.status === 200, String(ev1.status))
  ok("mie_evidence_upload_2", ev2.status === 201 || ev2.status === 200, String(ev2.status))
  const evidenceId = ev1.body?.evidence?.id
  const evStatus = ev1.body?.evidence?.verification_status
  ok(
    "evidence_starts_pending",
    evStatus === "pending" || evStatus === "pending_review",
    String(evStatus)
  )
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

  const deactivateA2 = await json(
    `${backend}/store/brands/${encodeURIComponent(brandA)}/facilities/${encodeURIComponent(locA2)}`,
    { method: "DELETE", headers: hdr }
  )
  ok(
    "deactivate_unused_location",
    deactivateA2.status === 200 && deactivateA2.body?.is_active === false,
    String(deactivateA2.status)
  )
  const assignInactiveNew = await assignLoc(locA2)
  ok(
    "deactivated_location_not_selectable_for_new_link",
    assignInactiveNew.status === 400 || assignInactiveNew.status === 403,
    String(assignInactiveNew.status)
  )

  const deactivateCurrent = await json(
    `${backend}/store/brands/${encodeURIComponent(brandA)}/facilities/${encodeURIComponent(locA)}`,
    { method: "DELETE", headers: hdr }
  )
  ok("deactivate_current_location", deactivateCurrent.status === 200, String(deactivateCurrent.status))
  const stillLinked = await mieGet()
  ok(
    "existing_deactivated_link_remains",
    stillLinked.body?.facility?.id === locA,
    String(stillLinked.body?.facility?.id || "none")
  )
  const keepExisting = await assignLoc(locA)
  ok(
    "existing_deactivated_link_can_be_resaved",
    keepExisting.status === 200,
    String(keepExisting.status)
  )
}

const pdp = readFileSync("apps/web/app/seller/products/[id]/page.tsx", "utf8")
ok("ui_brand_select_on_product_detail", pdp.includes("pdpSelectBrandFirst"), "source-check")
ok("ui_datagebruik_choice", pdp.includes("Verwerkt dit product gegevens van gebruikers?"), "source-check")
ok("ui_no_route_change_for_location", !pdp.includes('href="/seller/brands"') || pdp.includes("pdpUnsavedConfirm"), "source-check")
const evidenceUi = readFileSync(
  "apps/web/app/seller/_components/compliance-evidence-section.tsx",
  "utf8"
)
ok("ui_compact_thumbs", evidenceUi.includes("h-16 w-16") && evidenceUi.includes("object-contain"), "source-check")
ok("ui_not_required_status", evidenceUi.includes("evNotRequired"), "source-check")
ok("ui_no_auto_approve_copy", evidenceUi.includes("evAutoReviewHint"), "source-check")
const productsPage = readFileSync("apps/web/app/seller/products/page.tsx", "utf8")
ok("ui_bulk_dutch", productsPage.includes("plBulkAction") && !productsPage.includes("Bulk apply"), "source-check")

const failed = results.filter((r) => !r.pass)
console.log(`\n${results.filter((r) => r.pass).length}/${results.length} passed`)
if (failed.length) {
  for (const f of failed) console.log(` - ${f.name}: ${f.detail}`)
  process.exit(1)
}
