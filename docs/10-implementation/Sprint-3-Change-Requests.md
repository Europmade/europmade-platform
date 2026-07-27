# Sprint 3 — Change Requests

**Status:** v1.0 — proces en (lege) log, gereed bij aanvang van Sprint 3.
**Grondslag:** dit proces herhaalt uitsluitend het al vastgelegde Wijzigingsbeheer-principe uit `09-implementation-blueprint/01-implementation-strategy.md` sectie 14 — het introduceert geen nieuw beleid.

---

## Proces

Consistent met de regel "Sprint 2 is definitief" en het platformbrede "nooit stilzwijgend"-principe:

1. **Een Blueprint-document wordt tijdens Sprint 3 nooit stilzwijgend gewijzigd.** Ontdekt de implementatie een fout, gat, tegenstrijdigheid of noodzakelijke uitbreiding in een Functionele, Technische of UX-Blueprint-document, dan wordt dat gemeld als Change Request in dit document — niet direct doorgevoerd in de broncode of het Blueprint-document zelf.
2. **Elke Change Request krijgt een uniek ID, een beschrijving van de bevinding, het geraakte Blueprint-document, en een voorgestelde aanpak** — vergelijkbaar met hoe Sprint 2 een "Geconstateerde inconsistentie" behandelde.
3. **Een Change Request wordt beoordeeld vóórdat deze wordt doorgevoerd.** Alleen na expliciete goedkeuring wordt het bijbehorende Blueprint-document bijgewerkt (buiten dit document om) en het gekoppelde ticket in `Sprint-3-Tickets.md`/`Sprint-3-Progress.md` aangepast.
4. **Een AI-gegenereerd implementatievoorstel dat geen aanwijsbare Blueprint-bron heeft, wordt behandeld als een mogelijke Change Request**, niet stilzwijgend geaccepteerd — consistent met de AI-werkwijze uit `01-implementation-strategy.md` sectie 11.

## Sjabloon voor een nieuwe Change Request

```
### CR-XXX: <korte titel>
**Datum:**
**Gemeld door:**
**Geraakt Blueprint-document:**
**Bevinding:** <wat ontbreekt, is tegenstrijdig, of onjuist gebleken>
**Voorgestelde aanpak:**
**Impact op bestaande tickets:** <welke Sprint-3-Tickets.md-items geraakt worden>
**Status:** Openstaand / Goedgekeurd / Afgewezen / Doorgevoerd
**Besluit + datum:**
```

## Bekende, al vooraf geïdentificeerde aandachtspunten (geen Change Requests, wél te bewaken)

Deze punten zijn al in de Blueprint zelf als open of gedeeltelijk vastgelegd — geen nieuwe bevindingen, maar het is aannemelijk dat ze tijdens Sprint 3 als eerste een Change Request nodig hebben:

- **S3-11-05 (Compliance Dashboard):** de onderliggende functionele spec ("compliance-en-verified") bestaat nog niet — dit ticket kan uitmonden in een Change Request zodra die spec alsnog nodig blijkt vóór MVP-livegang.
- **Pre-existente 2-punts telafwijking** in `06-development/project-status-and-roadmap.md` (68 vs. 70 in de scherminventarisatie-optelsom, expliciet benoemd tijdens de Blueprint Freeze-controle) — vereist een volledige hertelling, niet inhoudelijk van aard.
- **Schermnummer #65-duplicatie** (Affiliate-registratie en Creator-registratie delen hetzelfde nummer) — gesignaleerd tijdens de Implementation Readiness Review, nog niet gecorrigeerd.

## Log

| ID | Titel | Datum | Status |
|---|---|---|---|
| CR-001 | Ontbrekend ticket voor workspace-/tooling-gereedheid | Sprint 3, dag 1 | Doorgevoerd |
| CR-002 | `pnpm build`-configuratiefouten in packages/config | Sprint 3, dag 1 | Doorgevoerd |
| CR-003 | Implementatievolgorde-review — 6 tickets verplaatst wegens afhankelijkheidsschendingen | Sprint 3, dag 1 (laatste review vóór bouwstart) | Doorgevoerd |
| CR-004 | Ontbrekend ticket voor Medusa-installatie vóór S3-01-01 | Sprint 3, dag 1 (architectuurreview) | Doorgevoerd |

### CR-004: Ontbrekend ticket voor Medusa-installatie vóór S3-01-01
**Datum:** Sprint 3, dag 1 (architectuurreview, tijdens voorbereiding van S3-01-01)
**Gemeld door:** Expliciete architectuurreview vóór aanvang van S3-01-01.
**Geraakt Blueprint-document:** Geen — `01-architecture/standard-vs-custom.md` is geraadpleegd, niet gewijzigd.
**Bevinding:** `01-architecture/standard-vs-custom.md` classificeert Customer/login/adresboek expliciet als "Standaard | Medusa Customer-module." De repository bevat echter geen Medusa-backend (`apps/backend`), en geen enkel ticket in de 69-tickets-planning dekte "Medusa installeren" — een reëel gat, aangezien S3-01-01 hier zonder voorwerp op zou bouwen én vrijwel elke latere Epic (Product/Cart/Order/Payment/Pricing/Promotion/Fulfillment) impliciet van Medusa afhangt.
**Voorgestelde aanpak:** retroactief ticket `S3-00-07` toegevoegd aan EPIC-00 (infrastructuurcategorie, consistent met S3-00-05/06), direct vóór EPIC-01. `S3-01-01`'s afhankelijkheden uitgebreid met `S3-00-07`.
**Impact op bestaande tickets:** `S3-01-01`'s afhankelijkheidsveld aangepast (S3-00-04 → S3-00-04, S3-00-07); geen enkel ander ticket inhoudelijk gewijzigd. Totaal aantal tickets: 69 → 70.
**Status:** Doorgevoerd.
**Besluit + datum:** Direct doorgevoerd (architectuurreview expliciet zo gevraagd, laag-risico toevoeging) — Sprint 3, dag 1.

