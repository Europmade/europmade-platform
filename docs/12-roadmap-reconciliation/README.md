# EuropMade — MVP Roadmap Reconciliation

**Status:** Levend A–K-oogstdocument (ondergeschikt aan het implementatie-master)  
**Datum:** 2026-08-26  
**Master:** [`docs/11-blueprint-v2/README.md`](../11-blueprint-v2/README.md) (Fase 0–12, as-built-status)

Dit document **vervangt niet** Blueprint V2.1, het implementatie-master, ADR’s of functional specs. Het blijft een reconciliatie van Control Center-modules A–K t.o.v. git/working tree.

**Bron van A–K:** in `docs/06-development/` staat A–K **niet** als één genummerd freeze-document. De reeks hieronder is de operationele Control Center-volgorde (admin-modules A t/m K, o.a. P2.18-nav in `apps/admin/lib/module-registry.ts`) zoals in implementatie gebruikt. Als dat afwijkt van een externe notitie buiten de repo: **OPEN**.

---

## Legenda

| Symbool | Betekenis |
|---|---|
| 🟢 | Klaar / bewezen (git-checkpoint of E2E-claim in overlay; domein kan alsnog polish nodig hebben) |
| 🟡 | Gedeeltelijk / WIP (inclusief working tree) |
| 🔧 | Afmaken / repareren (oogsten, koppelen, dual-path wegwerken) |
| ⏭️ | Nog niet gestart als ontworpen laag |
| ⏸️ | Bewust geblokkeerd of wacht op extern besluit |
| 🧪 | Testen / review nodig |

Een commit ≠ het hele domein klaar. WIP in de working tree blijft 🟡/🔧.

---

## Hoofdoverzicht A–K

| Fase | Oorspronkelijk onderdeel | As-built status | Nog nodig voor MVP | Afhankelijkheden | Prioriteit | Opmerking |
|---|---|---|---|---|---|---|
| **A** | Admin Foundation + Dashboard | 🟡 / 🔧 | Control Center KPI’s stabiel; settlements in nav; geen `git add .` van mixed WIP | Auth, bestaande admin-API’s | Hoog (oogst) | Shell + dashboard in git; `control-center.ts` / dashboard **modified**. `ADMIN_SECONDARY_ROUTES` mist `/finance/settlements` terwijl G3-pagina’s in git zitten. |
| **B** | Seller Management | 🟡 / 🔧 | Partnergoedkeuring E2E; rollen ADR-0041 (bestand deels **untracked**); geen live KvK | Onboarding-spec | Hoog | Partners-admin in git; veel partner-WIP. |
| **C** | Product Management | 🟡 / 🔧 | **Publish-batch committen**; approval/import/manager; geen dual seed-catalogus | PC foundation `d777db7` | **Kritiek** | CRUD in git; publish-keten grotendeels working tree. **Niet opnieuw ontwerpen.** |
| **D** | Order Management | 🟡 / 🔧 | Fulfil-documenten (ADR-0040 deels untracked); packing-slip WIP; live PSP-refund ⏸️ | ADR-0021/0023 | Hoog | Orders/returns-admin bestaan; tree in flux. |
| **E** | Advertising Management | 🟡 | Banner/campaign-admin oogsten; **geen** Sponsored Products (ADR-0003 post-MVP) | CMS/slots | Midden | Routes untracked; banner = Blueprint-inkomsten, ads sturen Buy Box **niet**. |
| **F** | Affiliate Management + programma | 🟡 / 🧪 | F10.1 niet als checkpoint; live affiliate-payout ⏸️ Connect; F9 E2E-scripts aanwezig, resultaat **OPEN** | ADR-0029–0033 | Midden | **Niet herbouwen** F4/F7/F9.1/portal. Zie checkpoints hieronder. |
| **G** | Finance Management | 🟡 / 🟢 G3 | G3 **niet** herbouwen; fiscale PDF/OSS ⏸️; Connect live ⏸️; reprocess/store-invoices untracked | ADR-0034, G3 | Hoog (niet-fiscaal) | Overview/transactions/sellers/affiliates/payouts-UI in tree/git mix. |
| **H** | CMS + Moderatie | 🟡 | CMS-batch committen; homepage zonder mock-only; moderatie queues vs product-approval WIP | C, taxonomie | Midden | Moderatiepagina’s in git; CMS grotendeels untracked. |
| **I** | Settings | 🟡 | Wat settings-pagina dekt vs spec: **OPEN** (pagina untracked) | Shell | Laag | Route in nav; inhoud niet als E2E bewezen. |
| **J** | Audit / Permissions / Hardening | 🟡 / ⏸️ | MFA-batch; GDPR-tickets; encryptie-ADR’s waar nog open | ADR-0026/0028 | Hoog later | Audit-module historisch S3-10; MFA untracked. |
| **K** | Staging / Reviewomgeving | ⏭️ / 🧪 | Eigen staging-DB, testaccounts, formele acceptance | A–J functioneel genoeg | Later formeel; informeel nu | Geen aparte staging-omgeving in repo bewezen. EU-hosting TransIP = productie-intentie (`tech-stack` / TB-01), niet K. |

