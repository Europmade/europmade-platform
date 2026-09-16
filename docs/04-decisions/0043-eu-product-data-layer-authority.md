# ADR-0043 — EU Product Data-laag: Product Cloud blijft autoriteit; MVP zonder live externe productdatabase

**Status:** Geaccepteerd  
**Datum:** 2026-08-26  
**Domein:** Product Cloud, Verification, Integraties  
**Raakt:** ADR-0002, ADR-0008, ADR-0009, ADR-0026, ADR-0028, ADR-0035, ADR-0037, ADR-0042 (**Geaccepteerd**; taxonomie-cutover 2026-08-26); Blueprint H5.12 / H7 / H9.7 / H13; GPSR (EU) 2023/988; implementatie-master [`docs/11-blueprint-v2/README.md`](../11-blueprint-v2/README.md); kader [`docs/13-eu-product-data/README.md`](../13-eu-product-data/README.md)

**Uitvoering:** nog niet. Deze ADR wijzigt geen code, schema of API.

## Context

Er is geen algemene EU-productdatabase die voor willekeurige GTIN’s fabrikant, productieland en Made in Europe levert. GPSR verplicht traceerbaarheids- en veiligheidsinformatie **op het aanbod** (o.a. Art. 19) en verplicht online marktplaatsen tot o.a. registratie bij het Safety Gate-portaal en steekproeven in publieke databases (Art. 22) — dat is **operationele marketplace-compliance**, geen productmaster.

Product Cloud (`e435b825`) dekt al seller → completeness/GPSR → submit → admin approve → publish → offer → catalog → PDP. Verification (Laag 1 + Laag 2 + MiE-score + evidence) bestaat. Zonder bindende regels dreigt een tweede productmodel, stille overwrite, of “externe hit = Made in Europe”.

## Beslissing

1. **MVP lanceert zonder live externe EU-productdatabase.** Geen EPREL-, GS1-, Safety Gate- of ICSMS-adapter in MVP. Minimale productdata = seller-provided Product Cloud + bestaande GPSR/manufacturer-velden + bestaande evidence + handmatige Verification. Safety Gate-portaalregistratie (GPSR Art. 22) is een **apart operationeel** punt, geen productdata-integratie.

2. **Product Cloud blijft de enige productautoriteit.** Geen tweede productdatabase, geen tweede GTIN-/manufacturer-/categorie-entiteit. Goedgekeurde / gepubliceerde `product_version` wordt **nooit automatisch** overschreven.

3. **productdata ≠ verification ≠ Made in Europe.** Externe hits (P2) mogen identificeren, aanvullen als *voorstel*, controleren of evidence aanleveren. Zij mogen **niet** zelfstandig Verified™ of Made in Europe toekennen, en geen productieplaats bevestigen tenzij de bron dat expliciet en betrouwbaar levert **én** een latere bron-ADR dat toestaat. Geen bekende P2-kandidaat in dit kader levert dat herkomstbewijs.

4. **EPREL is de eerste P2-adapterkandidaat**, niet omdat het een algemene EU-productdatabase is, maar omdat het een officiële Commissie-bron is met Public API onder voorwaarden. EPREL is **categorie-afhankelijk** (alleen energiegelabelde productgroepen). Afwezigheid in EPREL is **geen** fout, **geen** negatieve verification, **geen** “niet EU”. EPREL-data mag **nooit** automatisch tot Verified™ / Made in Europe leiden. Live koppeling vereist een **aparte bron-ADR** (API-key, T&C, AVG/EU-hosting, veldmapping).

5. **Safety Gate / ICSMS zijn geen MVP-integratiebronnen.** Safety Gate: officieel, publiek portaal; **geen** door de Commissie gedocumenteerde marktplaats-API. ICSMS: intern voor autoriteiten; publiek webdeel, **geen** publieke product-API. Steekproeven (GPSR) in MVP: **handmatig** via het officiële portaal.

6. **GS1/GDSN is commercieel**, geen officiële EU-productdatabase en geen MiE-bron. Geen live koppeling in MVP; P2 alleen na commerciële + AVG-ADR.

7. **Conflicten:** zichtbaar maken; reviewer beslist; seller/PC-goedgekeurde data blijft leidend tot een mens een voorstel accepteert via bestaande `change_proposal` / Verification / `pc_field_change`.

8. **AI** (ADR-0035) mag voorstellen, nooit beslissen over Laag 2, GPSR-rechtsgevolg of Made in Europe.

9. **ADR-0042** is sindsdien **Geaccepteerd** (aparte ADR). Deze ADR-0043 accepteert taxonomie niet zelf; externe productgroepen blijven hoogstens snapshot-hints, nooit canonieke EuropMade-taxonomie.

10. **Buy Box** ongewijzigd (klantbelang; geen ads/commissie/externe ranking).

11. **Conceptueel P2-model** (niet implementeren): ExternalSource, ExternalSnapshot, ExternalMatch, ExternalEvidence — gekoppeld aan bestaande `identifier` / `product_version`. Geen write rechtstreeks naar `product_version`.

## Consequenties

- MVP-launch hangt niet van derden-API’s, API-keys of GDSN-licenties af.
- GPSR-invoer blijft seller-plicht op de listing; EuropMade verifieert Laag 2 handmatig.
- P2 kan EPREL toevoegen voor energielabels zonder de catalogus voor niet-EPREL-producten te breken.
- Safety Gate-banner-op-PDP zonder veldwijziging blijft **OPEN** (vervolg-ADR).

## Non-goals

- Geen live bronstack in deze ADR (alleen: MVP = geen live product-API; P2-kandidaat = EPREL).
- Geen taxonomy-migratie, geen code, geen schema.
- Geen live KvK (onboarding-spec). Geen DPP (post-MVP).

## Referentie

- [`docs/13-eu-product-data/README.md`](../13-eu-product-data/README.md)
