# EuropMade — Product Management: Functionele Specificatie (Sprint 1C)

**Status:** v1.1 — **definitief bevroren.** Verwerkt zeven goedgekeurde bevindingen (B-PM1, B-PM2, B-PM3, B-PM4, B-PM6, B-PM7, B-PM8) uit de onafhankelijke functionele review; B-PM5 en B-PM9 t/m B-PM12 bewust niet verwerkt op uitdrukkelijk verzoek.
**Tweede onderdeel van Sprint 1C**, bouwt uitsluitend voort op de bevroren Product Cloud Architecture (`product-cloud-architecture/spec.md`, v1.1).
**Basis:** Blueprint v2.1, Product Cloud Architecture (bevroren), Marketplace Core (bevroren), Authenticatie-spec (bevroren, RBAC/2FA), Partner Onboarding-spec (bevroren, reviewer-checklist-patroon), Design System (41 componenten, definitief), ADR 0001–0013.
**Scope:** functionele specificatie en UX-flow op hoofdlijnen — **geen definitieve wireframes** (die volgen in een latere Sprint 1C-stap, ná akkoord op dit document).
**Nadrukkelijk:** dit document wijzigt niets aan enig bevroren document. Het is de **operationele module** die de al vastgelegde Product Cloud-architectuur voor twee doelgroepen (interne Beheerders, geverifieerde Producenten) daadwerkelijk bruikbaar maakt — geen nieuwe architecturale concepten, geen nieuwe scope.

---

## 1. Functionele specificatie — doel en doelgroepen

**Doel:** Product Management is de werkomgeving waarin (a) een geverifieerde Producent/Merkhouder zijn **eigen** productcatalogus beheert, en (b) een Beheerder **platformbreed** kan zoeken, modereren, verifiëren en ingrijpen — beide volgens exact de regels die al in de Product Cloud Architecture zijn vastgelegd.

| Doelgroep | Reikwijdte | Kernactiviteiten |
|---|---|---|
| **Producent/Merkhouder** (geverifieerd, Partner Onboarding-goedgekeurd) | Uitsluitend eigen producten (OwnershipRecord, `product-cloud-architecture/spec.md` Deel 4) | Product aanmaken, versies beheren, indienen voor review, publiceren, Verified aanvragen, eigen wijzigingsvoorstellen van retailers beoordelen, eigen audit-historie inzien. |
| **Beheerder** | Volledige catalogus, platformbreed | Alles wat een Producent kan (bij escalatie/moderatie), plus: claims/geschillen beslechten, matching-kandidaten beoordelen, merge/split uitvoeren, verificatie-eindbeslissingen nemen, fraude-signalen behandelen, platformbrede audit-log, bulkacties. |

Geen enkele bevoegdheid in dit document wijkt af van de al vastgelegde rechtenmatrix (`product-cloud-commerce-cloud-buy-box/spec.md` §4, herbevestigd in `product-cloud-architecture/spec.md` Deel 4/9) — dit document past die rechten uitsluitend toe op een concrete werkomgeving.

---

## 2. Domeinprocessen

Product Management ontsluit precies de processen die de Product Cloud Architecture al definieert — geen nieuwe processen, uitsluitend de operationele toegang ertoe:

1. **Product aanmaken** (Producent) — nieuw Product + eerste ProductVersion (Concept).
2. **Product bewerken** (Producent, eigenaar) — nieuwe ProductVersion vanuit de huidige Gepubliceerde versie.
3. **Wijzigingsvoorstel verwerken** (Producent, ontvangen van een Retailer — al bevroren mechanisme, Product Cloud-spec §1.8) — accepteren (stroomt in als nieuw Concept) of afwijzen.
4. **Claim beoordelen** (Beheerder, bij handmatige beoordeling — Deel 4.4) of **automatisch afgehandeld** (bij geldige identifier-match, geen menselijke tussenkomst nodig).
5. **Matching-kandidaat beoordelen** (Beheerder of Retailer bij eigen listing, Deel 5.1).
6. **Merge/Split uitvoeren** (uitsluitend Beheerder, Deel 5.3–5.4).
7. **Verificatie aanvragen** (Producent, Deel 7.3) → **beoordelen** (Beheerder, Deel 7.4).
8. **Geschil behandelen** (uitsluitend Beheerder, Deel 4.5, via de Dispute-entiteit).
9. **Fraude-signaal behandelen** (Beheerder, Deel 9.3).
10. **Product archiveren/verwijderen** (eigenaar voor Concept/In review, alleen Beheerder voor productlevenscyclus-niveau ingrepen).

