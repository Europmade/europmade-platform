# ADR-0042 — Storefront taxonomy uses Product Cloud categories as canonical taxonomy

**Status:** Proposed / Ter review  
**Datum:** 2026-08-25  
**Domein:** Product Cloud, Storefront, Taxonomie  
**Raakt:** ADR-0008 (`pc_category`); ADR-0037 (`slug`); ADR-0038 (storefront-fetch + fallback); Blueprint H7 / H14.8; overlay [`docs/11-blueprint-v2/README.md`](../11-blueprint-v2/README.md)

**Uitvoering:** nog niet. Deze ADR wijzigt geen code, seed of database.

## Context

Product Cloud is de productbron van EuropMade (Blueprint H7; custom module ADR-0008). Categorieën leven in `pc_category` met een parent-child-relatie via `parent_category_id` (migratie `Migration20260730081450`) en een unieke `slug` (ADR-0037). Producten hangen via `pc_product_category`.

De storefront gebruikt daarnaast een aparte hardcoded lijst `MARKETPLACE_CATEGORIES` in `apps/web/app/_lib/marketplace-categories.ts` (circa 30 slugs, redactioneel gekoppeld aan Blueprint H14.8). Homepage, categorie-index, AI-content-hydrate en affiliate-productfilters lezen deze lijst. ADR-0038 staat toe dat de storefront Product Cloud-categorieën ophaalt via `GET /store/product-cloud/categories`, met **fallback** naar bestaande marketplace/CMS-data als de PC-categorie ontbreekt of de API faalt.

Daardoor kunnen navigatie, 404-gedrag en echte product-categorie-koppelingen uit elkaar lopen: een slug kan in de storefront bestaan zonder `pc_category`, of omgekeerd. Admin category-beheer (CRUD-UI) ontbreekt; alleen ensure/API-paden.

## Beslissing

Voor de MVP is **`pc_category` de canonieke categorieboom**.

1. Storefront-navigatie, listing en categorie-URL’s gebruiken de **overeenkomstige category slugs** van Product Cloud (`pc_category.slug`).
2. Subcategorieën lopen via **`parent_category_id`** (bestaand model); geen tweede boom in de storefront.
3. De hardcoded `MARKETPLACE_CATEGORIES`-lijst is **transitioneel** (fallback/migratiehulp), geen blijvende tweede bron van waarheid.
4. ADR-0038-fallback mag blijven tot de migratie (Fase 2) is uitgevoerd, zodat bestaande pagina’s niet breken. Na migratie is productiegedrag: canonieke PC-taxonomie; hardcoded lijst verdwijnt of wordt gereduceerd tot niet-productie-hulp.
5. SEO, category content en category images worden later gekoppeld aan de canonieke categorie (CMS/`slug`) — **niet** in deze ADR uitgewerkt en **niet** nu gebouwd.

## Consequenties

**Positief**

- Eén bron voor categorieën.
- Consistente koppeling Product Cloud → storefront.
- Subcategorieën via het bestaande parent-child-model.
- Betere beheerbaarheid zodra admin-UI volgt.

**Negatief / werk (later)**

- Storefront hardcoded categorieën moeten uiteindelijk verdwijnen.
- Bestaande slugs moeten worden gemigreerd of behouden waar de URL al publiek is (geen stille slug-break zonder redirect-besluit).
- Category admin UI ontbreekt nog.
- SEO/content/images moeten later aan de canonieke categorie worden gekoppeld.
- Tot migratie blijft dual taxonomy as-built (deze ADR is richting, geen runtime-wijziging).

## Migratie

**Nog niet uitvoeren.** Later (roadmap Fase 2), minimaal:

1. Inventariseren welke `MARKETPLACE_CATEGORIES`-slugs al een `pc_category.slug` hebben en welke ontbreken.
2. Ontbrekende canonieke rijen aanmaken (of bewust niet-live laten) — zonder productiedata te wissen.
3. Storefront listing/nav laten lezen uit PC (bestaande store-API), fallback alleen nog voor foutpaden tot cutover.
4. 404-beleid: alleen canonieke slugs, of redirects van oude slugs — **redirect-regels OPEN** tot een vervolg-ADR of implementatieticket.
5. Seed/demo-producten ontkoppelen van productie-listing (launchcriterium overlay §9; geen seed-wijziging in deze ADR).
6. Admin UI voor de boom is een vervolgtaak, geen onderdeel van het besluit zelf.

## Non-goals

Deze ADR verandert **niet**:

- product verification / Verified™
- commission
- affiliate
- finance
- Buy Box (inclusief weging en klantbelang)
- product pricing
- seller ownership
- EU-productdatabronnen
- CMS-schema, advertising, MFA

## Referentie

- [`0037-product-cloud-central-layer-extensions.md`](./0037-product-cloud-central-layer-extensions.md)
- [`0038-product-cloud-storefront-and-translation-provider.md`](./0038-product-cloud-storefront-and-translation-provider.md)
- [`docs/11-blueprint-v2/README.md`](../11-blueprint-v2/README.md) §8