### Affiliate-checkpoints (niet herplannen)

| Item | Git | Presentatie |
|---|---|---|
| **F4** | `fe9f347` `feat(affiliate): implement F4 product detail and commission flow` | Eigen commit |
| **F7** | `2940266` `feat(affiliate): complete F7 tracking hardening and refund E2E` | Eigen commit |
| **F9** Admin Affiliate Review Center | Geen commit-subject `F9` | Functioneel / scripts `scripts/e2e-f9-admin-affiliate-review.ps1` (untracked) — **geen** zelfstandig checkpoint |
| **F9.1** | `5bfb8ec` `feat(affiliate): add admin performance center` | Eigen commit |
| **F10** payout history | In `4db2067` `feat(affiliate): complete affiliate portal and payouts` | Geen eigen subject |
| **F10.1** Affiliate Account | Geen betrouwbaar git-spoor | Geen checkpoint |

### G3

`1698bcc` — `feat(finance): add seller settlement and service invoicing`. Overlay: E2E `scripts/e2e-finance-g3.mjs` **25/25 PASS** (niet in deze inventarisatie opnieuw gedraaid).

---

## Wat NIET opnieuw gebouwd moet worden

Herontwerp of tweede implementatie van onderstaande is **verspilling**, tenzij een ADR dat expliciet vervangt.

| Functionaliteit | Status | Actie |
|---|---|---|
| Affiliate tracking / click / coupon | In git (F4/F7 + foundation) | Niet herbouwen; attributie ADR-0030 onaangeroerd |
| Affiliate commissie | ADR-0030 + ledger | Niet herbouwen |
| Affiliate portal | `4db2067` | Niet herbouwen |
| Affiliate performance | F9.1 `5bfb8ec` | Niet herbouwen |
| Affiliate payouts (ledger/UI) | `4db2067` | Niet herbouwen; live geld = Connect-stub |
| Affiliate account (F10.1) | Geen checkpoint | **Niet** als nieuw epic starten zonder gap-analyse; ook niet als “klaar in git” claimen |
| Seller settlement + dienstenfactuur | G3 `1698bcc` | **Niet** herbouwen |
| Finance overview / transactions / sellers / affiliates / payouts | Admin-pagina’s + `2a3a520` / `02f963e` | Niet herbouwen; polish/WIP oogsten |
| Product Cloud CRUD / matching / identifiers | `d777db7`, ADR-0008 | Niet herbouwen |
| Product Cloud publish-flow | Architectuur + **WIP-code** | Afmaaken/committen, geen greenfield |
| Seller onboarding / shell / orders / finance-UI | Git + WIP | Niet herbouwen |
| Order-service / checkout / returns | ADR-0021–0023; checkout 🟢 overlay | Niet herbouwen; fulfil-WIP oogsten |
| Buy Box-engine | ADR-0004/0005/0019/0020 | Niet herbouwen; geen ads in score |
| Verification score + seller MiE-workflow | `d11aa1e` | Niet herbouwen; evidence-WIP afmaken |
| Catalogus/listing/PDP-structuur | Git; storefront-listing zonder seed-fallback | Niet herbouwen; pad gezuiverd (categorie/homepage/PDP-rails) |
| i18n-infrastructuur | `1704cbb`, ADR-0038/0039 | Niet herbouwen; DeepL alleen met credentials |
| Premium homepage/PDP-layout | o.a. `954f068`, `25a9bea` | Niet herbouwen; WOW is polish-laag |

