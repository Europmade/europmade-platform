# Category CMS — AI Category Intelligence (ontwerp)

**Status:** Ontwerp. Niet geïmplementeerd. Geen provider gekozen.  
**Datum:** 2026-11-04  
**Domein:** Category CMS, Product Cloud, Admin  
**Bouwt voort op:** [Published/Draft](./category-cms-published-draft.md), ADR-0036, ADR-0035, ADR-0043, de bestaande V2-allowlists en `buildCategoryFactPackages`.  
**Niet in deze stap:** code, migraties, tabellen, providerconfiguratie, externe AI-aanroepen, contentgeneratie, wijzigingen aan fact packages, Product Cloud, drafts, published content of de Admin-UI.

Het gevraagde bestand `docs/10-implementation/category-cms-design-and-functional-reference.md` staat niet in de repository. Dit ontwerp gebruikt daarom de documenten en code die er wel zijn. De gewenste derde kolom met AI-voorstellen is nog geen bestaand scherm.

---

## 1. Huidige architectuur

Eén categoriepagina heeft drie gescheiden lagen. Die scheiding blijft.

| Laag | Wat het is | Waar het staat |
|---|---|---|
| Feiten | Product Cloud-context per categorie | `buildCategoryFactPackages` / `loadCategoryFactSource`, alleen in het geheugen |
| Voorstellen | Nog afwezig | Mag niet in de draft worden geschreven |
| Draft / live | V2-document, pas live na expliciete publicatie | `cms_category.draft_document` en `published_document`, revisies in `cms_category_revision` |

De fact package leest categorieën, productkoppelingen, gepubliceerde versies, merken, herkomst, specificaties en relaties in bulk. Een product telt mee zoals in de winkelnavigatie: een gepubliceerde `product_version`, inclusief onderliggende categorieën. Voorraad en prijs zitten er niet in. De fingerprint is een SHA-256 over de gesorteerde feiten. Tijdstempels en CMS-tekst zitten er niet in, zodat een redactionele wijziging de fingerprint niet verschuift.

V2-profielen en verplichte blokken:

| Profiel | Verplichte blokken |
|---|---|
| `level_1` | hero, usp_bar, subcategory_tiles, product_carousel, brand_overview, why_europmade |
| `level_2` | hero, usp_bar, product_group_tiles, choice_assistant_cta, advice_compare |
| `level_3` | hero, usp_bar, filters, product_grid, product_comparison, buying_guide |

SEO (`document.seo`: title, meta description, H1) hoort bij het document, niet bij een blok. Header en footer zijn sitebreed.

De Admin-studio bewaart het volledige V2-document, toont de blokken in canonieke volgorde en scheidt Draft van Gepubliceerd. Preview gebruikt de bestaande storefront. Een derde kolom voor voorstellen bestaat nog niet. Opslaan loopt via `prepareCategoryCmsWrite`. Een USP-slot waarvan de tekst of het icoon verandert, wordt door die route als `manual_override` gemarkeerd. Een slot dat al handmatig is, mag door AI niet worden vervangen.

ADR-0036 blijft gelden: geen AI tijdens page load, providerwissel via een registry, externe modellen pas na een nieuw ADR plus EU-hosting en een verwerkersovereenkomst. De bestaande engine in `apps/web/app/_lib/ai-content` is die registry niet klaar voor deze laag:

- de categoriejob zoekt in de oude platte taxonomie, niet in `pc_category`;
- de productpool is leeg;
- opslag is een procesgeheugen, niet de CMS-database;
- `publish` staat standaard aan;
- de offline-analyzer vult ontbrekende merken en landen aan met formuleringen als "Europese makers" en "Nederland", en gebruikt vaste onderwerpen per slug die geen Product Cloud-waarden zijn;
- `shouldRegenerate` kijkt naar dat geheugen en de promptversie, niet naar de fact-package-fingerprint;
- de engine kent `manual_override` en de V2-allowlist niet.

Die engine wordt niet hergebruikt als generator. Alleen de registry-vorm (provider-id, promptversie, offline als default, stubs die weigeren) blijft het patroon.

## 2. Doelarchitectuur

