/**
 * Local/dev-only fixtures for Seller Messages inbox.
 *
 * Usage (from apps/backend or repo root):
 *   node scripts/seed-seller-messages-dev.mjs
 *
 * Env:
 *   SELLER_EMAIL (default: seller-flow-20260804144242@example.com)
 *   DATABASE_URL or docker europmade-postgres
 *
 * Refuses to run when NODE_ENV=production.
 */
import { execFileSync } from "node:child_process"
import { randomUUID } from "node:crypto"

if (process.env.NODE_ENV === "production") {
  console.error("Refusing to seed Seller Messages fixtures in production.")
  process.exit(1)
}

const SELLER_EMAIL =
  process.env.SELLER_EMAIL || "seller-flow-20260804144242@example.com"
const MARKER = "seed_seller_messages_dev_v1"

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
      "-v",
      "ON_ERROR_STOP=1",
      "-t",
      "-A",
      "-c",
      sql,
    ],
    { encoding: "utf8" }
  ).trim()
}

function esc(value) {
  return String(value).replace(/'/g, "''")
}

function id(prefix) {
  return `${prefix}_${randomUUID().replace(/-/g, "").slice(0, 20)}`
}

console.log(`Seeding Seller Messages fixtures for ${SELLER_EMAIL}…`)

const sellerRow = psql(`
SELECT s.id || '|' || s.customer_id
FROM seller s
JOIN customer c ON c.id = s.customer_id AND c.deleted_at IS NULL
WHERE s.deleted_at IS NULL
  AND lower(c.email) = lower('${esc(SELLER_EMAIL)}')
LIMIT 1;
`)

if (!sellerRow) {
  console.error(`Seller not found for ${SELLER_EMAIL}`)
  process.exit(1)
}

const [sellerId, sellerCustomerId] = sellerRow.split("|")
console.log(`Seller ${sellerId}`)

// Idempotent cleanup of previous seed rows for this seller
psql(`
BEGIN;
DELETE FROM order_conversation_read
WHERE conversation_id IN (
  SELECT id FROM em_conversation
  WHERE seller_id = '${esc(sellerId)}'
    AND (subject LIKE '[DEV]%' OR subject LIKE 'E2E %')
);
DELETE FROM order_message
WHERE conversation_id IN (
  SELECT id FROM em_conversation
  WHERE seller_id = '${esc(sellerId)}'
    AND (subject LIKE '[DEV]%' OR subject LIKE 'E2E %')
);
DELETE FROM order_message
WHERE order_id IN (
  SELECT o.id FROM em_order o
  JOIN order_set s ON s.id = o.order_set_id
  WHERE s.payment_reference LIKE 'PAY-DEV-MSG-%'
);
DELETE FROM em_conversation
WHERE seller_id = '${esc(sellerId)}'
  AND (subject LIKE '[DEV]%' OR subject LIKE 'E2E %');
DELETE FROM em_return
WHERE order_line_id IN (
  SELECT l.id FROM order_line l
  JOIN em_order o ON o.id = l.order_id
  JOIN order_set s ON s.id = o.order_set_id
  WHERE s.payment_reference LIKE 'PAY-DEV-MSG-%'
);
DELETE FROM order_document
WHERE order_id IN (
  SELECT o.id FROM em_order o
  JOIN order_set s ON s.id = o.order_set_id
  WHERE s.payment_reference LIKE 'PAY-DEV-MSG-%'
);
DELETE FROM shipment
WHERE order_id IN (
  SELECT o.id FROM em_order o
  JOIN order_set s ON s.id = o.order_set_id
  WHERE s.payment_reference LIKE 'PAY-DEV-MSG-%'
);
DELETE FROM order_line
WHERE order_id IN (
  SELECT id FROM em_order
  WHERE seller_id = '${esc(sellerId)}'
    AND order_set_id IN (
      SELECT id FROM order_set WHERE payment_reference LIKE 'PAY-DEV-MSG-%'
    )
);
DELETE FROM em_order
WHERE seller_id = '${esc(sellerId)}'
  AND order_set_id IN (
    SELECT id FROM order_set WHERE payment_reference LIKE 'PAY-DEV-MSG-%'
  );
DELETE FROM order_set
WHERE payment_reference LIKE 'PAY-DEV-MSG-%';
COMMIT;
`)

const customers = [
  {
    email: "fleur.dijkstra@email.nl",
    first: "Fleur",
    last: "Dijkstra",
  },
  {
    email: "test.customer@example.com",
    first: "Test",
    last: "Klant",
  },
  {
    email: "vera.vermeer@email.nl",
    first: "Vera",
    last: "Vermeer",
  },
]

const customerIds = {}
for (const c of customers) {
  let existing = psql(`
SELECT id FROM customer
WHERE deleted_at IS NULL AND lower(email) = lower('${esc(c.email)}')
LIMIT 1;
`)
  if (!existing) {
    const cid = id("cus")
    psql(`
INSERT INTO customer (
  id, email, first_name, last_name, has_account,
  created_at, updated_at
) VALUES (
  '${esc(cid)}',
  '${esc(c.email)}',
  '${esc(c.first)}',
  '${esc(c.last)}',
  false,
  now(),
  now()
);
`)
    existing = cid
    console.log(`Created customer ${c.email} → ${cid}`)
  } else {
    psql(`
UPDATE customer
SET first_name = '${esc(c.first)}',
    last_name = '${esc(c.last)}',
    updated_at = now()
WHERE id = '${esc(existing)}';
`)
    console.log(`Reusing customer ${c.email} → ${existing}`)
  }
  customerIds[c.email] = existing
}

const fleurId = customerIds["fleur.dijkstra@email.nl"]
const testId = customerIds["test.customer@example.com"]
const veraId = customerIds["vera.vermeer@email.nl"]

/** Ensure seller has a real commerce offer linked to Product Cloud catalog. */
function ensureSellerCatalogOffer() {
  const existingOffer = psql(`
SELECT o.id || '|' || i.product_variant_id || '|' || coalesce(i.identifier_value,'')
FROM offer o
JOIN identifier i ON i.id = o.identifier_id AND i.deleted_at IS NULL
WHERE o.deleted_at IS NULL
  AND o.seller_id = '${esc(sellerId)}'
LIMIT 1;
`)
  if (existingOffer) {
    const [offerId, variantId, sku] = existingOffer.split("|")
    console.log(`Reusing seller offer ${offerId} → variant ${variantId}`)
    return { offerId, variantId, sku }
  }

  const catalog = psql(`
SELECT i.id || '|' || i.product_variant_id || '|' || coalesce(i.identifier_value,'') || '|' || coalesce(pv.title,'')
FROM product_version pv
JOIN pc_product_variant v ON v.product_id = pv.product_id AND v.deleted_at IS NULL
JOIN identifier i ON i.product_variant_id = v.id AND i.deleted_at IS NULL
WHERE pv.deleted_at IS NULL
ORDER BY CASE WHEN pv.publication_status = 'Gepubliceerd' THEN 0 ELSE 1 END,
         pv.updated_at DESC
LIMIT 1;
`)
  if (!catalog) {
    throw new Error(
      "No Product Cloud catalog product found to link seller offer — cannot seed realistic order lines."
    )
  }
  const [identifierId, variantId, sku, title] = catalog.split("|")
  const offerId = id("offr")
  const priceId = id("oprc")
  const invId = id("oinv")
  psql(`
INSERT INTO offer (
  id, seller_id, identifier_id, region_code, created_at, updated_at
) VALUES (
  '${esc(offerId)}',
  '${esc(sellerId)}',
  '${esc(identifierId)}',
  'NL',
  now(),
  now()
);
INSERT INTO cc_price (
  id, offer_id, base_price, shipping_cost, vat_rate,
  raw_base_price, raw_shipping_cost, created_at, updated_at
) VALUES (
  '${esc(priceId)}',
  '${esc(offerId)}',
  29.95,
  0,
  21,
  '{"value":"29.95","precision":20}',
  '{"value":"0","precision":20}',
  now(),
  now()
);
INSERT INTO cc_inventory (
  id, offer_id, quantity_available, created_at, updated_at
) VALUES (
  '${esc(invId)}',
  '${esc(offerId)}',
  100,
  now(),
  now()
);
`)
  console.log(
    `Created seller offer ${offerId} for catalog "${title}" (SKU ${sku})`
  )
  return { offerId, variantId, sku }
}

const catalogOffer = ensureSellerCatalogOffer()

function createOrder(orderNumber, customerId, payRef) {
  const setId = id("ordset")
  const orderId = id("mord")
  const lineId = id("olin")
  psql(`
INSERT INTO order_set (
  id, customer_id, payment_reference, created_at, updated_at
) VALUES (
  '${esc(setId)}',
  '${esc(customerId)}',
  '${esc(payRef)}',
  now(),
  now()
);
INSERT INTO em_order (
  id, order_number, order_set_id, customer_id, seller_id,
  payment_status, exception_status, shipping_address, billing_address,
  exception_reason, created_at, updated_at
) VALUES (
  '${esc(orderId)}',
  '${esc(orderNumber)}',
  '${esc(setId)}',
  '${esc(customerId)}',
  '${esc(sellerId)}',
  'Betaald',
  null,
  'Devstraat 1, Amsterdam',
  'Devstraat 1, Amsterdam',
  null,
  now(),
  now()
);
INSERT INTO order_line (
  id, order_id, product_variant_id, offer_id, quantity,
  unit_price_snapshot, vat_rate_snapshot, raw_unit_price_snapshot,
  created_at, updated_at
) VALUES (
  '${esc(lineId)}',
  '${esc(orderId)}',
  '${esc(catalogOffer.variantId)}',
  '${esc(catalogOffer.offerId)}',
  1,
  29.95,
  21,
  '{"value":"29.95","precision":20}',
  now(),
  now()
);
`)
  return orderId
}

const orderA = createOrder("EM-2026-10482", fleurId, "PAY-DEV-MSG-10482")
const orderB = createOrder("EM-2026-10483", fleurId, "PAY-DEV-MSG-10483")
const orderC = createOrder("EM-2026-20991", testId, "PAY-DEV-MSG-20991")
const orderD = createOrder("EM-2026-30001", veraId, "PAY-DEV-MSG-30001")
// Ensure Vera is searchable/messageable even without a dedicated conversation yet.
void orderD

function createConversation({
  subject,
  customerId,
  orderId,
  status,
  messages,
  markReadBySeller,
}) {
  const conversationId = id("oconv")
  psql(`
INSERT INTO em_conversation (
  id, seller_id, customer_id, order_id, subject, status,
  last_message_at, created_at, updated_at
) VALUES (
  '${esc(conversationId)}',
  '${esc(sellerId)}',
  '${esc(customerId)}',
  ${orderId ? `'${esc(orderId)}'` : "null"},
  '${esc(subject)}',
  '${esc(status)}',
  now(),
  now(),
  now()
);
`)

  let lastMessageId = null
  for (const msg of messages) {
    const messageId = id("omsg")
    lastMessageId = messageId
    psql(`
INSERT INTO order_message (
  id, order_id, conversation_id, sender_customer_id, body,
  created_at, updated_at
) VALUES (
  '${esc(messageId)}',
  ${orderId ? `'${esc(orderId)}'` : "null"},
  '${esc(conversationId)}',
  '${esc(msg.senderCustomerId)}',
  '${esc(msg.body)}',
  now() - interval '${esc(msg.minutesAgo ?? 5)} minutes',
  now()
);
`)
  }

  if (markReadBySeller && lastMessageId) {
    const readId = id("oread")
    psql(`
INSERT INTO order_conversation_read (
  id, participant_customer_id, conversation_id, read_at,
  created_at, updated_at
) VALUES (
  '${esc(readId)}',
  '${esc(sellerCustomerId)}',
  '${esc(conversationId)}',
  now(),
  now(),
  now()
);
`)
  }

  return conversationId
}

const c1 = createConversation({
  subject: "[DEV] Vraag over levering",
  customerId: fleurId,
  orderId: orderA,
  status: "waiting_for_seller",
  markReadBySeller: false,
  messages: [
    {
      senderCustomerId: fleurId,
      body: "Wanneer wordt EM-2026-10482 geleverd?",
      minutesAgo: 40,
    },
  ],
})

const c2 = createConversation({
  subject: "[DEV] Betaling bevestigd",
  customerId: fleurId,
  orderId: orderB,
  status: "waiting_for_customer",
  markReadBySeller: true,
  messages: [
    {
      senderCustomerId: fleurId,
      body: "Is de betaling ontvangen?",
      minutesAgo: 120,
    },
    {
      senderCustomerId: sellerCustomerId,
      body: "Ja, betaling is ontvangen. We houden je op de hoogte.",
      minutesAgo: 30,
    },
  ],
})

const c3 = createConversation({
  subject: "[DEV] Retour afgehandeld",
  customerId: testId,
  orderId: orderC,
  status: "resolved",
  markReadBySeller: true,
  messages: [
    {
      senderCustomerId: testId,
      body: "Retour voor EM-2026-20991 is binnen.",
      minutesAgo: 400,
    },
    {
      senderCustomerId: sellerCustomerId,
      body: "Bedankt, we hebben de retour afgerond.",
      minutesAgo: 200,
    },
  ],
})

const c4 = createConversation({
  subject: "[DEV] Servicevraag zonder order",
  customerId: fleurId,
  orderId: null,
  status: "waiting_for_seller",
  markReadBySeller: false,
  messages: [
    {
      senderCustomerId: fleurId,
      body: "Kunnen jullie ook buiten Europa leveren?",
      minutesAgo: 15,
    },
  ],
})

psql(`SELECT '${esc(MARKER)}' AS marker;`)

console.log("Seeded conversations:")
console.log(`  1. waiting_for_seller + unread + order  ${c1}`)
console.log(`  2. waiting_for_customer + read + order  ${c2}`)
console.log(`  3. resolved + order                    ${c3}`)
console.log(`  4. waiting_for_seller + no order       ${c4}`)
console.log("Done.")
