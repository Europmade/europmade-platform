# EuropMade — Winkelwagen: Architectuuranalyse & UX-specificatie

**Status:** v1.0 (definitief, na architectuuranalyse). Eerste scherm van Sprint 1B.
**Basis:** Blueprint v2.1, UX-architectuur, Design System (41 componenten, definitief — stond op 38 ten tijde van dit document, sindsdien gegroeid via CMP-039 uit dit document zelf, plus CMP-040/041 uit latere Sprint 1B-onderdelen), functionele spec Product Cloud/Commerce Cloud/Buy Box, Checkout-spec (v1.0, bevroren), ADR 0001–0005.
**Nadrukkelijk:** Sprint 1A (Productpagina/Buy Box, Checkout, Homepage, Marketplace Listing) is bevroren en wordt door dit document niet gewijzigd — uitsluitend gelezen als afhankelijkheid.

---

## 1. Architectuuranalyse (vóór componenten/wireframes)

### 1.1 Afhankelijkheid met Productpagina/Buy Box

- De knoppen "In winkelwagen" (Buy Box, CMP-013; Product Card, CMP-017) leggen **al vast** dat een toevoeging aan de winkelwagen altijd een specifieke **Offer** betreft — de op dat moment getoonde/gekozen aanbieding, niet "het product" in het algemeen.
- **Architecturale regel, hier voor het eerst expliciet vastgelegd:** een winkelwagenregel is **gebonden aan die specifieke Offer**, niet aan "de huidige Buy Box-winnaar van dit product". Als de Buy Box na toevoeging van aanbieder wisselt (prijswijziging elders, voorraadwijziging), verandert de winkelwagenregel **niet automatisch mee** — de klant koos bewust (of impliciet, via de Buy Box-default) voor déze aanbieder, en dat blijft zo totdat de klant het zelf wijzigt of de regel ongeldig wordt (zie edge cases, sectie 5). Dit voorkomt een verwarrende, onaangekondigde aanbiederwissel tussen "toevoegen" en "afrekenen".
- Variant-selectie (CMP-037) op de Productpagina bepaalt **welke** EAN/Variant, en dus welke Offer-verzameling, aan de orde is vóórdat "In winkelwagen" wordt geklikt — de Winkelwagen zelf toont de gekozen variant als vaste, niet-bewerkbare eigenschap van de regel (zie sectie 1.2).

### 1.2 Afhankelijkheid met Checkout

- Checkout-spec (sectie 1) beschrijft al **exact** de datastructuur die de Winkelwagen moet opleveren: per unieke aanbieder gegroepeerde regels, met Retailer Indicator, productregels (afbeelding/naam/aantal/prijs), subtotaal, Shipping Badge, Delivery Estimate, retourvoorwaarden — dit is letterlijk de opbouw van **CMP-025 (Besteloverzicht/Order Summary)**.
- **Architecturale conclusie:** de Winkelwagen **hergebruikt CMP-025** als kernweergave, uitgebreid met bewerkingsmogelijkheden (aantal wijzigen, regel verwijderen) die de Checkout-versie niet had. Er is dus geen nieuw "winkelwagen-lijst"-component nodig — CMP-025 krijgt een **bewerkbare variant** (`is-editable`), zie sectie 3.
- De vier edge cases die Checkout al beschrijft voor de Besteloverzicht-sidebar (aanbieder niet meer beschikbaar, prijs gewijzigd, voorraad ontoereikend, samenvoegen van regels met dezelfde aanbieder) **gelden identiek in de Winkelwagen** — dit is namelijk het eerste, meest logische moment om ze al te tonen, niet pas bij Checkout. Zie sectie 5.

### 1.3 Afhankelijkheid met Commerce Cloud

- Bevestiging van de reeds vastgelegde regel (Checkout-spec sectie 0): cart line items refereren aan een **Offer**, niet aan een Variant — ongewijzigd, hier hergebruikt.
- Aantalswijziging in de Winkelwagen moet **server-side gevalideerd** worden tegen de actuele voorraad van die specifieke Offer (niet tegen een client-side aangenomen maximum) — consistent met de ADR 0005-filosofie (server-side-only), hier voor het eerst expliciet toegepast op voorraadvalidatie in plaats van uitsluitend op Buy Box-berekening.

