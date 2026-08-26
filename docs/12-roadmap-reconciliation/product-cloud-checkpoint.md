# Product Cloud Checkpoint — inventarisatie

**Datum:** 2026-08-26 (live keten 2026-08-26)  
**Aard:** inventarisatie + live tests. Geen productcode-wijziging in de checkpoint-opdracht. Geen taxonomie-migratie, geen commit, geen push.  
**ADR-0042:** niet gewijzigd (blijft Proposed / Ter review).  
**Vervangt niet:** Blueprint V2.1, overlay, ADR-0042, `docs/12-roadmap-reconciliation/README.md`.

---

## 1. ADR-0042 review (niet gewijzigd)

**Oordeel:** **PASS als voorstel** — context en probleem kloppen met de repo. **OPEN** tot formele acceptatie. **Niet: NIET AKKOORD** (geen feitelijke onjuistheid die het voorstel onderuit haalt).

### Bevestigd in de repository

| Vraag | Bevestigd? | Evidence |
|---|---|---|
| A. `pc_category` bestaat | Ja | Model `apps/backend/src/modules/product-cloud/models/category.ts`; tabelnaam `pc_category` |
| B. Parent/child | Ja | `parent_category_id` / `children`; migratie `Migration20260730081450` |
| C. Product ↔ categorie | Ja | `pc_product_category` (`product-category.ts`) |
| D. Storefront-bron | Ja, dual | Nav/404: hardcoded lijst; listing probeert catalog-API; leeg → seed |
| E–F. Hardcoded categorieën | Ja | `apps/web/app/_lib/marketplace-categories.ts`; ook header, homepage, affiliate filters, `generateStaticParams`, AI-hydrate |
| J. Admin category management | Geen boom-CRUD-UI | Alleen `GET`/`POST /admin/product-cloud/categories` (ensure) + attributen-API; fields-pagina gebruikt list-API, geen tree-editor |

### G. Slugs behouden

Publieke URL-vorm `/categorie/{slug}` met o.a. `tuin`, `elektronica` (30 slugs in `MARKETPLACE_CATEGORIES`). ADR-0042: geen stille slug-break zonder redirect-besluit — **OPEN**.

Welke `pc_category.slug`-rijen in de **database** staan: **OPEN** (geen DB-query in deze inventarisatie).

### H. Category translations

Schema: `pc_translation.entity_type` bevat `"category"` (ADR-0037/0039). Of er gepubliceerde category-vertalingen in data zitten: **OPEN**. Storefront-navlabels: `localize-category-names.ts` + i18n, niet bewezen als PC-vertalingen.

### I. Category SEO/content op `pc_category`

**Niet bevestigd op het model.** `pc_category` heeft `name`, `slug`, parent — geen seo_title/description/image. SEO op categoriepagina komt uit `resolveCategoryPage` (CMS/AI/presentatielaag), niet uit Product Cloud-kolommen.

### Heggenscharen / Tuin / Elektronica

| Slug/naam | Storefront `MARKETPLACE_CATEGORIES` | PC-attributencatalogus | Gevolg |
|---|---|---|---|
| `elektronica` | Ja (popular) | Ja (`CATEGORY_ATTRIBUTE_CATALOGS.elektronica`) | Dual path mogelijk |
| `tuin` | Ja (popular) | Ja (`tuin`) | Dual path mogelijk |
| Heggenscharen | **Nee** (geen slug) | Titel-heuristiek mapt `heggensch` → `tuin` | Geen eigen storefront-categorie; 404 als iemand `/categorie/heggenscharen` opent |

### Nog te beslissen (ADR niet uitvoeren tot dan)

1. ADR-0042 accepteren of vervangen?  
2. Redirects vs 404 voor slugs buiten `pc_category`.  
3. Subcategorieën (bijv. heggenscharen onder tuin) in MVP-nav of alleen attributen?  
4. Admin category-UI in MVP of later?  
5. Inventarisatie live `pc_category`-rijen vs de 30 hardcoded slugs.

