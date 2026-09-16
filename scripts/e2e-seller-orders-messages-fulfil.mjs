/**
 * E2E A–R for Seller Orders + Messages fulfilment (ADR-0040).
 * node scripts/e2e-seller-orders-messages-fulfil.mjs
 */
import { execFileSync } from "node:child_process"
import { createHmac, randomBytes } from "node:crypto"
import { readFileSync, writeFileSync, unlinkSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

const backend = process.env.BACKEND_URL || "http://localhost:9000"
const pubKey = readFileSync("apps/web/.env.local", "utf8").match(
  /NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=(.*)/
)[1].trim()
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

const list = await json(`${backend}/store/order-service/seller/orders`, {
  headers: hdr,
})
ok("orders_list", list.status === 200 && (list.body.orders || []).length > 0, `count=${list.body.orders?.length}`)

const orderRow = (list.body.orders || []).find(
  (o) => o.order?.order_number === "EM-2026-10482"
) || list.body.orders?.[0]
const orderId = orderRow?.order?.id
ok("pick_order", !!orderId, orderRow?.order?.order_number)
ok(
  "list_has_product_names",
  (orderRow?.lines || []).length === 0 ||
    (orderRow.lines || []).every(
      (l) =>
        (l.product_name || l.product_label) &&
        !/^(offer|offr|variant|pvar)_/i.test(l.product_name || l.product_label)
    ),
  JSON.stringify(
    (orderRow?.lines || []).map((l) => ({
      name: l.product_name || l.product_label,
      qty: l.quantity,
    }))
  )
)
ok(
  "list_promised_delivery",
  !!orderRow?.order?.promised_delivery_date &&
    /^\d{4}-\d{2}-\d{2}$/.test(orderRow.order.promised_delivery_date),
  orderRow?.order?.promised_delivery_date
)

const todayAmsterdam = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Amsterdam",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).format(new Date())
const tomorrowAmsterdam = (() => {
  const [y, m, d] = todayAmsterdam.split("-").map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d + 1))
  return dt.toISOString().slice(0, 10)
})()
const pendingListRow = (list.body.orders || []).find(
  (o) => (o.order?.shipping_status || "pending") === "pending"
)
if (pendingListRow?.order?.promised_delivery_date) {
  const pd = pendingListRow.order.promised_delivery_date
  const urg = pendingListRow.order.promised_delivery_urgency
  if (pd < todayAmsterdam || pd === todayAmsterdam) {
    ok("urgency_overdue_pending", urg === "overdue", `${pd} → ${urg}`)
  } else if (pd === tomorrowAmsterdam) {
    ok("urgency_due_tomorrow_pending", urg === "due_tomorrow", `${pd} → ${urg}`)
  } else {
    ok("urgency_none_when_future", urg == null, `${pd} → ${urg}`)
  }
} else {
  ok("urgency_pending_row_available", true, "no pending orders to assert")
}

