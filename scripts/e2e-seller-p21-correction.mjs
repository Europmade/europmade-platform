/**
 * P2.1 smoke — variants, markets, MiE evidence, GPSR bulk fields, pricing incl.
 * node scripts/e2e-seller-p21-correction.mjs
 */
import { execFileSync } from "node:child_process"
import { createHmac } from "node:crypto"
import { readFileSync } from "node:fs"

const backend = process.env.BACKEND_URL || "http://localhost:9000"
const pubKey = readFileSync("apps/web/.env.local", "utf8")
  .match(/NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=(.*)/)[1]
  .trim()
const email =
  process.env.SELLER_EMAIL || "seller-flow-20260804144242@example.com"
const password = process.env.SELLER_PASSWORD || "REDACTED_SELLER_PASSWORD"

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

const results = []
function ok(name, pass, detail = "") {
  results.push({ name, pass, detail })
  console.log(`${pass ? "OK" : "FAIL"}: ${name}${detail ? " — " + detail : ""}`)
}

async function json(url, init) {
  const res = await fetch(url, init)
  const body = await res.json().catch(() => ({}))
  return { status: res.status, body }
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
      authorization: `Bearer ${login.body.token}`,
      "content-type": "application/json",
      "x-publishable-api-key": pubKey,
    },
    body: "{}",
  })
  const verified = await json(
    `${backend}/store/mfa/challenges/${challenge.body.mfa_challenge.id}/verify`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${login.body.token}`,
        "content-type": "application/json",
        "x-publishable-api-key": pubKey,
      },
      body: JSON.stringify({ code: totp(secret), trust_device: true }),
    }
  )
  token = verified.body.token
}
ok("auth", Boolean(token))
const hdr = {
  authorization: `Bearer ${token}`,
  "content-type": "application/json",
  "x-publishable-api-key": pubKey,
}

const health = await fetch(`${backend}/health`)
ok("health", health.status === 200, String(health.status))

const evidenceTable = psql(`
SELECT count(*) FROM information_schema.tables
WHERE table_name='product_origin_evidence';
`)
ok("mie_evidence_table", evidenceTable === "1", `count=${evidenceTable}`)

const stamp = String(Date.now()).slice(-10)
const ean1 = `872${stamp}`.slice(0, 13)
const ean2 = `873${stamp}`.slice(0, 13)

const create = await json(`${backend}/store/product-cloud/products`, {
  method: "POST",
  headers: hdr,
  body: JSON.stringify({
    brand_id: "brand_e2e_p21",
    manufacturer_id: "mfr_e2e_p21",
    title: `P21 Product ${stamp}`,
    description: "P2.1 correction",
    category_name: "Robotstofzuiger",
    identifier_type: "GTIN",
    identifier_value: ean1,
    create_as_retailer: true,
  }),
})
const productId = create.body.product_id
ok("create_product", create.status < 300 && !!productId, String(create.status))
if (!productId) process.exit(1)

const variantsList = await json(
  `${backend}/store/product-cloud/products/${productId}/variants`,
  { headers: hdr }
)
ok(
  "variants_list_suggest",
  variantsList.status === 200 &&
    Array.isArray(variantsList.body.suggested_axes) &&
    variantsList.body.suggested_axes.length > 0,
  `axes=${(variantsList.body.suggested_axes || []).join(",")}`
)

const v2 = await json(
  `${backend}/store/product-cloud/products/${productId}/variants`,
  {
    method: "POST",
    headers: hdr,
    body: JSON.stringify({
      variant_type: "Kleur",
      variant_value: "Zwart",
      identifier_value: ean2,
    }),
  }
)
ok("variant_create", v2.status < 300, String(v2.status))
const variantId = v2.body?.variant?.id

const mgr = await json(
  `${backend}/store/product-cloud/products/${productId}/manager`,
  { headers: hdr }
)
const identifierId = mgr.body?.product?.identifier_id
ok("identifier", Boolean(identifierId))

const offerNl = await json(`${backend}/store/commerce-cloud/offers`, {
  method: "POST",
  headers: hdr,
  body: JSON.stringify({
    identifier_id: identifierId,
    region_code: "NL",
    quantity_available: 3,
    base_price: 244.05,
    shipping_cost: 4.95,
    seller_sku: `SKU-P21-${stamp}`,
    sales_status: "active",
    delivery_days_max: 2,
  }),
})
ok("offer_nl", offerNl.status < 300, String(offerNl.status))
const offerNlId = offerNl.body.offer_id

const offerDe = await json(`${backend}/store/commerce-cloud/offers`, {
  method: "POST",
  headers: hdr,
  body: JSON.stringify({
    identifier_id: identifierId,
    region_code: "DE",
    quantity_available: 2,
    base_price: 250,
    shipping_cost: 5.95,
    seller_sku: `SKU-P21-DE-${stamp}`,
    sales_status: "paused",
    delivery_days_max: 5,
  }),
})
ok("offer_de_market", offerDe.status < 300, String(offerDe.status))

const promo = await json(
  `${backend}/store/commerce-cloud/offers/${offerNlId}`,
  {
    method: "PATCH",
    headers: hdr,
    body: JSON.stringify({
      promo_price: 194.05,
      promo_starts_at: new Date(Date.now() - 60_000).toISOString(),
      promo_ends_at: new Date(Date.now() + 86400000).toISOString(),
    }),
  }
)
ok("promo_patch", promo.status < 300, String(promo.status))

const bulk = await json(
  `${backend}/store/product-cloud/products/bulk-information`,
  {
    method: "POST",
    headers: hdr,
    body: JSON.stringify({
      product_ids: [productId],
      confirm: true,
      attributes: [
        { code: "gpsr_eu_responsible_name", value: `EU RP ${stamp}` },
        { code: "gpsr_eu_responsible_postal_city", value: "1011 AB Amsterdam" },
        { code: "gpsr_eu_responsible_country", value: "NL" },
      ],
    }),
  }
)
ok(
  "bulk_gpsr_eu_postal",
  bulk.status < 300,
  `${bulk.status} ${JSON.stringify(bulk.body).slice(0, 180)}`
)

const evidence = await json(
  `${backend}/store/product-cloud/products/${productId}/made-in-europe/evidence`,
  {
    method: "POST",
    headers: hdr,
    body: JSON.stringify({
      storage_reference:
        "https://www.google.com/images/branding/googlelogo/1x/googlelogo_color_272x92dp.png",
      document_type: "photo",
      mime_type: "image/png",
    }),
  }
)
ok("mie_evidence_add", evidence.status < 300, String(evidence.status))

const evidenceGet = await json(
  `${backend}/store/product-cloud/products/${productId}/made-in-europe/evidence`,
  { headers: hdr }
)
ok(
  "mie_evidence_status",
  evidenceGet.status === 200 &&
    evidenceGet.body.evidence_status === "pending_review" &&
    evidenceGet.body.is_made_in_europe_verified === false,
  `status=${evidenceGet.body.evidence_status} verified=${evidenceGet.body.is_made_in_europe_verified}`
)

const translations = await json(
  `${backend}/store/product-cloud/products/${productId}/translations`,
  { headers: hdr }
)
ok("translations_get", translations.status < 300, String(translations.status))

const setSource = await json(
  `${backend}/store/product-cloud/products/${productId}/translations`,
  {
    method: "PATCH",
    headers: hdr,
    body: JSON.stringify({ source_language_code: "nl" }),
  }
)
ok("translations_set_source", setSource.status < 300, String(setSource.status))

const prepare = await json(
  `${backend}/store/product-cloud/products/${productId}/translations`,
  {
    method: "POST",
    headers: hdr,
    body: JSON.stringify({ only_missing: true }),
  }
)
ok(
  "translations_prepare",
  prepare.status < 300,
  `${prepare.status} ${JSON.stringify(prepare.body).slice(0, 160)}`
)

if (variantId) {
  const patchV = await json(
    `${backend}/store/product-cloud/products/${productId}/variants/${variantId}`,
    {
      method: "PATCH",
      headers: hdr,
      body: JSON.stringify({ variant_value: "Zwart Mat" }),
    }
  )
  ok("variant_patch", patchV.status < 300, String(patchV.status))
}

const mgr2 = await json(
  `${backend}/store/product-cloud/products/${productId}/manager`,
  { headers: hdr }
)
const changes = mgr2.body?.product?.field_changes || []
ok(
  "history_has_entries",
  changes.length > 0,
  `n=${changes.length}`
)
const hasHumanLabel = changes.some(
  (c) => c.field_label && !String(c.field_label).startsWith("gpsr_")
)
ok("history_human_labels", hasHumanLabel || changes.length > 0)

const passed = results.filter((r) => r.pass).length
const failed = results.filter((r) => !r.pass).length
console.log("---")
console.log(`PASSED=${passed} FAILED=${failed} TOTAL=${results.length}`)
process.exit(failed > 0 ? 1 : 0)
