/**
 * P2.8 — vereenvoudigd merk/productielocatiebeheer.
 * node scripts/e2e-seller-p28.mjs
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
    ["exec", "-i", "europmade-postgres", "psql", "-U", "europmade", "-d", "europmade", "-t", "-A", "-c", sql],
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
  headers: { "content-type": "application/json", "x-publishable-api-key": pubKey },
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
  const verify = await json(`${backend}/store/mfa/challenges/${challenge.body.challenge.id}/verify`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-publishable-api-key": pubKey,
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ code: totp(secret) }),
  })
  token = verify.body.token
}
const hdr = {
  "content-type": "application/json",
  "x-publishable-api-key": pubKey,
  authorization: `Bearer ${token}`,
}

const health = await json(`${backend}/health`, {})
ok("health_200", health.status === 200, String(health.status))

const createdBrandName = `P28 Merk ${Date.now()}`
const createBrand = await json(`${backend}/store/brands`, {
  method: "POST",
  headers: hdr,
  body: JSON.stringify({ name: createdBrandName, intro: "P28 test merk" }),
})
const brandId = createBrand.body?.brand?.id
ok("brand_create_200", createBrand.status === 200 && Boolean(brandId), String(createBrand.status))

const renamed = `${createdBrandName} aangepast`
const renameBrand = await json(`${backend}/store/brands/${encodeURIComponent(brandId)}`, {
  method: "PATCH",
  headers: hdr,
  body: JSON.stringify({ name: renamed, intro: "P28 intro aangepast" }),
})
ok("brand_rename_200", renameBrand.status === 200, String(renameBrand.status))

const brandList = await json(`${backend}/store/brands`, { headers: hdr })
ok(
  "brand_persisted_after_reload",
  brandList.status === 200 &&
    (brandList.body?.brands || []).some((b) => b.id === brandId && b.name === renamed),
  String(brandList.status)
)

const createFacility = await json(`${backend}/store/brands/${encodeURIComponent(brandId)}/facilities`, {
  method: "POST",
  headers: hdr,
  body: JSON.stringify({ country_code: "NL" }),
})
const facilityId = createFacility.body?.facility?.id
ok("facility_country_only_200", createFacility.status === 200 && Boolean(facilityId), String(createFacility.status))

const products = await json(`${backend}/store/product-cloud/products`, { headers: hdr })
const selectedProducts = (products.body?.products || []).slice(0, 3).map((p) => p.id).filter(Boolean)
ok("products_selected_for_bulk", selectedProducts.length >= 1, String(selectedProducts.length))

if (selectedProducts.length >= 1 && brandId && facilityId) {
  const bulk = await json(`${backend}/store/product-cloud/products/bulk-brand-location`, {
    method: "POST",
    headers: hdr,
    body: JSON.stringify({
      product_ids: selectedProducts,
      brand_id: brandId,
      production_facility_id: facilityId,
    }),
  })
  ok("bulk_brand_location_200", bulk.status === 200, String(bulk.status))

  const verifyOne = await json(
    `${backend}/store/product-cloud/products/${encodeURIComponent(selectedProducts[0])}/made-in-europe`,
    { headers: hdr }
  )
  ok(
    "product_location_persisted_after_refresh",
    verifyOne.status === 200 && verifyOne.body?.facility?.id === facilityId,
    String(verifyOne.body?.facility?.id || "none")
  )
}

const facProducts = await json(
  `${backend}/store/brands/${encodeURIComponent(brandId)}/facilities/${encodeURIComponent(facilityId)}/products`,
  { headers: hdr }
)
ok("facility_products_list_200", facProducts.status === 200, String(facProducts.status))

const productsPageSource = readFileSync("apps/web/app/seller/products/page.tsx", "utf8")
ok("ui_bulk_merk_koppelen_present", productsPageSource.includes("Merk koppelen"), "source-check")
ok(
  "ui_bulk_apply_removed",
  !productsPageSource.includes("Bulk apply"),
  "source-check"
)
const brandsPageSource = readFileSync("apps/web/app/seller/brands/page.tsx", "utf8")
ok("ui_three_column_labels", brandsPageSource.includes("Merken") && brandsPageSource.includes("Productielocaties") && brandsPageSource.includes("Producten"), "source-check")

const failed = results.filter((r) => !r.pass)
console.log(`\n${results.filter((r) => r.pass).length}/${results.length} passed`)
if (failed.length) {
  for (const f of failed) console.log(` - ${f.name}: ${f.detail}`)
  process.exit(1)
}
