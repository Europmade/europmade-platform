/**
 * Product Cloud checkpoint — seller create → submit → admin approve → catalog.
 * Uses live APIs only (no listing-products seed).
 * node scripts/e2e-pc-publish-chain.mjs
 */
import { execFileSync } from "node:child_process"
import { createHmac } from "node:crypto"
import { readFileSync } from "node:fs"

const backend = process.env.BACKEND_URL || "http://localhost:9000"
const web = process.env.WEB_URL || "http://localhost:3000"
const pubKey = readFileSync("apps/web/.env.local", "utf8")
  .match(/NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=(.*)/)[1]
  .trim()
const email =
  process.env.SELLER_EMAIL || "seller-flow-20260804144242@example.com"
const password = process.env.SELLER_PASSWORD || "REDACTED_SELLER_PASSWORD"
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin-e2e@example.com"
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "REDACTED_ADMIN_PASSWORD"

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
  results.push({ name, pass: Boolean(pass), detail })
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
ok("auth_seller", !!token)
if (!token) process.exit(1)

const hdr = {
  authorization: `Bearer ${token}`,
  "x-publishable-api-key": pubKey,
  "content-type": "application/json",
}

const stamp = Date.now().toString().slice(-10)
const ean = `874${stamp}`
const sku = `SKU-PCC-${stamp}`
const title = `PC Checkpoint ${stamp}`

const manufacturer = await json(`${backend}/store/partner/manufacturers`, {
  method: "POST",
  headers: hdr,
  body: JSON.stringify({
    name: `E2E MFR ${stamp}`,
    street: "Kalverstraat",
    house_number: "1",
    postal_code: "1011AB",
    city: "Amsterdam",
    country_code: "NL",
    contact_email: `mfr-${stamp}@example.com`,
  }),
})
ok(
  "create_manufacturer",
  manufacturer.status < 300 && !!manufacturer.body.manufacturer?.id,
  `status=${manufacturer.status}`
)
const manufacturerId = manufacturer.body.manufacturer?.id
if (!manufacturerId) {
  console.log(JSON.stringify(manufacturer.body).slice(0, 400))
  process.exit(1)
}

const created = await json(`${backend}/store/product-cloud/products`, {
  method: "POST",
  headers: hdr,
  body: JSON.stringify({
    brand_id: "brand_e2e_p1b",
    manufacturer_id: manufacturerId,
    title,
    description: "Checkpoint publish chain",
    category_name: "Tuin",
    identifier_type: "GTIN",
    identifier_value: ean,
    create_as_retailer: true,
    media: [
      {
        media_type: "Hoofdafbeelding",
        storage_reference: "https://example.com/pc-checkpoint.jpg",
      },
    ],
  }),
})
ok(
  "create_product",
  created.status < 300 && !!created.body.product_id,
  `status=${created.status}`
)
const productId = created.body.product_id
if (!productId) {
  console.log(JSON.stringify(created.body).slice(0, 400))
  process.exit(1)
}

let manager = await json(
  `${backend}/store/product-cloud/products/${productId}/manager`,
  { headers: hdr }
)
ok("manager_load", manager.status === 200)
const identifierId = manager.body.product?.identifier_id
const versionId = manager.body.product?.version_id
ok("identifier", !!identifierId)
ok("version_id", !!versionId)
ok(
  "category_present",
  (manager.body.product?.category_names || []).length > 0 ||
    (manager.body.product?.categories || []).length > 0,
  JSON.stringify(manager.body.product?.category_names || manager.body.product?.categories)
)

const schema = manager.body.product?.schema || []
function fillValue(f) {
  const code = f.code || f.attribute_code
  if (code === "ce_marking") return "Niet van toepassing"
  if (code === "collects_data") return "Nee"
  if (code === "app_required") return "Nee"
  if (f.data_type === "Keuzelijst" && Array.isArray(f.option_values) && f.option_values[0]) {
    return f.option_values[0]
  }
  if (f.data_type === "Numeriek") return "100"
  if (code?.includes("email") || code?.includes("contact")) return "e2e@example.com"
  if (code?.includes("country")) return "NL"
  if (code?.includes("postal")) return "1011AB Amsterdam"
  if (code?.includes("address")) return "Kalverstraat 1"
  return "E2E checkpoint"
}
const attrs = schema
  .filter((f) => {
    const code = f.code || ""
    if (String(code).startsWith("gpsr_")) return false
    const tier = f.requirement_tier || f.tier
    return (
      tier === "category_required" ||
      tier === "compliance_required" ||
      f.is_required === true
    )
  })
  .map((f) => ({
    attribute_definition_id: f.id || f.attribute_definition_id,
    value: fillValue(f),
  }))
  .filter((a) => a.attribute_definition_id)
