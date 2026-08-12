# Sprint 3 — Progress

**Status:** v1.0 — voortgangsregistratie, bij aanvang van Sprint 3 alles op **Niet gestart**.

Statuswaarden: **Niet gestart / In uitvoering / In review / Gereed / Geblokkeerd.**

Dit document wordt tijdens Sprint 3 bijgewerkt — de Blueprint-documenten zelf blijven bevroren; uitsluitend dit voortgangsdocument verandert.

---

| Ticket | Epic | Status | Toegewezen aan | Laatste update | Opmerking |
|---|---|---|---|---|---|
| S3-00-01 | EPIC-00 | **Gereed** | — | 2026-07-30 | ADR-0018: Stripe + Connect, Medusa payment webhooks, fail-closed signature verification |
| S3-00-02 | EPIC-00 | **Gereed** | — | 2026-07-31 | ADR-0028 (Blueprint ADR-02 Privacy & AVG) |
| S3-00-03 | EPIC-00 | Niet gestart | — | — | — |
| S3-00-04 | EPIC-00 | Niet gestart | — | — | — |
| S3-00-05 | EPIC-00 | **Gereed** | — | Sprint 3, dag 1 | Workspace-analyse uitgevoerd; 1 kleine configuratiecorrectie doorgevoerd (overbodig `workspaces`-veld verwijderd uit root package.json); lockfile-generatie geblokkeerd door ontbrekende netwerktoegang in de uitvoeringsomgeving, zie rapport |
| S3-00-06 | EPIC-00 | **Gereed** | — | Sprint 3, dag 1 | `packages/config/package.json` gecorrigeerd: exports-map, type:module, ontbrekende devDependencies (tailwindcss + 4 ESLint-packages) toegevoegd |
| S3-00-07 | EPIC-00 | Niet gestart | — | — | Retroactief toegevoegd na architectuurreview (CR-004) — blokkeert S3-01-01 (Customer = standaard Medusa-module) |
| S3-01-01 | EPIC-01 | Niet gestart | — | — | — |
| S3-01-02 | EPIC-01 | Niet gestart | — | — | — |
| S3-01-03 | EPIC-01 | Niet gestart | — | — | — |
| S3-01-04 | EPIC-01 | Niet gestart | — | — | — |
| S3-01-05 | EPIC-01 | **Gereed** | — | 2026-07-31 | Auth UI login/register/forgot + MFA-stap (bestaand; geverifieerd voor S3-07-04) |
| S3-01-06 | EPIC-01 | **Gereed** | — | 2026-07-31 | Cookie-banner + voorkeuren → ConsentRecord; trackingcookies pas na toestemming |
| S3-02-01 | EPIC-02 | Niet gestart | — | — | — |
| S3-02-02 | EPIC-02 | Niet gestart | — | — | — |
| S3-02-03 | EPIC-02 | Niet gestart | — | — | — |
| S3-02-04 | EPIC-02 | Niet gestart | — | — | — |
| S3-02-05 | EPIC-02 | Niet gestart | — | — | — |
| S3-03-01 | EPIC-03 | **Gereed** | — | 2026-07-30 | Product Cloud Deel B-modellen + migraties (ADR-0008) |
| S3-03-02 | EPIC-03 | **Gereed** | — | 2026-07-30 | Moderation + Verification-modules (B.13/B.14) |
| S3-03-03 | EPIC-03 | **Gereed** | — | 2026-07-30 | EAN-matching workflow + admin-testroutes (ADR-0007) |
| S3-03-04 | EPIC-03 | **Gereed** | — | 2026-07-30 | Product-CRUD API, Retailer Created, claims, wijzigingsvoorstellen (ADR-0009/0010); E2E groen |
| S3-03-05 | EPIC-03 | Niet gestart | — | — | — |
| S3-03-06 | EPIC-03 | Niet gestart | — | — | — |
| S3-03-07 | EPIC-03 | **Gereed** | — | 2026-07-31 | Moderation Center queue API (7 wachtrijen) + decide Geen actie/Escaleren |
| S3-03-08 | EPIC-03 | Niet gestart | — | — | — |
| S3-04-01 | EPIC-04 | **Gereed** | — | 2026-07-30 | Offer / Inventory / Price (ADR-0014/0015) |
| S3-04-02 | EPIC-04 | **Gereed** | — | 2026-07-30 | Buy Box-engine server-side (ADR-0004/0005/0019); `buy_box_computation` + BuyBoxRecomputed |
| S3-04-03 | EPIC-04 | **Gereed** | — | 2026-07-30 | Offer PATCH/DELETE + §2.2 events; BuyBoxRecomputed bij elke mutatie |
| S3-04-04 | EPIC-04 | **Gereed** | — | 2026-07-30 | product-05 Buy Box-positie (winnaar/concurrenten/weging) |
| S3-04-05 | EPIC-04 | **Gereed** | — | 2026-07-30 | ADR-0020 cachebeleid; C.4 prefer_cache read-path |
| S3-05-01 | EPIC-05 | **Gereed** | — | 2026-07-30 | Deel D + G.9 in orderService-module (ADR-0021) |
| S3-05-02 | EPIC-05 | **Gereed** | — | 2026-07-30 | Checkout place/revalidate + split + exception resolve; §2.3 events |
| S3-05-03 | EPIC-05 | **Gereed** | — | 2026-07-30 | Winkelwagen/Checkout/Bevestiging UI + Offer-cart (ADR-0022); BTW §13 |
| S3-05-04 | EPIC-05 | **Gereed** | — | 2026-07-31 | Return lifecycle + Refund API (ADR-0023); simulated refund tot Stripe |
| S3-05-05 | EPIC-05 | **Gereed** | — | 2026-07-31 | Buyer orders/detail/retour-UI op `/account` (ADR-0024) |
| S3-05-06 | EPIC-05 | **Gereed** | — | 2026-07-31 | Seller orders + retourbeoordeling UI; seller orders API |
| S3-05-07 | EPIC-05 | **Gereed** | — | 2026-07-31 | Order-berichten API+UI (ADR-0025); admin meelezen bij escalatie |
| S3-05-08 | EPIC-05 | **Gereed** | — | 2026-07-31 | OMC read-only overzicht/detail + exception resolve in apps/admin |
| S3-05-09 | EPIC-05 | **Gereed** | — | 2026-07-31 | Order/Message/Return → feed + Medusa Notification; ADR-0026 |
| S3-06-01 | EPIC-06 | **Gereed** | — | 2026-07-31 | review-module Deel E.1 (ADR-0027) |
| S3-06-02 | EPIC-06 | **Gereed** | — | 2026-07-31 | Review API + Buy Box seller_review via ReviewAggregateChanged |
| S3-06-03 | EPIC-06 | **Gereed** | — | 2026-07-31 | `/account/reviews` + dunne `/products/[id]` weergave |
| S3-07-00 | EPIC-07 | **Gereed** | — | 2026-07-31 | ADR-0029/0030 (Blueprint ADR-53/54) |
| S3-07-01 | EPIC-07 | **Gereed** | — | 2026-07-31 | Affiliate-module G.1–G.5/G.10 (ADR-0031) |
| S3-07-02 | EPIC-07 | **Gereed** | — | 2026-07-31 | Registratie, links, consent/click, coupons API |
| S3-07-03 | EPIC-07 | **Gereed** | — | 2026-07-31 | Conversion + commission bij OrderSplit; reverse bij refund |
| S3-07-04 | EPIC-07 | **Gereed** | — | 2026-07-31 | `/affiliate/register` affiliate-01; handmatige beoordeling |
| S3-07-05 | EPIC-07 | **Gereed** | — | 2026-07-31 | Dashboard/stats/commissions/links UI + read API's |
| S3-07-06 | EPIC-07 | **Gereed** | — | 2026-07-31 | Click/coupon fraude-detectie ADR-0032/0033 → Fraude-signaal wachtrij |
| S3-08-01 | EPIC-08 | **Gereed** | — | 2026-07-31 | G.6–G.8 `commission`/`invoice`/`payout` (+ ADR-0034 soft fields) |
| S3-08-02 | EPIC-08 | **Gereed** | — | 2026-07-31 | Platform 10% op OrderSplit; Affiliate 5% ongewijzigd |
| S3-08-03 | EPIC-08 | **Gereed** | — | 2026-07-31 | Klant- + Seller-commissiefactuur, InvoiceIssued, creditnota |
| S3-08-04 | EPIC-08 | **Gereed** | — | 2026-07-31 | Payout ledger + 14d hold; process stub Connect; PayoutProcessed |
| S3-08-05 | EPIC-08 | **Gereed** | — | 2026-07-31 | `/seller/finance*` finance-01…05; overview-API verrijkt |
| S3-09-01 | EPIC-09 | **Gereed** | — | 2026-07-31 | `ai_metadata` + generate API; ADR-0035 deterministische MVP-advisor |
| S3-09-02 | EPIC-09 | **Gereed** | — | 2026-07-31 | AI-box moderatie-02 gekoppeld; dep S3-11-02 niet blokkerend (S3-11-03 aanwezig) |
| S3-10-01 | EPIC-10 | **Gereed** | — | 2026-07-31 | audit_log append-only module + Event Bus consumer (ADR-0026) |
| S3-10-02 | EPIC-10 | **Gereed** | — | 2026-07-31 | in_app_notification feed + NotificationDispatched (ADR-0026) |
| S3-10-03 | EPIC-10 | Niet gestart | — | — | — |
| S3-11-01 | EPIC-11 | **Gereed** | — | 2026-07-31 | Admin Shell modulecontract (`apps/admin`); OMC geregistreerd |
| S3-11-02 | EPIC-11 | Niet gestart | — | — | — |
| S3-11-03 | EPIC-11 | **Gereed** | — | 2026-07-31 | `/moderation` overzicht + detail (moderatie-01/02) |
| S3-11-04 | EPIC-11 | Niet gestart | — | — | — |
| S3-11-05 | EPIC-11 | Niet gestart | — | — | — |
| S3-12-01 | EPIC-12 | Niet gestart | — | — | — |
| S3-12-02 | EPIC-12 | Niet gestart | — | — | — |
| S3-12-03 | EPIC-12 | Niet gestart | — | — | — |
| S3-13-01 | EPIC-13 | **Gereed** | — | 2026-07-31 | Buyer-shell `/account` (ADR-0024); P0-nav + home KPI’s |
| S3-13-02 | EPIC-13 | **Gereed** | — | 2026-07-31 | Seller home + Orders/Retouren-nav (verrijkt ADR-0011) |

