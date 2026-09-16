/**
 * P2.4 — product fields, CSV/XLSX import, admin review, central price.
 * node scripts/e2e-seller-p24.mjs
 */
import { execFileSync } from "node:child_process"
import { createHmac } from "node:crypto"
import { readFileSync } from "node:fs"
import { deflateRawSync } from "node:zlib"

const backend = process.env.BACKEND_URL || "http://localhost:9000"
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
  return { status: res.status, buf, headers: res.headers }
}

function crc32(buf) {
  let crc = ~0
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i]
    for (let j = 0; j < 8; j++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1))
  }
  return ~crc >>> 0
}

function zipFiles(files) {
  const locals = []
  const centrals = []
  let offset = 0
  for (const file of files) {
    const name = Buffer.from(file.name, "utf8")
    const compressed = deflateRawSync(file.data)
    const crc = crc32(file.data)
    const local = Buffer.alloc(30 + name.length)
    local.writeUInt32LE(0x04034b50, 0)
    local.writeUInt16LE(20, 4)
    local.writeUInt16LE(8, 8)
    local.writeUInt32LE(crc, 14)
    local.writeUInt32LE(compressed.length, 18)
    local.writeUInt32LE(file.data.length, 22)
    local.writeUInt16LE(name.length, 26)
    name.copy(local, 30)
    locals.push(Buffer.concat([local, compressed]))
    const central = Buffer.alloc(46 + name.length)
    central.writeUInt32LE(0x02014b50, 0)
    central.writeUInt16LE(20, 4)
    central.writeUInt16LE(20, 6)
    central.writeUInt16LE(8, 10)
    central.writeUInt32LE(crc, 16)
    central.writeUInt32LE(compressed.length, 20)
    central.writeUInt32LE(file.data.length, 24)
    central.writeUInt16LE(name.length, 28)
    central.writeUInt32LE(offset, 42)
    name.copy(central, 46)
    centrals.push(central)
    offset += local.length + compressed.length
  }
  const localBuf = Buffer.concat(locals)
  const centralBuf = Buffer.concat(centrals)
  const end = Buffer.alloc(22)
  end.writeUInt32LE(0x06054b50, 0)
  end.writeUInt16LE(files.length, 8)
  end.writeUInt16LE(files.length, 10)
  end.writeUInt32LE(centralBuf.length, 12)
  end.writeUInt32LE(localBuf.length, 16)
  return Buffer.concat([localBuf, centralBuf, end])
}

function makeXlsx(headers, row) {
  const esc = (v) =>
    String(v ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
  const sheetRows = [headers, row]
    .map(
      (cells, r) =>
        `<row r="${r + 1}">` +
        cells
          .map(
            (v, c) =>
              `<c r="${String.fromCharCode(65 + c)}${r + 1}" t="inlineStr"><is><t>${esc(v)}</t></is></c>`
          )
          .join("") +
        `</row>`
    )
    .join("")
  const sheet = `<?xml version="1.0"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${sheetRows}</sheetData></worksheet>`
  const types = `<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>`
  const rels = `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`
  const wbRels = `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`
  const workbook = `<?xml version="1.0"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Producten" sheetId="1" r:id="rId1"/></sheets></workbook>`
  return zipFiles([
    { name: "[Content_Types].xml", data: Buffer.from(types) },
    { name: "_rels/.rels", data: Buffer.from(rels) },
    { name: "xl/workbook.xml", data: Buffer.from(workbook) },
    { name: "xl/_rels/workbook.xml.rels", data: Buffer.from(wbRels) },
    { name: "xl/worksheets/sheet1.xml", data: Buffer.from(sheet) },
  ])
}

async function postFile(url, buf, filename, token) {
  const form = new FormData()
  form.append(
    "file",
    new Blob([buf], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    filename
  )
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "x-publishable-api-key": pubKey,
      authorization: `Bearer ${token}`,
    },
    body: form,
  })
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
  ok(
    "product_fields_schema",
    Array.isArray(manager.body?.product?.schema),
    String(manager.body?.product?.schema?.length || 0)
  )
}

const xlsx = await bin(`${backend}/store/product-cloud/import/template?format=xlsx`, {
  headers: hdr,
})
ok(
  "template_xlsx",
  xlsx.status === 200 && xlsx.buf.length > 100 && xlsx.buf.slice(0, 2).toString() === "PK",
  String(xlsx.status)
)

const csvTpl = await bin(`${backend}/store/product-cloud/import/template?format=csv`, {
  headers: hdr,
})
ok(
  "template_csv",
  csvTpl.status === 200 && csvTpl.buf.toString("utf8").includes("ean"),
  String(csvTpl.status)
)