---

## MVP Critical Path

Dit is **geen** nieuwe A–K. Dwarsdoorsnede tot live marketplace.

```
SELLER → PRODUCT → PRODUCT DATA → EU PRODUCT DATA → VERIFICATION
→ CATEGORY → APPROVAL → PUBLISHED PRODUCT → OFFER → CATALOG
→ STOREFRONT → CUSTOMER → ORDER → RETURN / REFUND
→ SETTLEMENT → INVOICE → PAYOUT
```

| Stap | Status | Ontbrekend / gap | Afhankelijkheden |
|---|---|---|---|
| SELLER | 🟡 | Werving echte partijen; ADR-0041-bestand untracked | Onboarding |
| PRODUCT | 🟡 / 🔧 | Manager/import in tree | PC module |
| PRODUCT DATA | 🟡 | Volledigheid/GPSR-velden WIP | Seller input |
| EU PRODUCT DATA | ⏭️ | Hele externe laag | Ontwerp-ADR; niet PC-CRUD |
| VERIFICATION | 🟡 | Evidence-review E2E **OPEN** | Laag 1 onboarding; drempel ADR-0002 |
| CATEGORY | 🟢 cutover | 30 canonieke `pc_category`; Admin UI beschikbaar; `is_active`/`sort_order`/CMS P2 | ADR-0042 Geaccepteerd |
| APPROVAL | 🟡 / 🔧 | Admin approval-queue untracked | C |
| PUBLISHED PRODUCT | 🟡 / 🔧 | Commit + storefront alleen published (ADR-0039) | Approval |
| OFFER | 🟡 | WIP offers in tree | Published product + seller |
| CATALOG | 🟡 / 🔧 | Listing uit published+offers; taxonomie uit `pc_category` | Offer + category slugs |
| STOREFRONT | 🟡 | CMS-mock; nav-compat 30 slugs (geen 404-autoriteit) | Catalog |
| CUSTOMER | 🟡 | Account/2FA WIP | Checkout |
| ORDER | 🟡 / 🟢 kern | Simulated payment non-prod | ADR-0018/0021 |
| RETURN / REFUND | 🟢 lifecycle / ⏸️ live refund | Stripe-refund productie | ADR-0023 |
| SETTLEMENT | 🟢 G3 | — | Orders in periode |
| INVOICE | 🟡 G3 dienstenfactuur | Fiscale klant-PDF/OSS | Belastingadviseur |
| PAYOUT | 🟡 ledger / ⏸️ live | Connect | ADR-0018/0034 |

Affiliate-keten (parallel, niet in bovenstaande pijl): tracking → attributie → commissie → payout-ledger = **niet herbouwen**; live payout zelfde Connect-⏸️.

---

## EU Product Data & Verification

Nog **geen** ontworpen externe productregister-laag (`08-integration-architecture.md`: PSP, verzenders, AI-validatie, zoek, optioneel Shopify).

### Bestaand

- Product Cloud (officiële productinfo ≠ offers)
- Identifiers GTIN/EAN/MPN
- Seller product data + media
- Brand/manufacturer (partner-module; extra WIP)
- Evidence / `pc_document` / MiE-evidence-routes (deels WIP)
- Verification twee lagen (specs) + score `d11aa1e`
- Origin-informatie waar in MiE-model aanwezig

