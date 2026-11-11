# EuropMade — Marketplace Core: Retailer Created End-to-End Flow

**Status:** Definitief. Functionele waarheid voor de gehele Marketplace Core, basis voor Sprint 1B.
**Vorm:** uitsluitend functionele architectuur — geen wireframes, geen HTML, geen visuele beslissingen.
**Basis:** Blueprint v2.1 (H6, H7, H8, H9, H11, H12, H13), functionele spec Product Cloud/Commerce Cloud/Buy Box, Checkout-spec, Homepage-spec, Marketplace Listing-spec, ADR 0001–0005, Design System v1.0, Sprint 1B-risicobeoordeling.
**Geen nieuwe functionaliteit** is toegevoegd die niet al ergens in bovenstaande documenten stond — dit document **consolideert en maakt expliciet** wat eerder verspreid stond (met name functionele spec sectie 1.6–1.10), en vult uitsluitend de operationele/technische laag in die daar nog ontbrak (database, API's, achtergrondprocessen, security).

---

## 1. Retailer voegt product toe

**Trigger:** retailer klikt "Nieuw product toevoegen" in het Partnerdashboard (scherm #34, nog niet gewireframed), of komt hier via een EAN-zoekopdracht zonder resultaat (scherm #32).

**Preconditie:** retailer is geverifieerd en volledig onboarded (Partner Onboarding, schermen #26–28, inmiddels bevroren — harde gate, zie sectie 24 Security). Categoriestructuur moet al bestaan (Admin scherm #61, Categorie-/filterbeheer) — een product kan niet zonder categorie worden aangemaakt.

**Invoer:** EAN/GTIN als primaire zoeksleutel (functionele spec Product Cloud, sectie 1.6), aangevuld met titel, categorie, basisspecificaties, afbeeldingen.

## 2. Controle of product al bestaat

Systeem zoekt de ingevoerde EAN/GTIN in de Product Cloud. **Belangrijk:** de zoekactie moet over **alle landspecifieke EAN's van hetzelfde artikel** heen zoeken (functionele spec sectie 1.6: "meerdere EAN's per land"), niet alleen op exacte match van het ingevoerde nummer — anders ontstaan onbedoeld dubbele Product Cloud-records voor hetzelfde fysieke product in verschillende landen. Een EAN groepeert geen commerciële varianten (ADR-0050).

**Beslispunt:** bestaat er al een Product Cloud-record voor deze EAN (of een landspecifieke EAN van hetzelfde artikel)?
- Nee → sectie 3–7.
- Ja → sectie 8–11.

---

## 3–7. Product bestaat niet

### 3. Product bestaat niet
Bevestigd: geen bestaand Product Cloud-record. Retailer krijgt het volledige aanmaakformulier (Retailer Created-status).

### 4. Nieuw Product Cloud-record
- Nieuw, onveranderlijk Product-ID gegenereerd (functionele spec sectie 1.9).
- Status: **Retailer Created** (H7.9-levenscyclus).
- Retailer is **tijdelijk eigenaar** van zowel Product Cloud- als Commerce Cloud-velden (functionele spec sectie 1.6/1.7-uitzondering) — dit is de enige situatie in de hele architectuur waarin één rol beide domeinen tegelijk beheert.
- Minimale verplichte velden vóór publicatie (sectie 7): titel, categorie, minimaal één afbeelding, kernspecificaties — exacte volledige veldenlijst is een contentbeslissing, buiten deze functionele scope.

### 5. Nieuw Commerce Cloud-offer
- Gelijktijdig (of direct aansluitend) aangemaakt: één Offer-record, gekoppeld aan de nieuwe EAN/Variant + Region + de aanmakende retailer (functionele spec Commerce Cloud, sectie 2).
- Bevat: prijs, voorraad, levertijd (gestructureerde categorie, geen vrije tekst — sectie 2.4), verzendkosten, land(en), retourvoorwaarden.

### 6. Buy Box-initialisatie
- Ook met precies één aanbieder doorloopt het systeem de **volledige, normale Buy Box-berekening** (server-side, ADR 0005) — **geen speciaal geval voor "N=1"**. Dit is een bewuste architectuurregel: een aparte code-pad voor "enige aanbieder" zou een tweede, ongeteste variant van de Buy Box-logica creëren, wat het risico dat sectie 1 van de Sprint 1B-risicobeoordeling als grootste architectuurrisico aanwijst (Commerce Cloud/Buy Box) alleen maar zou vergroten.
- Resultaat (deze ene aanbieder "wint" per definitie) wordt opgeslagen per Variant × Region (functionele spec sectie 3.1).

### 7. Publicatie op de marketplace
- Statusovergang **Retailer Created → Concept gecontroleerd** wordt getriggerd door een AI-validatie (sectie 12) — geen automatische directe publicatie zonder controle.
- Bij een geslaagde AI-validatie: status → **Actief**. Het product wordt vanaf dit moment vindbaar in Zoekresultaten/Categoriepagina (CMP-017/034/035/036, al bevroren) en komt in aanmerking voor de Homepage-secties "Uitgelicht" (Homepage-spec, sectie 2, sectie 5 — algoritmisch, nooit direct bij publicatie).
- Bij een niet-geslaagde AI-validatie: naar de Administrator-moderatiewachtrij (scherm #57), niet naar de retailer terug zonder verdere toelichting (zie sectie 14).

---

## 8–11. Product bestaat wel

### 8. Product bestaat wel
EAN/GTIN matcht een bestaand Product Cloud-record. Twee subgevallen:
- **8a.** Product is al geclaimd door een Producent/Merkhouder → retailer kan geen Product Cloud-velden aanmaken/wijzigen, uitsluitend een eigen Offer toevoegen (sectie 11) of een wijzigingsvoorstel indienen (sectie 10).
- **8b.** Product staat nog als Retailer Created bij een **andere** retailer (nog niet geclaimd) → deze retailer mag **eveneens** een eigen Offer aan hetzelfde product koppelen (meerdere retailers kunnen gelijktijdig een niet-geclaimd product verkopen — een regel die impliciet al in het Buy Box-model besloten lag maar hier voor het eerst expliciet wordt vastgelegd). Productinformatie blijft beheerd door de oorspronkelijke aanmaker totdat een claim plaatsvindt.

### 9. Claimproces
Volledige uitwerking, zie functionele spec Product Cloud sectie 1.6 — hier samengevat als stap in de end-to-end flow (loopt normaliter **niet** synchroon binnen déze retailer-sessie, maar asynchroon zodra een producent het product later matcht):
1. Producent zoekt/matcht op EAN of merknaam (proactieve suggestie mogelijk).
2. Klikt "Dit is mijn product".
3. Systeem verifieert de producent-/merkhouderstatus van de claimende partij (verificatiemethode: **nog open, zie Openstaande beslissingen**).
4. Bij geslaagde verificatie: automatische overdracht van Product Cloud-eigenaarschap; alle betrokken retailers behouden uitsluitend hun Commerce Cloud-Offers.
5. Betrokken retailer(s) ontvangen een melding (sectie 22).
6. Eventuele openstaande wijzigingsvoorstellen worden automatisch omgezet naar de nieuwe producent.
7. Bij een betwiste claim: escalatie naar Administrator-geschillenbeheer (scherm #58).

### 10. Producent accepteert of weigert (wijzigingsvoorstel)
Van toepassing wanneer een retailer bij een **al geclaimd** product (8a) een correctie wil voorstellen — functionele spec sectie 1.8:
1. Retailer dient wijzigingsvoorstel in (veld + toelichting).
2. AI-voorcontrole (sectie 12).
3. Producent beoordeelt: **accepteert** (wijziging live, retailer krijgt melding) of **weigert** (retailer krijgt melding + reden).

### 11. Retailer voegt alleen een nieuw aanbod toe
De commerciële kernactie die in elk van de bovenstaande gevallen (8a, 8b, en ná succesvolle claim-afhandeling elders) altijd hetzelfde is: de retailer maakt **uitsluitend** een Commerce Cloud-Offer aan (zelfde structuur als sectie 5), zonder dat dit ooit Product Cloud-velden raakt. Dit is de meest voorkomende actie in een volwassen marketplace (nieuwe verkopers van bestaande producten) en tegelijk de eenvoudigste — geen claim, geen Product Cloud-schrijfactie, geen AI-validatie van productinformatie nodig (wel een lichte validatie van de Offer zelf, zie sectie 12).

---

## 12. AI-validaties

Drie afzonderlijke toepassingen, telkens hergebruik van hetzelfde onderliggende concept (H12 AI Platform), niet drie verschillende systemen:
1. **Nieuw Product Cloud-record (sectie 4/7):** volledigheids-/plausibiliteitscontrole vóór de status Retailer Created → Concept gecontroleerd kan overgaan.
2. **Wijzigingsvoorstel (sectie 10):** voorcontrole vóór het bij de producent terechtkomt (functionele spec sectie 1.8, al vastgelegd).
3. **Nieuwe Offer (sectie 5/11):** lichte plausibiliteitscontrole (bijv. prijs die significant afwijkt van vergelijkbare aanbiedingen) — **nieuw expliciet gemaakt in dit document**, maar geen nieuwe functionaliteit: valt onder dezelfde AI-review-filosofie als de andere twee, nu voor het eerst toegepast op Offers in plaats van uitsluitend op Product Cloud-content.

**Openstaande technische vraag** (zie Openstaande beslissingen): of dit via een synchrone AI-call binnen de aanmaakactie loopt, of asynchroon na opslaan — dit bepaalt of sectie 7's statusovergang direct of vertraagd is.

## 13. Verified™-controle

Herbevestiging van functionele spec sectie 1.10, met één regel die in dit document voor het eerst **expliciet als harde afhankelijkheid** wordt vastgelegd: **een Retailer Created-product kan nooit Verified™ worden vóórdat het geclaimd is.** Een van de voorwaarden voor Verified™ is immers "controle/goedkeuring door de producent" (spec sectie 1.10) — zolang een retailer tijdelijk eigenaar is (sectie 1.6/1.7-uitzondering), bestaat er per definitie geen producent die kan goedkeuren. Dit blokkeert Verified™ architecturaal, niet alleen procedureel.

## 14. Administrator-interventies

Vier concrete interventiepunten in deze flow:
1. **Vóór sectie 1:** Partner Onboarding-goedkeuring (zonder dit kan de flow nooit starten).
2. **Sectie 7:** moderatiewachtrij bij een niet-geslaagde AI-validatie op een nieuw Product Cloud-record.
3. **Sectie 9:** geschillenbemiddeling bij een betwiste claim.
4. **Doorlopend:** categorie-/filterbeheer (#61) — geen interventie in déze flow, maar een harde prerequisite (sectie 1).

## 15. Foutscenario's

- **Ongeldige/misvormde EAN-invoer** → directe validatiefout, geen serverroundtrip nodig.
- **Gelijktijdige aanmaak van dezelfde nieuwe EAN door twee retailers** (race condition) → zie Edge cases (sectie 16) voor de oplossingsregel.
- **Verplichte velden ontbreken bij publicatiepoging** (sectie 7) → blokkerende foutmelding, product blijft in Retailer Created-status.
- **AI-validatieservice niet beschikbaar** → product gaat niet automatisch door naar Actief, valt terug naar de Administrator-moderatiewachtrij (nooit onbeperkt laten wachten op een onbeschikbare dienst).
- **Claim-verificatieservice niet beschikbaar** (sectie 9, stap 3) → claim blijft "in behandeling", geen automatische afwijzing of goedkeuring bij een storing.

## 16. Edge cases

- **Twee retailers maken bijna gelijktijdig hetzelfde nieuwe product aan** (zelfde EAN, race condition) → de eerste succesvolle aanmaak wint; de tweede poging wordt door de EAN-controle (sectie 2) alsnog herkend en automatisch omgeleid naar "voeg een aanbod toe aan het bestaande product" (sectie 11), niet naar een dubbel Product Cloud-record.
- **Retailer die het enige Offer van een niet-geclaimd product is, wordt geschorst** → Product Cloud-record blijft bestaan (informatie gaat niet verloren), maar er is geen enkele actieve aanbieder meer → product-status behoeft een vastgestelde regel (zie Openstaande beslissingen — nog niet expliciet vastgelegd in H7.9 welke status dit precies wordt).
- **Een bundel of andere zelfstandig verkoopbare uitvoering** is een eigen Product Cloud-product met een eigen EAN (ADR-0050). Een landspecifieke EAN van hetzelfde artikel blijft het bestaande product. Een EAN maakt geen commerciële variantgroep.
- **Claim vindt plaats terwijl een retailer net een wijzigingsvoorstel had openstaan** → al opgelost (sectie 9, stap 6: automatische omzetting), hier herbevestigd.
- **Product met precies één aanbieder die zijn Offer deactiveert** (niet geschorst, eigen keuze) → zelfde vraagstuk als bovenstaande schorsingscasus, zelfde open status-vraag.

## 17. Acceptatiecriteria

- [ ] Een EAN-zoekactie doorzoekt alle landspecifieke EAN's van hetzelfde artikel, niet alleen exacte invoer. Een EAN groepeert geen kleur, maat of bundel.
- [ ] Een nieuw Product Cloud-record krijgt altijd de status Retailer Created bij aanmaak, nooit direct Actief.
- [ ] Een Offer wordt voor elk nieuw product aangemaakt vóórdat de Buy Box-berekening plaatsvindt — nooit een product zonder minimaal één Offer dat toch een Buy Box-resultaat toont.
- [ ] De Buy Box-berekening bij precies één aanbieder gebruikt exact dezelfde code-/logicapad als bij meerdere aanbieders.
- [ ] Een product wordt pas vindbaar in Zoekresultaten/Categoriepagina/Homepage-secties na een geslaagde AI-validatie en de statusovergang naar Actief.
- [ ] Een Retailer Created-product kan de Verified™-aanvraagoptie nooit tonen zolang het niet geclaimd is.
- [ ] Twee retailers die (bijna) gelijktijdig dezelfde nieuwe EAN aanmaken, resulteren nooit in twee Product Cloud-records.
- [ ] Elke claim, statuswijziging en Administrator-interventie wordt gelogd (zie sectie 23).

## 18. Medusa-standaard versus maatwerk

| Onderdeel | Bouwaard |
|---|---|
| Product/Variant-basisrecord | Standaard Medusa Product-module, custom velden voor eigenaarschap/status/EAN-hiërarchie (`01-architecture/standard-vs-custom.md`). |
| EAN/GTIN als meervoudige, landspecifieke identifier | **Maatwerk** (geen standaard Medusa-concept). |
| Offer-record (Commerce Cloud) | **Maatwerk** — kern van het "1 product = N aanbieders"-model. |
| Buy Box-berekening | **Maatwerk, uitsluitend server-side** (ADR 0005). |
| Categorie-structuur | Standaard Medusa Product Category, Product Cloud-gestuurd. |
| Claim-/eigenaarschapsoverdracht | **Maatwerk**, gebruikt Medusa Workflows als technisch fundament voor de orkestratie (vergelijkbaar met wijzigingsvoorstel-afhandeling). |
| Wijzigingsvoorstel-workflow | Maatwerk logica op standaard Medusa Workflow-engine. |
| AI-validatie | **Maatwerk integratie** (extern of intern AI-platform, H12), geen Medusa-standaardfunctie. |
| Notificaties | Grotendeels standaard bouwpatroon (event-gedreven), inhoud/regels maatwerk. |
| Zoekindexering | Standaard integratiepatroon met externe zoekservice (`01-architecture/standard-vs-custom.md`), geen Medusa-kernfunctie. |

## 19. Database-objecten die geraakt worden

`Product`, `ProductVariant` (technische variant, ADR-0050), `ProductIdentifier` (EAN/GTIN, meervoudig/landspecifiek voor hetzelfde artikel — custom), `Offer` (custom, Commerce Cloud-kernentiteit), `Region`, `Store`/Retailer-account, `ProductOwnershipRecord` (custom — legt vast wie Product Cloud-velden mag wijzigen), `ChangeProposal` (custom — wijzigingsvoorstel), `ProductQualityScore` / `ProductHealthScore` (custom), `VerifiedStatus` (custom), `BuyBoxResult` (custom, per technische variant × regio), `AuditLogEntry` (custom), `Notification`.

## 20. API's die geraakt worden

- **Product Cloud API** (custom module): product aanmaken/wijzigen, EAN-lookup over landspecifieke EAN's van hetzelfde artikel.
- **Commerce Cloud/Offer API** (custom module): Offer aanmaken/wijzigen.
- **Buy Box-berekeningsservice** (custom, uitsluitend server-side aanroepbaar — ADR 0005, nooit vanaf de client).
- **Claim-/eigenaarschap-API** (custom): claim indienen, verificatie, overdracht.
- **Wijzigingsvoorstel-API** (custom): indienen, beoordelen.
- **AI-validatie-API** (custom integratie, H12).
- **Zoekindexering-API** (integratie met externe zoekservice, event-gedreven bij statusovergang naar Actief).
- **Notificatie-API** (event-gedreven).
- **Admin-moderatie-API** (wachtrij, escalatie).

## 21. Achtergrondprocessen

- Buy Box-herberekening bij elke relevante wijziging (nieuwe/gewijzigde/verwijderde Offer, prijs-/voorraadwijziging elders) — altijd server-side, event-gedreven, nooit on-demand vanuit de client (ADR 0005).
- Product Quality Score/Health Score-herberekening (periodiek en/of event-gedreven bij contentwijziging).
- Zoekindex-update (asynchroon, getriggerd door statusovergang naar Actief of latere wijziging).
- AI-validatiewachtrij-verwerking (asynchroon).
- Periodieke Verified™-hercontrole (functionele spec sectie 1.10: elke 6 maanden, of direct getriggerd door een Product Health-waarschuwing).

## 22. Meldingen

| Ontvanger | Trigger |
|---|---|
| Retailer | Product aangemaakt (Retailer Created), product live (Actief), product naar moderatiewachtrij, claim door producent ontvangen, wijzigingsvoorstel geaccepteerd/geweigerd. |
| Producent | Niet-geclaimd product van eigen merk gevonden (proactieve suggestie), nieuw wijzigingsvoorstel ontvangen. |
| Administrator | AI-validatie-escalatie, betwiste claim, (indirect) elke nieuwe partneraanmelding vóór deze flow kan starten. |

## 23. Audit logging

Conform H13.11: elke ownership-wijziging (claim), elke statusovergang (Retailer Created → Concept gecontroleerd → Actief, en verder), elke Administrator-interventie, en elke wijziging aan de Buy Box-configuratie (al vastgelegd via ADR 0001) wordt gelogd met tijdstip, gebruiker, oude/nieuwe waarde en reden — dezelfde regel als voor Product Cloud-versiebeheer (functionele spec sectie 1.9), hier bevestigd van toepassing op de volledige flow, niet alleen op contentwijzigingen.

## 24. Security

- **Alle rechten worden server-side gehandhaafd**, nooit op basis van client-side aannames — rechtstreekse toepassing van de ADR 0005-filosofie (server-side-only) op de volledige flow, niet uitsluitend op de Buy Box.
- Partner Onboarding is een **harde toegangspoort**: geen enkele stap in deze flow is bereikbaar zonder geverifieerd partneraccount.
- EAN/GTIN- en overige invoer wordt server-side gevalideerd/gesaniteerd (voorkomt injectie via productdata die later op publieke pagina's wordt getoond).
- Rate-limiting op productaanmaak per account (voorkomt geautomatiseerd misbruik/spam van de Product Cloud).
- Claim-verificatie mag nooit uitsluitend op een client-ingestuurde bewering vertrouwen — altijd een servergestuurde controle (methode nog open, zie hieronder).

## 25. Rechten per rol (toegepast op deze flow)

| Actie in deze flow | Retailer | Producent/Merkhouder | Administrator |
|---|---|---|---|
| EAN-zoekactie starten | ✅ | ✅ | ✅ |
| Nieuw Product Cloud-record aanmaken (Retailer Created) | ✅ | ✅ | ❌ |
| Product Cloud-velden wijzigen ná claim | ❌ (alleen voorstel) | ✅ | ✅ (moderatie) |
| Nieuwe Offer aanmaken | ✅ | ✅ (indien ook verkoper) | ❌ |
| Claim indienen | ❌ | ✅ | ❌ |
| Claim verifiëren/afhandelen bij geschil | ❌ | ❌ | ✅ |
| Wijzigingsvoorstel indienen | ✅ | ✅ (eigen product) | ❌ |
| Wijzigingsvoorstel beoordelen | ❌ | ✅ | ✅ (escalatie) |
| Verified™ aanvragen | ❌ | ✅ | ❌ |
| Moderatiewachtrij behandelen | ❌ | ❌ | ✅ |

*(Consistent met de rollenmatrix in de functionele spec Product Cloud/Commerce Cloud/Buy Box, sectie 4 — hier toegespitst op deze specifieke flow.)*

---

## 26. Volledige end-to-end flow

```
Retailer klikt "Nieuw product toevoegen" (§1)
        │
        ▼
EAN/GTIN-invoer → Product Cloud-lookup over landspecifieke EAN's van hetzelfde artikel (§2)
        │
        ├── Product bestaat NIET ──────────────────────────────────────┐
        │                                                              │
        │        Nieuw Product Cloud-record, status                   │
        │        "Retailer Created", retailer = tijdelijk              │
        │        eigenaar (§3–4)                                       │
        │               │                                              │
        │               ▼                                              │
        │        Nieuwe Commerce Cloud-Offer                           │
        │        (prijs/voorraad/levertijd/verzending) (§5)            │
        │               │                                              │
        │               ▼                                              │
        │        Buy Box-initialisatie — volledige server-side         │
        │        berekening, ook bij 1 aanbieder (§6)                  │
        │               │                                              │
        │               ▼                                              │
        │        AI-validatie (§12) ──── mislukt ──► Admin-            │
        │               │                            moderatiewachtrij │
        │               │ geslaagd                          (§14)     │
        │               ▼                                              │
        │        Status: Concept gecontroleerd → Actief (§7)           │
        │               │                                              │
        │               ▼                                              │
        │        Vindbaar in Zoekresultaten/Categoriepagina/           │
        │        Homepage-secties (reeds bevroren schermen)            │
        │               │                                              │
        │               ▼                                              │
        │        (Later, asynchroon) Producent claimt product (§9)     │
        │               │                                              │
        │               ▼                                              │
        │        Eigenaarschap Product Cloud → Producent;              │
        │        retailer behoudt Commerce Cloud-Offer                 │
        │               │                                              │
        │               ▼                                              │
        │        Verified™ nu pas mogelijk (§13, was geblokkeerd        │
        │        zolang Retailer Created)                              │
        │                                                              │
        └── Product bestaat WEL ───────────────────────────────────────┘
                        │
                        ├── Al geclaimd door Producent (§8a)
                        │         │
                        │         ├── Retailer wil correctie → Wijzigingsvoorstel →
                        │         │   AI-voorcontrole (§12) → Producent accepteert/
                        │         │   weigert (§10)
                        │         │
                        │         └── Retailer voegt uitsluitend een nieuwe
                        │             Commerce Cloud-Offer toe (§11) →
                        │             Buy Box herberekend (§6, achtergrondproces §21)
                        │
                        └── Nog niet geclaimd, andere retailer eigenaar (§8b)
                                  │
                                  └── Deze retailer voegt eveneens een Offer toe (§11)
                                      → meerdere retailers, één nog niet geclaimd
                                        product → Buy Box kiest tussen hen (§6)
```

---

## 27. Architectuurrisico's

1. **Commerce Cloud/Buy Box blijft het grootste architectuurrisico van de hele flow** (bevestigt de Sprint 1B-risicobeoordeling) — deze flow is de eerste plek waar dat risico daadwerkelijk end-to-end wordt blootgelegd, inclusief het "geen speciaal geval voor N=1"-principe (§6), dat zelf weer een nieuw, expliciet architectuurrisico is: als dit principe niet consequent wordt gehandhaafd, ontstaan er twee divergerende Buy Box-codepaden.
2. **Race condition op gelijktijdige EAN-aanmaak** (§16) vereist een database-niveau uniekheidsgarantie (bijv. een unieke constraint op EAN + statuscontrole), niet alleen een applicatieniveau-check — dit is nog niet als technische eis vastgelegd buiten dit document.
3. **AI-validatie als blokkerende stap in de publicatieflow** (§7, §12) introduceert een externe afhankelijkheid in een verder volledig first-party-architectuur — een storing in deze dienst mag de hele publicatieflow niet blijvend blokkeren (foutscenario al benoemd, §15), maar de exacte fallback-tijdslimiet is niet vastgelegd.

## 28. Ontwikkelrisico's

1. De **claim-verificatiemethode** (§9, stap 3) is nog niet gekozen (handmatige Administrator-review vs. geautomatiseerde koppeling met een handelsregister-API) — dit bepaalt zowel de doorlooptijd van een claim als de benodigde techniek, en is een afhankelijkheid voor zowel Product Claim Flow als Producent Dashboard (Sprint 1B-risicobeoordeling, rang 3–4).
2. **AI-validatie-integratie** (§12) heeft geen vastgelegde technische aanpak (welk model, synchroon vs. asynchroon, kostenmodel) — dit raakt drie verschillende plekken in de flow tegelijk, dus een verkeerde keuze hier heeft grote reikwijdte.
3. **Status bij nul actieve aanbieders** (§16, geschorste/gedeactiveerde enige retailer) is geen vastgelegde regel in de H7.9-levenscyclus — zonder deze beslissing kan de Buy Box-service een niet-gedefinieerde toestand tegenkomen.

## 29. Openstaande beslissingen

1. Exacte verificatiemethode voor producent-/merkhouderclaims (functionele spec sectie 1.10, hier herbevestigd als blokkerend voor §9).
2. Synchrone vs. asynchrone AI-validatie, en de fallback-tijdslimiet bij een storing (§12, §27 punt 3).
3. Statuswaarde voor een product zonder enige actieve aanbieder (§16, §28 punt 3) — ontbreekt in de bestaande H7.9-levenscyclus.
4. Minimale verplichte veldenlijst vóór publicatie (§4) — expliciet buiten deze functionele scope gehouden, is een contentbeslissing.

Geen van deze vier openstaande beslissingen blokkeert het starten van Sprint 1B-wireframes — ze zijn relevant voor de **technische implementatie**, niet voor de UX-vormgeving van de betrokken schermen.

## 30. Advies: welke wireframes hierna als eerste

Consistent met het eindadvies uit de Sprint 1B-risicobeoordeling, nu verder onderbouwd door deze flow-uitwerking:

1. **Scherm #34 — Product toevoegen (Retailer Created)**, inclusief het gecombineerde sectie 4+5-moment (Product Cloud-record + eerste Offer in één flow) — dekt sectie 1–7 van dit document, het grootste deel van de nog niet gevalideerde architectuur.
2. **Scherm #35/#31 — Productdetail commerciële gegevens / Productoverzicht**, om sectie 11 (nieuwe Offer aan bestaand product) te ondersteunen — de meest voorkomende actie in een volwassen marketplace, en tweede-goedkoopste manier om de Buy Box met een tweede aanbieder te testen (een scenario met N>1 aanbieders, wat sectie 6 nog niet zonder deze stap kan valideren).
3. **Scherm #39 — Product claimen**, om sectie 9 te ondersteunen — pas zinvol zodra #34 al Retailer Created-producten heeft opgeleverd om te claimen.
4. **Scherm #37/#38 — Wijzigingsvoorstel indienen/beoordelen**, om sectie 10 te ondersteunen — pas zinvol zodra #39 al een geclaimd product heeft opgeleverd.

Deze volgorde volgt direct de afhankelijkheidsketen die in dit document zichtbaar is geworden (§26): elke volgende stap in de flow vereist dat de vorige al als wireframe/scherm bestaat om realistisch te kunnen testen.

---

## Status: definitief

Dit document is de functionele waarheid voor de Marketplace Core. Alle volgende Sprint 1B-wireframes voor Retailer/Producent-schermen moeten hiernaar verwijzen en er niet mee in tegenspraak zijn.