```
Product Cloud
    → Category Fact Package + fingerprint
        → voorstel per toegestaan blok (nooit automatisch opgeslagen)
            → admin: accepteren, aanpassen of afwijzen
                → alleen bij accepteren: patch op de bestaande draft
                    → admin preview en aparte publicatie
                        → published_document + revision
```

Regels:

1. De fact package is de enige productfeitenbron. AI mag die interpreteren, niet terugschrijven naar Product Cloud.
2. Een voorstel is geen draft. Alleen een expliciete acceptatie kopieert inhoud naar `draft_document`.
3. Publiceren blijft de bestaande handmatige actie. Een job zet `publish` niet aan en roept het publish-endpoint niet aan.
4. Een nieuwe generatie overschrijft geen draft en geen geaccepteerde tekst. Ze maakt hoogstens een nieuw voorstel.
5. Handmatige USP-slots blijven staan, ook als de fingerprint wijzigt.
6. Ontbrekende feiten worden gemeld. Ze worden niet aangevuld met aannames.
7. Geen tweede taxonomie, geen tweede documentmodel en geen tweede publicatiesysteem.

De fingerprint bepaalt of een eerder voorstel nog bij de feiten hoort. Bij een latere controle wordt de package opnieuw berekend.

- Gelijke fingerprint: het voorstel wordt hergebruikt. Er is geen nieuwe provider-aanroep.
- Afwijkende fingerprint: het voorstel wordt `outdated`. De draft blijft zoals hij is. Een nieuw voorstel ontstaat alleen na een expliciete regeneratie.
- `accepted` en `modified` worden niet automatisch `outdated` in de draft. Alleen het voorstelrecord krijgt de status, zodat de admin het verschil kan bekijken.

## 3. Voorstelstructuur

Eén record per categorie, profiel en blok. Nog niet opslaan. Een latere tabel of JSON-kolom mag pas na aparte goedkeuring, en nooit in `draft_document` of `published_document`.

```ts
type CategoryBlockProposal = {
  id: string
  category_id: string
  slug: string
  profile: "level_1" | "level_2" | "level_3"
  block_id: string
  block_type: string
  fact_fingerprint: string
  status: "proposed" | "accepted" | "modified" | "rejected" | "outdated"
  confidence: "blocked" | "partial" | "factual"
  generation_reason: string
  used_facts: Array<{ path: string; value_id?: string }>
  missing: Array<{ code: string; count?: number }>
  content: unknown | null
  provider_id: "offline-analyzer" | "openai" | "anthropic" | "gemini" | "local"
  model: string | null
  prompt_version: string
  locale_source: "nl"
  generated_at: string
  applied_draft_revision: number | null
}
```

`content` is `null` wanneer het blok niet gegenereerd wordt. Een gedeeltelijk voorstel vult alleen velden waarvoor een feit bestaat; de overige velden blijven leeg en staan in `missing`. Een taxonomie-voorstel gebruikt alleen categorienaam, oudernaam, kindcategorieën en hun slugs.

Statussen:

| Status | Betekenis | Draft |
|---|---|---|
| `proposed` | Gegenereerd, nog niet beoordeeld | ongewijzigd |
| `accepted` | Admin heeft de inhoud overgenomen | één draft-save, `applied_draft_revision` gezet |
| `modified` | Admin heeft het voorstel of het resultaat inhoudelijk gewijzigd | draft bevat de menselijke tekst; betrokken USP-slots worden handmatig |
| `rejected` | Niet overgenomen | ongewijzigd; het record blijft zodat dezelfde tekst niet stil terugkomt |
| `outdated` | Fingerprint wijkt af | ongewijzigd tot een nieuwe, expliciete generatie |

`generationStatus` uit ADR-0036 (`pending`, `generating`, `ready`, `failed`, `stale`) beschrijft de job, niet de redactionele beslissing. Die twee statussen blijven naast elkaar bestaan.

Vertalingen zijn aparte voorstellen per locale, of een meertalig `content`-object met dezelfde `used_facts`. Een vertaling mag geen feit toevoegen dat in het Nederlandse voorstel ontbreekt. De feitelijke controle geldt per taal.

Kosten horen bij de generatie, niet bij het blokinhoud-record:

