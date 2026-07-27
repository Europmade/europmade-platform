# Sprint 1B — Wireframes

**Status: Sprint 1B definitief afgesloten.** Alle vier onderdelen zijn definitief bevroren: Winkelwagen, Orderbevestiging, de volledige Authenticatie-flow (incl. 2FA), en Partner Onboarding.

## Bestanden

| Bestand | Status | Inhoud |
|---|---|---|
| `01-winkelwagen-desktop.html` / `-tablet.html` / `-mobile.html` | **v1.0, definitief bevroren** | Winkelwagen — retailer-gegroepeerd, bewerkbaar (CMP-025 `is-editable`), aantal wijzigen (CMP-039), Guest Cart Merge- en prijswijzigingslogica, drie breakpoints. |
| `02-orderbevestiging-desktop.html` / `-tablet.html` / `-mobile.html` | **v1.3, definitief bevroren** | Orderbevestiging — succesbevestiging, per-deelbestelling ordernummer/aanbieder/levering, BTW-regel met info-icoon (ⓘ) en tooltip, geen nieuwe componenten. |
| `03-authenticatie-desktop.html` / `-tablet.html` / `-mobile.html` | **v1.1, definitief bevroren** | Inloggen, Registreren, Wachtwoord vergeten, Nieuw wachtwoord instellen, Controleer je e-mail, E-mailadres bevestigd, Tweestapsverificatie instellen, Inloggen met 2FA-code — acht schermen per bestand, één nieuw component (CMP-040 Code Input). |
| `04-partner-onboarding-desktop.html` / `-tablet.html` / `-mobile.html` | **v1.1, definitief bevroren** | Welkom, Partner kiezen (meervoudig), Bedrijfsgegevens, Verificatie, Upload documenten, Samenvatting, Statuspagina (In behandeling/Goedgekeurd/Afgekeurd/Aanvullende informatie vereist) — één nieuw component (CMP-041 File Upload, incl. mobiele cameraopname). |

Volledige UX-specificaties: [`03-functional-specs/winkelwagen/spec.md`](../../03-functional-specs/winkelwagen/README.md), [`03-functional-specs/orderbevestiging/spec.md`](../../03-functional-specs/orderbevestiging/README.md), [`03-functional-specs/authenticatie/spec.md`](../../03-functional-specs/authenticatie/README.md), [`03-functional-specs/partner-onboarding/spec.md`](../../03-functional-specs/partner-onboarding/README.md).

## Chronologisch overzicht van Sprint 1B

1. **Winkelwagen** (v1.0) — eerste scherm, sloot de laatste conceptuele leemte in de kernflow. Eén nieuw component: CMP-039 (Quantity Stepper). Guest Cart Merge en prijs-/voorraadwijzigingen volledig uitgewerkt.
2. **Orderbevestiging** (v1.0 → v1.3) — nul nieuwe componenten bij oplevering; BTW-weergave in drie correctierondes verfijnd (toelichtende tekst → structurele regel → label + info-icoon + tooltip), gesynchroniseerd met Checkout (die daardoor eveneens naar v1.3 ging).
3. **Authenticatie-flow incl. 2FA** (v1.0 → v1.1) — één registratieflow zonder rolkeuze; 2FA optioneel voor Consument, verplicht voor Retailer/Producent/Beheerder. Eén nieuw component: CMP-040 (Code Input/OTP).
4. **Partner Onboarding** (v1.0 → v1.1) — meervoudige rolselectie (Retailer/Producent-Merkhouder/Distributeur), volledig uitgewerkte Europese productieverificatie. Eén nieuw component: CMP-041 (File Upload). Bijgewerkt na een onafhankelijke architectuurreview (vijf verbeterpunten: nieuwe status "Aanvullende informatie vereist", verplichte e-mailverificatie-gate, mobiele cameraopname, beveiligingseisen documentuploads, reviewer-checklist).

## Component-toevoegingen deze sprint

CMP-039 (Quantity Stepper), CMP-040 (Code Input/OTP), CMP-041 (File Upload) — Design System van 38 (einde Sprint 1A) naar **41 componenten**.

## Relatie met andere mappen

- Bouwt voort op CMP-025 (`03-functional-specs/checkout/`) en de Buy Box-/Offer-modellen (`03-functional-specs/product-cloud-commerce-cloud-buy-box/`).
- Sluit de volledige MVP-kernflow (Homepage → Categorie/Zoekresultaten → Productpagina → Winkelwagen → Checkout → Orderbevestiging) — bevroren, financieel synchroon.
- Authenticatie-flow (incl. 2FA) en Partner Onboarding zijn beide bevroren en sluiten op elkaar aan (RBAC, verplichte e-mailverificatie, verplichte 2FA vóór Dashboard-toegang).
- Volledige eindrapportage: [`06-development/project-status-and-roadmap.md`](../../06-development/project-status-and-roadmap.md).
