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

## Repository-indicatie (toekomstig, nog niet aanwezig)

Zodra de ontwikkeling start, wordt de volgende globale indeling verwacht (niet onderdeel van deze documentatiefase, ter oriëntatie opgenomen):

```
apps/
├── storefront/     ← Next.js, publieke marketplace (klant/bezoeker)
├── partner/        ← Next.js, Partnerdashboard (retailer/producent) — los van Medusa Admin
└── backend/         ← Medusa, inclusief custom modules (Offer, Product Cloud-uitbreidingen, Buy Box-engine)
packages/
├── types/           ← gedeelde TypeScript-types (o.a. Product Cloud/Commerce Cloud-datamodel)
├── ui/               ← gedeelde UI-componenten tussen storefront en partnerdashboard
└── config/           ← gedeelde configuratie (linting, tsconfig, etc.)
```
