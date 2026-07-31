# ADR-0029 — Cookie-consent-mechanisme (Blueprint ADR-53) — S3-07-00

**Status:** Geaccepteerd  
**Datum:** 2026-07-31  
**Domein:** Affiliate, Privacy  
**Sluit af:** Blueprint ADR-53; bouwt op ADR-0028  
**Raakt:** `gdpr-compliance/spec.md` §3; Deel G.4/G.10

## Context

Affiliate click-tracking vereist een technisch consent-mechanisme, niet alleen de functionele eis “toestemming nodig”. Medusa biedt geen first-party CMP voor marketplace affiliate-clicks.

## Beslissing

1. **ConsentRecord (G.10)** is de server-side bron van waarheid. Aanmaak via `POST /store/affiliate/consent` met `consent_given` en een client-`visitor_key` (UUID). Server slaat `visitor_hash = sha256(visitor_key + server_pepper)` op — geen raw IP in de tabel.
2. **Click** (G.4) vereist een bestaande ConsentRecord met `consent_given = true` voor dezelfde `visitor_hash`. Zonder dat: HTTP 403, geen click, geen trackingcookie-attributie.
3. **Browsercookies (MVP):**
   - `em_aff_vid` — visitor_key (1e partij, SameSite=Lax, Max-Age = attributieperiode ADR-0030)
   - `em_aff_clk` — click_id na geslaagde server-side click (zelfde Max-Age)
   Frontend mag cookies pas zetten ná succesvolle consent-API met `consent_given=true`.
4. **Coupon-route** gebruikt géén ConsentRecord/cookie (ADR-0028).
5. Intrekking: nieuwe ConsentRecord met `consent_given=false` voor dezelfde hash; latere clicks geweigerd. Bestaande clicks blijven voor audit/attributie tot expiry.

## Consequenties

- Geen client-side attributie van conversies; checkout stuurt `click_id` of `coupon_code` mee, server valideert.
- CMP-UI (banner) volgt storefront; API is de harde gate.
