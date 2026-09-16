/**
 * P2 correction smoke — promo price, bulk GPSR, media URL, price history.
 * node scripts/e2e-seller-p2-correction.mjs
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

const promoCol = psql(`
SELECT count(*) FROM information_schema.columns
WHERE table_name='cc_price' AND column_name='promo_price';
`)
ok("migration_promo_column", promoCol === "1", `count=${promoCol}`)

const stamp = String(Date.now()).slice(-10)
const ean = `872${stamp}`.slice(0, 13)

const create = await json(`${backend}/store/product-cloud/products`, {
  method: "POST",
  headers: hdr,
  body: JSON.stringify({
    brand_id: "brand_e2e_p2c",
    manufacturer_id: "mfr_e2e_p2c",
    title: `P2C Product ${stamp}`,
    description: "P2 correction smoke",
    category_name: "Huishouden",
    identifier_type: "GTIN",
    identifier_value: ean,
    create_as_retailer: true,
  }),
})
const productId = create.body.product_id
ok("create_product", create.status < 300 && !!productId, String(create.status))

if (!productId) {
  console.log(JSON.stringify(create.body).slice(0, 500))
  const failed = results.filter((r) => !r.pass).length
  console.log(`---\nPASSED=${results.length - failed} FAILED=${failed}`)
  process.exit(1)
}

const mgr = await json(
  `${backend}/store/product-cloud/products/${productId}/manager`,
  { headers: hdr }
)
ok("manager_load", mgr.status === 200, String(mgr.status))
const identifierId = mgr.body?.product?.identifier_id
ok("identifier", Boolean(identifierId), String(identifierId || "missing"))

const offer = await json(`${backend}/store/commerce-cloud/offers`, {
  method: "POST",
  headers: hdr,
  body: JSON.stringify({
    identifier_id: identifierId,
    region_code: "NL",
    quantity_available: 5,
    base_price: 249,
    shipping_cost: 4.95,
    seller_sku: `SKU-P2C-${stamp}`,
    sales_status: "active",
    delivery_days_max: 3,
  }),
})
const offerId = offer.body.offer_id
ok("offer_create", offer.status < 300 && Boolean(offerId), String(offer.status))

const starts = new Date(Date.now() - 60_000).toISOString()
const ends = new Date(Date.now() + 7 * 24 * 3600_000).toISOString()
const promoPatch = await json(
  `${backend}/store/commerce-cloud/offers/${offerId}`,
  {
    method: "PATCH",
    headers: hdr,
    body: JSON.stringify({
      promo_price: 199,
      promo_starts_at: starts,
      promo_ends_at: ends,
    }),
  }
)
ok(
  "promo_patch",
  promoPatch.status < 300,
  `${promoPatch.status} ${JSON.stringify(promoPatch.body).slice(0, 200)}`
)

const mgr2 = await json(
  `${backend}/store/product-cloud/products/${productId}/manager`,
  { headers: hdr }
)
const offerView = mgr2.body?.product?.offer || mgr2.body?.product?.offers
const promoPrice = offerView?.promo_price
const effective = offerView?.effective_unit_price ?? offerView?.unit_price
ok(
  "promo_active_in_manager",
  Number(promoPrice) === 199 || Number(effective) === 199,
  `promo=${promoPrice} effective=${effective}`
)

const changes =
  mgr2.body?.product?.field_changes || mgr2.body?.field_changes || []
const hasPriceChange = changes.some((c) => {
  const code = `${c.field_code || ""} ${c.field_path || ""} ${c.attribute_code || ""}`
  return /price|promo|shipping/i.test(code)
})
ok(
  "price_history_logged",
  changes.length > 0 && hasPriceChange,
  `changes=${changes.length} priceRelated=${hasPriceChange}`
)

const bulkNoConfirm = await json(
  `${backend}/store/product-cloud/products/bulk-information`,
  {
    method: "POST",
    headers: hdr,
    body: JSON.stringify({
      product_ids: [productId],
      attributes: [{ code: "gpsr_manufacturer_name", value: "Acme BV" }],
    }),
  }
)
ok(
  "bulk_requires_confirm",
  bulkNoConfirm.status >= 400,
  String(bulkNoConfirm.status)
)

const bulkOk = await json(
  `${backend}/store/product-cloud/products/bulk-information`,
  {
    method: "POST",
    headers: hdr,
    body: JSON.stringify({
      product_ids: [productId],
      confirm: true,
      attributes: [
        { code: "gpsr_manufacturer_name", value: `Acme ${stamp}` },
        {
          code: "gpsr_manufacturer_address",
          value: "Industrieweg 1, Amsterdam",
        },
        { code: "gpsr_manufacturer_country", value: "NL" },
        { code: "gpsr_manufacturer_email", value: "compliance@acme.example" },
      ],
      reason: "P2C bulk GPSR smoke",
    }),
  }
)
ok(
  "bulk_gpsr",
  bulkOk.status < 300,
  `${bulkOk.status} ${JSON.stringify(bulkOk.body).slice(0, 240)}`
)

const bulkBrand = await json(
  `${backend}/store/product-cloud/products/bulk-information`,
  {
    method: "POST",
    headers: hdr,
    body: JSON.stringify({
      product_ids: [productId],
      confirm: true,
      attributes: [{ code: "brand", value: "Hacked" }],
    }),
  }
)
ok("bulk_rejects_brand", bulkBrand.status >= 400, String(bulkBrand.status))

const mediaUrl =
  "https://www.google.com/images/branding/googlelogo/1x/googlelogo_color_272x92dp.png"
const mediaAdd = await json(
  `${backend}/store/product-cloud/products/${productId}/media`,
  {
    method: "POST",
    headers: hdr,
    body: JSON.stringify({
      storage_reference: mediaUrl,
      media_type: "Overige afbeelding",
    }),
  }
)
ok(
  "media_url_add",
  mediaAdd.status < 300,
  `${mediaAdd.status} ${JSON.stringify(mediaAdd.body).slice(0, 240)}`
)

const mediaBad = await json(
  `${backend}/store/product-cloud/products/${productId}/media`,
  {
    method: "POST",
    headers: hdr,
    body: JSON.stringify({
      storage_reference: "https://example.invalid/does-not-exist-xyz.jpg",
      media_type: "Overige afbeelding",
    }),
  }
)
ok("media_bad_url_rejected", mediaBad.status >= 400, String(mediaBad.status))

const mgr3 = await json(
  `${backend}/store/product-cloud/products/${productId}/manager`,
  { headers: hdr }
)
const media = mgr3.body?.product?.media || mgr3.body?.media || []
ok("media_visible", media.length >= 1, `n=${media.length}`)

const mediaId = media[media.length - 1]?.id
if (mediaId) {
  const setPrimary = await json(
    `${backend}/store/product-cloud/products/${productId}/media/${mediaId}`,
    {
      method: "PATCH",
      headers: hdr,
      body: JSON.stringify({ media_type: "Hoofdafbeelding" }),
    }
  )
  ok("media_set_primary", setPrimary.status < 300, String(setPrimary.status))
} else {
  ok("media_set_primary", false, "no media id")
}

const translations = await json(
  `${backend}/store/product-cloud/products/${productId}/translations`,
  { headers: hdr }
)
ok("translations_api", translations.status < 300, String(translations.status))

const passed = results.filter((r) => r.pass).length
const failed = results.filter((r) => !r.pass).length
console.log("---")
console.log(`PASSED=${passed} FAILED=${failed} TOTAL=${results.length}`)
process.exit(failed > 0 ? 1 : 0)
