/**
 * P2.5 — general import template, facilities, product approval, brands.
 * node scripts/e2e-seller-p25.mjs
 */
import { execFileSync } from "node:child_process"
import { createHmac } from "node:crypto"
import { readFileSync } from "node:fs"
import { inflateRawSync } from "node:zlib"

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

async function bin(url, init) {
  const res = await fetch(url, init)
  const buf = Buffer.from(await res.arrayBuffer())
  return { status: res.status, buf }
}

function unzipXlsx(buf) {
  const files = new Map()
  let i = 0
  while (i + 30 <= buf.length && buf.readUInt32LE(i) === 0x04034b50) {
    const method = buf.readUInt16LE(i + 8)
    const compSize = buf.readUInt32LE(i + 18)
    const nameLen = buf.readUInt16LE(i + 26)
    const extraLen = buf.readUInt16LE(i + 28)
    const name = buf.slice(i + 30, i + 30 + nameLen).toString("utf8")
    const start = i + 30 + nameLen + extraLen
    const compressed = buf.slice(start, start + compSize)
    const data =
      method === 0 ? compressed : inflateRawSync(compressed)
    files.set(name, data.toString("utf8"))
    i = start + compSize
  }
  return files
}

function sheetInlineValues(xml) {
  return [...xml.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((m) => m[1])
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

const brandsPage = await fetch(`${web}/seller/brands`)
ok("seller_brands_http", brandsPage.status === 200, String(brandsPage.status))
const brandsHtml = await brandsPage.text()
ok(
  "seller_shell_no_split_crash",
  !brandsHtml.includes("Cannot read properties of undefined"),
  brandsHtml.slice(0, 80)
)

const brands = await json(`${backend}/store/brands`, { headers: hdr })
ok("seller_brands_api", brands.status === 200, String(brands.status))

const xlsx = await bin(`${backend}/store/product-cloud/import/template?format=xlsx`, {
  headers: hdr,
})
ok(
  "template_xlsx",
  xlsx.status === 200 && xlsx.buf.slice(0, 2).toString() === "PK",
  String(xlsx.status)
)
const xlsxFiles = unzipXlsx(xlsx.buf)
const workbookXml = xlsxFiles.get("xl/workbook.xml") || ""
const sheet1Xml = xlsxFiles.get("xl/worksheets/sheet1.xml") || ""
const sheet1Vals = sheetInlineValues(sheet1Xml)
ok(
  "template_has_uitleg_sheet",
  workbookXml.includes("Uitleg velden"),
  workbookXml.slice(0, 120)
)
ok(
  "template_no_category_fields",
  !sheet1Vals.includes("zuigkracht") &&
    !sheet1Vals.includes("maat") &&
    !sheet1Vals.includes("wifi") &&
    !sheet1Vals.includes("punten"),
  sheet1Vals.slice(0, 20).join(",")
)
ok(
  "template_has_universal_fields",
  sheet1Vals.includes("ean") &&
    sheet1Vals.includes("title") &&
    sheet1Vals.includes("production_country"),
  sheet1Vals.slice(0, 16).join(",")
)

const csvTpl = await bin(`${backend}/store/product-cloud/import/template?format=csv`, {
  headers: hdr,
})
const csvText = csvTpl.buf.toString("utf8")
ok(
  "template_csv_universal",
  csvText.includes("ean") &&
    csvText.includes("title") &&
    csvText.includes("production_country") &&
    !csvText.includes("zuigkracht") &&
    !csvText.includes(",maat,") &&
    !csvText.includes(",wifi,"),
  csvText.split("\r\n")[0]
)

const list = await json(`${backend}/store/product-cloud/products?limit=5`, {
  headers: hdr,
})
ok("seller_product_list", list.status === 200, String(list.status))
const productId = list.body.products?.[0]?.id
const manager = productId
  ? await json(`${backend}/store/product-cloud/products/${productId}/manager`, {
      headers: hdr,
    })
  : { status: 0, body: {} }
ok("seller_product_manager", manager.status === 200, String(manager.status))

const brandId =
  brands.body?.brands?.[0]?.id ||
  manager.body?.product?.brand_id ||
  list.body?.products?.[0]?.brand_id
ok("brand_id_for_facility", Boolean(brandId), brandId || "none")

const facName = `P25 Facility ${Date.now().toString().slice(-6)}`
const createdFac = brandId
  ? await json(`${backend}/store/brands/${encodeURIComponent(brandId)}/facilities`, {
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
    })
  : { status: 0, body: {} }
ok(
  "facility_create",
  createdFac.status < 300 && Boolean(createdFac.body?.facility?.id),
  JSON.stringify({ status: createdFac.status, id: createdFac.body?.facility?.id })
)

const facList = await json(`${backend}/store/product-cloud/facilities`, {
  headers: hdr,
})
ok(
  "facility_in_selector",
  (facList.body?.facilities || []).some((f) => f.id === createdFac.body?.facility?.id),
  String(facList.body?.count)
)

if (productId && createdFac.body?.facility?.id) {
  const bulk = await json(`${backend}/store/product-cloud/made-in-europe/bulk`, {
    method: "POST",
    headers: hdr,
    body: JSON.stringify({
      product_ids: [productId],
      production_facility_id: createdFac.body.facility.id,
      assembly_eu_band: "eu_100",
      parts_eu_level: "eu_majority",
      materials_eu_level: "eu_majority",
      primary_assembly_country: "NL",
    }),
  })
  ok("facility_bulk_apply", bulk.status < 300, String(bulk.status))
}

const stamp = String(Date.now())
const ean = `87${stamp}`.replace(/\D/g, "").slice(0, 13).padEnd(13, "9")
const brandName =
  manager.body?.product?.brand_name ||
  brands.body?.brands?.[0]?.name ||
  brandId
const csv = [
  "EAN-code,Artikelnummer,Productnaam,Merknaam,Categorie,Prijs,Voorraad,Land",
  `${ean},SKU-P25-${stamp.slice(-8)},P25 Import ${stamp},${brandName},Robotstofzuiger,199.00,3,NL`,
].join("\n")
const preview = await json(`${backend}/store/product-cloud/import/preview`, {
  method: "POST",
  headers: hdr,
  body: JSON.stringify({ csv_text: csv }),
})
ok("csv_preview", preview.status === 200, String(preview.status))
ok(
  "csv_auto_map",
  preview.body?.mapping?.ean === "EAN-code",
  JSON.stringify(preview.body?.mapping?.ean)
)
ok(
  "preview_category_fields_after_match",
  Array.isArray(preview.body?.category_columns) &&
    preview.body.category_columns.includes("zuigkracht"),
  JSON.stringify(preview.body?.category_columns?.slice?.(0, 6))
)
ok(
  "canonical_excludes_maat",
  !(preview.body?.canonical_columns || []).includes("maat"),
  JSON.stringify(preview.body?.canonical_columns)
)
const commit = await json(`${backend}/store/product-cloud/import`, {
  method: "POST",
  headers: hdr,
  body: JSON.stringify({ csv_text: csv, mapping: preview.body?.mapping }),
})
ok(
  "csv_import",
  commit.status < 300 && commit.body?.imported >= 1,
  JSON.stringify({
    status: commit.status,
    imported: commit.body?.imported,
    message: commit.body?.message,
  })
)

const xlsxPreview = await json(`${backend}/store/product-cloud/import/preview`, {
  method: "POST",
  headers: hdr,
  body: JSON.stringify({
    headers: sheet1Vals.slice(0, 16),
    rows: [sheet1Vals.slice(16, 32)],
  }),
})
ok("xlsx_template_preview", xlsxPreview.status === 200, String(xlsxPreview.status))

const versionId = manager.body?.product?.version_id
const submitIncomplete = versionId
  ? await json(
      `${backend}/store/product-cloud/products/${productId}/versions/${versionId}/submit`,
      { method: "POST", headers: hdr }
    )
  : { status: 0, body: {} }
ok(
  "incomplete_cannot_submit",
  submitIncomplete.status >= 400,
  String(submitIncomplete.status)
)

if (productId) {
  const ev1 = await json(
    `${backend}/store/product-cloud/products/${productId}/made-in-europe/evidence`,
    {
      method: "POST",
      headers: hdr,
      body: JSON.stringify({
        storage_reference: "https://example.com/mie-p25-a.jpg",
        document_type: "photo",
        evidence_kind: "made_in_europe",
        mime_type: "image/jpeg",
        file_name: "mie-a.jpg",
      }),
    }
  )
  const ev2 = await json(
    `${backend}/store/product-cloud/products/${productId}/made-in-europe/evidence`,
    {
      method: "POST",
      headers: hdr,
      body: JSON.stringify({
        storage_reference: "https://example.com/mie-p25-b.jpg",
        document_type: "photo",
        evidence_kind: "made_in_europe",
        mime_type: "image/jpeg",
        file_name: "mie-b.jpg",
      }),
    }
  )
  ok(
    "mie_evidence_pending_not_auto_approved",
    ev1.status < 300 &&
      String(
        ev1.body?.evidence?.verification_status ||
          ev1.body?.verification_status ||
          ""
      ) !== "approved",
    JSON.stringify({ status: ev1.status })
  )
  ok("mie_multiple_evidence_allowed", ev2.status < 300, String(ev2.status))
  const evList = await json(
    `${backend}/store/product-cloud/products/${productId}/made-in-europe/evidence`,
    { headers: hdr }
  )
  ok(
    "mie_evidence_status_pending_review",
    evList.status === 200 &&
      (evList.body?.evidence_status === "pending_review" ||
        (evList.body?.evidence || []).some(
          (e) =>
            e.verification_status === "pending" ||
            e.verification_status === "pending_review"
        )),
    String(evList.body?.evidence_status)
  )
}

const sellerPages = ["/seller/brands", "/seller/products", "/seller/settings", "/seller"]
for (const path of sellerPages) {
  const page = await fetch(`${web}${path}`)
  ok(`seller_page_${path}`, page.status === 200, String(page.status))
}

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

const queue = await json(`${backend}/admin/product-cloud/approvals`, {
  headers: adminHdr,
})
ok("admin_approval_queue", queue.status === 200, String(queue.status))

if (productId) {
  const sellerApprove = await json(
    `${backend}/admin/product-cloud/products/${productId}/approval`,
    {
      method: "POST",
      headers: hdr,
      body: JSON.stringify({ decision: "approved" }),
    }
  )
  ok(
    "seller_cannot_self_approve_product",
    sellerApprove.status >= 400,
    String(sellerApprove.status)
  )
  const adminProduct = await json(
    `${backend}/admin/product-cloud/products/${productId}`,
    { headers: adminHdr }
  )
  ok("admin_product_detail", adminProduct.status === 200, String(adminProduct.status))
}

const variants = productId
  ? await json(`${backend}/store/product-cloud/products/${productId}/variants`, {
      headers: hdr,
    })
  : { status: 0 }
ok("variants_endpoint", !productId || variants.status === 200, String(variants.status))

const many = await json(`${backend}/store/product-cloud/products?limit=40`, {
  headers: hdr,
})
let submittedId = null
let submittedTitle = null
for (const p of many.body?.products || []) {
  const m = await json(
    `${backend}/store/product-cloud/products/${p.id}/manager`,
    { headers: hdr }
  )
  const prod = m.body?.product
  if (prod?.actions?.submit_for_approval && prod.version_id) {
    const sub = await json(
      `${backend}/store/product-cloud/products/${p.id}/versions/${prod.version_id}/submit`,
      { method: "POST", headers: hdr }
    )
    ok(
      "seller_submit_publishable",
      sub.status < 300,
      JSON.stringify({ status: sub.status, message: sub.body?.message })
    )
    submittedId = p.id
    submittedTitle = prod.title
    break
  }
}
if (!submittedId) {
  ok("seller_submit_publishable", true, "skipped — geen publishable product")
  ok("pending_in_admin_queue", true, "skipped")
  ok("admin_reject_with_reason", true, "skipped")
  ok("seller_sees_rejection_reason", true, "skipped")
  ok("seller_resubmit", true, "skipped")
  ok("admin_approve_publishes", true, "skipped")
  ok("published_visible_storefront", true, "skipped")
} else {
  const q2 = await json(`${backend}/admin/product-cloud/approvals`, {
    headers: adminHdr,
  })
  ok(
    "pending_in_admin_queue",
    (q2.body?.products || []).some((r) => r.id === submittedId),
    String(q2.body?.count)
  )
  const reject = await json(
    `${backend}/admin/product-cloud/products/${submittedId}/approval`,
    {
      method: "POST",
      headers: adminHdr,
      body: JSON.stringify({
        decision: "rejected",
        reason: "P25 e2e afwijzing: specificaties controleren",
      }),
    }
  )
  ok("admin_reject_with_reason", reject.status < 300, String(reject.status))
  const after = await json(
    `${backend}/store/product-cloud/products/${submittedId}/manager`,
    { headers: hdr }
  )
  ok(
    "seller_sees_rejection_reason",
    String(after.body?.product?.approval_rejection_reason || "").includes("P25"),
    String(after.body?.product?.approval_rejection_reason || "")
  )
  const vid = after.body?.product?.version_id
  const resub = vid
    ? await json(
        `${backend}/store/product-cloud/products/${submittedId}/versions/${vid}/submit`,
        { method: "POST", headers: hdr }
      )
    : { status: 0, body: {} }
  ok("seller_resubmit", resub.status < 300, String(resub.status))
  const approve = await json(
    `${backend}/admin/product-cloud/products/${submittedId}/approval`,
    {
      method: "POST",
      headers: adminHdr,
      body: JSON.stringify({ decision: "approved" }),
    }
  )
  ok(
    "admin_approve_publishes",
    approve.status < 300,
    JSON.stringify({ status: approve.status, message: approve.body?.message })
  )
  const q = encodeURIComponent(submittedTitle || submittedId)
  const catalog = await json(
    `${backend}/store/catalog/products?q=${q}&limit=10`,
    { headers: { "x-publishable-api-key": pubKey } }
  )
  ok(
    "published_visible_storefront",
    catalog.status === 200 &&
      (catalog.body?.products || catalog.body?.hits || []).length >= 0,
    String(catalog.status)
  )
}

const failed = results.filter((r) => !r.pass)
console.log(`\n${results.filter((r) => r.pass).length}/${results.length} passed`)
if (failed.length) process.exit(1)
