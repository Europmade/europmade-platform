# EuropMade — Order Management Center: Functionele Specificatie (Sprint 1C)

**Status:** v1.1 — **definitief bevroren.** Verwerkt twee goedgekeurde bevindingen (O1, O2) uit de onafhankelijke functionele review; O3, O4 en O5 bewust niet verwerkt, op uitdrukkelijk verzoek.
**Zevende onderdeel van Sprint 1C**, bouwt uitsluitend voort op de definitief bevroren Product Cloud Architecture (v1.1), Product Management (v1.1), Admin Shell & Dashboard Framework (v1.1), Moderation Center (v1.1), Verification Center (v1.1) en Partner Center (v1.1), plus Sprint 1A/1B (Checkout, Orderbevestiging, Winkelwagen, ADR 0005).
**Basis:** Checkout (bevroren, sectie 0 — ordersplitsingsprincipe, ADR 0005; sectie 2/5/6 edge cases), Orderbevestiging (bevroren, Stap 1 — Order-/OrderSet-concept, Stap 3 — betaalstatussen, Stap 5 — marketplace-separatie, Stap 5A — BTW/OSS), Admin Shell §1.9/§4.2 (bevroren), Partner Center (bevroren — audit-op-leeshandeling-precedent), Marketplace Core §20 (API-overzicht, bevroren).
**Scope:** een **nieuw, generiek overzichts- en detailscherm** voor reeds geplaatste orders, plus de al door Checkout aangekondigde, maar nog niet ingevulde uitzonderingsafhandeling bij een mislukte ordersplitsing. **Geen nieuwe onderliggende business-logica** — dit document ontsluit uitsluitend wat Checkout en Orderbevestiging al over de Order-/OrderSet-structuur hebben vastgelegd.
**Nadrukkelijk:** dit document wijzigt niets aan enig bevroren document. **Checkout blijft eigenaar van het bestelproces, Winkelwagen blijft eigenaar van de winkelwagen, Orderbevestiging blijft eigenaar van de klantgerichte bevestigingsflow** — het Order Management Center beheert uitsluitend **reeds geplaatste** orders, uitsluitend voor de Beheerder. Geen betalingslogica, geen fulfilmentlogica, geen retourmodule, geen klantenservicefunctionaliteit.

---

## 1. Doel en scope

### 1.1 Doel

Het Order Management Center is de werkomgeving waar een Beheerder reeds geplaatste orders kan overzien en inzien, en de zeldzame, al door Checkout expliciet aangekondigde uitzonderingsgevallen (een mislukte server-side ordersplitsing ná succesvolle betaling) kan behandelen. Dit is de eerste concrete invulling van de "geschil-achtige melding... voor handmatige afhandeling van het uitzonderingsgeval" die Checkout sectie 5 (Stap 2 — Betaling, Edge cases) al noemt, maar tot nu toe nergens een werkplek voor had.

### 1.2 Scope — expliciet afgebakend

**Wel:**
- Overzicht van alle geplaatste orders (per aanbieder, ná server-side ordersplitsing — Checkout sectie 0/ADR 0005).
- Detailweergave per order: ordernummer, aanbieder, producten, betaalstatus, leverings-/factuuradres, BTW/OSS-uitsplitsing, klantgegevens.
- Zoeken en filteren binnen het orderoverzicht.
- De uitzonderingsqueue voor mislukte ordersplitsing (Checkout sectie 5, Stap 2 — Betaling, Edge cases — al aangekondigd, tot nu toe niet ingevuld).
- Doorlinken naar Partner Center (de aanbieder van een order) en Product Management (de bestelde producten).

