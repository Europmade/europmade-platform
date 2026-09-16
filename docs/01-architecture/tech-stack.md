# Technische architectuur — MVP

**Status:** Definitief

## Stack

| Laag | Keuze |
|---|---|
| Frontend | Next.js |
| Marketplace backend | Medusa |
| Database | PostgreSQL |
| Hosting | TransIP (Nederland) |
| Datacenters | Nederland / EU |
| Architectuurstijl | API-first |
| Ontwerpuitgangspunt | Mobile First |
| Ondersteunde schermformaten | Responsive: Desktop / Tablet / Mobiel |

## Waarom deze keuze aansluit op de Blueprint

- **TransIP + NL/EU-datacenters** sluiten direct aan op **European Data Sovereignty** (Blueprint H13.4): bedrijfs- en klantgegevens blijven binnen de EU, onder Europese wetgeving.
- **API-first** is expliciet een architectuurprincipe uit de Blueprint zelf (H15.2), en Medusa is native API-first opgebouwd — geen extra laag nodig om hieraan te voldoen.
- **Mobile First** volgt direct uit H10.11 van de Blueprint ("meer dan de helft van de bezoekers zal EuropMade via een mobiel apparaat bezoeken").
- **Medusa's Region-model** (valuta, belasting, verzending per land) is een directe technische match voor de MVP-lancering in 6 landen tegelijk (H14.10).

## Ontwerpprincipe

> **"Standard where possible, custom where it creates competitive advantage."**

Zie [`standard-vs-custom.md`](./standard-vs-custom.md) voor de volledige toepassing van dit principe per domein.

## Repository (as-built)

Actuele monorepo (`pnpm-workspace.yaml`: `apps/*`, `packages/*`). Volledige status: [`docs/11-blueprint-v2/README.md`](../11-blueprint-v2/README.md).

```
apps/
├── web/        ← Next.js: storefront, seller portal, affiliate, account, onboarding
├── admin/      ← Next.js: EuropMade Admin Control Center
└── backend/    ← Medusa v2 + custom modules (Product Cloud, Commerce Cloud, orders, finance, …)
packages/
├── types/      ← gedeelde TypeScript-types
├── ui/         ← gedeelde UI-componenten
└── utils/      ← gedeelde utilities
```
