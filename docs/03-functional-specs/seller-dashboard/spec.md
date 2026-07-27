# Seller Dashboard — Functionele Specificatie

**Status:** v1.0, concept
**MVP-status:** Must Have — zonder dit kan geen enkele Retailer/Producent zelfstandig verkopen; dit is de belangrijkste, tot nu toe volledig ontbrekende UI-laag (schermen #30–36, #40, `06-development/project-status-and-roadmap.md`).
**Basis:** Product Cloud Architecture, Product Management-spec, Commerce Cloud/Buy Box-spec (alle al bevroren) — dit document introduceert geen nieuwe architectuur, uitsluitend de seller-facing werkstroom erbovenop.

---

## 1. Doel

Het zelfbedieningsportaal waarmee een Seller (Retailer/Producent/Distributeur) zijn eigen assortiment, voorraad, prijzen en orders beheert — losstaand van de Admin Shell (die is voor Beheerders, `admin-shell/spec.md`).

---

## 2. Rollen & rechten

Retailer, Producent, Distributeur (optelbare rollen, `partner-onboarding/spec.md`) — elk ziet uitsluitend eigen data (eigen producten via eigendomsketen, eigen Offers, eigen Orders als aanbieder), consistent met het resource-eigenaarschapsprincipe (`03-api-model.md` sectie 6).

---

## 3. Kernschermen (dekt roadmap-schermen #30, #31, #32, #34, #35, #40)

| Scherm | Functie | Bouwt voort op |
|---|---|---|
| Dashboard Home (#30) | Overzicht: openstaande taken, KPI's (omzet, orders, voorraadwaarschuwingen) | Admin Shell-modulecontract-patroon (generiek widget-/KPI-concept, hergebruikt voor de Seller-context) |
| Productoverzicht (#31) | Lijst van eigen producten/Offers, filter/zoek | Product Management-spec (CRUD-flow, zoek-/filter-/bulkacties) |
| Product toevoegen — EAN-zoeken (#32) | Nieuw Offer aanmaken op een bestaand Product via Identifier-match | Product Cloud Architecture (matchingpijplijn) |
| Product toevoegen — Retailer Created (#34) | Nieuw Product aanmaken wanneer geen match bestaat | Product Cloud Architecture (Retailer Created-status) |
| Productdetail — commerciële gegevens (#35) | Prijs/voorraad beheren per Offer | Commerce Cloud/Buy Box-spec (Offer, Inventory, Price) |
| Orders (#40) | Eigen orders inzien, status volgen, retour beoordelen | Order Management Center (leespatroon), `returns-and-refunds/spec.md` |

**Buiten scope van dit document, reeds elders gedekt of expliciet Post-MVP:**
- Product toevoegen — CSV-import (#33): Should Have, afhankelijk van het nog niet vastgestelde Import/Export-ADR (Sprint 2, Open).
- Wijzigingsvoorstel indienen (#37): al functioneel beschreven in Product Management-spec, wireframe-uitwerking blijft een aparte, latere UX-taak.
- Verzendinstellingen (#29): bewust buiten scope gehouden bij Partner Onboarding, blijft hier ook buiten scope.

---

## 4. MVP-prioritering

| Onderdeel | Prioriteit |
|---|---|
| Dashboard Home | Must Have |
| Productoverzicht | Must Have |
| Product toevoegen (EAN + Retailer Created) | Must Have |
| Prijs-/voorraadbeheer per Offer | Must Have |
| Orders inzien + retour beoordelen | Must Have |
| CSV-import | Should Have |
| Rapportages (#45) | Should Have |
| Uitbetalingsoverzicht (#50) | Must Have — koppelt aan `finance/spec.md` |
| Berichtencentrum (#42) | Must Have — koppelt aan `messaging-reviews-qa/spec.md` |

---

## 5. Businessregels

Geen nieuwe businessregels — dit document hergebruikt uitsluitend de al bevroren regels van Product Cloud Architecture, Product Management en Commerce Cloud/Buy Box. Elke afwijking daarvan zou een architectuurwijziging zijn, wat dit document expliciet niet doet.
