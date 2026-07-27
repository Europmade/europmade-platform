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

*Nog geen Change Requests ingediend — Sprint 3 is nog niet gestart.*

| ID | Titel | Datum | Status |
|---|---|---|---|
| — | — | — | — |