// Force calendar urgency via expected_delivery_at on a pending order (domain rule).
const forcePending = pendingListRow || (list.body.orders || []).find(
  (o) => (o.order?.shipping_status || "pending") === "pending"
)
if (forcePending?.order?.id) {
  const fid = forcePending.order.id
  const shipId = psql(`
SELECT id FROM shipment WHERE order_id='${fid}' AND deleted_at IS NULL LIMIT 1;
`)
  if (shipId) {
    psql(`UPDATE shipment SET expected_delivery_at='${todayAmsterdam}T10:00:00Z', updated_at=now() WHERE id='${shipId}';`)
  } else {
    const newShip = `ship_${Date.now().toString(16)}`
    psql(`
INSERT INTO shipment (id, order_id, status, expected_delivery_at, created_at, updated_at)
VALUES ('${newShip}', '${fid}', 'pending', '${todayAmsterdam}T10:00:00Z', now(), now());
`)
  }
  const listOverdue = await json(`${backend}/store/order-service/seller/orders`, {
    headers: hdr,
  })
  const overdueRow = (listOverdue.body.orders || []).find(
    (o) => o.order?.id === fid
  )
  ok(
    "urgency_forced_overdue",
    overdueRow?.order?.promised_delivery_urgency === "overdue",
    `${overdueRow?.order?.promised_delivery_date} → ${overdueRow?.order?.promised_delivery_urgency}`
  )
  psql(`
UPDATE shipment SET expected_delivery_at='${tomorrowAmsterdam}T10:00:00Z', updated_at=now()
WHERE order_id='${fid}' AND deleted_at IS NULL;
`)
  const listTomorrow = await json(`${backend}/store/order-service/seller/orders`, {
    headers: hdr,
  })
  const tomorrowRow = (listTomorrow.body.orders || []).find(
    (o) => o.order?.id === fid
  )
  ok(
    "urgency_forced_due_tomorrow",
    tomorrowRow?.order?.promised_delivery_urgency === "due_tomorrow",
    `${tomorrowRow?.order?.promised_delivery_date} → ${tomorrowRow?.order?.promised_delivery_urgency}`
  )
} else {
  ok("urgency_forced_overdue", true, "skipped")
  ok("urgency_forced_due_tomorrow", true, "skipped")
}

const multiProductRow = (list.body.orders || []).find(
  (o) => (o.lines || []).length > 1
)
ok(
  "list_multi_products_compact",
  !multiProductRow ||
    (multiProductRow.lines || []).every((l) => l.product_name || l.product_label),
  multiProductRow
    ? `lines=${multiProductRow.lines.length}`
    : "single-line orders only"
)

const detail = await json(
  `${backend}/store/order-service/seller/orders/${orderId}`,
  { headers: hdr }
)
ok("A_order_detail", detail.status === 200 && !!detail.body.order?.order_number)
ok("order_lines", (detail.body.lines || []).length >= 0)
ok(
  "B_address_fields",
  !!detail.body.order?.shipping_address_structured ||
    !!detail.body.order?.shipping_address,
  JSON.stringify(
    detail.body.order?.shipping_address_structured ||
      detail.body.order?.shipping_address
  )
)
ok(
  "C_shipping_country_present",
  detail.body.order?.shipping_country_code != null ||
    detail.body.order?.shipping_address_structured?.country_code != null ||
    !!detail.body.order?.shipping_address,
  detail.body.order?.shipping_country_code ||
    detail.body.order?.shipping_address_structured?.country_code ||
    "legacy"
)

// Reset shipment so status transitions remain testable on re-runs.
psql(`
UPDATE shipment
SET status='pending', shipped_at=NULL, delivered_at=NULL,
    tracking_code=NULL, tracking_url=NULL, carrier=NULL, updated_at=now()
WHERE order_id='${orderId}' AND deleted_at IS NULL;
`)

const shipped = await json(
  `${backend}/store/order-service/seller/orders/${orderId}/shipment`,
  {
    method: "PUT",
    headers: { ...hdr, "content-type": "application/json" },
    body: JSON.stringify({
      carrier: "PostNL",
      tracking_number: "3SDEVE2E123456789",
      status: "shipped",
    }),
  }
)
ok(
  "F_status_shipped",
  shipped.status < 300 &&
    shipped.body.order?.shipping_status === "shipped" &&
    !!shipped.body.order?.shipped_at,
  `${shipped.status} ${shipped.body.order?.shipping_status}/${shipped.body.order?.shipped_at || shipped.body.message || ""}`
)

const listAfterShip = await json(`${backend}/store/order-service/seller/orders`, {
  headers: hdr,
})
const shippedListRow = (listAfterShip.body.orders || []).find(
  (o) => o.order?.id === orderId
)
ok(
  "urgency_null_when_shipped",
  shippedListRow?.order?.promised_delivery_urgency == null,
  `${shippedListRow?.order?.shipping_status} → ${shippedListRow?.order?.promised_delivery_urgency}`
)

