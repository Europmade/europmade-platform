# EuropMade — Marketplace Listing Template (Zoekresultaten + Categoriepagina)

**Status:** v1.0 (definitief, na architectuurcontrole en interne review).
**Basis:** Blueprint v2.1 (H6.9, H10.4, H10.5), UX-architectuur (schermen #2, #3, #4; navigatie sectie 4.1–4.3), functionele spec Product Cloud/Commerce Cloud/Buy Box, Checkout-spec, Homepage-spec, ADR 0001–0005, Design System v1.0, Component Coverage Matrix.
**Component ID-referentie:** CMP-001, 003, 005, 006, 007, 008, 011, 016, 017, 018, 020, 021, 022, 023, 033, plus drie nieuwe componenten (CMP-034 Filters, CMP-035 Pagination, CMP-036 Empty State) — zie sectie 4.

---

## 0. Architectuurcontrole (vóór ontwerp)

### 0.1 Wat de bestaande documentatie al vastlegt

- **Zoekfunctie** (H6.9, H10.4): doorzoekt productnaam, EAN, fabrikantnummer, SKU, merk, categorie, eigenschappen, synoniemen — reeds volledig belegd bij de Header (CMP-001), geen wijziging nodig.
- **Filters**: "links naast zoekresultaten/categorielijst, categorie-specifiek, dynamisch aangestuurd vanuit de Product Cloud. Actieve filters als verwijderbare chips." (H10.5, `ux-architecture.md` sectie 4.1). Responsive gedrag al vastgelegd: zijpaneel-via-knop op tablet, bottom sheet op mobiel (sectie 4.2/4.3).
- **Beide schermen delen dezelfde Marketplace Template** (`wireframe-strategie.md` sectie 3) en dezelfde afhankelijkheden (Product Card, hergebruikt uit Productpagina/Homepage).
- **Coverage Matrix** identificeerde exact drie lacunes voor deze twee schermen: Filters, Pagination, Empty State — geen andere componenten ontbreken.

### 0.2 Gevonden inconsistenties / ontbrekende onderdelen

1. **Geen enkel document legt vast of Zoekresultaten en Categoriepagina dezelfde SEO-behandeling krijgen.** Categoriepagina's hebben vaste URL's en horen geïndexeerd te worden. Zoekresultaten hebben een onbegrensde combinatie van queryparameters en horen typisch **niet** volledig geïndexeerd te worden. Dit was nergens tegenover elkaar gezet.
2. **Product Card (CMP-017) toont geen aanbiederaantal**, terwijl de Productpagina daar juist mee opent ("Vanaf € 239,00 · 3 aanbieders vergelijken"). Op een listingpagina is dit signaal minstens zo relevant.
3. **Geen vastgelegde regel over advertenties op deze twee schermen.** Blueprint H14.8 noemt expliciet "categorie-Sliders" naast Homepage-posities — nog niet toegepast of uitgesloten voor Zoekresultaten.
4. **Caching-strategie niet onderscheiden.** Categoriepagina heeft een eindige, cachebare contentruimte; Zoekresultaten heeft een onbegrensde queryruimte.

### 0.3 Noodzakelijke correcties (uitgevoerd in dit document, geen nieuwe schermen)

1. SEO-onderscheid expliciet vastgelegd (sectie 2.2, sectie 5).
2. Product Card krijgt een **aanbieder-aanduiding** — geen nieuw component, aanvulling op de bestaande CMP-017-definitie, zelfde databron als de Productpagina.
3. Advertentiepositie ("categorie-Slider") toegevoegd aan Categoriepagina, **bewust niet** aan Zoekresultaten (geen Blueprint-basis) — CMP-033 hergebruikt.
4. Twee aparte cachingstrategieën vastgelegd (sectie 2.2, sectie 5).
5. Drie nieuwe, aantoonbaar noodzakelijke componenten: **CMP-034 Filters**, **CMP-035 Pagination**, **CMP-036 Empty State** — alle drie al voorzien in de Coverage Matrix.

Geen van deze correcties raakt een reeds bevroren scherm inhoudelijk.

---

## 1. Marketplace Listing UX-specificatie

### 1.1 Doel van het scherm

Eén gedeeld doel: **een lijst producten tonen die aan een criterium voldoet (zoekopdracht of categorie), zodat de klant snel naar het juiste product — en van daaruit naar de Buy Box — kan navigeren.** Het listing-scherm converteert niet zelf; het is de trechter tussen "intentie" en "beslissing" (Productpagina).

### 1.2 User stories

- *"Als bezoeker met een specifieke zoekopdracht wil ik snel zien welke producten matchen, gefilterd en gesorteerd op wat voor mij relevant is."* (Zoeken)
- *"Als bezoeker die aan het browsen is wil ik binnen een categorie kunnen verfijnen zonder de context te verliezen."* (Categorie)
- *"Als klant wil ik op elke productkaart al zien of er meerdere aanbieders zijn, zodat ik weet dat ik straks kan vergelijken."* (gedeeld, Bevinding 0.2.2)
- *"Als bezoeker die niets relevants vindt wil ik direct een alternatief voorstel krijgen, niet een lege pagina."* (gedeeld, Empty State)

### 1.3 Componenten

| Component | Rol op dit scherm |
|---|---|
| CMP-001 Header | Zoekbalk, navigatie (ongewijzigd). |
| CMP-003 Breadcrumb | **Alleen Categoriepagina.** |
| CMP-034 Filters (nieuw) | Zijpaneel/bottom sheet, conform reeds vastgelegd navigatiegedrag. |
| CMP-006 Form Field (select-variant) | Sorteerkeuze — hergebruik, geen nieuw component. |
| CMP-017 Product Card (uitgebreid) | Kernelement van de grid, nu met aanbieder-aanduiding. |
| CMP-033 Advertisement Banner Slot | **Alleen Categoriepagina** (categorie-Slider, H14.8). |
| CMP-035 Pagination (nieuw) | Onderaan de resultatenlijst. |
| CMP-036 Empty State (nieuw) | Vervangt de grid bij nul resultaten. |
| CMP-002 Footer | Ongewijzigd. |

### 1.4 Interacties

- Filter toepassen → resultaten en URL bijgewerkt zonder volledige page reload; actieve filters als verwijderbare chips.
- Sorteren → zelfde patroon, één queryparameter.
- Product Card aanklikken → navigatie naar Productpagina.
- Pagina wisselen → resultaten verversen, scroll naar boven van de grid (niet van de hele pagina).
- Mobiel: Filters-knop opent bottom sheet, teller op de knop na toepassen ("Filters (3)").

### 1.5 Validaties

- Filtercombinaties zonder resultaat → Empty State met voorstel filters te verwijderen.
- Ongeldige/verouderde queryparameters → genegeerd, geen foutmelding.

### 1.6 Edge cases

- **Nul resultaten bij zoekopdracht** → Empty State met synoniemsuggesties/spellingcorrectie (AI, H10.4) en gerelateerde categorieën.
- **Nul resultaten bij categorie met filters** → Empty State met "filters wissen", andere copy dan bij zoeken.
- **Categorie zonder producten** → zelfde component, derde copy-variant.
- **Zeer grote resultaatset** → Pagination voorkomt oneindige DOM.
- **Product met precies één aanbieder** → "1 aanbieder" i.p.v. "Vanaf €X · N aanbieders".

### 1.7 SEO

Zie sectie 2.2 en sectie 5 — grootste verschil tussen de twee schermen.

### 1.8 Performance

- Product Card-afbeeldingen lazy (behalve eerste rij) — zelfde regel als Homepage.
- Filters mogen de eerste render van de grid niet blokkeren.
- Advertentieslot (Categoriepagina) lazy-load, beschermt Core Web Vitals.

### 1.9 Accessibility

- Filters: `<fieldset>`/`<legend>` per groep; bottom sheet vangt focus (mobiel), geeft focus terug bij sluiten.
- Pagination: `aria-current="page"`, `aria-label` op vorige/volgende.
- Empty State: `role="status"` of `<h2>`.
- Sorteerkeuze: standaard `<select>`-semantiek.

### 1.10 Medusa-standaard vs. maatwerk

| Onderdeel | Bouwaard |
|---|---|
| Productgrid, Product Card | Standaard bouwpatroon, Product Cloud/Commerce Cloud-data. |
| Filters (facet-telling) | **Maatwerk** — zoekservice-integratie. |
| Sortering | Standaard. |
| Pagination | Standaard bouwpatroon. |
| Empty State | Standaard bouwpatroon. |
| Advertentieslot | Maatwerk (ongewijzigd, CMP-033). |

---

## 2. Marketplace Listing Template — gedeeld vs. verschillend

### 2.1 Identiek

Layout-grid, Filters (CMP-034), Sorteerkeuze, Product Card (CMP-017, incl. aanbieder-aanduiding), Pagination (CMP-035), Empty State (CMP-036, component identiek — copy verschilt), Header/Footer, performance-/accessibility-regels.

### 2.2 Verschillend

| Aspect | Zoekresultaten | Categoriepagina |
|---|---|---|
| Ingangspunt boven de grid | "Zoekresultaten voor '[zoekterm]'" (dynamisch) | Categorienaam als `<h1>` + Breadcrumb |
| Breadcrumb | Afwezig | Aanwezig — "Home > [Categorie]" |
| Advertentieslot | **Afwezig** — geen Blueprint-basis | **Aanwezig** — categorie-Slider (H14.8) |
| SEO-behandeling | `noindex` bij samengestelde/lege queryresultaten; canonical naar kale zoek-URL bij actieve filters | Volledig indexeerbaar, vaste canonical URL per categorie/land |
| Caching | Niet volledig voorgecached (onbegrensde queryruimte) | Volledig ISR-cachebaar per categorie/land (~30 × 6), zelfde patroon als Homepage |
| Content bij nul resultaten | Synoniemsuggesties, spellingcorrectie | "Filters wissen" of "nog geen producten" |

---

## 3. Wireframes

Zie [`02-ux/wireframes/sprint-1a/04-marketplace-listing-desktop.html`](../../02-ux/wireframes/sprint-1a/04-marketplace-listing-desktop.html), `-tablet.html`, `-mobile.html` — elk bestand toont beide varianten binnen dezelfde gedeelde template.

---

## 4. Nieuwe componenten

### CMP-034 — Filters
| Aspect | Beschrijving |
|---|---|
| Doel | Resultaten verfijnen op categorie-specifieke kenmerken. |
| Varianten | Zijpaneel (desktop), oproepbaar zijpaneel (tablet), bottom sheet (mobiel). |
| Sub-elementen | Filtergroepen (CMP-007 Checkbox per optie), actieve-filter-chips (CMP-008-variant, verwijderbaar). |
| Toegankelijkheid | `<fieldset>`/`<legend>` per groep; bottom sheet vangt focus. |
| Bouwaard | **Maatwerk** (facet-telling vereist zoekservice-integratie). |
| Eerst toegepast in | Zoekresultaten, Categoriepagina. |

### CMP-035 — Pagination
| Aspect | Beschrijving |
|---|---|
| Doel | Navigeren door een grote resultatenset. |
| Toegankelijkheid | `aria-current="page"`, `aria-label` op navigatieknoppen. |
| Bouwaard | Standaard bouwpatroon. |
| Eerst toegepast in | Zoekresultaten, Categoriepagina. |

### CMP-036 — Empty State
| Aspect | Beschrijving |
|---|---|
| Doel | Behulpzame afhandeling wanneer een lijst geen resultaten bevat. |
| Varianten | Drie copy-varianten (zoekopdracht, categorie+filters, lege categorie) — zelfde component. |
| Toegankelijkheid | `role="status"` of `<h2>`. |
| Bouwaard | Standaard bouwpatroon. |
| Eerst toegepast in | Zoekresultaten, Categoriepagina. |

**Uitbreiding CMP-017 (Product Card):** aanbieder-aanduiding toegevoegd, zelfde databron als de Productpagina-introductietekst.

---

## 5. Controle

| Onderdeel | Bevinding |
|---|---|
| Filters | CMP-034, gedeeld, responsive gedrag al in `ux-architecture.md` vastgelegd. |
| Sortering | Hergebruik CMP-006. |
| Product Cards | CMP-017, uitgebreid met aanbieder-aanduiding. |
| Vanaf-prijsregel | Consistent met de J1-correctie uit de Customer Journey Audit. |
| Verified™ | CMP-018, geen wijziging. |
| Land van productie | CMP-022, geen wijziging. |
| Fabrikant | Bewust niet op Product Card — dichtheidsafweging, blijft bij Productpagina/Merkpagina. |
| Retailerinformatie | Bewust niet op Product Card (namen/ratings) — alleen aanbiederaantal, om de Buy Box-rol op de Productpagina niet te ondermijnen. |
| Advertenties | CMP-033, uitsluitend Categoriepagina. |
| Paginering | CMP-035, gedeeld. |
| Empty State | CMP-036, gedeeld, drie copy-varianten. |
| SEO | Expliciet onderscheiden — grootste verschil tussen de schermen. |
| Core Web Vitals | Lazy-loading-regels van de Homepage hergebruikt. |
| Lazy loading | Productafbeeldingen onder de vouw, advertentieslot. |
| Caching | Twee strategieën, expliciet onderscheiden — grootste technische verschil. |
| Responsive gedrag | Filters: zijpaneel → oproepbaar paneel → bottom sheet; grid-kolommen nemen af; Pagination blijft functioneel identiek. |

---

## Status: v1.0 (definitief)

Architectuurcontrole uitgevoerd vóór ontwerp, vijf noodzakelijke correcties doorgevoerd, wireframes gebouwd ná deze specificatie. Geen van de bevroren schermen (Productpagina, Checkout, Homepage) is inhoudelijk gewijzigd.
