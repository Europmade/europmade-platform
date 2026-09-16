# EuropMade — Implementatie-Blueprint (master)

**Status:** Fase 0 — Blueprint actualiseren 🟢 CURRENT (2026-08-26)  
**Rol:** masterdocument voor **gewenste MVP-architectuur + actuele implementatiestatus + openstaande onderdelen**.  
**Code wijzigt dit document niet.** Dit document wijzigt geen code.

---

## 0. Hoe dit document lezen

### Drie lagen in één Blueprint

| Laag | Inhoud |
|---|---|
| **A. Gewenste MVP-architectuur** | Wat we bouwen, waarom, hoe het samenhangt. Businessregels blijven Blueprint V2.1 + ADR’s. |
| **B. Actuele implementatiestatus** | Alleen wat in de **huidige repository** aantoonbaar is (apps, modules, API’s, UI, models). |
| **C. Openstaande onderdelen** | Concrete restpunten, externe afhankelijkheden, post-MVP. |

### Statusmodel (consequent)

| Status | Betekenis |
|---|---|
| 🟢 IMPLEMENTED | Werkend en aantoonbaar aanwezig (architectuur + relevante API/UI waar van toepassing). |
| 🟠 PARTIAL / WIP | Implementatie aanwezig, keten of oppervlak nog niet compleet. |
| 🔴 NOT IMPLEMENTED | Niet gebouwd of niet aantoonbaar. |
| 🔵 EXTERNAL / DEPENDENCY | Externe partij, secrets, juridisch/fiscaal besluit of externe service. |
| ⚪ PLANNED | Bewust MVP, nog niet gebouwd. |

**Vijf niveaus — niet verwarren:** (1) architectuur bestaat, (2) backend/model bestaat, (3) API bestaat, (4) UI bestaat, (5) end-to-end workflow werkt. Databasevelden alleen = niet automatisch 🟢.

### Documenthiërarchie (geen tegenspraak)

| Laag | Bron | Rol |
|---|---|---|
| Business-strategie | [`blueprint/EuropMade_Blueprint_V2_1.pdf`](../../blueprint/README.md) | Missie, businessmodel, H-nummers. **Niet** vanuit de repo bewerkt. |
| Business-scopecorrectie | [`docs/00-context/blueprint-reference.md`](../00-context/blueprint-reference.md) | Affiliate (excl. Creator) = MVP i.p.v. H15.7/H15A.12. |
| **Implementatie-master (dit document)** | `docs/11-blueprint-v2/` | Wat het systeem **is** en wat **open** is. Leidend voor Cursor-opdrachten over status/fasering. |
| Bindende afwijkingen | [`docs/04-decisions/`](../04-decisions/README.md) | ADR’s. Nieuwe inhoudelijke keuze = nieuwe ADR, daarna docs bijwerken. |
| Functionele specs / UX / TB | `docs/03-functional-specs/`, `docs/02-ux/`, `docs/08-technical-blueprint/` | Ontwerp- en freeze-historie. Bij conflict met as-built: **dit document + ADR** voor “wat staat er”, specs voor “wat was bedoeld”. |
| A–K-oogstlijst | [`docs/12-roadmap-reconciliation/README.md`](../12-roadmap-reconciliation/README.md) | Operationele Control Center-volgorde; **niet** de master-fasering. |

Het PDF in `/blueprint/` blijft het business-brondocument. **Dit bestand** is het masterdocument van het **werkelijke systeem** voor ontwikkeling.

Onveranderde kernregels (Blueprint + specs, niet heronderhandeld):

- EuropMade verkoopt zelf nooit producten (H5.12).
- Product Cloud en Commerce Cloud blijven gescheiden.
- Buy Box alleen op beste totale klantaanbieding — nooit ads, commissie of platformbelang.
- Datahosting: EU/TransIP-intentie (`tech-stack.md`); geen nieuwe non-EU-SDK zonder besluit.

---

## 1. Wat bouwen we en waarom

EuropMade is een **Europese marketplace** voor producten met herkomstclaim, geen eigen retailvoorraad. Sellers (retailer / producent / merkeigenaar) leveren officiële productinformatie in de **Product Cloud**; commerciële aanbiedingen (prijs, voorraad, levering) leven in de **Commerce Cloud**. De storefront toont gepubliceerde producten + offers; de **Buy Box** kiest de beste offer voor de klant.

**MVP-doel:** geloofwaardige EU-markt (echte sellers, merken, SKU’s, offers, categorieën) — technisch werkend ≠ lanceerbaar.

**Buiten MVP (ongewijzigd t.o.v. bestaande scope):** Sponsored Products (ADR-0003), Creator-rol, DPP, mobiele native apps, AI order-routing, live KvK-register, live externe EU-productdatabase (ADR-0043).

---

## 2. Actuele systeemarchitectuur

Aantoonbaar in de monorepo (`pnpm-workspace`: `apps/*`, `packages/*`).

