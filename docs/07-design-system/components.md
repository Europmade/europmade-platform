# EuropMade — Design System v1.0 (structureel, grijswaarden)

**Status:** Definitief.
**Scope:** componenten die daadwerkelijk voorkomen in de bevroren Sprint 1A-schermen (**Productpagina + Buy Box**, **Checkout**, **Homepage**, **Marketplace Listing**) en alle vier de bevroren Sprint 1B-onderdelen (**Winkelwagen**, **Orderbevestiging**, **Authenticatie-flow incl. 2FA**, **Partner Onboarding**) — geen componenten die alleen als losstaand voorbeeld in `00-design-system-foundation.html` zijn getoond zonder in een echt scherm te worden gebruikt (zie sectie 0).
**Belangrijk fase-onderscheid:** dit is nog steeds de **grijswaarden/structuur-fase**. "Design System v1.0" betekent: de **structurele component-bibliotheek** is compleet en consistent — niet dat kleuren/merktypografie nu vastgesteld worden. `colors.md`, `typography.md` en `icons.md` blijven daarom bewust placeholder.

---

## 0. Scope-afbakening

De Foundation toont een aantal componenten die **niet** in de drie echte schermen worden gebruikt: Modal, Pagination, Alert/Toast, Radio-knoppen. Deze zijn **bewust uitgesloten** — nog niet tegen een echt scherm getoetst. Ze krijgen daarom ook nog geen Component ID (sectie 5); dat volgt zodra ze daadwerkelijk in een scherm worden toegepast.

---

## 1. Naamgevingsconventie — nu daadwerkelijk toegepast

**Uitzondering op de bevriezingsregel (vastgesteld voor deze stap):** componentnamen, CSS-classnamen, documentatiestandaarden en terminologie zijn **geen functionele wijzigingen** en zijn daarom, uitsluitend voor dit doel, alsnog aangepast in de reeds bevroren wireframe-bestanden (Productpagina + Buy Box, Checkout). Er is **niets visueels, structureels of functioneels gewijzigd** — uitsluitend CSS-classnamen zijn hernoemd/samengevoegd, met behoud van exact dezelfde weergave (geverifieerd per bestand na iedere wijziging).

**Principe:** één component, één naam. Responsive gedrag hoort bij het component (als variant/modifier), niet in de naam. Conventie: `component-naam` (basis), `component-naam--variant` (visuele/context-variant), `is-state` (staat).

**Wat feitelijk is samengevoegd (uitgevoerd, niet alleen gedocumenteerd):**

| Canonieke naam | Was voorheen | Toegepast in |
|---|---|---|
| `buybox` (met `--strip`/`--inline`-context, verschil zit nu alleen in CSS-scope per breakpointbestand, niet in de naam) | `buybox`, `buybox-strip`, `buybox-inline` | Productpagina (3 breakpoints) |
| `retailer-indicator` | `retailer-indicator`, `ret-cell`, `bb-retailer` | Foundation, Productpagina (3 breakpoints) |
| `offer-card` | `offer-card`, `offer-card-m` | Foundation, Productpagina mobiel |
| `notice` + `notice--info` / `notice--warning` | `info-box`, `bb-info-box`, `split-note`, `warn-row` | Foundation, Productpagina (3), Checkout (3) |
| `table` + `table--comparison` / `table--spec` | `wf-table`, `offers-table`, `spec-table` | Foundation, Productpagina (desktop/tablet) |
| `btn btn-primary` (+ `--lg`/`--bar`-groottevarianten) | `place-order-btn`, `sb-btn`, losse `btn-primary`-toepassingen zonder `.btn`-basisklasse | Checkout (3), Productpagina mobiel |
| `btn btn-secondary` (+ `--sm`/`--full`-groottevarianten) | `row-btn`, `oc-btn` | Productpagina (3) |
| `t-small` | `t-small`, `hint` (losstaande secundaire tekst) | Foundation, Checkout (3) |

**Bewust níet samengevoegd (blijft apart, zie `components.md` sectie 3.3):** de `.hint`-klasse **binnen** een Form Field (`.field .hint`, de ingebouwde hint-slot van dat component) is geen instantie van hetzelfde probleem als de losstaande `.hint`-tekst die is samengevoegd tot `t-small` — dit is een bewust behouden onderscheid, geen gemiste samenvoeging. Sticky Bottom Bar en Summary Bar blijven eveneens bewust twee namen voor twee functioneel verschillende componenten (zie sectie 3.3).

Elke samenvoeging is uitgevoerd met een **scoped CSS-override** waar nodig (bijv. `.buybox .retailer-indicator{...}` voor de iets afwijkende marge binnen de Buy Box) om de exacte oorspronkelijke pixelweergave te garanderen — geverifieerd door de bestanden vóór en na de wijziging te vergelijken op DOM-structuur (`<div>`/`<style>`-balans) per bestand.

---

## 2. Spacing (bevestigd, uit bewezen gebruik)

De 4px-schaal en het grid uit de Foundation zijn in alle zes wireframe-bestanden consistent toegepast — zie [`spacing.md`](./spacing.md) (bevestigd, niet langer placeholder).

| Breakpoint | Toegepaste breedte |
|---|---|
| Mobiel | ~390px devicebreedte |
| Tablet | ~834px devicebreedte |
| Desktop | ~1080–1160px contentbreedte |

---

## 3. Componenteninventarisatie

Elk component heeft nu een uniek **Component ID (CMP-XXX)**, verplicht te gebruiken in Design System, wireframes (als HTML-commentaar bij de CSS-definitie), UX-documentatie en functionele specificaties vanaf nu (zie sectie 5 voor het volledige register en sectie 6 voor toepassing in de overige documentatie).

### 3.1 Layout & Chrome

