# EuropMade — Admin Shell &amp; Dashboard Framework (Sprint 1C)

**Status:** v1.1 — **definitief bevroren.** Verwerkt vijf goedgekeurde bevindingen (B-G1 t/m B-G5) uit de onafhankelijke generieke platformreview.
**Derde onderdeel van Sprint 1C**, bouwt uitsluitend voort op de definitief bevroren Product Cloud Architecture (v1.1) en Product Management (v1.1), plus Sprint 1A/1B (Authenticatie, Partner Onboarding, Marketplace Core, RBAC).
**Basis:** Blueprint v2.1, Product Cloud Architecture (bevroren), Product Management (bevroren), Marketplace Core (bevroren), Authenticatie-spec (bevroren, RBAC/2FA), Design System (41 componenten, definitief).
**Scope:** uitsluitend de **generieke schil** — navigatie, dashboard-raamwerk, generieke componenten. **Geen wireframes** (schermstromen op hoofdlijnen, sectie 7). Product Management, Moderation en Verification zelf worden hier **niet** opnieuw of verder uitgewerkt — die staan al vast (Product Management v1.1) of komen later; deze module orkestreert uitsluitend de toegang ertoe.
**Nadrukkelijk:** dit document wijzigt niets aan enig bevroren document, introduceert geen nieuwe rollen, geen nieuwe architectuur, en geen functionaliteit die al elders bestaat.

---

## 1. Functionele specificatie Admin Shell

### 1.1 Doel

De Admin Shell is het **generieke frame** waarbinnen elke huidige en toekomstige beheerfunctionaliteit — voor zowel interne Beheerders als geverifieerde Partners (Producent/Retailer/Distributeur) — wordt getoond. Doel: één consistente navigatie-, dashboard- en interactiestructuur, zodat elke module (Product Management, en later Moderation, Verification, Partnerbeheer, Categorie-/filterbeheer, een toekomstig Compliance Dashboard) zich hierin voegt in plaats van elk een eigen scherm-skelet te bouwen. Dit is precies het fundament dat Sprint 1B's risicobeoordeling en de UX-architectuur al signaleerden als nodig ("een gedeeld ontwerpsysteem tussen Medusa Admin-gebaseerde Beheerder-schermen en een custom Partnerdashboard") — dit document is die gedeelde schil.

### 1.2 Scope — expliciet afgebakend

**Wel:** navigatiestructuur, dashboard-raamwerk, generieke, herbruikbare componenten, globale zoekfunctie, notificatiecentrum, gebruikersmenu, rechtenmodel voor menu-zichtbaarheid.
**Niet:** de inhoud van enige specifieke module. Product Management (bevroren, v1.1) blijft de enige bron voor CRUD/versiebeheer/moderatie-/verificatiewerkstroom-logica; Moderation en Verification als zelfstandige, uitgebreide modules zijn nog niet gebouwd en worden hier niet vooruitgelopen. De Shell **verwijst naar en vat samen**, ze **herimplementeert nooit**.

### 1.3 Navigatiestructuur — drie niveaus

1. **Hoofdmenu** (module-niveau): de ingangspunten naar elke module waartoe de ingelogde gebruiker toegang heeft — bepaald door het `permissie`-veld in het registratiecontract van elke module (sectie 1.9), gefilterd tegen de rol van de ingelogde gebruiker.
2. **Submenu** (binnen een module): de onderdelen van die specifieke module, aangeleverd door de module zelf via haar eigen, interne indeling — de Shell kent geen enkel submenu-item vooraf, ze toont uitsluitend wat de module aanlevert.
3. **Contextnavigatie** (binnen een specifiek record): een generiek tab-patroon, hier op Shell-niveau vastgelegd zodat elke module dezelfde conventie hergebruikt in plaats van er zelf één te verzinnen — de tabbladen zelf worden door de module ingevuld, niet door de Shell.

### 1.4 Module-opbouw

Elke module volgt hetzelfde, verplichte sjabloon: **Shell blijft persistent zichtbaar** (header met zoek/notificaties/gebruikersmenu, hoofdmenu) → **submenu van de gekozen module** → **module-inhoud** binnen de content-ruimte van de Shell, met een breadcrumb die de huidige plek toont. Geen enkele module krijgt een eigen, afwijkende header of navigatiestructuur.

