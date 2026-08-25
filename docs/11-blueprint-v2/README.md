# EuropMade Blueprint V2 — As-Built MVP Overlay

**Status:** Levend document (Fase 0)  
**Datum:** 2026-08-25  
**Dit document vervangt Blueprint V2.1 niet.**

---

## 1. Doel van dit document

Blueprint V2.1 in [`/blueprint/`](../../blueprint/README.md) blijft het **business-brondocument**. Het wordt niet vanuit deze repository bewerkt (`blueprint/README.md`).

Dit document is de **actuele technische en productmatige overlay**: wat de Blueprint voorschrijft, wat in git daadwerkelijk gebouwd is, wat gedeeltelijk of alleen in de working tree zit, wat ontbreekt, en wat bewust later of fiscaal geblokkeerd is.

Bevroren documenten onder `docs/00-context/` t/m `docs/10-implementation/` blijven als **historie en functionele bron** bestaan. Ze worden hier niet stilzwijgend herschreven.

Nieuwe inhoudelijke besluiten die van de Blueprint of van een eerdere ADR afwijken, komen via **ADR’s** in [`docs/04-decisions/`](../04-decisions/README.md), conform het bestaande wijzigingsproces in [`docs/README.md`](../README.md).

Deze overlay wordt bijgewerkt wanneer een belangrijke architectuur- of MVP-beslissing wijzigt (nieuwe ADR, nieuwe git-checkpoint, of een expliciete scopewijziging zoals de Affiliate-MVP-notitie in [`docs/00-context/blueprint-reference.md`](../00-context/blueprint-reference.md)).

---

## 2. Documenthiërarchie

### Wat uit bestaande documentatie volgt

| Laag | Bron | Rol |
|---|---|---|
| **Business** | Blueprint V2.1 (`blueprint/EuropMade_Blueprint_V2_1.docx` / `.pdf`) | Externe bron van waarheid voor business- en productstrategie. Niet vanuit de repo wijzigen. |
| **Business-scopecorrectie in de repo** | [`docs/00-context/blueprint-reference.md`](../00-context/blueprint-reference.md) | Affiliate Platform (excl. Creator) is MVP; vervangt H15.7 / H15A.12 **op dat punt** zonder het Blueprint-PDF te wijzigen. |
| **Actuele as-built** | Dit document (`docs/11-blueprint-v2/`) | Vastlegging van git + working tree t.o.v. de Blueprint. Geen vervanging van V2.1. |
| **Formele afwijkingen / aanvullingen** | [`docs/04-decisions/`](../04-decisions/README.md) | ADR’s. Worden niet stilzwijgend gewijzigd; een nieuwe ADR vervangt een oude expliciet. |
| **Architectuur (Sprint 2)** | [`docs/08-technical-blueprint/`](../08-technical-blueprint/README.md) | Technical Blueprint (deels Concept v0.2). Respecteert ADR’s. |
| **Functioneel** | [`docs/03-functional-specs/`](../03-functional-specs/) | Domeinspecs; mix van bevroren en concept. |
| **UX** | [`docs/02-ux/`](../02-ux/) | Rollen, sitemap, wireframes. |
| **MVP-afbakening (Must/Should/Could)** | [`docs/05-mvp-scope/README.md`](../05-mvp-scope/README.md) | Overzicht; Affiliate-scopewijziging opgenomen. |
| **Implementatieplanning** | [`docs/06-development/`](../06-development/), [`docs/09-implementation-blueprint/`](../09-implementation-blueprint/), [`docs/10-implementation/`](../10-implementation/) | Historische planning. **Achter op git** (o.a. “nog geen code” in `10-implementation/README.md`). |
| **Git** | Commits en working tree | Wat daadwerkelijk draait of in ontwikkeling is. |

### Wat te doen bij tegenspraak

Volgens bestaande stukken:

1. **Blueprint-PDF vs. `blueprint-reference.md` op Affiliate:** de repo-scopewijziging in `blueprint-reference.md` treedt in de plaats van H15.7/H15A.12 op dat punt (zelfde patroon als een ADR die een eerdere ADR vervangt).
2. **Bevroren `docs/` vs. nieuwe inhoudelijke keuze:** eerst een ADR, daarna het betreffende document bijwerken (`docs/README.md`, wijzigingsproces). ADR’s zelf nooit stilzwijgend herschrijven (`docs/04-decisions/README.md`).
3. **Blueprint-versiewijziging (bijv. v2.2):** vastleggen als nieuwe ADR (`blueprint/README.md`).