### 1.4 Afhankelijkheid met Product Cloud

- Variant-wijziging (bijv. andere kleur) **vanuit de Winkelwagen zelf** wordt **niet** ondersteund in de MVP — dit zou een nieuwe EAN/Offer-koppeling vereisen die opnieuw door de Buy Box-logica moet, wat de Winkelwagen onnodig complex zou maken. In plaats daarvan: een regel met de verkeerde variant wordt verwijderd en de klant voegt de juiste variant opnieuw toe via de Productpagina. **Bewuste MVP-scopebeperking**, hier voor het eerst expliciet vastgelegd — zie ook sectie 7.

### 1.5 Component-inventarisatie: wat ontbreekt er?

| Behoefte | Bestaand component? | Conclusie |
|---|---|---|
| Retailer-gegroepeerde weergave, totalen, splitsings-toelichting | CMP-025 (Besteloverzicht) | Hergebruik, uitgebreid met `is-editable` |
| Retailer-identiteit per groep | CMP-016 (Retailer Indicator) | Hergebruik |
| Verzendkosten/levertijd per regel | CMP-020/021 | Hergebruik |
| Waarschuwingen (prijs/voorraad/niet-beschikbaar) | CMP-011 (Notice) | Hergebruik (`notice--warning`) |
| Lege winkelwagen | CMP-036 (Empty State) | Hergebruik |
| Acties (verwijderen, verder winkelen, naar checkout) | CMP-005 (Button) | Hergebruik |
| Vaste variant-weergave per regel (alleen-lezen) | CMP-008 (Badge) | Hergebruik |
| Mobiele persistente samenvatting + CTA | CMP-028 (Sticky Bottom Bar) | Hergebruik (zelfde patroon als Productpagina) |
| **Aantal verhogen/verlagen per regel, met voorraadgrens** | **Geen bestaand component dekt dit** | **Nieuw: CMP-039 Quantity Stepper** |

**Conclusie: precies één nieuw component is aantoonbaar noodzakelijk.** Alle overige behoeften zijn volledig te dekken met bestaande, al bevroren componenten.

---

## 2. Nieuw component — vastgelegd in het Design System vóór de wireframe

### CMP-039 — Quantity Stepper

| Aspect | Beschrijving |
|---|---|
| Doel | Het aantal van een winkelwagenregel verhogen/verlagen binnen de grenzen van de beschikbare voorraad. |
| Varianten | Standaard (min/plus-knoppen + numerieke weergave). |
| Staten | Standaard, `is-max` (plus-knop uitgeschakeld bij bereiken van de voorraadgrens), `is-min` (min-knop uitgeschakeld bij aantal 1 — verwijderen gaat via de losse verwijder-actie, niet via "naar 0" bewegen). |
| Interacties | Klik op min/plus wijzigt het aantal met 1; wijziging triggert een serverzijdig gevalideerde herberekening van de regel- en totaalprijs (geen client-side aanname van de nieuwe prijs). |
| Toegankelijkheid | `<button>`-elementen voor min/plus (nooit alleen een klikbare `<div>`), numerieke weergave met `aria-live="polite"` zodat een wijziging wordt aangekondigd; `aria-label` op elke knop ("Aantal verlagen"/"Aantal verhogen"). |
| Bouwaard | Standaard bouwpatroon, met een serverzijdige voorraadcontrole (Commerce Cloud) als maatwerk-datakoppeling — de UI-component zelf is generiek. |
| Afhankelijkheden | Commerce Cloud (actuele voorraad van de betreffende Offer). |
| Eerst toegepast in | Winkelwagen. |

Dit component is toegevoegd aan `07-design-system/components.md` **vóór** de wireframe hieronder is getekend, conform de gevraagde volgorde.

