# Sign-off — Productpagina + Buy Box v1.0

**Status:** Definitief, na verwerking van de UX Design Review.
**Bronbestanden:** `01-productpagina-buybox-desktop.html`, `-tablet.html`, `-mobile.html`, en de bijgewerkte `00-design-system-foundation.html`.

---

## 1. Verwerking van de review-bevindingen

### Expliciet opgedragen (verwerkt)

| # | Bevinding | Verwerking |
|---|---|---|
| F5 | Wishlist-knop niet in MVP-scope | Verwijderd uit alle drie de breakpoints. Formeel vastgelegd als Post-MVP-item in `wireframe-strategie.md` (Post-MVP-tabel, nieuwe rij). |
| F10 | "Beste aanbieding" impliceert redactioneel oordeel | Label vervangen door "Automatisch geselecteerde aanbieding" op alle drie de breakpoints en in de Design System Foundation. |
| F11 | "Buy Box"-jargon zichtbaar voor klant | Badge-tekst "Buy Box" vervangen door "Geselecteerd" (tabel) / "Deze aanbieder tonen" (actieknop). Term "Buy Box" komt nergens meer voor in klantgerichte UI-tekst; blijft uitsluitend interne/documentatieterm. |
| F12 | Verified™ gepresenteerd als aanbieder-eigenschap | Verified™-badge verwijderd uit de Buy Box en uit de Offer Card-voorbeeldcompositie in de Design System Foundation. Staat nu uitsluitend bij de producttitel (Product Cloud-context), op alle drie de breakpoints. Expliciete `<div class="legend">`-toelichting toegevoegd in de Foundation ter voorkoming van herhaling van deze fout in toekomstige schermen. |
| F13 | Retourvoorwaarden ontbreken in aanbiedervergelijking | Kolom "Retour" toegevoegd aan de Offer Comparison Row (Foundation) en aan de aanbiederstabel/Offer Cards op alle drie de breakpoints van de Productpagina. Ook toegevoegd aan de Buy Box zelf (badge "30 dagen retour"). |
| F14 | Geen mobiel wireframe, Mobile First niet gevolgd | Tablet- en mobiel-versie toegevoegd, inclusief expliciet ontworpen sticky bottom bar-patroon voor mobiel (niet simpelweg "gestapeld"). Beleidswijziging vastgelegd in `wireframe-strategie.md`: alle kernschermen vanaf nu in Desktop/Tablet/Mobiel. |
| F20 | Product- en verkopersreviews samengevoegd | Tabs opgesplitst in "Productreviews" en "Verkopersreviews", elk met eigen telling en duidelijk gescheiden inhoud, op alle drie de breakpoints. Als neveneffect ook F1 (rating-verwarring) grotendeels verholpen: de rating boven de titel is nu expliciet gelabeld "productreviews", de rating in de Buy Box hoort zichtbaar bij de retailer-context. |
| F24 | Buy Box-berekening mag niet client-side | [ADR 0005](../../../04-decisions/0005-buy-box-server-side-only.md) vastgelegd. Interactienotities op alle drie de breakpoints herschreven: "client-side" vervangen door expliciete server-side-validatie-taal, inclusief het onderscheid tussen "geen page reload" (UX) en "geen client-side scoreberekening" (architectuur-eis). URL-parameter voor gekozen aanbieder toegevoegd als vereiste (raakt ook F25). |

### Niet expliciet opgedragen, meegenomen als goedkope nevenverbetering