### OPEN — governance

Er is **geen** bestaand bevroren document dat expliciet zegt dat deze overlay “wint” van een bevroren spec wanneer git voorloopt. Tot dat is vastgelegd:

- deze overlay is **observatie van as-built**, geen stille vervanging van Freeze-specs;
- bindende afwijkingen lopen via **ADR** of via het al bestaande `blueprint-reference.md`-patroon.

Evenmin is vastgelegd of `docs/README.md` / `Sprint-3-Progress.md` verplicht synchroon moeten blijven met git. Die indexen zijn aantoonbaar verouderd; bijwerken is een aparte documentatietaak, geen Fase 0-doel van deze overlay.

---

## 3. As-built status

Legenda: **🟢** gebouwd en in git bewezen of als checkpoint vastgelegd · **🟡** gedeeltelijk (WIP, working tree, of fallback) · **🔴** ontbreekt als ontworpen laag · **⏸️** bewust geblokkeerd of wacht op extern besluit.

Status is geen verzonnen groen: waar alleen untracked/WIP bestaat, staat **🟡**, ook als er al routes in de tree staan.

| Onderdeel | Status | Waarom (repo-evidence) |
|---|---|---|
| **Storefront** | 🟡 | Listing, PDP, cart, checkout, categoriepagina’s in git (o.a. `2454c5e`, `25a9bea`, `954f068`). Navigatie en `/categorie/[slug]` leunen nog op hardcoded `MARKETPLACE_CATEGORIES` (`apps/web/app/_lib/marketplace-categories.ts`); ADR-0038 staat PC-fetch + fallback toe. Seed/CMS-fallback blijft een productierisico. |
| **Product Cloud** | 🟡 | Foundation in git (`d777db7`, ADR-0008/0037, vertalingen `5aa471a` / `fa2d28b`). Publish/approval/import/manager: omvangrijke **working tree**, niet als schone publish-batch gecommit. |
| **Commerce Cloud** | 🟡 | Offer/inventory/price (ADR-0014/0015); S3-04 tickets historisch groen in progress-doc, code in modules. Functioneel bestaand, maar nog WIP aanwezig in working tree. |
| **Buy Box** | 🟢 | Server-side engine (ADR-0004/0005/0019/0020). Advertenties/commissie mogen de score niet sturen (PC/CC-spec §3.0). |
| **Seller** | 🟡 | Onboarding, partnerrollen (ADR-0041), seller shell/orders/finance-UI. Admin partnergoedkeuring as-built; Partner Center-spec noemt deels read-only. |
| **Product verification** | 🟡 | Twee-laags model in specs (Laag 1 onboarding, Laag 2 product). Score + seller-workflow in git: `d11aa1e`. Evidence/review-API’s deels WIP. |
| **Categories** | 🟡 | `pc_category` parent-child + `slug` (ADR-0037). Storefront: aparte hardcoded lijst (~30 slugs, H14.8). Admin category CRUD-UI ontbreekt; API GET/POST ensure bestaat. Zie [ADR-0042](../04-decisions/0042-canonical-storefront-taxonomy-pc-category.md). **Nog niet gemigreerd.** |
| **Catalog** | 🟡 | Store-catalogus + Buy Box-listing. Productie mag niet seed-only zijn (launchdoel, §9); huidige paden kunnen nog seed/fallback tonen. |
| **Orders** | 🟡 | Custom order-service (ADR-0021); seller/buyer/admin-oppervlakken. Extra seller-documenten/packing: ADR-0040 + deels WIP. Functioneel bestaand, maar nog WIP aanwezig in working tree. |
| **Checkout** | 🟢 | Offer-cart (ADR-0022); premium checkout-commits. PSP live vs simulated: ADR-0018/0021 (simulated toegestaan in non-prod). |
| **Returns** | 🟢 | Lifecycle + refund (ADR-0023, anker ADR-0040). Productie-PSP-refund **⏸️** tot Stripe-refund (ADR-0023). |
| **Finance** | 🟡 | Ledger/invoice/payout-schema ADR-0034; seller/admin dashboards (`ef25a6a`, `2a3a520`, `02f963e`). G3 settlement **🟢** (hieronder). Overige factuur-UI/reprocess deels untracked. |
| **Seller settlement** | 🟢 | Commit `1698bcc` — `feat(finance): add seller settlement and service invoicing` (`1698bcc8630d0f872ed34c27d7fda23bb7821632`). E2E-script `scripts/e2e-finance-g3.mjs`: **25/25 PASS** (G3-checkpoint). Geen payout in period close. |
| **Invoicing** | 🟡 | G3: platform-dienstenfactuur gekoppeld aan settlement. Klant-OSS-factuur / fiscale PDF: niet als wettelijk product bewezen. `finance/spec.md` §3.2 (klantfactuur) ≠ G3-as-built. |
| **Payout** | 🟡 / ⏸️ | Per-order `payout` + `eligible_at` hold 14d (ADR-0034) in schema/code. **Live Stripe Connect-transfer: stub** (ADR-0018, ADR-0034). G3 maakt geen payout aan. |
| **Affiliate** | 🟡 | MVP-scope (`blueprint-reference.md`). Foundation + portal + payouts in git (`d8dc3a4`, `b4ef770`, `fe9f347` F4, `2940266` F7, `5bfb8ec` F9.1, `4db2067` portal/payouts). F9/F10/F10.1: zie §5. Attributieregels: ADR-0030 — **niet wijzigen in deze overlay**. |
| **Admin** | 🟡 | Shell, partners, orders, finance, affiliate. Control Center / CMS / advertising / settlements-nav: mix git + WIP. |
| **CMS** | 🟡 | Admin/store CMS-routes in tree; niet als afgeronde git-checkpoint gelijk aan G3. Homepage historisch deels CMS-mock + freeze-commits (`954f068`). |
| **Advertising** | 🟡 | Store/admin advertising-routes in tree; Sponsored Products blijven post-MVP (ADR-0003). Bannerplatform is Blueprint-inkomstenbron; implementatie WIP. |
| **MFA / security** | 🟡 | Authenticatie-spec (2FA). MFA-module + store-routes in tree; niet als volledige E2E-checkpoint in deze overlay vastgelegd. Privacy: ADR-0028. |
| **i18n** | 🟡 | Storefront-locale `1704cbb`. PC-vertalingen ADR-0038/0039; DeepL alleen met credentials, anders geen neptekst. |