| Component | Wat in de repo staat | Status |
|---|---|---|
| Storefront + seller + affiliate + buyer | Next.js-app `apps/web` (`@europmade/web`) | 🟢 app bestaat; features per domein hieronder |
| Admin Control Center | Next.js-app `apps/admin` (`@europmade/admin`) | 🟢 shell + modules; geen Medusa Admin als product-UI |
| Backend | Medusa v2 `apps/backend` (`@europmade/backend`) | 🟢 |
| Shared UI / types | `packages/ui`, `packages/types`, `packages/utils` | 🟢 |
| Framework frontend | Next.js (App Router) | 🟢 |
| Framework backend | Medusa 2.18 (`@medusajs/*`) | 🟢 |
| Database | PostgreSQL (`DATABASE_URL`) | 🟢 |
| ORM | Medusa/MikroORM-modellen in custom modules | 🟢 |
| Auth | Medusa Auth: `auth/customer/emailpass`, `auth/user/emailpass`; JWT/cookies | 🟢 |
| MFA | Module `mfa` + `/store/mfa/*` | 🟠 |
| Authorization | Actor-resolvers (seller/admin); Admin-nav permissie `"Beheerder"` (geen fijnmazig RBAC-model in admin-app) | 🟠 |
| Product Cloud | Custom module `product-cloud` | 🟢 keten aanwezig, restpunten §7 |
| Commerce Cloud | Custom module `commerce-cloud` (offer, price, inventory, buy box) | 🟢 |
| Order service | Custom module `order-service` (cart, order, shipment, return, messaging) | 🟢 / 🟠 fulfil-docs |
| Partner | Custom module `partner` (seller, company, brand, manufacturer, facility) | 🟢 / 🟠 live KvK |
| Verification | Custom module `verification` (`product_origin` + evidence) | 🟠 |
| Moderation | Custom module `moderation` | 🟠 |
| Finance | Custom module `finance` | 🟠 / 🔵 payout |
| Affiliate | Custom module `affiliate` | 🟢 keten in code; 🔵 live payout |
| CMS + advertising data | Custom module `cms` (homepage, banner, page, asset, ad campaign) | 🟠 |
| Review | Custom module `review` | 🟠 |
| Audit | Custom module `audit` (`audit_log`) | 🟠 |
| Notifications | Custom module `notification-feed` | 🟠 |
| AI support | Custom module `ai-support` | 🟠 (advisor, geen beslisser) |
| Payments | Place-order: `payment_mode` `simulated` \| `stripe`; ADR-0018 Stripe | 🟠 simulated; 🔵 live PSP |
| Storage | File-referenties (`storage_reference`, Medusa file-id’s op onboarding); geen aparte object-store-module in custom code | 🟠 |
| Email | Geen aantoonbare productie-mailprovider-module in custom modules | 🔴 / 🔵 |
| Translation | `pc_translation` + storefront `messages.ts`; DeepL-provider **optioneel** (env) | 🟠 / 🔵 DeepL-key |
| Search | Storefront zoeken + catalog API; geen aparte zoekindex-service in modules | 🟠 |
| Monitoring / backups | Niet als eigen productcode aantoonbaar | 🔴 / 🔵 operations |
| Rate limiting | Geen aantoonbare custom rate-limit-middleware in `apps/backend/src` | 🔴 |
| Redis | Medusa start zonder `redisUrl` (fake redis in local develop) | 🟠 local |

**Apps (as-built, vervangt de oude `storefront/` / `partner/`-schets in `tech-stack.md`):**

```
apps/web       ← publieke storefront, seller portal, affiliate, account, onboarding
apps/admin     ← EuropMade Admin (niet Medusa Dashboard als product-UI)
apps/backend   ← Medusa + custom modules + /store en /admin API’s
```

---

## 3. Custom modules (backend)

Geregistreerd in `apps/backend/medusa-config.ts`:

`partner`, `product-cloud`, `commerce-cloud`, `moderation`, `verification`, `order-service`, `audit`, `notification-feed`, `review`, `affiliate`, `finance`, `ai-support`, `cms`, `mfa`.

---

## 4. Database-entiteiten (as-built)

Alleen tabellen/modellen die in code bestaan. Geen “gewenste” extra entities.

### Partner

| Model | Doel | Relaties / enums | Status |
|---|---|---|---|
| `company` | Juridische entiteit | KvK + land uniek; `vat_number`; `iban` | 🟢 |
| `seller` | Verkooprol op Medusa customer | `onboarding_status`: Concept … Goedgekeurd/Afgekeurd; rollen retailer/producent/brand/distributor; document-file-id’s | 🟢 |
| `brand` | Merk | owner company | 🟢 |
| `manufacturer` | Fabrikant / GPSR-contact | represented_by company | 🟢 |
| `production_facility` | Productielocatie | gebruikt door MiE | 🟢 |
| `brand_market_content` | Marktcontent per merk | | 🟠 |

### Product Cloud (`pc_*` / identifier)