Non-goals van ADR-0042 (verification, finance, Buy Box, …) zijn consistent: deze review raakt ze niet.

---

## 2. Product Cloud as-built: git vs WIP

### Referentiepunten

| Commit | Onderwerp |
|---|---|
| S3-03-01 e.d. | Eerdere PC-module (modellen/migraties ADR-0008) — historisch in progress-docs |
| **`d777db7`** | `feat: complete Product Cloud foundation` — **feitelijk** o.a. category ensure/API, `category-attributes`, `pc_translation`/`document`/`relation`, service-uitbreiding, ADR-0037. **Niet** de volledige huidige WIP-keten (import/manager/approval). |
| `5aa471a` / `fa2d28b` | Translation workflow + seller/admin UI |
| `d11aa1e` | Made-in-Europe score + seller workflow |
| Overlay | Publish/approval/import/manager = working tree |

### A. IN GIT / CHECKPOINT (kern)

- Module Product Cloud: product, version, variant, identifier, category, product_category, media, ownership, claims, matching, …  
- Store/admin category-API, ean-match, product CRUD-paden (deels later uitgebreid)  
- Vertalingen ADR-0038/0039  
- MiE score `d11aa1e`  
- `GET /store/catalog/products` — `listPublishedCatalogProducts`  
- Seller product list/translations-pagina’s (git, met latere WIP)

### B. WORKING TREE WIP (modified, o.a.)

- `apps/backend/src/api/store/product-cloud/products/**` (publish/submit, media, made-in-europe, validators)  
- `apps/backend/src/modules/product-cloud/service.ts`, models (product, version, media, attributes)  
- `apps/backend/src/workflows/product-cloud/**`  
- `apps/web/app/seller/products/**`  
- `apps/backend/src/api/middlewares.ts` (**mixed** met CMS/ads/MFA)  
- Catalog helpers / commerce offer models (Buy Box-pad, mixed met CC)

### C. UNTRACKED (o.a. PC-gerelateerd)

- Import (`import/`, `import-helpers.ts`, `import-xlsx.ts`, mapping tests)  
- Manager / information / bulk / facilities / variants-axes  
- Media upload/reorder  
- Admin: products list/detail, approvals, fields, compliance  
- Approval/evidence admin-API’s  
- Verification evidence-modellen/migraties  
- Unit specs: completeness, compliance-gates, gpsr, import, product-approval, facility-assign, variant-axes  
- Scripts: `e2e-seller-product-*.mjs`, `test-product-completeness.mjs`

### D. ONTBREKEND / niet bewezen

- Externe EU-productdatalaag  
- Canonieke storefront-taxonomie (ADR-0042 niet geaccepteerd, niet gemigreerd)  
- Admin category-boom UI  
- SEO-velden op `pc_category`  
- Live Connect/fiscale PDF (buiten PC)  
- E2E “seller maakt product → published → listing zonder seed” als **groene checkpoint in git**: **OPEN** (scripts untracked; resultaat niet in deze sessie gedraaid)

---

## 3. Functionele inventaris

