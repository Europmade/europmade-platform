# ADR-0050 — Zelfstandig Product Cloud-product; geen commerciële varianten

**Status:** Geaccepteerd  
**Datum:** 2026-11-07  
**Domein:** Product Cloud, Commerce Cloud, Seller, Admin, Import  
**Vervangt:** `docs/03-functional-specs/product-cloud-architecture/spec.md` §2.3 (variant als commerciële uitvoering) en de commerciële lezing van dezelfde variantassen in `product-cloud-commerce-cloud-buy-box/spec.md` §1.1, `08-technical-blueprint/01-domain-model.md` §6 en `08-technical-blueprint/02-database-model.md` B.4.  
**Blijft gelden:** ADR-0040 punt 7 (offer → identifier → product_variant → product_version). ADR-0037 (`pc_product_relation`). ADR-0008 (Deel B-tabellen blijven bestaan). Identificatie- en idempotentieregels voor EAN/GTIN/MPN.

## Context

De bevroren Product Cloud-architectuur behandelde kleur, maat, inhoud, vermogen, spanning, materiaal, uitvoering en bundel als varianten van één product. Die varianten deelden titel, beschrijving en de overige productvelden. Seller, Admin, import en EU-schoenmaten zijn op die lezing gebouwd.

De definitieve bedrijfsregel is anders. Pink, Blue en Brown van hetzelfde kussen zijn drie verkoopbare artikelen. Elk artikel heeft een eigen productidentiteit. Samenhang loopt via productrelaties of een productfamilie, niet via een variantgroep.

De Commerce Cloud-offerketen mag daarbij niet breken. Een offer wijst naar een identifier, en die identifier wijst naar een productvariant. Die rij is een technische koppeling, geen commercieel product.

## Beslissing

### 1. Productidentiteit

Elk zelfstandig verkoopbaar artikel is één Product Cloud-product.

Elk product heeft een eigen product-ID, titel, EAN/GTIN, merkrelatie, categorie, afbeeldingen, beschrijving, productspecificaties, goedkeuringsstatus, publicatiestatus, productrelaties en seller-aanbiedingen. Aanbiedingen lopen via de bestaande technische offerketen.

Een ander verkoopbaar artikel wordt niet automatisch onderdeel van hetzelfde product omdat de kleur, maat, uitvoering, batterij, configuratie, productnaam, het merk of de productfamilie lijkt.

### 2. Geen commerciële variantgroepen

De volgende verschillen maken geen Product Cloud-varianten:

- kleur
- maat
- inhoud
- vermogen
- spanning
- materiaal
- uitvoering
- batterij
- bundel
- productfamilie

Waar die waarden het artikel beschrijven, zijn het productspecificaties op dat zelfstandige product. Een andere kleur, maat of uitvoering is een zelfstandig product zodra het een afzonderlijk verkoopbaar artikel is.

### 3. Relaties en families

`pc_product_relation` (ADR-0037) en productfamilie koppelen verwante producten. Een relatie of familie:

- behoudt de eigen productidentiteit, EAN/GTIN, productgegevens, aanbiedingen, goedkeuring en publicatiestatus
- voegt geen producten samen
- zet geen producten om in varianten

Een productfamilie blijft een optioneel samenhangconcept zonder eigendoms- of verkoopimplicaties. Een product zonder familie blijft geldig.

### 4. Technische variant

`pc_product_variant` blijft bestaan als interne implementatielaag.

De keten uit ADR-0040 blijft intact:

Commerce Cloud offer → identifier → technische productvariant → productversie.

Elk zelfstandig verkoopbaar product heeft precies één technische variant. Die variant:

- is geen afzonderlijk commercieel product
- wordt niet als variantgroep beheerd
- heeft geen commerciële variantassen
- wordt niet door Seller of Admin aangemaakt, bewerkt of verwijderd als variant
- blijft beschikbaar voor Medusa, EAN/GTIN en Commerce Cloud

Meerdere identifiers op die ene technische variant blijven toegestaan, inclusief een landscope, wanneer het hetzelfde verkoopbare artikel is. Een ander verkoopbaar artikel krijgt een eigen product en een eigen technische variant.

Bestaande technische variantrecords en bestaande offerrelaties blijven behouden. Deze ADR wijzigt geen tabel en verwijdert geen rijen.

### 5. Seller en Admin

Seller en Admin beheren zelfstandige producten. Zij bieden geen variantbeheer:

- geen variantassen
- geen variantgroepen
- geen variantduplicatie
- geen varianten toevoegen, wijzigen of verwijderen
- geen variantselectie bij aanmaken of bewerken

De bestaande productgoedkeurings- en publicatieflow blijft ongewijzigd.

### 6. Import

Eén Excel- of CSV-regel is één zelfstandig product. Import maakt geen commerciële variantgroepen. Import maakt per zelfstandig product de ene technische variant die de EAN- en offerkoppeling nodig heeft. Bestaande identificatie- en idempotentieregels blijven gelden. Verschillende kleuren, maten en uitvoeringen blijven zelfstandige producten. Productrelaties worden afzonderlijk gelegd.

### 7. EU-schoenmaten

EU-schoenmaten zijn productspecificaties. Elke verkoopbare schoenmaat is een zelfstandig product met een eigen EAN/GTIN. De EU-naar-UK-conversietabel blijft behouden en blijft afhankelijk van dames-, heren- of kindermaten. Ontbreekt een conversie, dan wordt er niet geschat en niet afgerond. Schoenmaten zijn geen commerciële variantassen.

## Consequenties

- `product-cloud-architecture/spec.md` §2.3 en de daarbij horende hiërarchie beschrijven voortaan één technische variant per product.
- De offerketen van ADR-0040 verandert niet.
- Seller-, Admin- en importschermen die variantassen aanbieden wijken af van deze ADR totdat een latere implementatie ze verwijdert. Deze ADR wijzigt die code niet.
- Bestaande producten met meerdere commerciële variantrijen blijven in de database staan. Nieuwe artikelen worden niet meer als zulke varianten aangemaakt.