const xlsxPreviewTpl = await postFile(
  `${backend}/store/product-cloud/import/preview`,
  xlsx.buf,
  "EuropMade product template.xlsx",
  token
)
ok(
  "xlsx_template_upload_preview",
  xlsxPreviewTpl.status === 200 &&
    Array.isArray(xlsxPreviewTpl.body?.headers) &&
    xlsxPreviewTpl.body.headers.includes("ean"),
  JSON.stringify({
    status: xlsxPreviewTpl.status,
    headers: xlsxPreviewTpl.body?.headers?.slice?.(0, 8),
    error: xlsxPreviewTpl.body?.message,
  })
)

const brandName =
  manager.body?.product?.brand_name ||
  list.body?.products?.[0]?.brand_name ||
  manager.body?.product?.brand_id ||
  ""
const brandId = manager.body?.product?.brand_id || list.body?.products?.[0]?.brand_id || ""
ok("seller_brand_for_import", Boolean(brandId || brandName), brandName || brandId || "none")

const stamp = String(Date.now()).slice(-10)
const eanNew = `872${stamp.padStart(10, "0")}`.slice(0, 13)
const csvGood = [
  "EAN-code,Artikelnummer,Productnaam,Merknaam,Categorie,Prijs,Voorraad,Verzendkosten,Land",
  `${eanNew},SKU-P24-${stamp.slice(-6)},P24 Robot ${stamp},${brandName},Robotstofzuiger,199.00,8,4.95,NL`,
].join("\n")

const previewAuto = await json(`${backend}/store/product-cloud/import/preview`, {
  method: "POST",
  headers: hdr,
  body: JSON.stringify({ csv_text: csvGood }),
})
ok("csv_preview_auto_mapping", previewAuto.status === 200, String(previewAuto.status))
ok(
  "csv_auto_map_ean",
  previewAuto.body?.mapping?.ean === "EAN-code",
  JSON.stringify(previewAuto.body?.mapping)
)
ok(
  "csv_preview_new_product",
  previewAuto.body?.summary?.new_products === 1 &&
    previewAuto.body?.summary?.error_rows === 0,
  JSON.stringify(previewAuto.body?.summary)
)

const csvBad = "EAN-code,Productnaam\n,Zonder EAN"
const previewBad = await json(`${backend}/store/product-cloud/import/preview`, {
  method: "POST",
  headers: hdr,
  body: JSON.stringify({ csv_text: csvBad }),
})
ok(
  "csv_preview_errors",
  previewBad.body?.summary?.error_rows >= 1 &&
    previewBad.body?.summary?.missing_ean >= 1,
  JSON.stringify(previewBad.body?.summary)
)

const commitBad = await json(`${backend}/store/product-cloud/import`, {
  method: "POST",
  headers: hdr,
  body: JSON.stringify({ csv_text: csvBad }),
})
ok(
  "import_refuses_errors",
  commitBad.status >= 400,
  String(commitBad.status)
)

const mappingManual = {
  ...(previewAuto.body?.mapping || {}),
  title: "Productnaam",
}
const previewManual = await json(`${backend}/store/product-cloud/import/preview`, {
  method: "POST",
  headers: hdr,
  body: JSON.stringify({
    csv_text: csvGood,
    mapping: mappingManual,
  }),
})
ok(
  "manual_mapping_preview",
  previewManual.status === 200 && previewManual.body?.mapping?.title === "Productnaam",
  String(previewManual.status)
)

const commitGood = await json(`${backend}/store/product-cloud/import`, {
  method: "POST",
  headers: hdr,
  body: JSON.stringify({
    csv_text: csvGood,
    mapping: mappingManual,
  }),
})
ok(
  "csv_import_commit",
  commitGood.status < 300 && commitGood.body?.imported >= 1,
  JSON.stringify({ status: commitGood.status, body: commitGood.body })
)

