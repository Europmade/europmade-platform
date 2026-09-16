# Blueprint-referentie

**Bron:** [`/blueprint/EuropMade_Blueprint_V2_1.docx`](../../blueprint/EuropMade_Blueprint_V2_1.docx) (Blueprint v2.1) + Financieel model v1.0
**Status:** Definitief als **business**-brondocument.

**Implementatie-master (as-built + MVP-status + fasering):** [`docs/11-blueprint-v2/README.md`](../11-blueprint-v2/README.md) — Fase 0 (2026-08-26). Dat document beschrijft wat het systeem werkelijk is; het PDF hieronder blijft missie/businessmodel (H-nummers) en wordt niet vanuit de repo bewerkt.

Deze documenten zijn de externe bron van waarheid voor de business- en financiële strategie van EuropMade. Ze worden hier niet gedupliceerd, maar staan als los einddocument in de repository-brede map [`/blueprint/`](../../blueprint/README.md) (bewust buiten `docs/`, zie de toelichting daar) en worden vanuit alle documentatie in `docs/` met hoofdstukverwijzingen (bijv. "H8.5") aangehaald.

## Hoofdstukoverzicht (Blueprint v2.1)

| Hoofdstuk | Titel | Relevant voor |
|---|---|---|
| 1 | Executive Summary | Context |
| 2 | Missie, Visie & Kernwaarden | Context |
| 3 | Marktanalyse | Context |
| 4 | Marktpotentie (TAM/SAM/SOM) | Context |
| 5 | Businessmodel | Architectuur, UX, Product Cloud/Commerce Cloud |
| 6 | Marketplace Concept | UX, Product Cloud/Commerce Cloud/Buy Box |
| 7 | Product Cloud | Product Cloud |
| 8 | Commerce Cloud | Commerce Cloud, Buy Box |
| 9 | Partnerplatform | UX (Partnerdashboard), Product Cloud |
| 10 | Klantreis (Customer Journey) | UX |
| 11 | Productinformatie & Databeheer | Product Cloud |
| 12 | AI Platform | Architectuur, Product Cloud |
| 13 | Verified™, Compliance & Europese Regelgeving | Product Cloud, UX |
| 14 | Marketing, Groei & Partneracquisitie | UX (navigatie/advertenties), MVP-scope |
| 15 | Technische Architectuur & Ontwikkelroadmap | Architectuur, MVP-scope |
| 15A | Affiliate & Creator Platform | UX (toekomstige rollen), MVP-scope |
| 16 | Financiële Businesscase | Context |
| 17 | Governance, Risicobeheer & EuropMade 2030 | Context |
| Bijlage A | Security & Privacy | Architectuur |

**Documentatienotitie:** het brondocument opent met "Version 2.0" op de titelpagina en sluit hoofdstuk 17 af met "Einde Blueprint — Versie 1.0", waarna hoofdstuk 15A en Bijlage A ná dat label volgen. Dit is een versienummering-inconsistentie in het brondocument zelf; alle documentatie in dit repository behandelt de volledige inhoud (inclusief H15A en Bijlage A) als functionele waarheid onder de aanduiding "v2.1".

## Financieel model

Financieel model v1.0 is definitief en vormt de financiële kaders (o.a. 10% commissie, geen abonnement in de MVP, bannerplatform als tweede inkomstenbron, **Affiliate-commissie als derde, actieve MVP-inkomstenpost — zie scopewijziging hieronder**) die de UX- en functionele documentatie niet tegenspreekt. Toekomstige inkomstenbronnen (Premium Abonnementen, Verified™-certificering, AI-diensten, Logistieke diensten) zijn voorbereid als uitbreidbare regels, maar zitten niet in de MVP-financiën (H5.6).

**Let op:** het financieel model v1.0 zelf is nog niet als bestand aan de repository toegevoegd. Zodra dit gebeurt, hoort het naast de Blueprint in [`/blueprint/`](../../blueprint/README.md), niet in `docs/`, om dezelfde reden: het is een business-einddocument, geen technische of UX-documentatie. Bij toevoeging moet het Affiliate-commissie als actieve MVP-post bevatten (zie hieronder), niet langer als "toekomstige inkomstenbron."

## Definitieve scopewijziging: Affiliate Platform (vervangt H15.7 / H15A.12 op dit punt)

Per definitieve projectbeslissing is het **Affiliate Platform** (exclusief de Creator-rol) onderdeel van de MVP. Dit vervangt de classificatie in Blueprint H15.7 ("Expliciet buiten MVP: Affiliate & Creator Platform") en H15A.12 voor het Affiliate-gedeelte. De **Creator**-rol (contentmakers, eigen storefront/profiel) blijft ongewijzigd Post-MVP — deze scopewijziging betreft uitsluitend linkgedreven affiliate-marketing met commissie op conversie.

Dit is een formeel besluitrecord dat oudere verwijzingen in `05-mvp-scope/README.md`, `02-ux/ux-architecture.md`, `02-ux/wireframes/wireframe-strategie.md`, `01-architecture/standard-vs-custom.md`, `06-development/project-status-and-roadmap.md` en de Sprint 2-technische documenten overschrijft. Het externe Blueprint-brondocument zelf (`blueprint/EuropMade_Blueprint_V2_1.*`) wordt niet gewijzigd — dit besluitrecord treedt in de plaats van H15.7/H15A.12 op dit specifieke punt, op dezelfde manier waarop een ADR een eerdere ADR expliciet vervangt.

Volledige functionele uitwerking: [`03-functional-specs/affiliate-platform/`](../03-functional-specs/affiliate-platform/README.md).
