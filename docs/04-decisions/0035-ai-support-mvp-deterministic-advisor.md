# ADR-0035 — AI-ondersteuning MVP: deterministische advisor (geen externe API)

**Status:** Geaccepteerd  
**Datum:** 2026-07-31  
**Domein:** AI-ondersteuningsservice  
**Raakt:** Deel F.1; Blueprint H9.7; security (externe API-sleutel Open)

## Context

De Blueprint vereist `ai_metadata` met betrouwbaarheidsscore en het principe “AI ondersteunt, beslist nooit”. Een uitgaande AI-validatie-API is voorzien, maar encryptie/secrets en EU-hosting voor die externe partij zijn nog **Open**. Productie-MVP nadert; externe non-EU AI-SDK’s mogen niet stilzwijgend worden toegevoegd.

## Beslissing

1. MVP gebruikt een **deterministische, server-side advisor** (regels + signaalcodes) die altijd een `confidence_score` en `explanation` oplevert — nooit een vooraf ingevulde beslissing.
2. Geen externe AI-provider/API-sleutel in deze fase. Latere vervanging door een EU-gehoste provider vereist een nieuw ADR + verwerkersovereenkomst.
3. Soft-schema op `ai_metadata`: `subject_type` + `subject_id` (polymorfe koppeling naast `ai_metadata_id` op het domeinobject).
4. Generatie via workflow + Event Bus (`ModerationCaseOpened` e.d.) en admin-endpoint `POST /admin/ai-support/recommendations`; lezen uitsluitend als sub-resource (o.a. moderatie-detail).

## Consequenties

- Acceptatiecriteria S3-09-01 (score + nooit beslissen) zijn gehaald zonder externe afhankelijkheid.
- Confidence-scores zijn heuristisch en als zodanig gelabeld in de UI.