#### CMP-001 — Header (Publiek)
| Aspect | Beschrijving |
|---|---|
| Doel | Merkherkenning, zoeken, snelle toegang tot account/winkelwagen/land vanaf elk publiek scherm. |
| Varianten | Desktop (logo + brede zoekbalk + landkiezer + iconen + categorie-navigatierij), Tablet (zelfde opbouw, smaller), Mobiel (logo + zoek-icoon + menu-icoon). **Minimale variant (Focused Flow Template, vastgesteld bij Authenticatie-flow):** uitsluitend logo, gecentreerd, geen zoekbalk/navigatie — zelfde vereenvoudigingsprincipe als Checkout al toepaste op de footer ("geen afleidende navigatie"), hier voor het eerst op de Header zelf. |
| Interacties | Zoekbalk-focus, land-/taalkiezer, logo linkt naar Homepage. |
| Responsive gedrag | Categorie-navigatierij valt weg op mobiel; vervangen door hamburgermenu (icoon aanwezig, uitklapgedrag nog te ontwerpen bij Homepage). |
| Toegankelijkheid | Zoekbalk vereist `<label>`/`aria-label` (implementatie-eis). Landmark `<header role="banner">`. |
| Bouwaard | Standaard bouwpatroon, maatwerk inhoud (landkiezer ↔ Medusa Region). |
| Afhankelijkheden | Medusa Region, Zoekservice-integratie. |

#### CMP-002 — Footer (Publiek)
| Aspect | Beschrijving |
|---|---|
| Doel | Secundaire navigatie en vertrouwen. |
| Responsive gedrag | `flex-wrap` op mobiel/tablet. |
| Toegankelijkheid | Landmark `<footer role="contentinfo">`. |
| Bouwaard | Standaard. |

#### CMP-003 — Breadcrumb
| Aspect | Beschrijving |
|---|---|
| Doel | Locatiebesef binnen de categoriehiërarchie. |
| Varianten | Volledig pad (desktop/tablet), verkort pad (mobiel Checkout). |
| Staten | Laatste item vetgedrukt. |
| Toegankelijkheid | `<nav aria-label="Breadcrumb">` met geordende lijst (implementatie-eis). |
| Bouwaard | Standaard. |

#### CMP-004 — Stepper
| Aspect | Beschrijving |
|---|---|
| Doel | Voortgang door de Checkout-stappen tonen. |
| Staten | `is-active`, `is-done`, standaard. |
| Interacties | Toekomstige stappen niet klikbaar; afgeronde stappen via "Wijzigen"-links (CMP-030). |
| Responsive gedrag | Compactere labels/cirkels op mobiel. |
| Toegankelijkheid | `aria-current="step"` op actieve stap; staat-onderscheid niet kleur-only (vinkje vs. cijfer, al zo). |
| Bouwaard | Maatwerk. |

---

### 3.2 Atomen

#### CMP-005 — Button
| Aspect | Beschrijving |
|---|---|
| Doel | Primaire en secundaire acties. |
| Varianten | `btn-primary` (hoofdactie, incl. groottemodifiers `--lg`, `--bar`), `btn-secondary` (incl. `--sm`, `--full`), `btn-ghost`, `btn-destructive`. |
| Staten | Standaard, `is-disabled`. |
| Responsive gedrag | Volledige breedte op mobiel voor primaire CTA's. |
| Toegankelijkheid | Min. 44px taphoogte (implementatie-eis); label beschrijft altijd het gevolg. |
| Bouwaard | Standaard bouwpatroon. |

#### CMP-006 — Form Field
| Aspect | Beschrijving |
|---|---|
| Doel | Gegevensinvoer. |
| Varianten | Tekstinvoer, select. |
| Staten | Standaard, `is-error`, vooringevuld. |
| Sub-element | Ingebouwde hint-slot (`.field .hint`) — bewust los van de generieke `t-small`-tekststijl, zie sectie 1. |
| Responsive gedrag | Eén kolom op mobiel, twee-koloms mogelijk op desktop/tablet. |
| Toegankelijkheid | Zichtbaar `<label>` (al zo); `aria-describedby` voor foutmeldingen (implementatie-eis). |
| Bouwaard | Standaard + landspecifieke validatie (maatwerk). |

#### CMP-007 — Checkbox
| Aspect | Beschrijving |
|---|---|
| Doel | Bevestiging/akkoord. |
| Staten | Aan/uit, `is-error`. |
| Toegankelijkheid | Native `<input>` + `<label>`. |
| Bouwaard | Standaard. |

#### CMP-008 — Badge
| Aspect | Beschrijving |
|---|---|
| Doel | Compacte statusaanduiding. |
| Varianten | Outline, Solid, Link. |
| Toegankelijkheid | Nooit uitsluitend kleur-only als betekenisdrager — tekstlabel altijd verplicht. |
| Bouwaard | Standaard. |

#### CMP-009 — Tabs
| Aspect | Beschrijving |
|---|---|
| Doel | Content opdelen zonder paginanavigatie. |
| Staten | `is-active`. |
| Responsive gedrag | Horizontaal scrollbaar bij >3 tabs. |
| Toegankelijkheid | `role="tablist"`/`role="tab"`/`aria-selected` (implementatie-eis); scroll-affordance nog niet visueel aangeduid — **openstaand, niet blokkerend**. |
| Bouwaard | Standaard. |

#### CMP-010 — Table
| Aspect | Beschrijving |
|---|---|
| Doel | Gestructureerde vergelijking. |
| Varianten | `table--comparison` (aanbieders), `table--spec` (specificaties). |
| Responsive gedrag | **Verplicht:** `table--comparison` wordt op mobiel altijd CMP-014 (Offer Card), nooit een scrollende tabel. |
| Toegankelijkheid | `<caption>`/`scope`-attributen (implementatie-eis). |
| Bouwaard | Standaard. |

#### CMP-011 — Notice
| Aspect | Beschrijving |
|---|---|
| Doel | Contextuele inline informatie/waarschuwing, geen modal/toast. |
| Varianten | `notice--info`, `notice--warning`. |
| Interacties | Kan een link bevatten. |
| Toegankelijkheid | `notice--warning` krijgt `role="alert"` wanneer dynamisch getoond. |
| Bouwaard | Standaard. |

#### CMP-012 — Avatar
| Aspect | Beschrijving |
|---|---|
| Doel | Visuele identiteit van een retailer. |
| Varianten | Klein (16–18px), Groot (40–44px). |
| Toegankelijkheid | `alt`-tekst met retailernaam (implementatie-eis); decoratief (`aria-hidden`) wanneer de naam al als tekst ernaast staat. |
| Bouwaard | Standaard. |

---

### 3.3 Domain-composieten