| Model | Doel | Belangrijk | Status |
|---|---|---|---|
| `pc_product` | Productidentiteit | `lifecycle_status` (o.a. Retailer Created, Actief, Verified™); `brand_id`, `manufacturer_id`, `current_owner_seller_id` (soft refs) | 🟢 |
| `product_version` | Redactionele versie | `publication_status`: Concept, In review, Goedgekeurd, Gepubliceerd, Gearchiveerd, Verwijderd | 🟢 |
| `pc_product_variant` | Variant | identifiers | 🟢 |
| `identifier` | GTIN of MPN | uniek per type/waarde/land-scope | 🟢 |
| `pc_category` | Canonieke taxonomie | `slug` uniek, `parent_category_id`; **geen** `is_active` / `sort_order` | 🟢 |
| `pc_product_category` | Product ↔ categorie | M:N, geen primary-flag | 🟢 |
| `attribute_definition` / `attribute_value` | GPSR + categorievelden | per category | 🟢 |
| `pc_media` / `pc_document` | Media / bewijsstukken | `storage_reference` | 🟢 |
| `pc_translation` | Vertalingen + former_slug-redirects | entity_type: product_version, category, attribute_definition | 🟢 |
| `ownership_record`, `claim`, `dispute` | Eigenaarschap / claims | | 🟠 |
| `match_candidate`, `merge_record`, `split_record` | Matching | | 🟠 |
| `change_proposal`, `pc_field_change` | Wijzigingsvoorstellen / audit velden | | 🟠 |
| `pc_product_relation` | Relaties | | 🟠 |
| `pc_product_family` | Familie | | 🟠 |

### Verification

| Model | Doel | Enums | Status |
|---|---|---|---|
| `product_origin` | MiE-claim per product_version | **Niet** Engelse Verified/Pending. Wel: Niet aangevraagd, Aangevraagd, In beoordeling, Aanvullende informatie vereist, **Geverifieerd**, **Afgewezen**, Ingetrokken | 🟢 model; 🟠 E2E review |
| `product_origin_evidence` | Bewijs bij origin | | 🟠 |
| `product_origin_status_event` | Statushistorie | | 🟠 |

Er is **geen** status `Partially verified` in het model.

### Commerce Cloud

| Model | Doel | Status |
|---|---|---|
| `offer` | Commerciële aanbieding (niet Product Cloud) | 🟢 |
| offer `price` / `inventory` | Marktprijs / voorraad | 🟢 |
| `buy_box_computation` / `buy_box_weighting` | Server-side Buy Box (ADR-0001/0004/0005) | 🟢 |

### Order service

| Model | Doel | Status |
|---|---|---|
| `cart` / `cart_line` | Offer-centric cart (ADR-0022) | 🟢 |
| `order_set` / `em_order` / `order_line` | Bestelling | 🟢 |
| `shipment` | Zending | 🟠 packing-slip |
| `em_return` | Retour | 🟢 lifecycle; 🔵 live PSP-refund |
| `conversation` / `message` / attachments / reads | Orderberichten | 🟠 |
| `order_document` | Documenten | 🟠 |

### Finance

| Model | Doel | Status |
|---|---|---|
| `commission` | Platformcommissie per order | 🟢 |
| `seller_settlement` | Periode-afsluiting (G3) | 🟢 |
| `seller_invoice` / lines | Dienstenfactuur bij settlement | 🟢 |
| `invoice` | Overige factuurrecords | 🟠 |
| `payout` | Uitbetalingsrecord + `stripe_transfer_id` | 🟠 ledger; 🔵 live transfer |

### Affiliate

| Model | Doel | Status |
|---|---|---|
| `affiliate`, `affiliate_link`, `coupon` | Partner + links | 🟢 |
| `click`, `conversion` | Tracking | 🟢 |
| `consent_record` | Toestemming | 🟢 |
| `affiliate_commission_setting` | Tarief | 🟢 |

### CMS / advertising (zelfde module)

| Model | Doel | Status |
|---|---|---|
| `cms_homepage` | Singleton JSON-document + SEO; `published`; visuele admin-editor | 🟠 fallback mock als unpublished |
| `cms_banner` | Redactionele banners + `i18n_meta` | 🟢 |
| `cms_page` | CMS-pagina’s + cover + `i18n_meta` | 🟢 |
| `cms_category` | Redactionele overlay per `pc_category.slug` | 🟢 |
| `cms_asset` | Media-assets (bestaande placements) | 🟠 |
| `ad_campaign` / `ad_campaign_week` / `ad_pricing` | Betaalde plaatsingen (niet Sponsored Products) | 🟠 |

### Overig

| Model | Doel | Status |
|---|---|---|
| `moderation_case` | Fraude / melding / hoog-risico | 🟠 |
| `review` | Reviews | 🟠 |
| `audit_log` | Audit | 🟠 |
| in-app notification | Feed | 🟠 |
| `mfa_credential` / challenge / recovery | TOTP | 🟠 |
| AI metadata | Advisor-metadata | 🟠 |

---

## 5. Product Cloud-keten (as-built)