---

## 3. Bewerkbare uitbreiding van CMP-025 (Besteloverzicht)

Geen nieuw component, wel een nieuwe, benoemde variant: `is-editable`. Verschillen met de reeds bevroren Checkout-versie:

| Aspect | Checkout (read-only, bevroren) | Winkelwagen (`is-editable`) |
|---|---|---|
| Productafbeelding per regel | Niet aanwezig | **Aanwezig** — de Winkelwagen is de primaire pagina, herkenbaarheid via beeld is hier belangrijker dan in de Checkout-samenvatting. |
| Aantal | Statische tekst | CMP-039 Quantity Stepper |
| Regel verwijderen | Niet mogelijk | CMP-005 Button (ghost-variant, prullenbak-icoon of tekst "Verwijderen") |
| Variant-weergave | N.v.t. (nog niet bestond) | CMP-008 Badge, alleen-lezen (zie sectie 1.4 — geen wijziging vanuit dit scherm) |
| "Wijzigen"-link | Verwijst naar Winkelwagen (dit scherm) | N.v.t. — dit is al de plek |

De onderliggende structuur (Retailer Group, Split Notice, Totals) blijft identiek — dit is bewust dezelfde herkenbare opbouw als de klant zo meteen in Checkout terugziet, wat de overgang voorspelbaar maakt.

---

## 4. UX-specificatie

### 4.1 Doel van het scherm

De klant een volledig, bewerkbaar overzicht geven van alles wat hij overweegt te kopen — gegroepeerd per aanbieder, met de mogelijkheid aantallen aan te passen of regels te verwijderen — vóórdat het onomkeerbare Checkout-proces start.

### 4.2 User journey

1. Klant komt op de Winkelwagen via het winkelwagen-icoon in de Header (CMP-001), of direct na "In winkelwagen" op Productpagina/Marketplace Listing/Homepage.
2. Ziet alle regels, gegroepeerd per aanbieder, met actuele prijzen/voorraad (serverzijdig geverifieerd bij het laden van de pagina).
3. Past eventueel aantallen aan (CMP-039) → subtotalen en totaal werken direct bij.
4. Verwijdert eventueel een regel.
5. Ziet eventuele waarschuwingen (prijswijziging, voorraadbeperking, niet meer beschikbare aanbieder) en lost deze op waar nodig.
6. Klikt "Naar checkout" (alleen actief als er geen blokkerende waarschuwingen openstaan) → Checkout Stap 0/1.
   — Of klikt "Verder winkelen" → terug naar Marketplace (Homepage/Categoriepagina/Zoekresultaten).

### 4.3 Componenten (samengevat, zie sectie 1.5/2/3 voor de volledige onderbouwing)

CMP-001 (Header), CMP-002 (Footer), CMP-025 (`is-editable`), CMP-016, CMP-020, CMP-021, CMP-011, CMP-036, CMP-005, CMP-008, CMP-028 (mobiel), **CMP-039 (nieuw)**.

### 4.4 Interacties

- Aantal wijzigen → serverzijdig gevalideerde aanroep, geen optimistische client-side prijsberekening die achteraf kan afwijken.
- Regel verwijderen → directe verwijdering, geen bevestigingsdialoog (laagdrempelig terug te herstellen door opnieuw toe te voegen; een blokkerende confirm-stap zou hier meer wrijving toevoegen dan waarde bieden).
- "Naar checkout" is **uitgeschakeld** zolang een blokkerende waarschuwing (niet-beschikbare aanbieder) openstaat — consistent met de al bestaande regel in Checkout zelf.

### 4.5 Edge cases (grotendeels hergebruikt uit Checkout-spec, nu op het eerste, logische scherm toegepast)

