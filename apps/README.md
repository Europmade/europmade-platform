# apps/

Bevat de applicaties waarop de EuropMade-marketplace wordt gebouwd:

- `web/` — Next.js 15, publieke frontend. Huidige stand: uitsluitend een homepage-placeholder (logo, titel, introductietekst) — de marketplace-functionaliteit (Product Cloud, Commerce Cloud/Buy Box, Winkelwagen, Checkout, e.a.) wordt hier verder opgebouwd volgens de bevroren specificaties in `../docs/03-functional-specs/`.
- `admin/` — Next.js 15, Admin Shell. Huidige stand: uitsluitend een lege dashboardpagina, Auth.js-basisconfiguratie (geen actieve provider, geen inlogpagina) — de beheermodules (Product Management, Moderation Center, Verification Center, Partner Center, Order Management Center) worden hier verder opgebouwd volgens `../docs/03-functional-specs/admin-shell/`.

Beide apps hergebruiken uitsluitend `packages/ui`, `packages/utils`, `packages/types` en `packages/config` — geen eigen, losstaande configuratie waar een gedeeld package volstaat.

Er is nog geen Medusa-backend toegevoegd. Zie `../docs/01-architecture/tech-stack.md` voor de volledige technische context, `../docs/08-technical-blueprint/` voor de Technical Blueprint, en `../README.md` (sectie "Development") voor hoe je dit lokaal opstart.
