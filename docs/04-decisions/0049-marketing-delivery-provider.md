# ADR-0049 — Marketingmail via een providerinterface

**Status:** Geaccepteerd  
**Datum:** 2026-10-09  
**Domein:** Marketing, Communicatie  
**Vervangt:** ADR-0047 punt 9, alleen de zin dat het latere verzenddoel Crisp is  
**Raakt:** [ADR-0047](./0047-engagement-content-automation-separation.md), [architectuur](../01-architecture/marketing-communication-partner-engagement.md)

## Context

De Engagement-orchestrator schrijft communication history als `queued` of `stopped`. ADR-0047 noemde Crisp als later verzenddoel. Crisp is de conversatie- en overdrachtslaag. Marketingmail heeft een eigen aflevering nodig, los van transactionele Medusa-notificaties.

## Beslissing

1. **Providerinterface.** Een latere e-mailprovider implementeert één contract op de bestaande history. De campagne-engine, voorkeuren en jobs blijven de bron. Er komt geen tweede communicatietabel.
2. **Dry-run nu.** Tot een provider expliciet wordt aangesloten plant de laag alleen welke `queued`- of opnieuw probeerbare `failed`-rijen afgeleverd zouden worden. Er wordt niets verzonden en er worden geen credentials opgeslagen.
3. **Resultaat op dezelfde rij.** `sent`, `failed` en `bounced` blijven statussen van `engagement_communication_event`, met de gebruikte versie, ontvanger, taal, campagne, fout en een claim. Een rij met provider-id of open claim wordt niet nog eens aangeboden.
4. **Poort blijft.** Aflevering hercontroleert toestemming, voorkeur, suppressie en een goedgekeurde actieve versie. Een concept wordt niet afgeleverd.
5. **Grenzen.** Transactionele auth-, order- en refundmail blijft Medusa Notification. Crisp blijft conversatie en menselijke overdracht. Geen van beide is de marketing-verzendlaag.

## Consequenties

- De claim is één database-update, de goedgekeurde versie kan naar een e-mailpayload worden gerenderd, en een webhook kan een bounce of aflevering aan dezelfde history-rij koppelen. Live modus, credentials en een echte provider blijven uit.
- P0 van ADR-0047 verzendt zelf nog steeds niet.