| Onderdeel | Status | Toelichting |
|---|---|---|
| Product CRUD | 🟡 | Store POST/GET/PATCH `customerAuth`; foundation in git; extra velden WIP |
| Product version / draft / publish / archive | 🟡 / 🔧 | Enum `publication_status` in git; submit/publish-routes WIP; seller mag publish-middleware hebben — of admin-approval nodig is: beide paden bestaan in tree (**OPEN** welk pad MVP-poort is) |
| Product status (lifecycle) | 🟡 | `lifecycle_status` op `pc_product` |
| Title / description | 🟢 model | Op `product_version` |
| Brand / manufacturer | 🟡 | Soft IDs op product; GPSR/manufacturer WIP |
| Identifiers | 🟢 model | GTIN/MPN op variant |
| Country/origin | 🟡 | MiE/origin-modellen git + evidence WIP |
| Attributes | 🟡 | Definities per categorie; catalogs in code (deels modified) |
| Variants / variant identifiers | 🟡 | Model git; variant CRUD-routes untracked/WIP |
| Variant offers | 🟡 | Offer via `identifier_id` (ADR-0015), niet variant-FK |
| Offers price/stock/status | 🟡 | Commerce Cloud; WIP in tree; Buy Box-engine overlay 🟢 |
| Seller → product ownership | 🟡 | `current_owner_seller_id` + ownership records; `resolve-seller` WIP |
| Product approval | 🟡 / 🔧 | Admin approvals-pagina + API untracked |
| Verification evidence / reviewer | 🟡 | `d11aa1e` + evidence routes/models WIP |
| Media + sort_order | 🟡 | `pc_media` git; upload/reorder WIP |
| Catalog listing / PDP | 🟡 | API-pad bestaat; storefront seed-fallback |
| Admin PC endpoints | 🟡 | Categories/translations/seed git; approvals/compliance untracked |
| Seller (store) PC endpoints | 🟡 | Uitgebreid; `customerAuth` |
| Store (public) catalog | 🟡 | Guest catalog route |
| Security ownership | 🟡 | Auth op store PC; of alle routes ownership afdwingen: steekproef OK, volledige audit **OPEN** |
| Tests | 🧪 | Unit in git + untracked; E2E-scripts untracked; **niet** in deze opdracht gedraaid |

---

## 4. Keten Seller → Storefront (as-is)

| Overgang | Route / service | Status | WIP / handmatig |
|---|---|---|---|
| Seller auth | Medusa customer + seller-gate | 🟡 | Seller-gate modified |
| Product aanmaken | `POST /store/product-cloud/products` | 🟡 | |
| Version/concept | `POST .../versions` | 🟡 | |
| Submit review | `POST .../versions/:id/submit` | 🔧 WIP | |
| Publish | `POST .../versions/:id/publish` | 🔧 WIP | Kan seller-self-publish vs admin — **OPEN** |
| Admin approval | `/admin/product-cloud/.../approval`, UI approvals | 🔧 untracked | Handmatige adminstap indien poort aan |
| Offer | Commerce Cloud offers API | 🟡 WIP | |
| Catalog | `GET /store/catalog/products` | 🟡 | |
| Storefront listing | `resolveListingProducts` → seed als leeg | 🟡 | **Handmatig/demo:** seed in `listing-products.ts` |
| PDP | catalog product + pdp-seed overlay historisch | 🟡 | `pdp-seed.ts` bestaat |

---

## 5. Seed data

| Vraag | Bevinding |
|---|---|
| Wat is seed? | `LISTING_PRODUCTS` (~30 redactionele items, o.a. TuinPro NL, robotmaaiers); `pdp-seed.ts`; category AI seed |
| Echte sellerproducten | Alleen via Product Cloud + offers in DB — **welke rijen live echt zijn: OPEN** (geen DB-dump) |
| Catalogus afhankelijk van seed? | **Ja op storefront** als API 0 producten teruggeeft (`categorie/[slug]/page.tsx` regels seed-fallback) |
| Productie zonder seed? | Theoretisch ja als catalog-API gevulde published+offers heeft én fallback uit productiepad |
| Ontbreekt | Commit van publish-keten; fallback uitzetten (niet in deze opdracht); echte content |

**Niet verwijderd, niet gewijzigd.**

---

## 6. EU Product Data — aansluitpunten (niet bouwen)

Logische hangpunten, geen bronkeuze:

1. **Identifiers** (`identifier` GTIN/MPN) — lookup-sleutel  
2. **Brand / manufacturer** (`brand_id` / `manufacturer_id`)  
3. **Origin / MiE** (verification-module + evidence)  
4. **Documents** (`pc_document`) vs origin-evidence  
5. **Reviewer/admin** (approval + compliance-pagina’s) — signalen, geen stille overwrite (overlay-voorstel, geen ADR)