**Working tree:** naast HEAD liggen grote untracked/modified batches (Product Cloud, CMS, advertising, MFA, orders, partner). Dat is een **oogst-/commitprobleem**, geen bewijs dat die features “🟢 gereed” zijn.

---

## 4. MVP-keten

```
SELLER
→ ONBOARDING
→ PRODUCT
→ PRODUCT DATA
→ EU PRODUCT DATA
→ VERIFICATION
→ CATEGORY
→ APPROVAL
→ PUBLISHED PRODUCT
→ OFFER
→ BUY BOX / CATALOG
→ STOREFRONT
→ CUSTOMER ORDER
→ FULFILMENT
→ RETURN / REFUND
→ SETTLEMENT
→ INVOICE
→ PAYOUT
```

| Stap | As-built |
|---|---|
| SELLER | Gedeeltelijk — partner/seller-accounts, rollen ADR-0041 |
| ONBOARDING | Gedeeltelijk — EU-productieclaim Laag 1; KvK live-register bewust niet in MVP (`partner-onboarding/spec.md`) |
| PRODUCT | Gedeeltelijk — Product Cloud CRUD; import/manager WIP |
| PRODUCT DATA | Gedeeltelijk — seller-ingevoerd + identifiers (GTIN/EAN/MPN, ADR-0008/0037) |
| EU PRODUCT DATA | Ontbrekend als architectuurlaag — zie §7 |
| VERIFICATION | Gedeeltelijk — specs + `d11aa1e`; evidence/approval-keten niet 🟢 E2E |
| CATEGORY | Gedeeltelijk — dual taxonomy; doel: ADR-0042 (migratie later) |
| APPROVAL | Gedeeltelijk — moderatie in git; product-approval queues WIP |
| PUBLISHED PRODUCT | Gedeeltelijk — publicatiestatussen in architectuur; storefront-koppeling ADR-0038/0039 |
| OFFER | As-built (Commerce Cloud) |
| BUY BOX / CATALOG | As-built engine; cataloguslisting gedeeltelijk (seed/fallback) |
| STOREFRONT | Gedeeltelijk — zie §3 |
| CUSTOMER ORDER | As-built order-service |
| FULFILMENT | Gedeeltelijk — shipment/documenten ADR-0040; packing-slip WIP |
| RETURN / REFUND | As-built lifecycle; live PSP-refund geblokkeerd tot Stripe |
| SETTLEMENT | As-built G3 (`1698bcc`) |
| INVOICE | Gedeeltelijk — G3 dienstenfactuur; fiscale klant-PDF open |
| PAYOUT | Gedeeltelijk ledger/hold; live Connect **ontbrekend / stub** |

