# EuropMade — Orderbevestiging: Architectuuranalyse & UX-specificatie

**Status:** v1.3 — **definitief bevroren.** Tweede scherm van Sprint 1B.
**Basis:** Blueprint v2.1, UX-architectuur, Design System (41 componenten, definitief), functionele spec Product Cloud/Commerce Cloud/Buy Box, Checkout-spec (bevroren), Winkelwagen-spec (bevroren), ADR 0001–0005.
**Nadrukkelijk:** Sprint 1A en de Winkelwagen zijn bevroren en worden door dit document niet gewijzigd.
**Voorgeschiedenis:** de Customer Journey Audit (`02-ux/customer-journey-audit.md`, bevinding J2) legde al minimumvereisten vast in `checkout/spec.md` sectie 11 — dit document is de volledige uitwerking daarvan.

---

## Stap 1 — Architectuuranalyse

### 1.1 Afhankelijkheid met Checkout

Checkout Stap 3 ("Bestelling plaatsen") triggert, in volgorde: (a) betaalbevestiging, (b) server-side ordersplitsing in N deelbestellingen — één per aanbieder (ADR 0005), (c) navigatie naar Orderbevestiging. De inhoud die Checkout Stap 3 al toonde (CMP-025, read-only) is **vrijwel identiek** aan wat Orderbevestiging toont — het verschil is dat alles nu **bevestigd/definitief** is in plaats van "ter controle vóór plaatsing", en er nieuwe data bijkomt die pas ná plaatsing bestaat (ordernummers, betaalstatus).

### 1.2 Afhankelijkheid met Winkelwagen

Niet direct (Winkelwagen gaat aan Checkout vooraf, niet aan Orderbevestiging) — wel hergebruikt Orderbevestiging voor de derde keer dezelfde retailer-groeperingslogica (CMP-025) die in Winkelwagen en Checkout al is toegepast, wat de volledige klantreis visueel consistent houdt.

### 1.3 Afhankelijkheid met Commerce Cloud

**Architecturale regel, hier voor het eerst expliciet vastgelegd:** bij orderplaatsing wordt een **snapshot** van elke Offer (prijs, retailer, verzendvoorwaarden) vastgelegd op de order zelf — Orderbevestiging **leest deze snapshot**, niet de live Commerce Cloud-data. Dit voorkomt dat een latere prijs- of voorwaardewijziging bij de retailer met terugwerkende kracht een al bevestigde bestelling zou "corrigeren" op het scherm van de klant. Consistent met de al vastgelegde regel dat de prijs bij orderplaatsing definitief wordt (Winkelwagen-spec, sectie 5B).

### 1.4 Afhankelijkheid met Product Cloud

Zelfde snapshot-principe: productnaam/-afbeelding op de order zijn een kopie van het Product Cloud-record op het moment van bestellen, niet een live verwijzing — als een producent de titel later wijzigt, verandert een oude orderbevestiging niet mee. Dit is een gangbaar en noodzakelijk architectuurprincipe voor elk ordersysteem, hier voor het eerst voor EuropMade vastgelegd.

### 1.5 Afhankelijkheid met Payments

Niet elke betaalmethode bevestigt **synchroon**: iDEAL en vergelijkbare methoden werken via een asynchrone webhook (al benoemd in `checkout/spec.md` sectie 5). **Consequentie voor dit scherm:** Orderbevestiging moet twee toestanden kunnen tonen — **"Betaald"** (synchrone/reeds bevestigde betaling) en **"Betaling wordt verwerkt"** (asynchrone methode, bevestiging volgt nog) — zie Stap 3, Success State.

### 1.6 Afhankelijkheid met Orders

De ordersplitsing (ADR 0005) produceert N losse Order-objecten (één per aanbieder), gekoppeld aan één gedeelde betaling. Orderbevestiging heeft een overkoepelend referentiepunt nodig (een "OrderSet"-achtig concept, uitsluitend voor weergave-doeleinden — geen nieuw Product Cloud/Commerce Cloud-concept) om de N ordernummers samen te tonen onder één totaalbedrag.

### 1.7 Afhankelijkheid met E-mailbevestigingen

De klant ontvangt **per deelbestelling een aparte e-mailbevestiging** (al aangekondigd in de Winkelwagen/Checkout via de splitsings-toelichting). Orderbevestiging moet dit **nogmaals expliciet bevestigen** ("uitleg over vervolgproces", Stap 4) zodat de klant niet verrast is door meerdere e-mails.

