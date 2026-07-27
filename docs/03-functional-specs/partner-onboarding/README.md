# Partner Onboarding

**Status:** v1.1 — definitief bevroren. Vierde en laatste onderdeel van Sprint 1B — het grootste, meest architecturaal risicovolle blok volgens de eerdere Sprint 1B-risicobeoordeling.

## Inhoud

- [`spec.md`](./spec.md) — volledige architectuuranalyse, functionele specificatie, Europese productieverificatie, componentanalyse, en wireframes. Bijgewerkt na een onafhankelijke architectuurreview met vijf verbeterpunten (zie hieronder).

## Onafhankelijke architectuurreview — vijf verbeterpunten verwerkt

1. **Nieuwe status "Aanvullende informatie vereist"** — tussen In beoordeling en de eindstatussen, zodat een reviewer een specifieke vervolgvraag kan stellen zonder een volledige afwijzing te hoeven geven. Volledig uitgewerkt: statusovergangen, gebruikersmeldingen, acties partner/reviewer, acceptatiecriteria, en een nieuwe statuspagina-variant in de wireframes.
2. **Verplichte e-mailverificatie vóór de start** — expliciet vastgelegd en server-side afgedwongen (was voorheen alleen impliciet aanwezig in de Authenticatie-spec); kruisverwijzing tussen beide documenten gecontroleerd en aangevuld.
3. **Mobiele documentupload** — CMP-041 uitgebreid met directe cameraopname op mobiel (naast bestandskiezer), desktop/tablet behouden drag-and-drop ongewijzigd.
4. **Beveiligingseisen documentuploads** — architectuur-/functionele eisen vastgelegd: versleutelde opslag, malware-scan bij upload, uitsluitend geautoriseerde reviewers, audit logging, bewaartermijn, AVG/GDPR-conform. Geen technische implementatie uitgewerkt.
5. **Beoordelingschecklist voor reviewers** — ondersteunend hulpmiddel bij de Europese productieverificatie (bedrijfsregistratie, productielocatie, fabrikant, merkhouder, bewijsstukken compleet, documenten logisch en consistent); de uiteindelijke beslissing blijft altijd handmatig.

**Bewust niet verwerkt** (expliciet verzoek): Distributeur-rol verwijderen/samenvoegen, meerdere productielocaties, Partner Lifecycle Management, ERP/PIM-koppeling binnen onboarding, verzendinstellingen binnen onboarding — blijven buiten de MVP-scope.

**Nog altijd openstaand, blokkeert bevriezing niet:** rol toevoegen aan een reeds actief Partneraccount (bijv. een Retailer die later ook Producent wil worden) — een latere, verkorte iteratie.

## Component-uitkomst

**Geen nieuwe componenten** door deze verbeterronde. CMP-041 (File Upload) kreeg een mobiele cameravariant (gedocumenteerde uitbreiding, geen nieuw component). Eerder al vastgelegd: CMP-041 zelf (nieuw bij de eerste oplevering) en de meervoudige-selectie-variant van CMP-026.

## Relatie met andere mappen

- Wireframes: [`02-ux/wireframes/sprint-1b/`](../../02-ux/wireframes/sprint-1b/README.md) — bestanden `04-partner-onboarding-desktop.html`, `-tablet.html`, `-mobile.html` (v1.1).
- Kent de Retailer/Producent/Distributeur-rol toe die al gedefinieerd stond in [`authenticatie/`](../authenticatie/README.md) (RBAC, sectie 1.10) — nu ook met een expliciete, wederzijdse verwijzing over de e-mailverificatie-eis (sectie 1.4 resp. 1.8).
- Producent/Merkhouder-rechten zijn al vastgelegd in [`product-cloud-commerce-cloud-buy-box/`](../product-cloud-commerce-cloud-buy-box/README.md) — dit document kent de rol uitsluitend toe, herdefinieert de rechten niet.
- Voorbereidend op het Retailer/Producent Dashboard en het Admin-skelet (Partnerbeheer, scherm #55) — beide nog niet gebouwd.