ok("required_schema_fields", attrs.length > 0, `attrs=${attrs.length} schema=${schema.length}`)

const patched = await json(
  `${backend}/store/product-cloud/products/${productId}/information`,
  {
    method: "PATCH",
    headers: hdr,
    body: JSON.stringify({
      title,
      manufacturer_id: manufacturerId,
      attributes: attrs,
      reason: "PC checkpoint completeness",
    }),
  }
)
ok("patch_information", patched.status < 300, String(patched.status))

const upsert = await json(`${backend}/store/commerce-cloud/offers`, {
  method: "POST",
  headers: hdr,
  body: JSON.stringify({
    identifier_id: identifierId,
    region_code: "NL",
    quantity_available: 5,
    base_price: 29.9,
    shipping_cost: 2.5,
    seller_sku: sku,
    sales_status: "active",
    delivery_days_max: 3,
  }),
})
ok("offer_upsert", upsert.status < 300, String(upsert.status))

manager = await json(
  `${backend}/store/product-cloud/products/${productId}/manager`,
  { headers: hdr }
)
const completeness = manager.body.product?.completeness
const blocked = completeness?.publication_blocked_reasons || []
ok(
  "publishable",
  completeness?.publishable === true,
  blocked.join("; ") || String(completeness?.publishable)
)

const submit = await json(
  `${backend}/store/product-cloud/products/${productId}/versions/${versionId}/submit`,
  { method: "POST", headers: hdr, body: "{}" }
)
ok(
  "submit",
  submit.status < 300,
  `status=${submit.status} ${JSON.stringify(submit.body)?.slice(0, 180)}`
)

const adminLogin = await json(`${backend}/auth/user/emailpass`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
})
const adminToken = adminLogin.body?.token
ok("auth_admin", !!adminToken, `status=${adminLogin.status}`)

const adminHdr = {
  authorization: `Bearer ${adminToken}`,
  "content-type": "application/json",
}

const sellerOnAdmin = await json(
  `${backend}/admin/product-cloud/products?limit=1`,
  { headers: { authorization: `Bearer ${token}` } }
)
ok(
  "security_seller_no_admin",
  sellerOnAdmin.status === 401,
  `status=${sellerOnAdmin.status}`
)

const approve = await json(
  `${backend}/admin/product-cloud/products/${productId}/approval`,
  {
    method: "POST",
    headers: adminHdr,
    body: JSON.stringify({ decision: "approved" }),
  }
)
ok(
  "admin_approve",
  approve.status < 300,
  `status=${approve.status} ${JSON.stringify(approve.body)?.slice(0, 220)}`
)

const catalog = await json(
  `${backend}/store/catalog/products?q=${encodeURIComponent(title)}&limit=24`,
  { headers: { "x-publishable-api-key": pubKey } }
)
const catalogHit = (catalog.body?.products || []).find((p) => p.id === productId)
ok(
  "catalog_finds_published",
  catalog.status === 200 && !!catalogHit,
  `status=${catalog.status} count=${catalog.body?.products?.length}`
)

const catalogDetail = await json(
  `${backend}/store/catalog/products/${productId}?region_code=NL`,
  { headers: { "x-publishable-api-key": pubKey } }
)
ok(
  "catalog_pdp_api",
  catalogDetail.status === 200 &&
    (catalogDetail.body?.id === productId ||
      catalogDetail.body?.product?.id === productId),
  `status=${catalogDetail.status}`
)

try {
  const pdp = await fetch(`${web}/product/${productId}`, {
    headers: { accept: "text/html" },
  })
  const html = await pdp.text()
  ok(
    "storefront_pdp_html",
    pdp.status === 200 && html.includes(title),
    `status=${pdp.status} hasTitle=${html.includes(title)}`
  )
} catch (e) {
  ok("storefront_pdp_html", false, e.message)
}

const health = await json(`${backend}/health`)
ok("health", health.status === 200)

const failed = results.filter((r) => !r.pass)
console.log(`\nPC publish chain: ${results.length - failed.length}/${results.length} passed`)
if (failed.length) {
  console.log("FAILED:")
  for (const f of failed) console.log(`  - ${f.name}: ${f.detail}`)
}
process.exit(failed.length ? 1 : 0)
