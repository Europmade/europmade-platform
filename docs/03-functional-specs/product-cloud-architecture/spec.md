# EuropMade — Product Cloud: Volledige Architectuur (Sprint 1C)

**Rol:** Lead Marketplace Architect. Ontworpen als het datamodel dat de komende tien jaar de kern van EuropMade vormt — een Europese marketplace-architectuur, niet een webshop-architectuur.
**Status:** v1.1 — **definitief bevroren.** Verwerkt acht goedgekeurde bevindingen (B1–B8) uit de onafhankelijke architectuurreview; B9–B12 bewust niet verwerkt op uitdrukkelijk verzoek.
**Scope:** uitsluitend architectuur — geen UX, geen wireframes, geen dashboards, geen formulieren, geen componenten. Dat volgt in een latere Sprint 1C-vervolgstap, ná akkoord op dit document.
**Basis:** Blueprint v2.1, UX-architectuur, Design System (41 componenten, definitief), Commerce Cloud (bevroren, `product-cloud-commerce-cloud-buy-box/spec.md`), Authenticatie-spec (bevroren, RBAC), Partner Onboarding-spec (bevroren, bedrijfsverificatie), ADR 0001–0005.
**Nadrukkelijk:** dit document **wijzigt niets** aan `product-cloud-commerce-cloud-buy-box/spec.md` of enig ander bevroren document — het **bouwt erop voort** en werkt een aantal onderdelen die daar op hoofdlijnen stonden (productclaims, productversies, Verified™) nu tot in architecturale diepte uit, plus twee volledig nieuwe onderdelen die nog niet bestonden: **Product Matching** en **Publicatiestatussen** als apart, orthogonaal statusmodel naast de al bestaande productlevenscyclus.

---

# Deel 1 — Architectuurdocument

## 1.1 Ontwerpprincipe

Een Europese marketplace-architectuur verschilt fundamenteel van een webshop-architectuur op één punt: **het Product bestaat onafhankelijk van wie het verkoopt.** Een webshop modelleert "een artikel in mijn assortiment." EuropMade modelleert "een fysiek, in de wereld bestaand product, dat door nul, één of honderd partijen tegelijk verkocht kan worden, waarvan de eigendom van de *informatie* kan verschuiven zonder dat de eigendom van de *verkoop* verschuift, en waarvan de identiteit tien jaar moet standhouden ook als elke partij die het ooit verkocht heeft allang vertrokken is."

Drie architecturale consequenties die dit document overal terugkomen:
1. **Product-identiteit is nooit afhankelijk van een verkopende partij.** Een Product-ID overleeft elke retailer, elke producent, elk faillissement.
2. **Alles wat over "wat het product IS" gaat, leeft in Product Cloud. Alles wat over "hoe ik het verkoop" gaat, leeft in Commerce Cloud.** Deze scheiding (al vastgelegd, `product-cloud-commerce-cloud-buy-box/spec.md` sectie 1.1) is de belangrijkste architecturale grens in het hele platform en wordt in dit document op geen enkel punt doorbroken.
3. **Elke staat-wijziging is een gebeurtenis met een eigenaar, een reden en een tijdstip — nooit een stille overschrijving.** Dit geldt voor eigendom, claims, matching, verificatie en publicatie gelijkelijk.

## 1.2 Verhouding tot bevroren documenten

| Bevroren document | Wat het al vastlegde | Wat dit document toevoegt |
|---|---|---|
| `product-cloud-commerce-cloud-buy-box/spec.md` §1.1 | Product/Variant/EAN-GTIN-MPN/Offer-hiërarchie | Volledig datamodel op veldniveau, plus het nieuwe concept **Productfamilie** boven Product |
| §1.6 Productclaims | Basisproces (trigger → claim → verificatie → overdracht) | Bewijsvereisten, beoordelingscriteria, conflictafhandeling bij gelijktijdige claims, herbeoordeling/beroep |
| §1.7 Producteigenaarschap | Eigendomsmatrix (wie beheert welk veld) | Eigendomsoverdracht buiten claims om (bijv. bedrijfsovername), meerdere gelijktijdige eigenaren, geschillenmodel |
| §1.9 Productversies | Nieuwe-versie-vs-nieuw-product-onderscheid | Volledig versiebeheer: wie mag wijzigen, reviewproces, rollback, audit trail |
| §1.10 Verificatie & Verified™ | Basisproces, configureerbare drempel (ADR 0002) | Volledige "Verified Made in Europe"-architectuur: twee-laags model (bedrijfs- én productniveau), bewijsstukken, reviewerproces, periodieke controle, intrekking |
| **Nieuw, bestond nog niet** | — | **Product Matching** (EAN/AI/handmatig, duplicaten, merge/split) en **Publicatiestatussen** als apart statusmodel naast de bestaande productlevenscyclus |
| `partner-onboarding/spec.md` §3 | Bedrijfsniveau EU-productieclaim, reviewer-checklist | Hergebruikt en formeel gekoppeld aan het nieuwe productniveau van Verified Made in Europe (sectie 6) |

---

# Deel 2 — Datamodel-overzicht

## 2.1 Product

| Veld | Type/aard | Verplicht | Toelichting |
|---|---|---|---|
| `product_id` | Interne, onveranderlijke unieke ID | Ja | **Overleeft alles** — nooit hergebruikt, nooit gewijzigd, ook niet bij eigendomsoverdracht of merge (zie 2.10). |
| `product_family_id` | Verwijzing naar Productfamilie | Nee | Zie 2.2 — nieuw concept. |
| `brand` (merk) | Tekst + verwijzing naar geverifieerde merkentiteit indien beschikbaar | Ja | Losstaand van `manufacturer` — een merk en een fabrikant zijn vaak, maar niet altijd, dezelfde partij (contractproductie). |
| `manufacturer` (fabrikant) | Tekst + verwijzing naar geverifieerde fabrikant-entiteit indien beschikbaar | Ja | Zie sectie 6 — kan een andere entiteit zijn dan de merkhouder. |
| `title`, `description` | Tekst | Ja | Gedeeld over alle varianten. |
| `category_ids` | Eén of meer verwijzingen naar Categorie | Ja | Een product kan in meerdere categorieën tegelijk staan (bijv. hoofdcategorie + een cross-cutting categorie als "Duurzaam"). |
| `attributes` | Sleutel/waarde-set, categorie-afhankelijk | Deels | Zie 2.4 — attributen zijn niet vrij tekstveld, maar gebonden aan een per-categorie attributendefinitie. |
| `media` | Eén of meer afbeeldingen/video's | Ja (min. 1 afbeelding) | Op Product- of Variant-niveau, zie 2.3. |
| `documents` | Eén of meer documenten (handleiding, certificaat, veiligheidsblad) | Nee, tenzij compliance-verplicht per categorie | Zelfde documenttype-mechanisme als Partner Onboarding-bewijsstukken (hergebruikt patroon, niet hetzelfde datamodel — productdocumenten zijn publiek, onboarding-bewijsstukken zijn dat nooit). |
| `product_lifecycle_status` | Enum | Ja | De **al bestaande** productlevenscyclus (`product-cloud-commerce-cloud-buy-box/spec.md` §1.10): Retailer Created → Concept gecontroleerd → Actief → Verified™ → Uitlopend → Niet meer leverbaar → Gearchiveerd. **Ongewijzigd**, zie Deel 8 voor het onderscheid met het nieuwe publicatiestatusmodel. |
| `created_at`, `owner_since` | Tijdstempels | Ja | |

## 2.2 Productfamilie — nieuw concept

**Waarom nieuw:** de Blueprint en de bevroren spec kennen Product en Variant, maar geen niveau daarboven. In de praktijk verkoopt een producent zelden één geïsoleerd product — een merk voert bijvoorbeeld "Serie X" in drie generaties, elk met eigen EAN's, eigen Product-ID's, maar wel een gedeelde identiteit die een klant, een producent én de Buy Box-onafhankelijke "Past goed bij"-crossselllogica (al bevroren op de Productpagina) baat heeft bij expliciet te modelleren.

- **Productfamilie** groepeert meerdere, zelfstandige Producten (elk met een eigen `product_id`) die eenzelfde onderliggende productlijn vormen.
- **Geen eigendoms- of verkoopimplicaties** — een familie is uitsluitend een navigatie-/samenhangconcept, geen commerciële of juridische eenheid. Eigendom, claims en Verified™-status blijven per individueel Product bepaald.
- **Optioneel veld** op Product — een Product zonder familie is volledig geldig en functioneert identiek.

## 2.3 Variant

Ongewijzigd t.o.v. de bevroren spec (`variant_type`: kleur, maat, inhoud, vermogen, spanning, materiaal, uitvoering, bundel), hier expliciet herbevestigd als basis: een Variant deelt alle Product-niveau-velden en voegt uitsluitend de afwijkende gegevens toe (bijv. een kleurfoto, een maatlabel).

## 2.4 Identifiers — EAN/GTIN/MPN, expliciet onderscheiden