```ts
type CategoryAiCost = {
  proposal_id: string
  slug: string
  block_type: string
  locale: "nl" | "en" | "de" | "fr"
  provider_id: string
  model: string | null
  input_tokens: number | null
  output_tokens: number | null
  currency: string | null
  amount_minor: number | null
  generated_at: string
}
```

De offline-analyzer boekt een bedrag van 0. Totalen later per categorie, per blok en per provider. Dit is nog geen tabel.

## 4. Relatie fact package, voorstel en draft

De package levert `available_facts`, `missing_data`, `derived_insights`, `editorial_opportunities` en de fingerprint. Het voorstel verwijst naar paden daarin, bijvoorbeeld `available_facts.production_countries[DE]` of `available_facts.children`. `derived_insights` mag alleen worden gebruikt waar het een telling over een opgeslagen code is, zoals het aantal ISO-productielanden in de bestaande EU-lijst. Die telling is geen Made in Europe-claim.

Acceptatie bouwt een blok-patch en schrijft die via de bestaande draft-save. Die save moet voor AI-acceptatie het USP-slot niet als handmatig markeren alleen omdat de tekst van leeg naar de voorgestelde tekst ging. De huidige editorroute doet dat wel bij elke tekstwijziging. Daarom is een aparte acceptatiestap nodig die:

- het slot vult;
- `source` op `ai` zet;
- `manual_override` laat staan zoals het was;
- een slot met `manual_override: true` overslaat;
- published-velden niet aanraakt.

Een afwijzing schrijft niets. Publicatie blijft de bestaande publish-route, inclusief validatie, revisie en bevestiging.

## 5. Feiten, herkomst en lege blokken

AI mag alleen noemen wat in de package staat, met een pad in `used_facts`.

Nooit zelf invullen: productnamen, merken, prijzen, voorraad, eigenschappen, specificatiewaarden, productielanden, Europese herkomst, verificatiestatus, reviews of populariteit. Populariteit heeft in Product Cloud geen bron. `missing_data` bevat daarvoor `popularity_unavailable`. Een carousel of grid krijgt geen volgorde "populair".

Herkomst blijft vier aparte feiten:

| Feit | Bron in de package | Wat het niet is |
|---|---|---|
| Land van de merkeigenaar | `owner_company_country` | geen merkland en geen productieland |
| Productieland | `production_country`, alleen als ISO-code | vrije tekst zoals `DUITSLAND` is geen ISO-land |
| Assemblageland | `primary_assembly_country` | geen productieland |
| Geverifieerde Europese herkomst | bestaande Made in Europe-score plus, apart, goedgekeurd bewijs | een EU-land van de eigenaar of een niet-gekoppelde productielocatie telt niet |

`why_europmade` wordt niet gegenereerd zonder ISO-productieland, geverifieerde herkomst of een echte Made in Europe-score. Een score en een bewijs blijven aparte zinnen als beide bestaan. ADR-0043 blijft gelden: AI kent Verified of Made in Europe niet toe.

SEO:

- H1 blijft de categorienaam zolang de draft-H1 leeg is. Een gevulde H1 is handmatig en blijft staan.
- Title en meta description worden alleen voorgesteld als er een feit is om te noemen. Anders blijven ze leeg.
- Elke slug krijgt een eigen title en description. Geen gedeelde formule die alleen de categorienaam verwisselt en verder niets zegt.
- Interne links wijzen alleen naar kinderen, de ouder of verwante categorieën uit de package.
- Geen keywordlijsten, geen herhaling om de tekst langer te maken, geen alinea die alleen bestaat omdat een blok leeg was.

Bij te weinig feiten is `confidence` één van drie waarden.

- `blocked`: `content` is `null`. Reden in `generation_reason`, gaten in `missing`.
- `partial`: alleen de velden met een feit. De rest blijft leeg.
- `factual`: elk gevuld veld heeft een `used_facts`-pad. Dit is nog steeds een voorstel, geen publicatie.

Een blok mag uit alleen taxonomie bestaan als dat het blok is: tegels en groepsnamen. Een koopgids of herkomstblok mag dat niet.

## 6. Blokken per profiel

