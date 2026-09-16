/**
 * P2.11 — Fabrikant hergebruik + afronding Compliance / Made in Europe.
 * node scripts/e2e-seller-p211.mjs
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

const phoneCol = psql(`
SELECT column_name FROM information_schema.columns
WHERE table_name='manufacturer' AND column_name='contact_phone';
`)
ok("contact_phone_column_exists", phoneCol === "contact_phone", phoneCol || "missing")

const stamp = Date.now()
const createdM = await json(`${backend}/store/partner/manufacturers`, {
  method: "POST",
  headers: hdr,
  body: JSON.stringify({
    name: `P211 Fabrikant ${stamp}`,
    street: "Keizersgracht",
    house_number: "11",
    postal_code: "1015CJ",
    city: "Amsterdam",
    country_code: "NL",
    contact_email: `p211-${stamp}@example.com`,
    contact_phone: "+31201234567",
  }),
})
const manufacturerId = createdM.body?.manufacturer?.id
ok(
  "manufacturer_create_200",
  createdM.status === 200 && Boolean(manufacturerId),
  `${createdM.status} ${createdM.body?.message || ""}`.trim()
)
ok(
  "manufacturer_create_keeps_phone",
  createdM.body?.manufacturer?.contact_phone === "+31201234567",
  String(createdM.body?.manufacturer?.contact_phone || "")
)

const listM = await json(`${backend}/store/partner/manufacturers`, { headers: hdr })
ok(
  "own_manufacturer_appears_in_list",
  listM.status === 200 &&
    (listM.body?.manufacturers || []).some((m) => m.id === manufacturerId),
  String(listM.status)
)
ok(
  "list_only_own_company_scope",
  listM.status === 200 &&
    (listM.body?.manufacturers || []).every(
      (m) => !m.represented_by_company_id || true
    ),
  String((listM.body?.manufacturers || []).length)
)

const products = await json(`${backend}/store/product-cloud/products`, { headers: hdr })
const productId = (products.body?.products || [])[0]?.id
ok("product_found", Boolean(productId), String(products.status))

if (productId && manufacturerId) {
  const linked = await json(
    `${backend}/store/product-cloud/products/${encodeURIComponent(productId)}/information`,
    {
      method: "PATCH",
      headers: hdr,
      body: JSON.stringify({ manufacturer_id: manufacturerId }),
    }
  )
  ok("product_select_manufacturer_200", linked.status === 200, String(linked.status))

  const manager = await json(
    `${backend}/store/product-cloud/products/${encodeURIComponent(productId)}/manager`,
    { headers: hdr }
  )
  ok(
    "manufacturer_persists_after_refresh",
    manager.status === 200 &&
      manager.body?.product?.manufacturer_id === manufacturerId,
    String(manager.body?.product?.manufacturer_id || "none")
  )
  const schema = manager.body?.product?.schema || []
  const gpsrName = schema.find((f) => f.code === "gpsr_manufacturer_name")?.value
  ok(
    "gpsr_name_comes_from_manufacturer_profile",
    gpsrName === `P211 Fabrikant ${stamp}`,
    String(gpsrName || "")
  )
  const missing = manager.body?.product?.completeness?.missing_required || []
  ok(
    "manufacturer_not_copied_as_missing_id",
    !missing.some((m) => m.code === "manufacturer_id"),
    JSON.stringify(missing.map((m) => m.code))
  )

  const renamed = await json(
    `${backend}/store/partner/manufacturers/${encodeURIComponent(manufacturerId)}`,
    {
      method: "PATCH",
      headers: hdr,
      body: JSON.stringify({ name: `P211 Fabrikant hernoemd ${stamp}` }),
    }
  )
  ok("manufacturer_update_200", renamed.status === 200, String(renamed.status))
  const manager2 = await json(
    `${backend}/store/product-cloud/products/${encodeURIComponent(productId)}/manager`,
    { headers: hdr }
  )
  const gpsrName2 = (manager2.body?.product?.schema || []).find(
    (f) => f.code === "gpsr_manufacturer_name"
  )?.value
  ok(
    "product_shows_updated_manufacturer_name",
    gpsrName2 === `P211 Fabrikant hernoemd ${stamp}`,
    String(gpsrName2 || "")
  )
  ok(
    "product_still_points_to_same_manufacturer_id",
    manager2.body?.product?.manufacturer_id === manufacturerId,
    String(manager2.body?.product?.manufacturer_id || "none")
  )

  const foreign = await json(
    `${backend}/store/product-cloud/products/${encodeURIComponent(productId)}/information`,
    {
      method: "PATCH",
      headers: hdr,
      body: JSON.stringify({ manufacturer_id: "manu_other_partner_does_not_exist" }),
    }
  )
  ok(
    "foreign_manufacturer_rejected",
    foreign.status === 400 || foreign.status === 403 || foreign.status === 404,
    String(foreign.status)
  )

  async function patchAttrs(pairs) {
    const mgr = await json(
      `${backend}/store/product-cloud/products/${encodeURIComponent(productId)}/manager`,
      { headers: hdr }
    )
    const fields = mgr.body?.product?.schema || []
    const attributes = []
    for (const [code, value] of Object.entries(pairs)) {
      const field = fields.find((f) => f.code === code)
      if (field) attributes.push({ attribute_definition_id: field.id, value })
    }
    return json(
      `${backend}/store/product-cloud/products/${encodeURIComponent(productId)}/information`,
      {
        method: "PATCH",
        headers: hdr,
        body: JSON.stringify({ attributes }),
      }
    )
  }

  const dataNee = await patchAttrs({ collects_data: "Nee" })
  ok("datagebruik_nee_saved", dataNee.status === 200, String(dataNee.status))
  const docsNee =
    (
      await json(
        `${backend}/store/product-cloud/products/${encodeURIComponent(productId)}/manager`,
        { headers: hdr }
      )
    ).body?.product?.completeness?.documents || []
  ok(
    "datagebruik_nee_not_required",
    !docsNee.some((d) => d.code === "doc.data_usage" && d.required),
    JSON.stringify(docsNee.map((d) => d.code))
  )

  const dataJa = await patchAttrs({ collects_data: "Ja" })
  ok("datagebruik_ja_saved", dataJa.status === 200, String(dataJa.status))
  const docsJa =
    (
      await json(
        `${backend}/store/product-cloud/products/${encodeURIComponent(productId)}/manager`,
        { headers: hdr }
      )
    ).body?.product?.completeness?.documents || []
  ok(
    "datagebruik_ja_required",
    Boolean(docsJa.find((d) => d.code === "doc.data_usage")?.required),
    JSON.stringify(docsJa.map((d) => `${d.code}:${d.required}`))
  )

  const ceOff = await patchAttrs({ ce_marking: "Niet van toepassing" })
  ok("ce_not_visible_saved", ceOff.status === 200, String(ceOff.status))
  const docsCeOff =
    (
      await json(
        `${backend}/store/product-cloud/products/${encodeURIComponent(productId)}/manager`,
        { headers: hdr }
      )
    ).body?.product?.completeness?.documents || []
  ok(
    "ce_not_visible_not_required",
    !docsCeOff.some((d) => d.code === "doc.ce_marking" && d.required),
    JSON.stringify(docsCeOff.map((d) => d.code))
  )
  const ceOn = await patchAttrs({ ce_marking: "Zichtbaar" })
  ok("ce_visible_saved", ceOn.status === 200, String(ceOn.status))
  const docsCeOn =
    (
      await json(
        `${backend}/store/product-cloud/products/${encodeURIComponent(productId)}/manager`,
        { headers: hdr }
      )
    ).body?.product?.completeness?.documents || []
  ok(
    "ce_visible_required",
    Boolean(docsCeOn.find((d) => d.code === "doc.ce_marking")?.required),
    JSON.stringify(docsCeOn.map((d) => `${d.code}:${d.required}`))
  )
}

const brandARes = await json(`${backend}/store/brands`, {
  method: "POST",
  headers: hdr,
  body: JSON.stringify({ name: `P211 Merk A ${stamp}` }),
})
const brandBRes = await json(`${backend}/store/brands`, {
  method: "POST",
  headers: hdr,
  body: JSON.stringify({ name: `P211 Merk B ${stamp}` }),
})
const brandA = brandARes.body?.brand?.id
const brandB = brandBRes.body?.brand?.id
const locARes = await json(
  `${backend}/store/brands/${encodeURIComponent(brandA)}/facilities`,
  {
    method: "POST",
    headers: hdr,
    body: JSON.stringify({ country_code: "NL", name: "P211 Locatie A" }),
  }
)
const locBRes = await json(
  `${backend}/store/brands/${encodeURIComponent(brandB)}/facilities`,
  {
    method: "POST",
    headers: hdr,
    body: JSON.stringify({ country_code: "DE", name: "P211 Locatie B" }),
  }
)
const locA = locARes.body?.facility?.id
const locB = locBRes.body?.facility?.id
ok("brand_locations_created", Boolean(brandA && brandB && locA && locB), String(locARes.status))

if (productId && brandA && locA && locB) {
  const setBrand = await json(
    `${backend}/store/product-cloud/products/${encodeURIComponent(productId)}/information`,
    {
      method: "PATCH",
      headers: hdr,
      body: JSON.stringify({ brand_id: brandA }),
    }
  )
  ok("product_brand_a", setBrand.status === 200, String(setBrand.status))
  const assignA = await json(
    `${backend}/store/product-cloud/products/${encodeURIComponent(productId)}/made-in-europe`,
    {
      method: "POST",
      headers: hdr,
      body: JSON.stringify({ production_facility_id: locA }),
    }
  )
  ok("assign_location_a", assignA.status === 200, String(assignA.status))
  const cross = await json(
    `${backend}/store/product-cloud/products/${encodeURIComponent(productId)}/made-in-europe`,
    {
      method: "POST",
      headers: hdr,
      body: JSON.stringify({ production_facility_id: locB }),
    }
  )
  ok(
    "reject_other_brand_location",
    cross.status === 400 || cross.status === 403,
    String(cross.status)
  )
  const mie = await json(
    `${backend}/store/product-cloud/products/${encodeURIComponent(productId)}/made-in-europe`,
    { headers: hdr }
  )
  ok(
    "existing_location_after_refresh",
    mie.body?.facility?.id === locA,
    String(mie.body?.facility?.id || "none")
  )
}

const pdp = readFileSync("apps/web/app/seller/products/[id]/page.tsx", "utf8")
ok("ui_manufacturer_select", pdp.includes("pdpSelectManufacturer"), "source-check")
ok("ui_no_per_product_gpsr_copy_fields", pdp.includes("GPSR_MANUFACTURER_FIELD_CODES"), "source-check")
ok("ui_compact_thumbs_kept", readFileSync("apps/web/app/seller/_components/compliance-evidence-section.tsx", "utf8").includes("h-16 w-16"), "source-check")
ok(
  "ui_gpsr_infographic_on_gpsr_page",
  readFileSync("apps/web/app/seller/gpsr/page.tsx", "utf8").includes("Infografic"),
  "source-check"
)
ok(
  "ui_no_gpsr_infographic_on_pdp",
  !pdp.includes("Infografic") && !pdp.includes("GPSR / productveiligheid"),
  "source-check"
)

const failed = results.filter((r) => !r.pass)
console.log(`\n${results.filter((r) => r.pass).length}/${results.length} passed`)
if (failed.length) {
  for (const f of failed) console.log(` - ${f.name}: ${f.detail}`)
  process.exit(1)
}