### 1.8 Afhankelijkheid met ADR's

ADR 0005 (server-side-only) is hier leidend: dit scherm **berekent niets** — het toont uitsluitend een reeds server-side vastgestelde, bevestigde staat. Geen enkele weergegeven waarde (bedrag, status, ordernummer) mag ooit client-side worden afgeleid of aangenomen.

### 1.9 Business Rules

- Eén betaling, N orders — moet **visueel onmiskenbaar** blijven (dit was al de kernregel sinds de Checkout-spec, hier voor de laatste keer in de klantreis herbevestigd).
- **Commissie heeft geen invloed op de klantweergave** (expliciet gevraagd, Stap 5) — bevestigt een principe dat al voor de Buy Box gold (spec sectie 3.0) en hier voor het eerst op een puur informatief scherm wordt getoetst: er is *sowieso* geen enkel commissiegerelateerd gegeven dat op dit scherm thuishoort, dus er is niets te verbergen — de check bevestigt afwezigheid, geen correctie.

### 1.10 Data — beschikbaar, definitief, en nog te wijzigen

| Data | Status op dit scherm |
|---|---|
| Ordernummer(s), één per deelbestelling | **Definitief** — bestaat pas na plaatsing, verandert nooit meer. |
| Bestelde producten, aantallen, prijzen (snapshot) | **Definitief.** |
| Leveradres, factuuradres | **Definitief** (zoals ingevoerd in Checkout). |
| Aanbieder per deelbestelling | **Definitief** — geen aanbiederwissel meer mogelijk na plaatsing. |
| Betaalmethode, betaald bedrag | **Definitief.** |
| **Betaalstatus** | **Kan nog wijzigen** — bij asynchrone methoden van "wordt verwerkt" naar "bevestigd" (buiten dit scherm om, via e-mail/notificatie). |
| **Verwachte levering** | **Indicatief** — een berekende datumrange op basis van de Delivery Estimate-categorie (CMP-021) + besteldatum, geen harde garantie. |
| **Track & trace-code** | **Nog niet beschikbaar** — ontstaat pas zodra de retailer daadwerkelijk verzendt; dit scherm toont uitsluitend de aankondiging dat dit volgt, nooit een placeholder-code. |

### 1.11 Betrokken services

Payment-service/webhook (asynchrone bevestiging), ordersplitsing-service (ADR 0005), notificatie-/e-mailservice (per-deelbestelling bevestigingen), Product Cloud/Commerce Cloud (uitsluitend als bron van de snapshot ten tijde van bestellen, niet als live databron op dit scherm).

---

## Stap 2 — Componentanalyse

| Behoefte | Bestaand component? | Conclusie |
|---|---|---|
| Retailer-gegroepeerd overzicht, totalen | CMP-025 (Besteloverzicht) | Hergebruik, **derde variant**: `is-confirmed` (naast `is-editable` uit Winkelwagen en de bevroren read-only Checkout-variant) — toont ordernummer per groep, geen "wijzigen"-links meer, plek voor de toekomstige T&T-code. |
| Adres/betaalmethode-blokken, zonder wijzigen-mogelijkheid | CMP-030 (Review Block) | Hergebruik, zonder de "Wijzigen"-link (niets is nog te wijzigen na plaatsing) — geen nieuw component, een kleinere variant van hetzelfde blok. |
| Retailer-identiteit | CMP-016 | Hergebruik. |
| Verzending/levertijd per deelbestelling | CMP-020/021 | Hergebruik — CMP-021 toont nu een berekende datumrange in plaats van uitsluitend de categorie (zelfde component, andere renderwaarde). |
| Betaalstatus, ordernummer-labels | CMP-008 (Badge) | Hergebruik, nieuwe contentwaarden ("Betaald"/"Betaling wordt verwerkt"). |
| Uitleg vervolgproces, gast-instructies, "wordt verwerkt"-tussenstaat | CMP-011 (Notice) | Hergebruik. |
| CTA's ("Bestelling bekijken", "Verder winkelen", contact) | CMP-005 (Button) | Hergebruik. |
| **Succesbevestiging (grote, prominente "Bestelling geplaatst!"-melding)** | Geen los component, wel volledig samen te stellen uit bestaande onderdelen | **Geen nieuw component** — compositie van bestaande typografie (grote kop) + een vergroot vinkje-glyph (zelfde patroon als de bestaande ⓘ-info-dot, alleen groter en met ✓) + CMP-011 voor de ondersteunende tekst. Zelfde aanpak als de Homepage-Hero destijds (compositie van bestaande atomen, geen nieuw component). |

