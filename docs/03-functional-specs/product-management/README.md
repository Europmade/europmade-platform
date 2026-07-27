# Product Management (Sprint 1C)

**Status:** v1.1 — **definitief bevroren**, na een onafhankelijke functionele review (zeven bevindingen verwerkt: B-PM1, B-PM2, B-PM3, B-PM4, B-PM6, B-PM7, B-PM8). Tweede onderdeel van Sprint 1C, bouwt uitsluitend voort op de bevroren Product Cloud Architecture.

## Inhoud

- [`spec.md`](./spec.md) — volledige functionele specificatie: domeinprocessen, CRUD-flow, **productlevenscyclusstatus-beheerproces (nieuw, sectie 3A)**, Product Version Management (incl. conflictregels), Moderation Workflow, Verification Workflow, audit-/historyweergave, zoek-/filter-/bulkacties (incl. partial-failure-afhandeling), rollen en rechten, API-overzicht, minimale datamodel-uitbreiding, UX-flow op hoofdlijnen (nog geen wireframes), architectuurcontrole en zelfreview.

## Onafhankelijke functionele review — verwerkt

Zeven bevindingen verwerkt vóór bevriezing — waaronder twee kritieke: het volledig ontbrekende beheerproces voor de productlevenscyclusstatus (B-PM1, nu sectie 3A) en het daarvan afhankelijke, ongeldige bulkactie-voorbeeld (B-PM2). Daarnaast: de conflictregel tussen een actief Concept en een binnenkomend wijzigingsvoorstel (B-PM3), de intrekkingsregel voor een lopende Verificatie-aanvraag bij een nieuwe publicatie/rollback (B-PM4), een lokaal eindpunt voor geëscaleerde fraude-signalen (B-PM6), zichtbaarheid van de eigen voorstel-uitkomst voor een indienende Retailer/Distributeur (B-PM7), en partial-failure-afhandeling voor bulkacties (B-PM8). B-PM5 en B-PM9 t/m B-PM12 zijn op uitdrukkelijk verzoek niet verwerkt.

## Belangrijkste vaststellingen

- **Zuivere operationele laag** — ook ná de reviewverwerking geen nieuwe architecturale concepten; alle toegevoegde processen (levenscyclus-beheer, conflictregels) zijn uitsluitend operationele toepassingen van al bevroren, ongewijzigde statuswaarden en regels.
- **CRUD werkt op ProductVersion-niveau**, niet direct op Product — consistent met de bevroren drie-assen-statusarchitectuur.
- **Bulkacties mogen nooit meer bevoegdheid geven dan de individuele actie al toestaat** — expliciet en herhaald vastgelegd, nu met een concreet, correct voorbeeld.
- **Alle API-functies zijn ondergebracht bij de al in Marketplace Core benoemde services** — geen nieuwe, losse dienst geïntroduceerd.
- Twee doelgroepen (Producent: eigen catalogus; Beheerder: platformbreed + moderatie/verificatie-eindbeslissingen), rechten volledig hergebruikt uit de al bevroren rechtenmatrix.

## Relatie met andere mappen

- Bouwt uitsluitend voort op [`product-cloud-architecture/`](../product-cloud-architecture/README.md) (bevroren) — geen enkele architecturale regel daaruit gewijzigd.
- Hergebruikt API-namen uit [`marketplace-core/`](../marketplace-core/README.md) (bevroren).
- Hergebruikt toegangsvoorwaarden (Partner Onboarding-goedkeuring, verplichte 2FA) uit [`authenticatie/`](../authenticatie/README.md) (bevroren).
- Hergebruikt het reviewer-checklist-patroon uit [`partner-onboarding/`](../partner-onboarding/README.md) (bevroren) voor de Verification Workflow.
- Voorbereidend op de wireframe-uitwerking (volgende Sprint 1C-stap) en het Admin-skelet (Partnerbeheer, scherm #55).