```
Seller → Product → Product data → Variants → EAN/GTIN|MPN
→ Brand → Manufacturer → Category
→ EU origin / documents / evidence
→ Moderation / Verification / Admin approval
→ Published version → Offer → Catalog / Buy Box → Storefront
```

| Stap | Architectuur | Backend | API | UI | E2E |
|---|---|---|---|---|---|
| Seller | 🟢 | 🟢 partner | 🟢 store partner/onboarding | 🟢 seller + onboarding | 🟠 goedkeuring/recruitment |
| Product create | 🟢 | 🟢 `createProductGraph` | 🟢 `POST /store/product-cloud/products` | 🟢 `/seller/products/new` | 🟢 pad bestaat (o.a. checkpoint `e435b825`) |
| Product data / attributen | 🟢 | 🟢 | 🟢 manager/PATCH | 🟢 productdetail | 🟠 completeness per categorie |
| Variants + identifier | 🟢 | 🟢 GTIN\|MPN | 🟢 | 🟢 | 🟢 |
| Brand / manufacturer | 🟢 | 🟢 | 🟢 store brands/manufacturers | 🟢 `/seller/brands` | 🟠 echte merken (Fase 5) |
| Category koppeling | 🟢 `pc_product_category` | 🟢 bestaande cat. verplicht | 🟢 | 🟢 select 30 namen; **disabled** op bewerken | 🟢 selecteren; 🟢 seller wijzigt taxonomie niet |
| Documents / media | 🟢 | 🟢 | 🟢 upload routes | 🟢 | 🟠 storage operations |
| Origin / MiE | 🟢 module | 🟢 score-engine in git | 🟢 made-in-europe routes | 🟢 `/seller/made-in-europe` | 🟠 evidence-review |
| Moderation | 🟢 cases | 🟢 | 🟢 | 🟢 `/moderation` | 🟠 queues vs product-approval |
| Approval / publish | 🟢 statuses | 🟢 | 🟢 admin products + approvals | 🟢 `/product-cloud/products/approvals` | 🟠 working-tree/commit-hygiëne |
| Offer | 🟢 CC | 🟢 | 🟢 commerce-cloud offers | 🟢 `/seller/products/offer` | 🟢 |
| Catalog / Buy Box | 🟢 | 🟢 server-side | 🟢 `/store/catalog/products` | 🟢 listing/PDP | 🟢 zonder seed-fallback op categorie |
| PDP | 🟢 | 🟢 | 🟢 | 🟢 `/product/[slug]` | 🟢 |

**Datasoorten (niet mengen):**

| Soort | Waar |
|---|---|
| Product master | `pc_product` + `product_version` + attributen + media |
| Seller-owned | ownership, company, offers, finance |
| Marketplace | catalog listing, Buy Box computation, CMS/ads slots |
| Verification | `product_origin` + evidence — **niet** hetzelfde als publicatie |
| Offer | Commerce Cloud only |

Seller **mag geen** canonieke `pc_category` aanmaken of hernoemen (API weigert ontbrekende categorie; voorstel-API bestaat). Admin beheert taxonomie.

---

## 6. EU Product Data / Verification

**ADR-0043 Geaccepteerd.** MVP **zonder** live externe productdatabase. Product Cloud blijft autoriteit.

| Onderwerp | As-built | Status |
|---|---|---|
| EAN/GTIN / MPN | `identifier` | 🟢 |
| Merk | `brand` + `brand_id` op product | 🟢 |
| Productnaam | `product_version.title` | 🟢 |
| Fabrikant + adres/land | `manufacturer` + GPSR-attributen | 🟢 |
| Productieland / facility | `product_origin` + `production_facility` | 🟢 invoer |
| Categorie / type | `pc_category` + attributen | 🟢 |
| Documenten / certificaten | `pc_document`, origin-evidence | 🟠 review-E2E |
| Externe EU-databronnen (EPREL, GS1, Safety Gate API, ICSMS) | **geen adapters** | 🔴 MVP (bewust); ⚪ P2 + bron-ADR |
| Safety Gate-portaalregistratie GPSR Art. 22 | niet in code | 🔵 operationeel |
| Live KvK | bewust buiten MVP | 🔵 / 🔴 live |

**Bron/verificatiesignaal ≠ Made in Europe-bewijs.** Een eventuele latere externe hit mag identificeren of een reviewer-signaal zijn; mag **niet** automatisch Verified™ of MiE toekennen (ADR-0043).

**Verification-statussen in code (Laag 2 origin):** zie enum hierboven. Badge/consument: specs koppelen Verified aan o.a. `Geverifieerd` — niet herbouwen. Engelse set Verified / Partially verified / Pending / Rejected bestaat **niet** als enum.

---

## 7. Categorieën en taxonomie (Fase 3 — uitgevoerd)

**Gewenst:** één EuropMade-boom: categorie → subcategorie → eventueel sub-sub (`parent_category_id`). Externe taxonomieën alleen mapping (ADR-0043), nooit tweede canon.