**Conclusie: geen enkel nieuw component is noodzakelijk voor de Orderbevestiging.** Dit is een legitieme, gecontroleerde uitkomst — twee bestaande componenten (CMP-025, CMP-030) krijgen een nieuwe, benoemde variant, verder is alles herbruikbaar zoals het is.

---

## Stap 3 — Functionele UX-specificatie

### 3.1 Doel van het scherm

De klant onmiskenbare zekerheid geven dat de bestelling geplaatst is, een volledig en overzichtelijk beeld geven van wat er nu gebeurt (per aanbieder), en een duidelijk vervolgpad bieden — zonder de klant te overweldigen met meer informatie dan op dit moment nodig is.

### 3.2 User journey

1. Klant klikt "Bestelling plaatsen" in Checkout Stap 3 → server bevestigt betaling en splitst de order → klant landt op Orderbevestiging.
2. Ziet direct, bovenaan, een ondubbelzinnige succesbevestiging + het/de ordernummer(s).
3. Ziet de opsplitsing in deelbestellingen, elk met eigen aanbieder, producten, verwachte levering en (indien van toepassing) betaalstatus.
4. Ziet leveradres, factuuradres, betaalmethode, verzendmethode als marketplace-brede, gedeelde informatie — visueel gescheiden van de retailer-specifieke blokken.
5. Leest een korte uitleg over het vervolg (e-mailbevestigingen per deelbestelling, hoe track & trace later verschijnt).
6. Kiest: "Bestelling bekijken" (naar Mijn bestellingen — ingelogd — of een gast-equivalent) of "Verder winkelen" (naar Homepage/Categorieën).

### 3.3 Success State

- Grote, ondubbelzinnige melding: "Bestelling geplaatst!" + het aantal deelbestellingen ("in 2 pakketten, van 2 verschillende aanbieders").
- Betaalstatus zichtbaar per situatie:
  - **Synchrone betaling bevestigd:** badge "Betaald", geen verdere actie nodig.
  - **Asynchrone betaling (bijv. iDEAL) nog niet definitief bevestigd:** badge "Betaling wordt verwerkt", met een Notice: "We bevestigen je betaling automatisch — je ontvangt hierover een e-mail. Je bestelling is al bij de aanbieder(s) aangemeld."
- Beide situaties tonen verder **exact dezelfde pagina-structuur** — het verschil zit uitsluitend in de badge + één Notice, niet in een andere lay-out (voorkomt twee losse schermontwerpen voor wat feitelijk hetzelfde scherm is).

### 3.4 Mogelijke foutscenario's

- **Betaling gelukt, ordersplitsing zelf mislukt** (al benoemd als technisch randgeval, `checkout/spec.md` sectie 5) → Orderbevestiging toont in dat geval **geen** onvolledige/foutieve deelbestellingen-weergave, maar een aparte, eenvoudiger tussenstaat: "Je betaling is gelukt, we verwerken je bestelling — dit kan een moment duren" + contactmogelijkheid, **geen** poging om alvast een gedeeltelijke Besteloverzicht te tonen op basis van onvolledige data.
- **Klant ververst de pagina of keert er later naar terug** (bijv. via een e-maillink) → scherm moet **idempotent** opnieuw opvraagbaar zijn via het ordernummer/token, nooit "sessie verlopen" of een lege pagina tonen.
- **Gast-bestelling** → "Bestelling bekijken" leidt niet naar "Mijn bestellingen" (bestaat niet zonder account) maar naar uitleg hoe de bestelling later terug te vinden is (ordernummer + e-mailadres) — met een prominente, niet-opdringerige suggestie om alsnog een account aan te maken (consistent met Checkout-spec sectie 3).

### 3.5 Edge cases