Externe laag **ontbreekt**.

---

## 7. Taxonomie-tabel

| Onderdeel | Product Cloud | Storefront | Verschil | Gevolg |
|---|---|---|---|---|
| Boom | `parent_category_id` | Platte lijst ~30 slugs | Geen storefront-subboom | Subcategorieën niet navigeerbaar |
| Elektronica | Attributencatalogus `elektronica` | Slug `elektronica` | Naam kan matchen; DB-rij **OPEN** | Dual taxonomy-risico |
| Tuin | Catalogus `tuin` | Slug `tuin` | Idem | Idem |
| Heggenscharen | Heuristiek → tuin | Geen slug | Geen PDP-categorie | Producten alleen onder tuin/seed |
| Koppeling product | `pc_product_category` | `categorySlugs` op seed | Twee systemen | Listing kan seed tonen zonder PC-link |
| 404 | N.v.t. | `findMarketplaceCategory` verplicht | Onbekende slug 404 | `heggenscharen` 404 |
| SEO | Geen velden op category | `resolveCategoryPage` | Content niet in PC | ADR-0042 punt 5 terecht later |

---

## 8. Product Cloud MVP Gap Analysis

| Onderdeel | As-built | WIP | Ontbreekt | Nodig voor MVP | Prioriteit |
|---|---|---|---|---|---|
| CRUD + versions + identifiers | Git | Uitbreidingen | — | Ja | P1 (bestaat; niet herbouwen) |
| Publish/approval E2E in git | Deels | Routes/UI | Schone commit + bewezen test | Ja — anders geen echte catalogus | **P0** |
| Offers + Buy Box | Engine git | Offer WIP | — | Ja | P1 |
| Listing zonder seed | API | Storefront fallback | Productiepad zonder seed | Ja | **P0** (blokkeert “echte” catalogus-UX) |
| Taxonomie één bron | Model git | — | ADR-0042 acceptatie + migratie | Ja voor consistente nav | P1 (P0 ná acceptatie) |
| Admin category UI | Ensure-API | — | CRUD-boom | Should | P2 |
| Media upload | Model | Upload-API | — | Ja | P1 |
| Verification evidence | Score git | Evidence/review | E2E **OPEN** | Ja voor Verified-belofte | P1 |
| Import | — | Untracked | — | Should (volume) | P2 |
| EU product data | — | — | Hele laag | Ontwerp P1; bouw later | P2 tot ADR |
| GPSR completeness | — | Untracked helpers/tests | — | Should/compliance | P2 |
| Seed als demo | Git | — | Mag blijven dev | Nee in productie | P3 (dev) |

**P0-motivatie:** zonder gepubliceerde producten in catalog-API blijft de storefront seed tonen → geen echte marketplace. Zonder gecommitte publish-keten is dat pad niet reproduceerbaar.

---

## 9. Checkpoint-analyse — NIET stagen/committen

**Kan Product Cloud nu veilig als één checkpoint? NEE.**

### A. Hoort bij Product Cloud (toekomstige batch)

- `apps/backend/src/modules/product-cloud/**` (ex. niet-PC als die er niet zijn)  
- `apps/backend/src/api/store/product-cloud/**`  
- `apps/backend/src/api/admin/product-cloud/**` (niet CMS)  
- `apps/backend/src/workflows/product-cloud/**`  
- `apps/backend/src/modules/verification/**` als MiE-evidence in dezelfde batch bedoeld is — **of splitsen** (verification vs PC)  
- Seller UI `apps/web/app/seller/products/**`, `product-cloud-api.ts`  
- Admin `apps/admin/app/(shell)/product-cloud/**`, `product-*-admin-api.ts`  
- PC unit tests + `scripts/e2e-seller-product-*.mjs`  
- PC-migraties onder `modules/product-cloud/migrations/` en verification-migraties alleen als bewust zelfde checkpoint  

