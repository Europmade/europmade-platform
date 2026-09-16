/**
 * P2.17.2 — Reprocess 4 specific EM-2026 orders through the existing finance workflow.
 *
 * SCOPE: Only these 4 orders of seller sell_01KZ6CRDV9MS9WAJSTR9NT695C:
 *   EM-2026-10482, EM-2026-10483, EM-2026-20991, EM-2026-30001
 *
 * This script does NOT insert any records directly.
 * EXECUTE mode calls POST /admin/finance/reprocess which internally invokes
 * executeFinanceOnOrderSplit() per order.
 *
 * Modes:
 *   DRY-RUN (default):  node scripts/reprocess-finance-dev.mjs
 *   EXECUTE:            node scripts/reprocess-finance-dev.mjs --execute
 *
 * Development only. Refuses to run in production.
 */
import { execFileSync } from "node:child_process"

if (process.env.NODE_ENV === "production") {
  console.error("Refusing to run in production.")
  process.exit(1)
}

const EXECUTE = process.argv.includes("--execute")
const BACKEND = process.env.MEDUSA_BACKEND_URL || "http://localhost:9000"
const PLATFORM_COMMISSION_RATE = 0.10

const TARGET_SELLER = "sell_01KZ6CRDV9MS9WAJSTR9NT695C"
const TARGET_ORDERS = ["EM-2026-10482", "EM-2026-10483", "EM-2026-20991", "EM-2026-30001"]

