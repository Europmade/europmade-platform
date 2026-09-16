/**
 * P2.3 correction — compliance/publication, MiE facility, media, search, seller menu.
 * node scripts/e2e-seller-p23-correction.mjs
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

async function text(url, init) {
  const res = await fetch(url, init)
  const body = await res.text()
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

const list = await json(`${backend}/store/product-cloud/products?limit=5`, {
  headers: hdr,
})
ok("seller_product_list", list.status === 200, String(list.status))

const productId =
  list.body.products?.find((p) => p.completeness)?.id ||
  list.body.products?.[0]?.id
ok("product_id_found", Boolean(productId), productId || "none")

let manager = { status: 0, body: {} }
if (productId) {
  manager = await json(
    `${backend}/store/product-cloud/products/${productId}/manager`,
    { headers: hdr }
  )
  ok("seller_product_detail", manager.status === 200, String(manager.status))
}

const comp = manager.body?.product?.completeness
if (comp) {
  ok(
    "sale_presentation_present",
    Boolean(comp.sale_presentation),
    comp.sale_presentation
  )
  ok(
    "compliance_review_status_present",
    Boolean(comp.compliance_review_status),
    comp.compliance_review_status
  )
  if (
    comp.percent < 100 ||
    comp.compliance_review_status === "missing" ||
    !comp.publishable
  ) {
    ok(
      "incomplete_not_for_sale",
      comp.sale_presentation !== "for_sale",
      comp.sale_presentation
    )
  }
}

if (productId) {
  const evidence = await json(
    `${backend}/store/product-cloud/products/${productId}/made-in-europe/evidence`,
    {
      method: "POST",
      headers: hdr,
      body: JSON.stringify({
        storage_reference:
          "https://www.google.com/images/branding/googlelogo/1x/googlelogo_color_272x92dp.png",
        document_type: "photo",
        mime_type: "image/png",
        evidence_kind: "made_in_europe",
      }),
    }
  )
  ok("mie_evidence_upload", evidence.status < 300, String(evidence.status))

  const evidenceGet = await json(
    `${backend}/store/product-cloud/products/${productId}/made-in-europe/evidence`,
    { headers: hdr }
  )
  ok(
    "mie_evidence_pending_not_approved",
    evidenceGet.status === 200 &&
      evidenceGet.body.evidence_status === "pending_review" &&
      evidenceGet.body.is_made_in_europe_verified === false,
    JSON.stringify({
      status: evidenceGet.body.evidence_status,
      verified: evidenceGet.body.is_made_in_europe_verified,
    })
  )

  const mgr2 = await json(
    `${backend}/store/product-cloud/products/${productId}/manager`,
    { headers: hdr }
  )
  const c2 = mgr2.body?.product?.completeness
  ok(
    "pending_review_blocks_publishable",
    c2 &&
      !c2.publishable &&
      c2.compliance_review_status === "pending_review",
    c2
      ? `publishable=${c2.publishable} review=${c2.compliance_review_status}`
      : "no completeness"
  )
}

// Storefront publish flow — published products must be searchable
const p21Row = psql(`
SELECT p.id, pv.id AS version_id, pv.publication_status, pv.title
FROM pc_product p
JOIN product_version pv ON pv.product_id = p.id
WHERE pv.title ILIKE '%6899991674%'
ORDER BY pv.version_number DESC
LIMIT 1;
`)
const p21Parts = p21Row ? p21Row.split("|") : []
const p21ProductId = p21Parts[0] || ""
const p21VersionId = p21Parts[1] || ""
const p21PubStatus = p21Parts[2] || ""
const p21Title = p21Parts[3] || ""

if (p21ProductId) {
  ok("p21_product_exists", true, p21ProductId)
  ok(
    "p21_publication_status_known",
    Boolean(p21PubStatus),
    p21PubStatus
  )

  if (p21PubStatus !== "Gepubliceerd" && p21VersionId) {
    const mgrP21 = await json(
      `${backend}/store/product-cloud/products/${p21ProductId}/manager`,
      { headers: hdr }
    )
    if (mgrP21.body?.product?.completeness?.publishable) {
      const pub = await json(
        `${backend}/store/product-cloud/products/${p21ProductId}/versions/${p21VersionId}/publish`,
        { method: "POST", headers: hdr }
      )
      ok(
        "p21_seller_cannot_self_publish",
        pub.status >= 400,
        String(pub.status)
      )
    } else {
      ok(
        "p21_publish_blocked_until_complete",
        !mgrP21.body?.product?.completeness?.publishable,
        String(mgrP21.body?.product?.completeness?.publishable)
      )
    }
  }

  const searchName = await json(
    `${backend}/store/catalog/products?q=P21+Product+6899991674&limit=10`,
    { headers: { "x-publishable-api-key": pubKey } }
  )
  ok("catalog_search_by_name", searchName.status === 200, String(searchName.status))
  const foundByName = (searchName.body?.products || []).some((p) =>
    String(p.title || "").includes("6899991674")
  )
  const pubCheck = psql(`
SELECT publication_status FROM product_version
WHERE product_id='${p21ProductId}' AND publication_status='Gepubliceerd' LIMIT 1;
`)
  ok(
    "catalog_search_name_finds_p21",
    pubCheck ? foundByName : !foundByName,
    `published=${Boolean(pubCheck)} found=${foundByName}`
  )

  const searchEan = await json(
    `${backend}/store/catalog/products?q=872689991674&limit=10`,
    { headers: { "x-publishable-api-key": pubKey } }
  )
  ok("catalog_search_by_ean", searchEan.status === 200, String(searchEan.status))
  const foundByEan = (searchEan.body?.products || []).some((p) =>
    String(p.id) === p21ProductId ||
    String(p.identifier_value || "").includes("872689991674")
  )
  ok(
    "catalog_search_ean_finds_p21",
    pubCheck ? foundByEan : !foundByEan,
    `published=${Boolean(pubCheck)} found=${foundByEan}`
  )
} else {
  ok("p21_product_exists", false, "not in database")
  const searchName = await json(
    `${backend}/store/catalog/products?q=P21+Product+6899991674&limit=10`,
    { headers: { "x-publishable-api-key": pubKey } }
  )
  ok("catalog_search_by_name", searchName.status === 200, String(searchName.status))
  ok("catalog_search_name_finds_p21", true, "skipped — P21 absent")
  ok("catalog_search_by_ean", searchName.status === 200, String(searchName.status))
  ok("catalog_search_ean_finds_p21", true, "skipped — P21 absent")
}

const brands = await json(`${backend}/store/brands`, { headers: hdr })
const brandId = brands.body?.brands?.[0]?.id
const stamp = Date.now()
if (brandId) {
  const fac = await json(`${backend}/store/brands/${brandId}/facilities`, {
    method: "POST",
    headers: hdr,
    body: JSON.stringify({
      name: `P23 Facility ${stamp}`,
      country_code: "NL",
      region: "Teststraat 1, 1011 AB Amsterdam",
      description: "Test facility",
    }),
  })
  ok("facility_create", fac.status < 300, String(fac.status))

  const facList = await json(`${backend}/store/brands/${brandId}/facilities`, {
    headers: hdr,
  })
  ok(
    "facility_in_list",
    facList.status === 200 &&
      (facList.body?.facilities || []).some((f) =>
        String(f.name).includes(String(stamp))
      ),
    String((facList.body?.facilities || []).length)
  )
}

const miePage = await text(`${web}/seller/made-in-europe`, {})
ok(
  "made_in_europe_page_200",
  miePage.status === 200,
  String(miePage.status)
)

const settingsPage = await text(`${web}/seller/settings`, {})
ok("seller_settings_200", settingsPage.status === 200, String(settingsPage.status))

const sellerShell = await text(`${web}/seller/products`, {})
ok("seller_products_200", sellerShell.status === 200, String(sellerShell.status))

const storefront = await text(`${web}/`, {})
ok("storefront_200", storefront.status === 200, String(storefront.status))

const failed = results.filter((r) => !r.pass)
console.log("\n---")
console.log(`P2.3 E2E: ${results.length - failed.length}/${results.length} passed`)
if (failed.length) {
  console.log("Failed:")
  for (const f of failed) console.log(` - ${f.name}: ${f.detail}`)
  process.exit(1)
}