---

## Afgeronde sprintonderdelen (niet als los S3-ticket)

| Onderdeel | Status | Laatste update | Opmerking |
|---|---|---|---|
| Product Cloud translation management UI + seller flow | **AFGEROND** | 2026-08-10 | Admin `/product-cloud/translations` (+ detail); seller bron-taal/status/enqueue owner-only; DeepL nog uit; hergebruik bestaande translation APIs. |
| Product Cloud translation workflow (ADR-0039) | **AFGEROND** | 2026-08-10 | `pc_translation` + multi-source `PRODUCT_CLOUD_ACTIVE_LANGUAGES`; stale bij bronwijziging; manual origin-bescherming; enqueue/retranslate filters; DeepL readiness zonder productie-key; UI blijft `messages.ts`. |
| Storefront internationalization & automatic language detection | **AFGEROND** | 2026-08-10 | UI-locales `nl`/`en`/`de`/`fr`; prioriteit handmatig → cookie/localStorage → Accept-Language/`navigator.language` → NL; auto-detect schrijft geen cookie; `messages.ts` + `em_storefront_locale` + `StorefrontLocaleProvider` + `detect-locale.ts`; cookiebanner + voorkeuren locale-aware; geen tweede i18n-systeem. Niet opnieuw openzetten tenzij bug of nieuwe taal. |
| Sprint 5 — Publieke producentpagina | **AFGEROND** | 2026-08-12 | `/producent/[slug]`; `GET /store/catalog/manufacturers/:slug`; hergebruik ProductCard/ListingResults/PublicStorefrontChrome; producent ≠ merk/seller; geen migratie; DeepL uit. |
| Sprint 6 — Merkpagina + productiefaciliteiten + rechten | **AFGEROND** | 2026-08-12 | `/merk/[slug]` API-backed; productiefaciliteiten; landcontent; seller `/store/brands`; `/producent` → redirect; migratie `Migration20260812100000`. |

## Samenvatting

| Status | Aantal |
|---|---|
| Niet gestart | 68 |
| In uitvoering | 0 |
| In review | 0 |
| Gereed | 2 |
| Geblokkeerd | 0 |