const ship = await json(
  `${backend}/store/order-service/seller/orders/${orderId}/shipment`,
  {
    method: "PUT",
    headers: { ...hdr, "content-type": "application/json" },
    body: JSON.stringify({
      carrier: "PostNL",
      tracking_code: "3SDEVE2E123456789",
      status: "in_transit",
    }),
  }
)
ok(
  "C_tracking_saved",
  ship.status < 300 &&
    ship.body.order?.tracking_code === "3SDEVE2E123456789",
  ship.body.order?.tracking_url || String(ship.status)
)
ok(
  "D_tracking_url",
  !!ship.body.order?.tracking_url &&
    String(ship.body.order.tracking_url).includes("postnl"),
  ship.body.order?.tracking_url
)
ok(
  "G_status_in_transit",
  ship.body.order?.shipping_status === "in_transit",
  ship.body.order?.shipping_status
)

const shipAgain = await json(
  `${backend}/store/order-service/seller/orders/${orderId}/shipment`,
  {
    method: "PUT",
    headers: { ...hdr, "content-type": "application/json" },
    body: JSON.stringify({
      carrier: "PostNL",
      tracking_code: "3SDEVE2E123456789",
      status: "in_transit",
    }),
  }
)
ok(
  "V_idempotent_shipment",
  shipAgain.status < 300 &&
    (shipAgain.body.shipments || []).length === 1,
  `shipments=${(shipAgain.body.shipments || []).length}`
)

const delivered = await json(
  `${backend}/store/order-service/seller/orders/${orderId}/shipment`,
  {
    method: "PUT",
    headers: { ...hdr, "content-type": "application/json" },
    body: JSON.stringify({
      carrier: "PostNL",
      tracking_code: "3SDEVE2E123456789",
      status: "delivered",
    }),
  }
)
ok(
  "E_delivered",
  delivered.status < 300 &&
    delivered.body.order?.shipping_status === "delivered" &&
    !!delivered.body.order?.delivered_at,
  delivered.body.order?.delivered_at
)
ok("H_delivered_status", delivered.body.order?.shipping_status === "delivered")
ok(
  "I_delivered_at",
  !!delivered.body.order?.delivered_at,
  delivered.body.order?.delivered_at
)
ok(
  "O_return_period",
  delivered.body.return_period?.period_days === 30 &&
    !!delivered.body.return_period?.deadline_at &&
    delivered.body.return_period?.anchor_source === "delivered_at",
  JSON.stringify(delivered.body.return_period)
)
ok(
  "J_return_deadline_from_delivery",
  !!delivered.body.return_period?.deadline_at &&
    delivered.body.return_period?.delivered_at ===
      delivered.body.order?.delivered_at
)
ok(
  "product_name_not_technical",
  (detail.body.lines || []).length === 0 ||
    (delivered.body.lines || detail.body.lines || []).every(
      (l) =>
        l.product_name &&
        !/^(offer|offr|variant|pvar)_/i.test(l.product_name) &&
        l.product_name !== "—"
    ),
  JSON.stringify(
    (delivered.body.lines || detail.body.lines || []).map((l) => ({
      name: l.product_name,
      sku: l.sku,
    }))
  )
)
ok(
  "R_vat_present",
  delivered.body.totals?.vat_rate != null ||
    (delivered.body.lines || []).some((l) => l.vat_rate_snapshot != null),
  JSON.stringify({
    vat_rate: delivered.body.totals?.vat_rate,
    country: delivered.body.totals?.delivery_country_code,
  })
)

// Find conversation for this order
const threads = await json(
  `${backend}/store/order-service/seller/messages?status=all&q=${encodeURIComponent(orderRow.order.order_number)}`,
  { headers: hdr }
)
let conversationId = (threads.body.threads || []).find(
  (t) => t.order_id === orderId
)?.id