**As-built 2026-08-26 (cutover):**

| Feit | Status |
|---|---|
| `pc_category` canonieke storefront-taxonomie (ADR-0042 Geaccepteerd) | 🟢 |
| 30 bestaande slugs als top-level records (`parent_category_id` null) | 🟢 |
| Storefront 404 als slug niet in `pc_category` | 🟢 |
| Admin Category UI `/product-cloud/categories` (CRUD, parent, vertaling, redirect) | 🟢 functioneel |
| Seller kiest bestaande categorie; geen taxonomie-publish | 🟢 |
| Redirects via `pc_translation` `former_slug` | 🟢 mechanisme; 0 historische mappings in lokale steekproef |
| Subcategorieën gevuld | 🔴 nog niet ingericht (model wél) |
| `is_active` / `sort_order` kolommen | 🔴 P2 (niet in model) |
| `MARKETPLACE_CATEGORIES` | 🟠 **compatibility mapping** (nav/SSG), geen 404-autoriteit |
| Historische extra slugs (`baby-en-kind`, `robotstofzuiger`, …) | 🟠 blijven bestaan; niet verwijderd |
| Rijke CMS per categorie (FAQ/images admin) | 🟠/🔴 P2 |

---

## 8. Categoriepagina’s (Fase 4 — uitgevoerd)

Route: `apps/web/app/categorie/[slug]/page.tsx` + index `/categorie`.

| Functie | As-built | Status |
|---|---|---|
| Dynamische slug uit PC | ja | 🟢 |
| Productgrid uit catalogus (published + offers) | ja; lege cat. = empty state | 🟢 |
| Onbekende slug | `notFound()` | 🟢 |
| Seed-producten als fallback | verwijderd | 🟢 |
| Subcategorie-navigatie uit parent/child | niet getoond (geen children) | ⚪ later |
| Merken/types als filters | live merken + PC filterable attrs | 🟠 afhankelijk van data |
| SEO | gegenereerd uit categorie/CMS-doc | 🟠 minimaal; niet admin-CMS-rijk |
| FAQ / buying guides | hardcoded/CMS-mock per slug (`category-cms.ts`) | 🟠 niet admin-canonical |
| Afbeeldingen categorie | placeholders in index | 🟠 |
| Homepage-categoriecounts | deels `productCountHint` in `homepage-content.ts` | 🟠 niet live counts |

**Restpunten Fase 4 (niet de hele fase terugzetten):** admin-editable category SEO/FAQ/images; children-UI; live productcounts op homepage-tegels; CMS-mock vs PC-titel.

---

## 9. Seller

| Onderdeel | Seller zelf | Alleen admin | Status |
|---|---|---|---|
| Registratie / onboarding | ja (`/partner-onboarding`) | goedkeuren/afwijzen/info vragen | 🟢 / 🟠 geen live KvK |
| Account / bedrijfsgegevens | ja (`company`: KvK-formaat, BTW, IBAN) | status | 🟢 |
| Contact / documenten | upload-refs | review | 🟢 |
| Merken / manufacturers / facilities | ja | — | 🟢 |
| Producten CRUD + import | ja; categorie **kiezen** | taxonomie, approval, publish | 🟢 / 🟠 import polish |
| Categorie wijzigen op bestaand product | UI disabled | admin taxonomie | 🟢 |
| Offers | ja | — | 🟢 |
| Orders / fulfilment / returns | ja | overzicht admin | 🟢 / 🟠 packing-slip |
| Finance / settlements / facturen | inzien | close settlement | 🟢 G3 |
| Payout | inzien ledger | live transfer | 🟠 / 🔵 |
| Advertising campaigns | store advertising API + UI | goedkeuren | 🟠 |
| Sponsored Products UI | **demo-store** (`useDemoSponsored`) | n.v.t. | 🔴 product (ADR-0003 post-MVP) |

---

## 10. Rollen, admin, moderation — wie mag wat

| Actor | Identiteit in code | Mag |
|---|---|---|
| Customer / buyer | Medusa customer | account, cart, checkout, orders, returns, messages |
| Seller | `seller` gekoppeld aan customer | eigen PC-producten, offers, orders, finance-inzage; **geen** taxonomie-publish, **geen** zelf-publish zonder admin (publish-route weigert seller-self-publish) |
| Affiliate | affiliate-module + portal in `apps/web/app/affiliate` | links, dashboard, commissie-inzage |
| Admin | Medusa user + `apps/admin` | partners, producten/approval, categorieën, orders/returns, CMS, ads, affiliate, finance, moderation, translations, settings |
| Creator | — | 🔴 post-MVP |

Fijnmazige permissiematrix per admin-medewerker: **niet** aantoonbaar (alles `"Beheerder"`).

Moderation: cases + queues in admin. Product **content-approval** (publication_status) is een **apart** pad van fraud-cases.

---

## 11. CMS / homepage / content