KvK live-register: **bewust niet** in MVP-onboarding. DPP: post-MVP.

### Nog te ontwerpen (OPEN — geen stack kiezen)

- Externe EU-productdatabronnen
- Bronselectie, API/import, caching, bronprioriteit
- Read-only vs opgeslagen enrichment
- Bronstatus, conflict resolution, fallback
- Invloed op verification / Verified™ (niet besloten)
- Logging/audit
- Beschikbaarheid/AVG/EU-hosting van derden-API’s

**Kandidaten alleen, geen architectuur:** GS1, EPREL, Safety Gate/ICSMS, e.d. Overlay: PC blijft voorstel-autoriteit tot een ADR dat vastlegt.

---

## Taxonomy / Categories

| Feit | Evidence |
|---|---|
| `pc_category` parent-child + `slug` | ADR-0037, model `pc_category` |
| Storefront hardcoded `MARKETPLACE_CATEGORIES` | Compatibility mapping van de 30 slugs (nav/SSG/filters); **geen** 404-autoriteit |
| Dubbele taxonomie | Overlay §8; ADR-0042 context — **cutover uitgevoerd** |
| **ADR-0042** | **Geaccepteerd** — `pc_category` canonieke storefront-taxonomie; 30 slugs MVP-basis |
| Admin category CRUD-UI | Beschikbaar onder `/product-cloud/categories` |
| 30 canonieke `pc_category`-records | Aangemaakt (ensure); allemaal `parent_category_id = null` in deze stap |
| `pc_product_category` | Koppeling product ↔ categorie |
| SEO/content/images per categorie | P2; rijke CMS later |
| `is_active` / `sort_order` | P2 — niet in deze cutover |

Implementatie: ADR-0042 is **Geaccepteerd**. Storefront-listing is seed-onafhankelijk. Admin Category UI is beschikbaar. **Taxonomie-cutover is uitgevoerd:** de 30 bestaande EuropMade-slugs bestaan als canonieke `pc_category`-records; storefront-bestaan/404 komt uit Product Cloud. `MARKETPLACE_CATEGORIES` blijft tijdelijke compatibility mapping voor navigatie/SSG. Resterende `is_active`/`sort_order` en rijke CMS-functionaliteit zijn P2.

---

## MVP Marketplace Content

Technisch werkend ≠ lanceerbaar.

| | Technical MVP | Commercial MVP-readiness |
|---|---|---|
| Doel | Publish → offer → buy → return → G3 close zonder 500 | Geloofwaardige EU-markt: echte sellers, merken, SKU’s, beelden, prijzen, offers, categorieën, evidence |
| Seed/demo | Ontwikkeling OK | **Niet** productiecatalogus (overlay §9) |

**Voorstel-aantallen** (overlay §9, **niet bindend**): 8–12 categorieën met ≥1 echt product; 8–15 sellers; 15–25 merken; 40–80 SKU’s. Geen nieuwe aantallen hier.

Werving ná stabiel publish-pad (niet tijdens dual taxonomie).

---

## Staging & Colleague Review

**K blijft K.** Formeel later; tussentijdse review tijdens bouwen is wenselijk.

### A. Technische staging

In de repo **niet** bewezen als aparte omgeving (eigen URL/DB). Nodig wanneer K start:

- Aparte omgeving (EU-hosting-kader blijft TransIP/NL)
- Eigen database
- Testaccounts: consumer, sellers, affiliates, admin
- Testproducten / testorders
- Testbetalingen: simulated toegestaan non-prod (ADR-0021); echte PSP alleen met fail-closed secrets (ADR-0018)

### B. Collega-review (niet alleen groen E2E)

| Rol | Scenario’s |
|---|---|
| Consument | Homepage, categorie, zoeken, PDP, winkelwagen, checkout, account, retour |
| Seller | Registratie, product, productdata, bewijs, categorie, offer, order, finance, facturen |
| Affiliate | Registratie, approval, product zoeken, link, tracking, commissie, statistieken, payout-inzage |
| Admin | Seller approval, product review, verification, categorie, orders, finance, affiliate, advertising, CMS |