| Blok | Wat zonder aannames kan | Wat niet gegenereerd wordt |
|---|---|---|
| Hero | Naam, eventueel aantal gepubliceerde producten en namen van kinderen | Herkomst, populariteit, lege SEO-alinea |
| USP-balk | Hoogstens de slots waarvoor een telling of een herkomstfeit bestaat. Vier posities blijven bestaan | Lege slots opvullen. Handmatige slots vervangen |
| Subcategorietegels | Kindcategorieën en hun gepubliceerde aantallen | Verzonnen tekelteksten |
| Productcarrousel / grid | Id en titel van gepubliceerde producten | Sortering op populariteit, prijs of voorraad. Een lege lijst wordt geen verzonnen lijst |
| Merkenoverzicht | Merknaam en logo-URL als die op het merk staan | Gesponsorde merken. Logo's die ontbreken. Eigenaarsland als herkomst |
| Waarom EuropMade | Alleen ISO-productieland, verificatiestatus of Made in Europe-score | Een EU-vestiging van de merkeigenaar |
| Productgroepen | Kindcategorieën van level 2 | Inhoud zonder kinderen |
| Keuzehulp-CTA | Alleen als er vergelijkbare specificaties mét waarden zijn | Een knop zonder criterium. De interactieve assistent blijft buiten scope |
| Advies en vergelijking | Waardeverdeling van vergelijkbare specificaties | Een vergelijking zonder twee gevulde waarden |
| Filters | Namen van filterbare definities die geen complianceregel zijn | Filteropties die niet in de waardeverdeling staan |
| Productvergelijking | Minstens twee gepubliceerde producten met dezelfde gevulde specificatie | Een tabel met lege of verzonnen cellen |
| Koopgids | Alleen gevulde, vergelijkbare specificaties en hun spreiding | Een gids op basis van de categorienaam alleen |

GPSR- en compliancevelden blijven feiten, maar worden niet als winkelfilter of koopadvies herschreven.

## 7. Providers en kosten

Geen provider kiezen in deze stap. De registry blijft de uitbreidingsplek. Stubs voor OpenAI, Claude, Gemini en een lokaal model blijven weigeren tot een nieuw ADR EU-hosting en een verwerkersovereenkomst vastlegt. De offline-analyzer mag later alleen een voorstel bouwen als hij de regels uit §5 volgt. De huidige analyzer doet dat niet en wordt niet op de 511 drafts losgelaten.

Een latere vergelijking, buiten deze stap, beoordeelt dezelfde drie pilotpackages op:

- Nederlandse formulering;
- vertalingen naar Engels, Duits en Frans zonder nieuwe feiten;
- of elk zinnetje een `used_facts`-pad heeft;
- gelijke behandeling van categorieën met dezelfde package-vorm;
- kosten per categorie en per blok;
- of een ongewijzigde fingerprint de eerdere voorstellen hergebruikt.

De kostenrecords uit §3 maken die vergelijking mogelijk. Hergebruik bij een gelijke fingerprint is de belangrijkste kostenrem.

## 8. Pilot, nog niet uitvoeren

Drie level-1-categorieën, gelezen uit de bestaande packages van 2026-11-04. Er is geen content gemaakt.

| | Elektronica | Sport | Duurzaam |
|---|---|---|---|
| Gepubliceerde producten in de boom | 72 | 19 | 0 |
| Rol in de pilot | Relatief veel productfeiten | Beperkt aanbod | Lege categorie |

Catalogusbreed, niet per se binnen deze drie bomen: één merklogo op 151 merken, 35 herkomstregels waarvan 15 geen ISO-code zijn, vijf geverifieerd, specificatiewaarden op 10 gepubliceerde producten, geen productrelaties. De pilot moet de package van elke categorie zelf tonen en deze totalen niet als merken of herkomst van die categorie overnemen.

Beoordeling later, door een mens, per blok:

- staat elk gevuld veld in `used_facts`;
- is `content` leeg waar de package leeg is;
- noemt de tekst geen prijs, voorraad, populariteit, merkland of Europese herkomst zonder het bijbehorende feit;
- blijven de vier USP-posities bestaan en blijven handmatige slots gelijk;
- wijkt de tekst af van de andere twee categorieën waar de feiten afwijken, en is zij juist karig waar de feiten gelijk en dun zijn.

