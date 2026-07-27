# Wireframes

**Status:** Sprint 1A/1B/1C definitief afgerond (zie respectievelijke submappen). **Sprint 3 P0-wireframes toegevoegd** (`sprint-3-p0/`) — de tien wireframe-groepen die volgens de MVP UX Readiness Audit absoluut noodzakelijk waren vóór Sprint 3-implementatie (Buyer Dashboard, Seller Dashboard, Productbeheer, Affiliate, Finance, Admin Dashboard, Partnerbeheer, Moderatiewachtrij, Cookie Consent, AVG-verzoeken).

## Inhoud

- [`wireframe-strategie.md`](./wireframe-strategie.md) — MVP-prioritering (Sprint 1/2/3/Post-MVP, met motivatie per scherm), component-inventory, paginatemplates, wireframe-ontwerpvolgorde en de eerst te ontwerpen design system-componenten.
- [`sprint-1a/`](./sprint-1a/) — Homepage, Productpagina + Buy Box, Checkout, Marketplace Listing (definitief, v1.0-v1.3).
- [`sprint-1b/`](./sprint-1b/) — Winkelwagen, Orderbevestiging, Authenticatie-flow, Partner Onboarding (definitief).
- [`sprint-1c/`](./sprint-1c/) — Verification Center, zes schermen (definitief).
- [`sprint-3-p0/`](./sprint-3-p0/) — 32 nieuwe schermen (96 HTML-bestanden, desktop/tablet/mobiel), zie hieronder.

## Sprint 3 P0 — nieuwe wireframegroepen (`sprint-3-p0/`)

Gebouwd volledig op de bestaande componentenbibliotheek (kleurtokens, spacing, componentklassen van Verification Center) — geen nieuwe visuele taal, uitsluitend nieuwe schermsamenstellingen. Nieuw voorgestelde, generieke patronen: **Dashboard-shell met sidebar-navigatie** (Buyer/Seller/Affiliate/Finance — analoog aan het Admin Shell-modulecontract), **Cookie-consent-banner/voorkeurenpaneel**, **AVG-verzoektype-kaart**, **Bulk-actiebalk** (Moderatiewachtrij).

| Groep | Schermen | Bestandsprefix |
|---|---|---|
| Buyer Dashboard | Dashboard Home, Mijn Bestellingen (#11) | `buyer-` |
| Seller Dashboard | Dashboard Shell, Dashboard Home (#30) | `seller-` |
| Productbeheer | EAN-zoeken (#32), Match gevonden, Geen match, Nieuw product (#34), Productdetail commercieel (#35) | `product-` |
| Affiliate | Registratie (#65), Dashboard Home (#66), Statistieken, Commissies, Referral Links | `affiliate-` |
| Finance Dashboard | Dashboard, Commissie-overzicht, Uitbetalingen (#50), Facturen, BTW-overzicht | `finance-` |
| Admin Dashboard | Dashboard Home incl. hoofdnavigatie/KPI's (#54) | `admin-` |
| Partnerbeheer | Overzicht (#55), Detail, Goedkeuren, Afwijzen, Blokkeren | `partner-` |
| Moderatiewachtrij | Overzicht incl. bulk-acties (#57), Detail incl. AI-advies, Besluit | `moderatie-` |
| Cookie Consent | Eerste bezoek, Voorkeuren beheren (#21) | `cookie-` |
| AVG-verzoeken | Verzoek indienen, Verzoekstatus | `avg-` |

## Structuur (bevestigd in de wireframe-strategie, sectie 3: vijf paginatemplates)

```
wireframes/
├── README.md
├── wireframe-strategie.md
├── public/                    ← Marketplace Template, Focused Flow Template, Account Shell Template, Utility Template
├── partner/                   ← Dashboard Template (Retailer/Producent/Distributeur)
├── admin/                     ← Dashboard Template (Administrator)
└── shared-components/         ← herbruikbare UI-bouwstenen (Buy Box, Offer Card, statusbadges, filters)
```

## Volgorde (uit de wireframe-strategie, sectie 4)

Design System-fundamenten → Homepage → Zoeken → Categorie → Productpagina (Buy Box) → Winkelwagen/Checkout → Inloggen/Registreren → Klant-accountgebied → Retailer Dashboard → Producent-flows → Order-/advertentiebeheer Partner → Administrator → Content-/Utility-pagina's.