Ook: begrijpelijkheid, UX, vertrouwen, ontbrekende info, visuele kwaliteit, fouten, mobile.

### C. Formele MVP acceptance review

Na Technical + Functional + Content + Commercial checks (zie MVP Ready Definition). **OPEN** wie tekent (governance overlay OPEN).

---

## Frontstore UX / Visual WOW Layer

**Niet bouwen in deze opdracht.** Inventarisatie. Ondergeschikt aan performance, SEO, a11y, conversie, snelheid.

Bestaande premium-layout (hero, carousels, gallery `transition-transform`, card skeletons) is **geen** volledige WOW-laag.

| Onderdeel | Status |
|---|---|
| Homepage hero / category cards / why-EU sectie | 🟢 structuur (o.a. `HomepageHero`, freeze-commits) |
| Homepage CMS vs mock | 🟡 |
| Subtiele motion / product entrance / parallax | 🆕 / ⏸️ (parallax niet aangetroffen; overdaad vermijden) |
| Hover / micro-interactions | 🟡 (o.a. FAQ/gallery transitions) |
| Product card hover / image transition / CTA | 🟡 |
| PDP gallery / zoom / sticky buy / Buy Box / Verified | 🟡 (Buy Box-engine 🟢; presentatie polish 🟡) |
| Origin / Made in Europe storytelling | 🟡 (score in git; visuele story 🆕) |
| Scroll reveal / page transitions | 🆕 |
| Loading skeletons | 🟢 deels (carousel, seller-lijsten) |
| Empty / error states | 🟡 **OPEN** dekking |
| Responsive/mobile polish | 🟡 |
| Overdreven animatie | ⏸️ bewust niet |

---

## External Developer Readiness

**Geen aanstelling. Geen uren zonder onderbouwing. Geen Handover Pack nu.**

Structureel instappen **nadat:**

1. Blueprint V2 overlay stabiel is (**done:** `69d08bc`);
2. Product Cloud-gap duidelijk is én **minimaal de publish-batch in git** (nu: gap = working tree);
3. Taxonomie-architectuur duidelijk: ADR-0042 **Geaccepteerd** (cutover 30 `pc_category` uitgevoerd);
4. EU Product Data **besliskader** (wel/geen externe laag; geen verkeerde fundering) — nu OPEN.

**Mogelijke latere pakketten:** category admin, PC gap-closure (onder owner-sturing), catalog listing, CMS, frontend polish, tests, media, performance, cleanup.

Owner houdt: verificatiebeleid, EU-bronnen, finance/fiscaal, werving, Buy Box-integriteit, scope.

Later: **Developer Onboarding & Handover Pack** (doel, architectuur, status, repo, docs, git, verboden wijzigingen, DoD, test/commit, rapportage, planning).

---

## MVP Ready Definition

Geen nieuwe business rules. Categorieën hier zijn **gereedheidslenzen**.

| Lens | Groen wanneer (bestaande docs/git) |
|---|---|
| **Technical Ready** | Kernketen zonder structurele 500; PC/CC gescheiden; Buy Box server-side; G3 close werkt |
| **Functional Ready** | Must-haves uit `05-mvp-scope` + Affiliate-MVP (`blueprint-reference`) gedekt; dual taxonomie opgelost **of** bewust geaccepteerde fallback |
| **Content Ready** | Geen seed-only productie; echte beelden/offers (aantallen = voorstel overlay) |
| **Commercial Ready** | Echte EU-sellers/merken in lijn met werving; 6 landen Blueprint vs gefaseerd = **OPEN** |
| **Review Ready** | Collega-scenario’s A–K rollen + K-staging of gelijkwaardig |
| **Launch Ready** | Alle relevante lenzen groen **en** fiscale/PSP-blokkers voor live geld expliciet afgevinkt of bewust ⏸️ met workaround-beleid |