- **GTIN (Global Trade Item Number)** is de wereldwijde standaard-familie van productidentificatienummers (GTIN-8/12/13/14).
- **EAN-13** is, architecturaal, **een specifieke, in Europa gangbare implementatie van GTIN-13** — geen apart, los systeem. Dit document behandelt EAN daarom als een GTIN-subtype, niet als een derde, onafhankelijk identifier-systeem naast GTIN.
- **MPN (Manufacturer Part Number)** is geen internationale standaard maar een fabrikant-intern nummer — gebruikt wanneer geen geldig GTIN/EAN beschikbaar is (met name bij kleinere Europese producenten, een reëel scenario dat dit platform expliciet moet ondersteunen, niet alleen als edge case behandelen).
- **Eén Variant kan meerdere Identifiers hebben** (bijv. verschillende EAN's per land, `country_scope`-veld, al vastgelegd) — allemaal wijzend naar dezelfde centrale Product/Variant-informatie.
- **Identifier-uniciteit is de basis van Product Matching** (Deel 4/sectie 5) — een geldig GTIN/EAN is de sterkste, eerste-keus matchsleutel.

## 2.5 Attributen

- Attributen zijn **niet vrije tekst**, maar gebonden aan een **attributendefinitie per categorie** (bijv. categorie "Elektrisch gereedschap" definieert het attribuut "Vermogen (W)" als een verplicht, numeriek attribuut; categorie "Kleding" definieert "Maat" als een verplicht, uit een vaste lijst gekozen attribuut).
- Dit is de architecturale voorwaarde voor betrouwbaar filteren/vergelijken (CMP-034 Filters, al bevroren op UI-niveau) én voor geautomatiseerde matching (sectie 5) — vrije tekstvelden zijn onbetrouwbaar te matchen, gestructureerde attributen wel.
- Attributendefinities zelf zijn platformbeheer (Beheerder), niet per-producent aan te passen — voorkomt fragmentatie ("Vermogen" vs. "Wattage" vs. "Power" als drie verschillende attributen voor hetzelfde begrip).

## 2.6 Categorieën

Hiërarchisch (hoofdcategorie → subcategorie → sub-subcategorie), beheerd door de Beheerder (Admin scherm #61, nog niet gebouwd — Sprint 1C UX-vervolg). Een Product hoort tot minimaal één, mag tot meerdere categorieën behoren (2.1).

## 2.7 Media en documenten

- **Media** (afbeeldingen, video's) op Product- of Variant-niveau, met een verplicht minimum (minimaal één hoofdafbeelding op Productniveau) vóórdat een product de status "Actief" kan bereiken (koppelt aan sectie 8, publicatiestatussen).
- **Documenten** zijn getypeerd (handleiding, veiligheidsinformatieblad, CE-certificaat, garantiebewijs, conformiteitsverklaring) — het documenttype bepaalt of het **verplicht** is per categorie (bijv. een CE-certificaat is verplicht voor categorieën die onder GPSR-compliance vallen, optioneel voor andere).

---

# Deel 3 — Domeinmodel

## 3.1 Kernentiteiten

```
ProductFamily (optioneel, 0..n Producten)
  └─ Product (uniek, onveranderlijke product_id)
       ├─ Variant (1..n)
       │    └─ Identifier — GTIN/EAN/MPN (1..n, met country_scope)
       ├─ Attribute-waarden (gebonden aan categorie-attributendefinities)
       ├─ Media (1..n)
       ├─ Document (0..n, verplicht per categorie-compliance-eis)
       ├─ Category-koppeling (1..n)
       ├─ OwnershipRecord (huidige + historische eigenaren)
       ├─ ProductVersion (elke wijziging, zie Deel 8)
       ├─ VerificationProductRecord (Verified Made in Europe, productniveau, gebonden aan één specifieke ProductVersion — zie Deel 7)
       └─ ModerationCase (0..n, zie Deel 9)

Claim (verwijst naar Product + claimende Partij + ClaimEvidence)
Dispute / Geschil (nieuw, expliciet vastgelegd — verwijst naar een conflicterende Claim, een betwiste eigendomsoverdracht, of een ModerationCase; zie Deel 4.5)
MatchCandidate / MatchDecision (verwijst naar 2 of meer kandidaat-Producten of een nieuwe listing + bestaand Product)
MergeRecord / SplitRecord (verwijst naar de betrokken Product-ID's, altijd omkeerbaar gelogd; een MergeRecord kan een keten van eerdere MergeRecords bevatten — zie Deel 5.3)
AuditLogEntry (nieuw, expliciet vastgelegd — centrale, doorzoekbare tijdlijn; elke wijziging aan elke bovenstaande entiteit schrijft hier een eigen regel, aanvullend op — niet in plaats van — de entiteit-eigen historie zoals ProductVersion en OwnershipRecord; zie Deel 8.5)

Offer (Commerce Cloud — verwijst naar EAN + Region, NOOIT naar Product zelf — bevroren grens, zie 1.1 en Deel 6)
```

**Verduidelijking naar aanleiding van de architectuurreview (B6, B7):** Dispute en AuditLogEntry bestonden al inhoudelijk in de procesbeschrijvingen (Deel 4.5, Deel 8.5, Deel 9.4) maar stonden niet als eigen entiteit in dit domeinmodel — dat is hierbij rechtgezet, zonder dat dit nieuwe functionaliteit toevoegt: het formaliseert uitsluitend wat al beschreven stond.

## 3.2 Waarom Claim, Match en Merge losstaande entiteiten zijn (niet velden op Product)

Een architecturale keuze die de komende tien jaar moet standhouden: **elke ingrijpende gebeurtenis in de levenscyclus van een product is een eigen, historisch bewaarde entiteit, niet een veldwaarde die overschreven wordt.** Een `Product.owner`-veld dat simpelweg wordt overschreven bij een claim, verliest de vraag "wie was de eigenaar vóór 2027, en waarom is dat veranderd" — een vraag die bij geschillen, audits, of simpelweg tien jaar bedrijfsgeschiedenis onvermijdelijk gesteld gaat worden. Elke Claim, Match en Merge is daarom een eigen record met eigen tijdstempel, initiator, bewijs en uitkomst.

---

# Deel 4 — Producteigendom

## 4.1 Eigenaartypen

Consistent met de al bevroren rollen (Authenticatie-spec, Partner Onboarding-spec): **Producent/Merkhouder** (functioneel één rol, zoals al vastgelegd), **Retailer** (tijdelijk eigenaar bij Retailer Created), **Distributeur** (nooit primair eigenaar van productinformatie, tenzij post-MVP gedelegeerde rechten — al zo vastgelegd, ongewijzigd).

## 4.2 Meerdere rollen tegelijk

Eén partij kan tegelijk Producent van product A en Retailer (met eigen Offer) van product B zijn — al vastgelegd in de RBAC-architectuur (rollen zijn optelbaar, Authenticatie-spec §1.9-1.10). Nieuw, hier expliciet vastgelegd: **productniveau-eigendom en Offer-eigendom zijn altijd onafhankelijke feiten**, ook als dezelfde partij beide heeft. Een producent die ook zelf verkoopt, heeft twee aparte records (ProductOwnership + Offer) die elk apart gewijzigd, ingetrokken of overgedragen kunnen worden zonder de ander te raken.

## 4.3 Eigendomsoverdracht — twee routes, expliciet onderscheiden

**Route A — Claim** (al vastgelegd, `product-cloud-commerce-cloud-buy-box/spec.md` §1.6): een Retailer Created-product wordt overgenomen door een producent. Zie Deel 4A hieronder voor de nu volledig uitgewerkte versie.

**Route B — Overdracht tussen twee reeds geverifieerde eigenaren (nieuw, hier voor het eerst vastgelegd)** — bijvoorbeeld een bedrijfsovername, een merk dat van producent wisselt, of een licentie die afloopt. Dit is geen claim (er is al een geldige eigenaar), dus vereist een ander proces:
- **Trigger:** de huidige eigenaar initieert een overdracht naar een andere, al geverifieerde Producent/Merkhouder-partij (bijv. na overname), ÓF de nieuwe partij dient bewijs in van rechtsopvolging (bijv. een koopovereenkomst, merkoverdrachtsakte) en de huidige eigenaar bevestigt, ÓF — bij een geschil/onbereikbare voormalige eigenaar — de Beheerder behandelt het als een geëscaleerd geschil (4.5).
- **Nooit stilzwijgend:** een overdracht buiten een claim om vereist **altijd** een handmatige Beheerder-goedkeuring, ongeacht hoe overtuigend het bewijs lijkt — dit is bewust zwaarder dan een gewone claim, omdat er (anders dan bij Retailer Created) al een bestaande, geverifieerde partij van iets ontnomen wordt.
- **Resultaat:** nieuw OwnershipRecord, oude blijft historisch bewaard (3.2), Product-ID ongewijzigd.

## 4.4 Product Claims — volledig uitgewerkt (Deel 4A)

**Claimproces (basis reeds vastgelegd, hier met de gevraagde diepgang):**

1. **Trigger** (ongewijzigd): merknaam-match-melding of handmatige zoekactie door producent.
2. **Bewijs, verplicht in te dienen bij elke claim (nieuw, expliciet vastgelegd):**
   - Bevestiging dat de claimende partij al geverifieerd staat als Producent/Merkhouder van **dat specifieke merk** (koppelt aan de bedrijfsniveau-verificatie uit Partner Onboarding — geen los verificatieproces per claim, zoals al vastgelegd).
   - **Aanvullend, productspecifiek bewijs** dat dit *specifieke* product daadwerkelijk bij het geclaimde merk hoort — bijv. een productcode/modelnummer dat overeenkomt met bekende productiegegevens, of een verwijzing naar de officiële productcatalogus van het merk. Dit voorkomt dat een geverifieerd merk A per ongeluk (of moedwillig) een product van merk B claimt dat toevallig een gelijkende titel heeft.
3. **Beoordeling:** een claim met een geldig, overeenkomend GTIN/EAN tussen het geclaimde product en de bekende productcatalogus van de merkhouder wordt **automatisch goedgekeurd** (deterministisch, geen menselijke tussenkomst nodig — de sterkste vorm van bewijs die er is). Een claim zonder geldige identifier-match, of met een afwijkende identifier, gaat naar **handmatige beoordeling** door de Beheerder.
4. **Conflicten — twee claims op hetzelfde product (nieuw, expliciet vastgelegd):** als een tweede partij hetzelfde product claimt terwijl er al een goedgekeurde eigenaar is, wordt dit **nooit** als een nieuwe, losstaande claim behandeld — het wordt automatisch een **geschil** (4.5), nooit stilzwijgend de tweede claim laten "winnen." Als twee claims **gelijktijdig, vóórdat er een eigenaar is**, binnenkomen (bijv. binnen enkele minuten van elkaar op een net aangemaakt Retailer Created-product), geldt: eerste geldige, automatisch goedgekeurde claim wint; bij twee claims die beide handmatige beoordeling vereisen, beoordeelt de Beheerder ze in ontvangstvolgorde, niet gelijktijdig.
5. **Afwijzing:** een claim wordt afgewezen bij onvoldoende bewijs (geen identifier-match, geen overtuigend productspecifiek bewijs) — met een specifieke, benoemde reden (zelfde principe als de "Aanvullende informatie vereist"-status uit Partner Onboarding: een afwijzing zonder duidelijke reden is nooit acceptabel).
6. **Herbeoordeling/beroep (nieuw, expliciet vastgelegd):** een afgewezen claim kan door de indiener opnieuw worden ingediend met aanvullend bewijs — dit is **geen nieuwe, losse claim**, maar een gekoppelde herbeoordeling van dezelfde Claim-entiteit (behoudt de geschiedenis). Er is geen vast maximum aantal herbeoordelingen (zelfde motivatie als de "Aanvullende informatie vereist"-status zonder ronde-limiet in Partner Onboarding) — wel geldt: bij drie of meer afgewezen pogingen op hetzelfde product door dezelfde partij escaleert het systeem automatisch naar een fraude-signaal (Deel 9.3).
7. **Overdracht en notificatie:** ongewijzigd t.o.v. de bevroren spec.

## 4.5 Geschillen

- **Trigger:** een conflicterende claim (4.4), een betwiste eigendomsoverdracht (4.3), of een melding door een derde partij ("dit product is niet van [merk X]").
- **Vastgelegd als eigen Dispute-entiteit (verduidelijking, B7):** een geschil is geen bijverschijnsel van een Claim of een tijdelijke toestand, maar een eigen record (zie Deel 3.1) met een verwijzing naar de onderliggende Claim, OwnershipRecord-overdracht of ModerationCase die het geschil veroorzaakte — zodat de behandeling en uitkomst van het geschil zelf ook auditeerbaar zijn, los van de onderliggende gebeurtenis.
- **Behandeling:** altijd door de Beheerder, nooit geautomatiseerd afgehandeld (consistent met het platformbrede principe: AI ondersteunt, mens beslist bij alles met een eigendoms- of financieel gevolg).
- **Tijdens een geschil:** het product blijft in zijn **huidige** staat (geen voorlopige bevriezing van bestaande Offers — een geschil over informatie-eigendom mag de lopende verkoop van bestaande, al actieve aanbieders niet onderbreken, tenzij het geschil zelf fraude bij de Offers betreft, wat een apart, Commerce Cloud-niveau moderatievraagstuk is).
- **Uitkomst:** bevestiging huidige eigenaar, overdracht naar de betwistende partij, of (zeldzaam) tijdelijke terugzetting naar een niet-geclaimde staat als geen van beide partijen overtuigend bewijs heeft — altijd met een gelogde, beargumenteerde Beheerder-beslissing, vastgelegd op de Dispute-entiteit zelf.

---

# Deel 5 — Product Matching (volledig nieuw)

Niet eerder gearchitecteerd — noodzakelijk zodra meerdere retailers onafhankelijk van elkaar hetzelfde fysieke product proberen aan te bieden, wat bij een groeiende marketplace de norm wordt, niet de uitzondering.

## 5.1 Matchingspijplijn — drie lagen, in vaste volgorde

**Architecturaal principe: deterministisch vóór probabilistisch vóór menselijk.** Elke laag wordt pas ingeschakeld als de vorige geen betrouwbare uitkomst geeft — nooit andersom, en nooit worden lagen overgeslagen om tijd te besparen.

1. **EAN/GTIN-matching (deterministisch, eerste keus):** een nieuwe listing met een geldig, herkend GTIN/EAN dat al in de Product Cloud bestaat, wordt **automatisch en direct** aan het bestaande Product gekoppeld. Geen AI, geen menselijke tussenkomst — een geldige identifier-match is het sterkste mogelijke bewijs van hetzelfde fysieke product.
2. **AI-matching (probabilistisch, tweede keus, uitsluitend wanneer stap 1 geen match geeft):** wanneer geen geldig GTIN/EAN aanwezig is (reëel scenario, met name kleinere Europese producenten, 2.4) of het opgegeven identifier onbekend is, analyseert een AI-matchingsproces titel, merk, attributen, categorie en afbeeldingen om **kandidaat-matches** te suggereren — **nooit een automatische, definitieve koppeling**. Elke AI-match resulteert in een `MatchCandidate` met een betrouwbaarheidsscore, nooit direct in een gekoppeld Product.
3. **Handmatige matching (laatste keus, altijd bij lage AI-zekerheid of een expliciete "geen van deze"-uitkomst):** een menselijke beoordelaar (Beheerder, of — bij een retailer die zelf een listing aanmaakt — de retailer zelf kiest uit voorgestelde kandidaten, met een "geen van deze, dit is een nieuw product"-optie) neemt de uiteindelijke beslissing.

## 5.2 Duplicaten

- **Gedefinieerd als:** twee of meer Product-records die feitelijk hetzelfde fysieke product beschrijven, ontstaan doordat de matchingspijplijn (5.1) een match had moeten leggen maar dat niet deed (bijv. twee retailers die onafhankelijk van elkaar, zonder geldig EAN, hetzelfde product aanmaakten vóórdat AI-matching er kans op zag).
- **Detectie:** periodiek, geautomatiseerd proces dat bestaande Producten opnieuw door de AI-matchingslaag (5.1, stap 2) haalt — niet alleen bij aanmaak, ook achteraf, want naarmate de catalogus groeit, worden matches die eerder onzeker waren later mogelijk overtuigender.
- **Resultaat van detectie:** nooit een automatische merge — uitsluitend een gemarkeerde `MatchCandidate` voor menselijke beoordeling (5.3).

## 5.3 Merge (samenvoegen)

- **Wie mag mergen:** uitsluitend de Beheerder — nooit een producent of retailer zelf, ook niet op hun eigen producten, omdat een merge per definitie **twee eigendomshistories** samenvoegt en dus altijd een platformbrede beslissing is.
- **Wat gebeurt er:** één van de twee Product-ID's wordt **primair** (blijft bestaan), het andere wordt **secundair** (blijft bestaan als omgeleide verwijzing, nooit hard verwijderd — Deel 8 Verwijderd-status is iets anders, zie daar).
- **Verduidelijking naar aanleiding van de architectuurreview (B1) — merge raakt uitsluitend Identifiers, nooit Offers direct:** een merge verplaatst de **Identifiers (EAN/GTIN/MPN)** van het secundaire Product naar het primaire Product (als extra Identifiers onder een bestaande of nieuw aangemaakte Variant van het primaire Product) — **niet** de Offers zelf. Een Offer blijft ongewijzigd gekoppeld aan zijn eigen EAN + Region (bevroren Commerce Cloud-regel, Deel 6, op geen enkel punt gewijzigd door dit document); omdat die EAN na de merge onder het primaire Product valt, verschijnt de bijbehorende Offer daardoor automatisch, zonder dat het Offer-record zelf ooit wordt aangeraakt, in de aanbiederslijst van het primaire product. Dit lost de eerder geconstateerde inconsistentie tussen Deel 5.3 en Deel 6 op: de Product/Offer-grens blijft daadwerkelijk op geen enkel punt doorbroken.
- **Kettingsamenvoegingen (B3, nieuw expliciet vastgelegd):** een eerder samengevoegd (secundair) Product-ID kan zelf later opnieuw in een volgende merge betrokken raken. Elke verwijzing naar een secundair Product-ID **resolveert altijd transitief tot de uiteindelijke, actief primaire Product-ID** — nooit slechts één stap in de keten. Een MergeRecord houdt daarom niet alleen zijn eigen twee betrokken Product-ID's bij, maar ook de volledige keten van eerdere merges die eraan voorafgingen, zodat een opvraging van een oud, meermaals samengevoegd Product-ID altijd correct bij het huidige, actieve product uitkomt.
- **Lot van Verified Made in Europe bij een merge (B8, nieuw expliciet vastgelegd):** een merge **trekt de productniveau-Verified-status van beide betrokken Producten in**, ongeacht of één, beide, of geen van beide vóór de merge geverifieerd was. Het samengevoegde (primaire) Product start na de merge met verificatiestatus "Niet aangevraagd" en vereist een nieuwe aanvraag (Deel 7.3) — een geverifieerde status wordt nooit stilzwijgend "geërfd" door een merge, omdat de samengevoegde content per definitie nog niet als geheel is beoordeeld.
- Alle historische ProductVersions en OwnershipRecords van beide Producten blijven bewaard, gemarkeerd met welk Product-ID ze oorspronkelijk hadden.
- **Nooit stilzwijgend:** beide oorspronkelijke eigenaren (indien verschillend) ontvangen een expliciete melding, vergelijkbaar met de al bevroren claim-notificatie ("dit product is samengevoegd met [ander product], jouw Offer blijft actief onder het samengevoegde product; let op: de Verified-status is hierbij ingetrokken en moet opnieuw worden aangevraagd").
- **Omkeerbaar:** een MergeRecord kan worden teruggedraaid (split, 5.4) zolang de volledige historie bewaard is gebleven — wat door het ontwerp altijd het geval is.

## 5.4 Splitsen

- **Trigger:** een eerder uitgevoerde merge blijkt onterecht (twee toch verschillende producten), of een Product blijkt achteraf eigenlijk twee wezenlijk verschillende producten te beschrijven (zelfde grensgeval als het al bevroren "nieuwe versie vs. nieuw product"-onderscheid, §1.9 — een split is wat er gebeurt als die grens verkeerd getrokken bleek).
- **Wie mag splitsen:** uitsluitend de Beheerder, zelfde reden als bij merge.
- **Wat gebeurt er:** het secundaire Product-ID (bij het terugdraaien van een eerdere merge) wordt hersteld met zijn eigen historie, inclusief zijn eigen, oorspronkelijke Identifiers (B1 — deze werden bij de merge verplaatst, niet vernietigd, dus volledig terug te zetten); bij een split die geen eerdere merge terugdraait, wordt een **nieuw** Product-ID aangemaakt voor het afgesplitste deel, met een expliciete verwijzing naar "oorspronkelijk onderdeel van [oud Product-ID]" in de historie — nooit een product zonder herkenbare herkomst.
- **Kettingsamenvoegingen bij een split (B3):** bij het terugdraaien van één merge in een keten van meerdere, wordt uitsluitend die ene merge-stap teruggedraaid — de rest van de keten blijft intact, en de transitieve resolutie (5.3) werkt na een gedeeltelijke split nog steeds correct voor de resterende, niet-teruggedraaide stappen.
- **Verified-status na een split:** blijft, consistent met B8, ingetrokken voor beide resulterende Producten (was al ingetrokken bij de oorspronkelijke merge) — een split herstelt geen eerdere Verified-status, omdat ook het teruggezette, secundaire product opnieuw als zelfstandig product beoordeeld moet worden.

## 5.5 Matchingconflicten

Wanneer AI-matching (5.1 stap 2) twee ongeveer even sterke kandidaten oplevert zonder duidelijke winnaar, wordt dit **nooit** automatisch naar de sterkste kandidaat gerond — het gaat altijd naar handmatige matching (5.1 stap 3) met beide kandidaten zichtbaar getoond, inclusief de onderliggende overeenkomsten/verschillen die de AI heeft gevonden (transparantie-uitgangspunt, consistent met H9.2, al elders toegepast).

---

# Deel 6 — Offers versus Product (expliciet onderscheid, bevestiging)

**Product** beschrijft *wat het is* — eigendom van informatie ligt bij de Producent/Merkhouder (of tijdelijk de Retailer, Retailer Created). **Offer** beschrijft *wie het verkoopt en tegen welke voorwaarden* — eigendom ligt altijd bij de verkopende partij, nooit gedeeld, nooit onderhevig aan claims of matching. Dit is geen nieuwe regel; dit document bevestigt haar nogmaals expliciet omdat de rest van dit document (claims, matching, merges) uitsluitend over Product gaat en **op geen enkel punt** Offer-eigendom raakt. Een merge van twee Producten (5.3) verplaatst Offers naar het primaire Product — het verandert nooit wie de eigenaar van die Offer is.

De reeds bevroren Offer-velden (prijs, voorraad, levertijd, verzendkosten, land, BTW, ranking/Buy Box) blijven ongewijzigd, `product-cloud-commerce-cloud-buy-box/spec.md` §2–3 — dit document voegt daar niets aan toe en trekt niets van in.

---

# Deel 7 — Verified Made in Europe (volledig uitgewerkt)

## 7.1 Twee-laags model — nieuw, hier expliciet vastgelegd

De bevroren documentatie kent al **twee losse bouwstenen** die nooit formeel aan elkaar gekoppeld waren: de **bedrijfsniveau** EU-productieclaim uit Partner Onboarding (`partner-onboarding/spec.md` Stap 3) en het **productniveau** Verified™-label uit de Product Cloud-spec (§1.10). Dit document legt de relatie tussen beide nu formeel vast als een **twee-laags model**:

```
Laag 1 — Bedrijfsverificatie (Partner Onboarding, al bevroren, ONGEWIJZIGD)
  → bevestigt: "dit bedrijf heeft een geloofwaardige Europese productieclaim"
  → resultaat: een voorwaarde voor toelating tot het platform als Producent/Merkhouder, GEEN garantie per product

Laag 2 — Productverificatie (Verified Made in Europe, dit document, NIEUW UITGEWERKT)
  → bevestigt: "DIT SPECIFIEKE product is gecontroleerd en voldoet aan de Verified™-criteria"
  → resultaat: het zichtbare Verified™-badge op de productpagina (al bevroren UI-element)
```

**Kernregel, expliciet:** Laag 1 is een **noodzakelijke, niet-voldoende voorwaarde** voor Laag 2 — een producent zonder geslaagde bedrijfsverificatie kan nooit een productverificatie aanvragen, maar een geslaagde bedrijfsverificatie geeft geen enkel product automatisch het Verified™-label (al zo geformuleerd in de bevroren spec §1.10, hier bevestigd en nu architecturaal vastgelegd als een harde afhankelijkheid tussen twee datamodel-lagen, niet alleen een tekstuele nuance).

## 7.2 Bedrijfsverificatie — hergebruikt, niet gewijzigd

Volledig zoals vastgelegd in `partner-onboarding/spec.md` Stap 3: land van productie, productielocatie(s), fabrikant, bewijsstukken, merk-/fabrikant-eigendom, handmatige controle met reviewer-checklist, 6-maandelijkse hercontrole-cadans. Dit document **verwijst** naar die vastlegging, herhaalt haar niet.

## 7.3 Productverificatie — nieuw uitgewerkt

**Verplichte voorwaarden vóór aanvraag mogelijk is** (aanvullend op de al bevroren §1.10-voorwaarden — volledige productinformatie, documentatie, compliance-velden, Quality Score boven de configureerbare drempel, ADR 0002):
- Producent/Merkhouder heeft een geslaagde bedrijfsverificatie (7.1, Laag 1).
- Product bevindt zich in publicatiestatus "Gepubliceerd" (Deel 8) — een Concept of een product In review kan geen Verified™-aanvraag hebben, want er is nog niets gepubliceerds om te verifiëren.

**Bewijsstukken, productniveau (aanvullend op het bedrijfsniveau-bewijs uit Partner Onboarding):**
- Een productspecifiek productiebewijs indien dit afwijkt van het bij onboarding opgegeven algemene productieprofiel (bijv. een producent met meerdere fabrieken die per productlijn kan verschillen) — optioneel wanneer het product overeenkomt met het al bij onboarding geverifieerde algemene profiel, verplicht wanneer het afwijkt.
- Compliance-documentatie die al op Product-niveau verplicht is per categorie (Deel 2.7) — geen dubbele upload, hergebruikt dezelfde documenten.

**Verificatiestatussen (nieuw, expliciet vastgelegd — bestond nog niet als eigen statusveld):**

```
Niet aangevraagd → Aangevraagd → In beoordeling → Geverifieerd
                                        └──────→ Afgewezen → (aanvullen en opnieuw aanvragen → Aangevraagd)
Geverifieerd → (periodieke hercontrole, zie 7.5) → Geverifieerd (bevestigd) of Ingetrokken
```

- **Niet aangevraagd:** de standaardstaat, geen actie ondernomen.
- **Aangevraagd:** producent heeft de aanvraag ingediend, bewijsstukken compleet.
- **In beoordeling:** hergebruikt exact hetzelfde principe als Partner Onboarding — een reviewer kan, in plaats van uitsluitend goedkeuren/afwijzen, ook hier **aanvullende informatie vragen** (zelfde patroon, geen apart nieuw statusconcept nodig — de "Aanvullende informatie vereist"-status uit Partner Onboarding wordt hier hergebruikt op productniveau in plaats van opnieuw uitgevonden).
- **Geverifieerd:** Verified™-badge actief, zichtbaar op de al bevroren Productpagina.
- **Afgewezen:** met specifieke reden, opnieuw aan te vragen na aanvulling (zelfde herbeoordelingsprincipe als claims, 4.4).

**Koppeling aan een specifieke versie (B2, nieuw expliciet vastgelegd):** een VerificationProductRecord met status Geverifieerd is **altijd gebonden aan de specifieke ProductVersion die op het moment van beoordeling de Gepubliceerde versie was** — niet aan het Product in algemene zin. Dit voorkomt dat een badge blijft staan naast content die nooit zelf beoordeeld is (zie het expliciete vervolg hierop bij rollback, Deel 8.6, en bij merge, Deel 5.3/B8).

## 7.4 Reviewerproces

Hergebruikt de al vastgelegde reviewer-checklist-aanpak uit Partner Onboarding (`partner-onboarding/spec.md` Stap 3), nu toegepast op productniveau met productspecifieke controlepunten: komt de productinformatie overeen met het bewijsstuk, is de productieclaim consistent met het bij onboarding geverifieerde profiel, zijn categorie-verplichte compliance-documenten aanwezig en logisch. **Uitsluitend handmatige eindbeslissing** — AI ondersteunt (bijv. een automatische vergelijking tussen opgegeven productiedata en bekende bedrijfsgegevens) maar beslist nooit (consistent, platformbreed principe, Blueprint H9.7).

## 7.5 Periodieke controle

Elke 6 maanden, of direct getriggerd door een relevante waarschuwing (verlopen certificaat, gewijzigde compliance-documentatie, een gemelde klacht) — exact dezelfde cadans als al vastgelegd voor zowel de bestaande Verified™-hercontrole (§1.10) als de bedrijfsniveau-hercontrole (Partner Onboarding Stap 3). **Bewust dezelfde cadans op alle drie de niveaus** (bedrijf, product, en — nu voor het eerst expliciet zo benoemd — dit is één samenhangend hercontrolesysteem, geen drie losse klokken).

## 7.6 Intrekken van verificatie

- **Trigger:** mislukte periodieke hercontrole, een geconstateerde onjuiste claim (fraudedetectie, Deel 9.3), een verlopen compliance-document zonder tijdige vernieuwing, een geëscaleerd geschil, **of een rollback naar een niet-geverifieerde versie (Deel 8.6, B2)**, of een merge (Deel 5.3, B8).
- **Gevolg:** Verified™-badge verdwijnt onmiddellijk van de productpagina; het product zelf blijft **actief verkoopbaar en vindbaar** (intrekking van verificatie is geen productverwijdering en raakt de afgeleide Visibility-status niet, zie het expliciete onderscheid tussen de statusassen, Deel 8.1) — tenzij de reden voor intrekking zwaar genoeg is om ook de productlevenscyclusstatus te raken (bijv. bij bewezen fraude, wat een apart, zwaarder moderatietraject is, Deel 9).
- **Nooit stilzwijgend:** de producent ontvangt altijd een expliciete melding met reden, en het recht op een herbeoordeling (7.3).

---

# Deel 8 — Versiebeheer en Publicatiestatussen

## 8.1 Kernonderscheid — drie orthogonale statusassen, plus een afgeleide Visibility (belangrijkste architecturale beslissing van dit document)

**Gecorrigeerd na de architectuurreview (B4):** de eerdere versie van dit document sprak van "twee" orthogonale assen, maar beschreef zelf al een derde, eveneens onafhankelijk opgeslagen as (Verificatiestatus, Deel 7.3) zonder die in de telling mee te nemen. Hierbij rechtgezet: er bestaan **drie losstaande, gelijktijdig actieve, onafhankelijk opgeslagen statusassen** op elk Product, die elkaar nooit vervangen of overlappen:

**As 1 — Productlevenscyclusstatus** (al bevroren, §1.10, ONGEWIJZIGD): *Retailer Created → Concept gecontroleerd → Actief → Verified™ → Uitlopend → Niet meer leverbaar → Gearchiveerd.* Beschrijft de **commerciële/verkoopstatus** van het product als geheel.

**As 2 — Publicatiestatus** (nieuw, hier voor het eerst vastgelegd): *Concept → In review → Goedgekeurd → Gepubliceerd → Gearchiveerd → Verwijderd.* Beschrijft de **content-/redactiestatus van een specifieke versie** van de productinformatie.

**As 3 — Verificatiestatus** (Deel 7.3, hier expliciet als volwaardige derde as erkend): *Niet aangevraagd → Aangevraagd → In beoordeling → Geverifieerd/Afgewezen → (Ingetrokken).* Beschrijft of, en voor welke specifieke versie (B2), de productinformatie als "Verified Made in Europe" is gecontroleerd.

**Visibility — een vierde, maar afgeleide/berekende status, geen eigen opgeslagen as (B5, nieuw expliciet vastgelegd):** of een product daadwerkelijk zichtbaar/vindbaar is voor een klant, wordt **niet** apart opgeslagen, maar **berekend** uit de combinatie van: (a) As 2 staat op "Gepubliceerd", (b) er is minimaal één actieve Offer aan het product gekoppeld (Commerce Cloud, ongewijzigd), en (c) er is geen actieve, blokkerende ModerationCase of Dispute (Deel 4.5/9.4) op het product. Verified-status (As 3) beïnvloedt Visibility uitdrukkelijk **niet** — een product zonder (of met ingetrokken) Verified-badge blijft gewoon zichtbaar, uitsluitend zonder het badge zelf; alleen een moderatie-blokkade of het ontbreken van elke Offer maakt een product daadwerkelijk onzichtbaar. Dit is bewust een afgeleide status, geen vierde eigen opgeslagen as: Visibility volgt volledig en uitsluitend uit de andere, al opgeslagen gegevens, en hoeft dus nergens apart gesynchroniseerd te worden.

**Waarom meerdere, orthogonale assen nodig zijn, expliciet gemotiveerd:** een Actief, al jaren verkocht product (As 1) kan op elk moment een nieuwe conceptversie van zijn beschrijving hebben die nog In review staat (As 2), terwijl de Verified-status (As 3) nog op de vorige, wél goedgekeurde versie rust — het product blijft gewoon verkoopbaar en vindbaar (Visibility, afgeleid) met de vorige, goedgekeurde tekst zichtbaar, terwijl de nieuwe versie apart door de review-cyclus gaat. Eén enkele, samengevoegde status zou dit onmogelijk correct kunnen weergeven: óf het product zou onterecht "niet verkoopbaar" lijken tijdens elke tekstwijziging, óf een nog niet goedgekeurde tekst zou onterecht al zichtbaar worden, óf een Verified-badge zou onterecht op ongecontroleerde content blijven staan.

## 8.2 Publicatiestatussen — volledige overgangen

```
Concept → In review → Goedgekeurd → Gepubliceerd → Gearchiveerd → Verwijderd
              └──────→ (afgewezen, terug naar Concept)
```

- **Concept:** een producent/merkhouder bewerkt een nieuwe versie van de productinformatie (nieuwe tekst, nieuwe afbeelding, bijgewerkte specificatie). Niet zichtbaar voor kopers. Meerdere gelijktijdige concepten zijn niet toegestaan per Product — één actief concept tegelijk, om verwarring over "welke wijziging telt" te voorkomen.
- **In review:** het concept is ingediend. **Wie hier reviewt hangt van de context af** (8.4) — bij een rechtstreekse wijziging door de eigenaar zelf op een reeds Verified™ product kan dit een lichte, grotendeels geautomatiseerde AI-check zijn (consistentie, volledigheid); bij een wijziging die compliance-kritische velden raakt (bijv. een CE-certificaat) is altijd een menselijke reviewstap verplicht.
- **Goedgekeurd:** de versie is inhoudelijk akkoord bevonden, maar **nog niet live** — dit tussenstation bestaat bewust apart van "Gepubliceerd" om geplande publicatiemomenten mogelijk te maken (bijv. een producent die een aangepaste beschrijving klaarzet vóór een productlancering, maar pas op een specifiek moment wil laten verschijnen) — een concreet, aantoonbaar nuttig verschil tussen "goedgekeurd" en "nu al zichtbaar."
- **Gepubliceerd:** de versie is de actieve, klantzichtbare versie. Er is per Product **precies één** gepubliceerde versie tegelijk (de vorige gepubliceerde versie schuift automatisch door naar Gearchiveerd zodra een nieuwe versie gepubliceerd wordt — zie 8.3 voor de historie-implicaties).
- **Gearchiveerd:** een eerder gepubliceerde versie die is opgevolgd door een nieuwere — blijft volledig bewaard en doorzoekbaar (audit trail, 8.5), nooit hard verwijderd. Ook van toepassing op een concept dat nooit is goedgekeurd maar bewust gearchiveerd wordt (bijv. een idee dat is losgelaten, in plaats van als "afgewezen" gemarkeerd te blijven staan).
- **Verwijderd:** uitsluitend van toepassing op een Concept of een In review-versie die de indiener zelf actief intrekt/verwijdert vóórdat deze ooit gepubliceerd is geweest — **een reeds gepubliceerde versie kan nooit naar Verwijderd**, uitsluitend naar Gearchiveerd (historie mag nooit verdwijnen zodra iets ooit klantzichtbaar is geweest). Zelfs een "Verwijderde" conceptversie blijft, net als alles in dit statusmodel, technisch bewaard in de audit trail (8.5) — "Verwijderd" is een zichtbaarheidsstatus, geen fysieke verwijdering.

## 8.3 Wie mag wijzigen

Ongewijzigd t.o.v. de al bevroren rechtenmatrix (§4, §1.8): de eigenaar (Producent/Merkhouder, of tijdelijk de Retailer bij Retailer Created) mag een nieuw Concept starten en indienen; een niet-eigenaar kan uitsluitend een wijzigingsvoorstel doen (bestaand mechanisme, ongewijzigd), dat — indien de eigenaar het overneemt — zelf als een nieuw Concept in dit publicatiestatusmodel instroomt.

## 8.4 Reviewproces — gedifferentieerd naar risico

Niet elke wijziging verdient dezelfde zwaarte review — een architecturale keuze om het platform schaalbaar te houden zonder de zorgvuldigheid te verliezen waar het telt:
- **Laag risico** (tekstuele verbetering, aanvullende afbeelding, niet-compliance-attribuut): AI-review (consistentie, volledigheid, ontbrekende informatie — al bestaand mechanisme, §1.8) volstaat, geen verplichte menselijke stap, tenzij de AI zelf onzekerheid signaleert.
- **Hoog risico** (compliance-veld, categoriewijziging, kernidentiteitsveld dat mogelijk een nieuw-product-vraag oproept, §1.9): altijd een verplichte menselijke reviewstap, nooit uitsluitend AI.
- Dit onderscheid wordt bepaald door het **veldtype** dat wijzigt (vastgelegd op attributendefinitie-/velddefinitieniveau, 2.5), niet door een losse, aparte classificatie per wijziging — voorkomt inconsistente behandeling van dezelfde velden.

## 8.5 Historie en audit trail

Elke ProductVersion (elke overgang tussen publicatiestatussen) wordt vastgelegd met: wie de wijziging maakte, tijdstip, oude en nieuwe waarde per gewijzigd veld, reden (verplicht veld bij elke statusovergang, geen vrijblijvende toelichting), en de resulterende status. Dit is **dezelfde audit-trail-verplichting** die al bestond (§1.9: "datum, gebruiker, oude/nieuwe waarde, reden") — hier uitgebreid naar het volledige publicatiestatusmodel in plaats van uitsluitend "een wijziging." **Aanvullend (B6):** elke overgang schrijft tegelijk een regel in de centrale AuditLogEntry (Deel 3.1) — de entiteit-eigen historie (ProductVersion) blijft de bron voor "wat was de vorige inhoud," de centrale AuditLogEntry is de bron voor "wat is er ooit met dit Product gebeurd, over alle entiteiten heen."

## 8.6 Rollback

- **Wat rollback betekent:** een eerder Gearchiveerde versie opnieuw tot de Gepubliceerde versie maken.
- **Wie mag dit:** de huidige eigenaar (zelfde rechten als een gewone publicatie) — een rollback is architecturaal niets anders dan het publiceren van een (toevallig al eerder bestaande) versie, geen apart, zwaarder mechanisme.
- **Gevolg voor de tussenliggende versie:** de versie die door de rollback wordt "teruggedraaid" verdwijnt niet — ze schuift, net als elke vervangen gepubliceerde versie, door naar Gearchiveerd. Er gaat dus nooit informatie verloren door een rollback, ongeacht hoe vaak heen en weer gewisseld wordt.
- **Gevolg voor Verified Made in Europe (B2, nieuw expliciet vastgelegd):** omdat een VerificationProductRecord altijd aan één specifieke ProductVersion gebonden is (Deel 7.3), geldt bij elke rollback: **rollback naar de exact geverifieerde versie** houdt het Verified-badge automatisch actief (het is immers dezelfde, al beoordeelde content); **rollback naar elke andere versie** (nooit geverifieerd, of een andere dan de geverifieerde) trekt het badge automatisch in, met dezelfde melding en herbeoordelingsmogelijkheid als een gewone intrekking (Deel 7.6). Het badge wordt dus nooit stilzwijgend meegenomen naar content die zelf niet is gecontroleerd.

---

# Deel 9 — Moderatie

## 9.1 AI-ondersteuning

Consistent, platformbreed toegepast principe (Blueprint H9.7, al meermaals bevestigd in bevroren documenten): AI ondersteunt op vier punten in dit architectuurdocument — (a) matchingskandidaten voorstellen (Deel 5), (b) claim-/wijzigingsvoorstel-consistentie controleren (§1.8, hergebruikt), (c) laag-risico publicatiereviews afhandelen (8.4), (d) fraude-signalering (9.3). **Op geen van deze vier punten neemt AI ooit de uiteindelijke beslissing** bij iets met een eigendoms-, financieel-, of verificatiegevolg.

## 9.2 Menselijke review

De Beheerder is de enige rol die: geschillen beslecht (4.5), eigendomsoverdrachten buiten claims om goedkeurt (4.3), merges/splits uitvoert (5.3/5.4), productverificatie-eindbeslissingen neemt (7.3/7.4), en hoog-risico publicatiewijzigingen beoordeelt (8.4) — een bewust smalle, zware verantwoordelijkheid, consistent met hoe Partner Onboarding's Beheerder-rol al was vastgelegd.

## 9.3 Conflicten en fraudedetectie

- **Geautomatiseerde signalen (nieuw, expliciet vastgelegd):** herhaalde afgewezen claims door dezelfde partij (4.4, drie-pogingen-drempel), een productieclaim die afwijkt van het bij onboarding geverifieerde profiel zonder aanvullend bewijs (7.3), een ongebruikelijk patroon van merges die telkens dezelfde partij bevoordelen, een plotselinge reeks matchingsconflicten rond producten van één partij.
- **Wat een signaal doet:** **nooit** een automatische blokkade of statuswijziging — uitsluitend een gemarkeerd geval in de Beheerder-wachtrij, met de onderliggende reden zichtbaar (transparantie, consistent, H9.2).
- **Escalatiepad:** een herhaald of ernstig fraudesignaal kan resulteren in een bredere Beheerder-actie op het **partneraccount-niveau** (schorsing) — dit raakt de al eerder als openstaand punt benoemde "Partner Lifecycle Management" (`partner-onboarding/spec.md`, bewust niet meegenomen in Sprint 1B) en wordt hier niet opnieuw uitgewerkt, uitsluitend als kruisverwijzing benoemd.

## 9.4 Meldingen

Een derde partij (een andere retailer, een klant, of een producent die een ander merk verdacht vindt) kan een Product melden — resulteert in een ModerationCase, dezelfde behandeling als een geschil (4.5) wanneer het een eigendomskwestie betreft, of een aparte contentmoderatie-beoordeling wanneer het de juistheid/gepastheid van informatie betreft (bijv. een claim die feitelijk onjuist lijkt, zonder dat het een eigendomsgeschil is).

---

# Deel 10 — Statusdiagrammen (samengevat)

## 10.1 Productlevenscyclus (bevroren, ongewijzigd, ter referentie)
```
Retailer Created → Concept gecontroleerd → Actief → Verified™ → Uitlopend → Niet meer leverbaar → Gearchiveerd
```

## 10.2 Publicatiestatus (nieuw)
```
Concept → In review → Goedgekeurd → Gepubliceerd → Gearchiveerd
              ↓ (afgewezen)              ↑ (rollback, opnieuw naar Gepubliceerd)
           Concept                  Gearchiveerd (elke eerder gepubliceerde versie)
Concept/In review → Verwijderd (uitsluitend vóór ooit gepubliceerd)
```

## 10.3 Claimstatus (uitgewerkt)
```
Ingediend → (identifier-match?) → Ja: automatisch Goedgekeurd
                                 → Nee: In beoordeling → Goedgekeurd / Afgewezen
Afgewezen → (aanvulling) → Ingediend (herbeoordeling, gekoppelde historie)
Twee gelijktijdige claims op hetzelfde product → altijd Geschil, nooit stille winnaar
```

## 10.4 Verified Made in Europe — productniveau (nieuw, bijgewerkt na architectuurreview)
```
Niet aangevraagd → Aangevraagd → In beoordeling → Geverifieerd (gebonden aan de op dat moment Gepubliceerde ProductVersion, B2)
                                        ↓ (aanvullende info nodig, hergebruikt Partner Onboarding-patroon)
                                  Aangevraagd (aangevuld)
                                        ↓ (afgewezen)
                                     Afgewezen → (aanvulling) → Aangevraagd
Geverifieerd → (hercontrole mislukt / fraude / rollback naar andere versie / merge) → Ingetrokken
```

## 10.5 Matching/Merge (nieuw, bijgewerkt na architectuurreview)
```
Nieuwe listing → EAN-match? → Ja: direct gekoppeld aan bestaand Product
                             → Nee: AI-matching → Sterke kandidaat? → Ja: voorgesteld, mens bevestigt
                                                → Nee/Ambigu: handmatige matching
Bestaand Product-paar (duplicaat vermoed) → MatchCandidate → Beheerder → Merge (of: geen actie)
Merge → Identifiers (niet Offers) herwezen naar primair Product (B1); Verified-status beide kanten Ingetrokken (B8)
Merge → (later onterecht bevonden) → Split (herstelt oorspronkelijke Product-ID's + eigen Identifiers, B1)
Secundair Product-ID (opnieuw samengevoegd) → resolveert altijd transitief tot huidige, actieve Product-ID (B3)
```

## 10.6 Visibility (nieuw, afgeleide status, B5)
```
Visibility = Publicatiestatus is "Gepubliceerd" ÉN minimaal één actieve Offer ÉN geen actieve, blokkerende Dispute/ModerationCase
Geen eigen opgeslagen status — uitsluitend berekend uit As 1/As 2/Dispute/Offer-aanwezigheid.
Verified-status (As 3) beïnvloedt Visibility niet — uitsluitend het badge zelf verschijnt/verdwijnt.
```

---

# Deel 11 — Belangrijkste ontwerpbeslissingen (ADR's, voorgesteld)

Genummerd vanaf ADR-0006, doorlopend op de al bevroren ADR 0001–0005. **Nog niet vastgesteld** — dit document is zelf nog niet bevroren, deze ADR's worden pas definitief bij akkoord.

**ADR-0006 — Productfamilie als optioneel, niet-commercieel groeperingsconcept.**
Context: geen bestaand niveau boven Product/Variant. Beslissing: Productfamilie toevoegen als zuiver navigatie-/samenhangconcept, zonder eigendoms- of verkoopimplicaties. Consequentie: geen enkel bestaand claim-, matching- of Offer-mechanisme hoeft rekening te houden met families — ze blijven volledig product-per-product werken.

**ADR-0007 — EAN als GTIN-subtype, niet als los identifier-systeem.**
Context: risico op twee parallelle, inconsistente identifier-modellen. Beslissing: EAN-13 architecturaal behandelen als de Europese GTIN-13-implementatie. Consequentie: één matchingslogica (5.1) volstaat voor beide, geen dubbele code-paden.

**ADR-0008 — Twee-laags Verified Made in Europe-model, met Laag 1 als harde voorwaarde voor Laag 2; Verified-status is versiegebonden.**
Context: bedrijfs- en productverificatie bestonden los van elkaar zonder vastgelegde relatie; daarnaast bleek (architectuurreview, B2) dat een Verified-status niet expliciet aan een specifieke inhoudsversie was gebonden, wat via rollback een badge naast nooit-gecontroleerde content mogelijk had gemaakt. Beslissing: productverificatie is architecturaal onmogelijk zonder geslaagde bedrijfsverificatie, én elke Verified-status is gebonden aan de specifieke ProductVersion die beoordeeld is (Deel 7.3) — een rollback naar een andere versie trekt het badge automatisch in (Deel 8.6), een merge trekt het badge van beide betrokken producten in (Deel 5.3, B8). Consequentie: voorkomt zowel dat een niet-geverifieerd bedrijf via een productaanvraag alsnog een badge zou bemachtigen, als dat een badge ooit naast ongecontroleerde content blijft staan.

**ADR-0009 — Drie orthogonale statusassen (levenscyclus, publicatie, verificatie), plus een afgeleide, niet-opgeslagen Visibility-status.**
Context: risico op een enkel, overladen statusveld dat commerciële, redactionele en verificatiebetekenis vermengt; de eerdere formulering van deze ADR sprak abusievelijk van "twee" assen terwijl het document zelf al een derde (Verificatiestatus) beschreef (architectuurreview, B4), en had geen formeel antwoord op de vraag of een product daadwerkelijk klantzichtbaar is (B5). Beslissing: drie aparte, onafhankelijk opgeslagen statusvelden, elk met eigen overgangen (Deel 8.1), aangevuld met een vierde, uitdrukkelijk **afgeleide** Visibility-status die nergens apart wordt opgeslagen maar berekend uit de andere drie plus Offer-/Dispute-aanwezigheid. Consequentie: een tekstwijziging aan een al actief, verkocht, geverifieerd product kan door review zonder het product ooit "onverkoopbaar," "onzichtbaar," of ten onrechte nog "Verified" te laten lijken.

**ADR-0010 — Matchingspijplijn strikt deterministisch → probabilistisch → menselijk, nooit lagen overslaan.**
Context: risico op inconsistente, ad-hoc matchingsbeslissingen naarmate volume groeit. Beslissing: vaste volgorde, elke laag alleen actief als de vorige geen uitkomst geeft. Consequentie: voorspelbaar, uitlegbaar matchinggedrag, ook bij toekomstige AI-modelwissels (de deterministische laag verandert nooit mee met een AI-upgrade).

**ADR-0011 — Merge/split zijn uitsluitend Beheerder-bevoegdheden, altijd omkeerbaar en volledig gelogd; merge raakt uitsluitend Identifiers, nooit Offer-records; kettingresolutie is altijd transitief.**
Context: risico op oncontroleerbare, permanente dataverlies-scenario's bij samenvoegacties; daarnaast bleek de eerdere formulering intern inconsistent — Deel 5.3 beschreef dat Offers "omgezet" werden bij een merge, terwijl Deel 6 stelt dat een merge de Product/Offer-grens nooit raakt (architectuurreview, B1), en het document behandelde geen kettingsamenvoegingen (meerdere merges na elkaar op hetzelfde Product-ID, architectuurreview, B3). Beslissing: geen enkele merge is destructief; een merge herwijst uitsluitend Identifiers (EAN/GTIN/MPN) naar het primaire Product, nooit Offer-records zelf (Deel 5.3); elke verwijzing naar een secundair Product-ID resolveert altijd transitief tot de uiteindelijke, actieve Product-ID, ook na meerdere opeenvolgende merges. Consequentie: hogere opslagvereiste (historie wordt nooit verwijderd) in ruil voor volledige herstelbaarheid — bewust aanvaard; de Product/Offer-grens (Deel 6) blijft daadwerkelijk, niet alleen op papier, op geen enkel punt doorbroken.

**ADR-0012 — Claims, geschillen, eigendomsoverdrachten en fraudesignalen zijn altijd handmatige Beheerder-beslissingen; Geschillen zijn een eigen, auditeerbare entiteit.**
Context: bevestiging en formele vastlegging van een principe dat al impliciet overal werd toegepast; daarnaast bleek een geschil nergens als eigen entiteit in het domeinmodel te staan, ondanks dat het proces er zelf al wel voor beschreven was (architectuurreview, B7). Beslissing: geen enkele van deze vier categorieën wordt ooit volledig geautomatiseerd, ongeacht hoe overtuigend een toekomstig AI-model zou kunnen worden; elk geschil is een eigen Dispute-record (Deel 3.1/4.5), niet een bijverschijnsel van een Claim. Consequentie: een bewuste, permanente snelheidsbeperking op deze categorieën, geaccepteerd als noodzakelijke prijs voor vertrouwen op een marketplace waar eigendom van informatie een reëel, soms betwist belang vertegenwoordigt; de behandeling en uitkomst van elk geschil is nu ook zelf, los van de onderliggende gebeurtenis, auditeerbaar.

**ADR-0013 — Centrale AuditLogEntry als aanvulling op entiteit-eigen historie (nieuw).**
Context: "audit trail" werd op meerdere plekken als eis genoemd (Deel 1.1, 8.5) zonder dat er een centrale entiteit voor bestond in het domeinmodel — elke entiteit hield zijn eigen, losse historie bij, zonder één doorzoekbare tijdlijn per Product (architectuurreview, B6). Beslissing: een centrale AuditLogEntry-entiteit toevoegen (Deel 3.1) die elke wijziging aan elke betrokken entiteit vastlegt, aanvullend op — niet in plaats van — de al bestaande, entiteit-eigen historie (ProductVersion, OwnershipRecord, MergeRecord). Consequentie: een Beheerder kan de volledige geschiedenis van een Product in één centrale tijdlijn bevragen, zonder losse entiteiten te hoeven combineren.

---

# Deel 12 — Risicoanalyse

| Risico | Impact | Waarschijnlijkheid | Mitigatie (in dit document) |
|---|---|---|---|
| **Kleinere Europese producenten zonder geldig GTIN/EAN** worden slecht bediend door een architectuur die primair op identifiers leunt | Hoog — direct in strijd met de kernbelofte "Europese producten," met name kleinere producenten | Middel-hoog (reëel, met name buiten grote retailketens) | MPN expliciet als eerste-klas alternatief erkend (2.4); AI-/handmatige matching als volwaardige, niet-inferieure lagen (5.1) — geen enkel product wordt slechter behandeld omdat het geen EAN heeft. |
| **Matchingsfouten op schaal** (verkeerde merges, gemiste duplicaten) naarmate de catalogus groeit van honderden naar honderdduizenden producten | Hoog — directe impact op klantvertrouwen (verkeerd product getoond) en op producenteneigendom | Middel, groeiend met schaal | Strikt gelaagde pijplijn (5.1, ADR-0010), periodieke herdetectie (5.2), altijd omkeerbare merges (5.3/5.4, ADR-0011). |
| **Verified Made in Europe wordt uitgehold** als productverificatie te licht blijkt tegenover de bedrijfsniveau-claim | Zeer hoog — direct de kernbelofte van het platform | Laag bij correcte implementatie, hoog bij verwaarlozing | Twee-laags model met harde afhankelijkheid (7.1, ADR-0008), verplichte periodieke hercontrole (7.5), expliciet intrekkingsmechanisme (7.6). |
| **Reviewer-bottleneck** — alle claims, geschillen, merges, verificaties en hoog-risico publicaties vereisen mensen; groeit dit lineair mee met platformgroei, dan wordt het een operationeel knelpunt | Middel-hoog — vertraagt onboarding/publicatie, raakt het "binnen één werkdag"-Blueprint-doel | Hoog, naarmate het platform groeit | Gedifferentieerd risiconiveau (8.4) beperkt menselijke review tot waar het telt; automatisch-bij-identifier-match (4.4, 5.1) vangt het grootste deel van het volume af zonder mens. **Blijft een reëel, niet volledig opgelost risico — zie openstaande ontwerpkeuzes.** |
| **Drie statusassen + afgeleide Visibility (Deel 8) worden in de toekomstige UX/implementatie per ongeluk samengevoegd of verward met opgeslagen velden** door een team dat de architecturale reden niet kent | Middel — zou de kernmotivatie van Deel 8 ongedaan maken | Middel, typisch risico bij overdracht van architectuur naar bouwteam | Expliciete, uitgeschreven motivatie (8.1) in plaats van uitsluitend een diagram — bedoeld om de reden mee te geven, niet alleen de uitkomst; Visibility expliciet als "geen eigen opgeslagen veld" benoemd om verwarring te voorkomen. |
| **Productfamilie (nieuw concept) blijft ongebruikt of inconsistent toegepast** omdat het optioneel is | Laag — geen functionele schade, wel een gemiste kans op samenhang | Middel | Bewust optioneel gehouden (2.2) — een niet-verplicht concept dat nooit gebruikt wordt is een gemiste kans, geen architecturaal probleem; kan later, indien nuttig gebleken, alsnog gestimuleerd worden zonder bestaande data te breken. |

---

# Deel 13 — Openstaande ontwerpkeuzes

Bewust niet in dit document beslist — vereisen ofwel een productbeslissing (geen architectuurbeslissing), ofwel meer operationele ervaring dan er op dit punt in het project is:

1. **Exacte AI-matchingsdrempel** (welke betrouwbaarheidsscore geldt als "sterke kandidaat" vs. "ambigu, naar mens") — een tunbare parameter, geen architecturale beslissing; voorstel: configureerbaar door de Beheerder, zelfde patroon als de Verified™-Quality-Score-drempel (ADR 0002, hergebruikt precedent).
2. **Reviewer-capaciteitsmodel** (hoe de in Deel 12 benoemde bottleneck operationeel wordt opgelost — meer Beheerders, een gelaagd reviewteam, prioritering) — een operationeel/personeelsvraagstuk, geen architectuurvraagstuk.
3. **Exacte definitie van "productspecifiek bewijs" bij claims** (4.4) — welke documenten/gegevens precies overtuigend genoeg zijn, is een beleidsmatige/juridische vraag, geen architecturale.
4. **Of Productfamilie later verplicht of gestimuleerd wordt** — afhankelijk van of producenten het concept in de praktijk nuttig blijken te vinden; te vroeg om nu te beslissen.
5. **Relatie tussen contentmoderatie-meldingen (9.4) en het al bestaande, nog niet uitgewerkte Compliance Dashboard** (`ux-architecture.md`, schermen #47–48, nog niet gebouwd) — vermoedelijk hetzelfde onderliggende ModerationCase-model, maar dat vereist eerst dat het Compliance Dashboard zelf ontworpen wordt.
6. **Precieze bewaartermijn van gearchiveerde/verwijderde ProductVersions** — een AVG/GDPR-achtige vraag zoals eerder al bewust open gelaten bij Partner Onboarding-documenten (`partner-onboarding/spec.md`, Beveiligingseisen), dezelfde aanpak hier: een eindige termijn moet bestaan, het exacte getal is beleidsmatig, niet architecturaal.

---

# Deel 14 — Architectuurcontrole

- ✓ **Blueprint-consistent** — Product/Variant/EAN-hiërarchie (H6.6/H7.3–7.6), producent-voorrangsprincipe (H9.8), AI-ondersteunt-mens-beslist (H9.7), transparantie-uitgangspunt (H9.2) — allemaal herleidbaar en op geen enkel punt tegengesproken.
- ✓ **Product Cloud-consistent** — dit document wijzigt geen enkel bevroren veld, geen enkele bevroren regel uit `product-cloud-commerce-cloud-buy-box/spec.md` §1; het diept uitsluitend uit en voegt nieuwe, niet eerder bestaande onderdelen toe (Productfamilie, Matching, Publicatiestatussen, Visibility, Dispute, AuditLogEntry).
- ✓ **Commerce Cloud-consistent** — Offer-model, Buy Box-logica, en de Product/Offer-grens (Deel 6) volledig ongewijzigd; de eerder geconstateerde inconsistentie (B1: merge leek Offers te "omzetten") is opgelost door expliciet vast te leggen dat een merge uitsluitend Identifiers herwijst, nooit Offer-records — de grens is nu ook daadwerkelijk, niet alleen op papier, op geen enkel punt doorbroken.
- ✓ **RBAC-consistent** — alle rolrechten (Producent/Merkhouder/Retailer/Distributeur/Beheerder) hergebruikt zoals al vastgelegd (Authenticatie-spec, Product Cloud §4); nieuwe bevoegdheden (merge/split, eigendomsoverdracht buiten claims, geschillenbeslechting via de nu formele Dispute-entiteit) zijn expliciet en uitsluitend aan de Beheerder toegekend, geen nieuwe rol geïntroduceerd.
- ✓ **Authenticatie-consistent** — geen enkele wijziging aan sessiebeheer, 2FA, of het onderscheid tussen Consument/Retailer/Producent/Beheerder; verificatie-koppelingen (Deel 7) verwijzen naar, maar wijzigen niet, de bevroren Authenticatie-architectuur.
- ✓ **Partner Onboarding-consistent** — bedrijfsniveau-verificatie (Stap 3) volledig hergebruikt als Laag 1 van het twee-laags Verified Made in Europe-model (Deel 7.1), geen enkel veld of proces uit die spec is gewijzigd; kruisverwijzingen zijn eenrichtingsverkeer (dit document verwijst ernaar, niet andersom, dus geen wijziging aan het bevroren document nodig).
- ✓ **Onafhankelijke architectuurreview verwerkt** — acht goedgekeurde bevindingen (B1 t/m B8) volledig verwerkt: B1 (merge/Offer-inconsistentie opgelost, Deel 5.3/6), B2 (Verified-status versiegebonden, Deel 7.3/8.6), B3 (transitieve kettingresolutie bij merge, Deel 5.3/5.4), B4 (drie statusassen correct benoemd, Deel 8.1/ADR-0009), B5 (Visibility als afgeleide status toegevoegd, Deel 8.1/10.6), B6 (AuditLogEntry toegevoegd aan domeinmodel, Deel 3.1/ADR-0013), B7 (Dispute als eigen entiteit toegevoegd, Deel 3.1/4.5/ADR-0012), B8 (Verified-lot bij merge expliciet vastgelegd, Deel 5.3). B9 t/m B12 bewust niet verwerkt, op uitdrukkelijk verzoek. Daarnaast zijn bij deze verwerking drie foutieve interne Deel-verwijzingen gecorrigeerd (Deel 3.1, 4.4, 7.6), aangetroffen tijdens de vereiste interne-consistentiecontrole.

---

## Zelfreview (Lead Marketplace Architect)

Vóór bevriezing, de kritische vragen die ik mezelf als onafhankelijke reviewer zou stellen — nu ná verwerking van de architectuurreview:

- **Houdt dit tien jaar stand?** De kernbeslissing die dat het meest bepaalt — Product-ID als onveranderlijke identiteit, volledig losstaand van elke verkopende of producerende partij — is consistent door het hele document heen toegepast, inclusief de nu opgeloste kettingsamenvoegings-vraag (B3): een Product-ID-verwijzing blijft ook na meerdere opeenvolgende merges altijd correct te herleiden.
- **Zijn de kritieke bevindingen (B1–B3) daadwerkelijk opgelost, niet alleen benoemd?** Gecontroleerd: B1 is opgelost door de merge-mechaniek zelf te herdefiniëren (Identifiers, niet Offers), niet door uitsluitend de tekst gladder te formuleren. B2 is opgelost door een structurele koppeling (VerificationProductRecord ↔ ProductVersion) toe te voegen aan het datamodel, niet uitsluitend een waarschuwende zin. B3 is opgelost door een expliciete resolutieregel (altijd transitief) vast te leggen, niet door het scenario te negeren.
- **Is er dubbel werk of nieuwe scope binnengeslopen?** Gecontroleerd: alle acht verwerkte punten zijn verduidelijkingen/correcties van al beschreven functionaliteit (Dispute en AuditLogEntry bestonden al inhoudelijk in de proza-beschrijvingen, kregen nu uitsluitend een formele plek in het domeinmodel) — geen nieuwe functionaliteit, geen scope-uitbreiding, conform de expliciete opdracht.
- **Is de interne consistentie nu volledig?** Alle Deel-verwijzingen doorlopen en gecontroleerd; drie foutieve verwijzingen gevonden en gecorrigeerd (zie Deel 14). Geen resterende tegenstrijdigheid tussen enige twee secties van dit document aangetroffen.

**Dit document is hierbij DEFINITIEF BEVROREN.**