| Laag | As-built | Status |
|---|---|---|
| Storefront i18n UI | `messages.ts` NL/EN/DE/FR | 🟢 |
| Homepage hero/sections | `cms_homepage` indien `published`; anders `HOMEPAGE_CMS_MOCK` | 🟠 |
| Admin homepage CMS | visuele editor `/cms/homepage` (geen JSON als primaire UI) + preview desktop/mobiel | 🟢 |
| Banners (redactioneel) | DB + admin + store; AdSlot; locale-UI + concept/publiceren | 🟢 |
| CMS pages | model + editor `/cms/pages/[id]` + store slug + cover + i18n_meta | 🟢 |
| Categorie-SEO/FAQ | `cms_category` per `pc_category.slug`; overlay op bestaande category-CMS-doc; productlijst blijft Product Cloud | 🟢 |
| Multilingual CMS JSON | velden als JSON per locale; dropdown of alle talen; bron NL | 🟢 |
| Automatische vertaling | `POST /admin/cms/translate` via bestaande Product Cloud-provider; 503 zonder DeepL-key (geen fake) | 🔵 |
| Volledig CMS als enige contentbron | nee (unpublished homepage valt nog terug op mock) | 🟠 niet 🟢 |

**Admin-CMS (Fase 4+8, incrementeel):** dashboard-kaarten; homepage-secties toevoegen/verwijderen/herschikken; preview per taal; handmatige override beschermd tegen auto-translate; banners/pagina's/categoriecontent hergebruiken bestaande API's.

**MVP-CMS nog nodig (concreet):** gepubliceerde homepage zonder stille mock-fallback in productie; geen WOW/motion als vervanging van content.

---

## 12. Finance

| Onderdeel | As-built | Status |
|---|---|---|
| Commissie 10% snapshot | ADR-0034 + `commission` | 🟢 |
| Order financials | order-service + finance | 🟢 |
| Seller settlement close | G3 `seller_settlement` + E2E-script | 🟢 |
| Service invoice | G3 dienstenfactuur | 🟢 |
| Klant-OSS / wettelijke PDF | niet als wettelijk product bewezen | 🔵 / 🔴 |
| VAT-regime helper | `determineVatRegime` configureerbaar | 🟠 geen wet |
| Payout-records + 14d hold | schema/code | 🟠 |
| Stripe Connect live transfer | stub / `stripe_transfer_id` leeg tot PSP | 🔵 |
| Affiliate commissie | ADR-0030, ten laste van platformmarge | 🟢 ledger |
| Affiliate payout live | zelfde Connect | 🔵 |

---

## 13. Orders / checkout / returns

**Buyer:** listing/PDP → cart (offer-centric) → checkout/place → payment_mode simulated of stripe → order.  
**Seller:** order → shipment → (packing-slip WIP) → return → refund.

| Deel | Status |
|---|---|
| Cart + checkout UI + place-order workflow | 🟢 |
| Simulated payment (non-prod toegestaan ADR-0021) | 🟢 |
| Live Stripe charge / webhooks | 🔵 / 🟠 config |
| Returns lifecycle | 🟢 |
| Live PSP-refund | 🔵 tot Stripe-refund (ADR-0023) |
| Packing slip PDF | 🟠 |

---

## 14. Affiliate

Aantoonbaar: affiliate-entiteit, links, clicks, conversions, coupons, consent, commissie-settings, store + admin UI, portal, performance-center (F9.1), payout-history in portal-commit. Attributie: **ADR-0030 niet wijzigen**.

Live gelduitbetaling: 🔵 Connect. Creator-rol: 🔴 post-MVP. Seller “Sponsored” demo: niet affiliate.

---

## 15. Advertising

| Type | As-built | MVP? |
|---|---|---|
| Redactionele CMS-banners | ja | Must (Blueprint-inkomsten) — 🟠 afronden |
| Seller ad campaigns + weken + pricing | `ad_campaign*` + admin/store routes + seller marketing/banners | 🟠 |
| Sponsored Products in Buy Box | verboden / post-MVP ADR-0003; sellerpagina is **demo-data** | 🔴 product; UI misleidend t.o.v. scope |
| Ads sturen Buy Box | mag niet (spec §3.0) | 🟢 regel in engine |

---

## 16. Translations

| Laag | As-built | Status |
|---|---|---|
| Storefront chrome | `messages.ts`, cookie-locale | 🟢 |
| Product/categorie/attributen | `pc_translation`; talen `nl,en,fr,de` | 🟢 opslag + admin/seller UI |
| Manual override + publish | admin translations | 🟢 |
| Automatic (DeepL) | provider in code; default geen key → geen neptekst | 🔵 / 🟠 |
| CMS JSON-locales | homepage/banners | 🟠 |
| Category nav labels | i18n keys + PC name | 🟢 |

---

## 17. Security (alleen aantoonbaar)

