# EuropMade — Customer Journey Audit (MVP-klantreis)

**Status:** Definitief. Architectuurvalidatie van Sprint 1A.
**Methode:** uitsluitend gebaseerd op reeds afgeronde, bevroren documentatie — geen nieuwe schermen of aannames toegevoegd. Waar documentatie voor een stap nog niet bestaat (Zoeken, Categorie, Orderbevestiging zijn nog niet ontworpen), wordt dat expliciet benoemd als zodanig, niet ingevuld.
**Bronnen:** `03-functional-specs/homepage/spec.md`, `03-functional-specs/product-cloud-commerce-cloud-buy-box/spec.md`, `03-functional-specs/checkout/spec.md`, `02-ux/ux-architecture.md`, `02-ux/wireframes/wireframe-strategie.md`, `07-design-system/components.md`, `07-design-system/coverage-matrix.md`, Blueprint v2.1.

---

## 0. Reikwijdte van de klantreis

```
Homepage → Zoeken → Categorie → Productpagina → Checkout → Orderbevestiging
   v1.0    n.n.o.     n.n.o.       v1.0            v1.0        n.n.o.
```
*(n.n.o. = nog niet ontworpen — Sprint 1A vervolg resp. Sprint 1B)*

Drie van de zes stappen zijn bevroren wireframes (Homepage, Productpagina, Checkout), twee zijn Sprint 1A-vervolgstappen die alleen op strategieniveau bestaan (Zoeken, Categorie — wireframe-strategie.md, coverage-matrix.md), en één (Orderbevestiging) is Sprint 1B en heeft uitsluitend een naam en één doelregel in de scherminventarisatie. Deze audit toetst de **logische samenhang** van de hele keten met wat er nu daadwerkelijk is vastgelegd — niet de kwaliteit van schermen die nog niet bestaan.

---

## 1. Stap-voor-stap audit

### Stap 1 — Homepage

| # | Beschrijving |
|---|---|
| Doel | Binnen 5 seconden duidelijk maken wat EuropMade is; bezoeker naar zoeken/categorie/product leiden. |
| Verwachte gebruikersactie | Zoekopdracht intypen, categorietegel aanklikken, of een uitgelicht product aanklikken. |
| Conversiedoel | Doorstroom naar Zoeken/Categorie/Productpagina — Homepage zelf converteert niet, het is de trechteringang. |
| Commerciële doelstelling | Conversie (secties 1/4/5) + advertentie-inkomsten (secties 6/8) + merkopbouw (secties 2/7/9) — expliciet gescheiden per sectie (homepage-spec, sectie 7). |
| UX-doel | 5-secondenregel, premium Europese uitstraling, prominente zoekbalk. |
| SEO-doel | Eén `<h1>`, interne linkstructuur naar alle 30 categorieën, tekstuele content in sectie 9. |
| Afhankelijkheden | Medusa Region (taal/land), Product Cloud (categoriestructuur, uitgelichte producten), Commerce Cloud (prijsweergave). |
| Design System-componenten | CMP-001, 002, 005, 006, 008, 011, 015, 017, 018, 022, 032, 033. |
| Blueprint-consistentie | H14.5, H14.8–14.9, H13.3 — consistent (homepage-spec, sectie 6). |

### Stap 2 — Zoeken

