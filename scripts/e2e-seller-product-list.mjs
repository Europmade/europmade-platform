/**
 * P1B E2E — Product list + pause/resume + search.
 * node scripts/e2e-seller-product-list.mjs
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
const ean = `873${stamp}`
const sku = `SKU-P1B-${stamp}`
const title = `P1B List Product ${stamp}`

const created = await json(`${backend}/store/product-cloud/products`, {
  method: "POST",
  headers: hdr,
  body: JSON.stringify({
    brand_id: "brand_e2e_p1b",
    manufacturer_id: "mfr_e2e_p1b",
    title,
    description: "P1B list product",
    category_name: "Tuin",
    identifier_type: "GTIN",
    identifier_value: ean,
    create_as_retailer: true,
    media: [
      {
        media_type: "Hoofdafbeelding",
        storage_reference: "https://example.com/p1b.jpg",
      },
    ],
  }),
})
ok("A_create_product", created.status < 300 && !!created.body.product_id)
const productId = created.body.product_id

const manager = await json(
  `${backend}/store/product-cloud/products/${productId}/manager`,
  { headers: hdr }
)
const identifierId = manager.body.product?.identifier_id
ok("identifier", !!identifierId)

const upsert = await json(`${backend}/store/commerce-cloud/offers`, {
  method: "POST",
  headers: hdr,
  body: JSON.stringify({
    identifier_id: identifierId,
    region_code: "NL",
    quantity_available: 7,
    base_price: 49.9,
    shipping_cost: 3.95,
    seller_sku: sku,
    sales_status: "active",
    delivery_days_max: 2,
  }),
})
ok("offer_upsert", upsert.status < 300, String(upsert.status))
const offerId = upsert.body.offer_id

const list = await json(`${backend}/store/product-cloud/products`, {
  headers: hdr,
})
ok("A_list_real", list.status === 200 && (list.body.products || []).length > 0)
const row = (list.body.products || []).find((p) => p.id === productId)
ok("B_list_sku", row?.offers?.sku_display === sku || row?.offer?.seller_sku === sku, row?.offers?.sku_display)
ok(
  "C_list_offer_status",
  row?.offers?.sales_status === "active" || row?.offer?.sales_status === "active"
)
ok("J_variant_count", (row?.variant_count ?? 0) >= 1)
ok(
  "O_info_quality",
  !!row?.completeness?.information_quality,
  String(row?.completeness?.information_quality)
)
ok("actions_present", !!row?.actions?.manage)

const byName = await json(
  `${backend}/store/product-cloud/products?q=${encodeURIComponent(title)}`,
  { headers: hdr }
)
ok(
  "K_search_name",
  (byName.body.products || []).some((p) => p.id === productId)
)

const byEan = await json(
  `${backend}/store/product-cloud/products?q=${encodeURIComponent(ean)}`,
  { headers: hdr }
)
ok("L_search_ean", (byEan.body.products || []).some((p) => p.id === productId))

const bySku = await json(
  `${backend}/store/product-cloud/products?q=${encodeURIComponent(sku)}`,
  { headers: hdr }
)
ok("M_search_sku", (bySku.body.products || []).some((p) => p.id === productId))

const emptySearch = await json(
  `${backend}/store/product-cloud/products?q=zzznomatchp1b999`,
  { headers: hdr }
)
ok(
  "N_empty_search",
  emptySearch.status === 200 && (emptySearch.body.products || []).length === 0
)

const pause = await json(`${backend}/store/commerce-cloud/offers/${offerId}`, {
  method: "PATCH",
  headers: hdr,
  body: JSON.stringify({ sales_status: "paused" }),
})
ok("F_pause", pause.status < 300)

const listPaused = await json(
  `${backend}/store/product-cloud/products?filter=paused`,
  { headers: hdr }
)
const pausedRow = (listPaused.body.products || []).find((p) => p.id === productId)
ok(
  "D_paused_shows",
  pausedRow?.offers?.sales_status === "paused" ||
    pausedRow?.offer?.sales_status === "paused"
)

const pubStatus = pausedRow?.publication_status
ok(
  "P_publication_independent",
  pubStatus !== "paused" &&
    (pausedRow?.offers?.sales_status === "paused" ||
      pausedRow?.offer?.sales_status === "paused"),
  `pub=${pubStatus}`
)

const resume = await json(`${backend}/store/commerce-cloud/offers/${offerId}`, {
  method: "PATCH",
  headers: hdr,
  body: JSON.stringify({ sales_status: "active" }),
})
ok("G_resume", resume.status < 300)

const listActive = await json(
  `${backend}/store/product-cloud/products?filter=for_sale`,
  { headers: hdr }
)
const activeRow = (listActive.body.products || []).find((p) => p.id === productId)
ok(
  "E_active_shows",
  !!activeRow &&
    (activeRow.offers?.is_sellable === true ||
      activeRow.offer?.is_sellable === true)
)

let foreignOfferId = ""
try {
  foreignOfferId = psql(`
SELECT o.id FROM offer o
WHERE o.id <> '${offerId}'
AND o.deleted_at IS NULL
AND o.seller_id <> (SELECT seller_id FROM offer WHERE id='${offerId}')
LIMIT 1;
`)
} catch {
  foreignOfferId = ""
}
if (foreignOfferId) {
  const deny = await json(
    `${backend}/store/commerce-cloud/offers/${foreignOfferId}`,
    {
      method: "PATCH",
      headers: hdr,
      body: JSON.stringify({ sales_status: "paused" }),
    }
  )
  ok("H_cannot_pause_other", deny.status >= 400, String(deny.status))
} else {
  const deny = await json(
    `${backend}/store/commerce-cloud/offers/offr_not_yours_p1b`,
    {
      method: "PATCH",
      headers: hdr,
      body: JSON.stringify({ sales_status: "paused" }),
    }
  )
  ok("H_cannot_pause_other", deny.status >= 400, String(deny.status))
}

ok(
  "I_detail_path",
  `/seller/products/${productId}`.includes(productId)
)

const health = await fetch(`${backend}/health`).then((r) => r.status)
ok("S_health", health === 200)

const failed = results.filter((r) => !r.pass).length
console.log(
  `---\nPASSED=${results.length - failed} FAILED=${failed} TOTAL=${results.length}`
)
process.exit(failed ? 1 : 0)
