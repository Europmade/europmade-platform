/**
 * Ensure LAN colleague test accounts exist (idempotent).
 *
 * Does NOT print or hardcode passwords. Requires env vars.
 * Does NOT disable 2FA or bypass auth. Partner approval + MFA remain
 * normal flows after account creation.
 *
 * Usage (from repo root, with backend on :9000):
 *
 *   $env:ADMIN_EMAIL="admin-e2e@example.com"
 *   $env:ADMIN_PASSWORD="<secret>"
 *   $env:SELLER_EMAIL="seller-colleague@example.com"
 *   $env:SELLER_PASSWORD="<secret>"
 *   $env:BACKEND_URL="http://127.0.0.1:9000"
 *   node scripts/seed-lan-colleague-test-accounts.mjs
 *
 * Existing accounts: if login already succeeds, the account is left unchanged.
 */
import { readFileSync, existsSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const BACKEND = process.env.BACKEND_URL || "http://127.0.0.1:9000"
const ADMIN_EMAIL = process.env.ADMIN_EMAIL
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD
const SELLER_EMAIL = process.env.SELLER_EMAIL
const SELLER_PASSWORD = process.env.SELLER_PASSWORD

function readPublishableKey() {
  if (process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY) {
    return process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY.trim()
  }
  const envPath = resolve(REPO_ROOT, "apps/web/.env.local")
  if (!existsSync(envPath)) {
    throw new Error("Missing apps/web/.env.local or NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY")
  }
  const match = readFileSync(envPath, "utf8").match(
    /NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=(.*)/
  )
  if (!match?.[1]) {
    throw new Error("NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY not found in apps/web/.env.local")
  }
  return match[1].trim()
}

async function json(url, init = {}) {
  const res = await fetch(url, init)
  const body = await res.json().catch(() => ({}))
  return { status: res.status, body }
}

function requireEnv(name, value) {
  if (!value || !String(value).trim()) {
    throw new Error(`${name} is required (do not put passwords in source code)`)
  }
}

requireEnv("ADMIN_EMAIL", ADMIN_EMAIL)
requireEnv("ADMIN_PASSWORD", ADMIN_PASSWORD)
requireEnv("SELLER_EMAIL", SELLER_EMAIL)
requireEnv("SELLER_PASSWORD", SELLER_PASSWORD)

const pubKey = readPublishableKey()

console.log(`Backend: ${BACKEND}`)
console.log(`Admin email: ${ADMIN_EMAIL}`)
console.log(`Seller email: ${SELLER_EMAIL}`)

// ── Admin (Medusa user) ──────────────────────────────────────────────
const adminLogin = await json(`${BACKEND}/auth/user/emailpass`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
})

if (adminLogin.status === 200 && adminLogin.body?.token) {
  console.log("OK: admin account already exists (login succeeded)")
} else {
  console.log("Admin login failed — attempting create via /auth/user/emailpass/register …")
  const reg = await json(`${BACKEND}/auth/user/emailpass/register`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  })
  if (reg.status >= 200 && reg.status < 300) {
    console.log("OK: admin auth identity registered")
  } else {
    console.error(
      `FAIL: could not register admin (status=${reg.status}). ` +
        `Create an admin user via Medusa CLI / existing e2e seed, then re-run.`
    )
    console.error(JSON.stringify(reg.body))
    process.exit(1)
  }

  const retry = await json(`${BACKEND}/auth/user/emailpass`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  })
  if (!(retry.status === 200 && retry.body?.token)) {
    console.error(
      "FAIL: admin registered but login still fails. " +
        "You may need to create the User record (invite/accept) separately."
    )
    process.exit(1)
  }
  console.log("OK: admin login works after register")
}

// ── Seller (customer) ────────────────────────────────────────────────
const sellerLogin = await json(`${BACKEND}/auth/customer/emailpass`, {
  method: "POST",
  headers: {
    "content-type": "application/json",
    "x-publishable-api-key": pubKey,
  },
  body: JSON.stringify({ email: SELLER_EMAIL, password: SELLER_PASSWORD }),
})

if (sellerLogin.status === 200 && sellerLogin.body?.token) {
  console.log("OK: seller customer account already exists (login succeeded)")
  if (sellerLogin.body?.mfa_required || sellerLogin.body?.mfa_challenge) {
    console.log("NOTE: seller has MFA enabled (expected). Colleagues must complete 2FA after login.")
  }
} else {
  console.log("Seller login failed — registering customer …")
  const reg = await json(`${BACKEND}/auth/customer/emailpass/register`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-publishable-api-key": pubKey,
    },
    body: JSON.stringify({ email: SELLER_EMAIL, password: SELLER_PASSWORD }),
  })
  if (!(reg.status >= 200 && reg.status < 300) && reg.status !== 400) {
    console.error(`FAIL: seller register status=${reg.status}`, reg.body)
    process.exit(1)
  }

  const retry = await json(`${BACKEND}/auth/customer/emailpass`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-publishable-api-key": pubKey,
    },
    body: JSON.stringify({ email: SELLER_EMAIL, password: SELLER_PASSWORD }),
  })
  if (!(retry.status === 200 && retry.body?.token)) {
    console.error(`FAIL: seller login after register status=${retry.status}`, retry.body)
    process.exit(1)
  }
  console.log("OK: seller customer created and login works")
}

console.log("")
console.log("Next steps for a NEW seller (manual — no auth bypass):")
console.log("1. Open storefront /login?redirect=/seller and sign in")
console.log("2. Complete /partner-onboarding")
console.log("3. Admin approves partner at /partners")
console.log("4. Seller enables 2FA at /account/two-factor-setup (mandatory)")
console.log("5. Seller can use /seller")
console.log("")
console.log("Done. No passwords were written to disk by this script.")
