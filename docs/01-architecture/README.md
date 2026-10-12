# 01 — Architecture

Technische architectuur van EuropMade en het ontwerpprincipe dat alle bouwbeslissingen stuurt.

## Inhoud

- [`tech-stack.md`](./tech-stack.md) — de gekozen technologiekeuzes voor de MVP (Next.js, Medusa, PostgreSQL, TransIP/EU-hosting) en de onderliggende ontwerpprincipes (API-first, Mobile First, Responsive).
- [`standard-vs-custom.md`](./standard-vs-custom.md) — de toepassing van "standard where possible, custom where it creates competitive advantage": wat Medusa/Next.js standaard bieden, en waar EuropMade bewust maatwerk bouwt omdat dit het concurrentievoordeel vormt.
- [`marketing-communication-partner-engagement.md`](./marketing-communication-partner-engagement.md) — **Architectuur.** Marketing, Communicatie & Partner Engagement: content/automation-scheiding, Communication CMS, prospects, acquisition/onboarding, Orchestrator, Crisp als externe communicatie-/human-handoverlaag (geen API/MCP-contract), MVP P0/P1/P2. P0-01 t/m P0-06 gebouwd. Bindend via [ADR-0047](../04-decisions/0047-engagement-content-automation-separation.md).

## Status

Definitief — akkoord ontvangen. Vormt de technische basis voor alle UX- en functionele documentatie vanaf `02-ux/`. Het engagement-document is de architectuur; P0-01 t/m P0-06 zijn gebouwd. Admin UI, verzending, Crisp en AI/LLM horen niet bij die backendgrens. Functionele marketingcopy volgt in een aparte Marketing-fase.
