# ADR-0034 — Finance invoice/payout soft-schema & MVP-cadans (S3-08-01…04)

**Status:** Geaccepteerd  
**Datum:** 2026-07-31  
**Domein:** Finance  
**Raakt:** Deel G.7–G.8; `finance/spec.md` §3/§7

## Beslissing

1. **G.7 `invoice` extra velden:**
   - `credit_of_invoice_id` (nullable) — creditnota wijst naar originele factuur; nooit muteer issued rows.
   - `period` (nullable text) — voor Seller-commissiefactuur (MVP: `order:<order_id>`).
   - `total_amount` (bigNumber) — factuurtotaal voor overzichten.
2. **G.8 `payout.status`:** `Gepland` | `In behandeling` | `Voltooid` | `Geannuleerd`.
3. **G.8 extra:** `eligible_at` (datetime) — uitbetaling pas na **14 dagen** retourtermijn (EU MVP).
4. **Cadans MVP:** payouts worden per order als `Gepland` aangemaakt; Beheerder/`process` zet naar `Voltooid` zodra `eligible_at` verstreken is. Geldtransfer naar Stripe Connect blijft stub (ADR-0018); ledger + hold zijn verplicht.
5. **Platformcommissie:** vast **10%** over som van `order_line.unit_price_snapshot` (base+shipping per eenheid × quantity — zelfde Buy Box-parity-snapshot als Affiliate ADR-0030).
6. **`vat_breakdown.delivery_country`:** soft JSON-veld (ISO-2) voor OSS-aggregatie op Seller BTW-overzicht (finance-05); afgeleid uit order-verzendadres.

## Consequenties

- S3-08-05 UI leest `GET /store/finance/seller` (summary, commissions, invoices, payouts, vat_by_country); geen Medusa Invoice-module.
