/**
 * P2 E2E — Product detail + offer edit + pause + multi-variant payload.
 * node scripts/e2e-seller-product-detail.mjs
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
ok("auth", !!token)

const hdr = {
  authorization: `Bearer ${token}`,
  "x-publishable-api-key": pubKey,
  "content-type": "application/json",
}

const stamp = Date.now().toString().slice(-10)
const ean1 = `874${stamp}`
const ean2 = `875${stamp}`
const sku = `SKU-P2-${stamp}`

const created = await json(`${backend}/store/product-cloud/products`, {
  method: "POST",
  headers: hdr,
  body: JSON.stringify({
    brand_id: "brand_e2e_p2",
    manufacturer_id: "mfr_e2e_p2",
    title: `P2 Detail Product ${stamp}`,
    description: "P2 detail",
    category_name: "Tuin",
    identifier_type: "GTIN",
    identifier_value: ean1,
    create_as_retailer: true,
    media: [
      {
        media_type: "Hoofdafbeelding",
        storage_reference: "https://example.com/p2.jpg",
      },
    ],
  }),
})
ok("1_create", created.status < 300 && !!created.body.product_id)
const productId = created.body.product_id

const detail1 = await json(
  `${backend}/store/product-cloud/products/${productId}/manager`,
  { headers: hdr }
)
ok("1_detail_load", detail1.status === 200 && detail1.body.product?.id === productId)
ok("2_own_product", detail1.body.product?.current_owner_seller_id)
const identifierId = detail1.body.product?.identifier_id
ok("11_ean_linked", !!identifierId && detail1.body.product?.identifier_value === ean1)

const upsert = await json(`${backend}/store/commerce-cloud/offers`, {
  method: "POST",
  headers: hdr,
  body: JSON.stringify({
    identifier_id: identifierId,
    region_code: "NL",
    quantity_available: 4,
    base_price: 99.5,
    shipping_cost: 5,
    seller_sku: sku,
    sales_status: "active",
    delivery_days_max: 3,
  }),
})
ok("4_offer_create", upsert.status < 300, String(upsert.status))
const offerId = upsert.body.offer_id

const patchPrice = await json(
  `${backend}/store/commerce-cloud/offers/${offerId}`,
  {
    method: "PATCH",
    headers: hdr,
    body: JSON.stringify({ base_price: 89.9 }),
  }
)
ok("5_price_patch", patchPrice.status < 300)

const patchStock = await json(
  `${backend}/store/commerce-cloud/offers/${offerId}`,
  {
    method: "PATCH",
    headers: hdr,
    body: JSON.stringify({ quantity_available: 11 }),
  }
)
ok("6_stock_patch", patchStock.status < 300)

const patchDelivery = await json(
  `${backend}/store/commerce-cloud/offers/${offerId}`,
  {
    method: "PATCH",
    headers: hdr,
    body: JSON.stringify({ delivery_days_max: 5 }),
  }
)
ok("7_delivery_patch", patchDelivery.status < 300)

const pause = await json(`${backend}/store/commerce-cloud/offers/${offerId}`, {
  method: "PATCH",
  headers: hdr,
  body: JSON.stringify({ sales_status: "paused" }),
})
ok("8_pause", pause.status < 300)

const afterPause = await json(
  `${backend}/store/product-cloud/products/${productId}/manager`,
  { headers: hdr }
)
ok(
  "12_publication_separate",
  afterPause.body.product?.publication_status !== "paused" &&
    (afterPause.body.product?.offer?.sales_status === "paused" ||
      afterPause.body.product?.offers?.sales_status === "paused"),
  `pub=${afterPause.body.product?.publication_status} sales=${afterPause.body.product?.offer?.sales_status}`
)
ok(
  "13_completeness",
  typeof afterPause.body.product?.completeness?.information_quality === "string",
  String(afterPause.body.product?.completeness?.information_quality)
)

const resume = await json(`${backend}/store/commerce-cloud/offers/${offerId}`, {
  method: "PATCH",
  headers: hdr,
  body: JSON.stringify({ sales_status: "active" }),
})
ok("9_resume", resume.status < 300)

// Multi-variant: add second variant + identifier via SQL (architecture check)
const variantId = `pvar_p2_${stamp}`
const iden2 = `iden_p2_${stamp}`
try {
  psql(`
INSERT INTO pc_product_variant (id, product_id, variant_type, variant_value, created_at, updated_at, deleted_at)
VALUES ('${variantId}', '${productId}', 'Vermogen', '1000 m2', now(), now(), NULL);
INSERT INTO identifier (id, product_variant_id, identifier_type, identifier_value, created_at, updated_at, deleted_at)
VALUES ('${iden2}', '${variantId}', 'GTIN', '${ean2}', now(), now(), NULL);
`)
  ok("10_multi_variant_seed", true)
} catch (e) {
  ok("10_multi_variant_seed", false, String(e.message || e))
}

const multi = await json(
  `${backend}/store/product-cloud/products/${productId}/manager`,
  { headers: hdr }
)
ok(
  "10_multi_variant_payload",
  (multi.body.product?.variants || []).length >= 2,
  `variants=${multi.body.product?.variants?.length}`
)
const v2 = (multi.body.product?.variants || []).find((v) => v.id === variantId)
ok(
  "11_variant_ean_offer_shape",
  !!v2 &&
    (v2.identifiers || []).some((i) => i.identifier_value === ean2) &&
    Array.isArray(v2.offers),
  `ean=${v2?.identifiers?.[0]?.identifier_value}`
)

// Foreign product access
let foreignProduct = ""
try {
  foreignProduct = psql(`
SELECT id FROM pc_product
WHERE current_owner_seller_id <> (
  SELECT current_owner_seller_id FROM pc_product WHERE id='${productId}'
)
AND deleted_at IS NULL
LIMIT 1;
`)
} catch {
  foreignProduct = ""
}
if (foreignProduct) {
  const deny = await json(
    `${backend}/store/product-cloud/products/${foreignProduct}/manager`,
    { headers: hdr }
  )
  ok("3_foreign_denied", deny.status === 403 || deny.status === 400 || deny.status === 404, String(deny.status))
} else {
  const deny = await json(
    `${backend}/store/product-cloud/products/prod_not_yours_p2/manager`,
    { headers: hdr }
  )
  ok("3_foreign_denied", deny.status >= 400, String(deny.status))
}

const health = await fetch(`${backend}/health`).then((r) => r.status)
ok("health", health === 200)

const failed = results.filter((r) => !r.pass).length
console.log(
  `---\nPASSED=${results.length - failed} FAILED=${failed} TOTAL=${results.length}`
)
process.exit(failed ? 1 : 0)