#### CMP-013 — Buy Box
| Aspect | Beschrijving |
|---|---|
| Doel | Toont de automatisch geselecteerde aanbieding en de primaire koopactie — het belangrijkste component van het platform. |
| Varianten | Context-specifiek per breakpoint (sticky sidebar / full-width strook / inline kaart), zelfde naam `buybox` in alle drie. |
| Interacties | "In winkelwagen" (CMP-005), info-uitleg (CMP-011), "Alle aanbieders bekijken"-toggle. |
| Toegankelijkheid | Info-uitleg met toetsenbord bereikbaar, niet alleen hover (implementatie-eis, `title`-attribuut alleen is onvoldoende). |
| Bouwaard | **Maatwerk.** |
| Afhankelijkheden | Server-side Buy Box-berekening (ADR 0005), Offer-model. |

#### CMP-014 — Offer Card / Offer Comparison Row
| Aspect | Beschrijving |
|---|---|
| Doel | Eén aanbieding tonen binnen de "alle aanbieders"-vergelijking. |
| Varianten | Tabelrij (binnen CMP-010, desktop/tablet), kaart (mobiel, verplicht patroon). |
| Staten | `is-winner` (badge "Geselecteerd", nooit kleur-only). |
| Interacties | "Deze aanbieder tonen" (server-side gevalideerd, ADR 0005). |
| Bouwaard | **Maatwerk.** |

#### CMP-015 — Retailer Card
| Aspect | Beschrijving |
|---|---|
| Doel | Uitgebreide retailer-identiteit. |
| Status | **Voorbereid, nog niet toegepast in een echt scherm** (alleen Foundation). |
| Bouwaard | Maatwerk. |

#### CMP-016 — Retailer Indicator
| Aspect | Beschrijving |
|---|---|
| Doel | Compacte weergave van "welke retailer" binnen tabellen, kaarten en Besteloverzicht. |
| Varianten | Met beoordeling (Productpagina), zonder beoordeling (Checkout). |
| Toegankelijkheid | Avatar decoratief wanneer naam al als tekst aanwezig is. |
| Bouwaard | Maatwerk. |

#### CMP-017 — Product Card
| Aspect | Beschrijving |
|---|---|
| Doel | Eén product tonen in een grid/rij (Gerelateerde producten op de Productpagina; Homepage; later ook Zoekresultaten/Categoriepagina). |
| Varianten | Grid-item (desktop), horizontaal scrollend kaart-item (tablet/mobiel). |
| **Prijsregel (vastgesteld, Customer Journey Audit J1):** | Toont altijd de **laagste beschikbare prijs ("Vanaf €X")** over alle aanbieders van dat product, **nooit** de prijs van de automatisch geselecteerde Buy Box-aanbieding — die kan hoger liggen (spec sectie 3.1: selectie weegt meer dan alleen prijs). Consistent met de introductietekst op de Productpagina ("Vanaf €X · N aanbieders vergelijken"). |
| **Aanbieder-aanduiding (vastgesteld, Marketplace Listing Template):** | Toont naast de prijs het aantal aanbieders ("N aanbieders" / "1 aanbieder"), zelfde databron als de Productpagina-introductietekst. Eerst toegepast op Zoekresultaten/Categoriepagina; ook van toepassing op Homepage/Gerelateerde producten voor consistentie. |
| **Kortingsweergave (vastgesteld, Marketplace Listing-revisie):** | Bij een actieve korting toont de kaart de oorspronkelijke prijs doorgestreept, de nieuwe prijs, en het kortingspercentage. Vanaf 10% korting verschijnt het label "Korting", vanaf 20% "Hoge korting" (badge-variant, CMP-008) — beide drempels zijn nu canoniek vastgelegd, niet per scherm opnieuw te bepalen. |
| **Directe "In winkelwagen"-knop (vastgesteld, Marketplace Listing-revisie):** | Voegt de op dat moment automatisch geselecteerde Buy Box-aanbieding toe aan de winkelwagen, zonder eerst naar de Productpagina te hoeven — de Buy Box-berekening zelf blijft server-side (ADR 0005); de kaart toont uitsluitend het resultaat, net als de Buy Box-component dat op de Productpagina al deed. |
| **Sterrenweergave (vastgesteld, Marketplace Listing-revisie):** | Toont de sterren-iconen naast het cijfer (bijv. "★★★★☆ 4,4"), niet uitsluitend het cijfer — consistent met de Productpagina, waar dit al zo werkte. |
| **Compacte kenmerken-rij (vastgesteld, Marketplace Listing-revisie):** | Toont 1–3 korte kenmerklabels onder de titel (bijv. "800 m²", "App-bediening") — een lichtgewicht variant van de "Kenmerken"-sectie op de Productpagina, hergebruikt CMP-008 Badge in een compacte, niet-omkaderde vorm. |
| **"Past goed bij"-toepassing (vastgesteld, Productpagina-revisie):** | Compacte, horizontale variant van CMP-017 (kleinere afbeelding, alleen titel + prijs), gebruikt voor Productrelaties (Blueprint H6.8/7.8) — voor de MVP uitsluitend het relatietype "accessoire/compatibel", direct onder de Buy Box. Geen nieuw component, alleen een compactere weergavevariant. |
| **Canonieke productfoto-ratio (vastgesteld, Marketplace Listing UX-optimalisatie):** | De afbeeldingscontainer van CMP-017 gebruikt overal een **vaste 1:1 (vierkante) aspect ratio** (`aspect-ratio:1/1`), ongeacht breakpoint of contextvariant (grid-kaart, gestapelde lijstkaart, compacte "Past goed bij"-kaart). Uitsluitend de afmetingen schalen responsief mee met de beschikbare breedte — de verhouding zelf verandert nooit per breakpoint. Dit voorkomt vervorming/verkeerd uitsnijden van echte productfoto's en is vanaf nu bindend voor **elk toekomstig scherm dat CMP-017 gebruikt** (Homepage, Zoekresultaten, Categoriepagina, Productpagina "Gerelateerde producten", en alle nog te bouwen marketplace-schermen). Vóór deze vastlegging gebruikten Desktop (vaste hoogte 130px), Tablet (vaste hoogte 100px) en Mobiel (vast vierkant 70×70px) drie verschillende, onderling inconsistente benaderingen — dit is nu geconsolideerd tot één regel. |
| Responsive gedrag | Grid (desktop) → horizontale scroll-rij (tablet/mobiel). |
| Toegankelijkheid | Productafbeelding vereist `alt`-tekst (implementatie-eis). |
| Bouwaard | Standaard bouwpatroon, Product Cloud-data. |
| Afhankelijkheden | Product Cloud (titel/afbeelding), laagste-prijsberekening over alle Offers (Commerce Cloud). |

