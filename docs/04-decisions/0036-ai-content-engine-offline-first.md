# ADR-0036 — AI Content Engine: offline-first, provider-agnostic

**Status:** Geaccepteerd  
**Datum:** 2026-08-07  
**Domein:** CMS, SEO, AI Content  
**Raakt:** Categoriepagina’s; herbruikbaar voor merken/producenten/collecties/acties/landings/zoek/seller (Sprint 4); ADR-0035 (geen stille externe AI)

## Context

Categoriepagina’s hebben unieke, meertalige SEO- en koopgidscontent nodig. AI mag **nooit** tijdens page load worden aangeroepen. Externe LLM-providers (OpenAI/Claude/Gemini) vereisen EU-hosting en een verwerkersovereenkomst — dat is onder ADR-0035 nog niet vrijgegeven.

## Beslissing

1. **Offline-first:** generatie alleen via expliciete jobs/admin-acties (Generate / Regenerate / Translations / Publish). Storefront leest uitsluitend opgeslagen CMS-content.
2. **Provider-agnostic:** `AiContentProvider`-interface; registry wisselt providers (`offline-analyzer` nu; stubs voor `openai`, `anthropic`, `gemini`, `local`).
3. **Interim generator:** `offline-analyzer` analyseert categorie-/catalogussignalen en schrijft unieke, expert-content per entiteit en taal — geen page-load LLM, geen keyword stuffing.
4. **Eén engine voor alle entiteiten:** `category | brand | producer | collection | campaign | landing | search | seller`.
5. Externe/cloud LLM’s worden pas geactiveerd na een **nieuw ADR** + EU-hosting/DPA; stubs blijven klaar.

## Consequenties

- CMS-documenten bevatten `generationStatus`, `lastGenerated`, `generatedBy`, `promptVersion`, `published`.
- Regeneratie-triggers: handmatig, categorie-/filterwijziging, catalogusdelta, periodiek (bijv. 6 maanden), vertalingen-only.
- Page load blijft vrij van AI-latency en layout shift.