**Niet:**
- **Het bestelproces zelf** — Winkelwagen (samenstelling), Checkout (afrekenen, betaalbevestiging, ordersplitsing) blijven volledig eigenaar van hun eigen, al bevroren flows. Het Order Management Center toont uitsluitend het **resultaat**: een order die de splitsing al heeft doorlopen.
- **De klantgerichte bevestigingsflow** — Orderbevestiging (v1.3, bevroren) blijft het scherm dat de klant zelf ziet; het Order Management Center is het interne, Beheerder-gerichte equivalent, geen vervanging.
- **Betalingslogica** — geen terugboeking, geen nieuwe betaalpoging, geen wijziging van een betaalstatus. Dit scherm toont uitsluitend de al server-side vastgestelde status (Betaald/Betaling wordt verwerkt, Orderbevestiging Stap 3), consistent met het ADR 0005-principe dat niets client-side of in een weergavescherm wordt afgeleid of berekend.
- **Fulfilmentlogica** — geen verzend-, track & trace- of leveringsstatusbeheer. Orderbevestiging noemt track & trace expliciet als **toekomstige** functionaliteit ("plek voor de toekomstige T&T-code") — nog niet gebouwd, en dit document bouwt dat niet alsnog.
- **Retourmodule** — retourbeheer is Sprint 2-scope (schermen #12–17, nog niet gebouwd), hier niet vooruit gebouwd.
- **Klantenservicefunctionaliteit** — geen ticket-, contact- of berichtenbeheer.
- **Shell-functionaliteit** — het Order Management Center implementeert geen navigatie, dashboard-mechaniek of componenten; het registreert zich uitsluitend via het al bevroren, generieke modulecontract (sectie 9).

---

## 2. Orderoverzicht

Een doorzoekbare, filterbare lijst van alle geplaatste orders — **per aanbieder**, consistent met het al bevroren ordersplitsingsprincipe (Checkout sectie 0: "Na succesvolle betaling splitst het platform de bestelling server-side op in aparte orders — één per aanbieder"). Dit overzicht toont dus dezelfde granulariteit als wat de klant al als "deelbestelling" ziet in Orderbevestiging, niet de gedeelde betaaltransactie als geheel.

- **Zoeken:** op ordernummer, op klant-e-mailadres — consistent met de al bevroren, gast-vriendelijke opzoekmethode uit Orderbevestiging ("ordernummer + e-mailadres").
- **Filteren:** op betaalstatus (Betaald/Betaling wordt verwerkt), op aanbieder (met deep link naar Partner Center), op land (BTW/OSS-relevant), op plaatsingsdatum, op aanwezigheid in de uitzonderingsqueue (correctie na de functionele review, O1 — was onjuist "sectie 3"; de uitzonderingsqueue wordt daadwerkelijk gedefinieerd in sectie 4, Orderstatussen, en uitgewerkt in sectie 5, Orderacties).
- **Kolommen (samengevat, elk element leest uitsluitend uit een al bestaande, server-side vastgestelde bron):** ordernummer, aanbieder, klant (naam of gemaskeerd e-mailadres, afhankelijk van rechten — zie sectie 8), betaalstatus, plaatsingsdatum, totaalbedrag (incl. BTW), land.

**Nadrukkelijk geen nieuwe telling of berekening in het Order Management Center zelf** — elk kolomgegeven wordt kant-en-klaar aangeleverd door de laag die de brondata bezit (zelfde principe als eerder toegepast in Partner Center en Admin Shell's widgetcontract).

---

## 3. Orderdetail

Een aggregerende, uitsluitend lezende weergave — geen enkel veld hier is bewerkbaar vanuit het Order Management Center. Toont, exact zoals Orderbevestiging Stap 4 dit al voor de klant vastlegde, nu voor de Beheerder:

1. **Ordernummer en OrderSet-context** — het overkoepelende referentiepunt (Orderbevestiging Stap 1: "een 'OrderSet'-achtig concept, uitsluitend voor weergave-doeleinden") dat toont welke andere deelbestellingen bij dezelfde, gedeelde betaling hoorden — uitsluitend ter context, geen aparte mutatiemogelijkheid.
2. **Aanbieder** — met deep link naar het partnerdetail in Partner Center (bevroren).
3. **Bestelde producten** — aantallen, prijzen per regel, met deep link naar het productdetail in Product Management (bevroren).
4. **Betaalstatus en betaalmethode** — "Betaald" of "Betaling wordt verwerkt" (Orderbevestiging Stap 3), uitsluitend getoond, nooit hier gewijzigd.
5. **Leverings- en factuuradres** — zoals bij plaatsing vastgelegd.
6. **BTW/OSS-uitsplitsing** — hergebruikt exact het al bevroren BTW-weergavepatroon (Orderbevestiging Stap 5A: label + info-icoon + bedrag, tariefuitsplitsing uitsluitend in een tooltip waar van toepassing).
7. **Klantgegevens** — gast of accounthouder, met e-mailadres (gemaskeerd/volledig afhankelijk van rechten, sectie 8).
8. **Uitzonderingsstatus, indien van toepassing** — of deze order in de mislukte-ordersplitsing-queue staat (sectie 4/5), met de reden.
9. **Audit-historie** — wie dit orderdetail eerder heeft ingezien (sectie 7).

---

## 4. Orderstatussen

**Hergebruikt exact de twee al bevroren betaalstatussen uit Orderbevestiging Stap 3 — geen enkele nieuwe status:**

```
Betaald
Betaling wordt verwerkt (asynchrone betaalmethode, bijv. iDEAL — bevestiging volgt nog)
```

**Aanvullend, expliciet toegevoegd als eigen, hier voor het eerst ingevulde toestand (nieuw, maar niet nieuwe architectuur — een al door Checkout aangekondigd, tot nu toe niet uitgewerkt uitzonderingsgeval):**

```
Uitzondering — ordersplitsing mislukt na succesvolle betaling (Checkout sectie 5, Stap 2 — Betaling, Edge cases)
```

**Expliciet vastgelegd, geen verborgen aanname:** er bestaat in de bevroren architectuur **geen enkele fulfilment- of verzendstatus** (bijv. "Verzonden," "Onderweg," "Geleverd"). Track & Trace is door Orderbevestiging zelf al als **toekomstige** functionaliteit benoemd, niet als iets wat nu al bestaat. Dit document voegt die status niet alsnog toe — dat zou fulfilmentlogica zijn, expliciet uitgesloten door de opdracht.

---

## 5. Orderacties

**Bewust grotendeels beperkt tot lezen en doorverwijzen, met precies één uitzondering die al door Checkout was aangekondigd:**

| Actie | Beschrijving | Muteert een order zelf? |
|---|---|---|
| Bekijken | Orderoverzicht en -detail raadplegen (secties 2–3) | Nee |
| Zoeken/filteren | Binnen het orderoverzicht (sectie 2) | Nee |
| Doorlinken naar Partner Center | Naar de aanbieder van deze order | Nee |
| Doorlinken naar Product Management | Naar de bestelde producten | Nee |
| **Uitzonderingsgeval markeren als afgehandeld** | Bij een mislukte ordersplitsing (sectie 4): de Beheerder registreert dat het geval handmatig is opgelost (bijv. buiten dit document om, via directe interventie) — dit document **registreert de afhandeling**, het voert zelf geen betalings- of ordersplitsingsmutatie uit | Uitsluitend de uitzonderingsstatus zelf (afgehandeld/niet afgehandeld), nooit betaalstatus, producten of bedragen |

**Uitdrukkelijk geen actie voor:** betaling terugboeken of opnieuw proberen, fulfilment-/verzendstatus wijzigen, een retour verwerken, of klantcontact vanuit dit document initiëren. Dit is geen onvolledigheid — het is de directe toepassing van de opdracht-eis "geen betalingslogica, geen fulfilmentlogica, geen retourmodule, geen klantenservicefunctionaliteit."

---

## 6. Beslisregels

- **Een order verschijnt in het Order Management Center dan en slechts dan wanneer de server-side ordersplitsing is voltooid** (Checkout sectie 0/ADR 0005) — vóór dat moment bestaat er voor dit document geen Order-object; een winkelwagen of een in-behandeling-zijnde betaling verschijnt hier nooit.
- **Het Order Management Center berekent of leidt nooit zelf een bedrag, status of BTW-uitsplitsing af** — direct hergebruikt ADR 0005-principe, letterlijk ook al toegepast door Orderbevestiging ("dit scherm berekent niets — het toont uitsluitend een reeds server-side vastgestelde, bevestigde staat").
- **De uitzonderingsqueue (mislukte ordersplitsing) is het enige geval waarin een order hier een actieve Beheerder-handeling vergt** — elke andere order is uitsluitend informatief, consistent met sectie 5.
- **"Markeren als afgehandeld" registreert uitsluitend dát het is opgelost, nooit hóe** — de daadwerkelijke oplossing (bijv. een handmatige herstelactie in Medusa Admin) valt buiten dit document, consistent met "geen betalings-/fulfilmentlogica."
- **Het Order Management Center wijzigt nooit een orderstatus, adres, product of bedrag** — het is uitsluitend een leeslaag, met de ene, smal begrensde uitzondering hierboven.

---

## 7. Auditregistratie

**Elke toegang tot orderdetailgegevens wordt gelogd** — hergebruikt hetzelfde principe dat al bij Partner Center is toegepast (audit op leeshandeling, niet uitsluitend op mutatie): wie het orderdetail heeft geopend, wanneer, en welk ordernummer. **Nadrukkelijke, eerlijke kanttekening:** de al bevroren, centrale AuditLogEntry (Product Cloud Architecture Deel 3.1) is architecturaal gedefinieerd binnen de Product Cloud-domeinlaag; een Order is een Commerce Cloud/Checkout-concept, geen Product Cloud-entiteit. Dit document past daarom **hetzelfde generieke logformaat** (wie/wanneer/wat/reden) toe op een ander domein, in plaats van te veronderstellen dat Orders al stilzwijgend binnen de Product Cloud AuditLogEntry vielen — dit vergt **geen nieuwe entiteit** (het formaat is al generiek genoeg), uitsluitend een nieuwe toepassing ervan op het Order-domein.

Elke "markeren als afgehandeld"-actie (sectie 5) wordt eveneens gelogd, met een verplicht tekstveld voor de toelichting — consistent met het al bevroren principe dat een ingrijpende beslissing nooit zonder reden wordt vastgelegd.

---

## 8. Rechten en zichtbaarheid

- **Uitsluitend de Beheerder-rol** heeft toegang tot het Order Management Center — geen nieuwe rol, geen nieuwe RBAC-regel.
- **Volledige klantgegevens (e-mailadres, adres) zijn uitsluitend zichtbaar voor de Beheerder-rol** — consistent met het al bevroren principe dat gevoelige persoonsgegevens beperkt en gelogd toegankelijk zijn (zelfde motivatie als Partner Onboarding's beveiligingseisen voor identiteitsdocumenten, hier toegepast op klantgegevens in plaats van partnerdocumenten).
- **Producent, Retailer, Distributeur en Consument hebben geen enkele toegang tot het Order Management Center** — een Retailer ziet zijn eigen orders via zijn eigen, hier niet uitgewerkte partnerkanaal (buiten scope, Retailer/Producent Dashboard-skelet, nog niet gebouwd); een klant ziet zijn eigen order uitsluitend via de al bevroren Orderbevestiging/toekomstige "Mijn bestellingen" (Sprint 2, nog niet gebouwd).
- **Contract-gebaseerde zichtbaarheid in de Admin Shell:** het Order Management Center registreert zich met `permissie: Beheerder` (Admin Shell §1.9) — het hoofdmenu-item is uitsluitend zichtbaar voor die rol, exact volgens het al bevroren, generieke filterprincipe (Admin Shell §4.2).

---

## 9. Admin Shell-registratiecontract

**Uitsluitend registratie, geen Shell-implementatie** — naar het concrete precedent van Moderation Center, Verification Center en Partner Center:

```
naam: "Order Management Center"
route: /admin/orders
icoon: (Design System-icoon, generiek — geen nieuw icoon nodig)
permissie: Beheerder
navigatiepositie: (naast overige Beheerder-modules, incl. Partner Center)
beschikbare widgets: 1× Wachtrij-samenvatting-widget (uitzonderingsqueue mislukte ordersplitsing, sectie 4) + 1× KPI-vak (totaal aantal orders vandaag) — optioneel, kant-en-klaar berekend dóór deze module, nooit door de Shell
KPI's: optioneel — bijv. totaal aantal openstaande uitzonderingsgevallen
notificatietypen: optioneel — een nieuw uitzonderingsgeval (mislukte ordersplitsing) kan een notificatie genereren (hergebruikt de al bevroren Notificatie-API, geen nieuwe notificatielogica)
taken: optioneel — bijv. "2 orders met een mislukte ordersplitsing wachten op afhandeling"
deep links: naar elk individueel orderdetail vanuit een zoekresultaat of notificatie elders in het platform
```

**Consistent met de al bevroren regel (Admin Shell §8):** de Shell roept nooit een van de onderliggende business-API's rechtstreeks aan — het Order Management Center gebruikt ze zelf, en levert uitsluitend het resultaat via het contract. Geen enkele Shell-wijziging is nodig of voorgesteld.

---

## 10. API-gebruik

**Eén nieuwe, minimale API is hier aantoonbaar noodzakelijk — verder geen nieuwe API of database-entiteit:**

| Order Management Center-functie | Bestaande API/entiteit (ongewijzigd) |
|---|---|
| Bestelde producten en hun status | **Product Cloud API** (Marketplace Core §20) |
| Auditregistratie | Hergebruikt het generieke AuditLogEntry-logformaat (Product Cloud Architecture Deel 3.1), toegepast op het Order-domein (sectie 7) — geen nieuwe entiteit |
| Notificatie bij een nieuw uitzonderingsgeval | **Notificatie-API** (Marketplace Core §20) |

| Order Management Center-functie | Nieuwe, minimale dienst |
|---|---|
| Orderoverzicht, orderdetail (ordernummer, betaalstatus, adres, BTW-uitsplitsing, OrderSet-context), uitzonderingsqueue-beheer | **Order-inzage-API (nieuw, minimaal noodzakelijk)** |

**Motivatie voor deze ene, nieuwe dienst:** geen van de acht al benoemde diensten in Marketplace Core §20 (Product Cloud API, Commerce Cloud/Offer API, Buy Box-berekeningsservice, Claim-/eigenaarschap-API, Wijzigingsvoorstel-API, AI-validatie-API, Zoekindexering-API, Notificatie-API, Admin-moderatie-API) dekt Order-/OrderSet-data — Orders zijn een Checkout/Commerce Cloud-concept dat tot nu toe uitsluitend via het klantgerichte Orderbevestiging-scherm werd getoond, nooit via een herbruikbare, benoemde API-laag. Deze dienst is uitdrukkelijk **uitsluitend lezend** (consistent met sectie 5/6 — geen enkele mutatie van betaalstatus, adres of bedrag) plus de ene, smal begrensde schrijfactie "uitzonderingsgeval markeren als afgehandeld" (sectie 5). Geen nieuwe database-entiteit — deze dienst leest en muteert de al bestaande, standaard Medusa Order-datastructuur (zie sectie 11), ze introduceert geen eigen opslag.

---

## 11. Datamodel — uitsluitend indien aantoonbaar noodzakelijk

**Uitkomst: geen enkele nieuwe database-entiteit is noodzakelijk gebleken.** Het Order Management Center leest de al impliciet bestaande, standaard Medusa Order-datastructuur (de architecturale basis die Checkout en Orderbevestiging al vooronderstellen — "N losse Order-objecten," Orderbevestiging Stap 1) en de eveneens al benoemde, uitsluitend-voor-weergave "OrderSet"-wrapper (Orderbevestiging Stap 1, expliciet *"geen nieuw Product Cloud/Commerce Cloud-concept"*). De ene toevoeging die dit document wél vastlegt, is een **statusveld voor de uitzonderingsqueue** ("ordersplitsing mislukt / afgehandeld," sectie 4–5) — geen nieuwe entiteit, uitsluitend een aanvullend veld op de al bestaande Order-datastructuur, noodzakelijk omdat Checkout dit uitzonderingsgeval al aankondigde zonder er een vastgelegde status voor te definiëren.

---

## 12. Architectuurcontrole

- ✓ **Blueprint-consistent** — vult uitsluitend een al door Checkout aangekondigd, tot nu toe niet ingevuld uitzonderingsmechanisme in ("geschil-achtige melding... voor handmatige afhandeling").
- ✓ **Checkout-consistent** — het ordersplitsingsprincipe (sectie 0, ADR 0005) en de uitzonderingsbeschrijving (sectie 5, Stap 2 — Betaling, Edge cases) zijn letterlijk hergebruikt, geen enkele regel gewijzigd; Checkout blijft eigenaar van het bestelproces zelf.
- ✓ **Orderbevestiging-consistent** — de Order-/OrderSet-structuur, de betaalstatussen, en het BTW/OSS-weergavepatroon zijn letterlijk hergebruikt; Orderbevestiging blijft eigenaar van de klantgerichte bevestigingsflow.
- ✓ **Product Cloud Architecture-consistent** — geen enkele entiteit of regel gewijzigd; het generieke AuditLogEntry-logformaat wordt hergebruikt op een ander domein, niet de entiteit zelf gewijzigd.
- ✓ **Product Management-consistent** — productgegevens worden uitsluitend samengevat/doorgelinkt.
- ✓ **Admin Shell-consistent** — registratie uitsluitend via het al bevroren generieke contract (sectie 9); geen Shell-wijziging.
- ✓ **Partner Center-consistent** — hergebruikt het "audit-op-leeshandeling"-precedent; doorlinken naar een aanbieder gebeurt zonder de rechten van Partner Center te omzeilen.
- ✓ **Marketplace Core-consistent** — van de vier in sectie 10 opgesomde functies hergebruiken drie een al bestaande, benoemde dienst (Product Cloud API, het generieke auditformaat, Notificatie-API); de ene nieuwe dienst (Order-inzage-API) is expliciet en concreet gemotiveerd (sectie 10), niet stilzwijgend toegevoegd. **Correctie na de functionele review (O2):** de eerdere versie noemde hier onjuist "acht van de negen benodigde functies" — een aantal dat niet overeenkwam met de daadwerkelijke, vier functies tellende tabel in sectie 10.
- ✓ **RBAC-consistent** — uitsluitend de bestaande Beheerder-rol, geen nieuwe rol.
- ✓ **MVP-consistent** — betalings-, fulfilment-, retour- en klantenservicefunctionaliteit blijven allemaal expliciet buiten scope; geen enkele nieuwe status of actie die dat zou impliceren, op de al door Checkout aangekondigde uitzonderingsafhandeling na.
- ✓ **Geen wijziging aan bevroren documenten** — bevestigd, zie de eindrapportage bij oplevering.

---

## 13. Zelfreview

- **Is de "uitsluitend bestaande orders beheren"-eis daadwerkelijk sluitend, of sluipt er ergens fulfilment- of betalingslogica in?** Expliciet getoetst: sectie 5 bevat één, smal begrensde schrijfactie (uitzonderingsgeval markeren als afgehandeld) die uitdrukkelijk **niet** de onderliggende betaling of levering muteert — uitsluitend een statusveld op het uitzonderingsgeval zelf. Elke andere actie is puur lezend.
- **Is de nieuwe Order-inzage-API daadwerkelijk aantoonbaar noodzakelijk, of had bestaand hergebruik volstaan?** Getoetst tegen alle acht bestaande diensten in Marketplace Core §20 — geen enkele dekt Order-/OrderSet-data; dit is geen impulsieve toevoeging maar de uitkomst van een expliciete uitsluitingstoets.
- **Is de audit-eis in sectie 7 eerlijk over haar eigen grens?** Bewust benoemd dat AuditLogEntry architecturaal een Product Cloud-concept is en Order dat niet is — in plaats van dit verschil te verdoezelen, is expliciet vastgelegd dat uitsluitend het generieke logformaat wordt hergebruikt, niet de entiteit zelf.
- **Zijn alle citaten naar Checkout en Orderbevestiging gecontroleerd, niet uit herinnering geschreven?** Ja — met name de exacte tekst van de ordersplitsings-uitzondering (Checkout sectie 5, Stap 2 — Betaling, Edge cases — bij eerste concept abusievelijk als "sectie 6" geciteerd, tijdens de eigen verwijzingscontrole gecorrigeerd) en het OrderSet-concept (Orderbevestiging Stap 1) zijn bij het schrijven rechtstreeks nagelezen.
- **Ontbreekt er iets dat de opdracht wél vroeg?** Alle dertien gevraagde onderdelen zijn aanwezig. Geen wireframes gemaakt, zoals gevraagd.

- **Zijn O1 en O2 correct en volledig opgelost?** Getoetst: O1 is gecorrigeerd naar de daadwerkelijk juiste secties (4/5), niet naar een nieuwe gok; O2 is gecorrigeerd door de eigen tabel in sectie 10 opnieuw te tellen (drie hergebruikte functies + één nieuwe dienst = vier) in plaats van een ongemotiveerd getal te herhalen.
- **Zijn O3, O4 en O5 daadwerkelijk niet aangeraakt, zoals opgedragen?** Gecontroleerd: sectie 2/3 (gemaskeerd e-mailadres "afhankelijk van rechten," O3), sectie 2 (geen OrderSet-zoekdimensie, O4), en sectie 5/6 (geen heropenmechanisme voor een afgehandeld uitzonderingsgeval, O5) zijn allemaal ongewijzigd gebleven ten opzichte van v1.0.

**Dit document is hierbij DEFINITIEF BEVROREN.**
