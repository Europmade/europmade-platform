# Sprint 3 — Epics

**Status:** v1.0 — implementatieplanning, gebaseerd op Blueprint Freeze v1.0

**Uitgangspunt:** uitsluitend de bestaande Functionele Blueprint, Technical Blueprint, UX Blueprint/wireframes, ADR's en MVP-scope. Geen enkele Epic introduceert nieuwe functionaliteit of architectuur — elke Epic is direct herleid naar `09-implementation-blueprint/01-implementation-strategy.md` sectie 4 (Bouwvolgorde) en Bijlage B (Bouwvolgorde per module).

---

## EPIC-00 — Fase 0 — Kritieke ADR-besluitvorming

**Fase:** Fase 0 (vóór alle code)  
**Afhankelijk van:** Geen  
**Aantal tickets:** 6 (waarvan 2 retroactief toegevoegd, zie CR-001/CR-002)

**Doel:** De vier blokkerende architectuurbesluiten nemen vóórdat enige implementatie start, plus workspace-/tooling-gereedheid.

**Blueprint-bronnen:** 10-technical-roadmap.md §4/16 Bijlage E; 09-adr-overview.md ADR-01/02/03/13

**Tickets:** `S3-00-01`, `S3-00-02`, `S3-00-03`, `S3-00-04`, `S3-00-05`, `S3-00-06`

---

## EPIC-01 — Identiteit & Authenticatie

**Fase:** Fase 1 — Stap 3  
**Afhankelijk van:** EPIC-00 (ADR-13)  
**Aantal tickets:** 6

**Doel:** Customer/Seller-rollen, sessiebeheer, 2FA, RBAC-basis.

**Blueprint-bronnen:** 02-database-model.md Deel A; 03-api-model.md §5 (Definitief); 03-functional-specs/authenticatie/spec.md (v1.1, incl. Affiliate-rol)

**Tickets:** `S3-01-01`, `S3-01-02`, `S3-01-03`, `S3-01-04`, `S3-01-05`, `S3-01-06`

---

## EPIC-02 — Partner-service

**Fase:** Fase 1 — Stap 3 (samen met Identiteit)  
**Afhankelijk van:** EPIC-01  
**Aantal tickets:** 5

**Doel:** Seller/Company/Brand/Manufacturer, Partner Onboarding-flow, Partner Center (admin, lezend).

**Blueprint-bronnen:** 02-database-model.md Deel A.2-A.5; 03-functional-specs/partner-onboarding/spec.md (v1.1); 03-functional-specs/partner-center/spec.md (v1.1)

**Tickets:** `S3-02-01`, `S3-02-02`, `S3-02-03`, `S3-02-04`, `S3-02-05`

---

## EPIC-03 — Product Cloud-service

**Fase:** Fase 1 — Stap 4  
**Afhankelijk van:** EPIC-02 (eigenaarschap)  
**Aantal tickets:** 8

**Doel:** Product, Variant, Category, OwnershipRecord, Claim, Dispute, MatchCandidate, ProductOrigin; Seller-productbeheer-UI.

**Blueprint-bronnen:** 02-database-model.md Deel B; 03-functional-specs/product-cloud-architecture/spec.md, product-management/spec.md; 03-functional-specs/seller-dashboard/spec.md

**Tickets:** `S3-03-01`, `S3-03-02`, `S3-03-03`, `S3-03-04`, `S3-03-05`, `S3-03-06`, `S3-03-07`, `S3-03-08`

---

## EPIC-04 — Commerce Cloud / Buy Box-service

**Fase:** Fase 1 — Stap 5  
**Afhankelijk van:** EPIC-03 (Identifier-koppeling)  
**Aantal tickets:** 5

**Doel:** Offer, Inventory, Price, BuyBoxResult-berekening.

**Blueprint-bronnen:** 02-database-model.md Deel C; product-cloud-commerce-cloud-buy-box/spec.md; ADR 0001/0002/0004/0005

**Tickets:** `S3-04-01`, `S3-04-02`, `S3-04-03`, `S3-04-04`, `S3-04-05`

---

## EPIC-05 — Order-service (incl. Retouren & Berichten)

**Fase:** Fase 1 — Stap 6  
**Afhankelijk van:** EPIC-04 (Offer-snapshot), EPIC-00 (ADR-01 PSP)  
**Aantal tickets:** 9

**Doel:** OrderSet/Order, Checkout/Winkelwagen/Orderbevestiging-backend, Order Management Center, Retouren & Refunds, Berichten, Buyer Dashboard.

**Blueprint-bronnen:** 02-database-model.md Deel D, Deel G.9; checkout/winkelwagen/orderbevestiging/spec.md; order-management-center/spec.md; returns-and-refunds/spec.md; messaging-reviews-qa/spec.md §1; buyer-dashboard/spec.md

**Tickets:** `S3-05-01`, `S3-05-02`, `S3-05-03`, `S3-05-04`, `S3-05-05`, `S3-05-06`, `S3-05-07`, `S3-05-08`, `S3-05-09`