#### CMP-018 — Verified™ Badge
| Aspect | Beschrijving |
|---|---|
| Doel | Aangeven dat productinformatie gecontroleerd is en aan de kwaliteitscriteria voldoet. |
| **Plaatsingsregel (bevestigd, F12):** | Uitsluitend Product Cloud-context — **nooit** in een Offer-/Buy Box-/Retailer-context. |
| Toegankelijkheid | Tekstlabel altijd naast het icoon. |
| Bouwaard | Maatwerk. |
| Afhankelijkheden | Product Quality Score-drempel (ADR 0002), producentgoedkeuring. |

#### CMP-019 — Product Quality Score (intern)
| Aspect | Beschrijving |
|---|---|
| Doel | Interne voortgangsindicator, **nooit klantzichtbaar**. |
| Status | **Voorbereid, nog niet toegepast** (alleen Foundation). |
| Bouwaard | Maatwerk. |

#### CMP-020 — Shipping Badge
| Aspect | Beschrijving |
|---|---|
| Doel | Verzendkosten per aanbieding tonen. |
| Bouwaard | Maatwerk (data) op CMP-008 (weergave). |

#### CMP-021 — Delivery Estimate
| Aspect | Beschrijving |
|---|---|
| Doel | Levertijd per aanbieding tonen, vaste gestructureerde categorieën (nooit vrije tekst). |
| Bouwaard | Maatwerk (data) op CMP-008 (weergave). |

#### CMP-022 — Country of Production Badge
| Aspect | Beschrijving |
|---|---|
| Doel | Productieland tonen. |
| Plaatsingsregel | Uitsluitend Product Cloud-context. |
| Bouwaard | Maatwerk. |

#### CMP-023 — Manufacturer Badge
| Aspect | Beschrijving |
|---|---|
| Doel | Producent/merkhouder tonen, klikbaar naar Merkpagina. |
| Interacties | Klikbaar (`badge--link`-variant van CMP-008), toegevoegd na Productpagina-review (F22). |
| Bouwaard | Maatwerk. |

#### CMP-024 — Product Owner Badge
| Aspect | Beschrijving |
|---|---|
| Doel | Toont wie de productinformatie beheert. |
| Plaatsingsregel | **Uitsluitend intern** (Partnerdashboard/Admin), nooit klantzichtbaar. |
| Status | **Voorbereid, nog niet toegepast in een echt scherm** (alleen Foundation). |
| Bouwaard | Maatwerk. |

#### CMP-025 — Besteloverzicht / Order Summary
| Aspect | Beschrijving |
|---|---|
| Doel | Volledige, per-aanbieder-uitgesplitste bestelweergave — het "Buy Box-equivalent" van Checkout. |
| Sub-componenten | CMP-011 (`notice--info`, splitsings-toelichting), Retailer Group (CMP-016 + productregels + CMP-020 + CMP-021 + retour-badge), Totals (subtotaal/verzendkosten/totaal). |
| Varianten | Sticky sidebar (desktop), full-width blok (tablet), inklapbare balk (mobiel stap 1/2) vs. volledig uitgeklapt (mobiel stap 3). |
| Toegankelijkheid | `aria-live="polite"` bij dynamische bijwerking (implementatie-eis). |
| Bouwaard | **Maatwerk.** |
| Afhankelijkheden | Offer-model, server-side ordersplitsing (ADR 0005). |
| **Varianten:** | Drie formeel vastgelegde varianten (read-only/Checkout, `is-editable`/Winkelwagen, `is-confirmed`/Orderbevestiging) — zie sectie 3A voor de volledige documentatie per variant. |

#### CMP-026 — Choice Card
| Aspect | Beschrijving |
|---|---|
| Doel | Eén (of, in de meervoudige variant, meerdere) van meerdere gelijkwaardige opties selecteren via een volledige kaart. |
| Staten | Standaard, `is-selected`. |
| Gebruikt in | Gast/account-keuze (Checkout stap 0, enkelvoudig); rol-selectie (Partner Onboarding "Partner kiezen", **meervoudig** — meerdere kaarten tegelijk `is-selected`, geen wijziging aan het component zelf, uitsluitend het selectiegedrag). |
| Toegankelijkheid | Volledige kaart klikbaar/focusbaar, duidelijke focus-indicator (implementatie-eis); meervoudige variant gebruikt `role="group"` met `aria-pressed` per kaart in plaats van `role="radiogroup"`. |
| Bouwaard | Standaard bouwpatroon. |

#### CMP-027 — Saved Address Selector
| Aspect | Beschrijving |
|---|---|
| Doel | Eerder opgeslagen adres kiezen. |
| Bouwaard | Standaard (Medusa Customer Address). |

#### CMP-028 — Sticky Bottom Bar
| Aspect | Beschrijving |
|---|---|
| Doel | Altijd zichtbare mobiele samenvatting + primaire CTA tijdens scrollen (Productpagina). |
| Onderscheid van CMP-029 | Bevat een eigen CTA, altijd zichtbaar — functioneel verschillend van Summary Bar, bewust niet samengevoegd. |
| Bouwaard | Maatwerk. |

#### CMP-029 — Summary Bar
| Aspect | Beschrijving |
|---|---|
| Doel | Inklapbare mobiele samenvatting zonder eigen CTA (Checkout stap 1/2). |
| Onderscheid van CMP-028 | Geen eigen CTA — de CTA hoort bij de actieve stap eronder. |
| Bouwaard | Maatwerk. |

#### CMP-030 — Review Block
| Aspect | Beschrijving |
|---|---|
| Doel | Eén onderdeel van de eindcontrole tonen (Checkout stap 3) met "Wijzigen"-link. |
| Afhankelijkheden | CMP-004 (Stepper) voor de "Wijzigen"-navigatie. |
| Bouwaard | Standaard bouwpatroon. |
| **Varianten:** | Twee formeel vastgelegde varianten (met "Wijzigen"-link/Checkout, zonder/Orderbevestiging) — zie sectie 3A voor de volledige documentatie per variant. |