| # | Bevinding | Verwerking |
|---|---|---|
| F1 | Product- vs. verkopersrating niet te onderscheiden | Grotendeels opgelost als gevolg van F20 (zie hierboven); rating boven de titel expliciet gelabeld. |
| F6 | "Kiezen" vs. "In winkelwagen" onduidelijk | Rij-actie hernoemd naar "Deze aanbieder tonen" (desktop/tablet) / "Deze aanbieder tonen" (mobiele Offer Card) — beschrijft het daadwerkelijke gevolg. |
| F9 | Verified™/badges niet interactief | Manufacturer-badge is nu gemarkeerd als link (`dm-badge-link`, "Producent: Merknaam BV ›") in lijn met F22. |
| F21 | Geen "meld onjuistheid"-actie | Link "Onjuistheid in deze productinformatie melden" toegevoegd bij het Specificaties-tabblad (desktop). |
| F22 | Merknaam niet gelinkt naar Merkpagina | Zie F9 — zelfde wijziging. |
| F23 | Geen uitleg waarom aanbieder geselecteerd is | ⓘ-informatie-element toegevoegd aan de Buy Box op alle breakpoints, met korte, factoren-gebaseerde uitleg zonder exacte gewichten (conform ADR 0001). |

### Bewust nog niet verwerkt (blijft open, geen blokkade voor v1.0)

Deze bevindingen zijn kwalitatieve verbeteringen zonder functionele/architecturale inconsistentie en zijn niet expliciet opgedragen. Ze blijven als bekende openstaande punten geregistreerd, mee te nemen bij de volgende iteratie (Buy Box als apart interactiescherm, of de Design System-kleurfase):

- **F2** — prijs pas zichtbaar in de Buy Box, niet eerder op de pagina.
- **F3** — marketplace-karakter (meerdere aanbieders) nog niet prominent genoeg bij eerste oogopslag.
- **F4** — trust-badges en logistiek-badges nog visueel identiek (vormonderscheid volgt in de kleurfase).
- **F7** — geen aantalselectie (quantity) bij "In winkelwagen".
- **F8** — trust-rij nog steeds de kleinste tekst op de pagina.
- **F15–F17** — WCAG-specifieke eisen (kleur-onafhankelijke winnaar-indicatie, tekstalternatief voor sterren, semantische structuur) — vastgelegd als eis, niet als wireframe-wijziging; hoort bij de daadwerkelijke implementatie-fase, niet bij low-fidelity wireframes.
- **F18** — gedeelde `wireframe-kit.css` i.p.v. gedupliceerde CSS per bestand — procesverbetering voor volgende wireframes, geen inhoudelijke wijziging aan dít scherm.
- **F19** — 2px-nadrukrand nog niet formeel als patroon gedocumenteerd in de Foundation.

Deze lijst is bewust expliciet gemaakt zodat niets stilzwijgend verdwijnt — ze zijn niet "opgelost", maar ook niet vergeten.

---

## 2. Eindconsistentiecontrole

### Tegen de Blueprint

- H8.5 (Buy Box-transparantie, geen verborgen voorkeur): **consistent** — het neutrale label en het info-element verwijzen naar factoren, niet naar een EuropMade-oordeel.
- H10.6 (productpagina-structuur: aanbieders vergelijken, specificaties, downloads, reviews, gerelateerde producten): **consistent** — volgorde gehandhaafd, "aanbieders vergelijken" nu nog explicieter (retour toegevoegd).
- H10.10 (productreview/verkopersreview strikt gescheiden): **consistent na F20-verwerking**.
- H10.11 (Mobile First): **consistent na F14-verwerking** — mobiel is nu een volwaardig, expliciet ontworpen breakpoint, niet een afgeleide.
- H11.2 (klant kan onjuistheden melden): **consistent na F21-verwerking**.
- H5.12 (EuropMade verkoopt zelf niets, geen commerciële voorkeur): **consistent na F10/F11-verwerking** — dit was de grootste afwijking en is nu rechtgezet.

### Tegen de UX-architectuur (`02-ux/ux-architecture.md`)

- Scherm #5 (Productpagina) en de Buy Box-annotatie in sectie 5.5 ("Hoogste risico, hoogste prioriteit"): **consistent**, dit scherm heeft de meeste iteratie gekregen conform die prioritering.
- UX-review-voorstel uit de UX-architectuur zelf (aanbieders zichtbaar zonder verstopte klik): **consistent** — aanbiederstabel/kaarten staan direct onder de Buy Box op alle breakpoints, geen verborgen klik nodig.

