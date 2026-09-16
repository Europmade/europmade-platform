/**
 * Local E2E checks for Seller Messages search/compose.
 * node scripts/e2e-seller-messages-search.mjs
 */
import { execFileSync } from "node:child_process"
import { createHmac } from "node:crypto"
import { readFileSync } from "node:fs"

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
function hotp(secret, counter) {
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
function totp(secretB32) {
  return hotp(base32Decode(secretB32), Math.floor(Date.now() / 1000 / 30))
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
SELECT mc.secret
FROM mfa_credential mc
JOIN customer c ON c.id = mc.customer_id
WHERE lower(c.email) = lower('${email}')
  AND mc.status = 'active'
  AND mc.deleted_at IS NULL
LIMIT 1;
`)
ok("mfa_secret", !!secret, secret ? "present" : "missing")

const login = await json(`${backend}/auth/customer/emailpass`, {
  method: "POST",
  headers: {
    "content-type": "application/json",
    "x-publishable-api-key": pubKey,
  },
  body: JSON.stringify({ email, password }),
})
ok("login_password", !!login.body.token, login.body.mfa_required ? "mfa_required" : "token")

let token = login.body.token
if (login.body.mfa_required || login.body.mfa_challenge) {
  await fetch(`${backend}/auth/session`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${login.body.token}`,
      "x-publishable-api-key": pubKey,
    },
  })
  const challenge = await json(`${backend}/store/mfa/challenges`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${login.body.token}`,
      "content-type": "application/json",
      "x-publishable-api-key": pubKey,
    },
    body: JSON.stringify({}),
  })
  const cid = challenge.body.mfa_challenge?.id
  const code = totp(secret)
  const verified = await json(
    `${backend}/store/mfa/challenges/${cid}/verify`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${login.body.token}`,
        "content-type": "application/json",
        "x-publishable-api-key": pubKey,
      },
      body: JSON.stringify({ code, trust_device: true }),
    }
  )
  ok(
    "mfa_verify",
    verified.status < 300 && !!verified.body.token,
    `status=${verified.status}`
  )
  token = verified.body.token
}

const hdr = {
  authorization: `Bearer ${token}`,
  "x-publishable-api-key": pubKey,
}

const custVe = await json(
  `${backend}/store/order-service/seller/customers?q=ve`,
  { headers: hdr }
)
ok(
  "customer_search_ve",
  custVe.status === 200 &&
    (custVe.body.customers || []).some(
      (c) => /vera/i.test(c.name) || /vera/i.test(c.email)
    ),
  JSON.stringify((custVe.body.customers || []).map((c) => c.name))
)

const custEmail = await json(
  `${backend}/store/order-service/seller/customers?q=fleur.dijkstra`,
  { headers: hdr }
)
ok(
  "customer_search_email",
  (custEmail.body.customers || []).some(
    (c) => c.email === "fleur.dijkstra@email.nl"
  ),
  String(custEmail.body.count)
)

const fleur = (custEmail.body.customers || []).find(
  (c) => c.email === "fleur.dijkstra@email.nl"
)
const orders = await json(
  `${backend}/store/order-service/seller/orders/lookup?customer_id=${encodeURIComponent(fleur.customer_id)}&q=EM-2026-10482`,
  { headers: hdr }
)
ok(
  "order_lookup",
  orders.status === 200 &&
    (orders.body.orders || []).some((o) => o.order_number === "EM-2026-10482"),
  `status=${orders.status} count=${orders.body.orders?.length ?? "err"}`
)

const action = await json(
  `${backend}/store/order-service/seller/messages?status=action_required`,
  { headers: hdr }
)
ok(
  "list_action_required",
  (action.body.threads || []).length >= 1 && action.body.attention_count >= 1,
  `threads=${action.body.threads?.length} attention=${action.body.attention_count}`
)

const byOrder = await json(
  `${backend}/store/order-service/seller/messages?status=all&q=EM-2026-10482`,
  { headers: hdr }
)
ok(
  "search_order_number",
  (byOrder.body.threads || []).length >= 1 &&
    (byOrder.body.threads || []).every(
      (t) =>
        t.order_number === "EM-2026-10482" ||
        (t.subject || "").toLowerCase().includes("levering")
    ),
  `count=${byOrder.body.threads?.length}`
)

