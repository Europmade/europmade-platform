# ADR-0027 — Review-service als eigen custom module (S3-06-01…03)

**Status:** Geaccepteerd  
**Datum:** 2026-07-31  
**Domein:** Review-service, Buy Box  
**Raakt:** `02-database-model.md` Deel E.1; `messaging-reviews-qa/spec.md` §2; `11-medusa-architecture.md` §9; ADR-0019

## Context

Medusa heeft geen marketplace Product-/Verkopersreview. `standard-vs-custom.md` labelt reviews als maatwerk. `11-medusa-architecture.md` §9 liet open of Review bij Messaging hoort; Messaging zit in `orderService` (ADR-0025). Eventmodel §2.4 verwacht een Review-service. Exacte “review mag na …” is open (Shipment Status Open); ticket S3-06-02 eist koppeling aan Orderregel na voltooide aankoop.

## Beslissing

1. **Eigen module `review`** met tabel `review` conform Deel E.1 (soft refs naar customer/order_line/product/seller).
2. **Score** is een geheel getal **1–5** (niet letterlijk in F.1, wel nodig voor Buy Box-normalisatie).
3. **Eligibiliteit MVP:** orderregel van de ingelogde koper, `payment_status = Betaald`, geen `exception_status = Mislukte ordersplitsing`. Shipment-gate volgt later.
4. **Aggregatie** gebeurt in de Review-service: gemiddelde Verkopersreview-score per seller, genormaliseerd als `avg / 5` (0–1) voor Buy Box-factor `seller_review`. Productreviews voeden de Buy Box nooit.
5. Bij `ReviewAggregateChanged` herberekent Commerce Cloud de Buy Box voor alle Offers van die seller (identifier×region).
6. **Dunne publieke productpagina** `/products/[id]` toont reviews tot de volledige productpagina-epic bestaat.

## Consequenties

- Buy Box vult `seller_review_score` i.p.v. ADR-0019-neutraal zodra er ≥1 verkopersreview is.
- Unieke constraint `(customer_id, order_line_id, review_type)` voorkomt dubbele reviews.