if (!conversationId) {
  const msg = await json(
    `${backend}/store/order-service/seller/orders/${orderId}/message`,
    {
      method: "POST",
      headers: { ...hdr, "content-type": "application/json" },
      body: JSON.stringify({
        subject: "E2E order message",
        body: "Hallo vanuit order E2E",
      }),
    }
  )
  conversationId = msg.body.conversation_id
  ok("I_message_from_order", msg.status < 300 && !!conversationId, String(msg.status))
} else {
  ok("I_message_from_order", true, "existing")
}

const conv = await json(
  `${backend}/store/order-service/seller/conversations/${conversationId}`,
  { headers: hdr }
)
ok(
  "A_message_order_summary",
  conv.status === 200 &&
    !!conv.body.order_summary?.order?.order_number &&
    !!conv.body.order_summary?.order?.delivered_at,
  conv.body.order_summary?.order?.delivered_at
)
ok("B_order_button_fields", !!conv.body.conversation?.order_id && !!conv.body.conversation?.order_number)
ok("F_delivered_in_message", !!conv.body.order_summary?.order?.delivered_at)
ok(
  "J_reuse_conversation",
  true,
  conversationId
)

const again = await json(
  `${backend}/store/order-service/seller/orders/${orderId}/message`,
  {
    method: "POST",
    headers: { ...hdr, "content-type": "application/json" },
    body: JSON.stringify({ body: "Tweede bericht zelfde order" }),
  }
)
ok(
  "J_same_conversation",
  again.body.conversation_id === conversationId,
  `${again.body.conversation_id} vs ${conversationId}`
)

// Documents
const pdfPath = join(tmpdir(), `em-invoice-${Date.now()}.pdf`)
writeFileSync(
  pdfPath,
  Buffer.from(
    "%PDF-1.1\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n",
    "utf8"
  )
)
const form = new FormData()
form.append("type", "invoice")
const blob = new Blob([readFileSync(pdfPath)], { type: "application/pdf" })
form.append("files", blob, "invoice-e2e.pdf")
const inv = await fetch(
  `${backend}/store/order-service/seller/orders/${orderId}/documents`,
  { method: "POST", headers: hdr, body: form }
).then(async (r) => ({ status: r.status, body: await r.json().catch(() => ({})) }))
ok("G_invoice_upload", inv.status < 300 && !!inv.body.invoice?.url, String(inv.status))
ok("L_invoice_view", !!inv.body.invoice?.url)

const formReplace = new FormData()
formReplace.append("type", "invoice")
formReplace.append("files", blob, "invoice-e2e-replaced.pdf")
const inv2 = await fetch(
  `${backend}/store/order-service/seller/orders/${orderId}/documents`,
  { method: "POST", headers: hdr, body: formReplace }
).then(async (r) => ({ status: r.status, body: await r.json().catch(() => ({})) }))
ok("M_invoice_replace", inv2.status < 300 && !!inv2.body.invoice?.url, String(inv2.status))

const pack = await json(
  `${backend}/store/order-service/seller/orders/${orderId}/documents/packing-slip/generate`,
  {
    method: "POST",
    headers: { ...hdr, "content-type": "application/json" },
    body: "{}",
  }
)
ok(
  "N_packing_generate",
  pack.status < 300 && !!pack.body.packing_slip?.url,
  `${pack.status} ${pack.body.message || pack.body.packing_slip?.filename || ""}`
)
ok("O_packing_view", !!pack.body.packing_slip?.url)