const byEmail = await json(
  `${backend}/store/order-service/seller/messages?status=all&q=${encodeURIComponent("fleur.dijkstra@email.nl")}`,
  { headers: hdr }
)
ok(
  "search_customer_email",
  (byEmail.body.threads || []).length >= 2,
  `count=${byEmail.body.threads?.length}`
)

const waiting = await json(
  `${backend}/store/order-service/seller/messages?status=waiting_for_customer&q=fleur`,
  { headers: hdr }
)
ok(
  "filter_plus_search",
  (waiting.body.threads || []).every((t) => t.status === "waiting_for_customer") &&
    (waiting.body.threads || []).length >= 1,
  `count=${waiting.body.threads?.length}`
)

const listAll = await json(
  `${backend}/store/order-service/seller/messages?status=all`,
  { headers: hdr }
)
const withOrder = (listAll.body.threads || []).find(
  (t) => t.order_number === "EM-2026-10482"
)
const withoutOrder = (listAll.body.threads || []).find(
  (t) => !t.order_id && /Servicevraag|zonder order/i.test(t.subject || "")
)
ok("list_shows_order_number", !!withOrder?.order_number, withOrder?.order_number || "missing")
ok("list_no_order_conversation", !!withoutOrder, withoutOrder?.subject || "missing")
ok(
  "list_customer_fields",
  !!withOrder?.customer_name && !!withOrder?.customer_email,
  `${withOrder?.customer_name} / ${withOrder?.customer_email}`
)
ok(
  "unread_flag",
  (listAll.body.threads || []).some((t) => t.unread === true),
  "unread_present"
)

const orderId = (orders.body.orders || []).find(
  (o) => o.order_number === "EM-2026-10482"
)?.id

const createWith = await json(
  `${backend}/store/order-service/seller/conversations`,
  {
    method: "POST",
    headers: { ...hdr, "content-type": "application/json" },
    body: JSON.stringify({
      customer_id: fleur.customer_id,
      order_id: orderId,
      subject: "E2E with order",
      body: "Hallo met order",
    }),
  }
)
ok(
  "create_with_order",
  createWith.status === 201 && !!createWith.body.conversation_id,
  `status=${createWith.status}`
)

const createWithout = await json(
  `${backend}/store/order-service/seller/conversations`,
  {
    method: "POST",
    headers: { ...hdr, "content-type": "application/json" },
    body: JSON.stringify({
      customer_id: fleur.customer_id,
      subject: "E2E without order",
      body: "Hallo zonder order",
    }),
  }
)
ok(
  "create_without_order",
  createWithout.status === 201 && !!createWithout.body.conversation_id,
  `status=${createWithout.status}`
)

if (createWithout.body.conversation_id) {
  const id = createWithout.body.conversation_id
  const detail = await json(
    `${backend}/store/order-service/seller/conversations/${id}`,
    { headers: hdr }
  )
  ok("detail_no_order", detail.body.conversation?.order_id == null, String(detail.body.conversation?.order_id))

  const reply = await json(
    `${backend}/store/order-service/seller/conversations/${id}`,
    {
      method: "POST",
      headers: { ...hdr, "content-type": "application/json" },
      body: JSON.stringify({ body: "Seller reply E2E" }),
    }
  )
  ok("seller_reply", reply.status < 300, `status=${reply.status}`)

  const resolved = await json(
    `${backend}/store/order-service/seller/conversations/${id}`,
    {
      method: "PATCH",
      headers: { ...hdr, "content-type": "application/json" },
      body: JSON.stringify({ status: "resolved" }),
    }
  )
  ok(
    "resolve",
    resolved.status < 300 && resolved.body.conversation?.status === "resolved",
    resolved.body.conversation?.status
  )

  const reopen = await json(
    `${backend}/store/order-service/seller/conversations/${id}`,
    {
      method: "PATCH",
      headers: { ...hdr, "content-type": "application/json" },
      body: JSON.stringify({ status: "waiting_for_customer" }),
    }
  )
  ok("reopen", reopen.status < 300, reopen.body.conversation?.status)
}

const dash = await json(
  `${backend}/store/order-service/seller/messages?status=action_required`,
  { headers: hdr }
)
ok(
  "attention_count",
  typeof dash.body.attention_count === "number",
  String(dash.body.attention_count)
)

const failed = results.filter((r) => !r.pass)
console.log("---")
console.log(
  `PASSED=${results.length - failed.length} FAILED=${failed.length} TOTAL=${results.length}`
)
if (failed.length) process.exit(1)
