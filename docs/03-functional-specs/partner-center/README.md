# Partner Center (Sprint 1C)

**Status:** v1.1 — **definitief bevroren**, na een onafhankelijke functionele review (één bevinding verwerkt: P1). Zesde onderdeel van Sprint 1C, bouwt uitsluitend voort op de definitief bevroren Product Cloud Architecture (v1.1), Product Management (v1.1), Admin Shell & Dashboard Framework (v1.1), Moderation Center (v1.1) en Verification Center (v1.1).

## Inhoud

- [`spec.md`](./spec.md) — volledige functionele specificatie: doel/scope, partneroverzicht, partnerdetail, partnerstatussen, partneracties, beslisregels, auditregistratie, rechten/zichtbaarheid, Admin Shell-registratiecontract, API-gebruik, datamodel-toets, architectuurcontrole en zelfreview.

## Onafhankelijke functionele review — verwerkt

Eén bevinding verwerkt vóór bevriezing:
- **P1** — het voorbeeld bij de deep-link-beslisregel (sectie 6) sprak eerder ten onrechte het Admin Shell §4.1-principe tegen dat de Moderator-/Verificatie-reviewer-taakfocus geen rechtenbeperking is. Gecorrigeerd naar een voorbeeld dat consistent is met "een Beheerder heeft altijd de volledige Beheerder-bevoegdheid, ongeacht taakfocus."

P2, P3, P4 en P5 zijn op uitdrukkelijk verzoek niet verwerkt.

## Belangrijkste vaststellingen

- **Vult "Partnerbeheer, scherm #55" in** — het scherm dat in de roadmap en in Admin Shell herhaaldelijk als nog te bouwen werd genoemd.
- **Uitsluitend een leeslaag** — geen enkele muterende partneractie, bewust en drie keer eerder gemotiveerd (Partner Onboarding, Product Cloud Architecture, Moderation Center).
- **Geen nieuwe architectuur, geen nieuwe entiteiten, geen nieuwe API's.**
- **Elke partnerdetailweergave wordt zelf gelogd** — hergebruikt letterlijk de al bevroren audit-logging-eis uit Partner Onboarding.
- **Uitsluitend de Beheerder-rol** heeft toegang.

## Relatie met andere mappen

- Bouwt uitsluitend voort op [`product-cloud-architecture/`](../product-cloud-architecture/README.md), [`product-management/`](../product-management/README.md), [`admin-shell/`](../admin-shell/README.md), [`moderation-center/`](../moderation-center/README.md) en [`verification-center/`](../verification-center/README.md) (alle vijf bevroren, v1.1) — geen enkele regel daaruit gewijzigd.
- Hergebruikt het statusmodel, de rollen en de audit-logging-eis uit [`partner-onboarding/`](../partner-onboarding/README.md) (bevroren) letterlijk.
- Hergebruikt API-namen uit [`marketplace-core/`](../marketplace-core/README.md) (bevroren).
- Geregistreerd als derde concrete module via het Admin Shell-contract, naar het precedent van Moderation Center en Verification Center.
