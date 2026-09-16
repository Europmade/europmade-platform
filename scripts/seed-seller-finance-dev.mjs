/**
 * P2.17.1 — Development-only seed for Seller Finance test data.
 *
 * Creates: 3 test orders + commissions + payouts, 2 ad campaigns + weeks.
 * Invoice generation requires a backend restart (for seller_invoice migration)
 * and is triggered via the admin API separately.
 *
 * Usage:
 *   node scripts/seed-seller-finance-dev.mjs
 *
 * Refuses to run when NODE_ENV=production.
 */
import { execFileSync } from "node:child_process"
import { randomUUID } from "node:crypto"

if (process.env.NODE_ENV === "production") {
  console.error("Refusing to seed finance fixtures in production.")
  process.exit(1)
}

const BACKEND = process.env.MEDUSA_BACKEND_URL || "http://localhost:9000"

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

function psqlSafe(sql) {
  try { return psql(sql) } catch { return "" }
}

function esc(v) { return String(v).replace(/'/g, "''") }
function uid(prefix) { return `${prefix}_${randomUUID().replace(/-/g, "").slice(0, 24)}` }
function rawJson(v) { return JSON.stringify({ value: String(v), precision: 20 }) }

// ── Find the seller ──
const SELLER_ID = psql(
  `SELECT id FROM seller WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT 1;`
).split("\n")[0].trim()
if (!SELLER_ID) { console.error("No seller found. Run onboarding first."); process.exit(1) }
const CUSTOMER_ID = psql(
  `SELECT customer_id FROM seller WHERE id = '${esc(SELLER_ID)}';`
).split("\n")[0].trim()
console.log(`Seller: ${SELLER_ID}, Customer: ${CUSTOMER_ID}`)

// ── 1. Orders + commissions + payouts ──
const existingOrders = parseInt(psqlSafe(
  `SELECT count(*) FROM em_order WHERE order_number LIKE 'EM-TEST-100%' AND deleted_at IS NULL;`
) || "0", 10)

if (existingOrders >= 3) {
  console.log("Orders already seeded (3 EM-TEST orders exist).")
} else {
  // Create order_set
  const osetId = uid("oset")
  psql(`INSERT INTO order_set (id, customer_id, payment_reference, created_at, updated_at)
        VALUES ('${osetId}', '${esc(CUSTOMER_ID)}', 'pay_test_fin_${Date.now()}', now(), now())
        ON CONFLICT DO NOTHING;`)

  const orders = [
    { num: "EM-TEST-1001", amount: 200, rate: 0.10, comm: 20 },
    { num: "EM-TEST-1002", amount: 350, rate: 0.08, comm: 28 },
    { num: "EM-TEST-1003", amount: 150, rate: 0.10, comm: 15 },
  ]

  for (const o of orders) {
    const orderId = uid("mord")
    const lineId = uid("olin")
    const commId = uid("comm")
    const payId = uid("pay")
    const net = o.amount - o.comm

    psql(`INSERT INTO em_order (id, order_number, order_set_id, customer_id, seller_id,
            payment_status, shipping_address, billing_address, shipping_country_code,
            created_at, updated_at)
          VALUES ('${orderId}', '${o.num}', '${osetId}', '${esc(CUSTOMER_ID)}', '${esc(SELLER_ID)}',
            'Betaald', 'Test 1, Amsterdam, NL', 'Test 1, Amsterdam, NL', 'NL',
            '2026-08-10T12:00:00Z', now()) ON CONFLICT DO NOTHING;`)

    psql(`INSERT INTO order_line (id, order_id, product_variant_id, offer_id,
            quantity, unit_price_snapshot, raw_unit_price_snapshot, vat_rate_snapshot,
            created_at, updated_at)
          VALUES ('${lineId}', '${orderId}', 'pvar_test_product', 'off_test_offer',
            1, ${o.amount}, '${esc(rawJson(o.amount))}'::jsonb, 0.21,
            '2026-08-10T12:00:00Z', now()) ON CONFLICT DO NOTHING;`)

    psql(`INSERT INTO commission (id, recipient_type, order_id, amount, raw_amount,
            percentage, status, created_at, updated_at)
          VALUES ('${commId}', 'Platform', '${orderId}', ${o.comm}, '${esc(rawJson(o.comm))}'::jsonb,
            ${o.rate}, 'Toegekend', '2026-08-10T12:00:00Z', now()) ON CONFLICT DO NOTHING;`)

    psql(`INSERT INTO payout (id, recipient_type, seller_id, amount, raw_amount,
            period, status, currency, eligible_at, order_id,
            created_at, updated_at)
          VALUES ('${payId}', 'Seller', '${esc(SELLER_ID)}', ${net}, '${esc(rawJson(net))}'::jsonb,
            'order:${orderId}', 'Gepland', 'EUR', '2026-08-24T12:00:00Z', '${orderId}',
            '2026-08-10T12:00:00Z', now()) ON CONFLICT DO NOTHING;`)

    console.log(`  Order ${o.num}: €${o.amount} × ${o.rate * 100}% = €${o.comm}`)
  }
}

// ── 2. Ad campaigns ──
const existingCamps = parseInt(psqlSafe(
  `SELECT count(*) FROM ad_campaign WHERE seller_id = '${esc(SELLER_ID)}' AND name LIKE 'Test Campaign%' AND deleted_at IS NULL;`
) || "0", 10)

if (existingCamps >= 2) {
  console.log("Ad campaigns already seeded.")
} else {
  const campAId = uid("adcmp")
  const campBId = uid("adcmp")
  const weekAId = uid("adwk")
  const weekBId = uid("adwk")

  psql(`INSERT INTO ad_campaign (id, seller_id, name, placement, target_type, markets,
          destination_url, status, total_price, created_at, updated_at)
        VALUES ('${campAId}', '${esc(SELLER_ID)}', 'Test Campaign A', 'homepage', 'homepage', '["NL"]'::jsonb,
          'https://europmade.com', 'approved', 995, '2026-08-05T10:00:00Z', now()) ON CONFLICT DO NOTHING;`)

  psql(`INSERT INTO ad_campaign (id, seller_id, name, placement, target_type, markets,
          destination_url, status, total_price, created_at, updated_at)
        VALUES ('${campBId}', '${esc(SELLER_ID)}', 'Test Campaign B', 'category', 'category', '["BE"]'::jsonb,
          'https://europmade.com/cat', 'approved', 395, '2026-08-06T10:00:00Z', now()) ON CONFLICT DO NOTHING;`)

  psql(`INSERT INTO ad_campaign_week (id, campaign_id, placement, target_type,
          market_code, week_start, week_end, week_price, created_at, updated_at)
        VALUES ('${weekAId}', '${campAId}', 'homepage', 'homepage',
          'NL', '2026-08-11T00:00:00Z', '2026-08-17T23:59:59Z', 995, '2026-08-05T10:00:00Z', now())
        ON CONFLICT DO NOTHING;`)

  psql(`INSERT INTO ad_campaign_week (id, campaign_id, placement, target_type,
          market_code, week_start, week_end, week_price, created_at, updated_at)
        VALUES ('${weekBId}', '${campBId}', 'category', 'category',
          'BE', '2026-08-18T00:00:00Z', '2026-08-24T23:59:59Z', 395, '2026-08-06T10:00:00Z', now())
        ON CONFLICT DO NOTHING;`)

  console.log("  Campaign A: Homepage NL wk33 €995")
  console.log("  Campaign B: Category BE wk34 €395")
}

// ── 3. Verification ──
console.log("\n── Verification ──")
console.log(`  EM-TEST orders: ${psqlSafe(`SELECT count(*) FROM em_order WHERE order_number LIKE 'EM-TEST-100%' AND deleted_at IS NULL;`)}`)
console.log(`  Platform commissions (Toegekend): ${psqlSafe(`SELECT count(*) FROM commission WHERE status = 'Toegekend' AND recipient_type = 'Platform' AND deleted_at IS NULL;`)}`)
console.log(`  Commission total: €${psqlSafe(`SELECT COALESCE(sum(amount), 0) FROM commission WHERE status = 'Toegekend' AND recipient_type = 'Platform' AND deleted_at IS NULL;`)}`)
console.log(`  Ad campaigns (approved): ${psqlSafe(`SELECT count(*) FROM ad_campaign WHERE status = 'approved' AND deleted_at IS NULL;`)}`)
console.log(`  Ad weeks total: €${psqlSafe(`SELECT COALESCE(sum(week_price), 0) FROM ad_campaign_week WHERE deleted_at IS NULL;`)}`)
console.log(`  Seller payouts: ${psqlSafe(`SELECT count(*) FROM payout WHERE seller_id = '${esc(SELLER_ID)}' AND deleted_at IS NULL;`)}`)

const siExists = psqlSafe(`SELECT count(*) FROM information_schema.tables WHERE table_name = 'seller_invoice';`)
if (siExists === "1") {
  console.log(`  Seller invoices: ${psqlSafe(`SELECT count(*) FROM seller_invoice WHERE deleted_at IS NULL;`)}`)
} else {
  console.log("  seller_invoice table does not exist yet — restart backend to apply migration.")
}

// ── 4. Invoice generation attempt ──
console.log("\n── Invoice Generation ──")
if (siExists !== "1") {
  console.log("Skipping invoice generation — seller_invoice table missing.")
  console.log("After backend restart, trigger via: POST /admin/finance/invoicing {year:2026,month:8}")
} else {
  let adminToken = null
  try {
    const r = await fetch(`${BACKEND}/auth/user/emailpass`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "admin@europmade.com", password: "REDACTED_SEED_PASSWORD" }),
    })
    adminToken = (await r.json().catch(() => null))?.token ?? null
  } catch {}

  if (!adminToken) {
    console.log("Could not get admin token — trigger invoice generation manually after backend restart.")
  } else {
    const ir = await fetch(`${BACKEND}/admin/finance/invoicing`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ year: 2026, month: 8 }),
    })
    const ib = await ir.json().catch(() => null)
    console.log(`  Status: ${ir.status}`)
    if (ib?.results) {
      for (const r of ib.results) console.log(`  Seller ${r.seller_id}: ${JSON.stringify(r.result)}`)
    } else {
      console.log(`  ${JSON.stringify(ib)}`)
    }
  }
}

console.log("\nDone. If seller_invoice table was missing, restart the backend and re-run this script.")
