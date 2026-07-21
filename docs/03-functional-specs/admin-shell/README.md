# Admin Shell & Dashboard Framework (Sprint 1C)

**Status:** v1.1 — **definitief bevroren**, na een onafhankelijke generieke platformreview (vijf bevindingen verwerkt: B-G1 t/m B-G5). Derde onderdeel van Sprint 1C, bouwt uitsluitend voort op de definitief bevroren Product Cloud Architecture (v1.1) en Product Management (v1.1).

## Inhoud

- [`spec.md`](./spec.md) — volledige functionele specificatie, inclusief het **generieke module-registratiecontract (sectie 1.9)** dat de Shell aantoonbaar module-onafhankelijk maakt: navigatiestructuur, Dashboard Framework (contract-gebaseerde widgets/KPI's/taken/notificaties), contract-gebaseerd rechtenmodel, generieke dashboardcomponenten, layout-richtlijnen, UX-flow op hoofdlijnen, API-koppeling uitsluitend via het contract, datamodel-toets, architectuurcontrole en zelfreview.

## Onafhankelijke generieke platformreview — verwerkt

Vijf bevindingen verwerkt vóór bevriezing:
- **B-G1** — een generiek module-registratiecontract toegevoegd (sectie 1.9): elke module levert uitsluitend naam/route/icoon/permissie/navigatiepositie/widgets/KPI's/notificatietypen/taken/deep links — geen database-entiteit, uitsluitend een beschrijvend interfaceformaat.
- **B-G2** — het rechtenmodel is herzien van een hardgecodeerde, modulegebaseerde tabel naar één generiek, contract-gebaseerd filterprincipe (sectie 4.2).
- **B-G3** — expliciet vastgelegd dat de Shell uitsluitend het module-contract aanspreekt, nooit rechtstreeks een achterliggende business-API (sectie 8, herzien).
- **B-G4** — expliciet vastgelegd dat modules kant-en-klare taken aanleveren; de Shell interpreteert nooit businessdata (sectie 2.4, herzien).
- **B-G5** — het widgetcontract volledig herschreven zonder enig Product-specifiek voorbeeld (sectie 2.2, herzien); KPI's worden nooit door de Shell berekend (sectie 2.3, expliciet).

## Belangrijkste vaststellingen

- **Aantoonbaar module-onafhankelijk** — het registratiecontract is de enige interactie tussen Shell en elke module; een geheel onvoorziene, toekomstige module hoeft dit document nooit te laten wijzigen, uitsluitend het contract te vervullen.
- **Geen nieuwe rollen.** "Moderator" en "Verificatie-reviewer" blijven weergavepersona's binnen de bestaande Beheerder-rol — ongewijzigd na de contract-gebaseerde herziening van het rechtenmodel.
- **Geen nieuwe API's, geen nieuwe database-entiteiten** — het contract zelf is uitsluitend een interfaceformaat, geen opslaglaag.
- **Geen dubbele functionaliteit** — wachtrijen, CRUD, versiebeheer en moderatie-/verificatielogica blijven volledig in Product Management; de Shell toont uitsluitend samenvattingen via het contract.

## Relatie met andere mappen

- Bouwt uitsluitend voort op [`product-cloud-architecture/`](../product-cloud-architecture/README.md) en [`product-management/`](../product-management/README.md) (beide bevroren, v1.1) — geen enkele regel daaruit gewijzigd.
- Hergebruikt API-namen uit [`marketplace-core/`](../marketplace-core/README.md) (bevroren) — uitsluitend via de module-implementaties, nooit rechtstreeks vanuit de Shell.
- Hergebruikt toegangsvoorwaarden en RBAC uit [`authenticatie/`](../authenticatie/README.md) (bevroren) — introduceert geen nieuwe rol.
- Vult het "Dashboard Template" in dat de UX-architectuur al benoemde maar nooit had ingevuld.
- Voorbereidend op de wireframe-uitwerking van de Admin Shell zelf, en op toekomstige modules (Moderation, Verification als zelfstandige uitbreidingen, Partnerbeheer #55, Categorie-/filterbeheer #61) die allemaal via het registratiecontract binnen deze schil komen te draaien.
