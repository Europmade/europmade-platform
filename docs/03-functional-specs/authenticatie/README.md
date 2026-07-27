# Authenticatie-flow

**Status:** v1.1 — definitief bevroren. Derde onderdeel van Sprint 1B.

## Inhoud

- [`spec.md`](./spec.md) — volledige architectuuranalyse (Inloggen, Registreren, e-mailverificatie, wachtwoordherstel, uitloggen, sessiebeheer, Guest Cart Merge-triggermoment, rollen, RBAC, Medusa-vs-maatwerk), componentanalyse, functionele specificatie, **volledige 2FA-strategie** (activatie, herstelcodes, verloren apparaat, nieuw apparaat koppelen, sessiebeheer, edge cases, acceptatiecriteria, Medusa-vs-maatwerk), en wireframes voor acht schermen.

## Belangrijkste architecturale vaststellingen

- **Eén registratieflow.** Iedereen registreert zich eerst als Consument — geen rolkeuze bij registratie. Retailer/Producent-status wordt later, via een aparte Partner Onboarding-flow, aan een bestaand account toegevoegd.
- **E-mailverificatie blokkeert niet het winkelen**, wel het starten van Partner Onboarding.
- **Beheerder-authenticatie is volledig gescheiden** (Medusa Admin) van deze consument-/partnergerichte flow.
- **Guest Cart Merge wordt hier niet opnieuw gespecificeerd** — volledig hergebruikt uit `winkelwagen/spec.md` sectie 5A.
- **2FA:** optioneel en gestimuleerd voor Consument; **verplicht** voor Retailer/Producent (geen Dashboard-toegang zonder actieve 2FA, server-side afgedwongen) en Beheerder. TOTP via authenticator-app, geen sms — credential-datamodel bewust methode-onafhankelijk opgezet, voorbereid op toekomstige passkeys/hardware security keys zonder herontwerp.
- Herstelcodes: eenmalig getoond, elk eenmalig bruikbaar, uitsluitend te regenereren (nooit opnieuw leesbaar op te vragen).
- Wachtwoordwijziging én elke 2FA-wijziging beëindigen alle overige sessies én vertrouwde-apparaat-tokens.
- Verlies van zowel apparaat als herstelcodes vereist een handmatig, door Klantenservice begeleid herstelproces — een bewuste beveiligingskeuze, geen tekortkoming.

## Component-uitkomst

**Eén nieuw component: CMP-040 (Code Input/OTP)** — een gesegmenteerde 6-cijferige code-invoer, aantoonbaar noodzakelijk omdat geen bestaand component gesegmenteerde numerieke invoer met auto-advance/plak-ondersteuning dekt, en op twee concrete plekken binnen dezelfde flow wordt gebruikt. Vooraf vastgelegd in het Design System, vóór de wireframes zijn uitgebreid. Verder volledig hergebruik van CMP-001, 002, 005, 006, 007, 011, plus het Orderbevestiging-succescompositiepatroon.

## Relatie met andere mappen

- Wireframes: [`02-ux/wireframes/sprint-1b/`](../../02-ux/wireframes/sprint-1b/README.md) — bestanden `03-authenticatie-desktop.html`, `-tablet.html`, `-mobile.html` (v1.1, acht schermen per bestand).
- Hergebruikt Guest Cart Merge uit [`winkelwagen/`](../winkelwagen/README.md) sectie 5A.
- Hergebruikt de gast-/accountkeuze-logica uit [`checkout/`](../checkout/README.md) sectie 3.
- Partnerplatform-onboarding (schermen #26–28) is inmiddels eveneens gebouwd en bevroren (`partner-onboarding/`) — voorbereidend blijft uitsluitend het Retailer/Producent Dashboard-skelet en het Admin-skelet (Beheerder-2FA, Medusa Admin).