---

## EPIC-06 — Review-service

**Fase:** Fase 1 — Stap 7  
**Afhankelijk van:** EPIC-05 (OrderSplit)  
**Aantal tickets:** 3

**Doel:** Product-/Verkopersreview, koppeling aan Buy Box-score.

**Blueprint-bronnen:** 02-database-model.md Deel E.1; messaging-reviews-qa/spec.md §2

**Tickets:** `S3-06-01`, `S3-06-02`, `S3-06-03`

---

## EPIC-07 — Affiliate-service

**Fase:** Fase 1 — Stap 8  
**Afhankelijk van:** EPIC-05 (OrderSplit), EPIC-00-aanvullend (ADR-53/54, apart te besluiten — zie ticket S3-07-00)  
**Aantal tickets:** 7

**Doel:** Affiliate/AffiliateLink/Click/Conversion/Coupon/ConsentRecord, Affiliate Dashboard, Cookie Consent.

**Blueprint-bronnen:** 01-domain-model.md §26-31/35; 02-database-model.md Deel G.1-G.5/G.10; affiliate-platform/spec.md; gdpr-compliance/spec.md §3; ADR-52 (besloten)

**Tickets:** `S3-07-00`, `S3-07-01`, `S3-07-02`, `S3-07-03`, `S3-07-04`, `S3-07-05`, `S3-07-06`

---

## EPIC-08 — Finance-service

**Fase:** Fase 1 — Stap 9  
**Afhankelijk van:** EPIC-05, EPIC-07, EPIC-00 (ADR-01 PSP)  
**Aantal tickets:** 5

**Doel:** Commission/Invoice/Payout, Finance Dashboard.

**Blueprint-bronnen:** 01-domain-model.md §32-33 (Invoice, Payout), §31 (Commission); 02-database-model.md Deel G.6-G.8; finance/spec.md

**Tickets:** `S3-08-01`, `S3-08-02`, `S3-08-03`, `S3-08-04`, `S3-08-05`

---

## EPIC-09 — AI-ondersteuningsservice

**Fase:** Fase 1 — doorlopend vanaf Stap 4  
**Afhankelijk van:** EPIC-03 (aanleiding)  
**Aantal tickets:** 2

**Doel:** AIMetadata-generatie, aanbevelingen — nooit een beslissing.

**Blueprint-bronnen:** 02-database-model.md Deel F.1; 01-domain-model.md domeinobject 22 ('AI ondersteunt, beslist nooit')

**Tickets:** `S3-09-01`, `S3-09-02`

---

## EPIC-10 — Platformbrede gedeelde services

**Fase:** Fase 1 — doorlopend vanaf Stap 3  
**Afhankelijk van:** EPIC-01 (eerste audit-schrijving)  
**Aantal tickets:** 3

**Doel:** AuditLogEntry, Notification — universeel consument van alle overige modules.

**Blueprint-bronnen:** 02-database-model.md Deel F.2-F.3; 04-event-model.md §13

**Tickets:** `S3-10-01`, `S3-10-02`, `S3-10-03`

---

## EPIC-11 — Admin Shell & Admin-modules

**Fase:** Fase 1 — parallel vanaf Stap 3  
**Afhankelijk van:** EPIC-01, EPIC-02 (Partnerbeheer), EPIC-03 (Verification/Moderatie-onderwerp)  
**Aantal tickets:** 5

**Doel:** Generiek modulecontract, Moderatiewachtrij, Verification Center, Admin Dashboard.

**Blueprint-bronnen:** admin-shell/spec.md (v1.1); moderation-center/spec.md (v1.1); verification-center/spec.md (v1.1)

**Tickets:** `S3-11-01`, `S3-11-02`, `S3-11-03`, `S3-11-04`, `S3-11-05`

---

## EPIC-12 — GDPR & Compliance

**Fase:** Fase 1 — parallel, urgent (koppeling ADR-02/53)  
**Afhankelijk van:** EPIC-00 (ADR-02)  
**Aantal tickets:** 3

**Doel:** AVG-verzoekmechanisme, rechtmatige grondslag, bewaartermijnen.

**Blueprint-bronnen:** gdpr-compliance/spec.md; 06-security-architecture.md §10 (v0.2)

**Tickets:** `S3-12-01`, `S3-12-02`, `S3-12-03`

---

## EPIC-13 — Dashboard-Shells (Buyer & Seller)

**Fase:** Fase 1 — vroeg, parallel aan Stap 3-4  
**Afhankelijk van:** EPIC-01  
**Aantal tickets:** 2

**Doel:** Herbruikbare navigatie-/layout-infrastructuur waarop overige dashboardschermen bouwen.

**Blueprint-bronnen:** seller-dashboard/spec.md §3; buyer-dashboard/spec.md; 02-ux/wireframes/sprint-3-p0/ (buyer-*, seller-dashboard-shell-*)

**Tickets:** `S3-13-01`, `S3-13-02`

---
