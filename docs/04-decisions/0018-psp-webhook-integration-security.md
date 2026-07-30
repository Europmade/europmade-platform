# ADR-0018 — Integratiebeveiliging / Event Security (PSP-webhooks) — Blueprint ADR-01

**Status:** Geaccepteerd  
**Datum:** 2026-07-30  
**Domein:** Security, Integraties, Payment  
**Sluit af:** Blueprint ADR-01 (`09-adr-overview.md`); `06-security-architecture.md` D#1 / §8 (extern deel); `08-integration-architecture.md` §5/§16; `03-api-model.md` §15 (inkomend webhook-protocol)

## Context

Inkomende PSP-webhooks (`PaymentConfirmed` / `PaymentFailed`) zijn in de Blueprint functioneel beschreven, maar zonder vastgelegde authenticatie. Dat is het kritiekste open security-gat: een vervalst betaalsignaal kan orders/uitbetalingen triggeren.

Tegelijk is het algemene webhook-protocol (`03-api-model.md` §15) Open, en wacht de Payment-module op een PSP-keuze (`11-medusa-architecture.md` §2). Medusa v2 biedt standaard:

- Payment Module + payment providers
- Ingebouwde webhook-route `/hooks/payment/{identifier}_{provider}`
- Provider-side signature verification via `getWebhookActionAndData` (raw body + headers)

Dit ADR dekt **authenticatie**, **protocol**, en **PSP-keuze** in samenhang — niet als losse antwoorden.

## Beslissing

### 1. PSP-keuze (MVP)

1. **Primaire PSP: Stripe** (Europese Stripe-account / Stripe Payments Europe), geïntegreerd via de **officiële Medusa Stripe payment provider** (`@medusajs/payment-stripe` of opvolger in dezelfde Medusa-major).
2. **Marketplace-uitbetalingen** (Seller- en later Affiliate-payouts in EPIC-08): **Stripe Connect** (Express of Custom), zodat splitsing van middelen per seller aansluit op de Buy Box-/ordersplitsingsarchitectuur — niet via een tweede PSP.
3. **Adyen** (of andere EU-PSP) blijft een **toegestaan alternatief** alleen via een Medusa-conforme custom payment provider die dezelfde webhook-eisen uit dit ADR haalt. Voor MVP wordt Adyen **niet** gekozen, omdat Medusa geen first-party Adyen-provider heeft en dat extra fork-/onderhoudrisico introduceert zonder Blueprint-voordeel.

**EU-data (Blueprint H13.4):** EuropMade host applicatie en primaire databases op TransIP (NL). PAN/CVV worden **nooit** op EuropMade-infrastructuur opgeslagen (PCI via Stripe-hosted flows). Minimale payment-metadata die EuropMade wel bewaart (payment intent/session-id’s, status) valt onder AVG-verwerkersovereenkomst met Stripe EU. Dit ADR wijzigt geen hostingkeuze.

### 2. Webhook-authenticatie (verplicht)

Voor **alle** inkomende externe webhooks die financiële of fulfilment-status wijzigen (PSP nu; verzenders later):

1. **Cryptografische bronverificatie is verplicht** vóór elke businessmutatie (HMAC/signature van de provider, of provider-verify-API). Geen shared-secret-in-querystring, geen IP-allowlist als enige controle.
2. Payment-webhooks lopen **uitsluitend** via Medusa’s Payment-webhookpad (`/hooks/payment/...`). Geen parallelle custom “open” payment-webhook.
3. De **raw request body** moet intact blijven voor signature verification; pre-parsing die handtekening breekt is een configuratiefout.
4. `webhookSecret` (of provider-equivalent) is **verplicht in productie**; ontbreken = deploy-blokkade (fail-closed). In development mag een expliciet gedocumenteerde uitzondering alleen voor lokale mocks, nooit voor shared/staging met echte secrets.
5. Mislukte verificatie → HTTP 4xx, **geen** domeinevent, **geen** order-/payment-mutatie; wel audit/security-log (zodra S3-10-01 AuditLog bestaat: structureel; tot die tijd structured logger).

### 3. Algemeen inkomend webhook-protocol

1. **Transport:** alleen HTTPS.
2. **Vertaling:** extern payload → na verificatie vertaald naar **intern** domeinevent/`Payment`-status (`04-event-model.md` §14). Interne consumenten lezen nooit raw Stripe-eventtypen.
3. **Idempotentie:** provider-event-id (of Medusa payment-session-id + action) is dedupe-sleutel; herhaalde webhooks mogen geen dubbele `OrderPlaced`/`OrderSplit` veroorzaken.
4. **Autoriteit:** uitsluitend server-side (consistent met ADR-0005-geest en platformbrede server-side authority). Clients/storefront mogen webhook-uitkomsten niet “bevestigen”.
5. **Uitgaande webhooks** (Seller-ERP e.d.): buiten MVP; wanneer toegevoegd: zelfde HTTPS + signing + idempotency-eisen, aparte ADR-aanvulling toegestaan.

### 4. Event Security (scope van dit ADR)

| Kanaal | Regime |
|---|---|
| Extern → platform (PSP/verzender) | Dit ADR: signature verification + vertaling |
| Intern Event Bus (modular monolith) | Niet publiek bereikbaar; alleen Medusa modules/subscribers/workflows als producers/consumers. Geen aparte mTLS tussen services zolang alles in-process/Local Event Bus blijft |
| Service-tot-service bij latere opsplitsing | **Buiten scope** — apart ADR wanneer de monolith wordt opgesplitst (`06` inconsistentie #4) |

`PaymentConfirmed` / `PaymentFailed` als **domein-/integratienamen** blijven; technisch ontstaan ze pas **ná** geslaagde Medusa webhook-handling (authorized/captured of failed), niet uit een onbetrouwbare HTTP-body.

## Consequenties

- S3-05-02 (Checkout/ordersplitsing) en S3-08-04 (Uitbetaling) mogen Stripe/Connect aannemen; geen tweede PSP-keuze meer nodig voor MVP.
- Implementatie voegt Stripe payment provider + webhook secret toe in `medusa-config` / secrets store — **niet** in deze ADR-ticket zelf (geen runtime-code in S3-00-01).
- Verzender-webhooks (Shipment) hergebruiken sectie 2–3 wanneer Shipment uit Open komt.
- Secrets Management (aparte Blueprint-ADR) blijft open voor rotatie/opslagmechaniek; dit ADR eist alleen fail-closed secrets voor webhooks.

## Referentie

- `docs/08-technical-blueprint/09-adr-overview.md` ADR-01  
- `docs/08-technical-blueprint/06-security-architecture.md` §8, D#1, Bijlage C  
- `docs/08-technical-blueprint/08-integration-architecture.md` §5, §16  
- `docs/08-technical-blueprint/03-api-model.md` §15  
- `docs/08-technical-blueprint/04-event-model.md` §3/§14  
- `docs/08-technical-blueprint/11-medusa-architecture.md` §2 Payment  
- Medusa docs: Payment webhook events / Stripe provider  