#### CMP-031 — Gallery
| Aspect | Beschrijving |
|---|---|
| Doel | Productafbeeldingen tonen. |
| Responsive gedrag | Hoofdafbeelding + duimnagels (desktop/tablet) → swipeable met dots-indicator (mobiel). |
| Bouwaard | Standaard bouwpatroon. |
| Afhankelijkheden | Productafbeeldingen (Product Cloud). |

#### CMP-032 — Category Tile
| Aspect | Beschrijving |
|---|---|
| Doel | Eén categorie tonen als klikbare tegel in een grid of scroll-rij (Homepage, later ook Zoekresultaten/Categoriepagina-navigatie). |
| Varianten | Grid-item (desktop/tablet), horizontaal scrollend kaart-item (mobiel) — zelfde responsive patroon als CMP-017. Ook toegepast als link-tegel (kleinere variant) in de "Made in Europe"-sectie. |
| Interacties | Klik/tap navigeert naar de categoriepagina (of, in de link-tegel-variant, naar een contentpagina). |
| Toegankelijkheid | Icoon/afbeelding decoratief (`aria-hidden`) wanneer het label al als tekst aanwezig is; hele tegel klikbaar/focusbaar. |
| Bouwaard | Standaard bouwpatroon, data uit Product Cloud (categoriestructuur). |
| Afhankelijkheden | Categoriestructuur, categorieafbeeldingen. |
| Eerst toegepast in | Homepage (sectie 4: Categorieën-grid; sectie 9: link-tegels). |