### B. Mixed-workstream — eerst splitsen

- `apps/backend/src/api/middlewares.ts`  
- `apps/backend/medusa-config.ts` / `package.json` als CMS/MFA/ads meeliften  
- `apps/admin/lib/module-registry.ts` / `admin-shell.tsx`  
- `apps/web/app/_lib/storefront-catalog.ts` + `categorie/[slug]/page.tsx` (catalog vs seed — taxonomie-scope)  
- Commerce Cloud offer-bestanden (CC, niet PC)  
- `pnpm-lock.yaml` alleen bij echte PC-deps  

### C. Relatief veilig samen (ná hunk-split middlewares)

PC-module + store/admin PC-routes + seller product UI + admin product-cloud pages + bijbehorende tests/scripts + PC-migraties.

### D. Opsplitsen

CMS, advertising, MFA, finance, partner-onboarding hunks, packing-slip, affiliate.

### E. Tests (gedraaid 2026-08-26)

Zie §12.

### F. Referentiecommits

`d777db7`, `5aa471a`, `fa2d28b`, `d11aa1e`, plus ADR-0008-tijdperk (S3-03).

---

## 10. Externe developer

**NEE**

1. Publish/approval/import zitten in een **mixed working tree**, geen schone PC-commit.  
2. ADR-0042 is **Proposed** — taxonomie nog niet vast.  
3. Storefront **categorie-listing** heeft nog seed-fallback (`LISTING_PRODUCTS`) als de catalog-API leeg is. PDP via product-id gebruikt catalog-API (keten bewezen).  
4. `middlewares.ts` is niet veilig over te dragen zonder hunk-split.  
5. EU-datalaag OPEN — risico op verkeerde aannames in CRUD.

**Eerst:** ADR-0042-besluit (docs); PC-only commit na hunk-split; daarna eventueel instap voor category admin / listing / tests.

---

## 11. Eindconclusie (kort)

Product Cloud is **niet** opnieuw te bouwen. De minimale seller→published→offer→catalog→PDP-keten is **live bewezen** (niet seed-only). Git-isolatie is **niet** klaar: mixed tree.

---

## 12. Live testresultaten (2026-08-26)

Commando’s vanuit `apps/backend` (unit): `$env:TEST_TYPE='unit'; $env:NODE_OPTIONS='--experimental-vm-modules'; pnpm exec jest …`  
E2E: `node scripts/e2e-*.mjs` tegen draaiende Medusa (`GET /health` = 200) en web (`localhost:3000`).

### Unit — vóór en na (geen productcode-fix)

| Suite | Resultaat |
|---|---|
| `category-attributes.unit.spec.ts` | PASS |
| `translation.unit.spec.ts` | PASS |
| `product-approval.unit.spec.ts` | PASS |
| `completeness.unit.spec.ts` | PASS |
| `gpsr-manufacturer.unit.spec.ts` | PASS |
| `import-mapping.unit.spec.ts` | PASS |
| `compliance-gates.unit.spec.ts` | PASS |
| `variant-axes.unit.spec.ts` | PASS |
| `facility-assign.unit.spec.ts` | PASS |
| **Totaal** | **9 suites, 72 tests PASS** |
| `offer-pricing.unit.spec.ts` + `offer-sellability.unit.spec.ts` (regressie) | PASS (7 tests) |

### E2E seller Product Cloud

| Script | Vóór P0-testfix | Na P0-testfix |
|---|---|---|
| `e2e-seller-product-list.mjs` | PASS 22/22 | PASS 22/22 |
| `e2e-seller-product-detail.mjs` | PASS 18/18 | PASS 18/18 |
| `e2e-seller-product-manager.mjs` | PASS 15/15 (`publishable=false` verwacht incompleet) | PASS 15/15 |
| `e2e-admin-p220.mjs` | PASS 28/28 (geen nieuwe publish-keten) | PASS 28/28 (detail van checkpoint-product) |

