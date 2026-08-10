# ADR-0038 — Product Cloud storefront-koppeling + vertaalprovider-abstractie

**Status:** Geaccepteerd  
**Datum:** 2026-08-10  
**Domein:** Product Cloud / storefront / i18n

## Context

ADR-0037 leverde `pc_translation`, category-slugs en attribute-metadata op, maar bewust **zonder** storefront-koppeling en **zonder** machine-translation. De categoriepagina leest nog `MARKETPLACE_CATEGORIES` + CMS-mocks. Er is geen DeepL/OpenAI/Google Translate-integratie of bijbehorende credentials in de repo.

Sprint 3B.8 moet Product Cloud bruikbaar maken voor de storefront (eerst categorieën) en de vertaalstructuur activeren, zonder redesign van homepage/PDP/categorie-UI en zonder nep-vertaalresultaten.

## Beslissing

1. **Storefront ↔ Product Cloud (categorieën):** de storefront haalt categorieën op via `GET /store/product-cloud/categories?slug=&locale=`. Bestaande CMS/koopgids blijft de presentatielaag; Product Cloud levert id/slug/naam/attributen. Bij API-fout of ontbrekende PC-categorie: fallback naar bestaande marketplace/CMS-data (pagina mag niet breken).
2. **Centrale taalconfig:** actieve Product Cloud-talen starten met `nl`, `fr`, `de`. Bekende/uitbreidbare EU-codes staan centraal (geen `if (lang === "nl")`-takken verspreid). Storefront-locale `en` blijft UI-locale; PC-vertalingen vallen terug op bron of actieve fallback.
3. **Vertaalprovider-abstractie:** interface `TranslationProvider` + factory op env. Zonder geconfigureerde provider worden records met status `Ontbreekt` aangemaakt (of bestaande bron behouden als fallback) — **geen** gefingeerde vertaaltekst in productiecode.
4. **Statusmapping (bestaande enum ADR-0037):**
   - pending / missing → `Ontbreekt`
   - machine-translated → `Machine`
   - reviewed → `Beoordeeld`
   - published → `Gepubliceerd`
   - failed → `Ontbreekt` (lege `value`; fout in API-response / logs, bronwaarde blijft in `source_value`)
5. **Bronintegriteit:** `source_value` / `source_language_code` blijven behouden; vertalingen overschrijven nooit de bronvelden op `product_version` / category.
6. **Vertaalbare velden:** allowlist (title, description, category name, attribute `name`/`option_values` labels, document labels). **Niet** vertalen: `code`, EAN/GTIN, SKU, identifiers, relation types.
7. **Geen** AI Content Engine, nieuwe PDP, CMS-rebuild of checkout-wijzigingen in deze ADR.

## Environment (documentatie)

| Variabele | Doel |
|-----------|------|
| `PRODUCT_CLOUD_TRANSLATION_PROVIDER` | `none` (default) \| later `deepl` / `openai` wanneer geïmplementeerd |
| `PRODUCT_CLOUD_TRANSLATION_API_KEY` | Provider-API-key (alleen bij echte provider) |
| `PRODUCT_CLOUD_TRANSLATION_BASE_URL` | Optioneel override endpoint |

## Consequenties

- Storefront kan PC-categorieën tonen/verrijken zonder UI-herbouw.
- MT is plugbaar; zonder credentials blijft de keten testbaar (enqueue → `Ontbreekt` + fallback).
- EU-talen toevoegen = config uitbreiden, geen schema-herbouw.

## Referentie

- [`0037-product-cloud-central-layer-extensions.md`](./0037-product-cloud-central-layer-extensions.md)
- Blueprint B.16 (`docs/08-technical-blueprint/02-database-model.md`)