---

## 5. Affiliate-keten

```
AFFILIATE
→ CLICK / COUPON
→ ATTRIBUTION
→ COMMISSION
→ PAYOUT
```

Geen business rules wijzigen (ADR-0029–0033, ADR-0030 attributie; commissie uit platformmarge, niet als seller-kost — `finance/spec.md` §3.1).

| Checkpoint | Git / tree | Status in deze overlay |
|---|---|---|
| Foundation / consent / portal | `d8dc3a4`, `b4ef770`, `0a774fd` (o.a. fraude) | Gedeeltelijk → grotendeels in git |
| **F4** product detail + commissieflow | `fe9f347` | In git |
| **F7** tracking hardening + refund E2E | `2940266` | In git |
| **F9** Admin Affiliate Review Center | Geen afzonderlijk herkenbaar commit-subject in git-history | Gebouwd / functioneel, maar geen zelfstandig F9-checkpoint |
| **F9.1** Affiliate Performance Center (periode 7/30/90) | `5bfb8ec` (`feat(affiliate): add admin performance center`); F9.1-commentaar in admin aggregate | In git |
| **F10** Affiliate payout history | Geen eigen commit-subject; opgenomen in `4db2067` (`feat(affiliate): complete affiliate portal and payouts`) | In die portal/payouts-commit; geen zelfstandig F10-checkpoint |
| **F10.1** Affiliate Account | Geen betrouwbaar git-spoor als zelfstandig checkpoint | Niet als aparte Git-checkpoint of alias van F10 |
| Portal + affiliate payouts | `4db2067` | In git (ledger/UI); live geld = zelfde Connect-⏸️ als seller (ADR-0018, ADR-0034) |

Uitbetaling affiliate hergebruikt finance/PSP-patroon (`08-integration-architecture.md`: geen tweede PSP).

---

## 6. Finance

### AS-BUILT

| Onderdeel | Vastlegging |
|---|---|
| Platformcommissie | 10% over Buy Box-parity snapshot (ADR-0034; financieel model via `blueprint-reference.md`) |
| Commission ledger | Custom finance-module; per-order commissie (S3-08 / `02f963e`) |
| Seller settlement | G3 `seller_settlement`; uniek `(seller_id, period)`; status open/closed; `1698bcc` |
| Dienstenfactuur | G3: factuur uit platformcommissie + advertentieweken + bestaand `determineVatRegime` (configureerbaar, geen nieuwe fiscale wet) |
| Payout/hold | `payout` + `eligible_at` 14 dagen (ADR-0034). **Conflict let op:** ADR-0040 anker retour op levering (30 dagen); ADR-0034 hold blijft 14 dagen vanaf order-cadans — niet in G3 opgelost. |
| Affiliate commission | ADR-0030; ten laste van platformmarge |
| Affiliate payout | Git `4db2067` + store finance affiliate payouts; geen live Connect |
| G3 E2E | `scripts/e2e-finance-g3.mjs` — 25/25 PASS |

G3 sluit de periode **zonder** payout aan te maken. Historische settlementrecords met een ontbrekende invoice-koppeling zijn niet automatisch opnieuw geopend of gemuteerd tijdens G3-verificatie.

### OPEN / FISCAAL BESLUIT NODIG

Geen fiscale regels verzinnen. Uit bestaande specs/ADR’s:

