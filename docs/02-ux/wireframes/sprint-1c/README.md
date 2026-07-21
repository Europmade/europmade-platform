# Sprint 1C — Wireframes (Verification Center)

**Status: HTML-wireframes, developer-ready, gebaseerd op de definitief bevroren functionele specificatie van het Verification Center (v1.1).**

## Bestanden

| Bestand | Inhoud |
|---|---|
| `01-verification-dashboard-desktop.html` / `-tablet.html` / `-mobile.html` | Verification Dashboard — KPI-vakken (openstaande aanvragen/hercontroles), twee wachtrij-samenvattingskaarten, takenlijst. Geen individueel item, geen berekening door dit scherm. |
| `02-verification-queue-desktop.html` / `-tablet.html` / `-mobile.html` | Verification Queue — twee tabbladen (Nieuwe aanvragen / Periodieke hercontrole & intrekking), zoek-/filterbalk, tabel (mobiel: gestapelde kaarten), paginering, plus een lege-staat-variant. |
| `03-verification-detail-desktop.html` / `-tablet.html` / `-mobile.html` | Verification Detail — context, bedrijfsverificatie-status, bewijsstukken (CMP-041), reviewer-checklist, AI-context, historielink, actiebalk. Twee varianten: nieuwe aanvraag (drie acties) en periodieke hercontrole (twee acties, geen "Aanvullende informatie vragen"). |
| `04-request-additional-information-desktop.html` / `-tablet.html` / `-mobile.html` | Request Additional Information — verplicht, specifiek verzoekveld, toelichting op het vervolgproces, plus een foutstaat-variant. |
| `05-verification-history-desktop.html` / `-tablet.html` / `-mobile.html` | Verification History — alleen-lezen audit-tijdlijn (wie/wanneer/wat/reden), plus een lege-staat-variant. |
| `06-verification-result-desktop.html` / `-tablet.html` / `-mobile.html` | Verification Result — vier bevestigingsvarianten: Geverifieerd, Afgewezen, Ingetrokken, Aanvullende informatie gevraagd (geen definitieve uitkomst). |

Volledige functionele specificatie: [`03-functional-specs/verification-center/spec.md`](../../../03-functional-specs/verification-center/README.md) (bevroren, v1.1).

## Ontwerpprincipes

- **Desktop-first, alle drie breakpoints uitgewerkt** — desktop, tablet, mobiel, zelfde aanpak als Sprint 1A/1B: één zelfstandig HTML-bestand per breakpoint, meerdere schermstaten per bestand als losse `.page`/`.device`-blokken met een `.section-label`-kop.
- **Consistent met het bestaande EuropMade Design System** — uitsluitend al bevroren componenten (CMP-003 Breadcrumb, CMP-005 Button, CMP-006 Form Field, CMP-007 Checkbox, CMP-008 Badge, CMP-009 Tabs, CMP-010 Table, CMP-011 Notice, CMP-018 Verified™ Badge, CMP-035 Pagination, CMP-036 Empty State, CMP-041 File Upload) plus de in Admin Shell §5 *voorgestelde* (nog niet formeel geregistreerde) generieke dashboardcomponenten (KPI-vak, Wachtrij-samenvatting-kaart, Takenlijst-item). **Geen enkel nieuw component toegevoegd of geregistreerd.**
- **Zakelijke B2B-interface** — dichte, tabelgedreven layouts (Verification Queue, History), functie boven vorm, geen marketing- of verkooptaal.
- **Admin Shell-header als generieke assemblage** — er bestaat nog geen eigen Admin Shell-wireframe; de header in deze bestanden (`logo + modulenaam + zoekbalk + notificatie-icoon + avatar`) is opgebouwd uit uitsluitend bestaande primitieven, consistent met het al bevroren Admin Shell-registratiecontract (§1.9) — geen nieuw component, geen vooruitgrijpen op de Admin Shell-wireframe zelf.
- **Compact en overzichtelijk** — maximale informatiedichtheid, geen overbodige witruimte of tekst.
- **Mobiele tabelweergave:** de tabel in Verification Queue wordt op mobiel weergegeven als gestapelde kaarten (zelfde onderliggende data als CMP-010, responsief patroon — geen nieuw component).

## Rolcontext

Alle zes schermen zijn uitsluitend toegankelijk voor de **Beheerder-rol**, in de al bevroren **Verificatie-reviewer-weergavepersona** (Admin Shell §4.1) — geen nieuwe rol, geen rechtenwijziging. Geen enkele andere rol (Producent, Retailer, Distributeur, Consument) heeft toegang tot deze schermen.

## Component-hergebruik (geen nieuwe componenten)

| Component | Herkomst | Gebruikt in |
|---|---|---|
| CMP-003 Breadcrumb | Sprint 1A | Alle zes schermen |
| CMP-005 Button | Sprint 1A | Alle zes schermen |
| CMP-006 Form Field | Sprint 1A | 04 (toelichtingsveld) |
| CMP-007 Checkbox | Sprint 1A/1B | 03 (reviewer-checklist) |
| CMP-008 Badge | Sprint 1A | 01, 02, 03, 06 (statuslabels) |
| CMP-009 Tabs | Sprint 1A (foundation) | 02 |
| CMP-010 Table | Sprint 1A (foundation) | 02 (desktop/tablet), 05 |
| CMP-011 Notice | Sprint 1A | 03, 04, 06 |
| CMP-018 Verified™ Badge | Sprint 1A | 06 (context) |
| CMP-035 Pagination | Sprint 1A (foundation) | 02 |
| CMP-036 Empty State | Sprint 1A (foundation) | 02, 05 |
| CMP-041 File Upload | Sprint 1B | 03 (bewijsstukken, weergavemodus) |
| KPI-vak, Wachtrij-samenvatting-kaart, Takenlijst-item *(voorgesteld, Admin Shell §5, nog niet formeel geregistreerd)* | Sprint 1C | 01 |

## Relatie met andere mappen

- Bouwt uitsluitend voort op [`03-functional-specs/verification-center/`](../../../03-functional-specs/verification-center/README.md) (bevroren, v1.1) en [`03-functional-specs/admin-shell/`](../../../03-functional-specs/admin-shell/README.md) (bevroren, v1.1) — geen enkele regel daaruit gewijzigd.
- Wijzigt niets aan `07-design-system/components.md` — formele CMP-registratie van de Admin Shell-voorgestelde generieke componenten volgt in een latere stap, wanneer de Admin Shell zelf wireframe-niveau bereikt.
- Wijzigt niets aan Sprint 1A- of Sprint 1B-wireframes.
