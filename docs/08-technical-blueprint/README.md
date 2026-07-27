# 08 — Technical Blueprint

De **Technical Blueprint** is de opvolger van de losse architectuurnotities in `01-architecture/` — een doorlopend genummerde reeks (TB-01, TB-02, ...) bedoeld voor senior software engineers die de al ontworpen EuropMade-marketplace daadwerkelijk gaan bouwen. Elk hoofdstuk bouwt uitsluitend voort op de al bestaande EuropMade Blueprint V2.1 en de al bevroren product-/UX-/functionele documentatie — geen hoofdstuk introduceert nieuwe functionaliteit.

## Hoofdstukken

| Hoofdstuk | Titel | Status |
|---|---|---|
| [TB-01](./TB-01-System-Architecture.md) | System Architecture | Concept v0.2 |

## Sprint 2 — Technische documentenreeks

Voorheen opgeslagen in `docs/07-technical/` — die map is per besluit definitief verlaten; alle Sprint 2-documenten staan nu hier, in deze map:

| Document | Titel | Status |
|---|---|---|
| [01](./01-domain-model.md) | Domain Model | 35 domeinobjecten (v0.2, na de Affiliate-scopewijziging), Besluitstatus bijgehouden |
| [02](./02-database-model.md) | Database Model | 47 tabellen (v0.2) |
| [03](./03-api-model.md) | API Model | Services, resources, API-principes (v0.2: Affiliate-/Finance-service toegevoegd) |
| [04](./04-event-model.md) | Event Model | 43 events (v0.2) |
| [05](./05-service-architecture.md) | Service Architecture | 9 services (v0.2), bounded contexts |
| [06](./06-security-architecture.md) | Security Architecture | Trust boundaries, security-besluitstatus (v0.2: cookie-consent-aantekening) |
| [07](./07-deployment-architecture.md) | Deployment Architecture | Deployment-besluitstatus |
| [08](./08-integration-architecture.md) | Integration Architecture | Externe integraties, integratiebesluitstatus |
| [09](./09-adr-overview.md) | ADR Overview | 58 ADR-kandidaten (v0.2), geprioriteerd, 10 categorieën |
| [10](./10-technical-roadmap.md) | Technical Roadmap | MVP-fasering (v0.2), Sprint-3 Readiness Checklist |

**Affiliate-scopewijziging (v0.2):** na de definitieve projectbeslissing dat het Affiliate Platform onderdeel is van de MVP, zijn alle tien Sprint 2-documenten waar nodig bijgewerkt — nieuwe domeinobjecten, tabellen, resources, events, twee nieuwe services (Affiliate, Finance), en zeven nieuwe ADR-kandidaten (categorie J). Zie `docs/00-context/blueprint-reference.md` voor de volledige scopewijziging en `docs/03-functional-specs/affiliate-platform/` voor de functionele basis.

## Relatie met andere mappen

- Bouwt voort op [`01-architecture/`](../01-architecture/README.md) (tech-stack.md, standard-vs-custom.md) — vult dit aan, vervangt het niet.
- Vertaalt de al definitief bevroren functionele specificaties in [`03-functional-specs/`](../03-functional-specs/README.md) naar technische architectuur.
- Respecteert alle vastgestelde [ADR's](../04-decisions/README.md) (0001–0005) en de daarin vastgelegde uitbreidingen binnen `product-cloud-architecture/spec.md` Deel 11 (ADR-0006 t/m ADR-0013).
- Elk "Open punten"-onderwerp in TB-01 wordt het onderwerp van een volgend Technical Blueprint-hoofdstuk.