---

## 3. CRUD-flow per product

**Belangrijk architecturaal uitgangspunt, hergebruikt uit de bevroren spec:** CRUD werkt primair op **ProductVersion**-niveau, niet direct op Product — een Product zelf heeft geen "bewerken"-actie, uitsluitend een reeks versies waarvan er precies één Gepubliceerd is (Product Cloud Architecture Deel 8.2).

| Actie | Wie | Resultaat |
|---|---|---|
| **Create** | Producent | Nieuw Product (nieuwe `product_id`) + eerste ProductVersion in status Concept. Verplichte velden per Deel 2 van de architectuur (titel, merk, fabrikant, categorie, minimaal één afbeelding, minimaal één Identifier of expliciete "geen GTIN/EAN beschikbaar"-markering die MPN-gebruik activeert). |
| **Read** | Producent (eigen), Beheerder (alle) | Toont alle drie de statusassen apart (levenscyclus/publicatie/verificatie) plus de afgeleide Visibility — nooit samengevoegd tot één statuslabel (architectuurregel, Deel 8.1). |
| **Update** | Eigenaar (Producent), of Beheerder bij escalatie | Start een nieuw Concept vanuit de huidige Gepubliceerde versie — nooit een directe overschrijving. Eén actief Concept per Product tegelijk (architectuurregel, zie sectie 4 voor de conflictregel bij een binnenkomend wijzigingsvoorstel). |
| **Delete** | Eigenaar, uitsluitend op Concept/In review vóór ooit gepubliceerd | Consistent met Deel 8.2: een reeds Gepubliceerde versie kan nooit "Verwijderd" worden, uitsluitend Gearchiveerd via een nieuwe publicatie die haar vervangt. Het **Product zelf** archiveren/deactiveren (productlevenscyclus-niveau, niet publicatieniveau) is een aparte, zwaardere actie — zie sectie 3A. |

**Conditionele velden:** Europese productieverificatie-gerelateerde velden (productielocatie, fabrikant-eigendom) zijn uitsluitend verplicht/zichtbaar wanneer de Producent-rol dat vereist — consistent met hoe Partner Onboarding dit al conditioneel toonde (bevroren precedent, hergebruikt, niet opnieuw uitgevonden).

---

## 3A. Productlevenscyclusstatus — beheerproces (nieuw, verwerkt na functionele review, B-PM1)

**Ontbrak volledig in v1.0** — de CRUD-tabel (sectie 3) verwees naar een beheerproces voor de productlevenscyclusstatus (As 1, `product-cloud-architecture/spec.md` §1.10/Deel 8.1: *Retailer Created → Concept gecontroleerd → Actief → Verified™ → Uitlopend → Niet meer leverbaar → Gearchiveerd*) dat nergens daadwerkelijk beschreven stond. Dit is hierbij, uitsluitend als operationele toepassing van de al bevroren, ongewijzigde statuswaarden, alsnog vastgelegd — **geen nieuwe status, geen nieuwe architectuur**, uitsluitend het ontbrekende beheerproces eromheen.

