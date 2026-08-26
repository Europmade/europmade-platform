/**
 * E2E Seller Product Manager — real Product Cloud (no demo list).
 * node scripts/e2e-seller-product-manager.mjs
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
}

const list = await json(`${backend}/store/product-cloud/products`, {
  headers: hdr,
})
ok("list_200", list.status === 200, String(list.status))
ok(
  "list_has_completeness",
  (list.body.products || []).every((p) => p.completeness && typeof p.completeness.percent === "number"),
  `count=${list.body.products?.length}`
)
ok(
  "list_has_offer_block",
  (list.body.products || []).every((p) => p.offer && typeof p.offer.has_offer === "boolean")
)

let productId = list.body.products?.[0]?.id
if (!productId) {
  const ean = `872${Date.now().toString().slice(-10)}`
  const created = await json(`${backend}/store/product-cloud/products`, {
    method: "POST",
    headers: { ...hdr, "content-type": "application/json" },
    body: JSON.stringify({
      brand_id: "brand_e2e_pm",
      manufacturer_id: "mfr_e2e_pm",
      title: "E2E Product Manager Test",
      description: "E2E description",
      category_name: "Tuin",
      identifier_type: "GTIN",
      identifier_value: ean,
      create_as_retailer: true,
      media: [
        {
          media_type: "Hoofdafbeelding",
          storage_reference: "https://example.com/e2e-product.jpg",
        },
      ],
    }),
  })
  ok("create_product", created.status < 300 && !!created.body.product_id, String(created.status))
  productId = created.body.product_id
} else {
  ok("create_product", true, "reused existing")
}

const manager = await json(
  `${backend}/store/product-cloud/products/${productId}/manager`,
  { headers: hdr }
)
ok("manager_200", manager.status === 200 && !!manager.body.product?.id)
ok(
  "manager_schema",
  Array.isArray(manager.body.product?.schema),
  `fields=${manager.body.product?.schema?.length}`
)
ok(
  "manager_has_gpsr_fields",
  (manager.body.product?.schema || []).some(
    (f) => f.code === "gpsr_manufacturer_name"
  )
)
ok(
  "manager_actions",
  !!manager.body.product?.actions?.manage
)

const oldTitle = manager.body.product?.title || ""
const newTitle = `${oldTitle} [PM ${Date.now().toString().slice(-4)}]`.slice(0, 120)
const schema = manager.body.product?.schema || []
const attrs = schema
  .filter((f) => f.requirement_tier === "compliance_required")
  .slice(0, 8)
  .map((f, i) => ({
    attribute_definition_id: f.id,
    value: f.value || `E2E-compliance-${i + 1}`,
  }))

const patched = await json(
  `${backend}/store/product-cloud/products/${productId}/information`,
  {
    method: "PATCH",
    headers: { ...hdr, "content-type": "application/json" },
    body: JSON.stringify({
      title: newTitle,
      attributes: attrs,
      reason: "E2E product manager",
    }),
  }
)
ok("patch_information", patched.status < 300, String(patched.status))
ok(
  "title_updated",
  patched.body.product?.title === newTitle,
  patched.body.product?.title
)
ok(
  "change_history",
  (patched.body.product?.field_changes || []).some(
    (c) => c.field_code === "title" && c.new_value === newTitle
  ),
  `changes=${patched.body.product?.field_changes?.length}`
)
ok(
  "completeness_present",
  typeof patched.body.product?.completeness?.percent === "number"
)
ok(
  "publishable_flag",
  typeof patched.body.product?.completeness?.publishable === "boolean",
  String(patched.body.product?.completeness?.publishable)
)

const health = await fetch(`${backend}/health`).then((r) => r.status)
ok("health", health === 200)

const failed = results.filter((r) => !r.pass).length
console.log(`---\nPASSED=${results.length - failed} FAILED=${failed} TOTAL=${results.length}`)
process.exit(failed ? 1 : 0)
