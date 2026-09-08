# EuropMade — LAN colleague test guide

Short guide so colleagues on the **same Wi‑Fi/LAN** can test Admin, Seller Portal, and CMS against the development host.

**Host LAN IP (current):** `192.168.2.17`

---

## A. URLs

Use these from another computer. Do **not** use `localhost` on a colleague machine — that points at their own PC.

| App | URL |
| --- | --- |
| Admin | http://192.168.2.17:3001 |
| Storefront | http://192.168.2.17:3000 |
| Seller Portal | http://192.168.2.17:3000/seller |
| Seller login | http://192.168.2.17:3000/login?redirect=/seller |
| CMS homepage | http://192.168.2.17:3001/cms/homepage |
| CMS banners | http://192.168.2.17:3001/cms/banners |
| Product Cloud (admin) | http://192.168.2.17:3001/product-cloud/products |
| Partners | http://192.168.2.17:3001/partners |
| Backend health | http://192.168.2.17:9000/health |

---

## B. What a colleague can test

### Seller

1. Log in (customer auth)
2. Open `/seller` (requires approved partner + **mandatory 2FA**)
3. Create a product (`/seller/products/new` or `/seller/products/add`)
4. Upload product images
5. Import products (`/seller/products/import`) — upload, preview, commit
6. Submit a product for review

### Admin

1. Log in on `:3001` (Medusa user auth)
2. Open Partners / Sellers and review a partner
3. Open Product Cloud / approval queue and approve or reject a product
4. Open CMS (homepage, banners, pages, categories, design, translations)
5. Create/edit a banner, publish, check storefront
6. Open CMS live preview (iframe → storefront on `:3000`)

---

## C. Network requirement

The colleague must be on the **same LAN/Wi‑Fi** as the EuropMade development computer (`192.168.2.17`).

Postgres stays local to the host and is **not** exposed on the LAN.

---

## D. Do not use localhost from another computer

| Wrong (on colleague PC) | Right |
| --- | --- |
| http://localhost:3000 | http://192.168.2.17:3000 |
| http://localhost:3001 | http://192.168.2.17:3001 |
| http://127.0.0.1:9000 | http://192.168.2.17:9000 |

Browser API calls follow the page hostname (port `9000` on the same host). Opening the LAN URLs keeps auth cookies same-site with the backend.

---

## E. Test accounts

Accounts use the **normal** auth stack (no bypass, 2FA stays on).

### Already present on this host (preferred)

| Role | Email | Notes |
| --- | --- | --- |
| Admin | `admin-e2e@example.com` | Medusa **user** — Admin, Partners, Product Cloud, CMS |
| Seller | `seller-flow-20260804144242@example.com` | Medusa **customer** — approved partner flow + MFA |

**Passwords are not stored in this document.** Ask the person who runs the LAN host, or use the env vars they set for local e2e (`ADMIN_PASSWORD`, `SELLER_PASSWORD`).

### Create / verify accounts (host only)

From the repo root, with `pnpm dev` (backend on `:9000`):

```powershell
$env:ADMIN_EMAIL="admin-e2e@example.com"
$env:ADMIN_PASSWORD="<secret>"
$env:SELLER_EMAIL="seller-colleague@example.com"
$env:SELLER_PASSWORD="<secret>"
$env:BACKEND_URL="http://127.0.0.1:9000"
node scripts/seed-lan-colleague-test-accounts.mjs
```

The script is idempotent: if login already works, it does not recreate the account. It never writes passwords into the repo.

### New seller after register

1. Sign in at `/login?redirect=/seller`
2. Complete `/partner-onboarding`
3. Admin approves at `/partners`
4. Seller enables 2FA at `/account/two-factor-setup` (required by `SellerGate`)
5. Then `/seller` is available

---

## F. Host checklist (developer machine)

1. Same Wi‑Fi / LAN as colleagues
2. `pnpm dev` running; ports listening on `0.0.0.0`:
   - `:3000` storefront + seller
   - `:3001` admin
   - `:9000` backend
3. Backend CORS includes LAN origins (see `apps/backend/.env`):
   - `STORE_CORS` → `http://192.168.2.17:3000`
   - `ADMIN_CORS` / `AUTH_CORS` → `http://192.168.2.17:3001` (and storefront as needed)
4. Share **LAN URLs + account emails + passwords out of band** (not via git)

If the Medusa watcher crashes (`receiver dropped`), restart only `pnpm dev` on the host — no production build while dev is running.

---

## G. Security notes

- No auth bypass for LAN testing
- Do not disable 2FA
- Do not commit real passwords
- Test accounts are for **development/LAN only**, not production