### 1.5 Breadcrumbs

Hergebruikt **CMP-003 (Breadcrumb)** — al bestaand, bevroren Design System-component, geen nieuwe variant nodig. Toont: Hoofdmenu-item > Submenu-item > (optioneel) Recordnaam. Consistent met hoe CMP-003 elders al werd toegepast.

### 1.6 Globale zoekfunctie

Eén zoekbalk in de Shell-header. De Shell kent **geen enkel entiteitstype vooraf** — elk geregistreerd module-contract (sectie 1.9) kan optioneel aangeven dat het doorzoekbaar is en levert dan zijn eigen zoekresultaten aan in een generiek, door de Shell voorgeschreven resultaatformaat (titel, type-label, deep link). De Shell groepeert uitsluitend de aangeleverde resultaten per module-contract en toont ze — ze voert zelf geen zoeklogica of entiteitskennis uit. **Permissie-consistent:** een module levert vanzelfsprekend nooit meer zoekresultaten aan dan de rol van de zoekende gebruiker al via het `permissie`-veld van dat contract zou mogen zien — dit is een verantwoordelijkheid van de module-implementatie, niet van de Shell.

### 1.7 Notificatiecentrum

Centraal, in de Shell-header. Elke module kan, via haar registratiecontract (sectie 1.9), notificaties aanleveren in een generiek, vast formaat (type, korte tekst, tijdstip, deep link). **De Shell interpreteert de inhoud van een notificatie nooit** — ze toont uitsluitend wat een module aanlevert, in ontvangstvolgorde. Welke gebeurtenis binnen een module tot een notificatie leidt, is volledig een keuze van die module zelf.

### 1.8 Gebruikersmenu

Account-gerelateerde acties: uitloggen, doorverwijzing naar accountinstellingen (waaronder 2FA-beheer — de al bevroren Authenticatie-flow, hier uitsluitend een toegangspunt naartoe, geen nieuwe functionaliteit).

### 1.9 Generiek module-registratiecontract (nieuw, verwerkt na de generieke platformreview, B-G1 t/m B-G5)

**Dit is het centrale mechanisme dat de Admin Shell daadwerkelijk, aantoonbaar module-onafhankelijk maakt.** Elke huidige of toekomstige module (Product Management nu; Moderation, Verification, Partnerbeheer, Categorie-/filterbeheer, of enige andere, nu nog onbekende toekomstige module) registreert zich bij de Shell via **precies één, vast contract** — de Shell kent geen enkele module bij naam of inhoud, uitsluitend via dit contract.

