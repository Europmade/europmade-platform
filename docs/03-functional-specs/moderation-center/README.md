# Moderation Center (Sprint 1C)

**Status:** v1.1 — **definitief bevroren**, na een onafhankelijke functionele review (zes bevindingen verwerkt: F1, F2, F3, F4, F5, F6; F7/F8 bewust niet verwerkt). Vierde onderdeel van Sprint 1C, bouwt uitsluitend voort op de definitief bevroren Product Cloud Architecture (v1.1), Product Management (v1.1) en Admin Shell & Dashboard Framework (v1.1).

## Inhoud

- [`spec.md`](./spec.md) — volledige functionele specificatie: doel/scope, moderatieproces, **zeven** wachtrijtypen (claims, **eigendomsoverdracht Route B — nieuw**, matching-kandidaten, geschillen, fraude-signalen, meldingen, hoog-risico publicatiewijzigingen), generieke detailweergave, itemtype-specifieke acties, beslisregels, auditregistratie (incl. "Geen actie"), rechten/zichtbaarheid, API-gebruik, architectuurcontrole en zelfreview.

## Onafhankelijke functionele review — verwerkt

Zes bevindingen verwerkt vóór bevriezing:
- **F1** — een ontbrekende, in de architectuur expliciet altijd-verplichte wachtrij toegevoegd: eigendomsoverdracht tussen twee reeds geverifieerde eigenaren (Route B, Deel 4.3) — geen nieuwe entiteit/API, hergebruikt het bestaande OwnershipRecord en de Claim-/eigenaarschap-API.
- **F2** — de claimactie "Aanvullende informatie vereist" verwijderd: bij controle bleek deze in Deel 4.4 uitsluitend analoog genoemd, nooit formeel als claimstatus vastgelegd (uitsluitend voor Verificatie, Deel 7.3).
- **F3** — rekenfout gecorrigeerd: "vijf wachtrijtypen" → correct zeven (na F1).
- **F4** — foutieve verwijzing naar een niet-bestaande "Admin Shell §12.2" gecorrigeerd.
- **F5** — foutieve verwijzing naar een niet-bestaande "Product Management §2.8A" gecorrigeerd naar de daadwerkelijke bron (Partner Onboarding sectie 2.8A).
- **F6** — expliciet vastgelegd dat ook "Geen actie" een auditeerbare beslissing is, nooit een spoorloos vertrek uit de wachtrij.

**Tijdens de verplichte interne verwijzingscontrole is daarnaast een extra, niet eerder benoemde citatiefout gevonden en gecorrigeerd:** drie verwijzingen naar "Product Management §8.4" bleken feitelijk Product Cloud Architecture Deel 8.4 te betreffen.

## Belangrijkste vaststellingen

- **Geen nieuwe architectuur, geen nieuwe entiteiten, geen nieuwe API's** — ook na de reviewverwerking; de nieuwe Route B-wachtrij hergebruikt uitsluitend al bestaande, bevroren bouwstenen.
- **Verification Workflow blijft expliciet buiten scope.**
- **Uitsluitend de Beheerder-rol** heeft toegang.

## Relatie met andere mappen

- Bouwt uitsluitend voort op [`product-cloud-architecture/`](../product-cloud-architecture/README.md), [`product-management/`](../product-management/README.md) en [`admin-shell/`](../admin-shell/README.md) (alle drie bevroren, v1.1) — geen enkele regel daaruit gewijzigd.
- Hergebruikt API-namen uit [`marketplace-core/`](../marketplace-core/README.md) (bevroren).
- Hergebruikt het "Aanvullende informatie vereist"-precedent correct toegeschreven aan [`partner-onboarding/`](../partner-onboarding/README.md) (bevroren).
- Registreert zich als eerste concrete module via het Admin Shell-contract.
- Voorbereidend op het toekomstige, analoge "Verification Center."
