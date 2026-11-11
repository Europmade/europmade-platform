# ADR-0042 — Storefront taxonomy uses Product Cloud categories as canonical taxonomy

**Status:** Geaccepteerd  
**Datum:** 2026-08-25; review 2026-08-26; geaccepteerd 2026-08-26  
**Domein:** Product Cloud, Storefront, Taxonomie  
**Raakt:** ADR-0008 (`pc_category`); ADR-0037 (`slug`); ADR-0038 (storefront-fetch + fallback); ADR-0039 (vertalingen); ADR-0043 (externe taxonomie ≠ canoniek, Geaccepteerd); Blueprint H7 / H14.8; overlay [`docs/11-blueprint-v2/README.md`](../11-blueprint-v2/README.md) §8–9; [`docs/12-roadmap-reconciliation`](../12-roadmap-reconciliation/README.md)

**Uitvoering:** taxonomie-cutover 2026-08-26 — 30 canonieke `pc_category`-slugs + storefront-bestaan uit Product Cloud; Admin Category UI aanwezig. Rest P2: `is_active`/`sort_order`, rijke CMS, subcategorieën vullen. Zie [`docs/11-blueprint-v2/README.md`](../11-blueprint-v2/README.md) §7–8.

---

**As-built inventaris hieronder** is de snapshot **op ADR-schrijfdatum** (vóór cutover). Na acceptatie + cutover 2026-08-26 geldt [`docs/11-blueprint-v2/README.md`](../11-blueprint-v2/README.md) §7–8: Admin Category UI bestaat; storefront-404 uit `pc_category`; seed-fallback op categoriepagina’s is verwijderd; `MARKETPLACE_CATEGORIES` is compatibility mapping.

### Product Cloud-model

| Onderdeel | Feit in repo |
|---|---|
| Tabel | `pc_category`: `id`, `name`, `slug` (nullable, uniek indien gezet), `parent_category_id` (nullable, self-FK), timestamps, `deleted_at`. **Geen** `sort_order`, **geen** `is_active` (alleen soft-delete), **geen** SEO-velden, **geen** afbeelding. |
| Koppeling | `pc_product_category`: many-to-many `product_id` + `category_id`, unieke pair. **Geen** `is_primary`. |
| Vertaling | `pc_translation` met `entity_type = category`, veld o.a. `name` (ADR-0037/0039). Store GET lost `name` op via locale. |
| Attributen | `attribute_definition.category_id` — completeness/GPSR per categorie. Catalogus-keys in code: `robotstofzuiger`, `elektronica`, `tuin`, `mode` (+ GPSR-codes globaal). `elektronica`-catalogus is **laptop-achtig** (processor, geheugen, scherm, batterij, USB-C). |
| Admin API | `GET/POST /admin/product-cloud/categories` — list + **ensure** by name/slug + optioneel `parent_category_id` + seed attributes. **Geen** Admin Shell CRUD-UI. |
| Store API | `GET /store/product-cloud/categories` (`slug`, `locale`) — naam + parent + attributen. |
| Live DB-rijen | **Niet** in git. Welke `pc_category` in een lokale DB staan is omgevingsafhankelijk (ensure/seed). |

### Storefront (tweede taxonomie)

| Onderdeel | Feit in repo |
|---|---|
| Navigatie | `MARKETPLACE_CATEGORIES`: **30 platte slugs** (geen parent/child): tuin, elektronica, mode, wonen, sport, voeding, keuken, huishouden, beauty-verzorging, baby-kind, speelgoed, dieren, klus-gereedschap, auto-motor, kantoor, boeken-media, gezondheid, verlichting, badkamer, slaapkamer, outdoor, duurzaam, cadeaus, juwelen-horloges, tassen-accessoires, schoenen, plant-bloem, feest-seizoen, ambacht, algemeen. Zes `popular`. |
| 404 | `/categorie/[slug]` → `notFound()` tenzij slug in `MARKETPLACE_CATEGORIES`. PC-only slug zonder die lijst = 404. `heggenscharen` heeft geen marketplace-slug. |
| Listing | `resolveListingProducts({ categorySlug })` + **seed-fallback** `productsForCategory` / `LISTING_PRODUCTS` als API leeg is. |
| Catalog-API | `GET /store/catalog/products?category=` filtert op `category_names` / slugify-naam (substring), niet op `pc_category.id`. |
| i18n nav | `CATEGORY_NAV_MESSAGE_KEYS` in `messages.ts` voor dezelfde 30 slugs (NL/EN/DE/FR-labels). |
| CMS-mock | `CATEGORY_CMS_BY_SLUG` expliciet voor: tuin, elektronica, mode, wonen, sport, voeding, keuken, schoenen. Overige slugs: generieke `buildCategoryDoc` (intro “Ontdek {titel} met Europese herkomst…”). |
| Elektronica-mismatch | CMS-filters: Koptelefoons / **Laptops** / Verlichting. Buying guides / ultimate-guide / AI-signals / attribute-catalog: laptop-taal op slug `elektronica`. Seed-producten op die slug: o.a. LED-bureaulamp, draadloze oordoppen — **geen** laptops in `LISTING_PRODUCTS`. |
| Subcategorieën UI | Storefront-index is plat. `relatedCategorySlugs` in CMS zijn sibling-hints, geen `parent_category_id`. |
| Redirects | Geen slug-history, geen 301-tabel in Product Cloud. |

