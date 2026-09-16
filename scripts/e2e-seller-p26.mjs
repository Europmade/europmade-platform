/**
 * P2.6 — partner roles/permissions, brands save/facilities, product detail.
 * node scripts/e2e-seller-p26.mjs
 */
import { execFileSync } from "node:child_process"
import { createHmac } from "node:crypto"
import { readFileSync } from "node:fs"

const backend = process.env.BACKEND_URL || "http://127.0.0.1:9000"
const web = process.env.WEB_URL || "http://127.0.0.1:3000"
const pubKey = readFileSync("apps/web/.env.local", "utf8")
  .match(/NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=(.*)/)[1]
  .trim()
const email =
  process.env.SELLER_EMAIL || "seller-flow-20260804144242@example.com"
const password = process.env.SELLER_PASSWORD || "REDACTED_SELLER_PASSWORD"
const adminEmail = process.env.ADMIN_EMAIL || "admin-e2e@example.com"
const adminPassword = process.env.ADMIN_PASSWORD || "REDACTED_ADMIN_PASSWORD"

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

const unauth = await json(`${backend}/store/brands`, {
  headers: { "x-publishable-api-key": pubKey },
})
ok(
  "brands_unauthorized",
  unauth.status === 401 || unauth.status === 403,
  String(unauth.status)
)

const account = await json(`${backend}/store/partner/account`, { headers: hdr })
ok("partner_account", account.status === 200, String(account.status))
ok(
  "partner_account_roles",
  Array.isArray(account.body?.partner?.roles) &&
    account.body.partner.roles.length > 0,
  JSON.stringify(account.body?.partner?.roles)
)
ok(
  "partner_account_permissions",
  Array.isArray(account.body?.partner?.permissions),
  String(account.body?.partner?.permissions?.length)
)

const brands = await json(`${backend}/store/brands`, { headers: hdr })
ok("seller_brands_api", brands.status === 200, String(brands.status))
const brand = brands.body?.brands?.[0]
ok("seller_has_brand", Boolean(brand?.id), brand?.id || "none")

const adminLogin = await json(`${backend}/auth/user/emailpass`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ email: adminEmail, password: adminPassword }),
})
ok("admin_login", adminLogin.status < 300, String(adminLogin.status))
const adminHdr = {
  "content-type": "application/json",
  authorization: `Bearer ${adminLogin.body?.token}`,
}

const sellerId = account.body?.partner?.id
if (sellerId && adminLogin.body?.token) {
  const combined = await json(`${backend}/admin/partners/${sellerId}/roles`, {
    method: "PATCH",
    headers: adminHdr,
    body: JSON.stringify({
      is_retailer: true,
      is_brand_owner: true,
      is_producer: true,
      is_distributor: false,
    }),
  })
  ok(
    "admin_roles_combined",
    combined.status === 200 &&
      (combined.body?.partner?.roles || []).includes("BRAND_OWNER"),
    JSON.stringify(combined.body?.partner?.roles)
  )
}

