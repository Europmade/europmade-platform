# Verification Center (Sprint 1C)

**Status:** v1.1 — **definitief bevroren**, na een onafhankelijke functionele review (twee bevindingen verwerkt: V1, V2). Vijfde onderdeel van Sprint 1C, bouwt uitsluitend voort op de definitief bevroren Product Cloud Architecture (v1.1), Product Management (v1.1), Admin Shell & Dashboard Framework (v1.1) en Moderation Center (v1.1).

## Inhoud

- [`spec.md`](./spec.md) — volledige functionele specificatie: doel/scope, verificatieworkflow, twee wachtrijtypen (nieuwe aanvragen, periodieke hercontrole/intrekking), detailweergave, beschikbare acties, beslisregels, auditregistratie, rechten/zichtbaarheid, Admin Shell-registratiecontract, API-gebruik, datamodel-toets, architectuurcontrole en zelfreview.

## Onafhankelijke functionele review — verwerkt

Twee bevindingen verwerkt vóór bevriezing:
- **V1** — foutieve verwijzing gecorrigeerd: "Product Cloud Architecture §4" bestaat niet als rechtenmatrix; de daadwerkelijke bron is `product-cloud-commerce-cloud-buy-box/spec.md` §4.
- **V2** — ambiguïteit opgelost tussen automatische intrekkingstriggers (rollback, merge — Deel 8.6/5.3, bereiken de wachtrij nooit) en de vier triggers die wél een Beheerder-beoordeling vereisen (mislukte hercontrole, fraudedetectie, verlopen document, geëscaleerd geschil — Deel 7.6). Consistent doorgevoerd in de wachtrijtabel, de actietabel en de beslisregel zelf.

V3, V4 en V5 zijn op uitdrukkelijk verzoek niet verwerkt.

## Belangrijkste vaststellingen

- **Het aangekondigde vervolg op Moderation Center** — nu ook zelf definitief bevroren, met dezelfde kwaliteitsstandaard.
- **Geen nieuwe architectuur, geen nieuwe entiteiten, geen nieuwe API's** — ook na de reviewverwerking; de V2-correctie verduidelijkt uitsluitend een al bestaand onderscheid, voegt niets nieuws toe.
- **Twee wachtrijtypen**, nu met een precies afgebakende grens tussen wat wél en nooit in de wachtrij van dit document verschijnt.
- **Harde, wederzijdse scope-grens met Moderation Center en Product Management**, op proces-, beslisregel- en API-niveau.
- **Uitsluitend de Beheerder-rol**, in de al bevroren Verificatie-reviewer-persona.

## Relatie met andere mappen

- Bouwt uitsluitend voort op [`product-cloud-architecture/`](../product-cloud-architecture/README.md), [`product-management/`](../product-management/README.md), [`admin-shell/`](../admin-shell/README.md) en [`moderation-center/`](../moderation-center/README.md) (alle vier bevroren, v1.1) — geen enkele regel daaruit gewijzigd.
- Hergebruikt de rechtenmatrix uit [`product-cloud-commerce-cloud-buy-box/`](../product-cloud-commerce-cloud-buy-box/README.md) (bevroren) — correct toegeschreven na de reviewcorrectie.
- Hergebruikt API-namen uit [`marketplace-core/`](../marketplace-core/README.md) (bevroren).
- Hergebruikt het reviewer-checklist-patroon uit [`partner-onboarding/`](../partner-onboarding/README.md) (bevroren).
- Geregistreerd als tweede concrete module via het Admin Shell-contract, naar het precedent van Moderation Center.
