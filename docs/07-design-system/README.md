# 07 — Design System

Het EuropMade design system: alle visuele bouwstenen (kleuren, typografie, spacing, iconen, componenten) die voortkomen uit de wireframes en later 1-op-1 worden vertaald naar herbruikbare code in `packages/ui`.

**Status: v1.0 (structureel, grijswaarden) is definitief.** `components.md` en `spacing.md` zijn volledig ingevuld en bevestigd op basis van alle bevroren Sprint 1A- én Sprint 1B-wireframes (Productpagina/Buy Box, Checkout, Homepage, Zoekresultaten, Categoriepagina, Winkelwagen, Orderbevestiging, Authenticatie-flow incl. 2FA, Partner Onboarding). `colors.md`, `typography.md` en `icons.md` blijven bewust placeholder — merk-/kleurkeuzes zijn een aparte, latere fase (zoals eerder vastgesteld), geen onderdeel van Design System v1.0.

## Inhoud

- [`colors.md`](./colors.md) — kleurenpalet, incl. status-/betekeniskleuren (bijv. Verified™-badge, Buy Box-winnaar, waarschuwingen in het Compliance Dashboard). **Placeholder.**
- [`typography.md`](./typography.md) — lettertypen, tekstgroottes en -gewichten, gebruik per contexttype (publiek vs. dashboard). **Placeholder.**
- [`spacing.md`](./spacing.md) — spacing- en gridsysteem, responsive-breakpoints. **Bevestigd (v1.0).**
- [`icons.md`](./icons.md) — iconenset en gebruiksregels. **Placeholder** (wireframes gebruiken vooralsnog tekst-/unicode-placeholders, geen formele iconenbibliotheek gekozen).
- [`components.md`](./components.md) — volledige inventarisatie van alle componenten uit Sprint 1A en Sprint 1B: doel, varianten, staten, interacties, responsive gedrag, toegankelijkheid, Medusa-vs-maatwerk, afhankelijkheden, plus een formele naamgevings-/consistentiecontrole, het formele Componentvarianten-register (sectie 3A) en het Component ID-register (**CMP-001–CMP-041**). **Definitief (v1.0).**
- [`coverage-matrix.md`](./coverage-matrix.md) — architectuurcontrole: dekking van alle 41 componenten over Homepage/Zoekresultaten/Categoriepagina/Productpagina/Checkout/Winkelwagen/Orderbevestiging/Authenticatie/Partner Onboarding/Dashboards, met expliciet benoemde lacunes voor de nog te bouwen Dashboards (Sprint 1C/2/3). **Definitief**, doorlopend bijgewerkt bij elk nieuw scherm, laatste update na Partner Onboarding.

## Vastleggingsregel

Een component wordt pas in `components.md` als "bevestigd" gemarkeerd nadat hij in minimaal één daadwerkelijk gebouwd wireframe is toegepast — niet op basis van een geïsoleerd voorbeeld in de Foundation. Componenten die alleen in de Foundation voorkomen (Modal, Pagination, Alert/Toast, Radio) blijven daarom buiten `components.md` totdat een scherm ze daadwerkelijk gebruikt.

## Relatie met andere mappen

- Volgt uit [`02-ux/wireframes/`](../02-ux/wireframes/README.md): elk hier vastgelegd component moet terug te herleiden zijn naar minimaal één wireframe (Productpagina of Checkout).
- Wordt in de ontwikkelfase de basis voor `packages/ui` (zie [`01-architecture/tech-stack.md`](../01-architecture/tech-stack.md)) — gedeeld tussen `apps/storefront` en `apps/partner`.
- Kleur-/typografiekeuzes die een status of betekenis dragen (bijv. Verified™, productstatus-levenscyclus uit `03-functional-specs/product-cloud-commerce-cloud-buy-box/spec.md`) moeten consistent zijn met de betekenis zoals daar functioneel vastgelegd — dit document past de logica niet aan, het geeft er uitsluitend een visuele vorm aan.
- Canonieke component-namen uit `components.md` sectie 4.1 zijn bindend voor Homepage, Zoekresultaten, Categoriepagina en alle latere schermen.