ADR-0038: PC-fetch + fallback naar marketplace/CMS. Dual taxonomy blijft as-built tot migratie.

---

## Context (ongewijzigde kern)

Product Cloud is de productbron (H7; ADR-0008). Storefront leest een hardcoded H14.8-achtige lijst. Navigatie/404 kan loslopen van `pc_product_category`.

---

## Beslissing

Voor de MVP is **`pc_category` de canonieke storefront-taxonomie**.

1. Storefront-navigatie, listing en `/categorie/[slug]` gebruiken **`pc_category.slug`**.
2. Subcategorieën via bestaande **`parent_category_id`**. Geen tweede boom. Het systeem publiceert **geen** nieuwe storefront-categorie zonder Admin-governance (**optie A**): Admin maakt aan en publiceert; seller mag bestaande categorie(ën) **kiezen** en een categorie **voorstellen**, maar mag de taxonomie **niet** publiceren of wijzigen; geen auto-generatie; geen import als canoniek (ADR-0043).
3. `MARKETPLACE_CATEGORIES` is **transitioneel** tot cutover; daarna geen tweede bron van waarheid.
4. ADR-0038-fallback mag tot cutover; productie daarna: canonieke PC-taxonomie. Seed-fallback op categoriepagina’s is **geen** canonieke taxonomie (launch: overlay §9).
5. **Categoriepagina (MVP):** titel (`name` + `pc_translation`), intro uit categorienaam + **actuele** listing/attributen (geen hardcoded producttype-content, o.a. geen laptop-copy op top-level Elektronica), filters uit `attribute_definition` van díe categorie, productgrid, children als die bestaan. MVP-SEO: **minimaal gegenereerd uit categorienaam**.
6. **Product → categorie:** een product **mag meerdere** `pc_product_category`-rijen hebben. Geen primary-kolom in MVP; listing toont het product bij **elke** gekoppelde slug.
7. **Redirects:** 301 voor bekende oude slugs naar de canonieke slug. Geen stille 404 bij bekende mapping. Onbekende slug: 404.
8. **Categorie ≠ Made in Europe / Verification.** Categorie mag GPSR, required attributes en completeness sturen. Verified™/MiE blijft Deel 7 + ADR-0043.
9. **Externe taxonomieën** = alleen **mapping** naar `pc_category`, nooit automatische vervanging (ADR-0043).
10. **Canonieke MVP-basis = alle 30 bestaande storefront-slugs** (tuin … algemeen). Alle 30 zijn top-level (`parent_category_id = null`) totdat later bewust subcategorieën worden ingericht. **Geen** tijdelijke live-subset van 8–12. Lege categorieën **mogen bestaan**, maar mogen **geen misleidende storefront-content** tonen (geen gefingeerde productcounts, geen producttype-copy die de lege of andersoortige catalogus weerspreekt). Subcategorieën blijven **optioneel**. Een subcategorie zonder gepubliceerde producten wordt op de storefront niet getoond.
11. **Kleding is de hoofdcategorie voor kleding.** Heren, Dames, Kinderkleding, Baby en Onderkleding / Lingerie horen daaronder (`parent_category_id`). Mode is geen tweede hoofdcategorie naast Kleding. `/categorie/mode` verwijst door naar `/categorie/kleding`. Producten die geen kleding zijn blijven aan hun bestaande categorie gekoppeld (schoenen, tassen, wonen, sport). Baby & Kind blijft een aparte hoofdcategorie en is niet hetzelfde als de kledingsubcategorie Baby.
12. **Minimale Admin Category UI hoort bij dezelfde MVP-cutover:** aanmaken, wijzigen, parent/child, actief/inactief, vertalingen, volgorde indien nodig voor storefront, redirects. **P2:** uitgebreide SEO, afbeeldingen, FAQ, guides.
13. Laptop-specifieke attrs/CMS/guides horen niet op top-level `elektronica`; later child of verwijderen van die pagina.

