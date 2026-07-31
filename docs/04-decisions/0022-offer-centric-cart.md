# ADR-0022 — Offer-centrische winkelwagen (custom cart) voor S3-05-03

**Status:** Geaccepteerd  
**Datum:** 2026-07-30  
**Domein:** Order-service, Winkelwagen, Medusa-architectuur  
**Raakt:** ADR-0021; `winkelwagen/spec.md`; `11-medusa-architecture.md` (Cart)

## Context

S3-05-03 eist werkende Winkelwagen-/Checkout-/Orderbevestiging-UI. Blueprint wijst Medusa Cart als basis aan, maar Product Cloud + Offers zijn custom (ADR-0008/0015/0021). Zonder Module Links Product↔Medusa Product kan Medusa Cart geen Offer-regels dragen.

## Beslissing

1. **Custom cart** in `orderService`: `em_cart` + `em_cart_line` met soft ref `offer_id` en `quantity`.
2. Identiteit: `customer_id` (ingelogd) **of** `guest_token` (gast); merge bij login somt qty per Offer (afgekapt op voorraad).
3. Alle qty-/prijs-/beschikbaarheidschecks blijven **server-side** via bestaande Offer-revalidatie (ADR-0005-geest).
4. Medusa Cart blijft beschikbaar voor latere Module Links; deze ADR vervangt die keuze niet permanent.
5. UI toont BTW uitsluitend via server-geleverde bedragen (checkout/spec §13) — geen fiscale berekening in de browser.

## Consequenties

- S3-05-03 kan cart/checkout/confirmation bouwen zonder Medusa Product-links.
- Stripe-checkout blijft ADR-0018/0021 (simulated place tot keys aanwezig).
