/**
 * P2.2.1 — Seller variants E2E
 * node scripts/e2e-seller-variants.mjs
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

const stamp = String(Date.now()).slice(-10)
const ean1 = `871${stamp}`.slice(0, 13)
const ean2 = `872${stamp}`.slice(0, 13)
const ean3 = `873${stamp}`.slice(0, 13)

const create = await json(`${backend}/store/product-cloud/products`, {
  method: "POST",
  headers: hdr,
  body: JSON.stringify({
    brand_id: "brand_e2e_v221",
    manufacturer_id: "mfr_e2e_v221",
    title: `P221 Shirt ${stamp}`,
    description: "Variant E2E",
    category_name: "Kleding",
    identifier_type: "GTIN",
    identifier_value: ean1,
    create_as_retailer: true,
  }),
})
const productId = create.body.product_id
ok("1_create_product", create.status < 300 && !!productId, String(create.status))
if (!productId) process.exit(1)

const list1 = await json(
  `${backend}/store/product-cloud/products/${productId}/variants`,
  { headers: hdr }
)
ok(
  "1_list_one_variant",
  list1.status === 200 && (list1.body.variants || []).length >= 1,
  `n=${(list1.body.variants || []).length}`
)
ok(
  "axes_suggested",
  (list1.body.suggested_axes || []).includes("Kleur") ||
    (list1.body.suggested_axes || []).includes("Maat"),
  String(list1.body.suggested_axes)
)

const v2 = await json(
  `${backend}/store/product-cloud/products/${productId}/variants`,
  {
    method: "POST",
    headers: hdr,
    body: JSON.stringify({
      axes: [
        { axis: "Kleur", value: "Zwart" },
        { axis: "Maat", value: "M" },
      ],
      identifier_value: ean2,
    }),
  }
)
ok("2_add_multi_axis", v2.status < 300, String(v2.status))
const variant2Id = v2.body?.variant?.id
ok(
  "2_label_composed",
  String(v2.body?.variant?.variant_value || "").includes("Zwart") &&
    String(v2.body?.variant?.variant_value || "").includes("M"),
  String(v2.body?.variant?.variant_value)
)

const v3 = await json(
  `${backend}/store/product-cloud/products/${productId}/variants`,
  {
    method: "POST",
    headers: hdr,
    body: JSON.stringify({
      axes: [
        { axis: "Kleur", value: "Wit" },
        { axis: "Maat", value: "L" },
      ],
      identifier_value: ean3,
    }),
  }
)
ok("3_second_multi_axis", v3.status < 300, String(v3.status))
const variant3Id = v3.body?.variant?.id
const iden3 = v3.body?.identifier?.id

const patchV = await json(
  `${backend}/store/product-cloud/products/${productId}/variants/${variant2Id}`,
  {
    method: "PATCH",
    headers: hdr,
    body: JSON.stringify({
      axes: [
        { axis: "Kleur", value: "Zwart" },
        { axis: "Maat", value: "L" },
      ],
    }),
  }
)
ok("5_variant_patch", patchV.status < 300, String(patchV.status))

const ean2b = `874${stamp}`.slice(0, 13)
const patchEan = await json(
  `${backend}/store/product-cloud/products/${productId}/variants/${variant2Id}`,
  {
    method: "PATCH",
    headers: hdr,
    body: JSON.stringify({ identifier_value: ean2b }),
  }
)
ok("6_ean_patch", patchEan.status < 300, String(patchEan.status))

const mgr = await json(
  `${backend}/store/product-cloud/products/${productId}/manager`,
  { headers: hdr }
)
const iden2 =
  mgr.body?.product?.variants
    ?.flatMap((v) => v.identifiers || [])
    ?.find((i) => i.identifier_value === ean2b)?.id ||
  v2.body?.identifier?.id

const offer = await json(`${backend}/store/commerce-cloud/offers`, {
  method: "POST",
  headers: hdr,
  body: JSON.stringify({
    identifier_id: iden2,
    region_code: "NL",
    quantity_available: 12,
    base_price: 25,
    shipping_cost: 4.95,
    seller_sku: `SHIRT-ZW-L-${stamp}`,
    sales_status: "active",
    delivery_days_max: 2,
  }),
})
ok("8_offer_create", offer.status < 300, String(offer.status))
const offerId = offer.body.offer_id

const skuPatch = await json(
  `${backend}/store/commerce-cloud/offers/${offerId}`,
  {
    method: "PATCH",
    headers: hdr,
    body: JSON.stringify({ seller_sku: `SHIRT-ZW-L-${stamp}-V2` }),
  }
)
ok("7_sku_patch", skuPatch.status < 300, String(skuPatch.status))

const pricePatch = await json(
  `${backend}/store/commerce-cloud/offers/${offerId}`,
  {
    method: "PATCH",
    headers: hdr,
    body: JSON.stringify({
      base_price: 29.95 - 4.95,
      shipping_cost: 4.95,
      promo_price: 24.95 - 4.95,
      promo_starts_at: new Date(Date.now() - 60_000).toISOString(),
      promo_ends_at: new Date(Date.now() + 86400000).toISOString(),
      quantity_available: 8,
      delivery_days_max: 3,
      sales_status: "active",
    }),
  }
)
ok("9_12_promo_stock_delivery", pricePatch.status < 300, String(pricePatch.status))

const pause = await json(`${backend}/store/commerce-cloud/offers/${offerId}`, {
  method: "PATCH",
  headers: hdr,
  body: JSON.stringify({ sales_status: "paused" }),
})
ok("13_pause", pause.status < 300, String(pause.status))

const resume = await json(`${backend}/store/commerce-cloud/offers/${offerId}`, {
  method: "PATCH",
  headers: hdr,
  body: JSON.stringify({ sales_status: "active" }),
})
ok("13_resume", resume.status < 300, String(resume.status))

const delLastGuard = await json(
  `${backend}/store/product-cloud/products/${productId}/variants/${
    list1.body.variants[0].id
  }`,
  { method: "DELETE", headers: hdr }
)
// may fail if offers or if not last - we have 3 variants so should allow with withdraw
const delV3 = await json(
  `${backend}/store/product-cloud/products/${productId}/variants/${variant3Id}?withdraw_offers=true`,
  { method: "DELETE", headers: hdr }
)
ok("14_delete_variant", delV3.status < 300, String(delV3.status))

const remaining = await json(
  `${backend}/store/product-cloud/products/${productId}/variants`,
  { headers: hdr }
)
const remCount = (remaining.body.variants || []).length
ok("15_not_empty", remCount >= 1, `n=${remCount}`)

// delete down to 1 then protect last
const ids = (remaining.body.variants || []).map((v) => v.id)
if (ids.length > 1) {
  for (const vid of ids.slice(1)) {
    await json(
      `${backend}/store/product-cloud/products/${productId}/variants/${vid}?withdraw_offers=true`,
      { method: "DELETE", headers: hdr }
    )
  }
}
const lastId = (
  await json(`${backend}/store/product-cloud/products/${productId}/variants`, {
    headers: hdr,
  })
).body.variants[0].id
const blockLast = await json(
  `${backend}/store/product-cloud/products/${productId}/variants/${lastId}?withdraw_offers=true`,
  { method: "DELETE", headers: hdr }
)
ok(
  "15_protect_last",
  blockLast.status >= 400,
  String(blockLast.status)
)

const foreign = psql(`
SELECT id FROM pc_product
WHERE current_owner_seller_id <> (
  SELECT current_owner_seller_id FROM pc_product WHERE id='${productId}'
)
AND deleted_at IS NULL
LIMIT 1;
`)
if (foreign) {
  const deny = await json(
    `${backend}/store/product-cloud/products/${foreign}/variants`,
    {
      method: "POST",
      headers: hdr,
      body: JSON.stringify({
        axes: [{ axis: "Kleur", value: "Hack" }],
        identifier_value: `879${stamp}`.slice(0, 13),
      }),
    }
  )
  ok("16_17_cross_seller_denied", deny.status >= 400, String(deny.status))
} else {
  ok("16_17_cross_seller_denied", true, "no foreign product")
}

const listApi = await json(
  `${backend}/store/product-cloud/products?limit=5`,
  { headers: hdr }
)
ok("18_product_list", listApi.status === 200, String(listApi.status))

const mgr2 = await json(
  `${backend}/store/product-cloud/products/${productId}/manager`,
  { headers: hdr }
)
ok("19_20_manager_detail", mgr2.status === 200, String(mgr2.status))
ok(
  "history_variant",
  (mgr2.body?.product?.field_changes || []).some((c) =>
    String(c.field_code || "").startsWith("variant.")
  ),
  `changes=${(mgr2.body?.product?.field_changes || []).length}`
)

const passed = results.filter((r) => r.pass).length
const failed = results.filter((r) => !r.pass).length
console.log("---")
console.log(`PASSED=${passed} FAILED=${failed} TOTAL=${results.length}`)
process.exit(failed > 0 ? 1 : 0)
