# EuropMade — Partner Center: Functionele Specificatie (Sprint 1C)

**Status:** v1.1 — **definitief bevroren.** Verwerkt één goedgekeurde bevinding (P1) uit de onafhankelijke functionele review; P2, P3, P4 en P5 bewust niet verwerkt, op uitdrukkelijk verzoek.
**Zesde onderdeel van Sprint 1C**, bouwt uitsluitend voort op de definitief bevroren Product Cloud Architecture (v1.1), Product Management (v1.1), Admin Shell & Dashboard Framework (v1.1), Moderation Center (v1.1) en Verification Center (v1.1), plus Sprint 1A/1B (Authenticatie, Partner Onboarding, Marketplace Core, RBAC).
**Basis:** Partner Onboarding (bevroren, §1.1 rollen, §1.2 statusovergangen, §3 EU-productieverificatie, Beveiligingseisen-audit logging), Product Cloud Architecture Deel 4 (Producteigendom), Deel 9.3 (fraudedetectie/escalatiepad) — bevroren, Product Management (bevroren), Admin Shell §1.9/§4.2 — bevroren, Moderation Center §5/§6 (F6, "Geëscaleerd") — bevroren, Verification Center (bevroren), Marketplace Core §20 (API-overzicht) — bevroren.
**Scope:** een **nieuw, generiek overzichts- en detailscherm** voor reeds goedgekeurde partneraccounts — geen enkel document had dit vóór dit document concreet ingevuld (Admin Shell noemde "Partnerbeheer, scherm #55" herhaaldelijk als nog te bouwen). **Geen nieuwe onderliggende business-logica, geen nieuwe entiteiten, geen nieuwe API's** — dit document aggregeert en toont uitsluitend gegevens die elders al bevroren zijn vastgelegd.
**Nadrukkelijk:** dit document wijzigt niets aan enig bevroren document. **Het Partner Center beheert uitsluitend bestaande, al goedgekeurde partners** — onboarding, verificatie en moderatie blijven volledig buiten scope, elk in hun eigen, al bevroren module.

---

## 1. Doel en scope

### 1.1 Doel

Het Partner Center is de werkomgeving waar een Beheerder reeds goedgekeurde partneraccounts (Retailer, Producent/Merkhouder, Distributeur — Partner Onboarding §1.1) kan **overzien en inzien**. Het vult het "Admin-skelet — Partnerbeheer, scherm #55" in dat in de projectroadmap en in Admin Shell §1 herhaaldelijk als nog te bouwen werd genoemd.

### 1.2 Scope — expliciet afgebakend

**Wel:**
- Overzicht van alle partners met status "Goedgekeurd" (Partner Onboarding §1.2).
- Detailweergave per partner: bedrijfsgegevens, rol(len), bedrijfsniveau-verificatiestatus, gekoppelde producten en hun Verified-status, openstaande/afgehandelde moderatie-items, audit-historie.
- Zoeken en filteren binnen het partneroverzicht.
- Doorlinken (deep links) naar de module waar een onderliggend proces daadwerkelijk plaatsvindt.

**Niet:**
- **Onboarding** — het volledige aanvraag-/beoordelingsproces (Concept → Ingediend → In beoordeling → Goedgekeurd/Afgekeurd, Partner Onboarding §1.2) blijft volledig in Partner Onboarding. Het Partner Center toont uitsluitend het **resultaat** (een reeds goedgekeurde partner), het herhaalt of beoordeelt nooit een aanvraag.
- **Verification** — productverificatie-aanvragen en -beoordelingen blijven volledig in Verification Center (v1.1). Het Partner Center toont uitsluitend een **samenvatting** (aantal geverifieerde producten van deze partner), nooit de beoordeling zelf.
- **Moderation** — claims, geschillen, fraude-signalen blijven volledig in Moderation Center (v1.1). Het Partner Center toont uitsluitend een **samenvatting** van items die deze partner betreffen, nooit de behandeling zelf.
- **Partner Lifecycle Management** (schorsen, deactiveren, opnieuw beoordelen van de onboarding-beslissing) en **rol toevoegen aan een bestaand partneraccount** — beide zijn **bewust, herhaaldelijk en expliciet buiten de MVP-scope gehouden** in drie eerder bevroren documenten (Partner Onboarding, "Bewust niet verwerkte aanbevelingen" en "Openstaand punt"; Product Cloud Architecture Deel 9.3, escalatiepad "raakt... Partner Lifecycle Management... wordt hier niet opnieuw uitgewerkt"; Moderation Center §5/§6, "Geëscaleerd" als lokaal eindpunt zonder vervolgmechanisme). Dit document introduceert **geen** nieuw mechanisme hiervoor — dat zou nieuwe architectuur zijn, expliciet verboden door de opdracht.
- **Shell-functionaliteit** — het Partner Center implementeert geen navigatie, dashboard-mechaniek of componenten; het registreert zich uitsluitend via het al bevroren, generieke modulecontract (sectie 9).

