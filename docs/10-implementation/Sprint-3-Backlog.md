# Sprint 3 — Backlog

**Status:** v1.1 — bijgewerkt na de laatste implementatievolgorde-review, vóór de start van de bouw. Geprioriteerde uitvoeringsvolgorde van alle 69 tickets, direct afgeleid van de Bouwvolgorde (`01-implementation-strategy.md` sectie 4) en de Fase-indeling (`10-technical-roadmap.md`).

**Review-correctie (v1.1):** een volledige afhankelijkhedengrafiek van alle 69 tickets bracht 12 tickets aan het licht die afhingen van een later gepland ticket (Admin Shell, Audit/Notificatie-datamodel, Buyer-/Seller Dashboard-shells stonden allemaal bijna aan het eind, terwijl EPIC-02/03/05/06/08/09 er al veel eerder van afhankelijk waren). Zes tickets zijn daarom verplaatst (gemarkeerd hieronder) — geen enkel ticket toegevoegd, verwijderd of inhoudelijk gewijzigd. Na deze correctie: **0 resterende afhankelijkheidsschendingen** (geverifieerd via een topologische controle over de volledige lijst).

Volgorde = afhankelijkheidsvolgorde, niet toewijzing aan individuele sprints/weken (dat is een latere planningsstap, buiten deze Blueprint-gebaseerde backlog). **Vanaf hier bevroren — implementatie start direct.**

---

