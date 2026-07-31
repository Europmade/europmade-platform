# ADR-0025 — Order-berichten in `orderService` (S3-05-07)

**Status:** Geaccepteerd  
**Datum:** 2026-07-31  
**Domein:** Order-service, Messaging  
**Raakt:** ADR-0021; `messaging-reviews-qa/spec.md` §1; Deel G.9

## Context

Berichten zijn Order-gekoppeld (geen vrije messaging). ADR-0021 plaatste G.9 `order_message` al in `orderService`. Medusa heeft geen marketplace order-chat die custom `em_order` dekt.

## Beslissing

1. **Message blijft in `orderService`** (`order_message`) tot een aparte Messaging-module eventueel splittet.
2. Alleen **klant of goedgekeurde seller** van de order mag lezen/schrijven.
3. **Beheerder** mag uitsluitend **meelezen** als er minstens één retour met status `Geëscaleerd` op de order bestaat — geen vrije admin-chat.
4. Event `MessageSent` bij elke create (notificatiekoppeling volgt S3-05-09 / EPIC-10).

## Consequenties

- Buyer/Seller UI onder `/account/messages` en `/seller/messages`.
- Admin OMC toont thread alleen bij escalatie.
