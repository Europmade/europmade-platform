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