**Elektronica.** Zinvol als de package het draagt: hero met naam en aantal, subcategorietegels, carrousel met de echte gepubliceerde titels, merkenoverzicht met bestaande namen. USP alleen voor tellingen die de package geeft. Waarom EuropMade alleen als deze boom ISO-productielanden of een score bevat. Niet genereren: populaire volgorde, specificaties die deze boom niet vult, herkomst uit het land van de merkeigenaar.

**Sport.** Zelfde blokken, kleinere lijsten. Een dunner merken- of herkomstbeeld moet een gedeeltelijk of geblokkeerd voorstel worden, geen kortere versie van de Elektronica-tekst met andere woorden.

**Duurzaam.** Geen gepubliceerde producten. Carrousel, merken, herkomst en USP's over aanbod worden `blocked`. Hero en tegels mogen alleen de taxonomie noemen als er kinderen zijn, zonder een assortiment te suggereren. SEO-tekst blijft leeg. Dit is de controle dat lege data niet wordt weggeschreven als inhoud.

## 9. Admin-workflow

Nog geen UI. De studio houdt Draft en Gepubliceerd, de blokvolgorde links en de preview in het midden. Een latere derde kolom toont alleen de voorstellen van het geselecteerde blok.

1. Een admin-actie bouwt de fact package en vraagt voorstellen voor de toegestane blokken. Op Gepubliceerd bestaat die actie niet.
2. De kolom toont status, confidence, gebruikte feiten, ontbrekende feiten en de voorgestelde velden naast de draft.
3. Accepteren kopieert naar de draft via de acceptatiestap uit §4 en slaat op. De preview toont daarna de draft.
4. Aanpassen bewerkt het voorstel. Opslaan van die bewerking zet het voorstel op `modified` en markeert alleen de echt gewijzigde USP-slots als handmatig.
5. Afwijzen laat de draft staan en zet het voorstel op `rejected`.
6. Publiceren blijft de bestaande knop, met bevestiging, revisie en stale-base-controle.
7. Een verouderde fingerprint toont een melding. Niets wordt stil vervangen.

De visuele taal blijft die van de huidige studio: dezelfde viewport-schakelaar, dezelfde Draft/Gepubliceerd-scheiding, geen tweede editor.

## 10. Wat nog ontbreekt

- Het referentiedocument met screenshots staat niet in de repository.
- Er is geen opslag voor voorstellen of kosten. Die mag er niet bijkomen zonder aparte goedkeuring.
- De fact package is niet aan een job gekoppeld. De fingerprint wordt nergens bewaard.
- De oude AI-engine publiceert standaard, gebruikt de verkeerde taxonomie en verzint herkomst. Zij is geen bron voor deze laag.
- De bestaande draft-save zou een geaccepteerde USP als handmatig vastzetten. De acceptatiestap uit §4 bestaat nog niet.
- De studio heeft geen voorstelkolom. De storefront leest nog de platte spiegel van het V2-document. Dat is een aparte, al uitgestelde stap en geen onderdeel van AI.
- Externe providers zijn stubs. Een keuze vereist een nieuw ADR.

## 11. Vervolg, pas na goedkeuring

1. **4B.** Zuivere voorstelregels zonder provider en zonder database: van een fact package naar `blocked`, `partial` of `factual`, met `used_facts` en zonder zinnen die een feit toevoegen. Unittests op Elektronica, Sport en Duurzaam met vastgezette packages. Nog niets opslaan.
2. **4C.** Acceptatiestap die een geaccepteerd voorstel in de draft zet zonder handmatige slots te overschrijven en zonder te publiceren. Eerst op één testcategorie, niet op de 511 drafts.
3. **4D.** Opslag van voorstellen en kosten. Pas hier een migratie voorstellen.
4. **4E.** Derde kolom in de studio, daarna pas een pilotgeneratie voor de drie categorieën.
5. **4F.** Providervergelijking onder een nieuw ADR. Tot die tijd blijft de registry op de offline stub die §5 afdwingt, of op geen generator.

De 511 lege drafts blijven in stap 4A onaangeroerd.
