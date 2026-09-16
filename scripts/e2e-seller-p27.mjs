/**
 * P2.7 — GPSR terminology + reusable manufacturers + production location UX/API.
 * node scripts/e2e-seller-p27.mjs
 */
import { createHmac } from "node:crypto"
import { readFileSync } from "node:fs"
import { execFileSync } from "node:child_process"

const backend = process.env.BACKEND_URL || "http://127.0.0.1:9000"
const web = process.env.WEB_URL || "http://127.0.0.1:3000"
const pubKey = readFileSync("apps/web/.env.local", "utf8")
  .match(/NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=(.*)/)[1]
  .trim()
const email =
  process.env.SELLER_EMAIL || "seller-flow-20260804144242@example.com"
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

async function json(url, init) {
  const res = await fetch(url, init)
  const body = await res.json().catch(() => ({}))
  return { status: res.status, body }
}

const results = []
function ok(name, pass, detail = "") {
  results.push({ name, pass, detail })
  console.log(`${pass ? "OK" : "FAIL"}: ${name}${detail ? " — " + detail : ""}`)
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

const account = await json(`${backend}/store/partner/account`, { headers: hdr })
ok("partner_account_200", account.status === 200, String(account.status))

const listM = await json(`${backend}/store/partner/manufacturers`, { headers: hdr })
ok("manufacturer_list_200", listM.status === 200, String(listM.status))

const stamp = `p27-manufacturer-${Date.now()}`
const createdM = await json(`${backend}/store/partner/manufacturers`, {
  method: "POST",
  headers: hdr,
  body: JSON.stringify({
    name: stamp,
    street: "Keizersgracht",
    house_number: "11",
    postal_code: "1015CJ",
    city: "Amsterdam",
    country_code: "NL",
    contact_email: `p27-${Date.now()}@example.com`,
  }),
})
const manufacturerId = createdM.body?.manufacturer?.id
ok(
  "manufacturer_create_200",
  createdM.status === 200 && Boolean(manufacturerId),
  String(createdM.status)
)

const products = await json(`${backend}/store/product-cloud/products`, { headers: hdr })
const productId = products.body?.products?.[0]?.id
ok("product_found", Boolean(productId), String(products.status))

if (productId && manufacturerId) {
  const patchInfo = await json(
    `${backend}/store/product-cloud/products/${encodeURIComponent(productId)}/information`,
    {
      method: "PATCH",
      headers: hdr,
      body: JSON.stringify({ manufacturer_id: manufacturerId }),
    }
  )
  ok("product_patch_manufacturer", patchInfo.status === 200, String(patchInfo.status))

  const manager = await json(
    `${backend}/store/product-cloud/products/${encodeURIComponent(productId)}/manager`,
    { headers: hdr }
  )
  ok(
    "product_manufacturer_persisted",
    manager.status === 200 && manager.body?.product?.manufacturer_id === manufacturerId,
    String(manager.body?.product?.manufacturer_id)
  )
}

const brands = await json(`${backend}/store/brands`, { headers: hdr })
const brandId = brands.body?.brands?.[0]?.id
ok("brand_found", Boolean(brandId), String(brands.status))
if (brandId) {
  const loc = await json(
    `${backend}/store/brands/${encodeURIComponent(brandId)}/facilities`,
    {
      method: "POST",
      headers: hdr,
      body: JSON.stringify({
        country_code: "NL",
      }),
    }
  )
  ok("location_country_only_allowed", loc.status === 200, String(loc.status))
}

const gpsrPage = await fetch(`${web}/seller/gpsr`)
ok("gpsr_page_200", gpsrPage.status === 200, String(gpsrPage.status))
const gpsrSource = readFileSync("apps/web/app/seller/gpsr/page.tsx", "utf8")
ok(
  "gpsr_page_content",
  gpsrSource.includes("GPSR — Algemene productveiligheidsverordening"),
  "source-check"
)

const miePage = await fetch(`${web}/seller/made-in-europe`)
ok("mie_page_200", miePage.status === 200, String(miePage.status))
const mieSource = readFileSync("apps/web/app/seller/made-in-europe/page.tsx", "utf8")
ok(
  "mie_uses_productielocatie_term",
  mieSource.includes("Productielocatie"),
  "source-check"
)

if (productId) {
  const pdp = await fetch(`${web}/seller/products/${encodeURIComponent(productId)}?tab=information`)
  ok("product_detail_200", pdp.status === 200, String(pdp.status))
  const pdpSource = readFileSync("apps/web/app/seller/products/[id]/page.tsx", "utf8")
  ok(
    "gpsr_manufacturer_label_visible",
    pdpSource.includes("Fabrikant / verantwoordelijke fabrikant"),
    "source-check"
  )
  ok(
    "gpsr_eu_operator_section_visible",
    pdpSource.includes("Verantwoordelijke marktdeelnemer in de EU"),
    "source-check"
  )
}

const failed = results.filter((r) => !r.pass)
console.log(`\n${results.filter((r) => r.pass).length}/${results.length} passed`)
if (failed.length) {
  console.log("Failed:")
  for (const f of failed) console.log(` - ${f.name}: ${f.detail}`)
  process.exit(1)
}
