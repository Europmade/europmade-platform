# Buyer Dashboard — Functionele Specificatie

**Status:** v1.0, concept
**MVP-status:** Must Have — dekt roadmap-schermen #11, #12, #13, #17 ("Nog niet gestart").
**Basis:** Authenticatie-spec (bevroren), Orderbevestiging-spec (bevroren), Order-domeinobject (Sprint 2).

---

## 1. Doel

Het zelfbedieningsgebied voor een Klant: eigen orders, adresgegevens, en het startpunt voor retouren/reviews.

---

## 2. Kernschermen (dekt #11, #12, #13, #17)

| Scherm | Functie | Bouwt voort op |
|---|---|---|
| Mijn bestellingen (#11) | Overzicht van eigen Orders | Order-domeinobject (Sprint 2), resource-eigenaarschap "Klant (eigen)" (`03-api-model.md` Bijlage C) |
| Orderdetail (#12) | Detailweergave van één Order, inclusief track & trace | Order Management Center-detailpatroon; track & trace zelf afhankelijk van Shipment (Status Open) |
| Retour aanmelden (#13) | Start van het retourproces | `returns-and-refunds/spec.md` |
| Account & adresbeheer (#17) | Eigen gegevens/adressen beheren | Authenticatie-spec (bevroren, Customer-domeinobject) |

---

## 3. MVP-prioritering

| Onderdeel | Prioriteit |
|---|---|
| Mijn bestellingen | Must Have |
| Orderdetail | Must Have |
| Retour aanmelden | Must Have |
| Account & adresbeheer | Must Have |
| Track & trace-weergave | Should Have — afhankelijk van Shipment (Open) |
| Productreview/verkopersreview plaatsen (#15/#16) | Must Have — zie `messaging-reviews-qa/spec.md` |

---

## 4. Businessregels

Geen nieuwe businessregels — hergebruikt de al bevroren Order-/Customer-regels. Adreswijziging raakt nooit een reeds geplaatste Order (die blijft een onveranderlijke snapshot, `01-domain-model.md` §15).