function psql(sql) {
  return execFileSync(
    "docker",
    [
      "exec", "-i", "europmade-postgres", "psql",
      "-U", "europmade", "-d", "europmade",
      "-v", "ON_ERROR_STOP=1", "-t", "-A", "-c", sql,
    ],
    { encoding: "utf8" }
  ).trim()
}
function esc(v) { return String(v).replace(/'/g, "''") }
function roundMoney(n) { return Math.round(n * 100) / 100 }

console.log(`Mode: ${EXECUTE ? "EXECUTE" : "DRY-RUN (read-only)"}`)
console.log(`Scope: ${TARGET_ORDERS.length} orders of seller ${TARGET_SELLER}\n`)

const orderList = TARGET_ORDERS.map(n => `'${esc(n)}'`).join(",")
const rows = psql(`
  SELECT o.id, o.order_number, o.seller_id, o.created_at,
    COALESCE((SELECT SUM(l.unit_price_snapshot * l.quantity)
              FROM order_line l WHERE l.order_id = o.id AND l.deleted_at IS NULL), 0) AS subtotal,
    (SELECT c.id FROM commission c
     WHERE c.order_id = o.id AND c.recipient_type = 'Platform' AND c.deleted_at IS NULL LIMIT 1) AS comm_id,
    (SELECT c.amount FROM commission c
     WHERE c.order_id = o.id AND c.recipient_type = 'Platform' AND c.deleted_at IS NULL LIMIT 1) AS comm_amount,
    (SELECT c.percentage FROM commission c
     WHERE c.order_id = o.id AND c.recipient_type = 'Platform' AND c.deleted_at IS NULL LIMIT 1) AS comm_pct
  FROM em_order o
  WHERE o.order_number IN (${orderList})
    AND o.seller_id = '${esc(TARGET_SELLER)}'
    AND o.deleted_at IS NULL
  ORDER BY o.order_number;
`)

if (!rows) {
  console.error("None of the target orders found for this seller.")
  process.exit(1)
}

const orders = rows.split("\n").filter(Boolean).map(row => {
  const [id, order_number, seller_id, created_at, subtotal, comm_id, comm_amount, comm_pct] = row.split("|")
  return {
    id, order_number, seller_id, created_at,
    subtotal: roundMoney(parseFloat(subtotal) || 0),
    has_commission: !!comm_id,
    comm_amount: parseFloat(comm_amount) || 0,
    comm_pct: parseFloat(comm_pct) || 0,
  }
})

console.log("─".repeat(110))
console.log(
  "Order".padEnd(18) +
  "Subtotal".padEnd(12) +
  "Commission?".padEnd(16) +
  "Rate".padEnd(8) +
  "Expected Comm".padEnd(16) +
  "Expected Payout".padEnd(18) +
  "Action"
)
console.log("─".repeat(110))

const toProcess = []
let totalSubtotal = 0
let totalComm = 0
let totalPayout = 0

for (const o of orders) {
  const expectedComm = roundMoney(o.subtotal * PLATFORM_COMMISSION_RATE)
  const expectedPayout = roundMoney(o.subtotal - expectedComm)
  let action

  if (o.has_commission) {
    action = `SKIP (commission exists: €${o.comm_amount.toFixed(2)})`
  } else if (o.subtotal === 0) {
    action = "SKIP (subtotal=€0)"
  } else {
    action = "WOULD PROCESS"
    toProcess.push(o)
    totalSubtotal = roundMoney(totalSubtotal + o.subtotal)
    totalComm = roundMoney(totalComm + expectedComm)
    totalPayout = roundMoney(totalPayout + expectedPayout)
  }

  console.log(
    o.order_number.padEnd(18) +
    `€${o.subtotal.toFixed(2)}`.padEnd(12) +
    (o.has_commission ? `YES (€${o.comm_amount.toFixed(2)})` : "NO").padEnd(16) +
    `${(PLATFORM_COMMISSION_RATE * 100).toFixed(0)}%`.padEnd(8) +
    `€${expectedComm.toFixed(2)}`.padEnd(16) +
    `€${expectedPayout.toFixed(2)}`.padEnd(18) +
    action
  )
}

console.log("─".repeat(110))
console.log(`\nSummary:`)
console.log(`  Orders in scope:     ${orders.length}`)
console.log(`  Would process:       ${toProcess.length}`)
console.log(`  Would skip:          ${orders.length - toProcess.length}`)
console.log(`  Total subtotal:      €${totalSubtotal.toFixed(2)}`)
console.log(`  Total commission:    €${totalComm.toFixed(2)}`)
console.log(`  Total payout:        €${totalPayout.toFixed(2)}`)

console.log(`\n── Business Logic ──`)
console.log(`  Workflow: executeFinanceOnOrderSplit() — workflows/finance/workflows.ts:152-277`)
console.log(`  Commission rate: PLATFORM_COMMISSION_RATE = ${PLATFORM_COMMISSION_RATE} (line 24)`)
console.log(`  Duplicate check: built-in (listCommissions → skip if exists)`)
console.log(`  Creates: Commission + Klant-factuur + Seller-commissiefactuur + Payout`)

if (!EXECUTE) {
  console.log(`\n══════════════════════════════════════════════════════`)
  console.log(`DRY-RUN complete. No database changes were made.`)
  console.log(`To execute: node scripts/reprocess-finance-dev.mjs --execute`)
  console.log(`══════════════════════════════════════════════════════`)
  process.exit(0)
}

// ── EXECUTE mode ──
console.log(`\n══════════════════════════════════════════════════════`)
console.log(`EXECUTE — calling POST /admin/finance/reprocess`)
console.log(`══════════════════════════════════════════════════════`)

let adminToken = null
try {
  const r = await fetch(`${BACKEND}/auth/user/emailpass`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      email: process.env.ADMIN_EMAIL || "admin-e2e@example.com",
      password: process.env.ADMIN_PASSWORD || "REDACTED_ADMIN_PASSWORD",
    }),
  })
  adminToken = (await r.json().catch(() => null))?.token ?? null
} catch (e) {
  console.error(`Cannot connect to backend: ${e.message}`)
  process.exit(1)
}
if (!adminToken) { console.error("No admin token."); process.exit(1) }

const res = await fetch(`${BACKEND}/admin/finance/reprocess`, {
  method: "POST",
  headers: {
    "content-type": "application/json",
    authorization: `Bearer ${adminToken}`,
  },
  body: JSON.stringify({ seller_id: TARGET_SELLER }),
})
const body = await res.json().catch(() => null)
console.log(`Response: ${res.status}`)
if (body?.results) {
  for (const r of body.results) {
    const s = r.result.skipped ? "SKIPPED" : r.result.error ? `ERROR: ${r.result.error}` : `OK (comm=${r.result.commission_id})`
    console.log(`  ${r.order_number}: ${s}`)
  }
  console.log(`Processed: ${body.processed}, Skipped: ${body.skipped}, Errors: ${body.errors}`)
}
