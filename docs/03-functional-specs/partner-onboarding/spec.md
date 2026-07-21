# EuropMade — Partner Onboarding: Architectuuranalyse & Functionele Specificatie

**Status:** v1.1 — **definitief bevroren.** Vierde onderdeel van Sprint 1B.
**Basis:** Blueprint v2.1 (H9.3, H9.4, H9.5, H6.8–6.10, H7.9), UX-architectuur (schermen #26–28; #29 Verzendinstellingen bewust buiten scope), Design System (41 componenten, definitief), functionele spec Product Cloud/Commerce Cloud/Buy Box, Marketplace Core-spec (Retailer Created end-to-end flow), Authenticatie-spec (bevroren — rollen, RBAC, 2FA), ADR 0001–0005.
**Nadrukkelijk:** Homepage, Categorie, Zoekresultaten, Productpagina, Winkelwagen, Checkout, Orderbevestiging en de Authenticatie-flow (incl. 2FA) zijn allemaal bevroren en worden door dit document niet gewijzigd.
**Sprint 1B-risicobeoordeling:** dit onderdeel was al aangewezen als "grootste, meest architecturaal risicovolste blok van Sprint 1B" (`06-development/sprint-1b-architecture-risk-assessment.md`) — dit document geeft daar nu de volledige, gevraagde diepgang aan.

---

## Stap 1 — Architectuuranalyse

### 1.1 Rollen (bevestigd vanuit Blueprint Tabel 9.1)

| Rol | Belangrijkste rechten | Selecteerbaar in dit onboardingscherm? |
|---|---|---|
| **Producent/Merkhouder** | Beheer officiële productinformatie (Product Cloud) | Ja — **één** gecombineerde keuze, geen aparte "Merkhouder"-optie. De Blueprint behandelt Producent en Merkhouder als dezelfde rol (identieke rij, identieke rechten, H9.3) — een merkhouder die niet zelf produceert, valt onder exact dezelfde rol als een producent die dat wel doet. |
| **Retailer** | Producten verkopen, commerciële gegevens beheren; tijdelijk ook productinformatie bij zelf aangemaakte producten (Retailer Created) | Ja. |
| **Distributeur** | Producten verkopen namens merken | **Ja, ondersteund.** Functioneel gelijk aan Retailer (verkoopt, beheert commerciële gegevens via Commerce Cloud), met één aanvullende eis: bewijs van autorisatie om namens het/de vertegenwoordigde merk(en) te verkopen (sectie 2.9). |
| **Beheerder** | Platformbeheer, compliance, geschillen | **Nee** — geen zelfregistratie; Beheerders worden buiten dit onboardingproces om aangemaakt (Medusa Admin, al vastgelegd in de Authenticatie-spec, sectie 1.9). |

**Architecturale bevestiging, consistent met eerder vastgelegde regels:** rollen zijn **optelbaar, niet exclusief** (Blueprint: "een producent kan ook retailer zijn") — daarom is "Partner kiezen" (sectie 2.2) een **meervoudige selectie**, geen of/of-keuze.

### 1.2 Statusovergangen

**Bijgewerkt na de onafhankelijke architectuurreview (verbeterpunt 1)** — een nieuwe tussenstatus toegevoegd, zodat een reviewer niet langer gedwongen is tussen een voorbarige goedkeuring en een onnodige volledige afwijzing te kiezen.

```
Concept → Ingediend → In beoordeling ──┬──→ Goedgekeurd
                                        ├──→ Afgekeurd → (aanpassen en opnieuw indienen → Ingediend)
                                        └──→ Aanvullende informatie vereist → Opnieuw ingediend → In beoordeling (terug naar dit keuzepunt)
```

- **Concept:** de partner is bezig met het formulier, kan tussentijds opslaan en later hervatten — geen tijdslimiet.
- **Ingediend:** alle verplichte stappen zijn compleet, voorwaarden geaccepteerd, definitief verstuurd — niet meer bewerkbaar door de partner totdat een beslissing valt (voorkomt dat gegevens tijdens beoordeling veranderen).
- **In beoordeling:** handmatige controle door EuropMade (sectie 1.4, sectie 3) — geen zelfbedieningsactie meer voor de partner, uitsluitend afwachten.
- **Aanvullende informatie vereist (nieuw):** de reviewer heeft één of meerdere specifieke, benoemde punten die verduidelijking of een aanvullend document nodig hebben — géén volledige afwijzing. Zie sectie 2.8A voor de volledige uitwerking (meldingen, acties partner/reviewer, acceptatiecriteria).
- **Opnieuw ingediend (nieuw):** de partner heeft uitsluitend de gevraagde onderdelen aangevuld/gecorrigeerd en opnieuw verstuurd — keert terug naar In beoordeling, niet naar het begin van de wachtrij-logica (implementatiedetail, geen UX-beslissing).
- **Goedgekeurd:** rol(len) worden toegekend aan het bestaande Consument-account (RBAC, sectie 1.5); partner wordt doorgestuurd naar de verplichte 2FA-instelstap (Authenticatie-spec, Stap 3A) vóórdat het Dashboard toegankelijk wordt.
- **Afgekeurd:** met reden, partner kan de afgekeurde onderdelen aanpassen en opnieuw indienen (terug naar Ingediend, niet terug naar Concept — reeds correcte onderdelen hoeven niet opnieuw). **Onderscheid met "Aanvullende informatie vereist":** Afgekeurd is een negatieve eindbeslissing op (een deel van) de aanvraag; "Aanvullende informatie vereist" is geen beslissing, uitsluitend een vraag om meer te weten vóórdat er überhaupt een beslissing valt.

### 1.3 Verificatieproces (overzicht, uitgewerkt in Stap 2 en Stap 3)

Twee verificatiedimensies, **beoordeeld in één gecombineerde goedkeuringsstap** (bewuste MVP-keuze, zie sectie 1.4):
1. **Identiteits-/bedrijfsverificatie** — bestaat dit bedrijf, is de aanvrager bevoegd, kloppen KvK/BTW-gegevens.
2. **Europese productieverificatie** (uitsluitend voor Producent/Merkhouder- en Distributeur-aanvragen) — Stap 3.

### 1.4 Goedkeuringsproces — bewuste architectuurbeslissing

**Eén gecombineerde beoordeling, niet twee aparte, asynchrone processen.** Een aanvraag wordt in **één keer** beoordeeld door EuropMade (bedrijfsgegevens, identiteit, én — indien van toepassing — Europese productieverificatie tegelijk), niet als losse tracks die apart kunnen goedkeuren/afwijzen. **Reden, expliciet vastgelegd:** dit houdt de Blueprint-doelstelling "binnen één werkdag live kunnen verkopen" (H9.4) haalbaar — twee parallelle beoordelingsprocessen zouden onnodige coördinatie-overhead en langere doorlooptijden introduceren voor de MVP. Periodieke hercontrole (sectie 3, laatste punt) is wél een apart, terugkerend proces, ná de eerste goedkeuring.

**Aangevuld na de architectuurreview:** "één gecombineerde beoordeling" betekent nog altijd één beoordelingsmoment per keer, niet noodzakelijk één uitkomst in één keer — de nieuwe status "Aanvullende informatie vereist" (sectie 1.2, 2.8A) is geen tweede, parallelle beoordelingstrack, maar een gerichte pauze binnen datzelfde ene proces, met exact dezelfde reviewer en dezelfde beoordelingsronde.

### 1.5 Afhankelijkheid met RBAC

Bij **Goedgekeurd** worden de gekozen rol(len) (Retailer/Producent-Merkhouder/Distributeur) toegevoegd aan het bestaande Consument-account — geen nieuw account, geen nieuwe registratie (Authenticatie-spec, sectie 1.1: "iedereen registreert zich eerst als consument"). Dit is exact het "later, vanuit een bestaand account"-moment waar de Authenticatie-spec destijds naar verwees zonder het zelf uit te werken. Autorisatie blijft **server-side afgedwongen** (Authenticatie-spec, sectie 1.10) — de Dashboard-toegang wordt pas vrijgegeven na (a) Goedgekeurd én (b) actieve 2FA (Authenticatie-spec, Stap 3A).

### 1.6 Afhankelijkheid met Product Cloud

Een Producent/Merkhouder-goedkeuring geeft het account de rechten die al in de functionele spec Product Cloud (sectie 1.2/sectie 4) zijn vastgelegd — dit document **verandert die rechten niet**, het is uitsluitend de plek waar het account ze **verkrijgt**. De Europese productieverificatie tijdens onboarding (Stap 3) is een **bedrijfsniveau-claim**, te onderscheiden van de al bestaande **productniveau** Verified™-beoordeling (Product Cloud-spec, sectie 1.10) — zie sectie 3 voor de precieze relatie tussen beide.

### 1.7 Afhankelijkheid met Commerce Cloud

Een Retailer- of Distributeur-goedkeuring geeft het account de rechten om Offers aan te maken (Commerce Cloud, al vastgelegd) — ongewijzigd, dit document kent uitsluitend de rol toe.

### 1.8 Afhankelijkheid met de Authenticatie-flow — verplichte e-mailverificatie (nieuw, verbeterpunt 2 uit de architectuurreview)

**Expliciet vastgelegd, was voorheen alleen impliciet aanwezig in de Authenticatie-spec:** Partner Onboarding kan **uitsluitend gestart worden wanneer het account al e-mailgeverifieerd is.** Dit was al zo bedoeld — de Authenticatie-spec (sectie 1.4) stelt: *"verificatie is niet blokkerend voor winkelen, maar wél verplicht vóórdat de Partner Onboarding-flow (retailer/producent worden) kan starten"* — maar dit document verwees daar voorheen niet expliciet naar en handhaafde de regel zelf niet. Dat is hierbij rechtgezet.

**Controle:**
- **Server-side afgedwongen**, niet uitsluitend een client-side redirect — zelfde ADR 0005-principe als overal elders in dit documentenset toegepast (RBAC, sessiebeheer, prijs-/BTW-berekening).
- Vindt plaats **vóórdat** de eerste inhoudelijke stap ("Partner kiezen") toegankelijk wordt — het "Welkom"-scherm zelf blijft altijd zichtbaar (het legt uit wat er nodig is), maar de "Start aanmelding"-actie controleert eerst de verificatiestatus.
- **Melding bij ontbrekende verificatie:** een duidelijke, niet-technische tekst die uitlegt wat er nodig is en een directe actie biedt om alsnog te verifiëren (bijv. "Bevestig eerst je e-mailadres" + een knop die de verificatiemail opnieuw verstuurt — hergebruikt de al bevroren "Controleer je e-mail"-flow uit de Authenticatie-spec, geen nieuw scherm).

**Consistentiecontrole tussen beide documenten (uitgevoerd):** de Authenticatie-spec (sectie 1.4) beschreef deze regel als *bedoeld gedrag* maar wees niet aan wáár de controle daadwerkelijk wordt afgedwongen. Dit document is nu die aangewezen plek. Geen inhoudelijke tegenspraak gevonden tussen beide documenten — uitsluitend een ontbrekende, nu toegevoegde verwijzing.

---

## Stap 2 — Functionele specificatie

### 2.1 User journey

*"Als klant die overweegt te gaan verkopen op EuropMade wil ik in een overzichtelijk, stap-voor-stap proces mijn bedrijf aanmelden — met duidelijkheid over wat er nodig is en hoe lang het duurt — zodat ik snel, maar zonder onnodige haast, live kan gaan."*

### 2.2 Stap-voor-stap onboarding (schermvolgorde, met CMP-004 Stepper)

1. **Welkom** — uitleg wat partnerschap inhoudt, wat er nodig is (bedrijfsgegevens, identiteit, evt. productiebewijs), verwachte doorlooptijd ("meestal binnen één werkdag"). **De "Start aanmelding"-actie controleert server-side of het account e-mailgeverifieerd is (sectie 1.8) — zo niet, dan verschijnt een gerichte melding in plaats van door te gaan naar "Partner kiezen".**
2. **Partner kiezen** — meervoudige selectie: Retailer, Producent/Merkhouder, Distributeur (sectie 1.1). **Bepaalt welke latere stappen worden getoond** (conditionele flow, zie sectie 2.4).
3. **Bedrijfsgegevens** — bedrijfsnaam, rechtsvorm, adres, KvK-/bedrijfsregistratienummer, BTW-nummer, contactpersoon (naam, e-mailadres, telefoonnummer), uitbetalingsgegevens (IBAN, rekeninghouder).
4. **Verificatie** — identiteitscontrole (bevoegd vertegenwoordiger) + **Europese productieverificatie** (uitsluitend getoond bij Producent/Merkhouder of Distributeur, sectie 3).
5. **Upload documenten** — geconsolideerd overzicht van alle benodigde bewijsstukken, afhankelijk van de gekozen rol(len) (sectie 2.7).
6. **Samenvatting** — volledig overzicht van alle ingevulde gegevens, elk onderdeel met een "Wijzigen"-link terug naar de betreffende stap (hergebruikt CMP-030 Review Block, zelfde patroon als Checkout Stap 3), inclusief de verplichte voorwaarden-acceptatie.
7. **Statuspagina** — na indienen: toont de actuele status (Ingediend/In beoordeling/Goedgekeurd/Afgekeurd), altijd terug te vinden vanuit het account.

### 2.3 Bedrijfsgegevens — velden

| Veld | Verplicht |
|---|---|
| Bedrijfsnaam | Ja |
| Rechtsvorm | Ja |
| Bedrijfsadres | Ja |
| KvK-/bedrijfsregistratienummer | Ja |
| BTW-nummer | Ja |
| Contactpersoon — naam | Ja |
| Contactpersoon — e-mailadres | Ja (kan afwijken van het inlog-e-mailadres) |
| Contactpersoon — telefoonnummer | Ja |
| IBAN (uitbetalingsgegevens) | Ja |
| Rekeninghouder-naam | Ja — **moet overeenkomen met de bedrijfsnaam** (validatie, sectie 2.10) |

### 2.4 Conditionele flow (afhankelijk van gekozen rol)

- **Uitsluitend Retailer gekozen** → sectie "Europese productieverificatie" (Stap 4-onderdeel) wordt **overgeslagen** — een retailer die uitsluitend bestaande producten van anderen verkoopt, beheert geen productinformatie en hoeft dus geen productieclaim te onderbouwen.
- **Producent/Merkhouder en/of Distributeur gekozen** → Europese productieverificatie is **verplicht** onderdeel van Stap 4.
- **Meerdere rollen tegelijk gekozen** → alle bijbehorende secties worden getoond; geen dubbele invoer van gedeelde velden (bedrijfsgegevens worden één keer ingevuld, ongeacht het aantal gekozen rollen).

### 2.5 Identiteitscontrole

- Naam + functie van de bevoegde vertegenwoordiger (degene die namens het bedrijf tekent).
- Upload van een geldig identiteitsbewijs (sectie 2.7).
- **Doel:** bevestigen dat de aanvrager daadwerkelijk bevoegd is namens het opgegeven bedrijf te handelen — voorkomt fraude met bestaande bedrijfsgegevens.

### 2.6 Acceptatie van voorwaarden

Verplichte checkbox op de Samenvatting-stap: akkoord met de Partnervoorwaarden en het verwerkersaddendum (gegevensverwerking) — indiening is geblokkeerd totdat aangevinkt, zelfde patroon als de Registreren-checkbox in de Authenticatie-flow.

### 2.7 Upload van bewijsstukken

| Document | Verplicht voor |
|---|---|
| Identiteitsbewijs (bevoegde vertegenwoordiger) | Alle rollen |
| KvK-/bedrijfsregistratie-uittreksel | Alle rollen |
| Productiebewijsstuk (zie sectie 3) | Producent/Merkhouder |
| Autorisatiebewijs (distributieovereenkomst met het vertegenwoordigde merk) | Distributeur |
| Aanvullende certificeringen | Optioneel, alle rollen |

### 2.8 Statussen — weergave

Elke status krijgt een duidelijke, eigen boodschap (geen generieke "wordt verwerkt"-tekst voor alles):
- **Concept:** "Je aanvraag is nog niet verstuurd — ga verder waar je gebleven was."
- **Ingediend/In beoordeling:** "Je aanvraag wordt beoordeeld — dit duurt meestal minder dan één werkdag." (hergebruikt het Orderbevestiging-/Authenticatie-succescompositiepatroon, envelop- of klok-glyph).
- **Goedgekeurd:** "Welkom als partner! Stel eerst tweestapsverificatie in om toegang te krijgen tot je Dashboard." — directe doorverwijzing naar de al bevroren, verplichte 2FA-stap (Authenticatie-spec).
- **Afgekeurd:** reden(en) expliciet benoemd per onderdeel, met een directe "Aanpassen en opnieuw indienen"-actie die uitsluitend de afgekeurde onderdelen heropent.

### 2.8A — Status "Aanvullende informatie vereist" (nieuw, verbeterpunt 1 uit de architectuurreview)

**Doel:** een reviewer een gericht, niet-blokkerend alternatief geven voor een volledige afwijzing wanneer één of meerdere specifieke onderdelen verduidelijking nodig hebben — voorkomt zowel voorbarige goedkeuring als onnodige volledige afwijzing.

**Statusovergang:** In beoordeling → Aanvullende informatie vereist → (partner vult aan) → Opnieuw ingediend → In beoordeling (zelfde reviewronde, geen nieuwe wachtrij-positie).

**Gebruikersmelding (partner):** "We hebben nog iets van je nodig voordat we je aanvraag kunnen afronden" + een **specifieke, per-onderdeel benoemde vraag** (bijv. "Het geüploade productiebewijsstuk toont geen adres — kun je een document uploaden waarop de productielocatie duidelijk zichtbaar is?"). Nooit een generieke "meer informatie nodig"-tekst zonder concrete invulling — de partner moet direct weten wát er ontbreekt, zonder de hele aanvraag te hoeven doorlopen.

**Acties voor de partner:**
- Ziet exact welk(e) onderdeel/onderdelen om aanvulling vragen (gekoppeld aan de betreffende stap — Bedrijfsgegevens, Verificatie, of Upload documenten).
- Kan **uitsluitend** het/de gevraagde onderdeel/onderdelen bewerken — de rest van de al ingediende aanvraag blijft vergrendeld (zelfde principe als bij Afgekeurd, sectie 1.2).
- Dient de aanvulling in via een expliciete actie ("Aanvulling versturen") → status wordt Opnieuw ingediend → In beoordeling.

**Acties voor de reviewer:** kan tijdens de beoordeling, in plaats van uitsluitend Goedkeuren/Afkeuren, kiezen voor "Aanvullende informatie vragen" met een verplicht vrij-tekstveld (de specifieke vraag) gekoppeld aan één of meerdere concrete onderdelen van de aanvraag (implementatiedetail: dit gebeurt in het nog te bouwen Admin-scherm #55/Partnerbeheer, hier uitsluitend het functionele gedrag vastgelegd, geen Admin-wireframe in deze scope).

**Onderscheid met Afgekeurd, expliciet:** "Aanvullende informatie vereist" is **geen negatieve beslissing** — de aanvraag blijft inhoudelijk "in de wachtrij", uitsluitend gepauzeerd in afwachting van een aanvulling. Afgekeurd is een definitieve, negatieve uitkomst op (een deel van) de aanvraag.

**Herhaling toegestaan:** een aanvraag kan meerdere keren tussen "In beoordeling" en "Aanvullende informatie vereist" heen en weer gaan als er stapsgewijs meerdere punten opduiken — geen limiet op het aantal rondes vastgelegd (bewuste keuze: een harde limiet zou een partner onterecht kunnen blokkeren bij een oprecht complex dossier).

### 2.9 Distributeur — aanvullende eis

Naast de standaard bedrijfsgegevens: verklaring welk(e) merk(en) vertegenwoordigd worden + verplicht autorisatiebewijs (sectie 2.7). Zonder dit bewijs kan een Distributeur-aanvraag niet worden goedgekeurd — voorkomt dat iemand zich ten onrechte voordoet als officiële vertegenwoordiger van een merk.

### 2.10 Validaties

- KvK-/BTW-nummer: formaatvalidatie, geen live registerkoppeling in de MVP (server-side formaatcontrole, geen externe validatie-API — expliciete MVP-scopekeuze, zie Medusa-vs-maatwerk).
- IBAN: standaard IBAN-checksumvalidatie (land-onafhankelijk, ondersteunt alle EU-landen).
- Rekeninghouder-naam moet overeenkomen met de opgegeven bedrijfsnaam (voorkomt uitbetaling aan een onbedoelde derde) — bij afwijking: blokkerende validatiemelding, geen harde 1-op-1-tekstmatch vereist maar een duidelijke waarschuwing die handmatige beoordeling triggert bij twijfel.
- Verplichte documentuploads: indienen geblokkeerd totdat alle voor de gekozen rol(len) verplichte documenten zijn geüpload.
- Bestandsformaat/-grootte voor uploads: gangbare document-/beeldformaten (PDF/JPG/PNG), een redelijke maximale bestandsgrootte — implementatiedetail, geen UX-beslissing.

### 2.11 Edge cases

- **Partner sluit de browser tijdens Concept** → voortgang blijft bewaard (server-side, niet uitsluitend client-side), bij terugkeer verschijnt de Stepper op de laatst voltooide stap.
- **Aanvraag afgekeurd op precies één onderdeel** (bijv. onleesbaar identiteitsbewijs) → alleen dát onderdeel hoeft opnieuw, de rest blijft staan — geen volledige formulier-reset.
- **Partner voegt later een extra rol toe** (bijv. een goedgekeurde Retailer wil ook Producent worden) → **buiten de scope van dit document** — dit vereist een aparte "rol toevoegen"-flow vanuit een bestaand, actief Partneraccount, vermoedelijk een verkorte versie van dit proces (alleen de rol-specifieke stappen). Genoteerd als open punt (sectie hieronder), niet als tekortkoming van dit document.
- **BTW-nummer hoort bij een ander land dan het bedrijfsadres** (legitiem binnen de EU) → toegestaan, geen blokkade — relevant voor de latere OSS-/BTW-architectuur (`orderbevestiging/spec.md` Stap 5A), hier alleen bevestigd als geen onverwachte validatiefout.
- **Twee partners dienen onafhankelijk van elkaar een aanvraag in met hetzelfde KvK-nummer** (mogelijke fraude of een vergissing) → gemarkeerd voor handmatige beoordeling, geen automatische afwijzing (een legitieme reden kan bestaan, bijv. een overname).

### 2.12 Acceptatiecriteria

- [ ] "Partner kiezen" staat een meervoudige selectie toe, nooit een exclusieve of/of-keuze.
- [ ] Europese productieverificatie wordt uitsluitend getoond bij Producent/Merkhouder- en/of Distributeur-selectie.
- [ ] Concept-status bewaart voortgang server-side, hervatbaar op de laatst voltooide stap.
- [ ] Indienen is geblokkeerd totdat alle verplichte velden, uploads en de voorwaarden-acceptatie compleet zijn.
- [ ] Een afgekeurde aanvraag toont per onderdeel een specifieke reden, met een gerichte heropen-actie.
- [ ] Bij Goedgekeurd worden de gekozen rollen toegevoegd aan het bestaande account; geen nieuw account, geen nieuwe registratie.
- [ ] Na Goedgekeurd is het Dashboard pas toegankelijk ná een actieve 2FA-instelling.
- [ ] IBAN wordt server-side gevalideerd (checksum), ongeacht EU-land.
- [ ] **(Nieuw)** Een reviewer kan tijdens "In beoordeling" kiezen voor "Aanvullende informatie vragen" naast Goedkeuren/Afkeuren, met een verplicht, specifiek verzoek gekoppeld aan het/de betreffende onderdeel/onderdelen.
- [ ] **(Nieuw)** "Aanvullende informatie vereist" toont de partner de exacte, specifieke vraag — nooit een generieke tekst.
- [ ] **(Nieuw)** De partner kan bij "Aanvullende informatie vereist" uitsluitend het/de gevraagde onderdeel/onderdelen bewerken; de rest van de aanvraag blijft vergrendeld.
- [ ] **(Nieuw)** Na aanvulling keert de aanvraag terug naar "In beoordeling" (status "Opnieuw ingediend" als tussenstap), niet naar een nieuwe wachtrij-positie.
- [ ] **(Nieuw)** "Aanvullende informatie vereist" kan meerdere keren doorlopen worden binnen dezelfde aanvraag, zonder vaste limiet.

- [ ] **(Nieuw)** "Partner kiezen" is server-side ontoegankelijk voor een account dat nog niet e-mailgeverifieerd is; het "Welkom"-scherm blijft wel altijd zichtbaar, met een gerichte melding + verificatie-actie.

### 2.13 Medusa-standaard versus maatwerk

| Onderdeel | Bouwaard |
|---|---|
| Formulierstructuur, stapsgewijze navigatie | Standaard bouwpatroon (CMP-004 Stepper, al bevroren). |
| Bedrijfsgegevens-opslag | Standaard datamodel-uitbreiding op het Customer-record. |
| Documentupload/-opslag | **Maatwerk** — geen standaard Medusa-functionaliteit; gebruikt standaard bestandsopslag-infrastructuur (geen zelfgebouwde storage-laag). |
| KvK-/BTW-validatie | **Bewust beperkt tot formaatvalidatie in de MVP** — géén live koppeling met een extern handelsregister (bijv. KvK-API); expliciete scopekeuze om de "binnen één werkdag"-doelstelling niet afhankelijk te maken van een externe, mogelijk trage service. Een toekomstige uitbreiding, geen huidige tekortkoming. |
| Statusbeheer (Concept/Ingediend/In beoordeling/Goedgekeurd/Afgekeurd) | **Maatwerk**, gebruikt de Medusa Workflow-engine als technisch fundament (zelfde patroon als de wijzigingsvoorstel-afhandeling, Product Cloud-spec sectie 1.8). |
| Rol-toekenning bij Goedgekeurd (RBAC) | **Maatwerk**, hoort bij de nog te bouwen Partnerplatform-/RBAC-laag (Authenticatie-spec, sectie 1.11). |
| IBAN-validatie | Standaard (bestaande, algemeen beschikbare IBAN-checksumbibliotheek). |

---

## Stap 3 — Europese productieverificatie

### Uitgangspunt

Dit is het bedrijfsniveau-fundament van EuropMade's kernbelofte ("uitsluitend Europese producten") — te onderscheiden van, maar direct verbonden met, de al bestaande **productniveau** Verified™-beoordeling (Product Cloud-spec, sectie 1.10).

### Verplichte gegevens

| Gegeven | Verplicht | Toelichting |
|---|---|---|
| Land van productie (hoofdproductieland) | **Ja** | Het primaire land waar de meeste/kernproducten geproduceerd worden. |
| Productielocatie(s) | **Ja, minimaal één** | Concreet adres van minimaal één productiefaciliteit. |
| Fabrikant | **Ja** | Naam van de feitelijk producerende entiteit — dit kan het eigen bedrijf zijn, of een externe contractfabrikant. |
| Eigendom van het merk | **Ja** | Verklaring: is dit een eigen merk, of wordt het vertegenwoordigd namens een andere merkhouder (relevant vooral voor Distributeur, sectie 2.9)? |
| Bewijsstukken (minimaal één) | **Ja** | Zie hieronder. |

### Optionele gegevens

| Gegeven | Verplicht |
|---|---|
| Eigendom van de fabrikant (eigen faciliteit vs. externe contractfabrikant) | **Optioneel** — nuance-informatie, niet blokkerend voor goedkeuring, wel relevant bij een latere Verified™-beoordeling per product. |
| Meerdere productielocaties | **Optioneel** (één is verplicht, extra locaties mogen). |
| Aanvullende certificeringen (milieukeurmerken, kwaliteitscertificaten) | **Optioneel.** |

### Bewijsstukken

Minimaal één van: een handelsregisteruittreksel van de productielocatie, een productie-/kwaliteitscertificaat, of een vergelijkbaar officieel document dat de productielocatie bevestigt. Geen uitputtende, vaste lijst — de handmatige beoordelaar (zie hieronder) beoordeelt de overtuigingskracht van het aangeleverde bewijs.

### Verificatiestatus

Onderdeel van de **ene, gecombineerde goedkeuringsbeslissing** (sectie 1.4) — geen aparte statuswaarde los van de algemene partnerstatus. Bij Goedgekeurd is de bedrijfsniveau-productieclaim daarmee bevestigd; dit is **geen garantie dat elk toekomstig product automatisch Verified™ wordt** — dat blijft een aparte, productniveau-beoordeling (Product Cloud-spec, sectie 1.10), nu wel met een al bevestigde bedrijfsachtergrond, wat die latere beoordeling naar verwachting sneller maakt.

### Handmatige controle door EuropMade

**Niet geautomatiseerd** — een menselijke beoordelaar (Beheerder, via het nog te bouwen Admin-scherm #55/Partnerbeheer) beoordeelt de aangeleverde bewijsstukken tegen de opgegeven claim. Consistent met het bestaande principe dat AI processen ondersteunt maar nooit de uiteindelijke beslissing neemt (Blueprint H9.7/9.8, al eerder toegepast op wijzigingsvoorstellen).

### Beoordelingschecklist voor reviewers (nieuw, verbeterpunt 5 uit de architectuurreview)

**Ondersteunend hulpmiddel, geen geautomatiseerde beslissing.** De checklist helpt de reviewer consistent te controleren, maar **de uiteindelijke beslissing (Goedgekeurd/Afgekeurd/Aanvullende informatie vereist, sectie 2.8A) blijft te allen tijde handmatig** — dit is een controlemiddel, geen beslisregel-engine.

Minimaal te controleren, per aanvraag:

| Controlepunt | Waar de reviewer op let |
|---|---|
| **Bedrijfsregistratie** | Komt het opgegeven KvK-/bedrijfsregistratienummer overeen met het geüploade uittreksel? Is de bedrijfsnaam consistent tussen formulier en document? |
| **Productielocatie** | Is het opgegeven adres een plausibele productielocatie (geen evident onmogelijk of onvolledig adres)? Komt de locatie overeen met wat het bewijsstuk toont? |
| **Fabrikant** | Is duidelijk wie feitelijk produceert (eigen bedrijf of contractfabrikant), en is die naam consistent tussen formulier en bewijsstuk? |
| **Merkhouder** | Is de eigendomsverklaring van het merk consistent met de overige aanvraag (met name bij Distributeur: klopt het merk in de verklaring met het merk in het autorisatiebewijs)? |
| **Bewijsstukken compleet** | Zijn alle voor de gekozen rol(len) verplichte documenten aanwezig en leesbaar (sectie 2.7)? |
| **Documenten logisch en consistent** | Spreken de aangeleverde documenten elkaar niet tegen (bijv. een KvK-uittreksel met een ander adres dan de opgegeven productielocatie, zonder toelichting)? |

**Gebruik van de checklist in combinatie met sectie 2.8A:** als één of meerdere controlepunten niet met zekerheid zijn vast te stellen, is dat precies het scenario waarvoor de status "Aanvullende informatie vereist" bedoeld is — de checklist maakt dus concreet zichtbaar wannéér die status het aangewezen alternatief is voor een voorbarige Goedkeuring of een onnodige Afkeuring.

### Toekomstige periodieke hercontrole

**Hergebruikt exact dezelfde cadans als de al bestaande Verified™-hercontrole** (Product Cloud-spec, sectie 1.10: elke 6 maanden, of direct getriggerd door een relevante waarschuwing) — nu ook toegepast op de bedrijfsniveau-productieclaim, geen nieuwe, aparte cyclus bedacht. Buiten de scope van dit document om zelf te bouwen (toekomstig, net als de eerder genoemde periodieke Verified™-hercontrole).

---

## Stap 4 — Componentanalyse

| Behoefte | Bestaand component? | Conclusie |
|---|---|---|
| Stapsgewijze navigatie door het formulier | CMP-004 (Stepper) | Hergebruik — exact hetzelfde patroon als Checkout. |
| Rol(len) selecteren, meervoudig | CMP-026 (Choice Card) | Hergebruik, met een **meervoudige-selectie-variant** (bestaande component stond al single-select toe, hier voor het eerst multi-select — geen nieuw component, een gedocumenteerde uitbreiding). |
| Alle tekst-/nummervelden (bedrijfsnaam, KvK, BTW, IBAN, contactgegevens) | CMP-006 (Form Field) | Hergebruik. |
| Voorwaarden-acceptatie | CMP-007 (Checkbox) | Hergebruik. |
| Primaire acties | CMP-005 (Button) | Hergebruik. |
| Validatie-/statusmeldingen | CMP-011 (Notice) | Hergebruik. |
| Statuslabels (Concept/Ingediend/In beoordeling/Goedgekeurd/Afgekeurd) | CMP-008 (Badge) | Hergebruik. |
| Samenvatting met "Wijzigen"-links per onderdeel | CMP-030 (Review Block) | Hergebruik — zelfde patroon als Checkout Stap 3. |
| Status-/successchermen (In behandeling, Goedgekeurd) | Geen los component — compositie | Derde toepassing van het al bij Orderbevestiging/Authenticatie vastgestelde compositiepatroon (iconenglyph + kop + tekst). |
| **Documentupload (identiteitsbewijs, KvK-uittreksel, productiebewijs, autorisatiebewijs)** | **Geen bestaand component dekt dit** | **Nieuw: CMP-041 File Upload.** |

### CMP-041 — File Upload

**Bijgewerkt na de architectuurreview (verbeterpunt 3):** de mobiele variant ondersteunt nu naast de bestandskiezer ook direct een foto maken via de camera. Desktop/Tablet behouden drag-and-drop, ongewijzigd.

| Aspect | Beschrijving |
|---|---|
| Doel | Eén of meerdere documenten laten uploaden (identiteitsbewijs, KvK-uittreksel, productiebewijs, autorisatiebewijs, certificeringen). |
| Varianten | **Desktop/Tablet:** dropzone (slepen-en-neerzetten) + bestandskiezer, ongewijzigd. **Mobiel:** bestandskiezer + **camera direct openen om een foto te maken en te uploaden** — geen drag-and-drop op mobiel. |
| Staten | Leeg (dropzone/keuze zichtbaar), geüpload (bestandsnaam of fotominiatuur + verwijder-actie), foutstaat (ongeldig formaat/te groot, met duidelijke reden). |
| Interacties | **Desktop/Tablet:** klikken opent de bestandskiezer; slepen-en-neerzetten ondersteund. **Mobiel:** twee gelijkwaardige acties — "Foto maken" (directe camera) en "Bestand kiezen" (galerij/bestanden). Verwijderen en opnieuw uploaden overal mogelijk vóór het indienen. |
| Toegankelijkheid | Standaard `<input type="file">` als fundament; op mobiel het `capture`-attribuut voor directe cameratoegang, met de bestandskiezer als gelijkwaardig, altijd zichtbaar alternatief; duidelijke labeling per documenttype; statuswijzigingen aangekondigd via `aria-live`. |
| Bouwaard | Standaard bouwpatroon (inclusief `capture`-attribuut — standaard HTML, geen maatwerk); bestandsopslag via standaard infrastructuur. |
| Afhankelijkheden | Geen. |
| Eerst toegepast in | Partner Onboarding (Upload documenten-stap) — meerdere instanties op hetzelfde scherm, één per benodigd documenttype. |

**Conclusie: precies één nieuw component is aantoonbaar noodzakelijk.** Alle overige behoeften zijn volledig te dekken met bestaande, al bevroren componenten — waaronder de meervoudige-selectie-uitbreiding van CMP-026, die geen nieuw component rechtvaardigt (zelfde onderliggende kaart, uitsluitend het selectiegedrag verandert).

### Beveiligingseisen voor documentuploads (nieuw, verbeterpunt 4 uit de architectuurreview)

**Uitsluitend architectuur- en functionele eisen — geen technische implementatie uitgewerkt**, conform de opdracht. De geüploade documenten (identiteitsbewijzen, KvK-uittreksels, productiebewijsstukken) zijn gevoelige persoonsgegevens en horen met een navenant beveiligingsniveau behandeld te worden.

| Eis | Beschrijving |
|---|---|
| **Versleutelde opslag** | Documenten worden versleuteld opgeslagen ("at rest"), niet als onversleutelde bestanden in de standaard opslaginfrastructuur. |
| **Malware-scan bij upload** | Elk geüpload document wordt bij ontvangst automatisch gescand vóórdat het beschikbaar wordt voor beoordeling — voorkomt dat een kwaadaardig bestand een reviewer of het systeem kan bereiken. |
| **Uitsluitend geautoriseerde reviewers** | Toegang tot geüploade documenten is beperkt tot Beheerders met een expliciete Partnerbeheer-bevoegdheid (RBAC, zelfde server-side-afgedwongen principe als overal elders in deze documentenset) — nooit toegankelijk voor de partner zelf ná upload (behalve het eigen, actief bewerkbare onderdeel vóór indiening), noch voor andere partners, noch voor niet-geautoriseerde interne rollen. |
| **Audit logging** | Elke toegang tot een geüpload document (wie, wanneer, welk document) wordt gelogd — maakt controleerbaar wie een identiteitsbewijs heeft ingezien, relevant bij een geschil of controle. |
| **Bewaartermijn** | Een vastgestelde, eindige bewaartermijn na afronding van de aanvraag (Goedgekeurd of definitief Afgekeurd) — met name bij een afgewezen aanvraag is er geen doorlopende grond om een identiteitsbewijs onbeperkt te bewaren. Exacte termijn is een juridisch/beleidsmatig te bepalen getal, geen UX-beslissing — hier uitsluitend vastgelegd dát er een eindige termijn moet zijn, niet welke. |
| **AVG/GDPR-conform** | Dataminimalisatie (uitsluitend de documenten opvragen die daadwerkelijk nodig zijn, al gedaan via de rol-afhankelijke uploadlijst, sectie 2.7), een rechtsgrond voor verwerking (uitvoering overeenkomst/gerechtvaardigd belang ter voorkoming van fraude), en een uitvoerbaar recht op verwijdering — buiten de bewaartermijn ook op verzoek. |

**Nadrukkelijk:** dit zijn architectuureisen aan de bouw, geen wijziging aan de al vastgelegde UX (welke documenten, wanneer verplicht) — die blijft ongewijzigd (sectie 2.7).


---

## Bewust niet verwerkte aanbevelingen uit de architectuurreview

Op expliciet verzoek **niet** overgenomen — genoteerd voor transparantie, geen huidige tekortkoming van dit document:

- Distributeur-rol verwijderen of samenvoegen met Retailer.
- Ondersteuning voor meerdere gelijkwaardige productielocaties (zonder één verplicht hoofdproductieland).
- Partner Lifecycle Management (schorsing/beëindiging van een reeds goedgekeurd partneraccount).
- ERP/PIM-koppeling binnen deze onboardingflow.
- Verzendinstellingen binnen deze onboardingflow.

Deze blijven bewust buiten de MVP-scope van Partner Onboarding v1.1.

## Openstaand punt (blokkeert bevriezing niet)

**Rol toevoegen aan een reeds actief Partneraccount** (bijv. een goedgekeurde Retailer die later ook Producent wil worden) valt buiten de scope van dit document — vermoedelijk een verkorte versie van deze flow (alleen de rol-specifieke stappen: Europese productieverificatie + bijbehorende uploads, geen herhaalde bedrijfsgegevens/identiteitscontrole). Genoteerd voor een latere iteratie, geen huidige tekortkoming (sectie 2.11).

---

## Stap 5 — Wireframes

Zie [`02-ux/wireframes/sprint-1b/04-partner-onboarding-desktop.html`](../../02-ux/wireframes/sprint-1b/04-partner-onboarding-desktop.html), `-tablet.html`, `-mobile.html` — elk bestand toont, zelfde aanpak als Checkout/Authenticatie, alle gevraagde schermen binnen één bestand: Welkom, Partner kiezen, Bedrijfsgegevens, Verificatie, Upload documenten, Samenvatting, Statuspagina (met de varianten In behandeling, Goedgekeurd, Afgekeurd).

---

## Stap 7 — Eindcontrole

- ✓ **Blueprint-consistent** — rollen (H9.3), onboardingvolgorde (H9.4), producent-voorrangsprincipe (H9.8) allemaal direct herleidbaar.
- ✓ **Design System-consistent** — één nieuw, aantoonbaar noodzakelijk component (CMP-041 File Upload), vooraf vastgelegd; één gedocumenteerde meervoudige-selectie-uitbreiding op CMP-026 (geen nieuw component).
- ✓ **Marketplace-first** — de conditionele flow (sectie 2.4) en de meervoudige rolselectie (sectie 1.1) weerspiegelen direct het multi-vendor, rol-combinerende karakter van het platform, niet een traditionele "koper of verkoper"-tweedeling.
- ✓ **EU-verificatie volledig uitgewerkt** — land van productie, productielocatie(s), fabrikant, bewijsstukken, merk-/fabrikant-eigendom, verificatiestatus, handmatige controle, periodieke hercontrole (Stap 3), met een expliciet onderscheid tussen verplichte en optionele gegevens.
- ✓ **Geen wijzigingen aan bevroren schermen** — Homepage, Categorie, Zoekresultaten, Productpagina, Winkelwagen, Checkout, Orderbevestiging, Authenticatie-flow ongewijzigd (geen bestandswijziging).
- ✓ **Developer-ready** — elke sectie herleidbaar naar een concreet component, databron of servicelaag (Stap 1, 2.13, 4).

---

## Status: v1.1 — DEFINITIEF BEVROREN

Architectuuranalyse, functionele specificatie, Europese productieverificatie, componentanalyse en wireframes zijn bijgewerkt met: (1) de nieuwe status "Aanvullende informatie vereist", (2) een expliciet afgedwongen e-mailverificatie-eis vóór de start, (3) mobiele cameraopname voor documentupload, (4) architectuur-/functionele beveiligingseisen voor documentuploads, en (5) een beoordelingschecklist voor reviewers. Vijf aanbevelingen uit de review zijn expliciet **niet** verwerkt, op uitdrukkelijk verzoek (zie hierboven). **Partner Onboarding is hierbij definitief bevroren.** Vierde en laatste onderdeel van Sprint 1B, dat hiermee wordt afgesloten.
