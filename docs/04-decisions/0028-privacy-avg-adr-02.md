# ADR-0028 — Privacy & AVG (Blueprint ADR-02) — S3-00-02

**Status:** Geaccepteerd  
**Datum:** 2026-07-31  
**Domein:** Privacy, GDPR, Security  
**Sluit af:** Blueprint ADR-02 (`09-adr-overview.md`); `gdpr-compliance/spec.md` §3/§7; `06-security-architecture.md` §10

## Context

Sprint 3 eist een formeel Privacy/AVG-besluit vóór Affiliate-tracking (ADR-53) en vóór EPIC-12 (AVG-verzoeken). De functionele eisen staan in `gdpr-compliance/spec.md`; bewaartermijnen waren Open.

## Beslissing

### 1. Rechtmatige grondslag per verwerking

| Verwerking | Grondslag (AVG art. 6) |
|---|---|
| Account, login, orderuitvoering, fulfillment, facturatie | Contractuitvoering |
| Partner-/Affiliate-onboarding (KvK, IBAN, ID-docs) | Contract + wettelijke verplichting (waar van toepassing) |
| Affiliate click-/conversietrackingcookies | **Toestemming** (ConsentRecord) |
| Fraud-/securitylogging | Gerechtvaardigd belang |
| Marketing buiten ordercontext | Toestemming (buiten MVP tenzij apart gevraagd) |

### 2. Cookie-toestemming

Geen Affiliate-trackingcookie en geen `click`-rij zonder actieve `consent_record` met `consent_given = true`. Zonder toestemming blijft uitsluitend de coupon-attributieroute beschikbaar (ADR-0029).

### 3. Inzage / vergetelheid

AVG-verzoeken (EPIC-12): inzage/export mogelijk; verwijdering van Klant = **anonimiseren** van Order-/Audit-/Conversion-historie, nooit hard delete van audit of wettelijk te bewaren orderbewijs.

### 4. Bewaartermijnen (MVP-defaults)

| Categorie | Termijn |
|---|---|
| Accountactief + gerelateerde operationele data | Duur account + 2 jaar na laatste login |
| Orders, facturen, commissies | 7 jaar (fiscale bewaarplicht NL) |
| Audit log | 7 jaar (append-only) |
| Affiliate clicks zonder conversie | Attributieperiode + 90 dagen |
| ConsentRecord (tracking) | 2 jaar of tot intrekking + 30 dagen |
| Identiteitsdocumenten Partner/Affiliate | Tot afronding onboarding + 1 jaar, daarna wissen tenzij wettelijk langer nodig |

### 5. Verwerkers

Externe verwerkers (PSP, hosting, e-mail, AI) vereisen een verwerkersovereenkomst vóór productie-gebruik van persoonsgegevens (juridisch; EPIC-12).

## Consequenties

- Basis voor ADR-0029 (technisch consent) en EPIC-12.
- Affiliate-implementatie mag geen click schrijven zonder consent.