| # | Beschrijving |
|---|---|
| Doel | Relevante producten tonen op basis van een zoekopdracht (ux-architecture.md, scherm #2). |
| Verwachte gebruikersactie | Resultaten scannen, filteren, een product aanklikken. |
| Conversiedoel | Doorstroom naar Productpagina; bij nul resultaten, alternatief bieden (Empty State). |
| Commerciële doelstelling | Conversie — **niet nader uitgewerkt** dan de algemene MVP-scope-vermelding (Must Have, H15.7). |
| UX-doel | Snel, relevant, scanbaar; filters toepasbaar zonder de resultaten te verliezen. |
| SEO-doel | **Niet gedocumenteerd** — zoekresultatenpagina's worden doorgaans `noindex` gehouden (dynamische, dunne content) of juist geoptimaliseerd voor long-tail zoekopdrachten; geen van beide is vastgelegd. |
| Afhankelijkheden | Zoekservice-integratie (`01-architecture/standard-vs-custom.md`), Commerce Cloud (prijs/voorraad per resultaat). |
| Design System-componenten | CMP-001, 017 (bevestigd), plus **Filters, Pagination, Empty State — geïdentificeerde lacunes** (coverage-matrix.md), nog niet bevestigd. |
| Blueprint-consistentie | H10.4 (zoekfunctie) — consistent op scope-niveau; geen detailtoetsing mogelijk zolang het scherm niet ontworpen is. |
| **Status van deze rij** | **Nog niet ontworpen.** Dit is geen tekortkoming van Sprint 1A — het is de eerstvolgende stap na deze audit. |

### Stap 3 — Categorie

| # | Beschrijving |
|---|---|
| Doel | Navigeren binnen een productcategorie (ux-architecture.md, scherm #3/#4). |
| Verwachte gebruikersactie | Filteren/sorteren, een product aanklikken, of doorklikken naar een subcategorie. |
| Conversiedoel | Doorstroom naar Productpagina. |
| Commerciële doelstelling | Conversie — zelfde scope-niveau als Zoeken, niet verder uitgewerkt. |
| UX-doel | Consistent met Zoeken (zelfde Marketplace Template, wireframe-strategie.md sectie 3). |
| SEO-doel | Categoriepagina's zijn juist wél **belangrijke SEO-doelpagina's** (vaste URL's, keyword-rijke content mogelijk) — dit onderscheid met Zoeken (grotendeels `noindex`-kandidaat) staat nergens expliciet vastgelegd. |
| Afhankelijkheden | Product Cloud (categoriestructuur), Commerce Cloud. |
| Design System-componenten | CMP-001, 017, plus dezelfde lacunes als Zoeken (Filters, Pagination). |
| Blueprint-consistentie | H10.5 (categorienavigatie) — consistent op scope-niveau. |
| **Status van deze rij** | **Nog niet ontworpen.** |

### Stap 4 — Productpagina

| # | Beschrijving |
|---|---|
| Doel | Informeren, aanbieders vergelijken, aankoopbeslissing ondersteunen — het meest kritieke scherm van het platform. |
| Verwachte gebruikersactie | Aanbieder vergelijken/kiezen, "In winkelwagen" klikken. |
| Conversiedoel | Toevoegen aan winkelwagen — hoogste-risico conversiemoment (Buy Box-keuze). |
| Commerciële doelstelling | Directe commissie-trigger (Blueprint H5.6) zodra een order volgt. |
| UX-doel | Scannability, Buy Box-duidelijkheid, vertrouwen (uitgebreid getoetst in de UX-review, F1–F25). |
| SEO-doel | **Niet expliciet gedocumenteerd** (zie Bevinding J4 hieronder) — de Homepage kreeg een uitgebreide SEO-schaalbaarheidsparagraaf (structured data, hreflang), de Productpagina niet, terwijl productpagina's doorgaans de grootste bron van long-tail organisch verkeer zijn voor een marketplace. |
| Afhankelijkheden | Server-side Buy Box-berekening (ADR 0005), Offer-model (Commerce Cloud), Product Cloud. |
| Design System-componenten | CMP-001–003, 005, 008–014, 016–018, 020–023, 028, 031 (volledige lijst: components.md). |
| Blueprint-consistentie | H8.5, H10.6, H10.10, H5.12 — consistent, uitgebreid getoetst (signoff-01-productpagina-buybox-v1.0.md). |

### Stap 5 — Checkout

| # | Beschrijving |
|---|---|
| Doel | Eén betaalde bestelling plaatsen, ongeacht het aantal aanbieders. |
| Verwachte gebruikersactie | Adres/betaalmethode invoeren of bevestigen, bestelling plaatsen. |
| Conversiedoel | Voltooide, betaalde order. |
| Commerciële doelstelling | **Directe commissie-realisatie** — het moment waarop de conversie van de hele keten wordt verzilverd. |
| UX-doel | Minimale frictie, transparante ordersplitsing, gast-/accountkeuze zonder drempel. |
| SEO-doel | **Niet gedocumenteerd** (zie Bevinding J5) — checkout-pagina's horen standaard `noindex` te zijn; dit staat nergens vastgelegd. |
| Afhankelijkheden | ADR 0005 (server-side ordersplitsing), Medusa Payment/Region, Offer-model. |
| Design System-componenten | CMP-001, 003–008, 011, 012, 016, 020, 021, 025–027, 029, 030. |
| Blueprint-consistentie | H10.7, H10.9 — consistent (checkout-spec.md, sectie 10). |

### Stap 6 — Orderbevestiging

| # | Beschrijving |
|---|---|
| Doel | "Zekerheid geven dat bestelling geplaatst is" (ux-architecture.md, scherm #8 — **de enige bestaande documentatieregel voor dit scherm**). |
| Verwachte gebruikersactie | Bevestiging lezen, evt. doorklikken naar orderdetail/account aanmaken (gast). |
| Conversiedoel | Geen — dit is het conversiemoment zélf, al voltooid bij binnenkomst op dit scherm. |
| Commerciële doelstelling | **Niet gedocumenteerd** — geen vermelding van bijv. cross-sell, nieuwsbrief-bevestiging, of andere post-conversie-commerciële elementen. |
| UX-doel | **Niet gedocumenteerd** buiten de ene doelregel. |
| SEO-doel | N.v.t. (transactionele, niet-indexeerbare pagina — net als Checkout, hoort `noindex` te zijn). |
| Afhankelijkheden | Server-side ordersplitsing-resultaat (ADR 0005) — **zie Bevinding J2**, dit is de kritieke ontbrekende schakel. |
| Design System-componenten | **Niet bepaald** — logischerwijs een Review Block-achtige component (CMP-030) per deelbestelling, maar dit is een aanname, geen vastgelegd feit. |
| Blueprint-consistentie | H10.7 (bevestiging als vijfde, aparte stap) — structureel consistent met de scheiding tussen Checkout-stap 3 ("controle") en Orderbevestiging ("bevestiging") die in checkout-spec.md is aangehouden. |
| **Status van deze rij** | **Nog niet ontworpen (Sprint 1B).** Dit is het minst gedocumenteerde scherm van de hele klantreis — zie Bevinding J2 voor de reden waarom dit toch nu al aandacht verdient. |

---

## 2. Overgangen tussen stappen (transitiecontrole)

| Overgang | Gedocumenteerd? | Bevinding |
|---|---|---|
| Homepage → Zoeken | Ja (zoekbalk, CMP-001) | Consistent, geen actie nodig. |
| Homepage → Categorie | Ja (CMP-032 Category Tile) | Consistent, geen actie nodig. |
| Zoeken/Categorie → Productpagina | Gedeeltelijk (Product Card CMP-017 als koppelpunt) | **Bevinding J1** — prijsweergave-inconsistentie gevonden, zie hieronder. |
| Productpagina → Winkelwagen | Expliciet benoemd als bestaand tussenscherm, Sprint 1B, niet gespecificeerd | Bewust uitgesteld, geen gebrek — checkout-spec.md sectie 1 benoemt dit al correct als buiten scope. |
| Winkelwagen → Checkout | Checkout-spec.md sectie 1 begint expliciet "waar Winkelwagen eindigt" | Consistent aangeduid, inhoud van Winkelwagen zelf terecht nog niet ingevuld. |
| Checkout → Orderbevestiging | Checkout-spec.md sectie 6: "duidelijke overgang", geen inhoudelijke eisen aan de bestemming | **Bevinding J2** — de belangrijkste bevinding van deze audit, zie hieronder. |

---

## 3. Bevindingen ("ontbrekende schakels")

### J1 — Prijsweergave op Homepage komt niet overeen met de Productpagina (aantoonbare inconsistentie, direct gecorrigeerd)

**Bevinding:** de Homepage toont "Robotmaaier X200" met prijs **€ 249,00** (secties 5 van `homepage-spec.md`, in alle drie de wireframe-bestanden). De Productpagina toont voor exact hetzelfde product **"Vanaf € 239,00 · 3 aanbieders"** als introductieprijs (de laagste beschikbare aanbieding, Retailer Z), met € 249,00 uitsluitend als de *automatisch geselecteerde* aanbieding (Retailer X) in de Buy Box. Een bezoeker die via de Homepage klikt op een prijs van € 249,00 en op de Productpagina eerst "Vanaf € 239,00" ziet, ervaart een schijnbare prijsdaling die niet overeenkomt met de uiteindelijke Buy Box-prijs — een bekend vertrouwens-/CRO-risico (prijzen die lijken te "kloppen niet").

**Oorzaak:** nergens was vastgelegd welke prijs een Product Card (CMP-017) hoort te tonen — de winnende Buy Box-prijs, of de laagste beschikbare prijs.

**Correctie (uitgevoerd, zie sectie 4):** Product Card toont voortaan altijd de **laagste beschikbare prijs ("Vanaf €X")**, consistent met de introductietekst op de Productpagina. Dit is vastgelegd als canonieke regel in `components.md` (CMP-017) en toegepast in de drie Homepage-wireframes.

### J2 — Orderbevestiging is ernstig onderbelicht ten opzichte van de belofte die Checkout doet (belangrijkste bevinding)

**Bevinding:** Checkout communiceert op meerdere plekken expliciet en prominent dat een bestelling met meerdere aanbieders wordt **opgesplitst in N deelbestellingen**, elk met een eigen bevestiging en track&trace-code (checkout-spec.md, sectie 2 en sectie 0: "Je ontvangt per deelbestelling een aparte bevestiging"). Orderbevestiging — het scherm waar deze belofte wordt ingelost — heeft in de volledige documentatie precies **één zin**: "Zekerheid geven dat bestelling geplaatst is" (ux-architecture.md, scherm #8). Er is nergens vastgelegd dat dit scherm de N deelbestellingen daadwerkelijk afzonderlijk moet tonen.

**Risico als dit niet wordt vastgelegd vóórdat Sprint 1B start:** een Orderbevestiging-scherm dat pas ontworpen wordt met alleen "zekerheid geven dat de bestelling geplaatst is" als leidraad, kan gemakkelijk uitkomen op één generieke bevestiging — wat de zojuist in Checkout opgebouwde transparantie over de ordersplitsing direct zou tegenspreken zodra de klant het resultaat ziet.

**Correctie (uitgevoerd, zie sectie 4):** een minimumvereisten-paragraaf toegevoegd aan `checkout/spec.md` (niet aan ux-architecture.md, om de scherminventarisatie niet vooruit te laten lopen op een ontwerp) die vastlegt wat Orderbevestiging **minimaal** moet bevatten wanneer dit scherm in Sprint 1B wordt ontworpen. Dit is een **vereisten-vastlegging, geen schermontwerp** — er is geen wireframe, geen component-toewijzing, geen visuele beslissing genomen.

### J3 — Winkelwagen blijft terecht ongespecificeerd (geen actie nodig)

Ter bevestiging, geen bevinding die actie vereist: Checkout-spec.md benoemt Winkelwagen consequent en correct als "Sprint 1B, niet in deze scope" en bouwt daar niet op vooruit. Dit is precies hoe een nog-niet-ontworpen afhankelijkheid gedocumenteerd hoort te worden.

### J4 — Productpagina mist een SEO-paragraaf die de Homepage wél heeft (aantekening, geen correctie nu)

**Bevinding:** de Homepage kreeg op verzoek een uitgebreide lange-termijn SEO-paragraaf (structured data, hreflang, Core Web Vitals). De Productpagina — voor een marketplace doorgaans de grootste bron van organisch long-tail-verkeer — heeft geen vergelijkbare paragraaf.

**Afweging:** dit is **geen aantoonbare inconsistentie** (de Productpagina-documentatie sprak zich simpelweg nog niet uit over SEO-schaalbaarheid, wat iets anders is dan een tegenstrijdigheid), dus conform de opdracht ("voeg alleen verbeterpunten toe wanneer aantoonbaar noodzakelijk") wordt dit **niet nu gecorrigeerd**. Het wordt hier expliciet genoteerd zodat het niet vergeten wordt bij een volgende iteratie van de Productpagina-documentatie of bij de eerste echte SEO-implementatiefase.

### J5 — Checkout en Orderbevestiging missen een expliciete `noindex`-eis (kleine, aantoonbaar noodzakelijke correctie)

**Bevinding:** transactionele pagina's met persoons-/bestelgegevens in de URL of content horen standaard niet geïndexeerd te worden door zoekmachines (voorkomt blootstelling van bestelinhoud via gedeelde/gebookmarkte links, en voorkomt dunne/duplicate content in de zoekindex). Dit is een vaste technische SEO-basisregel, nergens tegengesproken maar ook nergens vastgelegd voor Checkout.

**Correctie (uitgevoerd, zie sectie 4):** één regel toegevoegd aan `checkout/spec.md`.

---

## 4. Doorgevoerde correcties (aantoonbaar noodzakelijk, minimaal van omvang)

1. **Homepage-wireframes (3 breakpoints) en `components.md` (CMP-017):** Product Card toont voortaan de laagste beschikbare prijs, met "Vanaf"-prefix, consistent met de Productpagina. Robotmaaier X200 aangepast van € 249,00 naar **Vanaf € 239,00**, overige producttegels kregen ter consistentie eveneens de "Vanaf"-prefix (geen prijswijziging nodig, want er was nog geen tegenstrijdigheid bij die producten — uitsluitend de labeling is toegevoegd).
2. **`checkout/spec.md`:** nieuwe paragraaf "Minimumvereisten voor Orderbevestiging (Sprint 1B)" toegevoegd — legt vast dat het scherm alle N deelbestellingen afzonderlijk moet tonen, geen ontwerp.
3. **`checkout/spec.md`:** technische SEO-regel toegevoegd (`noindex` voor Checkout en Orderbevestiging).

Geen van deze correcties introduceert een nieuw scherm, een nieuw component, of een visuele herontwerp — uitsluitend prijslabeling (bestaand component, canonieke regel scherper) en documentatie-aanvullingen die een aantoonbare inconsistentie (J1) resp. een aantoonbaar risico op een toekomstige inconsistentie (J2, J5) wegnemen.

---

## 5. Eindoordeel

De MVP-klantreis Homepage → Zoeken → Categorie → Productpagina → Checkout → Orderbevestiging is, voor de reeds ontworpen schakels (Homepage, Productpagina, Checkout), **logisch en onderling consistent**, op één gevonden en direct gecorrigeerde prijsweergave-inconsistentie na (J1). De twee nog niet ontworpen tussenstappen (Zoeken, Categorie) zijn correct en consistent voorbereid (Wireframe Strategy, Coverage Matrix) zonder vooruit te lopen op ontwerpbeslissingen. De laatste stap (Orderbevestiging) was onvoldoende voorbereid op de belofte die Checkout al doet over ordersplitsing — dit is verholpen met een minimumvereisten-paragraaf, niet met een schermontwerp.

**Sprint 1A is hiermee architectonisch gevalideerd.** Geen resterende ontbrekende schakels die de start van Zoekresultaten in de weg staan.

**Volgende stap:** Zoekresultaten.