| # | Ticket | Titel | Epic | Afhankelijk van |
|---|---|---|---|---|
| 1 | S3-00-01 | ADR-01 besluiten — Integratiebeveiliging/Event Security | EPIC-00 | Geen |
| 2 | S3-00-02 | ADR-02 besluiten — Privacy & AVG | EPIC-00 | Geen |
| 3 | S3-00-03 | ADR-03 besluiten — Encryptie | EPIC-00 | Geen |
| 4 | S3-00-04 | ADR-13 besluiten — Sessiebeheer | EPIC-00 | Geen |
| 5 | S3-00-05 | Workspace-/tooling-gereedheid (retroactief, CR-001) | EPIC-00 | Geen |
| 6 | S3-00-06 | pnpm build-configuratiefouten oplossen (retroactief, CR-002) | EPIC-00 | S3-00-05 |
| 7 | S3-01-01 | Datamodel: Customer, Session | EPIC-01 | S3-00-04 |
| 8 | S3-01-02 | API: Registratie- en inlog-endpoints | EPIC-01 | S3-01-01 |
| 9 | S3-01-03 | 2FA-implementatie | EPIC-01 | S3-01-02 |
| 10 | S3-01-04 | RBAC-basisimplementatie | EPIC-01 | S3-01-02 |
| 11 | S3-01-05 | UI: Inloggen/Registreren/Wachtwoord vergeten | EPIC-01 | S3-01-02, S3-01-03 |
| 12 | S3-01-06 | Cookie-consent-integratie in de eerste-bezoek-flow | EPIC-01 | S3-01-01, S3-00-02 |
| 13 | S3-11-01 | Admin Shell — generiek modulecontract **(verplaatst — review implementatievolgorde)** | EPIC-11 | S3-01-04 (RBAC) |
| 14 | S3-10-01 | Datamodel + logica: AuditLogEntry **(verplaatst — review implementatievolgorde)** | EPIC-10 | S3-01-01 |
| 15 | S3-10-02 | Datamodel + logica: Notification **(verplaatst — review implementatievolgorde)** | EPIC-10 | S3-01-01 |
| 16 | S3-13-01 | Buyer Dashboard-shell **(verplaatst — review implementatievolgorde)** | EPIC-13 | S3-01-05 |
| 17 | S3-02-01 | Datamodel: Seller, Company, Brand, Manufacturer | EPIC-02 | S3-01-01 |
| 18 | S3-02-02 | API + logica: Partner Onboarding-statusverloop | EPIC-02 | S3-02-01, S3-01-02 |
| 19 | S3-02-03 | UI: Partner Onboarding-flow | EPIC-02 | S3-02-02 |
| 20 | S3-13-02 | Seller Dashboard-shell **(verplaatst — review implementatievolgorde)** | EPIC-13 | S3-01-05, S3-02-03 |
| 21 | S3-02-04 | API: Partnerbeheer (admin, lezend) | EPIC-02 | S3-02-02 |
| 22 | S3-02-05 | UI: Partnerbeheer (Overzicht/Detail/Goedkeuren/Afwijzen/Blokkeren) | EPIC-02 | S3-02-04, S3-11-01 (Admin Shell) |
| 23 | S3-03-01 | Datamodel: Product, Variant, Category, Attribute | EPIC-03 | S3-02-01 |
| 24 | S3-03-02 | Datamodel: OwnershipRecord, Claim, Dispute, MatchCandidate, ModerationCase, ProductOrigin | EPIC-03 | S3-03-01 |
| 25 | S3-03-03 | EAN-matchingpijplijn | EPIC-03 | S3-03-02 |
| 26 | S3-03-04 | API: Product-CRUD + Retailer Created-flow | EPIC-03 | S3-03-03 |
| 27 | S3-03-05 | UI: Seller Dashboard — Productoverzicht + EAN-zoeken | EPIC-03 | S3-03-04, S3-13-02 (Seller-shell) |
| 28 | S3-03-06 | UI: Nieuw product aanmaken + Productdetail commercieel | EPIC-03 | S3-03-05 |
| 29 | S3-03-07 | Moderation Center-koppeling (productgerelateerde signalen) | EPIC-03 | S3-03-04, S3-11-01 |
| 30 | S3-03-08 | Verification Center-koppeling (Verified™-workflow) | EPIC-03 | S3-03-04, S3-11-01 |
| 31 | S3-04-01 | Datamodel: Offer, Inventory, Price | EPIC-04 | S3-03-01 |
| 32 | S3-04-02 | Buy Box-berekeningsengine (server-side only) | EPIC-04 | S3-04-01 |
| 33 | S3-04-03 | API: Offer-CRUD (prijs/voorraad) | EPIC-04 | S3-04-02 |
| 34 | S3-04-04 | UI: Productdetail — Buy Box-positie-weergave | EPIC-04 | S3-04-03, S3-03-06 |
| 35 | S3-04-05 | Buy Box-cache-persistentie | EPIC-04 | S3-04-02 |
| 36 | S3-05-01 | Datamodel: OrderSet, Order, Message | EPIC-05 | S3-04-01 |
| 37 | S3-05-02 | API + logica: Checkout, ordersplitsing, uitzonderingsafhandeling | EPIC-05 | S3-05-01, S3-00-01 (ADR-01 PSP-keuze) |
| 38 | S3-05-03 | UI: Checkout, Winkelwagen, Orderbevestiging | EPIC-05 | S3-05-02 |
| 39 | S3-05-04 | Retouren & Refunds — datamodel en API | EPIC-05 | S3-05-02 |
| 40 | S3-05-05 | UI: Buyer Dashboard — Mijn bestellingen + Retour aanmelden | EPIC-05 | S3-05-04, S3-13-01 (Buyer-shell) |
| 41 | S3-05-06 | UI: Seller Dashboard — Orders + Retour beoordelen | EPIC-05 | S3-05-04, S3-13-02 |
| 42 | S3-05-07 | Berichten — datamodel, API en UI (buyer + seller) | EPIC-05 | S3-05-01 |
| 43 | S3-05-08 | Order Management Center — UI (admin) | EPIC-05 | S3-05-02, S3-11-01 |
| 44 | S3-05-09 | Notificatiekoppeling voor Order-gebeurtenissen | EPIC-05 | S3-05-02, S3-05-04, S3-05-07, S3-10-01 |
| 45 | S3-06-01 | Datamodel: Review | EPIC-06 | S3-05-01 |
| 46 | S3-06-02 | API: Review plaatsen (na aankoop) | EPIC-06 | S3-06-01, S3-05-02 |
| 47 | S3-06-03 | UI: Productreview en Verkopersreview plaatsen | EPIC-06 | S3-06-02, S3-13-01 |
| 48 | S3-07-00 | ADR-53/54 besluiten — Cookie-consent-mechanisme & commissiepercentage | EPIC-07 | S3-00-02 (ADR-02) |
| 49 | S3-07-01 | Datamodel: Affiliate, AffiliateLink, Click, Conversion, Coupon, ConsentRecord | EPIC-07 | S3-05-01, S3-07-00 |
| 50 | S3-07-02 | API + logica: Registratie, linkgeneratie, click-/coupon-tracking | EPIC-07 | S3-07-01 |
| 51 | S3-07-03 | Conversie-attributie + commissieberekening | EPIC-07 | S3-07-02, S3-05-02 |
| 52 | S3-07-04 | UI: Affiliate-registratie | EPIC-07 | S3-07-02, S3-01-05 |
| 53 | S3-07-05 | UI: Affiliate Dashboard, Statistieken, Commissies, Links | EPIC-07 | S3-07-03, S3-07-04 |
| 54 | S3-07-06 | Click-fraude- en coupon-misbruikpreventie | EPIC-07 | S3-07-02, S3-03-07 (Moderation Center) |
| 55 | S3-08-01 | Datamodel: Commission, Invoice, Payout | EPIC-08 | S3-07-01 |
| 56 | S3-08-02 | Commissieberekening — Seller (vast 10%) + Affiliate | EPIC-08 | S3-08-01, S3-05-02, S3-07-03 |
| 57 | S3-08-03 | Facturatie — klant-factuur en Seller-commissiefactuur | EPIC-08 | S3-08-02 |
| 58 | S3-08-04 | Uitbetaling — Seller en Affiliate | EPIC-08 | S3-08-02, S3-00-01 (PSP) |
| 59 | S3-08-05 | UI: Finance Dashboard (Seller-zijde) | EPIC-08 | S3-08-03, S3-08-04, S3-13-02 |
| 60 | S3-09-01 | Datamodel + API: AIMetadata | EPIC-09 | S3-03-01 |
| 61 | S3-10-03 | UI: Meldingencentrum | EPIC-10 | S3-10-02, S3-13-01, S3-13-02 |
| 62 | S3-11-02 | UI: Admin Dashboard Home | EPIC-11 | S3-11-01 |
| 63 | S3-09-02 | Integratie AI-advies in Moderatiewachtrij en Verification Center **(verplaatst — review implementatievolgorde)** | EPIC-09 | S3-09-01, S3-11-02 |
| 64 | S3-11-03 | UI: Moderatiewachtrij (Overzicht, Detail, Bulk-acties, Besluit) | EPIC-11 | S3-03-07, S3-11-01 |
| 65 | S3-11-04 | UI: Verification Center (hergebruik Sprint 1C-wireframes) | EPIC-11 | S3-03-08, S3-11-01 |
| 66 | S3-11-05 | Compliance Dashboard — functionele afbakening | EPIC-11 | S3-11-01 |
| 67 | S3-12-01 | AVG-verzoekmechanisme — backend | EPIC-12 | S3-00-02, S3-10-01 |
| 68 | S3-12-02 | UI: AVG-verzoek indienen + Verzoekstatus | EPIC-12 | S3-12-01 |
| 69 | S3-12-03 | Verwerkersovereenkomsten — juridisch, niet technisch | EPIC-12 | S3-00-01, S3-00-02 |

**Totaal: 69 tickets over 14 Epics** (67 oorspronkelijk + 2 retroactief: S3-00-05/CR-001, S3-00-06/CR-002, zie Sprint-3-Change-Requests.md).