| Onderwerp | Bron | Status |
|---|---|---|
| Wettelijke factuurvereisten per launch-land | `finance/spec.md` §7 | Open |
| Klant OSS-factuur als wettelijk document | `finance/spec.md` §3.2 vs G3 (seller-dienstenfactuur) | Open / niet as-built gelijkgetrokken |
| Fiscale PDF | Niet in G3-scope | Open |
| Deemed-supplier / BTW-as-law | Geen ADR | Open — belastingadviseur |
| Uitbetalingscadans wekelijks vs maandelijks | `finance/spec.md` §7 vs ADR-0034 per-order payout-records vs G3 maandsettlement | Open interpretatie; G3 = maandclose zonder uitbetaling |
| Stripe Connect live transfer | ADR-0018, ADR-0034 | Stub tot secrets/productiekeuze |
| PSP-refund productie | ADR-0023 | Geblokkeerd tot Stripe-refund |

`determineVatRegime` blijft een **bestaande configureerbare** helper, geen vastgelegde wettelijke OSS-regel in deze overlay.

---

## 7. EU Product Data

Er is **geen** definitieve externe EU-productdatalaag in Technical Blueprint of functionele specs. `08-integration-architecture.md` noemt PSP, verzenders, AI-validatie, zoekindex, optioneel Shopify — **niet** externe productregisters.

### Wat al bestaat

| Laag | Inhoud | Bron |
|---|---|---|
| Seller product data | CRUD, media, attributen, import (WIP) | Product Cloud, ADR-0008 |
| Identifiers | GTIN/EAN/MPN matching | Marketplace-core / PC architecture |
| Bewijsstukken | Onboarding-documenten; product evidence / `pc_document` | Onboarding-spec; ADR-0037; Mie-evidence-routes |
| Product Cloud | Officiële productinformatie (gescheiden van offers) | Blueprint H7; ADR-0008 |
| Verification | Laag 1 bedrijf, Laag 2 product | PC architecture Deel 7; onboarding |
| Verified-score / evidence | Score-engine + kwalificatie + goedgekeurd bewijs | `d11aa1e` + evidence-API’s |

KvK: **geen live handelsregister in MVP** (bewuste scope, onboarding-spec). DPP: post-MVP (H15.7 / mvp-scope).

### OPEN BESLUITEN (geen bronnen als architectuur vastleggen)

Niet nu vastleggen als gekozen stack (GS1, EPREL, Safety Gate, ICSMS, enz. zijn **geen** beslissing):

- welke externe databronnen (indien überhaupt);
- bronkeuze en licentie/AVG/EU-hosting;
- read-only versus cache;
- bronprioriteit bij conflicten;
- wat alleen enrichment is versus reviewer-signaal;
- of/hoe iets Verified™ mag beïnvloeden (Buy Box mag niet door ads/commissie; externe data is **niet** besloten);
- fallback bij onbeschikbaarheid;
- privacy/datahosting voor derden-API’s.

**Voorstel tot latere ADR (geen regel):** EuropMade-Product Cloud blijft autoriteit; externe hits overschrijven seller-/PC-data niet stilzwijgend. Dat is **geen** geaccepteerde ADR tot het zo is vastgelegd.

Import/export naar externe partijen: Technical Blueprint §6 **Open, geen grondslag**; seller-import in code is WIP — geen stille TB-wijziging hier.

---

## 8. Categorieën

**Huidige situatie (as-built, geen migratie in Fase 0):**

- Product Cloud: tabel `pc_category`, `parent_category_id`, unieke `slug` (ADR-0037).
- Storefront: eigen hardcoded `MARKETPLACE_CATEGORIES` (~30 slugs, commentaar Blueprint H14.8).
- ADR-0038: storefront mag PC-categorieën ophalen; bij fout/ontbreken **fallback** naar marketplace/CMS-data.
- Gevolg: **dubbele taxonomie** — navigatie/404-gedrag kan loslopen van `pc_product_category`.

**Richting:** [ADR-0042](../04-decisions/0042-canonical-storefront-taxonomy-pc-category.md) (status Proposed / Ter review) beschrijft de voorgestelde richting om `pc_category` als canonieke storefront-taxonomie te gebruiken; implementatie volgt pas na formele acceptatie.

Uitvoering (code, seed, admin-UI, SEO-content) is **Fase 2**. Deze overlay wijzigt geen storefront of Product Cloud.

