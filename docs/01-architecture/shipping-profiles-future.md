# Shipping profiles — future carrier extension

Sprint 3B introduces reusable **seller shipping profiles** (`cc_shipping_profile`) linked from products (`pc_product.shipping_profile_id`) and synced to offers (`offer.shipping_profile_id` + denormalized `cc_price.shipping_cost`).

## MVP (current)

- Seller defines **own shipping** rates per EU destination country.
- Processing/handover settings (cut-off, processing time) are stored on the profile.
- Products reference one profile; offers inherit per-region rates at sync time.
- No live carrier APIs.

## Conceptual entities (carrier-ready)

| Entity | Role |
|--------|------|
| **Shipping Profile** | Seller template: countries, processing, default carrier mode |
| **Carrier** | External provider (DHL, PostNL, FedEx, …) — `carrier_id` string ref |
| **Carrier Service** | Product level within carrier (Standard, Express) — `service_id` |
| **Shipping Rate** | Price + ETA for a service/country (static now, dynamic later) |
| **Delivery Estimate** | Customer-facing promise = processing + transit |

Stored JSON hooks:

- `cc_shipping_profile.carrier_mode`: `own` \| `carrier`
- `cc_shipping_profile.carrier_ref`: `{ carrier_id, service_id? }`
- `country_rates[CC].carrier_ref`: optional per-country override

## Future flow (not implemented)

1. **Seller connects carrier** (OAuth/API keys) → Carrier account linked to seller.
2. **Carrier exposes services** → EuropMade caches service catalog per carrier.
3. **Rate request** at checkout → Carrier API returns live rates/ETAs per cart line + destination.
4. **Checkout** shows multiple services (speed/price) — customer selects one.
5. **Order** stores chosen `carrier_id`, `service_id`, quoted rate snapshot.

## Design constraints for checkout

- Do not hard-code carrier names in business logic; use registry/interface.
- Keep denormalized offer shipping fields for Buy Box / catalog, but allow checkout to override with selected service rate when carrier mode is active.
- `Shipping Rate` should be representable as either seller-fixed (`own`) or carrier-quoted (`carrier`).

## Related code

- Model: `apps/backend/src/modules/commerce-cloud/models/shipping-profile.ts`
- Engine: `apps/backend/src/modules/commerce-cloud/shipping-profile-engine.ts`
- Store API: `apps/backend/src/api/store/commerce-cloud/shipping-profiles/`
- Product link: `apps/backend/src/api/store/product-cloud/products/[id]/shipping-profile/`
