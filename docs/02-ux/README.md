# 02 — UX

De volledige UX-architectuur van EuropMade, de wireframes, en de doorlopende Customer Journey-validatie.

## Inhoud

- [`ux-architecture.md`](./ux-architecture.md) — Stap 4 van de EuropMade Blueprint-uitwerking: gebruikersrollen, user flows per rol, sitemap, navigatiestructuur (desktop/tablet/mobiel), scherminventarisatie (MVP, Must/Should/Could Have) en een senior UX-review met verbetervoorstellen.
- [`wireframes/`](./wireframes/README.md) — wireframes per scherm, gegroepeerd per sprint. **Sprint 1A: definitief afgerond** (Design System Foundation, Productpagina + Buy Box, Checkout, Homepage, Zoekresultaten, Categoriepagina). **Sprint 1B: definitief afgerond** (Winkelwagen, Orderbevestiging, Authenticatie-flow incl. 2FA, Partner Onboarding).
- [`customer-journey-audit.md`](./customer-journey-audit.md) — architectuurvalidatie van de volledige MVP-klantreis (Homepage → Zoeken → Categorie → Productpagina → Checkout → Orderbevestiging), uitgevoerd na afronding van Sprint 1A's eerste drie bevroren schermen. Bevestigt dat Sprint 1A architectonisch gevalideerd is, met drie kleine, aantoonbaar noodzakelijke correcties (prijslabeling Product Card, minimumvereisten Orderbevestiging, technische SEO-eis Checkout) — de Orderbevestiging-correctie is later, in Sprint 1B, volledig uitgewerkt.

## Status

Definitief (`ux-architecture.md`). De tien UX-voorstellen uit de UX-review zijn geaccordeerd; zie [ADR-overzicht](../04-decisions/README.md) voor beslissingen die formeel als ADR zijn vastgelegd (dit betreft met name de Buy Box/Verified™-gerelateerde beslissingen, die zijn ondergebracht in de functionele specificatie en de bijbehorende ADR's). Customer Journey Audit definitief. **Sprint 1A en Sprint 1B beide architectonisch gevalideerd en definitief afgesloten** — zie `06-development/project-status-and-roadmap.md` voor de volledige eindrapportage.

## Relatie met andere mappen

- Bouwt voort op [`01-architecture/`](../01-architecture/README.md) (Next.js + Medusa, standaard-vs-maatwerk).
- Wordt voor de kernonderdelen verder verdiept in [`03-functional-specs/`](../03-functional-specs/README.md) — de scherminventarisatie in `ux-architecture.md` (sectie 5) verwijst naar die verdieping voor de exacte functionele logica.
- `customer-journey-audit.md` verwijst terug naar de bevroren Sprint 1A-schermen; de daar geïdentificeerde Orderbevestiging-tekortkoming is in Sprint 1B (`03-functional-specs/orderbevestiging/spec.md`) volledig verholpen.
- Sprint 1B (Winkelwagen, Orderbevestiging, Authenticatie-flow incl. 2FA, Partner Onboarding) is nu eveneens definitief bevroren — zie `wireframe-strategie.md` voor de volledige, chronologische toelichting per onderdeel.
