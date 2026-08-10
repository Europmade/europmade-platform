# ADR-0039 — Translation Layer MVP: EN, provider, versioning, manual override

**Status:** Geaccepteerd  
**Datum:** 2026-08-10  
**Domein:** Product Cloud / i18n  
**Vervangt deels:** [ADR-0038](./0038-product-cloud-storefront-and-translation-provider.md) t.a.v. actieve talen en storefront-leesstatus

## Context

Sprint 3B.8 leverde `pc_translation`, provider-abstractie (`none`) en resolve/enqueue op. Ontbrekende MVP-stukken: EN als actieve taal, echte DeepL-adapter, source-versioning/stale, bescherming van handmatige overrides, en storefront die alleen **gepubliceerde** vertalingen leest (geen MT op page-load).

## Beslissing

1. **Actieve MVP-talen:** `nl`, `en`, `fr`, `de` (centraal in `languages.ts` / `@europmade/types`). Alle actieve talen zijn source én target. EU-talen blijven in `PRODUCT_CLOUD_KNOWN_LANGUAGES` maar niet actief.
2. **Provider:** DeepL via `PRODUCT_CLOUD_TRANSLATION_PROVIDER=deepl` + `PRODUCT_CLOUD_TRANSLATION_API_KEY` (+ optioneel `PRODUCT_CLOUD_TRANSLATION_BASE_URL`). Zonder credentials: `none`, geen neptekst, status `Ontbreekt`/`Mislukt`.
3. **Geen MT op page-load:** storefront leest alleen opgeslagen rijen; admin/jobs enqueue.
4. **Storefront-resolve:** alleen status `Gepubliceerd` telt als vertaling; anders bron-fallback. (ADR-0038 liet Machine/Beoordeeld toe — dit ADR vernauwt dat.)
5. **Schema-uitbreiding `pc_translation`:**
   - `source_version` (number) — bronversie waarop de vertaling gebaseerd is
   - `origin` (`machine` | `manual`) — machine vs handmatig
   - `updated_by` (nullable text)
   - status-enum + `Verouderd` | `Mislukt` (naast bestaande waarden)
6. **Statusmapping (één enum, geen dubbele architectuur):**

   | Sprint-/UI-label | ADR-status (`translation_status`) |
   |------------------|-----------------------------------|
   | Ontbreekt | `Ontbreekt` |
   | In wachtrij | `Concept` |
   | Bezig | `Machine` (in-flight / unpublished MT) |
   | Beschikbaar | `Gepubliceerd` (storefront-ready) |
   | Verouderd | `Verouderd` |
   | Mislukt | `Mislukt` |

   Overige ADR-waarden: `Beoordeeld` (handmatig nagekeken, nog niet gepubliceerd).
7. **Manual override:** `origin=manual` wordt door enqueue/retranslate **nooit** overschreven tenzij `force_overwrite_manual: true` (expliciete bevestiging). Automatische MT mag later door handmatige correctie worden vervangen (`saveManualTranslation` → `origin=manual`).
8. **Source change → Verouderd:**
   - Detectie: bij wijziging van brontekst (o.a. concept upsert title/description) of via admin `POST .../translations/mark-stale` met `new_source_version`.
   - Effect: rijen met `source_version < new_source_version` → status `Verouderd`; **value blijft staan**; geen auto-retranslate.
   - `Ontbreekt` / `Mislukt` worden niet naar Verouderd gezet (blijven hun eigen status).
9. **Retranslate / enqueue-filters** (OR wanneer gecombineerd):
   - geen filter → alle niet-manual targets
   - `only_missing` → ontbrekende / `Ontbreekt`
   - `only_stale` → `Verouderd`
   - `only_failed` → `Mislukt`
   - manual blijft beschermd tenzij `force_overwrite_manual`
10. **contentType** op TranslateRequest: `product_*` vs `website_*` / marketing — product: betekenisgetrouw + technische tokens behouden; website: natuurlijker.
11. AI Content Engine blijft een **apart** proces (genereren ≠ MT); koppeling alleen via gedeelde bronmetadata waar logisch.

## UI-tekst vs productcontent

| Laag | Bron | Voorbeelden |
|------|------|-------------|
| Storefront UI | `apps/web` `messages.ts` / storefront-i18n | Add to cart, In stock, Specifications, Country |
| Product-/seller-content | Product Cloud `pc_translation` | titel, korte/lange omschrijving, specificaties/attributen, use-case, FAQ/productvelden, latere koopgids |

Geen tweede i18n-systeem voor productteksten.

## DeepL activeren (later — niet in deze sprintproductie)

1. Zet **lokaal** in `apps/backend/.env` (nooit in Git / CHANGELOG / frontend / logs):
   - `PRODUCT_CLOUD_TRANSLATION_PROVIDER=deepl`
   - `PRODUCT_CLOUD_TRANSLATION_API_KEY=<secret>`
   - optioneel `PRODUCT_CLOUD_TRANSLATION_BASE_URL` (default free: `https://api-free.deepl.com/v2/translate`; pro: `https://api.deepl.com/v2/translate`)
2. Herstart backend; enqueue/retranslate gebruiken dan DeepL.
3. Zonder key blijft provider `none`: placeholders `Ontbreekt`, foutpad `Mislukt` / `TranslationProviderNotConfiguredError` — **geen nepvertaling**.
4. Failed retry: `POST .../translations/retranslate` met `only_failed: true` (of enqueue met dezelfde filter).

## Consequenties

- EN meenemen in enqueue-targets.
- Migratie `Migration20260810140000` vereist vóór runtime.
- Bestaande Machine-rijen moeten expliciet gepubliceerd worden voor storefront.

## Referentie

- ADR-0037, ADR-0038
- Blueprint B.16
- Helpers: `translation/workflow.ts`, `languages.ts`, `translation/provider.ts`