### Publish-keten `scripts/e2e-pc-publish-chain.mjs`

| Moment | Resultaat | Oorzaak |
|---|---|---|
| Eerste run | **FAIL 11/17** | Script las `product.fields` i.p.v. `product.schema`; GPSR-overlay vanaf lege seed-fabrikant `mfr_e2e_p1b` |
| Na testfix (geen app-code) | **PASS 19/19** | `POST /store/partner/manufacturers` met NL-GPSR + schema-attributen (Vermogen, Elektrisch, CE=Niet van toepassing) + offer + submit + admin approve |

Live productvoorbeeld: `prod_01M0YEQ7ZX49JNAJW8SM8KYG49` — catalog `q=title` count=1; catalog PDP 200; storefront `GET /product/{id}` 200 met titel.

### Minimale keten (bestaande business rules)

| Stap | Status |
|---|---|
| 1 Seller bestaat | PASS (bestaande E2E-seller + MFA) |
| 2 Product aanmaken | PASS `POST /store/product-cloud/products` |
| 3 Productdata | PASS `PATCH …/information` + manager schema |
| 4 Identifiers | PASS GTIN |
| 5 Categorie | PASS bestaande `Tuin` (`pc_category`, geen ADR-0042-migratie) |
| 6 Submit | PASS (vereist `completeness.publishable`; seller mag niet zelf-publishen) |
| 7 Admin beoordelen | PASS admin GET products + approval API |
| 8 Approved | PASS `POST /admin/product-cloud/products/:id/approval` `decision=approved` |
| 9 Published | PASS versie `Gepubliceerd` via bestaande workflow |
| 10 Offer | PASS Commerce Cloud upsert |
| 11 Prijs/voorraad | PASS |
| 12 Catalogus | PASS `GET /store/catalog/products?q=…` (published PC + offer) |
| 13 Storefront PDP | PASS `/product/{id}` via catalog-API + checkout-revalidate |

### Security (bestaande patronen)

| Test | Resultaat |
|---|---|
| Seller token op `GET /admin/product-cloud/products` | 401 PASS |
| Unauth admin (P220) | 401 PASS |
| Cross-seller pause (`e2e-seller-product-list` H) | 400 PASS |
| Foreign product detail (`e2e-seller-product-detail`) | 400 PASS |
| Published visibility | PASS: nieuw product alleen na approve in catalogus |

### Catalogus zonder seed-producten

- Catalog-API list/detail: **onafhankelijk van `LISTING_PRODUCTS`**. Lege catalogus = geen published+offers, geen seed-injectie in de API.  
- Storefront **categoriepagina** (`apps/web/app/categorie/[slug]/page.tsx`): als `resolveListingProducts` leeg is → fallback `productsForCategory` / `LISTING_PRODUCTS`. **Niet verwijderd** (afhankelijkheden: homepage, AI-hydrate, partner-kaarten, search-demo). Buiten minimale checkpoint-scope.  
- PDP-comment in `storefront-catalog.ts` over seed is verouderd: `resolvePdpDetail` gebruikt catalog-API; zonder checkout-ready offer → `null` (geen seed-masker).

### Verification / evidence

- Evidence kan via bestaande store-routes (`…/made-in-europe/evidence`) en admin review.  
- Publish blokkeert op evidence **alleen** bij bestaande completeness-gates: MiE geclaimd, CE=`Zichtbaar`, of `collects_data=Ja`.  
- Checkpoint-product: CE niet van toepassing, geen MiE-claim → evidence **niet** nodig. E2E evidence: **OPEN / P2**.

### Import

- Unit `import-mapping` PASS. Geen import-E2E in deze opdracht.  
- **Niet nodig** voor minimale keten → **P2**.