**Nadrukkelijk:** dit is een **beschrijvend registratiecontract/interface**, geen nieuwe database-entiteit — het legt vast wélke gegevens een module aan de Shell aanlevert, niet waar of hoe die gegevens worden opgeslagen (dat blijft volledig de verantwoordelijkheid van de module zelf, met haar eigen, al bestaande datamodel en API's).

Het contract bestaat uit precies de volgende, verplichte of optionele velden:

| Veld | Verplicht | Beschrijving |
|---|---|---|
| `naam` | Ja | Weergavenaam van de module in het hoofdmenu. |
| `route` | Ja | Het pad waarop de module binnen de Shell bereikbaar is. |
| `icoon` | Ja | Visuele identificatie in het hoofdmenu (Design System-icoon, geen module-specifiek beeldmateriaal). |
| `permissie` | Ja | De rol/scope die vereist is om deze module te zien — de Shell toetst dit generiek tegen de rol van de ingelogde gebruiker (RBAC, ongewijzigd), zonder ooit zelf te weten *waarom* die permissie vereist is. |
| `navigatiepositie` | Ja | Waar in het hoofdmenu de module verschijnt, relatief ten opzichte van andere geregistreerde modules. |
| `beschikbare widgets` | Nee | Eén of meer widgets (sectie 2.2) die de module aan het Dashboard kan aanleveren, elk in het generieke widgetcontract-formaat. |
| `KPI's` | Nee | Eén of meer kant-en-klare KPI-waarden (sectie 2.3) die de module aanlevert. |
| `notificatietypen` | Nee | De typen notificaties (sectie 1.7) die de module kan genereren. |
| `taken` | Nee | Kant-en-klare taken (sectie 2.4) die de module aan het Takenoverzicht aanlevert. |
| `deep links` | Nee | Verwijzingen die de module aanlevert zodat andere onderdelen van de Shell (zoekresultaten, notificaties, taken, KPI's) rechtstreeks naar een specifiek punt in de module kunnen doorlinken. |

**Het contract is de enige interactie tussen Shell en module.** De Shell leest deze velden, filtert/rangschikt/toont ze generiek (secties 1–5), en roept **nooit** een module-interne functie, database of business-API rechtstreeks aan (zie ook sectie 8, herzien). Een toekomstige, geheel onvoorziene module hoeft de Shell dus nooit te laten wijzigen — ze hoeft uitsluitend dit ene, vaste contract te vervullen.

---

## 2. Dashboard Framework

### 2.1 Opbouw

Een grid van **widgets**, samengesteld uit de widgets die geregistreerde modules aanleveren via hun contract (sectie 1.9), gefilterd op de `permissie` van de ingelogde gebruiker. Het dashboard is de eerste pagina na inloggen (ná de al bevroren, verplichte 2FA-gate voor Retailer/Producent/Beheerder). **De Shell kiest, rangschikt en toont — ze genereert nooit zelf widget-inhoud.**

### 2.2 Widgets — generiek widgetcontract (herzien, geen module-specifieke voorbeelden meer)

Een widget is, ongeacht welke module hem aanlevert, altijd één van de volgende, vaste, generieke typen. Elk type kent een vast, door de Shell voorgeschreven weergaveformaat; **de inhoud van elk veld wordt volledig en kant-en-klaar door de aanleverende module bepaald — de Shell vult of berekent nooit zelf een waarde.**

| Widgettype | Generiek contractformaat | Wat de Shell doet | Wat de Shell nooit doet |
|---|---|---|---|
| **KPI-vak** | `waarde` + `label` + optionele `trend` + `deep link` | Toont het aangeleverde veld, ongewijzigd. | Zelf een aantal berekenen, aggregeren of afleiden (zie sectie 2.3). |
| **Takenlijst-widget** | Eén of meer `taak`-items, elk met `omschrijving` + `deep link` | Toont de aangeleverde lijst, ongewijzigd, in aanlevervolgorde. | Zelf bepalen of iets een taak is, of een taakomschrijving samenstellen uit ruwe data (zie sectie 2.4). |
| **Wachtrij-samenvatting-widget** | `aantal` + `label` + `deep link` naar de volledige, elders geïmplementeerde wachtrij | Toont het aangeleverde aantal + link. | De wachtrijinhoud zelf tonen of erop rekenen (bewuste grens, ongewijzigd — zie sectie 2.5). |
| **Snelle-acties-widget** | Eén of meer `actie`-items, elk met `label` + `deep link` naar een reeds elders bestaande actie | Toont de aangeleverde shortcuts. | Een nieuwe actie uitvoeren of definiëren — uitsluitend doorlinken naar iets dat al bestaat. |

### 2.3 KPI-vakken — modules leveren kant-en-klaar, de Shell rekent nooit

**Expliciet vastgelegd, verwerkt na de generieke platformreview (B-G3, B-G5):** een KPI-waarde wordt **volledig berekend en aangeleverd door de module zelf**, via haar eigen, al bestaande business-API's (bijv. Product Cloud API voor Product Management-gerelateerde aantallen — de Shell weet dit niet, en hoeft het niet te weten). De Shell ontvangt uitsluitend het eindresultaat (`waarde` + `label` + optionele `trend` + `deep link`, sectie 2.2) via het widgetcontract en toont dit ongewijzigd. **Er bestaat geen enkel scenario waarin de Shell zelf telt, optelt, aggregeert of op andere wijze een KPI-waarde afleidt uit ruwe data.**

### 2.4 Takenoverzicht — modules leveren kant-en-klare taken, de Shell interpreteert nooit businessdata

**Expliciet vastgelegd, verwerkt na de generieke platformreview (B-G4):** een taak is, zodra hij de Shell bereikt, al een kant-en-klare, door de aanleverende module samengestelde tekst met een deep link — nooit ruwe status- of productdata die de Shell zelf tot een taak zou moeten interpreteren. Het is uitsluitend de verantwoordelijkheid van elke module om te bepalen *wat* voor die module een taak is en *hoe* die geformuleerd wordt; de Shell **kent geen enkele businessregel** over wanneer iets een taak vormt — ze toont uitsluitend de lijst zoals aangeleverd, in aanlevervolgorde.

### 2.5 Wachtrijen

De Shell toont uitsluitend een **samenvatting + doorklikmogelijkheid** (het Wachtrij-samenvatting-widgetcontract, sectie 2.2) naar een wachtrij die volledig in de betreffende module is geïmplementeerd. Dit is een bewuste, expliciete grens om dubbele functionaliteit te voorkomen — de Shell orkestreert, de module blijft de enige bron van waarheid voor de wachtrijlogica zelf. De Shell kent geen enkele wachtrij bij naam of inhoud, uitsluitend via het generieke contract.

### 2.6 Snelle acties

Contextuele shortcuts naar bestaande, elders gedefinieerde acties, aangeleverd via het Snelle-acties-widgetcontract (sectie 2.2) — puur navigatie, geen nieuwe actielogica, geen module-kennis in de Shell zelf.

### 2.7 Persoonlijke startpagina

Het dashboard zelf, samengesteld uit de widgets die de voor de ingelogde rol toegankelijke, geregistreerde modules aanleveren (sectie 1.9, sectie 4) — de eerste pagina na een succesvolle login (en, waar van toepassing, de verplichte 2FA-stap).

---

## 3. Navigatie

### 3.1 Hoofdmenu

Toont uitsluitend de modules waartoe de ingelogde rol toegang heeft (RBAC-gefilterd, sectie 4) — geen enkel niet-toegankelijk item wordt getoond (zelfs niet uitgegrijsd), consistent met het al bevroren transparantie-/beveiligingsprincipe dat toegang server-side wordt afgedwongen, niet uitsluitend cosmetisch verborgen.

### 3.2 Submenu's

Binnen elke module, de al door die module (bijv. Product Management) gedefinieerde onderdelen — de Shell verzint hier niets nieuws, ze toont wat de module al specificeert.

### 3.3 Contextnavigatie

Generiek tab-patroon (sectie 1.3) — bijv. binnen een productdetail: Overzicht/Versies/Audit-historie, exact de onderdelen die Product Management al beschrijft (CRUD, Version Management, Audit- en History-weergave), hier uitsluitend als navigatiepatroon vastgelegd.

### 3.4 Mobiele variant

Hergebruikt het al bevroren, publieke mobiele navigatiepatroon (CMP-001, hamburgermenu) — consistent visueel taalgebruik tussen het publieke platform en de Admin Shell, geen nieuw interactiepatroon bedacht. Het hoofdmenu klapt in tot een hamburgermenu; de globale zoekfunctie en het notificatiecentrum blijven als iconen zichtbaar (zelfde prioriteringsprincipe als de al bevroren publieke Header op mobiel).

---

## 4. Rechtenmodel

### 4.1 Vooraf, expliciete verduidelijking — geen nieuwe rollen

**"Moderator" en "Verificatie-reviewer" zijn geen nieuwe, formele RBAC-rollen.** De bevroren Authenticatie-spec kent voor het interne beheer uitsluitend één rol: **Beheerder** (via Medusa Admin, technisch gescheiden infrastructuur, §1.9). Dit document introduceert daarom geen nieuwe rol — "Moderator" en "Verificatie-reviewer" worden hier behandeld als **taakgerichte weergavepersona's binnen de ene Beheerder-rol**: een Beheerder kan zijn dashboard/navigatie desgewenst filteren tot uitsluitend moderatietaken of uitsluitend verificatietaken, maar heeft architecturaal altijd de volledige Beheerder-bevoegdheid. Dit is een **weergavekeuze, geen rechtenbeperking** — er wordt niets aan RBAC gewijzigd of toegevoegd.

### 4.2 Contract-gebaseerd rechtenmodel (herzien, verwerkt na de generieke platformreview, B-G2)

**De eerdere versie van dit document bevatte hier een tabel met hardgecodeerde, met naam genoemde modules — dat maakte het rechtenmodel modulegebaseerd in plaats van generiek, en zou bij elke nieuwe toekomstige module een wijziging aan dit document hebben vereist.** Hierbij vervangen door één, vast, generiek filterprincipe:

> **Elke module levert in haar registratiecontract (sectie 1.9) een `permissie`-waarde. De Shell toont het hoofdmenu-item van een module dan en slechts dan wanneer de rol van de ingelogde gebruiker aan die permissie voldoet — volgens de al bevroren, ongewijzigde RBAC-rechtenmatrix (`product-cloud-commerce-cloud-buy-box/spec.md` §4). De Shell kent geen enkele module bij naam, uitsluitend haar permissie-vereiste.**

Dit ene principe vervangt de eerdere tabel volledig en geldt identiek voor:
- **Beheerder** (volledig, of gefilterd tot een moderatie-/verificatie-persona, sectie 4.1) — ziet elke module waarvan de permissie-vereiste overeenkomt met de Beheerder-rol.
- **Producent/Merkhouder, Retailer, Distributeur** — zien elke module waarvan de permissie-vereiste overeenkomt met hun rol, doorgaans (maar niet noodzakelijk — dat bepaalt de module zelf) beperkt tot hun eigen gegevens binnen die module.

**Wat de Shell nooit doet:** zelf beoordelen of iemand toegang mag hebben tot de *inhoud* van een module — dat blijft, zoals altijd al vastgelegd, server-side afgedwongen door de module/API zelf (ADR 0005-principe, ongewijzigd). De Shell filtert uitsluitend de **zichtbaarheid van het hoofdmenu-item**, als presentatiekeuze bovenop een toegangscontrole die elders, module-eigen, al plaatsvindt.

**Illustratief, niet uitputtend of vastleggend** (om precies te voorkomen dat dit rechtenmodel opnieuw module-specifiek wordt): een module met `permissie: Beheerder` verschijnt uitsluitend voor de Beheerder-rol; een module met `permissie: Producent (eigen scope)` verschijnt voor elke Producent, met de module zelf verantwoordelijk voor het beperken tot uitsluitend eigen gegevens. Dit voorbeeld beschrijft het mechanisme, niet een vaste lijst van bestaande of toekomstige modules.

---

## 5. Dashboard-componenten — generieke, herbruikbare bouwstenen

**Voorgesteld, nog niet formeel in het Design System vastgelegd** — conform het al bestaande proces (component-registratie gebeurt vóór de bijbehorende wireframe). **Bijgewerkt na Sprint 3 P0:** voor drie Admin Shell-modules bestaan inmiddels wél wireframes (Admin Dashboard, Partnerbeheer, Moderatiewachtrij — zie `02-ux/wireframes/sprint-3-p0/`); voor de overige Admin Shell-modules (Gebruikersbeheer, Geschillenbeheer, Compliance-overzicht, Advertentie-inventorybeheer, Categorie-/filterbeheer, Commissie-instellingen, Audittrail) geldt de oorspronkelijke uitspraak nog onverkort. De onderstaande componenten worden hier functioneel gedefinieerd, elk als de visuele drager van precies één widgetcontract-type (sectie 2.2); formele CMP-registratie voor de drie nu gewireframede modules is een aparte, nog uit te voeren vervolgstap — dit document zelf voert die registratie niet uit.

| Voorgesteld component | Doel | Herbruikbaarheid |
|---|---|---|
| **Widget Card** | Generieke kaartcontainer voor elk dashboard-widget-type (rand, titel, contentruimte) | Basis voor alle onderstaande widget-typen — één visueel patroon, geen los ontwerp per widget. |
| **KPI-vak** | Toont een aangeleverde `waarde` + `label` + optionele `trend` + `deep link` (sectie 2.3) | Herbruikt door elke module die een KPI-waarde aanlevert via haar contract — de component kent geen enkele module bij naam. |
| **Takenlijst-item** | Toont één aangeleverd `taak`-item (sectie 2.4) | Generiek voor elke rol/module; content verschilt, structuur niet. |
| **Wachtrij-samenvatting-kaart** | Toont een aangeleverd `aantal` + `label` + `deep link` naar een elders geïmplementeerde wachtrij (sectie 2.5) | Voorkomt dat elke toekomstige wachtrij-houdende module een eigen samenvattingsweergave hoeft te bouwen. |
| **Notificatie-item** | Toont een door een module aangeleverde notificatie (type/tekst/tijdstip/deep link, sectie 1.7) | Generiek voor elk notificatietype, ongeacht welke module het aanlevert. |
| **Zoekresultaatgroep** | Groepeert de door elk module-contract aangeleverde zoekresultaten (sectie 1.6) | Herbruikt bij elk toekomstig, doorzoekbaar module-contract. |
| **Snelle-actie-knop** | Toont een aangeleverd `actie`-item (sectie 2.6) | Generiek shortcut-patroon, geen eigen actielogica. |

**Nadrukkelijk geen nieuwe componenten voor:** breadcrumb (CMP-003, bestaand), knoppen (CMP-005, bestaand), badges/statuslabels (CMP-008, bestaand), formuliervelden (CMP-006, bestaand) — de Admin Shell hergebruikt deze onveranderd.

---

## 6. Layout-richtlijnen

Op hoofdlijnen, geen visueel ontwerp (kleur/typografie blijven, zoals overal in het Design System, bewust placeholder tot de latere merkfase):

- **Persistente header:** logo, globale zoekfunctie, notificatiecentrum, gebruikersmenu — altijd zichtbaar, ongeacht welke module actief is.
- **Persistent hoofdmenu:** zij- of bovenbalk (exacte plaatsing een implementatiedetail, geen architecturale keuze), RBAC-gefilterd (sectie 4).
- **Contentruimte:** breadcrumb bovenaan, daaronder de actieve module-inhoud.
- **Dashboard-grid:** widgets in een grid dat zich aanpast aan het aantal voor de rol relevante widgets — geen vaste, voor elke rol identieke indeling, want een Producent en een Beheerder hebben wezenlijk andere widget-sets (sectie 2, sectie 4).
- **Responsief gedrag:** hoofdmenu klapt in tot hamburgermenu op mobiel (sectie 3.4); widgets stapelen verticaal in plaats van naast elkaar — zelfde responsieve grondprincipes als al bevroren voor het publieke platform (Marketplace Template, Focused Flow Template), hier toegepast op een nieuw templatetype (het "Dashboard Template," al benoemd in de UX-architectuur maar tot nu toe niet ingevuld).

---

## 7. UX-flow — schermstromen (geen definitieve wireframes)

1. **Inloggen** (bevroren Authenticatie-flow) → bij Retailer/Producent/Beheerder: verplichte 2FA-stap (bevroren) → **Dashboard** (persoonlijke startpagina, rolafhankelijk).
2. **Vanuit het Dashboard:** klik op een KPI-vak of Wachtrij-samenvatting-widget → diepe link naar de betreffende module/wachtrij (bijv. Product Management-verificatiewachtrij) — Shell blijft zichtbaar, alleen de contentruimte + breadcrumb wijzigen.
3. **Vanuit het hoofdmenu:** kies een module → submenu van die module verschijnt → kies een submenu-item → module-inhoud laadt in de contentruimte.
4. **Binnen een record** (bijv. een productdetail): contextnavigatie (tabbladen) laat wisselen tussen Overzicht/Versies/Audit-historie zonder de Shell te verlaten.
5. **Globale zoekfunctie:** typen in de zoekbalk → gegroepeerde resultaten verschijnen → klik op een resultaat → diepe link naar het juiste record in de juiste module.
6. **Notificatiecentrum:** klik op het notificatie-icoon → lijst van recente notificaties → klik op een notificatie → diepe link naar de relevante wachtrij/record.
7. **Gebruikersmenu:** klik → uitloggen, of doorverwijzing naar accountinstellingen (2FA-beheer, bevroren flow).

**Nadrukkelijk:** dit is een functionele flowbeschrijving, geen schermontwerp — exacte lay-out, componentplaatsing en Design System-toepassing volgen in de wireframe-fase, ná akkoord op dit document.

---

## 8. API-koppelingen (herzien, verwerkt na de generieke platformreview, B-G3)

**Kernregel, expliciet vastgelegd:** de Admin Shell spreekt **uitsluitend het generieke module-registratiecontract aan (sectie 1.9) — nooit rechtstreeks een achterliggende business-API.** De eerdere versie van dit document koppelde specifieke Shell-functies rechtstreeks aan specifieke, met naam genoemde diensten (bijv. "KPI-/takendata → Product Cloud API") — dat maakte de Shell impliciet afhankelijk van kennis over welke module welke dienst gebruikt, wat precies de module-onafhankelijkheid ondermijnt die dit document moet waarborgen.

**Hoe het daadwerkelijk werkt, laag voor laag:**

1. **Elke module** gebruikt, zoals altijd al vastgelegd en ongewijzigd, haar eigen, al bestaande business-API's (bijv. Product Management gebruikt de Product Cloud API, de Claim-/eigenaarschap-API, de Admin-moderatie-API — exact zoals vastgelegd in `product-management/spec.md` §10, hier niet gewijzigd).
2. **Diezelfde module** vertaalt de uitkomst van die API-aanroepen naar de vaste, generieke contractvelden (widgets, KPI's, notificatietypen, taken, deep links — sectie 1.9) — dit vertaalwerk gebeurt **binnen de module**, niet in de Shell.
3. **De Shell** roept nooit een business-API aan en kent geen enkele business-API bij naam — ze leest uitsluitend het resultaat van stap 2, het module-contract, en toont dat generiek.

**Consequentie:** een toekomstige module met een geheel nieuwe, nu nog onbekende business-API (bijv. een toekomstig advertentieplatform) vereist **op geen enkel punt** een wijziging aan dit document of aan de Shell zelf — de nieuwe module hoeft uitsluitend, net als elke bestaande module, het al vaste contract te vervullen.

**Nadrukkelijk geen nieuwe API of dienst geïntroduceerd** — dit is uitsluitend een verduidelijking van de laag waarop de Shell aansluit (het contract), niet een wijziging aan enige bestaande, bevroren dienst (Marketplace Core §20, Product Management §10 blijven onaangeroerd).

---

## 9. Datamodel — uitsluitend indien noodzakelijk

**Uitkomst: geen enkele nieuwe entiteit is noodzakelijk gebleken — ook het module-registratiecontract (sectie 1.9) niet.** Het contract is een **beschrijvend interfaceformaat** (welke velden een module aanlevert), geen database-tabel of persistente entiteit — het legt vast *wat* een module aanlevert, niet *waar* dat wordt opgeslagen. De Admin Shell is en blijft een zuivere weergave-/navigatielaag bovenop reeds bestaande, bevroren gegevens (Product Cloud Architecture, Product Management, Marketplace Core) — er is geen Shell-eigen, persistente data die nog niet ergens anders al bestaat. Widgetsamenstelling per rol volgt uit de al bevroren rechtenmatrix (RBAC), niet uit een nieuw te bewaren gebruikersvoorkeur. Persoonlijke widget-aanpassing (bijv. een gebruiker die zelf widgets herschikt) is bewust **niet** meegenomen — dat zou een nieuwe, persistente voorkeursinstelling vereisen en valt daarmee buiten de MVP-scope (consistent met de opdracht-eis "geen uitbreiding van de MVP-scope").

---

## 10. Architectuurcontrole

- ✓ **Blueprint-consistent** — geen enkel proces in dit document wijkt af van wat al vastligt; het "Dashboard Template" dat de UX-architectuur al benoemde (maar nooit invulde) wordt hier voor het eerst concreet ingevuld, niet gewijzigd.
- ✓ **Product Cloud Architecture-consistent** — geen enkele architecturale regel gewijzigd; de Shell leest uitsluitend al bestaande statussen/entiteiten voor weergave, nu expliciet via het generieke contract in plaats van directe kennis van die statussen.
- ✓ **Product Management-consistent** — geen dubbele functionaliteit: de moderatie-/verificatiewachtrijen blijven volledig in Product Management gespecificeerd, de Shell toont uitsluitend een samenvatting + link (sectie 2.5), nu via het contract (sectie 1.9) in plaats van een directe verwijzing naar Product Management-interne wachtrijnamen.
- ✓ **Marketplace Core-consistent** — alle achterliggende business-API's blijven exact zoals bevroren; de Shell zelf spreekt uitsluitend het module-contract aan (sectie 8, herzien) — geen enkele bevroren dienst gewijzigd.
- ✓ **Authenticatie-/RBAC-consistent** — geen nieuwe rol geïntroduceerd (sectie 4.1, expliciet gemotiveerd); het rechtenmodel is nu contract-gebaseerd (sectie 4.2, herzien) in plaats van een hardgecodeerde, modulegebaseerde tabel — nog steeds geen enkele wijziging aan de onderliggende RBAC-rechtenmatrix.
- ✓ **MVP-consistent** — persoonlijke dashboard-aanpassing bewust buiten scope gehouden (sectie 9); geen enkele functionaliteit uit een latere module vooruit gebouwd; het registratiecontract zelf voegt geen nieuwe functionaliteit toe, uitsluitend een generiek interfaceformaat voor wat al bestond.
- ✓ **Geen wijziging aan bevroren documenten** — bevestigd, zie de eindrapportage bij oplevering.
- ✓ **Generieke platformreview verwerkt** — vijf bevindingen (B-G1 t/m B-G5) volledig verwerkt: B-G1 (module-registratiecontract, sectie 1.9, nieuw), B-G2 (rechtenmatrix contract-gebaseerd, sectie 4.2, herzien), B-G3 (API-koppeling uitsluitend via het contract, sectie 8, herzien), B-G4 (Shell interpreteert nooit businessdata voor taken, sectie 2.4, herzien), B-G5 (widgetcontract expliciet los van elk specifiek module-voorbeeld, sectie 2.2, herzien).

---

## 11. Zelfreview

- **Is dit daadwerkelijk uitsluitend een generieke schil, geen verkapte heruitwerking van Product Management?** Ná verwerking van de generieke platformreview nog sterker geborgd dan voorheen: nergens in dit document staat een module-naam meer als vereiste voor enige Shell-functie — het contract (sectie 1.9) is de enige interactie, en dat contract kent geen enkele module bij naam.
- **Is het registratiecontract (sectie 1.9) daadwerkelijk voldoende om een geheel onvoorziene, toekomstige module zonder wijziging aan dit document op te nemen?** Getoetst tegen elk onderdeel van de Shell: navigatie (permissie + route + icoon + navigatiepositie), dashboard (widgets/KPI's/taken/notificaties/deep links), rechtenmodel (uitsluitend permissie), API-koppeling (uitsluitend het contract, nooit een specifieke dienst) — elk onderdeel van de Shell leest uitsluitend contractvelden, nooit module-specifieke kennis. Een nieuwe module hoeft het contract te vervullen, niet dit document te laten wijzigen.
- **Is de grens "modules leveren kant-en-klaar, de Shell berekent/interpreteert nooit" nu overal consistent doorgevoerd, niet alleen op de plekken waar de review dat aanwees?** Gecontroleerd op alle vijf de widgetcontract-typen (sectie 2.2) plus de aparte, uitgeschreven bevestiging bij KPI's (2.3) en taken (2.4) — consistent, geen uitzondering gevonden.
- **Houdt de rolverduidelijking (sectie 4.1) nog steeds stand, ook ná de contract-gebaseerde herziening van sectie 4.2?** Ja — sectie 4.1 (geen nieuwe rollen) en sectie 4.2 (contract-gebaseerde filtering) zijn onafhankelijke, elkaar niet tegensprekende principes: de ene legt vast wélke rollen bestaan, de andere hóe zichtbaarheid daarvan wordt afgeleid — beide ongewijzigd correct na de herziening.

**Dit document is hierbij DEFINITIEF BEVROREN.**