| Onderdeel | Feit | Status |
|---|---|---|
| Auth email/password | Medusa auth customer + user | 🟢 |
| MFA TOTP | module + store API | 🟠 E2E/productie-afdwinging |
| Audit log | `audit` module | 🟠 dekking niet “alles” |
| Input validation | Zod/validators op routes | 🟠 niet universeel bewezen |
| Secrets | `.env` / JWT/cookie secrets | 🟢 patroon; 🔵 productie-secrets |
| Security headers / rate limit / backups / APM | niet als custom platformcode gevonden | 🔴 / 🔵 ops |
| Privacy/GDPR-spec | docs + ADR-0028 | 🟠 implementatie tickets open |
| EU-hosting | architectuurkeuze TransIP | 🔵 deployment |

---

## 18. Centraal statusoverzicht

| Onderdeel | Status | Wat bestaat | Wat ontbreekt | Prioriteit |
|---|---|---|---|---|
| Product Cloud | 🟢 / 🟠 | CRUD, versies, identifiers, media, publish-pad, catalogus | commit-hygiëne WIP; completeness polish | Hoog |
| Seller | 🟢 / 🟠 | onboarding, shell, producten, offers, orders, finance-UI | live KvK; recruitment (Fase 7) | Hoog |
| Verification | 🟠 | origin-statussen, score, seller-UI, evidence API’s | volledige reviewer-E2E; geen “Partially verified” | Hoog |
| EU Product Data | 🟢 kader / 🔴 live API | ADR-0043: intern PC + GPSR + evidence | geen EPREL/GS1-adapter (bewust) | P2 adapters |
| Categories | 🟢 | 30 `pc_category`, admin UI, PC-autoriteit | hiërarchie vullen; is_active P2 | Rest klein |
| Category Pages | 🟢 | 404/empty/listing/PDP-koppeling | rijke CMS; children | Rest klein |
| Admin | 🟢 / 🟠 | Control Center-modules | RBAC; settlements in secondary-nav; KPI-stabiliteit | Midden |
| Moderation | 🟠 | cases + UI | gelijk trekken met product-approval | Midden |
| CMS | 🟠 | models + admin + store + **mock-fallback** | productie zonder mock; category CMS | Fase 8 |
| Orders | 🟢 | order-service | packing-slip afronden | Midden |
| Returns | 🟢 | lifecycle | live refund | 🔵 |
| Checkout | 🟢 | offer-cart + place | live PSP | 🔵 |
| Payments | 🟠 / 🔵 | simulated + stripe-modus | productie-Stripe | 🔵 |
| Finance | 🟢 / 🟠 | commissie + G3 | fiscale PDF/OSS | 🔵 |
| Settlement | 🟢 | G3 close | — | — |
| Payout | 🟠 / 🔵 | records | Connect transfer | 🔵 |
| Affiliate | 🟢 / 🔵 | tracking + UI + ledger | live payout; F10.1 checkpoint | Midden |
| Advertising | 🟠 | banners + campaigns | E2E billing/reporting; geen Sponsored | Fase 9 |
| Translations | 🟢 / 🔵 | PC + UI i18n | DeepL-key; CMS-i18n volledig | Midden |
| Security | 🟠 | auth + MFA-code + audit | hardening Fase 12; headers/rate-limit | Fase 12 |

---

## 19. MVP-scope (Must / Should / Post-MVP)

Niet verplaatsen van bestaande gebouwde Musts naar post-MVP.

### MUST HAVE — MVP

- Marketplace storefront (listing, PDP, cart, checkout) zonder seed-catalogus als productiepad  
- Product Cloud publish → offer → catalog → Buy Box  
- Seller onboarding + admin goedkeuring (zonder live KvK)  
- Canonieke `pc_category` (30 slugs) + Admin category UI  
- Categoriepagina’s: echte listing of nette empty; onbekend = 404  
- Orders, fulfilment-basis, returns-lifecycle  
- Platformcommissie + G3 settlement + dienstenfactuur  
- Affiliate (excl. Creator): tracking, attributie ADR-0030, portal  
- Bannerplatform (niet Sponsored Products)  
- Verified™/MiE als **interne** verification (geen externe DB)  
- i18n NL/EN/DE/FR storefront-kern  
- Affiliate-scopewijziging (blueprint-reference)

### SHOULD HAVE — MVP indien haalbaar

- Packing-slip / fulfil-documenten (ADR-0040)  
- Homepage/CMS zonder mock-fallback  
- MFA afgedwongen op gevoelige accounts  
- Category children (hiërarchie vullen)  
- Diepere translation-coverage + optioneel DeepL  
- Affiliate Account (F10.1) als ontbreekt als checkpoint  

### POST-MVP

- Sponsored Products (ADR-0003)  
- Creator-platform  
- DPP / ESPR  
- Live EPREL/GS1/Safety Gate-API (ADR-0043 P2 + bron-ADR)  
- Live KvK  
- Native apps  
- Fijnmazig admin-RBAC (niet gebouwd)  
- Wettelijke OSS-klantfactuur / deemed-supplier tot adviseur  

---

## 20. Openstaande werkpakketten (concreet)

Niet “CMS verbeteren”, wel:

