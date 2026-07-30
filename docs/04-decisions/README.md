# 04 — Decisions (Architecture Decision Records)

Formeel vastgestelde beslissingen die afwijken van, of een aanvulling zijn op, de letterlijke tekst van de Blueprint. Elke ADR volgt hetzelfde format: Context → Beslissing → Consequenties → Status.

ADR's worden nooit stilzwijgend gewijzigd. Een nieuwe inzicht dat een eerdere ADR raakt, wordt vastgelegd als een **nieuwe** ADR die de oude expliciet vervangt (met een verwijzing in beide documenten), zodat de beslissingsgeschiedenis intact blijft.

## Index

| ADR | Titel | Status | Domein |
|---|---|---|---|
| [0001](./0001-buy-box-weighting-configurable.md) | Buy Box-weging is configureerbaar, geen vaste percentages | Geaccepteerd | Buy Box |
| [0002](./0002-verified-threshold-configurable.md) | Verified™-drempel is configureerbaar, geen vaste minimale score | Geaccepteerd | Product Cloud |
| [0003](./0003-sponsored-products-post-mvp.md) | Sponsored Products voorbereid in architectuur, buiten MVP-scope | Geaccepteerd | Buy Box, MVP-scope |
| [0004](./0004-buy-box-tiebreaker-order.md) | Buy Box-tiebreaker-volgorde bij exact gelijke score | Geaccepteerd | Buy Box |
| [0005](./0005-buy-box-server-side-only.md) | Buy Box wordt uitsluitend server-side berekend | Geaccepteerd | Buy Box, technische architectuur |
| [0006](./0006-partner-lifecycle-post-mvp.md) | Partner Lifecycle Management (Blokkeren/schorsen) buiten MVP-scope | Geaccepteerd | Partner Center, MVP-scope |
| [0007](./0007-uncertain-matches-use-match-candidate.md) | Onzekere productmatches → MatchCandidate, geen ModerationCase | Geaccepteerd | Product Cloud, Matching |
| [0008](./0008-product-cloud-custom-deel-b-tables.md) | Product Cloud Deel B-tabellen als custom module (naast Medusa Product) | Geaccepteerd | Product Cloud, Medusa-architectuur |
| [0009](./0009-change-proposal-entity.md) | ChangeProposal-entiteit voor de bevroren Wijzigingsvoorstel-API | Geaccepteerd | Product Cloud, Product Management |
| [0010](./0010-claim-decision-reason.md) | Claim `decision_reason` voor afwijzen-met-reden | Geaccepteerd | Product Cloud, Claim-API |
| [0011](./0011-minimal-seller-shell-for-s3-03-05.md) | Minimale Seller-shell als scaffold voor S3-03-05 | Geaccepteerd | Seller Dashboard, UX |
| [0012](./0012-match-ui-commerce-stubs-and-uncertain.md) | Match-UI stubs: Commerce Cloud + uncertain zonder P0-wireframe | Geaccepteerd (Commerce-stubs vervangen door [0017](./0017-match-ui-commerce-stubs-lifted.md)) | Seller Dashboard, Product Cloud |
| [0013](./0013-product-cloud-match-and-list-preview.md) | Product Cloud-preview op EAN-match en cataloguslijst | Geaccepteerd | Product Cloud, Store API |
| [0014](./0014-offer-crud-without-buy-box-engine.md) | Offer-CRUD zonder Buy Box-engine in Seller→Commerce-batch | Geaccepteerd | Commerce Cloud, MVP-scope |
| [0015](./0015-commerce-cloud-soft-refs.md) | Commerce Cloud soft refs naar Seller en Identifier | Geaccepteerd | Commerce Cloud, Medusa-architectuur |
| [0016](./0016-retailer-created-form-soft-brand-and-upload-ref.md) | Retailer Created-formulier: vrije merktekst en media-referentie | Geaccepteerd | Seller Dashboard, Product Cloud |
| [0017](./0017-match-ui-commerce-stubs-lifted.md) | Match-UI Commerce-stubs opgeheven door S3-03-06 / Offer-CRUD | Geaccepteerd | Seller Dashboard, Commerce Cloud |
| [0018](./0018-psp-webhook-integration-security.md) | Integratiebeveiliging / Event Security (PSP-webhooks) — Blueprint ADR-01 | Geaccepteerd | Security, Payment, Integraties |
| [0019](./0019-buy-box-engine-defaults-and-missing-factors.md) | Buy Box-engine: defaultweging en ontbrekende factoren (S3-04-02) | Geaccepteerd | Buy Box, Commerce Cloud |
| [0020](./0020-buy-box-cache-persistence.md) | Buy Box-cache-persistentie (Blueprint ADR-31) | Geaccepteerd | Buy Box, Commerce Cloud, Caching |
| [0021](./0021-order-service-custom-deel-d.md) | Order-service Deel D als custom module naast Medusa Payment | Geaccepteerd | Order-service, Medusa-architectuur |