- **Lege winkelwagen** → CMP-036 Empty State, met een duidelijke actie ("Begin met winkelen") naar de Homepage/Categorieën.
- **Aanbieder niet meer beschikbaar** sinds toevoegen → regel gemarkeerd (`notice--warning`), "Naar checkout" geblokkeerd totdat de klant de regel verwijdert of een alternatieve aanbieder kiest (link terug naar de Productpagina/Buy Box).
- **Prijs gewijzigd** sinds toevoegen → regel toont "Prijs gewijzigd: was €X, nu €Y", vereist geen aparte bevestigingsstap in de Winkelwagen zelf (dat gebeurt al bij Checkout Stap 3) maar wél zichtbaar zodra het speelt, zodat de klant niet pas bij het afrekenen verrast wordt.
- **Voorraad niet meer toereikend** (aantal in winkelwagen > actuele voorraad) → CMP-039 toont automatisch het maximaal beschikbare aantal (`is-max`), met een Notice die uitlegt waarom het aantal is aangepast.
- **Twee regels met dezelfde aanbieder** (bijv. twee verschillende producten, toevallig bij dezelfde retailer) → blijven **twee aparte regels** binnen dezelfde Retailer Group (dit was altijd al zo bedoeld — de samenvoeging tot één deelbestelling gebeurt pas bij Checkout/ordersplitsing, niet al in de winkelwagenweergave zelf).
- **Aantal verlagen tot 1, nogmaals op min klikken** → geen automatische verwijdering; de min-knop is uitgeschakeld bij 1 (`is-min`), verwijderen gaat uitsluitend via de expliciete verwijder-actie — voorkomt een per-ongeluk-verwijderde regel.
- **Guest-winkelwagen die later met een account wordt samengevoegd** (klant logt in tijdens/na het winkelen) → open technisch aandachtspunt, zie sectie 9.

### 4.6 Validaties

- Aantal kan nooit lager dan 1 of hoger dan de actuele voorraad worden ingesteld (serverzijdig afgedwongen, CMP-039 weerspiegelt dit alleen visueel).
- "Naar checkout" valideert nogmaals server-side (dezelfde revalidatie als Checkout Stap 1 al beschrijft) vóór de daadwerkelijke overgang — voorkomt dat een wijziging die vlak vóór het klikken plaatsvond, gemist wordt.

### 4.7 Acceptatiecriteria

- [ ] Winkelwagenregels zijn gegroepeerd per aanbieder, met dezelfde structuur als de Checkout-Besteloverzicht-sidebar.
- [ ] Aantalswijziging herberekent subtotaal/totaal via een serverzijdig gevalideerde aanroep, nooit uitsluitend client-side.
- [ ] Een regel kan nooit een hoger aantal tonen dan de actueel beschikbare voorraad van die Offer.
- [ ] Een niet meer beschikbare aanbieder blokkeert "Naar checkout" totdat opgelost.
- [ ] Een lege winkelwagen toont de Empty State, nooit een lege pagina zonder duiding.
- [ ] Variant-wijziging is niet mogelijk vanuit dit scherm (bewuste MVP-beperking, sectie 1.4).
- [ ] Twee regels met dezelfde aanbieder worden getoond als twee aparte regels binnen dezelfde Retailer Group, niet samengevoegd.

### 4.8 API-afhankelijkheden

- Cart-ophaal-API (regels + gekoppelde Offer-data: prijs, voorraad, retailer, verzending, levertijd — dezelfde databehoefte als de Checkout-Besteloverzicht-sidebar, hier voor het eerst de bron in plaats van een doorgegeven samenvatting).
- Aantal-wijziging-API (serverzijdige validatie tegen actuele voorraad).
- Regel-verwijderen-API.
- Dezelfde revalidatie-API die Checkout Stap 1/3 al gebruikt (hergebruikt, niet opnieuw gebouwd).

### 4.9 Medusa-standaard versus maatwerk

| Onderdeel | Bouwaard |
|---|---|
| Cart-basisstructuur (regels, aantallen, totalen) | Standaard Medusa Cart-module. |
| Cart line item → Offer-referentie (i.p.v. alleen Variant) | **Maatwerk** (al vastgelegd, Checkout-spec sectie 0) — hier hergebruikt, niet opnieuw geïntroduceerd. |
| Retailer-groepering + splitsings-toelichting | **Maatwerk**, hergebruikt CMP-025 (al maatwerk conform Checkout-spec). |
| Voorraadvalidatie bij aantalswijziging | Maatwerk datakoppeling (Commerce Cloud), generieke UI-component (CMP-039). |
| Guest-cart | Standaard Medusa-functionaliteit (cart zonder `customer_id`). |