---

## 9. MVP launch criteria

Dit zijn **voorlopige business-doelen**, geen harde Blueprint-regel en geen Must/Should-tabelwijziging van `05-mvp-scope`.

Blueprint blijft 6 landen gelijktijdig noemen (H14.10 / mvp-scope). Technisch gefaseerd landen uitzetten is een **voorstel**, geen besluit.

| Doel | Voorstel (niet bindend) | Stretch |
|---|---|---|
| Categorieën live met ≥1 echt product | 8–12 | 20+ |
| Goedgekeurde sellers met ≥1 offer | 8–15 | 25+ |
| Zichtbare EU-merken/producenten | 15–25 | 40+ |
| Published SKU’s + offer + echte beelden | 40–80 | 150+ |
| Catalogus | Geen seed-only in productie | — |

Kwaliteit: echte EU-sellers, echte producten, echte offers, echte afbeeldingen, geloofwaardige categoriebreedte. Werving na stabiel publish-pad (Fase 4–5), niet op demo-listing.

---

## 10. Roadmap

Vastgelegd als huidige intentie van Fase 0. Kleine volgorde-aanpassing t.o.v. een eerdere audit staat als **voorstel** gemarkeerd, niet stilzwijgend als feitelijke Blueprint-wijziging.

| Fase | Naam | Toelichting |
|---|---|---|
| **0** | Blueprint V2 overlay + taxonomie-ADR | Dit document + ADR-0042. Geen code. |
| **1** | Product Cloud | Eerst **oogsten/committen** van de publish-keten (approval/import/manager). Voorstel: zonder deze batch blijft Fase 4 onbetrouwbaar. |
| **2** | Taxonomy | Uitvoeren ADR-0042 (niet in Fase 0). |
| **3** | EU Product Data | Ontwerp + eventueel read-only spike; bronkeuze blijft OPEN tot ADR. |
| **4** | Catalog / echte producten | Geen seed-fallback in productiepad. |
| **5** | Seller recruitment | Na Fase 4. |
| **6** | CMS / homepage / advertising | WIP-batch; parallel ná Fase 2 mogelijk. |
| **7** | Finance completion | Alleen wat **niet** fiscaal geblokkeerd is. Live Stripe Connect-transfer blijft stub (ADR-0018, ADR-0034) **⏸️**. |
| **8** | Full MVP E2E | Seller → buy → return → G3 close. |
| **9** | Hardening | Security, MFA-batch, GDPR-tickets. |
| **10** | Launch | Business: 6 landen; technisch gefaseerd = voorstel. |

Affiliate: geen eigen megafase; restpunten (o.a. F10 payout history in `4db2067`; F10.1 Affiliate Account zonder zelfstandig git-checkpoint) in een kleine batch tussen 1 en 8.

---

## 11. Externe ontwikkelaar

Alleen **besluitkader**. Het document *Developer Onboarding & Handover Pack* wordt **nu niet** gemaakt.

- **Niet instappen** vóór Blueprint V2 (Fase 0) **en** een stabiele Product Cloud **publish-batch** in git (niet alleen working tree).
- Verwachte instap: na Fase 0 + minimaal die ene PC-publish-commit.
- Mogelijke latere taken: category admin, catalog listing, CMS, i18n, tests, media pipeline, technische polish.
- Sturen blijft bij de product owner: verificatiebeleid, EU-databronnen, finance/fiscaal, seller-werving, Buy Box-integriteit, scope.

Later pakket (nog niet schrijven) moet minstens bevatten: doelstelling, architectuur, huidige status, repositorystructuur, relevante documenten, Git/branch/checkpoints, verboden wijzigingen, concrete taken, Definition of Done, teststrategie, commitstrategie, rapportage, uren/planning.

---

## Referenties (niet exhaustief)

- [`blueprint/README.md`](../../blueprint/README.md)
- [`docs/00-context/blueprint-reference.md`](../00-context/blueprint-reference.md)
- [`docs/04-decisions/0042-canonical-storefront-taxonomy-pc-category.md`](../04-decisions/0042-canonical-storefront-taxonomy-pc-category.md)
- Git: `1698bcc` (G3), `d11aa1e` (Made in Europe score), `d777db7` (PC foundation), affiliate F4/F7 commits hierboven