---

## 2. Partneroverzicht

Een doorzoekbare, filterbare lijst van alle partners met Partner Onboarding-status "Goedgekeurd":

- **Zoeken:** op bedrijfsnaam, contactgegevens (velden die al bij Partner Onboarding zijn vastgelegd, hier uitsluitend doorzoekbaar gemaakt, geen nieuw veld).
- **Filteren:** op rol (Retailer/Producent-Merkhouder/Distributeur — meervoudig, consistent met Partner Onboarding §1.1's "rollen zijn optelbaar"), op land, op aanwezigheid van openstaande moderatie-items (samenvattend, sectie 3).
- **Kolommen (samengevat, elk element leest uitsluitend uit een al bestaande bron):** bedrijfsnaam, rol(len), datum goedkeuring (Partner Onboarding), aantal actieve producten (Product Management), aantal geverifieerde producten (Verification Center), 2FA-status (Authenticatie-spec — verplicht voor Retailer/Producent, al bevroren regel), openstaande moderatie-items (Moderation Center, aantal, geen inhoud).

**Nadrukkelijk geen nieuwe telling of berekening in het Partner Center zelf** — elk kolomgegeven wordt kant-en-klaar aangeleverd door de module die de brondata bezit (zelfde principe als Admin Shell's widgetcontract, Admin Shell §2.2–2.3, hier toegepast op een tabelweergave in plaats van een dashboard-widget).

---

## 3. Partnerdetail

Een aggregerende, uitsluitend lezende weergave — geen enkel veld hier is bewerkbaar vanuit het Partner Center:

1. **Bedrijfsgegevens** — zoals vastgelegd bij Partner Onboarding (bedrijfsnaam, KvK-/BTW-gegevens, IBAN/uitbetalingsgegevens) — read-only, bewerking blijft (indien ooit nodig) een onderwerp voor een toekomstige, hier niet uitgewerkte iteratie.
2. **Rol(len)** — Retailer/Producent-Merkhouder/Distributeur, zoals toegekend bij goedkeuring (Partner Onboarding §1.2).
3. **Bedrijfsniveau-verificatiestatus (Laag 1, "Verified Made in Europe")** — status en datum laatste hercontrole (Partner Onboarding §3, hergebruikt zoals ook Verification Center dat al deed voor Laag 2).
4. **Gekoppelde producten** — aantal, met deep link naar het gefilterde productoverzicht van deze partner in Product Management; per product de publicatie- en verificatiestatus (Product Cloud Architecture Deel 8.1) uitsluitend als samenvatting, nooit hier bewerkbaar.
5. **Moderatie-samenvatting** — aantal openstaande en afgehandelde items (claims, geschillen, fraude-signalen) die deze partner betreffen, met deep link naar het betreffende item in Moderation Center; **inclusief zichtbaarheid van een eventuele "Geëscaleerd"-status** (Moderation Center §5) als informatief signaal — het Partner Center behandelt deze escalatie niet, toont haar uitsluitend.
6. **Audit-historie** — directe link naar de relevante AuditLogEntry-tijdlijn (Product Cloud Architecture Deel 3.1/8.5), gefilterd op deze partner.
7. **2FA-status** — actief/niet actief (Authenticatie-spec, verplicht voor deze rollen) — uitsluitend ter informatie, het Partner Center kan dit niet forceren of wijzigen.

---

## 4. Partnerstatussen

**Hergebruikt exact het al bevroren statusmodel van Partner Onboarding (§1.2) — geen enkele nieuwe status:**

```
(Partner Onboarding, buiten dit document) ... → Goedgekeurd
```

Het Partner Center toont uitsluitend partners in status **Goedgekeurd** — een Afgekeurde aanvraag heeft nooit een partneraccount opgeleverd en valt daarmee buiten "bestaande partners" (sectie 1.2).

**Expliciet vastgelegd, geen verborgen aanname:** er bestaat in de bevroren architectuur **geen enkele status ná Goedgekeurd** (bijv. "Geschorst," "Inactief," "Beëindigd"). Dit is geen omissie van dit document — het is een bewuste, driemaal eerder vastgelegde keuze (Partner Onboarding, Product Cloud Architecture Deel 9.3, Moderation Center §5/§6) om Partner Lifecycle Management buiten de MVP-scope te houden. Het Partner Center **introduceert deze status niet alsnog** — dat zou nieuwe architectuur zijn, wat de opdracht expliciet uitsluit.

---

## 5. Partneracties

**Bewust beperkt tot lezen en doorverwijzen — geen enkele muterende actie**, rechtstreeks gevolg van sectie 4 (geen lifecycle-mechanisme bestaat):

| Actie | Beschrijving | Muteert iets? |
|---|---|---|
| Bekijken | Partneroverzicht en -detail raadplegen (secties 2–3) | Nee |
| Zoeken/filteren | Binnen het partneroverzicht (sectie 2) | Nee |
| Doorlinken naar Product Management | Naar de productenlijst van deze partner | Nee (opent een andere module, muteert daar niets vanuit het Partner Center zelf) |
| Doorlinken naar Verification Center | Naar de verificatie-aanvragen van deze partner | Nee |
| Doorlinken naar Moderation Center | Naar de moderatie-items van deze partner | Nee |

**Uitdrukkelijk geen actie voor:** schorsen, deactiveren, rol toevoegen of wijzigen, de onboarding-beslissing herzien, of enige andere mutatie van het partneraccount zelf. Dit is geen onvolledigheid van dit document — het is de directe, consistente toepassing van een grens die al drie keer eerder is vastgelegd (sectie 1.2, sectie 4).

---

## 6. Beslisregels

- **Een partner verschijnt in het Partner Center dan en slechts dan wanneer de Partner Onboarding-status "Goedgekeurd" is** — geen enkele andere status wordt hier getoond.
- **Het Partner Center wijzigt nooit een partnerstatus, rol, of onderliggend gegeven** — het is uitsluitend een leeslaag, consistent met de expliciete "geen mutatie"-uitkomst van sectie 5.
- **Elke deep link naar een andere module respecteert de rechten van die module zelf** — het Partner Center geeft nooit "achterdeur"-toegang tot functionaliteit die de doelmodule zelf niet zou toestaan. **Correctie na de functionele review (P1):** het eerdere voorbeeld suggereerde ten onrechte dat de Moderator-/Verificatie-reviewer-taakfocus (Admin Shell §4.1) een daadwerkelijk rechtenverschil zou zijn — dat is onjuist. Admin Shell §4.1 legt expliciet vast dat deze taakfocus uitsluitend een **weergavekeuze** is: een Beheerder heeft **altijd** de volledige Beheerder-bevoegdheid, ongeacht welke taakfocus actief is. Een correct voorbeeld: een Beheerder ziet via een deep link vanuit het Partner Center naar Verification Center exact dezelfde inhoud die diezelfde Beheerder ook zou zien bij het rechtstreeks openen van Verification Center — niet meer én niet minder, onafhankelijk van enige taakfocus-instelling.
- **Een "Geëscaleerd"-fraudesignaal (Moderation Center) wordt in het Partner Center uitsluitend als signaal getoond, nooit hier afgehandeld** — consistent met het al bevroren escalatiepad (Product Cloud Architecture Deel 9.3: "raakt... Partner Lifecycle Management... wordt hier niet opnieuw uitgewerkt").
- **Geen enkele telling/aggregatie (aantal producten, aantal moderatie-items) wordt door het Partner Center zelf berekend** — elke waarde wordt kant-en-klaar aangeleverd door de module die de brondata bezit (zelfde principe als Admin Shell's widgetcontract, hier consistent doorgetrokken naar tabelweergaven).

---

## 7. Auditregistratie

**Elke toegang tot partnerdetailgegevens wordt gelogd** — hergebruikt exact de al bevroren beveiligingseis uit Partner Onboarding ("Elke toegang tot een geüpload document (wie, wanneer, welk document) wordt gelogd — maakt controleerbaar wie een identiteitsbewijs heeft ingezien, relevant bij een geschil of controle"), hier toegepast op de partnerdetailweergave als geheel: wie het partnerdetail heeft geopend, wanneer, en welke partner — een regel in de al bevroren, centrale **AuditLogEntry** (Product Cloud Architecture Deel 3.1/8.5). Het Partner Center **voegt geen nieuwe auditstructuur toe** — het past de al bestaande verplichting toe op een leeshandeling, precies omdat de getoonde gegevens (bedrijfsgegevens, IBAN, verificatiestatus) gevoelig genoeg zijn om dezelfde eis te verdienen die Partner Onboarding al aan de onderliggende documenten stelde.

---

## 8. Rechten en zichtbaarheid

- **Uitsluitend de Beheerder-rol** heeft toegang tot het Partner Center — geen nieuwe rol, geen nieuwe RBAC-regel.
- **Producent/Merkhouder, Retailer en Distributeur hebben geen enkele toegang tot het Partner Center** — een partner ziet zijn eigen gegevens via de al bevroren, eigen kanalen (Product Management voor eigen producten, de eigen accountpagina voor bedrijfsgegevens — buiten dit document).
- **Contract-gebaseerde zichtbaarheid in de Admin Shell:** het Partner Center registreert zich met `permissie: Beheerder` (Admin Shell §1.9) — het hoofdmenu-item is uitsluitend zichtbaar voor die rol, exact volgens het al bevroren, generieke filterprincipe (Admin Shell §4.2).

---

## 9. Admin Shell-registratiecontract

**Uitsluitend registratie, geen Shell-implementatie** — naar het concrete precedent van Moderation Center en Verification Center:

```
naam: "Partner Center"
route: /admin/partners
icoon: (Design System-icoon, generiek — geen nieuw icoon nodig)
permissie: Beheerder
navigatiepositie: (naast overige Beheerder-modules, incl. Moderation Center en Verification Center)
beschikbare widgets: 1× KPI-vak (totaal aantal goedgekeurde partners) — optioneel, kant-en-klaar berekend dóór deze module, nooit door de Shell
KPI's: optioneel — bijv. totaal aantal partners met een openstaande moderatie-escalatie
notificatietypen: n.v.t. (het Partner Center genereert zelf geen notificaties — het is een leesmodule)
taken: n.v.t. (geen actie vereist een taakregel, aangezien er geen muterende actie bestaat)
deep links: naar elk individueel partnerdetail vanuit een zoekresultaat elders in het platform
```

**Consistent met de al bevroren regel (Admin Shell §8):** de Shell roept nooit een van de onderliggende business-API's rechtstreeks aan — het Partner Center gebruikt ze zelf, en levert uitsluitend het resultaat via het contract. Geen enkele Shell-wijziging is nodig of voorgesteld.

---

## 10. API-gebruik

**Geen nieuwe API, geen nieuwe database-entiteit** — getoetst en bevestigd, zie sectie 11 en 12.

| Partner Center-functie | Bestaande API/entiteit (ongewijzigd) |
|---|---|
| Partnergegevens, rol(len), bedrijfsniveau-verificatiestatus | **Claim-/eigenaarschap-API** (Marketplace Core §20) |
| Gekoppelde producten en hun status | **Product Cloud API** (Marketplace Core §20) |
| Verificatie-samenvatting per partner | **Claim-/eigenaarschap-API** (zelfde dienst als Verification Center gebruikt, geen nieuwe koppeling) |
| Moderatie-samenvatting per partner | **Admin-moderatie-API** (Marketplace Core §20) — uitsluitend voor de samenvatting, niet voor de behandeling zelf |
| Auditregistratie (weergave én de eigen toegangslog, sectie 7) | **Product Cloud API** (AuditLogEntry, Product Cloud Architecture Deel 3.1) |

**Nadrukkelijk niet gebruikt:** de Notificatie-API — het Partner Center genereert zelf geen notificaties, consistent met sectie 9.

---

## 11. Datamodel — uitsluitend indien aantoonbaar noodzakelijk

**Uitkomst: geen enkele nieuwe entiteit is noodzakelijk gebleken.** Het Partner Center leest uitsluitend al bestaande, bevroren gegevens: partner-/eigendomsgegevens (OwnershipRecord en de bij Partner Onboarding vastgelegde bedrijfsgegevens), VerificationProductRecord (Verification Center), Claim/Dispute/ModerationCase (Moderation Center), en AuditLogEntry — geen van deze wordt door dit document gewijzigd of uitgebreid. Er is geen Partner Center-eigen, persistente data.

---

## 12. Architectuurcontrole

- ✓ **Blueprint-consistent** — vult uitsluitend het al aangekondigde "Partnerbeheer, scherm #55" in, geen nieuw concept.
- ✓ **Partner Onboarding-consistent** — hergebruikt het statusmodel (§1.2), de rollen (§1.1) en de audit-logging-eis (Beveiligingseisen) letterlijk, zonder wijziging; de twee expliciet bevroren, buiten-scope-gehouden onderwerpen (Partner Lifecycle Management, rol toevoegen aan bestaand account) blijven ook in dit document buiten scope.
- ✓ **Product Cloud Architecture-consistent** — geen enkele entiteit of regel gewijzigd; het escalatiepad (Deel 9.3) wordt uitsluitend zichtbaar gemaakt, niet opnieuw uitgewerkt.
- ✓ **Product Management-consistent** — productgegevens worden uitsluitend samengevat/doorgelinkt, nooit hier beheerd.
- ✓ **Admin Shell-consistent** — registratie uitsluitend via het al bevroren generieke contract (sectie 9); geen Shell-wijziging. **Functionele review verwerkt (P1):** het voorbeeld bij de deep-link-beslisregel (sectie 6) sprak eerder het Admin Shell §4.1-principe tegen dat taakfocus/persona geen rechtenbeperking is — gecorrigeerd naar een voorbeeld dat wél consistent is met "altijd de volledige Beheerder-bevoegdheid, ongeacht taakfocus."
- ✓ **Moderation Center-consistent** — geen enkel moderatie-itemtype wordt hier behandeld, uitsluitend samengevat; de "Geëscaleerd"-status wordt getoond, niet opnieuw afgehandeld.
- ✓ **Verification Center-consistent** — geen enkele verificatiebeoordeling wordt hier gedaan, uitsluitend samengevat.
- ✓ **Marketplace Core-consistent** — alle API's hergebruikt zoals al benoemd (§20); de Notificatie-API is bewust niet gebruikt.
- ✓ **RBAC-consistent** — uitsluitend de bestaande Beheerder-rol, geen nieuwe rol.
- ✓ **MVP-consistent** — Partner Lifecycle Management en rol-toevoeging blijven, voor de derde keer consistent, buiten scope; geen nieuwe status, geen nieuwe actie die dat zou impliceren.
- ✓ **Geen wijziging aan bevroren documenten** — bevestigd, zie de eindrapportage bij oplevering.

---

## 13. Zelfreview

- **Is de "uitsluitend bestaande partners beheren"-eis daadwerkelijk sluitend doorgevoerd, of sluipt er ergens een lifecycle-actie in?** Expliciet getoetst: sectie 5 bevat letterlijk geen enkele muterende actie; sectie 4 legt uit *waarom* dat zo is (drie eerdere, bevroren bronnen) in plaats van het stilzwijgend te laten. Dit was de grootste verleiding bij het schrijven van dit document — een "Partnerbeheer"-scherm zonder één beheeractie voelt onvolledig, maar elke geprobeerde toevoeging (schorsen, rol wijzigen) zou direct de opdracht-eis "geen nieuwe architectuur" hebben geraakt.
- **Is de audit-eis in sectie 7 een eerlijke toepassing van een bestaand principe, of een nieuwe eis?** Getoetst: de exacte brontekst uit Partner Onboarding's Beveiligingseisen is hergebruikt, uitsluitend toegepast op een nieuw soort toegang (partnerdetailweergave in plaats van documentweergave) — geen nieuwe eis, een consistente toepassing van een al bevroren principe op een vergelijkbaar gevoelig gegeven.
- **Introduceert dit document ergens een nieuwe entiteit of API?** Getoetst: nee, zie sectie 10/11 — elke functie is toegewezen aan een al bestaande, benoemde dienst.
- **Zijn alle citaten naar Partner Onboarding, Product Cloud Architecture en Moderation Center gecontroleerd, niet uit herinnering geschreven?** Ja — met name de exacte tekst van de "Bewust niet verwerkte aanbevelingen" en "Openstaand punt" uit Partner Onboarding, en de exacte escalatiepad-tekst uit Product Cloud Architecture Deel 9.3, zijn bij het schrijven rechtstreeks nagelezen.
- **Ontbreekt er iets dat de opdracht wél vroeg?** Alle dertien gevraagde onderdelen zijn aanwezig. Geen wireframes gemaakt, zoals gevraagd.

- **Is P1 correct en volledig opgelost, niet slechts verzacht?** Getoetst: het gecorrigeerde voorbeeld stelt nu expliciet dat de Beheerder "exact dezelfde inhoud" ziet "onafhankelijk van enige taakfocus-instelling" — dit is een directe, ondubbelzinnige herformulering in lijn met Admin Shell §4.1's letterlijke tekst, geen afgezwakte versie van de oude, onjuiste suggestie.
- **Zijn P2 t/m P5 daadwerkelijk niet aangeraakt, zoals opgedragen?** Gecontroleerd: sectie 11 (OwnershipRecord-toewijzing, P2), sectie 1.2 (ontbrekende Authenticatie-grens, P3), sectie 8 ("eigen accountpagina," P4), en sectie 7 (auditscope, P5) zijn allemaal ongewijzigd gebleven ten opzichte van v1.0.

**Dit document is hierbij DEFINITIEF BEVROREN.**