### 4.10 Blueprint-consistentie

De Blueprint wijdt geen apart hoofdstuk aan de winkelwagen (dit is impliciet onderdeel van H8/H10), maar alle hier toegepaste regels zijn direct herleidbaar: de retailer-groepering volgt uit het Commerce Cloud-model (H8.2–8.5), en de niet-automatische aanbiederwissel (sectie 1.1) volgt direct uit het Buy Box-vertrouwensprincipe (H8.5, functionele spec sectie 3.0) — een stille aanbiederwissel zonder klantactie zou daarmee in strijd zijn.

---

## 5. Wireframes

Zie [`02-ux/wireframes/sprint-1b/01-winkelwagen-desktop.html`](../../02-ux/wireframes/sprint-1b/01-winkelwagen-desktop.html), `-tablet.html`, `-mobile.html`. **Ongewijzigd** door de aanvullingen in secties 5A/5B hieronder — beide zijn volledig beschrijfbaar met de reeds getoonde componenten (Notice, Button), geen nieuwe visuele structuur nodig.

---

## 5A. Guest Cart Merge

### Wanneer treedt dit op

Een bezoeker heeft als gast (zonder account) een gevulde winkelwagen opgebouwd (sessiegebonden, `customer_id` leeg) en logt vervolgens in of maakt een account aan — terwijl er voor dat account mogelijk al een eigen, eerder gevulde winkelwagen bestaat (van een vorige sessie).

### Samenvoegingsregels (vastgesteld)

1. **Zelfde Offer** (zelfde product, zelfde aanbieder) in beide winkelwagens → **aantallen worden samengevoegd** tot één regel, met de som van beide aantallen — **geclipt op de actueel beschikbare voorraad** van die Offer (nooit een hoger aantal dan wat leverbaar is, ook al is de som van beide carts hoger).
2. **Zelfde product, verschillende Offer** (andere aanbieder) → **beide regels blijven apart bestaan** — consistent met de reeds vastgelegde regel dat verschillende Offers altijd aparte regels zijn (sectie 4.5 van dit document), ook wanneer de merge dat zou kunnen "opschonen" tot één regel. Samenvoegen zou een stille aanbiederwissel betekenen, wat in strijd is met sectie 1.1.
3. **Product of Offer niet meer beschikbaar** (in de gast- of accountcart) → de klant wordt geïnformeerd (Notice, `notice--warning`) en krijgt een **alternatief aangeboden indien beschikbaar** — dezelfde "vervang aanbieder"-aanpak als sectie 5B hieronder beschrijft voor lopende voorraadwijzigingen; het is namelijk exact hetzelfde scenario, nu ontdekt op het moment van samenvoegen in plaats van tijdens een lopend bezoek.
4. **Uitverkochte producten** (voorraad 0, Offer bestaat nog) → regel blijft behouden in de samengevoegde winkelwagen, **duidelijk gemarkeerd** ("Tijdelijk uitverkocht"), nooit stilzwijgend weggelaten.
5. **Uitsluitend server-side afgehandeld** (conform ADR 0005-filosofie, hier toegepast op cart-samenvoeging in plaats van Buy Box-berekening) — de merge-uitkomst wordt één keer, server-side, definitief bepaald en als geheel teruggegeven; de client toont uitsluitend het resultaat, berekent nooit zelf welke regels worden samengevoegd.
6. Na een geslaagde samenvoeging bestaat de gast-winkelwagen niet meer als apart object — er is precies één actieve winkelwagen per klant.

### Medusa-standaard versus maatwerk