const eanXlsx = `873${stamp.padStart(10, "0")}`.slice(0, 13)
const xlsxOwn = makeXlsx(
  [
    "EAN-code",
    "Artikelnummer",
    "Productnaam",
    "Merknaam",
    "Categorie",
    "Prijs",
    "Voorraad",
    "Verzendkosten",
    "Land",
  ],
  [
    eanXlsx,
    `SKU-P24X-${stamp.slice(-6)}`,
    `P24 XLSX ${stamp}`,
    brandName,
    "Robotstofzuiger",
    "199.00",
    "4",
    "4.95",
    "NL",
  ]
)
const xlsxOwnPreview = await postFile(
  `${backend}/store/product-cloud/import/preview`,
  xlsxOwn,
  "eigen-export.xlsx",
  token
)
ok(
  "xlsx_upload_preview",
  xlsxOwnPreview.status === 200 &&
    xlsxOwnPreview.body?.summary?.new_products === 1 &&
    xlsxOwnPreview.body?.summary?.error_rows === 0,
  JSON.stringify({
    status: xlsxOwnPreview.status,
    summary: xlsxOwnPreview.body?.summary,
    mapping: xlsxOwnPreview.body?.mapping,
  })
)
ok(
  "xlsx_auto_mapping",
  xlsxOwnPreview.body?.mapping?.ean === "EAN-code",
  JSON.stringify(xlsxOwnPreview.body?.mapping)
)
const xlsxCommit = await postFile(
  `${backend}/store/product-cloud/import`,
  xlsxOwn,
  "eigen-export.xlsx",
  token
)
ok(
  "xlsx_import_commit",
  xlsxCommit.status < 300 && xlsxCommit.body?.imported >= 1,
  JSON.stringify({ status: xlsxCommit.status, body: xlsxCommit.body })
)

const importedId = commitGood.body?.product_ids?.[0]
let importedMgr = { status: 0, body: {} }
if (importedId) {
  importedMgr = await json(
    `${backend}/store/product-cloud/products/${importedId}/manager`,
    { headers: hdr }
  )
  const schema = importedMgr.body?.product?.schema || []
  ok(
    "category_fields_visible",
    schema.some((f) => f.code === "zuigkracht"),
    schema.map((f) => f.code).slice(0, 12).join(",")
  )
  ok(
    "required_recommended_optional_present",
    schema.some((f) => f.requirement_tier === "category_required") &&
      schema.some((f) => f.requirement_tier === "recommended" || f.requirement_tier === "optional"),
    schema.map((f) => f.requirement_tier).join(",")
  )
  ok(
    "central_regular_price",
    Number(importedMgr.body?.product?.regular_customer_price) === 199,
    String(importedMgr.body?.product?.regular_customer_price)
  )
}

if (importedId && importedMgr.body?.product?.identifier_id) {
  const ident = importedMgr.body.product.identifier_id
  const de = await json(`${backend}/store/commerce-cloud/offers`, {
    method: "POST",
    headers: hdr,
    body: JSON.stringify({
      identifier_id: ident,
      region_code: "DE",
      quantity_available: 5,
      base_price: 250,
      regular_customer_price: 199,
      shipping_cost: 9.95,
      extra_delivery_cost: 0,
      vat_rate: 0.21,
      sales_status: "active",
    }),
  })
  ok("second_market_offer", de.status < 300, String(de.status))
  const offers = await json(
    `${backend}/store/commerce-cloud/offers?identifier_id=${ident}`,
    { headers: hdr }
  )
  const prices = (offers.body?.offers || []).map((o) => Number(o.price?.base_price))
  const ship = (offers.body?.offers || []).map((o) => Number(o.price?.shipping_cost))
  ok(
    "same_regular_base_price",
    prices.length >= 1 && prices.every((p) => p === 199),
    JSON.stringify(prices)
  )
  ok(
    "different_shipping_allowed",
    new Set(ship).size >= 1,
    JSON.stringify(ship)
  )
  const totals = (offers.body?.offers || []).map((o) => Number(o.total_price))
  ok(
    "customer_price_uses_central_plus_shipping",
    totals.some((n) => Math.abs(n - 203.95) < 0.02) ||
      totals.some((n) => Math.abs(n - 208.95) < 0.02),
    JSON.stringify(totals)
  )
  const deRow = (offers.body?.offers || []).find(
    (o) => (o.offer?.region_code || o.region_code) === "DE"
  )
  const deId = deRow?.offer?.id || deRow?.id
  if (deId) {
    const promo = await json(`${backend}/store/commerce-cloud/offers/${deId}`, {
      method: "PATCH",
      headers: hdr,
      body: JSON.stringify({
        promo_price: 179,
        shipping_cost: 9.95,
        extra_delivery_cost: 0,
      }),
    })
    ok("market_promo_price", promo.status < 300, String(promo.status))
    const after = await json(
      `${backend}/store/commerce-cloud/offers?identifier_id=${ident}`,
      { headers: hdr }
    )
    const bases = (after.body?.offers || []).map((o) => Number(o.price?.base_price))
    const promos = (after.body?.offers || []).map((o) =>
      o.price?.promo_price != null ? Number(o.price.promo_price) : null
    )
    ok(
      "promo_does_not_change_regular_base",
      bases.length >= 1 && bases.every((p) => p === 199),
      JSON.stringify({ bases, promos })
    )
    ok(
      "promo_per_market",
      promos.some((p) => p === 179),
      JSON.stringify(promos)
    )
  }
}

