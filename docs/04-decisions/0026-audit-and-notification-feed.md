# ADR-0026 — Audit-module en in-app notificatiefeed (S3-10-01 / S3-10-02 / S3-05-09)

**Status:** Geaccepteerd  
**Datum:** 2026-07-31  
**Domein:** Platformbrede services, Order-service  
**Raakt:** `11-medusa-architecture.md` §3/§6; `02-database-model.md` Deel F.2/F.3; `04-event-model.md` §2.3/§12–13

## Context

S3-05-09 koppelt Order-/Message-/Return-events aan notificaties en hangt hard van EPIC-10 af. Medusa heeft geen append-only Audit Log (F.2). Medusa’s Notification-module dekt **kanaalverzending** (e-mail/sms/local), niet de opvraagbare in-app feed met `read_at` (F.3). De standaardtabel `notification` is al in gebruik door Medusa.

## Beslissing

1. **Custom module `audit`** met tabel `audit_log` exact conform F.2. Soft refs (`actor_customer_id` als tekst). Append-only op serviceniveau: update/delete/soft-delete werpen een fout.
2. **Audit-consumptie via Event Bus-subscribers** (universeel patroon uit `11-medusa-architecture.md` §3). Producers blijven events emitten; de audit-subscriber schrijft de rij. Dit wijkt licht af van “zelfde DB-transactie” in eventmodel §13 ten gunste van één universele consumer — acceptabel voor MVP zolang events at-least-once aankomen.
3. **Custom module `notificationFeed`** met tabel `in_app_notification` als Blueprint F.3-feed. Tabelnaam wijkt af van `notification` om botsing met Medusa’s verzendtabel te vermijden; kolommen blijven F.3 (`recipient_customer_id`, `notification_type`, `source_entity_type`, `source_entity_id`, `read_at`).
4. **Kanaalverzending** via standaard `Modules.NOTIFICATION` (local provider in dev) vanuit dezelfde dispatch-workflow; daarna terminaal event `NotificationDispatched` (geen verdere businessconsumptie).
5. **S3-05-09**: één order-notificatie-subscriber op §2.3-events plus Return-/Refund-events die de Order-service al emit. Ontvangers zijn altijd `customer_id` (koper of seller-customer).

## Consequenties

- Store-API voor de feed (lijst + markeer gelezen) als technische basis voor later Meldingencentrum (S3-10-03).
- Admin-API om `audit_log` te raadplegen (append-only, geen mutatie).
- Overige domeinevents (Product Cloud, Commerce, …) kunnen dezelfde audit-subscriber uitbreiden zonder nieuw schema.