| Onderdeel | Bouwaard |
|---|---|
| Gast-winkelwagen (cart zonder `customer_id`) | Standaard Medusa-functionaliteit. |
| Winkelwagen koppelen aan een account bij inloggen (als er nog geen accountcart bestaat) | Standaard Medusa-functionaliteit. |
| **Samenvoegen van twee reeds gevulde winkelwagens** (regel-voor-regel, met de bovenstaande zes regels) | **Maatwerk** — dit is geen standaard Medusa-functie; gebruikt de Medusa Workflow-engine als technisch fundament (zelfde patroon als de wijzigingsvoorstel-afhandeling, Product Cloud-spec sectie 1.8), de samenvoeglogica zelf is volledig custom. |

### Edge cases

- **Gecombineerde hoeveelheid overschrijdt de voorraad** → aantal wordt automatisch geclipt naar het maximum, met een melding ("Aantal aangepast naar de beschikbare voorraad").
- **Merge mislukt door een tijdelijke serverfout** → de gast-winkelwagen blijft intact totdat een volgende poging slaagt; er gaat nooit data verloren door een mislukte samenvoegpoging.
- **Klant logt in met een gastcart die inmiddels een verlopen prijs bevat** → prijs wordt bij de samenvoeging direct herberekend op de actuele prijs (koppelt aan sectie 5B).
- **Variant-verschil** (bijv. account had kleur zwart, gast had kleur wit van hetzelfde product) → dit zijn per definitie verschillende EAN's/Offers, dus automatisch als aparte regels behandeld — geen nieuwe logica nodig, vloeit voort uit regel 2 hierboven.

### Acceptatiecriteria

- [ ] De samenvoeging draait uitsluitend server-side; de client ontvangt en toont alleen het eindresultaat.
- [ ] Regels met identieke Offer worden samengevoegd tot één regel met een voorraad-geclipte, opgetelde hoeveelheid.
- [ ] Regels met hetzelfde product maar een andere Offer blijven gescheiden regels.
- [ ] Niet meer beschikbare Offers worden zichtbaar gemarkeerd (met alternatief indien mogelijk), nooit stilzwijgend verwijderd.
- [ ] Na een geslaagde samenvoeging bestaat de gast-winkelwagen niet meer als apart object.
- [ ] Een mislukte samenvoegpoging verliest geen data.

---

## 5B. Prijs- en voorraadwijzigingen tijdens het winkelen

### Wanneer wordt een wijziging gedetecteerd

Server-side validatie van elke winkelwagenregel vindt plaats op drie momenten — **geen continue achtergrond-polling in de MVP** (bewuste scopekeuze: onnodige serverbelasting voor een laagfrequente gebeurtenis):

1. Bij het laden/openen van de Winkelwagenpagina.
2. Bij elke aantalswijziging (CMP-039).
3. Bij het klikken op "Naar checkout" (laatste-moment controle, hergebruikt dezelfde validatieservice als Checkout Stap 1 — geen dubbele, potentieel afwijkende logica).

### Hoe wordt de klant geïnformeerd

Via CMP-011 (Notice), direct onder de betreffende regel — nooit als één generieke melding voor de hele winkelwagen, want specificiteit (welke regel, welk bedrag) is belangrijker voor vertrouwen dan beknoptheid.

### Prijsverhoging

- Weergave: "Prijs gewijzigd: was €X, nu €Y" — **neutraal geformuleerd**, geen alarmerende taal ("Let op!") en geen felle waarschuwingsstyling; wél de `notice--warning`-variant (onderscheidt zich visueel van een prijsverlaging), omdat een verhoging iets is waar de klant zich bewust van moet zijn vóórdat hij doorgaat.
- Totaal wordt automatisch herberekend en getoond.

### Prijsverlaging

- Weergave: "Prijs gewijzigd: was €X, nu €Y" met een positieve framing (bijv. een korte toevoeging dat dit in het voordeel van de klant is) — gebruikt de `notice--info`-variant, **niet** `notice--warning`: een prijsdaling vereist geen actie en is geen waarschuwing, uitsluitend een prettige mededeling.
- Zelfde onderliggende component (CMP-011), andere variant — geen nieuw component nodig voor dit onderscheid.