### Variants

- Model + WIP-API + `e2e-seller-product-detail` multi-variant payload PASS.  
- **Niet nodig** voor minimale single-SKU-keten → **P2** (niet uitgebreid).

### Media

- Minimaal één hoofdafbeelding zit in bestaande completeness.  
- Checkpoint gebruikte bestaande create-`media.storage_reference` (URL). Binary upload-WIP niet uitgebreid. Functioneel voldoende voor catalog/PDP.

### Taxonomie

- ADR-0042 blijft Proposed. Geen migratie. Keten gebruikt bestaande categorie **Tuin**. **Niet BLOCKED.**

---

## 13. P0–P3 na tests

| Prio | Item | Actie deze opdracht |
|---|---|---|
| P0 | Publish-keten onbewezen | **Gesloten** via bestaande API + E2E (testmapping + GPSR-fabrikant via partner-API) |
| P1 | Betrouwbare MVP-keten | **Gesloten** voor de 13 stappen hierboven |
| P2 | Import E2E; variants-volume; evidence-E2E; binary media-upload polish; category seed-fallback weg | Niet gebouwd |
| P2 | Git-isolatie PC (hunk-split `middlewares.ts`) | Niet gecommit |
| P3 | ADR-0042 implementatie; EU Product Data; WOW; CMS/ads | Niet gebouwd |

**Geen P0/P1 productcode-fix:** de eerste keten-FAIL was testdata/mapping, geen ontbrekende architectuur.

---

## 14. Mixed `middlewares.ts` (niet gewijzigd)

Bestand bevat CMS, advertising, MFA, finance, affiliate **én** Product Cloud.

PC-hunks die bij een latere PC-checkpoint horen (niet het hele bestand):

- Store matchers ± regels 156–336: o.a. `ean-match`, `products` GET/POST/PATCH, `import/*`, `facilities`, `manager`, `information`, `versions`/`submit`/`publish`, `media`/`upload`/`reorder`, `bulk-*`, `lifecycle`, `made-in-europe`/`evidence`, `variants`, `translations`, `claims`, `change-proposals`.  
- Admin matchers ± 731–867: `seed`, `categories`/`attributes`/`suggestions`, `translations*`, `ean-match`, `compliance/evidence`, `approvals`, `products/:id/approval`, `evidence/:id/review`, `products` list/detail, `lifecycle`, `claims`, `change-proposals`.  
- Helpers: `customerAuth`/`adminAuth`, `productMediaUpload` (PC media), imports uit `./admin/product-cloud/validators` en `./store/product-cloud/validators`.

**Deze opdracht:** geen edit, geen stage.

---

## 15. Checkpointcriteria

| Criterium | |
|---|---|
| Seller kan product aanmaken | [x] |
| Productdata opslaan | [x] |
| Identifier | [x] |
| Categorie | [x] |
| Submitten | [x] |
| Admin beoordelen | [x] |
| Approved | [x] |
| Published | [x] |
| Offer | [x] |
| Prijs/beschikbaarheid | [x] |
| Catalogus toont product | [x] |
| Storefront PDP toont product | [x] |
| Seller ownership | [x] |
| Geen seed-only kernketen | [x] (catalog + PDP-id; categorie-listing nog seed-fallback) |
| Relevante E2E PASS | [x] |
| Geen bekende P0/P1 blocker | [x] |
| Geen business rule onbedoeld gewijzigd | [x] |

**Functioneel checkpoint:** JA. **Git-checkpoint (één schone PC-commit):** NEE.

---

## 16. Bestanden deze opdracht

Gewijzigd:

- `docs/12-roadmap-reconciliation/product-cloud-checkpoint.md` (dit document)  
- `scripts/e2e-pc-publish-chain.mjs` (nieuw diagnostisch E2E; mapping + fabrikant-API)

Geen wijziging aan `apps/backend` / `apps/web` / `apps/admin` productcode.