#### CMP-033 — Advertisement Banner Slot
| Aspect | Beschrijving |
|---|---|
| Doel | Eén verkoopbare advertentiepositie tonen (Blueprint H14.8: Hero Banner, Homepage Sliders, categorie-Sliders). |
| Varianten | Positiegebonden formaat (twee posities op de Homepage, verschillende hoogte/prominentie); content is partnerdata, geen platformcontent. |
| Staten | Gevuld (actieve advertentie), leeg/onverkocht (verplichte neutrale fallback-boodschap — nooit een kale placeholder). |
| Interacties | Klik navigeert naar de partner-/productpagina van de adverteerder. |
| Responsive gedrag | Bewust kleiner, vast formaat op mobiel (CRO-eis: mag nooit een onevenredig deel van het eerste scherm innemen). |
| Toegankelijkheid | Verplichte `alt`-tekst; verplicht zichtbaar "Advertentie"-label (nooit uitsluitend via kleur/kleine tekst — zelfde regel als CMP-008). |
| Bouwaard | **Maatwerk** — geen Medusa-equivalent, kern van het bannerplatform. |
| Afhankelijkheden | Advertentie-inventorybeheer (Admin, scherm #60), boekingssysteem (buiten deze UX-scope). Advertentielinks krijgen `rel="sponsored"` (implementatie-eis). |
| Eerst toegepast in | Homepage (sectie 6 en 8: twee advertentieposities). |
| Neutraliteitsprincipe | Beïnvloedt nooit welke producten/retailers als "uitgelicht" worden getoond (CMP-017, CMP-015 blijven algoritmisch/redactioneel bepaald) — zelfde scheiding als de Buy Box (functionele spec, sectie 3.0). |

#### CMP-034 — Filters
| Aspect | Beschrijving |
|---|---|
| Doel | Resultaten verfijnen op categorie-specifieke kenmerken (Zoekresultaten, Categoriepagina). |
| Varianten | Zijpaneel (desktop, permanent zichtbaar), oproepbaar zijpaneel via knop (tablet), bottom sheet (mobiel) — conform `02-ux/ux-architecture.md` sectie 4.1–4.3. |
| Sub-elementen | Filtergroepen (CMP-007 Checkbox per optie), actieve-filter-chips (CMP-008-variant, verwijderbaar). |
| Interacties | Toepassen, individuele filter verwijderen via chip, "alles wissen". |
| Toegankelijkheid | `<fieldset>`/`<legend>` per groep; bottom sheet (mobiel) vangt focus tijdens openstaan en geeft focus terug aan de "Filters"-knop bij sluiten. |
| Bouwaard | **Maatwerk** (facet-telling vereist zoekservice-integratie, `01-architecture/standard-vs-custom.md`). |
| Afhankelijkheden | Zoekservice, Product Cloud (categorie-specifieke kenmerken). |

#### CMP-035 — Pagination
| Aspect | Beschrijving |
|---|---|
| Doel | Navigeren door een grote resultatenset zonder oneindige pagina. |
| Varianten | Nummerieke pagination (desktop/tablet/mobiel). |
| Toegankelijkheid | `aria-current="page"` op de actieve pagina, `aria-label` op vorige/volgende-knoppen. |
| Bouwaard | Standaard bouwpatroon. |
| Afhankelijkheden | Geen. |

#### CMP-036 — Empty State
| Aspect | Beschrijving |
|---|---|
| Doel | Nette, behulpzame afhandeling wanneer een lijst geen resultaten bevat. |
| Varianten | Drie copy-varianten (zoekopdracht zonder resultaat, categorie+filters zonder resultaat, lege categorie) — zelfde component, andere inhoud. |
| Interacties | Contextuele actie (filters wissen, synoniemsuggestie aanklikken, naar gerelateerde categorie). |
| Toegankelijkheid | `role="status"` of `<h2>`, zodat de statuswijziging opgemerkt wordt door schermlezers. |
| Bouwaard | Standaard bouwpatroon. |
| Afhankelijkheden | Geen. |

#### CMP-037 — Variant Selector
| Aspect | Beschrijving |
|---|---|
| Doel | Een productvariant kiezen (kleur, maat, inhoud, vermogen, werkgebied e.d. — Blueprint H6.7/7.5) zonder de pagina te verlaten. |
| Varianten | Kleurstaal (rond, gevulde kleur), tekstoptie (bijv. maat/werkgebied als los blokje). |
| Staten | Standaard, `is-selected`, `is-disabled` (variant-combinatie niet leverbaar/geen EAN). |
| Interacties | Selectie wijzigt welke EAN/Variant actief is — triggert een nieuwe Buy Box-berekening (zelfde serverzijdige aanroep als een aanbiederwissel, ADR 0005, geen uitzondering). |
| Toegankelijkheid | Elke optie een eigen `<button>`/`role="radio"` binnen een `radiogroup`; `is-disabled`-opties blijven zichtbaar maar niet activeerbaar (voorkomt verwarring over welke combinaties bestaan). |
| Bouwaard | Standaard bouwpatroon, data uit Product Cloud (variant-structuur). |
| Afhankelijkheden | Product Cloud (variant/EAN-hiërarchie), server-side Buy Box-herberekening bij wisseling. |
| Eerst toegepast in | Productpagina. |

#### CMP-038 — Expandable Text / Show More
| Aspect | Beschrijving |
|---|---|
| Doel | Lange content (omschrijving, specificaties, aanbiederslijst) eerst compact tonen, met een expliciete actie om volledig uit te klappen — voorkomt een overweldigend lange pagina zonder content te verbergen achter een verplichte klik voor de kern van de informatie. |
| Varianten | Tekstvariant (`clamp-10`: toont circa 10 regels, "Meer tonen"-knop klapt volledig uit), tabelvariant (toont de eerste 3 rijen, "Bekijk alle aanbieders (N)"-knop toont de rest — zelfde onderliggende patroon, toegepast op de Offer Comparison Row/CMP-014 in plaats van op tekst). |
| Staten | Ingeklapt (standaard), uitgeklapt (na klik — blijft uitgeklapt voor de rest van het bezoek, geen opnieuw inklappen nodig). |
| Toegankelijkheid | `aria-expanded` op de knop, content blijft in de DOM aanwezig (alleen visueel afgekapt via `max-height`/`overflow`), zodat schermlezers en zoekmachines de volledige tekst wel kunnen lezen ook vóór het uitklappen — belangrijk verschil met een `display:none`-aanpak, en bewust zo gekozen om de SEO/AI Search-waarde van de Product Content-sectie (`product-content/spec.md`) niet te ondermijnen. |
| Bouwaard | Standaard bouwpatroon (CSS `max-height` + toggle-interactie, geen zware library nodig). |
| Afhankelijkheden | Geen. |
| Eerst toegepast in | Productpagina (Omschrijving-tab, Specificaties-tab, aanbiederstabel bij >3 aanbieders); Checkout en Orderbevestiging (BTW-regel in de Totalen-box, uitklapbaar naar een subregel per tarief bij meerdere BTW-tarieven binnen één bestelling — eerste toepassing op een bedragenregel in plaats van tekst/tabel). |
| Waarom één component i.p.v. twee | Tekst-inklappen en tabel-rij-inklappen zijn hetzelfde interactiepatroon (toon een deel, klik om alles te zien) — één gedeeld component voorkomt twee losse, licht-verschillende implementaties van dezelfde interactie. |

#### CMP-039 — Quantity Stepper
| Aspect | Beschrijving |
|---|---|
| Doel | Het aantal van een winkelwagenregel verhogen/verlagen binnen de grenzen van de beschikbare voorraad. |
| Varianten | Standaard (min/plus-knoppen + numerieke weergave). |
| Staten | Standaard, `is-max` (plus-knop uitgeschakeld bij de voorraadgrens), `is-min` (min-knop uitgeschakeld bij aantal 1). |
| Interacties | Klik op min/plus wijzigt het aantal met 1; elke wijziging triggert een serverzijdig gevalideerde herberekening van regel- en totaalprijs. |
| Toegankelijkheid | `<button>`-elementen voor min/plus, numerieke weergave met `aria-live="polite"`, `aria-label` per knop ("Aantal verlagen"/"Aantal verhogen"). |
| Bouwaard | Standaard bouwpatroon; serverzijdige voorraadcontrole (Commerce Cloud) is de enige maatwerk-datakoppeling. |
| Afhankelijkheden | Commerce Cloud (actuele voorraad van de betreffende Offer). |
| Eerst toegepast in | Winkelwagen. |

#### CMP-040 — Code Input (OTP)
| Aspect | Beschrijving |
|---|---|
| Doel | Een numerieke, meestal 6-cijferige, eenmalige verificatiecode laten invoeren (TOTP-authenticator-app of herstelcode-context). |
| Varianten | Standaard (6 losse invakken). |
| Interacties | Automatisch doorspringen naar het volgende vak bij invoer; automatisch terugspringen bij backspace op een leeg vak; plak-ondersteuning — een volledige code plakken vult automatisch alle vakken. |
| Toegankelijkheid | Elk vak een eigen `<input inputmode="numeric" maxlength="1">`, gezamenlijk omvat door een `<fieldset>` met `<legend>` ("Verificatiecode"); duidelijke focus-indicator per vak. |
| Bouwaard | Standaard bouwpatroon — de code wordt pas bij versturen server-side gevalideerd (ADR 0005-principe), geen maatwerk-datakoppeling in de component zelf. |
| Afhankelijkheden | Geen. |
| Eerst toegepast in | Authenticatie-flow (2FA-setup-bevestiging, 2FA-login-stap). |

#### CMP-041 — File Upload
| Aspect | Beschrijving |
|---|---|
| Doel | Eén of meerdere documenten laten uploaden (identiteitsbewijs, KvK-uittreksel, productiebewijs, autorisatiebewijs, certificeringen). |
| Varianten | **Desktop/Tablet:** dropzone (slepen-en-neerzetten) + bestandskiezer. **Mobiel (bijgewerkt na de architectuurreview):** bestandskiezer + **camera direct openen om een foto te maken en die als upload te gebruiken** — geen drag-and-drop op mobiel (zwak patroon op touchscreens, nu vervangen door het op mobiel gangbaardere cameragebruik). |
| Staten | Leeg (dropzone/keuze zichtbaar), geüpload (bestandsnaam of fotominiatuur + verwijder-actie), foutstaat (ongeldig formaat/te groot, met duidelijke reden). |
| Interacties | **Desktop/Tablet:** klikken opent de bestandskiezer; slepen-en-neerzetten ondersteund. **Mobiel:** twee gelijkwaardige acties — "Foto maken" (opent direct de camera, gebruiker maakt de foto, die meteen als upload geldt) en "Bestand kiezen" (bestaande bestanden/galerij). Op alle varianten: verwijderen en opnieuw uploaden mogelijk vóór het indienen. |
| Toegankelijkheid | Standaard `<input type="file">` als fundament (altijd toetsenbord-/schermlezer-bruikbaar); op mobiel het `capture`-attribuut voor directe cameratoegang, met de bestandskiezer als gelijkwaardig, altijd zichtbaar alternatief (nooit uitsluitend camera-only, voor toestellen/situaties waar dat niet werkt); duidelijke labeling per documenttype; statuswijzigingen aangekondigd via `aria-live`. |
| Bouwaard | Standaard bouwpatroon voor de UI zelf (inclusief het `capture`-attribuut — standaard HTML, geen maatwerk); bestandsopslag via standaard infrastructuur. |
| Afhankelijkheden | Geen. |
| Eerst toegepast in | Partner Onboarding (Upload documenten-stap). |

**CMP-025 (Besteloverzicht/Order Summary) — varianten:** zie sectie 3A voor het volledige, formele variantenregister (read-only/Checkout, `is-editable`/Winkelwagen, `is-confirmed`/Orderbevestiging).

---

## 3A. Componentvarianten-register

Formele vastlegging van elke benoemde variant die op een bestaand component is toegepast — geen nieuwe componenten, uitsluitend gedocumenteerde toepassingen van een al bevroren basiscomponent. Dit register wordt aangevuld zodra een volgend scherm een nieuwe variant introduceert.

### CMP-025 (Besteloverzicht / Order Summary) — drie varianten

#### Variant: Read-only (basis, Checkout)
| Aspect | Beschrijving |
|---|---|
| Doel | Vóór orderplaatsing tonen wat de klant gaat afrekenen, per aanbieder uitgesplitst. |
| Gebruik | Checkout, stap 1–3 (bevroren, Sprint 1A). |
| Eigenschappen | Sticky sidebar (desktop), full-width blok (tablet), inklapbare balk (mobiel stap 1/2) → volledig uitgeklapt (mobiel stap 3); "Wijzigen"-links per Review Block (CMP-030) navigeren terug naar de betreffende stap. |
| Beperkingen | Geen aantal-bewerking, geen regel-verwijdering — puur ter controle. |
| Toepassingsgebied | Uitsluitend Checkout. |

#### Variant: `is-editable` (Winkelwagen)
| Aspect | Beschrijving |
|---|---|
| Doel | De klant in staat stellen zijn bestelling vóór het afrekenen aan te passen, met dezelfde herkenbare per-aanbieder-structuur als Checkout. |
| Gebruik | Winkelwagen (bevroren, Sprint 1B). |
| Eigenschappen | Voegt toe t.o.v. de basisvariant: productafbeelding per regel, CMP-039 (Quantity Stepper), een verwijder-actie per regel. Onderliggende structuur (Retailer Group, Split Notice, Totals) ongewijzigd. |
| Beperkingen | Geen variant-wijziging (kleur/maat) vanuit deze variant — bewuste MVP-scopebeperking (`winkelwagen/spec.md`, sectie 1.4). Elke wijziging vereist serverzijdige validatie (ADR 0005), nooit een client-side prijsaanname. |
| Toepassingsgebied | Uitsluitend Winkelwagen. |

#### Variant: `is-confirmed` (Orderbevestiging)
| Aspect | Beschrijving |
|---|---|
| Doel | Ná orderplaatsing een definitieve, niet meer bewerkbare weergave tonen van wat daadwerkelijk besteld en betaald is. |
| Gebruik | Orderbevestiging (v1.3, definitief bevroren). |
| Eigenschappen | Toont een ordernummer per Retailer Group, geen "Wijzigen"-links, een plek voor de (aanvankelijk lege) track & trace-aankondiging. Databron is een **snapshot**, vastgelegd op het orderrecord bij plaatsing — geen live Commerce Cloud-verwijzing (`orderbevestiging/spec.md`, sectie 1.3–1.4). |
| Beperkingen | Volledig read-only, geen enkele interactie behalve lezen/doorklikken naar CTA's buiten het component. |
| Toepassingsgebied | Uitsluitend Orderbevestiging. |

**Gemeenschappelijke basis, alle drie varianten:** Retailer Group (CMP-016 + productregels + CMP-020 + CMP-021), Split Notice (CMP-011), Totals — deze kern is nooit gewijzigd, uitsluitend uitgebreid of ingekort per variant.

---

### CMP-030 (Review Block) — twee varianten

#### Variant: Met "Wijzigen"-link (basis, Checkout)
| Aspect | Beschrijving |
|---|---|
| Doel | Eén onderdeel van de eindcontrole tonen (adres, betaalmethode) vóór orderplaatsing, met een directe weg terug om het aan te passen. |
| Gebruik | Checkout, stap 3 (bevroren, Sprint 1A). |
| Eigenschappen | "Wijzigen"-link navigeert via CMP-004 (Stepper) terug naar de betreffende eerdere stap. |
| Beperkingen | Vereist een actieve Stepper-context — niet bruikbaar op een scherm zonder stappen-navigatie. |
| Toepassingsgebied | Uitsluitend Checkout. |

#### Variant: Zonder "Wijzigen"-link (Orderbevestiging)
| Aspect | Beschrijving |
|---|---|
| Doel | Dezelfde adres-/betaalmethode-informatie tonen, nu als bevestigd, niet meer te wijzigen gegeven. |
| Gebruik | Orderbevestiging (v1.3, definitief bevroren). |
| Eigenschappen | Identieke blokstructuur als de basisvariant, uitsluitend de "Wijzigen"-link ontbreekt. |
| Beperkingen | Geen afhankelijkheid meer met CMP-004 (Stepper) — bewust losgekoppeld, want na orderplaatsing bestaat er geen "vorige stap" meer om naar terug te gaan. |
| Toepassingsgebied | Uitsluitend Orderbevestiging. |

---

## 4. Consistentiecontrole (herbevestigd na toepassing)

### 4.1 Samenvoegingen — nu daadwerkelijk doorgevoerd

Zie sectie 1 voor de volledige tabel. Alle acht gevonden naamgevingsinconsistenties uit de vorige controleronde zijn nu **daadwerkelijk samengevoegd in de bevroren bestanden** (niet langer alleen canoniek gedocumenteerd) — mogelijk gemaakt door de expliciete uitzondering op de bevriezingsregel voor naamgeving/terminologie.

### 4.2 Component ID-dekking

Alle 31 componenten in sectie 3 hebben een uniek CMP-ID. Geen dubbele ID's, geen gaten in de reeks CMP-001–CMP-031. Componenten die nog niet in een echt scherm zijn toegepast (CMP-015, CMP-019, CMP-024) hebben wél al een ID gekregen, zodat toekomstige documentatie er nu al naar kan verwijzen — hun status blijft "voorbereid" totdat een scherm ze gebruikt.

### 4.3 Aansluiting op de wireframes (herverifieerd)

Na de naamgevingsronde is opnieuw een volledige class-extractie uitgevoerd op alle zeven wireframe-bestanden: geen enkele niet-canonieke naam resteert (geverifieerd met een uitputtende zoekopdracht naar alle voorheen gevonden oude namen — nul treffers, met uitzondering van het bewust behouden `.field .hint`-sub-element, zie sectie 1). Elk `<div>`/`<style>`-blok blijft in balans in elk bestand — geen structuur beschadigd door de hernoeming.

---

## 5. Component ID-register

| ID | Component | Bouwaard | Status |
|---|---|---|---|
| CMP-001 | Header (Publiek) | Standaard | Bevestigd |
| CMP-002 | Footer (Publiek) | Standaard | Bevestigd |
| CMP-003 | Breadcrumb | Standaard | Bevestigd |
| CMP-004 | Stepper | Maatwerk | Bevestigd |
| CMP-005 | Button | Standaard | Bevestigd |
| CMP-006 | Form Field | Standaard + maatwerk | Bevestigd |
| CMP-007 | Checkbox | Standaard | Bevestigd |
| CMP-008 | Badge | Standaard | Bevestigd |
| CMP-009 | Tabs | Standaard | Bevestigd |
| CMP-010 | Table | Standaard | Bevestigd |
| CMP-011 | Notice | Standaard | Bevestigd |
| CMP-012 | Avatar | Standaard | Bevestigd |
| CMP-013 | Buy Box | Maatwerk | Bevestigd |
| CMP-014 | Offer Card / Offer Comparison Row | Maatwerk | Bevestigd |
| CMP-015 | Retailer Card | Maatwerk | Bevestigd (Homepage, sectie "Uitgelichte Europese merken/retailers") |
| CMP-016 | Retailer Indicator | Maatwerk | Bevestigd |
| CMP-017 | Product Card | Standaard + Product Cloud-data | Bevestigd |
| CMP-018 | Verified™ Badge | Maatwerk | Bevestigd |
| CMP-019 | Product Quality Score | Maatwerk | Voorbereid |
| CMP-020 | Shipping Badge | Maatwerk | Bevestigd |
| CMP-021 | Delivery Estimate | Maatwerk | Bevestigd |
| CMP-022 | Country of Production Badge | Maatwerk | Bevestigd |
| CMP-023 | Manufacturer Badge | Maatwerk | Bevestigd |
| CMP-024 | Product Owner Badge | Maatwerk | Voorbereid |
| CMP-025 | Besteloverzicht / Order Summary | Maatwerk | Bevestigd |
| CMP-026 | Choice Card | Standaard | Bevestigd |
| CMP-027 | Saved Address Selector | Standaard | Bevestigd |
| CMP-028 | Sticky Bottom Bar | Maatwerk | Bevestigd |
| CMP-029 | Summary Bar | Maatwerk | Bevestigd |
| CMP-030 | Review Block | Standaard | Bevestigd |
| CMP-031 | Gallery | Standaard | Bevestigd |
| CMP-032 | Category Tile | Standaard + Product Cloud-data | Bevestigd (Homepage) |
| CMP-033 | Advertisement Banner Slot | Maatwerk | Bevestigd (Homepage, Categoriepagina) |
| CMP-034 | Filters | Maatwerk | Bevestigd (Zoekresultaten, Categoriepagina) |
| CMP-035 | Pagination | Standaard | Bevestigd (Zoekresultaten, Categoriepagina) |
| CMP-036 | Empty State | Standaard | Bevestigd (Zoekresultaten, Categoriepagina) |
| CMP-037 | Variant Selector | Standaard + Product Cloud-data | Bevestigd (Productpagina) |
| CMP-038 | Expandable Text / Show More | Standaard | Bevestigd (Productpagina: omschrijving, specificaties, aanbiederstabel) |
| CMP-039 | Quantity Stepper | Standaard + Commerce Cloud-koppeling | Bevestigd (Winkelwagen) |
| CMP-040 | Code Input (OTP) | Standaard | Bevestigd (Authenticatie-flow — 2FA) |
| CMP-041 | File Upload | Standaard | Bevestigd (Partner Onboarding) |

---

## 6. Toepassing van Component ID's in overige documentatie

Vanaf nu bindend:

- **Wireframes** (`02-ux/wireframes/`): elke component-CSS-definitie draagt een `/* CMP-XXX */`-commentaarregel direct erboven (toegepast in alle zeven bestanden, zie de bijgewerkte `<style>`-blokken).
- **UX-documentatie** (`02-ux/ux-architecture.md`, `wireframe-strategie.md`): component-inventory-tabellen verwijzen naar CMP-ID's naast de componentnaam.
- **Functionele specificaties** (`03-functional-specs/`): elke vermelding van Buy Box, Offer Card, Besteloverzicht e.d. kan vanaf nu de CMP-ID erbij vermelden voor eenduidige verwijzing.
- Een nieuw component krijgt pas een CMP-ID **nadat** het in minimaal één wireframe is toegepast (of, zoals hier, expliciet als "voorbereid" gemarkeerd) — dezelfde vastleggingsregel als voorheen, nu uitgebreid met een uniek nummer.

---

## Status: Design System v1.0 (definitief — 41 componenten, Sprint 1B afgesloten)

**41 componenten, definitief voor Sprint 1B.** Groei deze sprint: CMP-039 (Quantity Stepper, Winkelwagen), CMP-040 (Code Input/OTP, Authenticatie-flow/2FA), CMP-041 (File Upload, Partner Onboarding — later uitgebreid met een mobiele cameravariant na de architectuurreview). Alle vier Sprint 1B-onderdelen (Winkelwagen, Orderbevestiging, Authenticatie-flow incl. 2FA, Partner Onboarding) zijn **definitief bevroren**. Geen wijziging aan enig bevroren Sprint 1A-scherm.

**Volgende stap:** Sprint 1C — zie `06-development/project-status-and-roadmap.md` voor de volledige eindrapportage en openstaande onderwerpen.