### Wanneer wordt de prijs definitief vastgezet

**Nooit vóór het daadwerkelijk plaatsen van de order** (Checkout Stap 3, "Bestelling plaatsen" — al vastgelegd in `checkout/spec.md`). Zowel in de Winkelwagen als tijdens Checkout blijft de prijs "actueel, kan nog wijzigen" — een eerdere bevriezing zou een retailer kunnen binden aan een prijs die hij inmiddels bewust heeft aangepast, wat oneerlijk zou zijn en het prijsvormingsprincipe van de Buy Box (sectie 3.0 van de functionele spec Product Cloud/Commerce Cloud/Buy Box) zou ondermijnen.

### Voorraadwijziging

| Situatie | Gedrag |
|---|---|
| Voorraad daalt, blijft ≥ besteld aantal | Geen zichtbare actie — onzichtbaar voor de klant. |
| Voorraad daalt tot < besteld aantal, maar > 0 | Aantal automatisch verlaagd naar het nieuwe maximum (CMP-039 toont `is-max`), met een Notice die dit uitlegt. |
| Voorraad daalt tot 0 ("tijdelijk uitverkocht", Offer blijft bestaan) | Regel blijft zichtbaar, gemarkeerd als "Tijdelijk uitverkocht", CMP-039 volledig uitgeschakeld, "Naar checkout" **geblokkeerd** zolang deze regel in de winkelwagen staat. |

### Wanneer een Offer volledig verdwijnt

Onderscheid met "tijdelijk uitverkocht" (kan terugkomen): een **verdwenen** Offer (retailer heeft het aanbod verwijderd, of is geschorst) is **permanent** niet meer beschikbaar. De regel wordt gemarkeerd "Niet meer beschikbaar" (`notice--warning`).

### Wanneer een andere aanbieder hetzelfde product nog wel aanbiedt

**Uitbreiding op de eerder vastgelegde regel** (die alleen een link terug naar de Productpagina bood): als de Buy Box voor dat product/die variant een geldig alternatief aanbod heeft, toont de Notice dit concreet — bijvoorbeeld "Retailer Z biedt dit product aan voor €X" met een directe "Vervang aanbieder"-actie binnen de Winkelwagen zelf, in plaats van de klant terug te sturen naar de Productpagina. Deze actie is server-side gevalideerd en atomair (verwijdert de oude regel en voegt de nieuwe Offer-regel toe in één bewerking, geen tussentijdse inconsistente staat). **Geen nieuw component nodig** — dit is een Notice (CMP-011) met een Button (CMP-005) erin, exact zoals de bestaande Notice-structuur al toestaat.

### Businessregels (samengevat)

- Prijs is nooit vastgezet vóór orderplaatsing.
- Wijzigingen worden per regel getoond, nooit als één generieke mededeling.
- Voorraadclipping gebeurt altijd automatisch, nooit een ongeldig aantal laten staan.
- "Naar checkout" blijft geblokkeerd zolang een regel niet afgerekend kan worden (uitverkocht of verdwenen, zonder dat de klant dit heeft opgelost).

### Edge cases

- **Prijs- én voorraadwijziging tegelijk op dezelfde regel** → gecombineerd in één heldere melding (bijv. "Prijs gewijzigd naar €X · Nog 2 op voorraad") in plaats van twee losse Notices op te stapelen.
- **Twee open tabbladen, wijziging in het ene tabblad** → het andere tabblad toont bij de eerstvolgende actie altijd de meest actuele server-staat; een lokaal gecachte weergave krijgt nooit voorrang boven de server-waarheid.
- **Prijswijziging ná het verlaten van de Winkelwagen** (al in Checkout) → buiten de scope van dit document, al gedekt door de bestaande revalidatie in `checkout/spec.md`.

### Acceptatiecriteria