### Tegen Product Cloud (functionele spec, sectie 1)

- Eigenaarschapsscheiding (sectie 1.7): **consistent** — Verified™, Country of Production en Manufacturer Badge staan uitsluitend in de Product Cloud-context (producttitel-sectie), nooit in de Commerce Cloud-context (Buy Box/Offer).
- Product Owner Badge blijft terecht afwezig op de klant-Productpagina (hoort in Partnerdashboard/Admin, niet klantzichtbaar) — ongewijzigd correct.

### Tegen Commerce Cloud (functionele spec, sectie 2)

- Alle acht Commerce Cloud-dimensies (aanbiedingen, prijzen, voorraad, levertijden, verzendkosten, landen, valuta, retourvoorwaarden) zijn nu **volledig vertegenwoordigd** in de Offer Comparison Row/Offer Cards — vóór deze iteratie ontbrak retourvoorwaarden (F13), nu opgelost.
- Levertijd blijft gestructureerd (geen vrije tekst) — ongewijzigd correct.

### Tegen de Buy Box-principes (functionele spec, sectie 3.0, en ADR's)

- "De Buy Box dient altijd het belang van de klant" (sectie 3.0): **consistent na F10/F11/F12-verwerking**.
- ADR 0001 (configureerbare weging, geen vaste percentages): **consistent** — het nieuwe info-element noemt factoren, geen percentages.
- ADR 0002 (configureerbare Verified™-drempel): **consistent**, ongewijzigd — de Product Quality Score-referentie in de Foundation noemt expliciet "drempel configureerbaar, ADR 0002".
- ADR 0003 (Sponsored Products buiten MVP): **consistent**, niet aangeraakt in dit scherm.
- ADR 0004 (tiebreaker-volgorde): **consistent**, blijft server-side/onzichtbaar voor de klant — geen wijziging nodig.
- ADR 0005 (server-side-only, nieuw): **consistent**, dit scherm is het eerste dat er expliciet naar verwijst en er interactienotities op afstemt.

### Tegen de Wireframe Strategy

- Sprint 1A-volgorde (Design System Foundation → Productpagina → Buy Box → Checkout → Homepage → Zoekresultaten → Categoriepagina): **consistent**, dit scherm is exact op de juiste plek in die volgorde afgerond.
- Component Inventory (twaalf domeinspecifieke componenten): **consistent**, alle twaalf zijn gebruikt en de twee die verkeerd waren toegepast (Verified™ in Offer Card/Buy Box) zijn gecorrigeerd.
- Paginatemplates (Marketplace Template): **consistent** — desktop/tablet/mobiel volgen dezelfde template-logica met per-breakpoint aanpassingen, geen nieuwe, losstaande layoutstructuur geïntroduceerd.
- F14-beleidswijziging (alle kernschermen in 3 breakpoints): **nu zelf de eerste toepassing van die nieuwe regel**.

---

## 3. Resultaat

Geen resterende inconsistenties tegen Blueprint, UX-architectuur, Product Cloud, Commerce Cloud, ADR's of Wireframe Strategy. De niet-verwerkte bevindingen (sectie 1, laatste tabel) zijn kwaliteitsverbeteringen zonder inconsistentie-risico en blokkeren v1.0 niet.

**De Productpagina + Buy Box wordt hierbij als v1.0 (definitief) beschouwd**, in drie breakpoints (Desktop/Tablet/Mobiel).

**Volgende stap:** de Buy Box als afzonderlijk, dieper uitgewerkt interactiescherm (stap 3 van de herziene Sprint 1A-volgorde) — met name de "alle aanbieders"-interactie, de regiowisseling, en de server-side-validatieflow uit ADR 0005 in meer detail.