const adminLogin = await json(`${backend}/auth/user/emailpass`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ email: adminEmail, password: adminPassword }),
})
ok("admin_login", adminLogin.status < 300 && Boolean(adminLogin.body?.token), String(adminLogin.status))
const adminHdr = {
  "content-type": "application/json",
  authorization: `Bearer ${adminLogin.body?.token}`,
}

const cats = await json(`${backend}/admin/product-cloud/categories`, {
  headers: adminHdr,
})
ok("admin_categories", cats.status === 200, String(cats.status))
const cat =
  (cats.body?.categories || []).find((c) =>
    String(c.slug || c.name || "").toLowerCase().includes("robot")
  ) || cats.body?.categories?.[0]
if (cat?.id) {
  const attrs = await json(
    `${backend}/admin/product-cloud/categories/${cat.id}/attributes`,
    { headers: adminHdr }
  )
  ok("admin_fields_list", attrs.status === 200, String(attrs.status))
  const suggest = await json(
    `${backend}/admin/product-cloud/categories/${cat.id}/attribute-suggestions`,
    { method: "POST", headers: adminHdr, body: "{}" }
  )
  ok(
    "ai_provider_none",
    suggest.body?.provider === "none" && Array.isArray(suggest.body?.suggestions),
    JSON.stringify({ provider: suggest.body?.provider, n: suggest.body?.suggestions?.length })
  )
  const first = attrs.body?.attribute_definitions?.[0]
  if (first?.id) {
    const patch = await json(
      `${backend}/admin/product-cloud/categories/${cat.id}/attributes/${first.id}`,
      {
        method: "PATCH",
        headers: adminHdr,
        body: JSON.stringify({ help_text: "P24 e2e help" }),
      }
    )
    ok("admin_field_patch", patch.status < 300, String(patch.status))
  }
}

const evidence = await json(
  `${backend}/admin/product-cloud/compliance/evidence?status=pending`,
  { headers: adminHdr }
)
ok("admin_pending_visible", evidence.status === 200, String(evidence.status))
const row = (evidence.body?.evidence || []).find((e) => e.product_id === productId) ||
  evidence.body?.evidence?.[0]
if (row) {
  ok("admin_row_has_ean_or_title", Boolean(row.product_title || row.ean), JSON.stringify({
    title: row.product_title,
    ean: row.ean,
    seller: row.seller_name,
    kind: row.evidence_kind,
  }))
  const sellerReview = await json(
    `${backend}/admin/product-cloud/products/${row.product_id}/evidence/${row.id}/review`,
    {
      method: "POST",
      headers: hdr,
      body: JSON.stringify({ status: "approved", reason: "seller self" }),
    }
  )
  ok(
    "seller_cannot_self_approve",
    sellerReview.status >= 400,
    String(sellerReview.status)
  )
  const reject = await json(
    `${backend}/admin/product-cloud/products/${row.product_id}/evidence/${row.id}/review`,
    {
      method: "POST",
      headers: adminHdr,
      body: JSON.stringify({ status: "rejected", reason: "P24 e2e reject" }),
    }
  )
  ok("admin_reject", reject.status < 300, String(reject.status))
  const approve = await json(
    `${backend}/admin/product-cloud/products/${row.product_id}/evidence/${row.id}/review`,
    {
      method: "POST",
      headers: adminHdr,
      body: JSON.stringify({ status: "approved", reason: "P24 e2e approve" }),
    }
  )
  ok("admin_approve", approve.status < 300, String(approve.status))
} else {
  ok("admin_pending_row", false, "no pending evidence")
}

if (importedId) {
  const mgr3 = await json(
    `${backend}/store/product-cloud/products/${importedId}/manager`,
    { headers: hdr }
  )
  const c = mgr3.body?.product?.completeness
  ok(
    "incomplete_not_publishable",
    c && c.publishable === false,
    JSON.stringify({
      publishable: c?.publishable,
      sale: c?.sale_presentation,
      review: c?.compliance_review_status,
    })
  )
}

const variants = productId
  ? await json(`${backend}/store/product-cloud/products/${productId}/variants`, {
      headers: hdr,
    })
  : { status: 0 }
ok("variants_endpoint", !productId || variants.status === 200, String(variants.status))

const failed = results.filter((r) => !r.pass)
console.log(`\n${results.filter((r) => r.pass).length}/${results.length} passed`)
if (failed.length) process.exit(1)