- **Eén deelbestelling in plaats van meerdere** (klant kocht toevallig van maar één aanbieder) → de splitsings-taal ("N deelbestellingen") valt automatisch weg; het scherm toont dan gewoon één Retailer Group zonder overkoepelende "opsplitsing"-uitleg — geen aparte lay-out nodig, de tekst past zich uitsluitend aan het aantal aan.
- **Track & trace nog niet beschikbaar** → nooit een lege/kapoot ogende placeholder, altijd een expliciete, geruststellende tekst ("Track & trace volgt zodra [Retailer X] je bestelling verzendt").
- **Verwachte levering verschilt sterk per deelbestelling** (bijv. één morgen, één over 5 werkdagen) → dit wordt juist duidelijk zichtbaar gemaakt per Retailer Group, niet samengevoegd tot één misleidende gemiddelde datum.

### 3.6 Validaties

Geen gebruikersinvoer op dit scherm — de enige "validatie" is dat het scherm nooit data toont die niet server-side bevestigd is (zie Stap 1.10).

### 3.7 Acceptatiecriteria

- [ ] Een ondubbelzinnige succesmelding staat bovenaan, direct zichtbaar zonder scrollen (op alle breakpoints).
- [ ] Elke deelbestelling wordt afzonderlijk getoond met een eigen ordernummer — nooit samengevoegd tot één generieke bevestiging.
- [ ] Betaalstatus toont correct "Betaald" of "Betaling wordt verwerkt", nooit een aanname vooruitlopend op de daadwerkelijke serverbevestiging.
- [ ] Leveradres/factuuradres/betaalmethode/verzendmethode staan als gedeelde, marketplace-brede informatie, visueel gescheiden van de retailer-specifieke blokken.
- [ ] Geen enkele track & trace-code wordt getoond vóórdat deze daadwerkelijk bestaat.
- [ ] Geen commissiegerelateerd gegeven is zichtbaar op dit scherm.
- [ ] "Bestelling bekijken" en "Verder winkelen" zijn beide altijd aanwezig en functioneel, ongeacht gast- of accountstatus.
- [ ] Het scherm is idempotent opvraagbaar (herlaad/latere terugkeer toont dezelfde bevestiging correct).

### 3.8 Medusa-standaard versus maatwerk

| Onderdeel | Bouwaard |
|---|---|
| Order-aanmaak vanuit een cart | Standaard Medusa-basispatroon. |
| Weergave van een reeds geplaatste order | Standaard. |
| **Ordersplitsing in N gekoppelde orders + gedeeld betaalreferentiepunt** | **Maatwerk** (ADR 0005, al vastgelegd — hier uitsluitend de weergave ervan, geen nieuwe logica). |
| Snapshot van product-/Offer-data op het orderrecord | **Maatwerk** (custom veld/structuur op het Order-model) — standaard Medusa slaat orderregels ook als snapshot op, dus dit sluit aan bij een standaard Medusa-patroon, toegepast op de custom Offer-structuur. |
| Asynchrone betaalstatus-weergave | Standaard Medusa Payment-status, gecombineerd met de al bestaande webhook-aanpak (`checkout/spec.md` sectie 5). |

### 3.9 Blueprint-consistentie