| Overgang | Wie | Trigger | Gevolg voor Offers (Commerce Cloud, ongewijzigd) |
|---|---|---|---|
| Retailer Created → Concept gecontroleerd | Systeem, automatisch | Een claim wordt goedgekeurd (Deel 4.4) of een Producent voltooit de eerste, nog niet gepubliceerde bewerking | Geen — Offers blijven ongewijzigd actief gedurende deze overgang. |
| Concept gecontroleerd → Actief | Systeem, automatisch | De eerste ProductVersion wordt gepubliceerd (sectie 4) | Geen — dit is het moment waarop het product voor het eerst als volwaardig, doorlopend beheerd geldt. |
| Actief → Verified™ | Systeem, automatisch | De Verification Workflow (sectie 6) resulteert in "Geverifieerd" | Geen. |
| Actief/Verified™ → Uitlopend | **Eigenaar (Producent)**, handmatig | Producent kondigt aan dat het product wordt uitgefaseerd maar nog wel voorradig/bestelbaar is | Geen directe wijziging — bestaande Offers blijven actief; dit is uitsluitend een signaal, geen blokkade. |
| Uitlopend/Actief/Verified™ → Niet meer leverbaar | **Eigenaar (Producent)**, handmatig | Producent geeft aan dat het product niet langer besteld kan worden | Alle actieve Offers voor dit product worden **niet-bestelbaar** (bestaande, al geplaatste orders blijven ongewijzigd — Commerce Cloud/Checkout-logica hierover is al bevroren en wordt door dit document niet gewijzigd); het product blijft zichtbaar (historisch, bijv. voor reeds geplaatste orders) maar niet meer vindbaar via zoeken/categorieën (Visibility-regel, architectuur Deel 8.1, ongewijzigd toegepast). |
| Niet meer leverbaar → Gearchiveerd | **Uitsluitend Beheerder**, handmatig | Definitieve archivering, zwaarder dan "Niet meer leverbaar" — bijv. bij langdurige inactiviteit of op verzoek van de eigenaar | Onomkeerbaar voor het Product als geheel (niet te verwarren met de al bevroren, wél omkeerbare Merge/Split, Deel 5.3–5.4); alle onderliggende data (ProductVersions, OwnershipRecords, AuditLogEntries) blijft volledig bewaard, consistent met het architectuurprincipe dat niets ooit hard verdwijnt (Deel 1.1). |

**Waarom de laatste stap uitsluitend een Beheerder-bevoegdheid is:** consistent met de al bevroren regel dat elke onomkeerbare, platformbrede ingreep bij de Beheerder ligt (architectuur Deel 9.2) — een eigenaar kan zijn product laten "verdwijnen" uit de actieve verkoop (Niet meer leverbaar), maar niet zelfstandig de definitieve archivering forceren.

---

## 4. Product Version Management