1. **Homepage** valt terug op `HOMEPAGE_CMS_MOCK` als `cms_homepage.published` ontbreekt — productie mag niet stille mock-hero tonen.  
2. **Categorie-SEO/FAQ/guides** komen uit `category-cms.ts`, niet uit Admin Category UI.  
3. **`pc_category` heeft geen `is_active`/`sort_order`** — P2, niet in cutover.  
4. **Geen subcategorieën ingericht** — 30 roots; parent-veld bestaat wel.  
5. **Historische dubbele slugs** (`baby-kind` vs `baby-en-kind`) naast elkaar.  
6. **Elektronica-attribuutcatalogus** is nog laptop-achtig op top-level slug.  
7. **Seller Sponsored-pagina** gebruikt demo-state — product mag dat niet als live ads presenteren.  
8. **Live Stripe Connect-payout** is stub.  
9. **Live PSP-refund** geblokkeerd tot Stripe-refund.  
10. **Klant-OSS / fiscale PDF** niet as-built.  
11. **Evidence-review E2E** voor MiE niet als groen checkpoint in deze actualisatie herhaald.  
12. **Safety Gate-portaalregistratie** (GPSR Art. 22) niet in code — operationeel.  
13. **Packing-slip** routes/PDF aanwezig als WIP.  
14. **Admin `ADMIN_SECONDARY_ROUTES`** mist o.a. `/finance/settlements` terwijl G3-pagina’s bestaan.  
15. **Echte EU-producten/merken in productiecatalogus** — Fase 5, geen seed.  
16. **Seller recruitment** — Fase 7, na stabiel publish-pad.  
17. **DeepL** alleen met credentials; default geen auto-vertaling.  
18. **Rate limiting / security headers / monitoring** niet als custom platformfeatures.  
19. **Working tree / git-oogst** van mixed WIP — proces, geen herbouw.  
20. **MFA** API bestaat; platformbrede afdwinging + E2E niet 🟢.

---

## 21. Fasering (actueel)

| Fase | Naam | Status | Toelichting |
|---|---|---|---|
| **0** | Blueprint / architectuur actualiseren | 🟢 CURRENT | Dit document |
| **1** | Product Cloud volledig operationeel | 🟢 / 🟠 rest | Niet opnieuw bouwen. Rest: oogsten, completeness, import polish |
| **2** | EU Product Data / Verification | 🟢 kader + 🟠 verification | ADR-0043: geen live EU-DB. Rest: evidence-review E2E |
| **3** | Categorieën & taxonomie | 🟢 | 30 `pc_category` + admin UI. Rest: hiërarchie, P2 velden |
| **4** | Categoriepagina’s | 🟢 | PC-404, listing, empty. Rest: CMS-rijk, children |
| **5** | Echte EU-producten en merken | ⚪ NEXT | Werving/content; geen architectuurherbouw |
| **6** | Seller onboarding | 🟠 afronden | Bestaat; polish + E2E goedkeuring |
| **7** | Seller recruitment | ⚪ | Business, na 5/6 |
| **8** | Homepage / CMS / commerciële presentatie | 🟠 | Models+admin bestaan; mock-fallback weg |
| **9** | Advertising | 🟠 | Banners/campaigns; geen Sponsored Products |
| **10** | Finance afronden | 🟠 / 🔵 | G3 niet herbouwen; fiscaal/Connect extern |
| **11** | Marketplace operationeel testen | ⚪ | Seller → buy → return → G3 |
| **12** | MVP hardening | ⚪ | MFA, GDPR-tickets, headers, staging |

**Fase 1–4 niet markeren als NOT IMPLEMENTED.** Alleen de restpunten hierboven.

---

## 22. Wat we niet opnieuw bouwen

Product Cloud CRUD/matching/identifiers; publish-architectuur; Buy Box-engine; offer-cart/checkout; order-service + returns-lifecycle; G3 settlement; affiliate F4/F7/portal/performance; canonieke 30-slug taxonomie + Admin Category UI; storefront listing zonder seed-fallback; partner onboarding-model; commissie-ledger.

---

## Referenties

- Blueprint V2.1: [`blueprint/README.md`](../../blueprint/README.md)  
- ADR-0042 (taxonomie, Geaccepteerd): [`docs/04-decisions/0042-canonical-storefront-taxonomy-pc-category.md`](../04-decisions/0042-canonical-storefront-taxonomy-pc-category.md)  
- ADR-0043 (EU product data, Geaccepteerd): [`docs/04-decisions/0043-eu-product-data-layer-authority.md`](../04-decisions/0043-eu-product-data-layer-authority.md)  
- EU-kader: [`docs/13-eu-product-data/README.md`](../13-eu-product-data/README.md)  
- A–K-oogst: [`docs/12-roadmap-reconciliation/README.md`](../12-roadmap-reconciliation/README.md)  
- Tech-stack: [`docs/01-architecture/tech-stack.md`](../01-architecture/tech-stack.md)  
- Modules: `apps/backend/medusa-config.ts`  