H10.7 noemt "bevestiging" als het vijfde, aparte onderdeel van de checkoutflow (na controle) — dit scherm ís die stap, nu voor het eerst volledig uitgewerkt. H8.9 (klant en retailer kunnen beiden de orderstatus volgen) wordt hier voorbereid (het "Bestelling bekijken"-pad), zonder dat het orderdetailscherm zelf al gebouwd wordt (dat is scherm #12, latere Sprint 2-scope).

---

## Stap 4 — Wireframes

Zie [`02-ux/wireframes/sprint-1b/02-orderbevestiging-desktop.html`](../../02-ux/wireframes/sprint-1b/02-orderbevestiging-desktop.html), `-tablet.html`, `-mobile.html`.

Bevat, conform de opdracht, minimaal: succesbevestiging, ordernummer(s), besteloverzicht, gekozen aanbieders, betaalstatus, leveradres, factuuradres, verzendmethode, verwachte levering, betaalmethode, CTA "Bestelling bekijken", CTA "Verder winkelen", contactmogelijkheden, uitleg vervolgproces, en een duidelijke scheiding tussen marketplace- en retailerinformatie.

---

## Stap 5 — Marketplace-specifieke controle

| Controlepunt | Bevinding |
|---|---|
| Meerdere retailers binnen één bestelling | Getoond als aparte Retailer Groups (CMP-025), elk met eigen ordernummer — geen samenvoeging. |
| Verschillende levermomenten | Elke Retailer Group toont zijn eigen berekende verwachte-leverdatum — geen gemiddelde of samengevoegde datum. |
| Verschillende Track & Trace-codes | Elke Retailer Group heeft een eigen T&T-plek, nu nog leeg met een aankondigende tekst (T&T bestaat pas bij verzending, sectie 1.10). |
| Communicatie per retailer | Nog niet functioneel beschikbaar in de MVP (Berichtencentrum, schermen #14/#42, is Sprint 2-scope) — Orderbevestiging verwijst daarom bewust naar een algemene contactmogelijkheid, geen voorbarige messaging-functionaliteit. |
| Commissie heeft geen invloed op de klantweergave | Bevestigd — er staat sowieso geen commissiegerelateerd gegeven op dit scherm; niets hoefde verwijderd te worden. |
| Alle informatie blijft overzichtelijk | Bewaakt door de scheiding tussen gedeelde marketplace-info (adres/betaling, één keer getoond) en retailer-specifieke blokken (herhaald per aanbieder) — geen dubbele weergave van gedeelde gegevens per retailer. |

---

## Stap 5A — BTW-specificatie (Europese OSS)

**Toegevoegd op verzoek, vóór bevriezing.** Functionele uitbreiding van het kostenoverzicht (CMP-025 Totals-onderdeel, `is-confirmed`-variant) zodat dit volledig aansluit op de uiteindelijke factuur.

### Uitgangspunt

- De klant betaalt altijd de BTW van het **land van levering** (het leveradres), niet het land van de retailer of producent.
- Het getoonde BTW-bedrag is gebaseerd op het toepasselijke tarief van dat bestemmingsland.
- Afhandeling verloopt via de Europese **One Stop Shop (OSS)**-regeling — dit is uitsluitend een **architectuuruitgangspunt**, de Orderbevestiging legt OSS zelf niet uit aan de klant.

### Waar het BTW-tarief wordt bepaald

Het tarief volgt uit de combinatie van **(a)** het land van levering (leveradres, al vastgelegd op de order) en **(b)** de BTW-categorie van het product (standaard/verlaagd/nul-tarief). **Architecturale aanvulling, hier voor het eerst benoemd:** de BTW-categorie is een klein, aantoonbaar noodzakelijk attribuut op het Product Cloud-record (vergelijkbaar met hoe eerder al de FAQ-content als kleine, benoemde uitbreiding is vastgelegd zonder de kernspecificatie te herschrijven) — dit document introduceert het attribuut, het brondocument `product-cloud-commerce-cloud-buy-box/spec.md` blijft ongewijzigd.

### Wanneer de BTW definitief wordt berekend

**Op hetzelfde moment als de prijs definitief wordt vastgezet: bij orderplaatsing** (Checkout Stap 3, "Bestelling plaatsen") — consistent met de al vastgelegde regel dat de prijs nooit eerder wordt bevroren (Winkelwagen-spec, sectie 5B). Vóór dat moment (Winkelwagen, Checkout Stap 1/2) is een getoond BTW-bedrag altijd indicatief, gebaseerd op het op dat moment ingevulde leveradres.

### Verantwoordelijke service

**Grotendeels standaard Medusa-functionaliteit:** Medusa's ingebouwde Tax Region/Tax Rate-mechanisme is precies ontworpen voor regio-gebaseerde BTW-toepassing en sluit natuurlijk aan op het OSS-uitgangspunt (bestemmingsland bepaalt het tarief). **Maatwerk, specifiek voor deze marketplace:** de aggregatie van BTW-bedragen **over meerdere retailer-lijnen heen** tot één overzichtelijke, per-tarief samengevatte weergave voor de klant (zie hieronder) — de berekening zelf is standaard, de gecombineerde presentatie is maatwerk.

### Rol van de Orderbevestiging

**De Orderbevestiging voert zelf geen fiscale berekening uit.** Het scherm toont uitsluitend bedragen die de BTW-service al server-side heeft vastgesteld op het moment van orderplaatsing — consistent met het bestaande principe dat dit scherm uitsluitend een reeds bevestigde staat weergeeft (sectie "Rol van de Orderbevestiging" hierboven, ADR 0005). **Alle berekeningen vinden server-side plaats.**

### Weergave (B2C) — vereenvoudigd na tweede UX-review

**Verder herzien:** de v1.2-uitwerking (BTW als eigen regel, mét een aparte toelichtende "Waarvan..."-tekst eronder, mét een standaard zichtbaar uitklapblok voor meerdere tarieven) bevatte **te veel zichtbare informatie tegelijk**. De definitieve, vereenvoudigde opzet:

```
Subtotaal                                    € 308,95
Verzendkosten                                €   4,95
BTW ⓘ                                        €  54,48
─────────────────────────────────────────────────────
Totaal te betalen                            € 313,90
```

- De BTW-regel toont **uitsluitend label, info-icoon (ⓘ) en bedrag** — verder niets.
- De toelichtende tekst ("Waarvan € 54,48 Nederlandse BTW (21%)") **vervalt volledig** — dit was dubbele informatie naast de nu al aanwezige structurele regel.
- Het **standaard zichtbare uitklapblok** voor meerdere tarieven (de v1.2-toevoeging met "BTW (totaal) ▾") **vervalt eveneens** — een uitsplitsing die altijd zichtbaar is, is voor de meeste bestellingen (één tarief) overbodige informatiedichtheid.

**Kortingen** volgen dezelfde regelstructuur als voorheen (eigen regel, alleen getoond bij een waarde > € 0,00) — ongewijzigd.

### Informatie-icoon (ⓘ) — tooltip, geen nieuwe pagina

Het BTW-label krijgt een informatie-icoon, **hetzelfde hergebruikte patroon** als elders in het Design System (bijv. de Buy Box-toelichting en het EU-eigendom-veld op de Productpagina — geen nieuw component, dezelfde `.info-dot`-stijl). Bij hover (desktop/tablet) of tap (mobiel) toont dit een compacte tooltip met:

1. Een korte uitleg hoe de BTW wordt berekend (één zin).
2. Land en toegepast tarief, bijv. *"Land: Nederland. Toegepast tarief: 21%."*
3. **Alleen indien meerdere tarieven binnen dezelfde bestelling voorkomen:** een uitsplitsing per tarief (21%/9%/0%) — deze uitsplitsing verschijnt uitsluitend in de tooltip, nooit standaard zichtbaar op de pagina zelf.

**Voorbeeldtekst (één tarief, het meest voorkomende geval):**
> "BTW wordt berekend op basis van het land van levering. Land: Nederland. Toegepast tarief: 21%."

**Voorbeeldtekst (meerdere tarieven, alleen dán getoond):**
> "BTW wordt berekend op basis van het land van levering (Nederland). Deze bestelling bevat meerdere tarieven: 21% (€ 28,50), 9% (€ 5,40), 0% (€ 0,00) — totaal € 33,90."

### Marketplace — meerdere retailers, één bestelling

- Het totaalbedrag blijft **één totaal** voor de klant, ongeacht het aantal retailers.
- De BTW wordt per product/Offer-lijn berekend op basis van het (voor de hele bestelling gelijke) land van levering — er is één leveradres per bestelling, dus nooit meerdere landen binnen dezelfde order.
- Verschillende tarieven binnen één bestelling ontstaan dus uitsluitend door **verschillende productcategorieën** (bijv. 21% voor gereedschap, 9% voor een boek), niet door verschillende landen.
- De tooltip-uitsplitsing wordt **over alle retailers heen samengevat per tarief**, niet per retailer herhaald.

### Consistentie met de toekomstige factuur

De uiteindelijke factuur (buiten de scope van dit document — geen factuurscherm in Sprint 1B) moet **dezelfde bedragen** tonen als de Orderbevestiging: zelfde subtotaal, zelfde BTW-bedrag (en, indien van toepassing, dezelfde tariefuitsplitsing), zelfde totaal. Dit is gewaarborgd doordat beide uit dezelfde, bij orderplaatsing vastgelegde snapshot putten (sectie 1.3–1.4).

### Wireframe-wijziging (v1.3 — UX-vereenvoudiging)

De Totalen-box op alle drie de breakpoints is aangepast: de BTW-regel bevat nu uitsluitend label + info-icoon + bedrag; de toelichtende tekst en het standaard zichtbare uitklapblok zijn verwijderd. Het info-icoon hergebruikt het al bestaande `.info-dot`-patroon (Buy Box, EU-eigendom) met een `title`-attribuut voor de tooltip-inhoud. **Nog steeds geen nieuw component en geen nieuwe pagina** — uitsluitend de bestaande BTW-regel binnen CMP-025 uitgebreid met een informatie-icoon.

### Bevinding: Checkout-lacune — opgelost, nu opnieuw gesynchroniseerd

De bevroren Checkout-wireframe volgt exact dezelfde v1.3-vereenvoudiging — zie `checkout/spec.md` sectie 13.

### Acceptatiecriteria (aanvullend, v1.3)

- [ ] De BTW-regel in de Totalen-box toont uitsluitend label, info-icoon en bedrag.
- [ ] De toelichtende "Waarvan €X BTW (tarief)"-tekst is volledig verwijderd, op alle breakpoints.
- [ ] Het standaard zichtbare uitklapblok voor meerdere tarieven is volledig verwijderd.
- [ ] Het info-icoon toont bij hover/klik een tooltip met: berekeningswijze, land + tarief, en (alleen indien van toepassing) een tariefuitsplitsing.
- [ ] Bij één tarief bevat de tooltip geen uitsplitsing (niets om uit te splitsen).
- [ ] Het BTW-tarief is altijd dat van het land van levering, nooit dat van de retailer/producent.
- [ ] Geen BTW-berekening vindt plaats in de Orderbevestiging zelf — uitsluitend weergave van reeds server-side vastgestelde bedragen.
- [ ] Checkout en Orderbevestiging tonen de BTW-regel en tooltip op identieke wijze.

---

## Stap 7 — Eindcontrole

- ✓ **Blueprint-consistent** (Stap 3.9).
- ✓ **Design System-consistent** — twee bestaande componenten kregen een nieuwe, benoemde variant (CMP-025 `is-confirmed`, CMP-030 zonder wijzigen-link); geen bestaand component inhoudelijk gewijzigd. De BTW-weergave (Stap 5A) hergebruikt uitsluitend de bestaande Totals-substructuur van CMP-025 en het al bestaande `.info-dot`-tooltippatroon — geen nieuw component.
- ✓ **Geen wijzigingen aan bevroren schermen** — Sprint 1A en Winkelwagen ongewijzigd (geen bestandswijziging). Checkout is via een expliciet geautoriseerde, gecontroleerde synchronisatie-update bijgewerkt (`checkout/spec.md` sectie 13) — geen ongeautoriseerde wijziging.
- ✓ **Geen overbodige componenten toegevoegd** — nul nieuwe componenten, expliciet als gecontroleerde uitkomst gerapporteerd (Stap 2 en Stap 5A).
- ✓ **UX volledig consistent met Checkout en Winkelwagen** — zelfde CMP-025-structuur voor de derde keer in de klantreis toegepast, zelfde Notice-taal, zelfde badge-stijl. **De eerder geconstateerde BTW-inconsistentie met Checkout is opgelost** — beide schermen tonen nu functioneel identieke BTW-weergave.
- ✓ **Geschikt voor alle EU-landen, compatibel met OSS** — het tarief volgt uit het leveradres + productcategorie via Medusa's standaard, regio-gebaseerde Tax-mechanisme; niets is hardgecodeerd per land.
- ✓ **Consistent met de toekomstige factuur** — beide putten uit dezelfde bij orderplaatsing vastgelegde snapshot (Stap 5A).
- ✓ **Developer-ready** — elke sectie in dit document is direct herleidbaar naar een concreet component, databron, of servicelaag (Stap 1, 1.11, 5A).

---

## Status: v1.3 — definitief bevroren

Architectuuranalyse, componentanalyse (nul nieuwe componenten), volledige UX-specificatie, wireframes en de BTW-specificatie (Stap 5A) zijn opgeleverd. De BTW-weergave is tweemaal gecorrigeerd na UX-review: eerst van toelichtende tekst naar een structurele regel (v1.2), daarna vereenvoudigd naar label + info-icoon + bedrag, met de tariefuitsplitsing uitsluitend in de tooltip (v1.3). Gesynchroniseerd met Checkout. **Orderbevestiging is hiermee, samen met Checkout (nu eveneens v1.3), definitief bevroren.**