- **Concept starten/hervatten:** een Producent kan op elk moment een nieuw Concept starten vanuit de huidige Gepubliceerde versie, of een al gestart Concept hervatten — server-side bewaard, geen tijdslimiet (zelfde patroon als Partner Onboarding's Concept-status, hergebruikt).
- **Conflictregel: actief Concept + binnenkomend wijzigingsvoorstel (nieuw, verwerkt na functionele review, B-PM3).** Sectie 2 (punt 3) stelt dat een geaccepteerd wijzigingsvoorstel "instroomt als nieuw Concept" — dit botste met de regel "één actief Concept per Product tegelijk" wanneer de eigenaar al een eigen Concept in bewerking had. Opgelost: als er al een actief Concept bestaat op het moment van acceptatie, worden de voorgestelde velden **toegevoegd aan dat bestaande Concept** (als aanvullende, nog niet ingediende wijzigingen) in plaats van een tweede, concurrerend Concept te starten — de "één Concept tegelijk"-regel blijft daarmee onverkort gelden, zonder dat een voorstel van een retailer verloren gaat of de acceptatie geblokkeerd hoeft te worden.
- **Indienen voor review:** verplaatst het Concept naar "In review." Het risiconiveau van de wijziging (welke velden zijn gewijzigd) bepaalt automatisch of dit een lichte AI-check of een verplichte menselijke reviewstap wordt (architectuurregel, Deel 8.4) — de Producent kiest dit niet zelf, het volgt uit de velddefinities.
- **Goedgekeurd ≠ Gepubliceerd:** een goedgekeurde versie kan bewust nog even "op de plank" blijven liggen (bijv. een producent die een aangepaste beschrijving klaarzet vóór een lancering) — publicatie is een aparte, expliciete actie van de eigenaar, nooit automatisch na goedkeuring.
- **Publiceren:** maakt de versie de actieve, klantzichtbare versie; de vorige Gepubliceerde versie schuift automatisch naar Gearchiveerd (nooit verloren, architectuurregel).
- **Rollback:** eigenaar kan een Gearchiveerde versie opnieuw publiceren. **Verified-gevolg, expliciet hergebruikt uit de architectuur (B2-fix):** een rollback naar de exact geverifieerde versie houdt het Verified-badge actief; een rollback naar elke andere versie trekt het badge automatisch in, met een directe melding en een herbeoordelingsmogelijkheid.
- **Gevolg voor een lopende Verificatie-aanvraag bij een nieuwe publicatie of rollback (nieuw, verwerkt na functionele review, B-PM4).** Een Verificatie-aanvraag met status "Aangevraagd" of "In beoordeling" (sectie 6) is gebonden aan de ProductVersion die op het moment van aanvragen de Gepubliceerde versie was. Als de eigenaar tussentijds — terwijl de aanvraag nog loopt — een nieuwe versie publiceert of een rollback naar een andere versie uitvoert, wordt de lopende aanvraag **automatisch ingetrokken** (niet afgewezen — dit is geen inhoudelijk oordeel, uitsluitend een gevolg van het feit dat de beoordeelde versie niet meer de actuele is) met een directe melding aan de eigenaar en de mogelijkheid direct een nieuwe aanvraag te starten voor de nu actuele versie. Dit voorkomt dat een Beheerder een versie beoordeelt die inmiddels niet meer live is.
- **Versievergelijking:** de Producent/Beheerder kan twee versies naast elkaar zien (welke velden zijn gewijzigd, oud vs. nieuw) — dit is een **weergavefunctie** op de al bestaande ProductVersion-historie (architectuur Deel 8.5), geen nieuw datamodel-concept, uitsluitend een manier om de al vastgelegde velddata te tonen.

---

## 5. Moderation Workflow

**Uitsluitend Beheerder-bevoegdheid** (architecturaal al vastgelegd, Deel 9.2) — Product Management ontsluit dit via een **moderatiewachtrij**, geen nieuw concept, uitsluitend het operationele venster op wat al bestaat:

| Wachtrij-item | Herkomst | Mogelijke uitkomsten |
|---|---|---|
| Hoog-risico publicatiewijziging | Deel 8.4 (compliance-veld, categoriewijziging, kernidentiteitsveld) | Goedkeuren → Gepubliceerd (na eigenaar-publicatie) / Afwijzen → terug naar Concept |
| Claim zonder identifier-match | Deel 4.4 | Goedkeuren → eigendomsoverdracht / Afwijzen (met reden) / Aanvullende informatie vereist |
| Matching-kandidaat (mogelijk duplicaat) | Deel 5.1–5.2 | Merge uitvoeren / Geen actie (bevestigd geen duplicaat) |
| Dispute (geschil) | Deel 4.5 | Bevestiging huidige eigenaar / Overdracht / Tijdelijke terugzetting naar niet-geclaimd |
| Fraude-signaal | Deel 9.3 | Geen actie / **Geëscaleerd** (lokaal eindpunt binnen deze wachtrij — zie toelichting) |
| Melding door derde partij | Deel 9.4 | Zelfde behandeling als Dispute of losse contentmoderatie, afhankelijk van aard |

**AI-ondersteuning, consistent met de architectuur:** elk wachtrij-item kan een AI-gegenereerde samenvatting/aanbeveling tonen (bijv. bij matching: de gevonden overeenkomsten/verschillen; bij claims: identifier-vergelijking) — **nooit een vooraf ingevulde beslissing**, uitsluitend context ter ondersteuning van de menselijke keuze (architectuurregel Deel 9.1, geen uitzondering in deze module).

**Prioritering:** de wachtrij toont van oud naar nieuw binnen elke categorie (ontvangstvolgorde, consistent met Deel 4.4's regel voor gelijktijdige claims) — geen kunstmatige, per-item afwijkende prioriteit in de MVP.

**Lokaal eindpunt bij escalatie (nieuw, verwerkt na functionele review, B-PM6).** Een fraude-signaal dat naar partneraccount-niveau wordt geëscaleerd (buiten deze module — Partner Lifecycle Management, bewust niet in de MVP-scope, zoals al vastgelegd in `partner-onboarding/spec.md`) krijgt binnen de moderatiewachtrij van Product Management de status **"Geëscaleerd"** — een lokaal, afgehandeld eindpunt. Dit betekent uitsluitend dat het item hier is afgerond en niet langer als openstaand telt in déze wachtrij; het zegt niets over de eventuele vervolgafhandeling op accountniveau, die buiten deze specificatie valt. Zonder deze lokale eindstatus zou een geëscaleerd item onduidelijk blijven hangen tussen "nog open" en "afgerond."

---

## 6. Verification Workflow

Ontsluit het al volledig gearchitecteerde twee-laags model (Deel 7) operationeel:

1. **Aanvraag (Producent):** uitsluitend mogelijk wanneer (a) de bedrijfsverificatie uit Partner Onboarding geslaagd is, en (b) het product zich in publicatiestatus "Gepubliceerd" bevindt (architectuurregel, Deel 7.3) — de aanvraag-actie is server-side geblokkeerd als aan één van beide niet is voldaan, met een duidelijke melding waarom.
2. **Bewijsstukken:** hergebruikt hetzelfde CMP-041 File Upload-patroon dat al bij Partner Onboarding is vastgesteld (Design System, geen nieuw component) — productspecifiek bewijs alleen verplicht bij afwijking van het bij onboarding geverifieerde profiel.
3. **Reviewer-checklist (Beheerder):** exact de checklist uit Deel 7.4, hergebruikt van Partner Onboarding Stap 3, nu met productspecifieke controlepunten.
4. **Uitkomst:** Geverifieerd (badge actief, gebonden aan de beoordeelde ProductVersion), Afgewezen (met reden, herbeoordeling mogelijk), of Aanvullende informatie vereist (zelfde patroon als Partner Onboarding, hergebruikt).
5. **Periodieke hercontrole:** systeem plaatst automatisch een item in de Beheerder-wachtrij bij het verstrijken van de 6-maandelijkse cyclus of een directe trigger (verlopen certificaat) — geen nieuwe actie van de Producent nodig om dit te starten.
6. **Intrekking:** zichtbaar voor de Producent met reden en herbeoordelingsmogelijkheid, consistent met Deel 7.6.

---

## 7. Audit- en History-weergave

- **Centrale tijdlijn (AuditLogEntry, architectuur Deel 3.1/8.5):** per Product, chronologisch, elke gebeurtenis met wie/wanneer/wat/reden — de primaire "wat is er ooit met dit product gebeurd"-weergave.
- **Entiteit-specifieke historie:** ProductVersion-historie (met de in sectie 4 genoemde versievergelijking), OwnershipRecord-historie (eigendomsverloop), Claim-/Dispute-historie — elk vanuit de centrale tijdlijn doorklikbaar naar het volledige detail van die specifieke gebeurtenis.
- **Zichtbaarheidsgrens:** een Producent ziet uitsluitend de audit-historie van zijn **eigen** producten; een Beheerder ziet alles, platformbreed doorzoekbaar (consistent met de rechtenmatrix, sectie 9).
- **Uitzondering, nieuw, verwerkt na functionele review (B-PM7): zichtbaarheid voor de indiener van een wijzigingsvoorstel.** Een Retailer of Distributeur die een wijzigingsvoorstel heeft ingediend op andermans product (sectie 9), ziet — zonder verder toegang tot de volledige audit-historie van dat product te krijgen — uitsluitend de **uitkomst van zijn eigen ingediende voorstel** (geaccepteerd/afgewezen, en de bijbehorende reden indien afgewezen). Dit is een gerichte, smalle uitzondering op de algemene zichtbaarheidsgrens hierboven, niet een uitbreiding van de volledige audit-toegang.
- **Geen bewerking, geen verwijdering:** de audit-/historieweergave is altijd alleen-lezen — dit is precies het mechanisme waar de architectuur haar "nooit een stille overschrijving"-principe (Deel 1.1) tastbaar maakt.

---

## 8. Zoek-, filter- en bulkacties

**Zoeken:** op Product-ID, EAN/GTIN/MPN, titel, merk, fabrikant — voor de Producent beperkt tot eigen catalogus, voor de Beheerder platformbreed.

**Filteren:** op elk van de drie statusassen afzonderlijk (levenscyclus/publicatie/verificatie), de afgeleide Visibility, categorie, en (uitsluitend Beheerder) eigenaar/Producent. **Nooit een gecombineerd, samengevoegd statusfilter** — consistent met de architecturale eis dat de drie assen orthogonaal blijven (Deel 8.1), ook op filterniveau.

**Bulkacties:** toegestaan op een resultatenlijst, met een harde architecturale grens: **een bulkactie mag nooit meer bevoegdheid geven dan de losse, individuele actie al zou toestaan.** Bijvoorbeeld: een Producent kan een bulkactie **"Niet meer leverbaar zetten"** (sectie 3A) uitvoeren op meerdere eigen producten tegelijk — maar kan nooit bulksgewijs een Verified-badge toekennen, en kan evenmin bulksgewijs producten definitief "Gearchiveerd" zetten (dat blijft, net als bij de individuele actie, uitsluitend een Beheerder-bevoegdheid, sectie 3A — ongeacht hoe de bulkactie is opgeroepen). Elke bulkactie schrijft, per betrokken product afzonderlijk, een eigen regel in de centrale AuditLogEntry (sectie 7) — een bulkactie is dus nooit één ondoorzichtige gebeurtenis, maar N individueel herleidbare gebeurtenissen die toevallig in één moment zijn geïnitieerd (zie sectie 11 voor het bijbehorende, minimale datamodel-element, inclusief de afhandeling van een gedeeltelijk mislukte bulkactie).

---

## 9. Rollen en rechten

Volledig hergebruikt uit de al bevroren rechtenmatrix (`product-cloud-commerce-cloud-buy-box/spec.md` §4), hier toegepast op concrete Product Management-acties — **geen enkel nieuw recht, geen nieuwe rol**:

| Actie | Producent/Merkhouder | Retailer | Distributeur | Beheerder |
|---|---|---|---|---|
| Eigen product aanmaken/bewerken | ✅ | ❌ (behalve Retailer Created, ongewijzigd) | ❌ | ✅ (bij escalatie) |
| Wijzigingsvoorstel indienen | ✅ (op andermans product) | ✅ | ✅ | — |
| Wijzigingsvoorstel beoordelen | ✅ (eigen product) | ❌ | ❌ | ✅ (bij escalatie) |
| Claim indienen | ✅ | ❌ | ❌ | — |
| Claim beoordelen | ❌ | ❌ | ❌ | ✅ |
| Matching-kandidaat bevestigen (eigen listing) | — | ✅ (eigen Retailer Created-listing) | ✅ | ✅ (platformbreed) |
| Merge/Split uitvoeren | ❌ | ❌ | ❌ | ✅ (uitsluitend) |
| Geschil beslechten | ❌ | ❌ | ❌ | ✅ (uitsluitend) |
| Verified aanvragen | ✅ (eigen product) | ❌ | ❌ | — |
| Verified beoordelen | ❌ | ❌ | ❌ | ✅ |
| Eigen audit-historie inzien | ✅ (eigen producten) | — | — | ✅ (alles) |
| Platformbrede zoek/filter | ❌ | ❌ | ❌ | ✅ |
| Bulkacties | ✅ (eigen producten, binnen individuele rechten) | ❌ | ❌ | ✅ (platformbreed, binnen individuele rechten) |

**Toegangsvoorwaarde, hergebruikt uit de Authenticatie-spec:** Product Management is voor Producent/Merkhouder uitsluitend toegankelijk ná een goedgekeurde Partner Onboarding-aanvraag én een actieve 2FA-instelling (Authenticatie-spec, Stap 3A) — dit document introduceert geen nieuwe toegangsregel, past uitsluitend de al bestaande toe op deze specifieke module.

---

## 10. API-overzicht

Uitsluitend hergebruik van de al in Marketplace Core benoemde services (`marketplace-core/spec.md` §20) — geen nieuwe API-namen verzonnen, uitsluitend concreet gemaakt welke Product Management-functie bij welke bestaande API hoort:

| Product Management-functie | Bestaande API (Marketplace Core, ongewijzigd) |
|---|---|
| Product/ProductVersion CRUD, categorie/attribuut-lookup | **Product Cloud API** |
| Claim indienen/beoordelen, eigendomsoverdracht | **Claim-/eigenaarschap-API** |
| Wijzigingsvoorstel indienen/beoordelen | **Wijzigingsvoorstel-API** |
| AI-matchingsvoorstellen, AI-consistentiecontrole bij review | **AI-validatie-API** |
| Herindexering bij statusovergang (publicatie/levenscyclus) | **Zoekindexering-API** |
| Meldingen aan producent/retailer (claim-uitkomst, verificatie-uitkomst, merge-notificatie) | **Notificatie-API** |
| Moderatiewachtrij, geschillen, fraude-signalen | **Admin-moderatie-API** |

**Nieuw, minimaal, en uitsluitend als sub-functie binnen de bestaande Product Cloud API (geen nieuwe, losse API):** matching-kandidaten opvragen/bevestigen (Deel 5), merge/split uitvoeren (Deel 5.3–5.4), en audit-log bevragen (sectie 7) — deze functies bestonden nog niet expliciet benoemd in Marketplace Core's API-lijst, omdat Product Matching zelf pas in de Product Cloud Architecture (Sprint 1C) is toegevoegd. Ze worden hier ondergebracht bij de Product Cloud API, niet als nieuwe, losse dienst, om het aantal services niet onnodig te laten groeien.

---

## 11. Datamodel-uitbreidingen

**Uitgangspunt, expliciet getoetst:** de Product Cloud Architecture (Deel 2–3) is bewust volledig genoeg om Product Management als **zuivere operationele/UI-laag** te dragen — dit document introduceert daarom bewust **vrijwel geen nieuwe entiteiten**, consistent met de opdracht om geen nieuwe scope toe te voegen.

**Eén klein, direct noodzakelijk element (geen nieuwe entiteit, een sub-record):** een **BulkActionJob**-record, uitsluitend om een bulkactie (sectie 8) als samenhangend geheel herleidbaar te maken (bijv. "deze 40 archiveringen hoorden bij dezelfde bulkactie, gestart door [Beheerder], op [tijdstip]") — zonder dit record zou een Beheerder een grote bulkactie later niet als één samenhangende gebeurtenis kunnen terugvinden in de AuditLogEntry-tijdlijn, uitsluitend als 40 losse, ogenschijnlijk ongerelateerde regels. Elke individuele AuditLogEntry die uit een bulkactie voortkomt, verwijst naar het bijbehorende BulkActionJob-record. Geen nieuwe rechten, geen nieuw proces — uitsluitend een groeperingsverwijzing bovenop wat al bestond.

**Gedeeltelijk falen (nieuw, verwerkt na functionele review, B-PM8).** Een BulkActionJob draagt een eigen statusveld met drie mogelijke waarden: **Voltooid** (alle betrokken producten succesvol verwerkt), **Gedeeltelijk voltooid** (één of meer producten konden niet worden verwerkt — bijv. omdat een product tussentijds al in een status stond waarin de gevraagde actie niet meer geldig was), of **Mislukt** (geen enkel product kon verwerkt worden). Bij "Gedeeltelijk voltooid" registreert elke AuditLogEntry die bij dit BulkActionJob hoort individueel of die specifieke deelactie geslaagd of mislukt is, met — bij een mislukking — de reden. Dit is geen nieuw proces, uitsluitend een statusveld en een per-regel uitkomst bovenop de al bestaande AuditLogEntry-koppeling hierboven.

Verder: **geen enkele andere datamodel-uitbreiding is noodzakelijk gebleken.**

---

## 12. UX-flow (op hoofdlijnen — geen definitieve wireframes)

### 12.1 Producent — Product Management

1. **Productoverzicht** (eigen catalogus): lijst met zoek/filter (sectie 8), elk product toont alle drie statusassen + Visibility apart, niet samengevoegd.
2. **Productdetail/editor:** toont de huidige Gepubliceerde versie + eventueel actief Concept; acties: nieuw Concept starten, indienen voor review, publiceren, Verified aanvragen (indien voorwaarden voldaan), audit-historie bekijken.
3. **Wijzigingsvoorstellen-inbox:** binnengekomen voorstellen van retailers, per stuk accepteren/afwijzen.
4. **Verificatiestatus-overzicht:** per product, met een duidelijke voorwaarden-checklist wanneer aanvragen nog niet mogelijk is (consistent met hoe Partner Onboarding al voorwaarden expliciet toont vóórdat een actie beschikbaar wordt).

### 12.2 Beheerder — Product Management

1. **Platformbreed productoverzicht:** zoek/filter over de volledige catalogus, bulkacties beschikbaar.
2. **Moderatiewachtrij** (sectie 5): gegroepeerd per categorie (claims/matching/geschillen/fraude/meldingen), met AI-context per item, altijd een expliciete, beargumenteerde beslissing vereist.
3. **Merge/Split-werkscherm:** kandidaten naast elkaar (overeenkomsten/verschillen zichtbaar, consistent met het transparantie-uitgangspunt), met een bevestigingsstap die de Verified-intrekkingsconsequentie (B8) vooraf toont.
4. **Verificatiebeoordeling:** reviewer-checklist zichtbaar naast de aanvraag en bewijsstukken.
5. **Platformbrede audit-log:** doorzoekbaar op product, gebruiker, actietype, tijdvak.

**Nadrukkelijk:** bovenstaande is een functionele flowbeschrijving, geen schermontwerp — kleur, lay-out, exacte componentplaatsing en Design System-toepassing volgen in de wireframe-fase, ná akkoord op dit document.

---

## 13. Architectuurcontrole

- ✓ **Blueprint-consistent** — geen enkel proces in dit document wijkt af van wat al in de Blueprint en de daarop gebaseerde, bevroren specs is vastgelegd.
- ✓ **Product Cloud Architecture-consistent** — dit document voegt geen nieuwe architecturale concepten toe; de nieuwe elementen (sectie 3A productlevenscyclus-beheerproces, BulkActionJob-uitbreiding met partial-failure-status, sectie 11) zijn uitsluitend operationele toepassingen/verduidelijkingen van al bevroren, ongewijzigde statuswaarden en regels — geen wijziging aan enige bevroren regel uit `product-cloud-architecture/spec.md`.
- ✓ **Marketplace Core-consistent** — alle API-functies zijn ondergebracht bij de al bestaande, benoemde services (sectie 10); geen nieuwe, losse dienst geïntroduceerd.
- ✓ **Authenticatie-consistent** — toegangsvoorwaarden (Partner Onboarding-goedkeuring + actieve 2FA) volledig hergebruikt, niet gewijzigd.
- ✓ **RBAC-consistent** — de rechtenmatrix (sectie 9) is een direct afgeleide toepassing van de al bevroren matrix, geen nieuw recht toegevoegd; het nieuwe levenscyclus-beheerproces (sectie 3A) kent geen enkele bevoegdheid toe die niet al bestond (eigenaar voor niet-onomkeerbare stappen, uitsluitend Beheerder voor de definitieve archivering).
- ✓ **MVP-consistent** — geen enkele functionaliteit uit Sprint 2/Post-MVP (bijv. Partner Lifecycle Management, gedelegeerde Distributeur-rechten, meerdere productielocaties) is in dit document alsnog geïntroduceerd; de "Geëscaleerd"-status (sectie 5) is uitdrukkelijk een lokaal, binnen deze module afgehandeld eindpunt en opent geen enkele Partner Lifecycle Management-functionaliteit.
- ✓ **Geen wijziging aan bevroren documenten** — bevestigd via bestandshash, zie de eindrapportage.

---

## 14. Zelfreview

- **Is dit daadwerkelijk uitsluitend een operationele laag, geen nieuwe architectuur?** Opnieuw getoetst ná verwerking van de functionele review: het nieuwe sectie 3A-beheerproces herdefinieert geen enkele statuswaarde of overgang uit de bevroren architectuur, het beschrijft uitsluitend wie welke al bestaande overgang mag initiëren en wat het gevolg is voor al bestaande Offers — geen nieuwe architectuur, uitsluitend het ontbrekende operationele stuk.
- **Zijn de zeven verwerkte bevindingen (B-PM1, B-PM2, B-PM3, B-PM4, B-PM6, B-PM7, B-PM8) daadwerkelijk opgelost, niet alleen benoemd?** Gecontroleerd: B-PM1/B-PM2 zijn opgelost door een structureel ontbrekend proces alsnog toe te voegen (niet door de tekst te herformuleren); B-PM3/B-PM4 zijn opgelost door expliciete, concrete conflictregels vast te leggen (niet door het scenario te negeren); B-PM6 is opgelost met een nieuw, lokaal statusbegrip dat geen nieuwe bevoegdheid of proces buiten deze module opent; B-PM7 is een bewust smal gehouden uitzondering, geen algemene toegangsuitbreiding; B-PM8 is een statusveld met per-regel uitkomst, geen nieuw proces.
- **Is er ergens nieuwe scope binnengeslopen tijdens het oplossen van deze bevindingen?** Expliciet getoetst: het levenscyclus-beheerproces (3A) gebruikt uitsluitend de zeven al bevroren statuswaarden; de conflictregel (B-PM3) introduceert geen nieuwe entiteit, uitsluitend een regel voor hoe twee al bestaande mechanismen (Concept, wijzigingsvoorstel) samenwerken; de intrekkingsregel (B-PM4) is een directe toepassing van de al bevroren versiegebonden Verified-status (B2 uit de architectuurreview). Geen van de zeven verwerkte punten voegt een nieuw recht, nieuwe rol, nieuwe API of nieuwe status toe die niet al bestond.
- **Is de interne consistentie nu volledig?** Alle sectie- en Deel-verwijzingen doorlopen en gecontroleerd — met name de eerder gebroken verwijzing "zie sectie 4" (die naar een niet-bestaand proces wees) is vervangen door een correcte verwijzing naar het nieuwe sectie 3A.

**Dit document is hierbij DEFINITIEF BEVROREN.**
