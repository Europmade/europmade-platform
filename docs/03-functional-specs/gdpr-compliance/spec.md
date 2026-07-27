# GDPR & Compliance — Functionele Specificatie

**Status:** v1.0, concept
**MVP-status:** Must Have — reeds het Kritieke ADR-02 in Sprint 2 (`09-adr-overview.md`); deze specificatie vult de functionele kant in, het technische ADR blijft in Sprint 2 leidend.
**Basis:** Blueprint Bijlage A (Security & Privacy), Blueprint H13 (Verified™, Compliance & Europese Regelgeving), `06-security-architecture.md` sectie 10 (Privacy & AVG — expliciet gecontroleerd: geen enkele AVG/GDPR-regel eerder vastgelegd).

---

## 1. Doel

Legt de functionele (niet-technische) AVG/GDPR-vereisten vast waarop Sprint 2's Encryptie- en Privacy-ADR's (ADR-02, ADR-03) hun technische antwoord moeten baseren. Dit document beslist zelf geen ADR — het beschrijft de functionele verplichtingen die ieder ADR moet vervullen.

---

## 2. Reikwijdte

Persoonsgegevens die EuropMade verwerkt: Klant-gegevens (naam, adres, e-mail, bestelgeschiedenis), Seller-/Affiliate-bedrijfsgegevens (KvK, IBAN, identiteitsdocumenten — al onder verhoogde bescherming, `02-database-model.md` Deel A.2), en — nieuw door de Affiliate-scopewijziging — trackingdata (cookies, click-/conversieregistraties, `affiliate-platform/spec.md`).

---

## 3. Functionele vereisten

| Vereiste | Toelichting |
|---|---|
| **Rechtmatige grondslag per verwerking** | Voor accountgegevens: contractuitvoering. Voor tracking-cookies (Affiliate): toestemming (consent) — dit is een nieuwe vereiste, direct veroorzaakt door de Affiliate-scopewijziging. |
| **Cookie-toestemmingsbanner** | Vereist vóórdat een Affiliate-trackingcookie geplaatst mag worden — een bezoeker die geen toestemming geeft, kan uitsluitend via coupon-tracking (geen cookie) aan een Affiliate worden toegeschreven (`affiliate-platform/spec.md` sectie 3, stap 5). |
| **Recht op inzage/vergetelheid** | Een Klant kan eigen gegevens opvragen/laten verwijderen — verwijdering mag nooit een al voltooide Order-snapshot of Audit Log-vermelding ongeldig maken (spanning met het "nooit stilzwijgend overschrijven"-principe; oplossing: anonimiseren, niet verwijderen, van historische records). |
| **Bewaartermijnen** | Nog niet vastgesteld per gegevenscategorie — expliciet Openstaand punt. |
| **Verwerkersovereenkomsten** | Vereist met elke externe partij die persoonsgegevens verwerkt: PSP, verzender, AI-validatie-API, externe zoekservice (allemaal al genoemd in `08-integration-architecture.md`). |

---

## 4. Koppeling met Sprint 2

Dit document **vervangt geen enkel Sprint 2-besluit** — het levert de functionele input voor:
- **ADR-02 (Privacy & AVG, Kritiek)** — de rechtmatige-grondslag- en bewaartermijn-vereisten hierboven.
- **ADR-03 (Encryptie, Kritiek)** — welke gegevenscategorieën versleuteld moeten worden (alle in sectie 2 genoemde categorieën).
- **Nieuw: consent-mechanisme** — een technisch antwoord op de cookie-toestemmingsvereiste bestaat nog niet in Sprint 2 en moet daar als aanvullend ADR-kandidaat worden opgenomen (zie Fase 3 van deze afronding).

---

## 5. MVP-prioritering

| Onderdeel | Prioriteit |
|---|---|
| Cookie-toestemmingsbanner (vereist door Affiliate-tracking) | Must Have |
| Rechtmatige grondslag vastgelegd per verwerking | Must Have |
| Recht op inzage/vergetelheid (basisproces) | Must Have |
| Verwerkersovereenkomsten met externe partijen | Must Have (juridisch, geen technisch bouwwerk) |
| Volledig zelfbedienings-privacydashboard voor de Klant | Could Have |

---

## 6. Openstaande punten

- Exacte bewaartermijnen per gegevenscategorie.
- Welke van de zes launch-landen aanvullende, landspecifieke privacyregels stelt (buiten de generieke AVG) — niet onderzocht in dit document.
- Het technische consent-mechanisme zelf — nog te ontwerpen in Sprint 2 (zie Fase 3).