- [ ] Elke prijswijziging wordt per regel getoond, met visueel onderscheid tussen verhoging (`notice--warning`, neutrale taal) en verlaging (`notice--info`, positieve framing).
- [ ] De prijs wordt nooit eerder vastgezet dan het moment van daadwerkelijke orderplaatsing.
- [ ] Een voorraaddaling onder het bestelde aantal verlaagt het aantal automatisch, met melding, nooit stilzwijgend.
- [ ] Een tijdelijk uitverkocht product blokkeert "Naar checkout" zonder de regel te verwijderen.
- [ ] Een permanent verdwenen Offer wordt gemarkeerd, met een concreet alternatief indien de Buy Box dat kan leveren.
- [ ] Alle validaties zijn server-side; de client toont uitsluitend resultaten.

---

## 6. Consistentiecontrole

- **Blueprint:** consistent (sectie 4.10).
- **UX-architectuur:** scherm #6 (Winkelwagen, Must Have, Sprint 1B) — consistent, geen scope-afwijking.
- **Product Cloud:** geen wijziging, geen vermenging met Commerce Cloud-data (variant-wijziging bewust buiten scope, sectie 1.4).
- **Commerce Cloud:** ongewijzigd, correct hergebruikt (Offer-referentie, voorraadvalidatie) — nu uitgebreid met de merge- en prijswijzigingslogica (5A/5B), zonder het datamodel zelf aan te passen.
- **Design System:** CMP-039 als enige, aantoonbaar noodzakelijke toevoeging; secties 5A/5B introduceren **geen nieuwe componenten** — beide zijn volledig uit te drukken met CMP-005 (Button) en CMP-011 (Notice, met de reeds bestaande `--info`/`--warning`-varianten). Geen bestaand component is aangepast.
- **Wireframes:** ongewijzigd — secties 5A/5B zijn functionele/backend-georiënteerde specificaties die geen nieuwe visuele structuur vereisen.
- **ADR's:** ADR 0005 (server-side-only) nu ook expliciet toegepast op cart-samenvoeging (5A) en prijs-/voorraadvalidatie (5B), naast Buy Box-berekening en de eerder al genoemde voorraadvalidatie bij aantalswijziging — een consistente, herhaalde toepassing van hetzelfde principe, geen nieuwe uitzondering.
- **Checkout (bevroren):** niet gewijzigd; de merge- en prijswijzigingslogica hergebruikt expliciet dezelfde validatieservice als Checkout Stap 1, in plaats van een tweede, mogelijk afwijkende validatieroute te bouwen.

---

## 7. Openstaande punten (blokkeren de wireframe niet, wel vermeldenswaardig)

1. **Variant-wijziging vanuit de Winkelwagen** is bewust buiten de MVP-scope gehouden (sectie 1.4) — een mogelijke toekomstige uitbreiding, geen huidige tekortkoming.
2. ~~Guest-cart-samenvoeging bij inloggen~~ — **opgelost**, zie sectie 5A.

---

## Status: v1.0 (definitief) — klaar voor bevriezing

Architectuuranalyse uitgevoerd vóór componenten/wireframes, precies één nieuw component toegevoegd na aantoonbare noodzaak (CMP-039, vooraf in het Design System vastgelegd), volledige UX-specificatie uitgewerkt, wireframes gebouwd (sectie 5). De twee laatste functionele aanvullingen voor Sprint 1B (Guest Cart Merge, sectie 5A; prijs-/voorraadwijzigingen, sectie 5B) zijn uitgewerkt **zonder** wireframe- of componentwijziging — beide volledig uit te drukken met reeds bevroren componenten (CMP-005, CMP-011). Geen wijziging aan enig bevroren Sprint 1A-scherm, geen wijziging aan Product Cloud/Commerce Cloud-datamodellen. Het enige openstaande punt (variant-wijziging vanuit de Winkelwagen) is een bewuste, gemotiveerde MVP-scopebeperking, geen tekortkoming.

**Geen resterende blokkades — de Winkelwagen kan als definitief bevroren worden beschouwd zodra hierop akkoord is gegeven.**