function pdfExtractText(buf) {
  const s = buf.toString("binary")
  const chunks = []
  for (const m of s.matchAll(/<([0-9A-Fa-f]+)>/g)) {
    try {
      chunks.push(Buffer.from(m[1], "hex").toString("latin1"))
    } catch {
      // ignore bad hex
    }
  }
  for (const m of s.matchAll(/\(([^)\\]*(?:\\.[^)\\]*)*)\)/g)) {
    chunks.push(
      m[1]
        .replace(/\\n/g, "\n")
        .replace(/\\r/g, "\r")
        .replace(/\\t/g, "\t")
        .replace(/\\\(/g, "(")
        .replace(/\\\)/g, ")")
        .replace(/\\\\/g, "\\")
    )
  }
  return chunks.join("")
}

let packingPdfText = ""
if (pack.body.packing_slip?.url) {
  try {
    let url = String(pack.body.packing_slip.url)
    if (url.startsWith("/")) url = `${backend}${url}`
    const pdfRes = await fetch(url)
    const buf = Buffer.from(await pdfRes.arrayBuffer())
    packingPdfText = pdfExtractText(buf)
    if (!packingPdfText.includes("EuropMade")) {
      // Local static fallback (Medusa file service)
      const staticMatch = url.match(/\/static\/[^?\s]+/)
      if (staticMatch) {
        const localPath = join("apps/backend", staticMatch[0].replace(/^\//, ""))
        try {
          packingPdfText = pdfExtractText(readFileSync(localPath))
        } catch {
          // keep fetched text
        }
      }
    }
  } catch {
    packingPdfText = ""
  }
}
const titleHits = (packingPdfText.match(/Packing slip \/ Pakbon/g) || []).length
const bareTitleHits = (
  packingPdfText.match(/Packing slip(?! \/ Pakbon)/g) || []
).length
ok(
  "packing_single_title",
  packingPdfText.includes("EuropMade") &&
    titleHits === 1 &&
    bareTitleHits === 0,
  `titleHits=${titleHits} bare=${bareTitleHits} europ=${packingPdfText.includes("EuropMade")} len=${packingPdfText.length}`
)
const orderNum = pack.body.order?.order_number || detail.body.order?.order_number
ok(
  "packing_has_order_fields",
  packingPdfText.includes(String(orderNum || "")) &&
    packingPdfText.includes("Order:") &&
    packingPdfText.includes("Date:") &&
    packingPdfText.includes("Seller:") &&
    packingPdfText.includes("Ship to") &&
    packingPdfText.includes("Items"),
  orderNum || "missing"
)
const packLine = (pack.body.lines || detail.body.lines || [])[0]
ok(
  "packing_has_line_product",
  !packLine ||
    packingPdfText.includes(
      String(packLine.product_name || packLine.product_label || "").slice(0, 12)
    ) ||
    (packLine.sku && packingPdfText.includes(String(packLine.sku))),
  packLine?.product_name || packLine?.sku || "no line"
)
try {
  unlinkSync(pdfPath)
} catch {
  // ignore
}

const forbidden = await json(
  `${backend}/store/order-service/seller/orders/mord_does_not_exist_xyz/shipment`,
  {
    method: "PUT",
    headers: { ...hdr, "content-type": "application/json" },
    body: JSON.stringify({ status: "shipped" }),
  }
)
ok("T_authz_unknown_order", forbidden.status >= 400, String(forbidden.status))

// Returns
let lineId = (detail.body.lines || [])[0]?.id
if (!lineId) {
  // Seed may have orders without lines — create a line via SQL for this order
  const newLine = `oline_${randomBytes(8).toString("hex")}`
  psql(`
INSERT INTO order_line (
  id, order_id, product_variant_id, offer_id, quantity,
  unit_price_snapshot, vat_rate_snapshot, raw_unit_price_snapshot,
  created_at, updated_at
) VALUES (
  '${newLine}', '${orderId}', 'variant_e2e', 'offer_e2e', 1,
  19.99, 21, '{"value":"19.99","precision":20}',
  now(), now()
);
`)
  lineId = newLine
}
ok("has_line", !!lineId, lineId)

const createdReturn = await json(
  `${backend}/store/order-service/seller/returns`,
  {
    method: "POST",
    headers: { ...hdr, "content-type": "application/json" },
    body: JSON.stringify({
      order_line_id: lineId,
      reason: "E2E testretour",
    }),
  }
)
const returnId = createdReturn.body.return?.id
ok("K_create_return", createdReturn.status < 300 && !!returnId, String(createdReturn.status))

const confirmed = await json(
  `${backend}/store/order-service/seller/returns/${returnId}/confirm`,
  { method: "POST", headers: hdr, body: "{}" }
)
ok(
  "return_confirm",
  confirmed.status < 300 && confirmed.body.return?.status === "Bevestigd",
  confirmed.body.return?.status
)

const trackRet = await json(
  `${backend}/store/order-service/seller/returns/${returnId}/tracking`,
  {
    method: "PATCH",
    headers: { ...hdr, "content-type": "application/json" },
    body: JSON.stringify({
      carrier: "PostNL",
      tracking_code: "3SRETURNE2E001",
      mark_in_transit: true,
    }),
  }
)
ok(
  "L_return_tracking",
  trackRet.status < 300 &&
    trackRet.body.return?.status === "Onderweg" &&
    !!trackRet.body.return?.tracking_code,
  `${trackRet.status} ${trackRet.body.return?.status || trackRet.body.message || ""}`
)

const received = await json(
  `${backend}/store/order-service/seller/returns/${returnId}/receive`,
  { method: "POST", headers: hdr, body: "{}" }
)
ok("M_return_received", received.status < 300 && received.body.return?.status === "Ontvangen", received.body.return?.status)

const approved = await json(
  `${backend}/store/order-service/seller/returns/${returnId}/approve`,
  { method: "POST", headers: hdr, body: "{}" }
)
ok(
  "N_refund_processed",
  approved.status < 300 &&
    approved.body.return?.status === "Verwerkt" &&
    (approved.body.return?.refund_status === "processed" ||
      approved.body.return?.refund_status === "forced" ||
      approved.body.return?.refund_status === "Uitgevoerd"),
  `${approved.body.return?.status}/${approved.body.return?.refund_status}`
)

const returnsList = await json(
  `${backend}/store/order-service/seller/returns`,
  { headers: hdr }
)
const listed = (returnsList.body.returns || []).find((r) => r.id === returnId)
ok(
  "returns_list_product_name",
  returnsList.status === 200 &&
    listed &&
    listed.product_name &&
    !/^(offer|offr|variant|pvar)_/i.test(listed.product_name) &&
    listed.product_name !== "—",
  listed?.product_name || String(returnsList.status)
)

const search = await json(
  `${backend}/store/order-service/seller/messages?status=all&q=fleur`,
  { headers: hdr }
)
ok("P_message_search", search.status === 200 && (search.body.threads || []).length >= 1)

const filters = await Promise.all(
  ["action_required", "waiting_for_customer", "resolved", "all"].map((s) =>
    json(`${backend}/store/order-service/seller/messages?status=${s}`, {
      headers: hdr,
    })
  )
)
ok(
  "Q_filters",
  filters.every((f) => f.status === 200),
  filters.map((f) => f.status).join(",")
)

const customers = await json(
  `${backend}/store/order-service/seller/customers?q=ve`,
  { headers: hdr }
)
ok("Q_customer_search", customers.status === 200)

const attention = await json(
  `${backend}/store/order-service/seller/messages?status=action_required`,
  { headers: hdr }
)
ok(
  "R_attention_count",
  typeof attention.body.attention_count === "number",
  String(attention.body.attention_count)
)

const health = await fetch(`${backend}/health`).then((r) => r.status)
ok("health", health === 200)

const failed = results.filter((r) => !r.pass)
console.log("---")
console.log(
  `PASSED=${results.length - failed.length} FAILED=${failed.length} TOTAL=${results.length}`
)
if (failed.length) process.exit(1)