### Dynamische content (toekomstbestendig)

Categoriecontent moet meebewegen met de catalogus: nieuwe producttypen, specificaties, relevante attributen en gewijzigde productverdeling. Filters/intro/listing volgen **actuele** Product Cloud-data, geen vastgebeitelde productsoort. **AI** mag later wijzigingen **voorstellen**; AI mag **geen** live categoriecontent zelfstandig publiceren. **Admin-approval** is vereist voor contentwijzigingen.

---

## Inhoudsmatrix (inventaris, geen herschrijven)

| Categorie | Huidige inhoud | Probleem | Gewenst | MVP/P2 |
|---|---|---|---|---|
| elektronica | CMS-filters laptops/koptelefoons/lampen; guides “welke laptop”; PC-attrs processor/RAM | Top-level is te smal t.o.v. naam + seed (oordoppen, lamp) | Algemene intro + filters uit echte producten; laptops als child | MVP: copy/filters rechtzetten bij cutover; P2: child + SEO |
| tuin / mode / wonen / sport / voeding / keuken / schoenen | Eigen CMS-doc + related slugs | Related ≠ parent/child; counts mock | Children i.p.v. related-hints; echte counts | MVP listing; P2 CMS-rijk |
| overige 22 marketplace-slugs | Generieke intro-template | Geen subboom; seed of leeg | Zelfde dynamische template | MVP |
| robotstofzuiger (PC-cataloguskey) | Attributen in backend | Geen marketplace-slug | Mapping naar huishouden/elektronica of eigen child | P2 of Admin |
| heggenscharen | Geen storefront-slug | 404 | Child van tuin of alleen productattrs | P2 |

---

## Categoriepagina (voorstel, dynamisch)

```
Categorie
  → titel (pc_category.name / translation)
  → algemene intro (template + productcount; geen hardcoded productsoort)
  → USP’s (P2 of dunne vaste “EU-herkomst / Verified waar van toepassing”)
  → filters (attribute_definition van deze node)
  → subcategorieën (children)
  → producten (catalog, geen seed in productie)
  → FAQ (P2 CMS; MVP: 0–2 generieke platform-FAQ)
  → SEO (MVP: gegenereerd uit naam; P2: velden)
```

---

## Consequenties

Eén canonieke boom; dual taxonomy tot cutover; 30 top-level slugs; Admin-UI in dezelfde MVP-cutover; rijke CMS P2; dynamische pagina’s; AI niet live-publiceren.

## Migratie

Nog niet in deze ADR. Na acceptatie: 30 slugs als `pc_category` (parent null); storefront op PC; seed-fallback uit productiepad; 301-map; laptop-copy van top-level elektronica; minimale Admin Category UI.

## Non-goals

Ongewijzigd: verification/Verified™, commissie, affiliate, finance, Buy Box, pricing, ownership, **EU-productdata-stack** (ADR-0043), CMS-schema/ads/MFA. Geen taxonomy-migratie in deze review.

## Vastgelegde keuzes (niet langer open)

1. Canonieke taxonomie = `pc_category`.  
2. Publicatie van de boom = Admin; seller kiest/voorstelt.  
3. Meerdere categorieën per product.  
4. Subcategorieën optioneel; MVP-start alle 30 top-level.  
5. 301 bij bekende oude slugs; geen stille 404 bij mapping.  
6. MVP-SEO gegenereerd; rijke SEO/image/FAQ/guides = P2.  
7. Minimale Admin Category UI = zelfde MVP-cutover.  
8. Externe taxonomieën alleen mapping.  
9. Geen live-subset 8–12.  
10. Verification/MiE onafhankelijk van categorie.

## Referentie

- [`0037-product-cloud-central-layer-extensions.md`](./0037-product-cloud-central-layer-extensions.md)  
- [`0038-product-cloud-storefront-and-translation-provider.md`](./0038-product-cloud-storefront-and-translation-provider.md)  
- [`0043-eu-product-data-layer-authority.md`](./0043-eu-product-data-layer-authority.md)  
- `apps/web/app/_lib/marketplace-categories.ts`  
- `apps/backend/src/modules/product-cloud/models/category.ts`
