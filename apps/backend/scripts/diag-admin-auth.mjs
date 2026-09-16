import fs from "node:fs"
import { Client } from "pg"

const env = fs.readFileSync(new URL("../apps/backend/.env", import.meta.url), "utf8")
const m = env.match(/^DATABASE_URL=(.+)$/m)
if (!m) throw new Error("no DATABASE_URL")
const client = new Client({ connectionString: m[1].trim() })
await client.connect()

const users = await client.query(
  `SELECT id, email, created_at FROM "user" WHERE email ILIKE ANY($1) ORDER BY email`,
  [["%europmade-uat%", "%admin-e2e%"]]
)
console.log("USERS", JSON.stringify(users.rows, null, 2))

const allUsers = await client.query(
  `SELECT id, email FROM "user" ORDER BY created_at DESC LIMIT 20`
)
console.log("RECENT_USERS", JSON.stringify(allUsers.rows, null, 2))

const cust = await client.query(
  `SELECT id, email, created_at FROM customer WHERE email ILIKE ANY($1) ORDER BY email LIMIT 40`,
  [["%europmade-uat%", "%admin-e2e%", "%uat%"]]
)
console.log("CUSTOMERS", JSON.stringify(cust.rows, null, 2))

try {
  const pi = await client.query(
    `SELECT id, entity_id, provider FROM provider_identity WHERE entity_id ILIKE ANY($1) LIMIT 30`,
    [["%europmade-uat%", "%admin-e2e%"]]
  )
  console.log("PROVIDER_IDENTITY", JSON.stringify(pi.rows, null, 2))
} catch (e) {
  console.log("PROVIDER_IDENTITY err", e.message)
}

const prods = await client.query(
  `SELECT id, title, brand_name, seller_id, publication_status, lifecycle_status, workflow_status, created_at
   FROM pc_product
   WHERE title ILIKE '%bosch%' OR brand_name ILIKE '%bosch%'
   ORDER BY created_at DESC LIMIT 10`
)
console.log("PC_PRODUCTS", JSON.stringify(prods.rows, null, 2))

const counts = await client.query(`
  SELECT
    (SELECT count(*)::int FROM "user") AS users,
    (SELECT count(*)::int FROM customer) AS customers,
    (SELECT count(*)::int FROM pc_product) AS products,
    (SELECT count(*)::int FROM partner_onboarding) AS partners
`)
console.log("COUNTS", counts.rows[0])

await client.end()