### CR-003: Implementatievolgorde-review
**Datum:** Sprint 3, dag 1 (laatste review vóór bouwstart)
**Gemeld door:** Expliciete eindreview van de Sprint 3 Backlog vóór het bevriezen van de planning.
**Geraakt Blueprint-document:** Geen — uitsluitend `Sprint-3-Backlog.md` (volgorde, geen inhoud).
**Bevinding:** een volledige afhankelijkhedengrafiek van alle 69 tickets toonde 12 tickets die afhingen van een later gepland ticket. Oorzaak: EPIC-10 (Audit/Notificatie), EPIC-11 (Admin Shell) en EPIC-13 (Dashboard-shells) stonden, als strikt Epic-volgordelijke blokken, bijna aan het eind, terwijl zes van hun tickets al veel eerder nodig waren.
**Voorgestelde aanpak:** zes tickets verplaatst: `S3-11-01`, `S3-10-01`, `S3-10-02`, `S3-13-01` direct na EPIC-01; `S3-13-02` direct na `S3-02-03`; `S3-09-02` direct na `S3-11-02`. Geen ticket toegevoegd, verwijderd of inhoudelijk gewijzigd.
**Impact op bestaande tickets:** uitsluitend volgordepositie van 6 van de 69 tickets; alle overige 63 ongewijzigd.
**Status:** Doorgevoerd — geverifieerd met een topologische controle (0 resterende schendingen).
**Besluit + datum:** Direct doorgevoerd (laatste review vóór bevriezing, expliciet zo gevraagd) — Sprint 3, dag 1.

### CR-001: Ontbrekend ticket voor workspace-/tooling-gereedheid
**Datum:** Sprint 3, dag 1
**Gemeld door:** Uitvoering van een verzoek dat verwees naar ticket-ID "S3-002", dat niet bestond in `Sprint-3-Tickets.md`/`Sprint-3-Backlog.md`.
**Geraakt Blueprint-document:** `10-implementation/Sprint-3-Tickets.md`, `Sprint-3-Backlog.md`, `Sprint-3-Progress.md`, `Sprint-3-Epics.md` (planningsdocumenten, geen Blueprint-inhoud zelf).
**Bevinding:** de oorspronkelijke 67-tickets-planning bevatte geen enkel ticket voor monorepo-/tooling-gereedheid (Turborepo, PNPM Workspace, package.json's, build-/TypeScript-configuratie) — een reëel gat, aangezien dit een voorwaarde is voor elk ander ticket dat code produceert.
**Voorgestelde aanpak:** retroactief ticket `S3-00-05` toevoegen aan EPIC-00, uitgevoerd als onderdeel van dit verzoek.
**Impact op bestaande tickets:** geen inhoudelijke wijziging aan de overige 67 tickets; uitsluitend een toevoeging.
**Status:** Doorgevoerd.
**Besluit + datum:** Direct doorgevoerd (laag-risico, puur toevoegend, geen bestaand ticket gewijzigd) — Sprint 3, dag 1.

### CR-002: `pnpm build`-configuratiefouten in packages/config
**Datum:** Sprint 3, dag 1
**Gemeld door:** Lokale validatie van Epic 0 (`pnpm build`), gemeld als ticket S3-00-06.
**Geraakt Blueprint-document:** Geen — puur tooling-configuratie (`packages/config/package.json`), geen Functionele/Technische/UX-Blueprint geraakt.
**Bevinding:** twee build-fouten ("Cannot find module @europmade/config/eslint-preset," "Cannot find module tailwindcss") met dezelfde grondoorzaak: `packages/config/package.json` miste een `exports`-map en declareerde niet al zijn daadwerkelijk gebruikte dependencies — een klassiek pnpm phantom-dependency-probleem (sibling-packages' dependencies zijn onder pnpm nooit stilzwijgend beschikbaar).
**Voorgestelde aanpak:** `exports`-map toegevoegd (`./eslint-preset`, `./tailwind-preset`, `./tsconfig/*.json`), `"type": "module"` toegevoegd, vijf ontbrekende devDependencies expliciet gedeclareerd.
**Impact op bestaande tickets:** geen — uitsluitend een configuratiecorrectie op een net toegevoegd ticket (S3-00-05), geen van de oorspronkelijke 67 tickets geraakt.
**Status:** Doorgevoerd.
**Besluit + datum:** Direct doorgevoerd (laag-risico, uitsluitend configuratie, geen businesscode) — Sprint 3, dag 1.
