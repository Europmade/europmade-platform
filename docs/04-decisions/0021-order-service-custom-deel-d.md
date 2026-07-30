# ADR-0021 — Order-service Deel D als custom module naast Medusa Payment

**Status:** Geaccepteerd  
**Datum:** 2026-07-30  
**Domein:** Order-service, Medusa-architectuur  
**Raakt:** `11-medusa-architecture.md` §2 (Order/Cart); ADR-0008/0015; ADR-0018 (Stripe)

## Context

`11-medusa-architecture.md` zegt dat `order_set`/`order`-splitsing Medusa’s multi-order-per-cart gebruikt. De Blueprint eist tegelijk Deel D-schema met Offer-snapshots, Nederlandse `payment_status`/`exception_status`, en soft modulegrenzen. Product Cloud en Commerce Cloud zijn al **custom** (ADR-0008/0015); Medusa Cart/Order verwachten Medusa Product-variants — die Offer-regels dragen we nog niet via Module Links.

Zonder ADR zou S3-05-01/02 ofwel Medusa Order forceren zonder Offer-snapshot, ofwel stil een parallel schema bouwen.

## Beslissing

1. **Custom module `orderService`** bezit Deel D (`order_set`, order, `order_line`, `shipment`, `return`) en G.9 `message` (tot de Messaging-module in S3-05-07 eventueel splitst).
2. **Tabelnaam `em_order`** voor Blueprint-entiteit `order`, om botsing met Medusa core-tabel `order` te vermijden. Conceptuele Blueprint-naam blijft `order`.
3. **Soft refs** (geen cross-module FK): `customer_id`, `seller_id`, `offer_id`, `product_variant_id`, `sender_customer_id`.
4. **Medusa Payment** blijft de standaard betaalmodule; Stripe-provider volgt ADR-0018. Tot Stripe-keys in de omgeving staan, mag development een **expliciete gesimuleerde payment-confirm** gebruiken (`payment_mode=simulated` + unieke `payment_reference`), nooit in productie zonder fail-closed secrets.
5. **Medusa Cart** wordt in deze batch **niet** verplicht: checkout-place accepteert Offer-regels direct (revalidatie server-side). Latere Module Links Cart↔Offer mogen Cart herintroduceren zonder Deel D te herschrijven.
6. Ordersplitsing is **uitsluitend server-side** (ADR-0005): één `order_set` + één `payment_reference` → N `em_order` (één per `seller_id`).

## Consequenties

- S3-05-01 levert exact Deel D + G.9 in PostgreSQL via deze module.
- S3-05-02 implementeert place/split/exception op dit schema en emit §2.3-events.
- Admin standaard Order-UI van Medusa toont deze rijen niet automatisch — OMC (S3-05-08) gebruikt Order-service-API’s.