const marker = `p26-intro-${Date.now()}`
let brandDetail = { status: 0, body: {} }
if (brand?.id) {
  const patch = await json(
    `${backend}/store/brands/${encodeURIComponent(brand.id)}`,
    {
      method: "PATCH",
      headers: hdr,
      body: JSON.stringify({ intro: marker }),
    }
  )
  ok("brand_patch", patch.status === 200, String(patch.status) + " " + (patch.body?.message || ""))
  brandDetail = await json(
    `${backend}/store/brands/${encodeURIComponent(brand.id)}`,
    { headers: hdr }
  )
  ok(
    "brand_intro_persisted",
    brandDetail.status === 200 && brandDetail.body?.brand?.intro === marker,
    String(brandDetail.body?.brand?.intro)
  )
  ok(
    "brand_products_list",
    Array.isArray(brandDetail.body?.products),
    String(brandDetail.body?.products?.length)
  )

  const facName = `p26-fac-${Date.now()}`
  const createdFac = await json(
    `${backend}/store/brands/${encodeURIComponent(brand.id)}/facilities`,
    {
      method: "POST",
      headers: hdr,
      body: JSON.stringify({
        name: facName,
        country_code: "NL",
        street: "Keizersgracht",
        house_number: "1",
        postal_code: "1015CN",
        city: "Amsterdam",
      }),
    }
  )
  const facId = createdFac.body?.facility?.id
  ok("facility_create", createdFac.status === 200 && Boolean(facId), String(createdFac.status))

  const editedFac = facId
    ? await json(
        `${backend}/store/brands/${encodeURIComponent(brand.id)}/facilities`,
        {
          method: "POST",
          headers: hdr,
          body: JSON.stringify({
            id: facId,
            name: facName,
            country_code: "NL",
            street: "Prinsengracht",
            house_number: "12",
            postal_code: "1015CN",
            city: "Amsterdam",
          }),
        }
      )
    : { status: 0, body: {} }
  ok(
    "facility_update",
    editedFac.status === 200 &&
      editedFac.body?.facility?.street === "Prinsengracht",
    String(editedFac.body?.facility?.street)
  )

  const reload = await json(
    `${backend}/store/brands/${encodeURIComponent(brand.id)}`,
    { headers: hdr }
  )
  ok(
    "facility_visible_after_reload",
    (reload.body?.facilities || []).some((f) => f.id === facId),
    String((reload.body?.facilities || []).length)
  )

  const product = (brandDetail.body?.products || [])[0]
  if (product?.id) {
    const manager = await json(
      `${backend}/store/product-cloud/products/${product.id}/manager`,
      { headers: hdr }
    )
    ok("brand_product_manager_200", manager.status === 200, String(manager.status))
    const page = await fetch(`${web}/seller/products/${product.id}`)
    ok("brand_product_page_200", page.status === 200, String(page.status))
    const html = await page.text()
    ok(
      "product_page_no_sectiondetail_crash",
      !html.includes("sectionDetail is not defined"),
      html.slice(0, 60)
    )
  } else {
    const products = await json(`${backend}/store/product-cloud/products`, {
      headers: hdr,
    })
    const first = products.body?.products?.[0]
    ok("fallback_product_list", Boolean(first?.id), String(products.status))
    if (first?.id) {
      const manager = await json(
        `${backend}/store/product-cloud/products/${first.id}/manager`,
        { headers: hdr }
      )
      ok("product_manager_200", manager.status === 200, String(manager.status))
      const page = await fetch(`${web}/seller/products/${first.id}`)
      ok("product_page_200", page.status === 200, String(page.status))
    }
  }
}

const mieFacilities = await json(`${backend}/store/product-cloud/facilities`, {
  headers: hdr,
})
ok("mie_facility_selector", mieFacilities.status === 200, String(mieFacilities.status))

const pages = [
  "/seller",
  "/seller/products",
  "/seller/brands",
  "/seller/settings",
]
if (brand?.id) pages.push(`/seller/brands/${encodeURIComponent(brand.id)}`)
for (const path of pages) {
  const page = await fetch(`${web}${path}`)
  ok(`page_${path}`, page.status === 200, String(page.status))
}

if (sellerId && adminLogin.body?.token && brand?.id) {
  const retailerOnly = await json(
    `${backend}/admin/partners/${sellerId}/roles`,
    {
      method: "PATCH",
      headers: adminHdr,
      body: JSON.stringify({
        is_retailer: true,
        is_brand_owner: false,
        is_producer: false,
        is_distributor: false,
      }),
    }
  )
  ok("admin_roles_retailer_only", retailerOnly.status === 200, String(retailerOnly.status))
  const denied = await json(
    `${backend}/store/brands/${encodeURIComponent(brand.id)}`,
    {
      method: "PATCH",
      headers: hdr,
      body: JSON.stringify({ intro: "should-fail" }),
    }
  )
  ok(
    "retailer_cannot_edit_brand_description",
    denied.status === 403 || denied.status === 400,
    String(denied.status)
  )
  const restored = await json(`${backend}/admin/partners/${sellerId}/roles`, {
    method: "PATCH",
    headers: adminHdr,
    body: JSON.stringify({
      is_retailer: true,
      is_brand_owner: true,
      is_producer: true,
      is_distributor: false,
    }),
  })
  ok("admin_roles_restored_combined", restored.status === 200, String(restored.status))
}

const failed = results.filter((r) => !r.pass)
console.log(`\n${results.filter((r) => r.pass).length}/${results.length} passed`)
if (failed.length) {
  console.log("Failed:")
  for (const f of failed) console.log(` - ${f.name}: ${f.detail}`)
  process.exit(1)
}