Fiscale PDF / wettelijke OSS-klantfactuur / deemed-supplier / Connect live zijn **geen** Technical Ready-eis om G3 te herhalen; ze blokkeren **Launch Ready** voor echt geld tot adviseur/PSP.

---

## Recommended Next Steps

Maximaal 10, op **afhankelijkheid**. Eerste stap is **niet** “Product Cloud vanaf nul bouwen”.

| # | Naam | Waarom | Afhankelijkheden | Verwacht resultaat | Externe developer? |
|---|---|---|---|---|---|
| 1 | **ADR-0042 formeel reviewen** (accept/reject) | Zonder besluit blijft dual taxonomy; migratie mag niet starten | Overlay `69d08bc` | **Gedaan:** Geaccepteerd | Nee |
| 2 | **Working tree oogsten: Product Cloud publish/approval/import** | Grootste blokkade voor echte catalogus; code bestaat al | Geen greenfield PC | Checkpoint `e435b825` | Nee (owner); later ja voor restgap |
| 3 | **Listing zonder seed in productiepad** | Technical marketplace i.p.v. demo | Stap 2; liefst 1 | **Gedaan:** `/categorie/[slug]` toont published+offers of lege staat | Optioneel ná 2 |
| 4 | **EU Product Data: ontwerp-ADR (kader, geen bronkeuze verzinnen)** | Voorkomt verkeerde fundering | Overlay §7 | **Gedaan:** ADR-0043 Geaccepteerd | Nee |
| 5 | **Minimale Admin Category UI** | ADR-0042 Must vóór cutover | 1–3 | **Gedaan:** list/create/edit/parent/vertaling/redirect | Nee |
| 5b | **Taxonomie-cutover** | 30 `pc_category` + storefront-bestaan uit PC | 5 | **Gedaan:** 30 slugs als `pc_category`; 404 = ontbreekt in PC | Nee |
| 6 | **CMS/advertising WIP-commit** (banners ≠ Buy Box) | Homepage/marketing | 3 of parallel ná 2 | Geen mock-only homepage | Ja mogelijk |
| **Volgende volgens master** | **Fase 5 — echte EU-producten en merken** | Commercial Ready; geen architectuurherbouw | Fase 1–4 as-built | Echte SKU’s/offers | Nee (business) |
| 7 | **Informele collega-review** (lokaal/dev) | Vangt UX/vertrouwen vóór K | 3 | Bevindingenlijst | Nee |
| 8 | **Finance: niet-fiscaal oogsten** (reprocess/UI); G3 onaangeroerd | Rest G zonder herbouw | G3 | Minder untracked finance | Nee |
| 9 | **Content/werving** | Commercial Ready | 3, 5 of tijdelijke slug-afspraak | Echte SKU’s | Nee (business) |
| 10 | **K staging + J hardening + WOW-polish** | Launch Ready / review | 7–9; fiscaal/PSP ⏸️ waar van toepassing | Staging + a11y/perf-first motion | Ja voor polish/tests |

---

## Consistentiecheck

- Geen tweede Affiliate- of G3-bouw.
- A–K volledig in hoofdtabel.
- EU Product Data, taxonomie, content/werving, K, WOW, externe developer: eigen secties.
- Fiscale open punten ⏸️/OPEN, niet 🟢.
- Overlay Fase 0–10 blijft **intentie**; dit document herstructureert A–K niet tot die 0–10.

---

## Referenties

- [`docs/11-blueprint-v2/README.md`](../11-blueprint-v2/README.md)
- [`docs/04-decisions/0042-canonical-storefront-taxonomy-pc-category.md`](../04-decisions/0042-canonical-storefront-taxonomy-pc-category.md)
- [`docs/00-context/blueprint-reference.md`](../00-context/blueprint-reference.md)
- [`blueprint/README.md`](../../blueprint/README.md)
