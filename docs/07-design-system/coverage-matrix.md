# EuropMade — Component Coverage Matrix

**Status:** Definitief. Doorlopend bijgewerkt bij elk nieuw scherm — laatste update: Partner Onboarding, sluitend Sprint 1B (definitief afgesloten).
**Doel:** per scherm vaststellen welke Design System-componenten worden gebruikt, welke varianten daarbij horen, en garanderen dat er geen dubbele/overlappende componenten ontstaan naarmate het platform groeit.

## Legenda

| Label | Betekenis |
|---|---|
| **Reeds toegepast** | Component staat al in een daadwerkelijk gebouwd, bevroren wireframe (Productpagina en/of Checkout). |
| **Kan worden hergebruikt** | Component bestaat, is functioneel/structureel geschikt voor dit scherm, en kan zonder wijziging worden ingezet zodra dat scherm ontworpen wordt. |
| **Nog niet toegepast** | Component staat in het Design System maar is nergens toegepast (status "Voorbereid" — CMP-015, CMP-019, CMP-024), of is relevant voor een scherm dat nog niet ontworpen is (Dashboards). |
| **Ontbreekt** | Het scherm heeft een component nodig die nog geen CMP-ID heeft — een echte lacune. |
| **–** | Component is architecturaal niet relevant voor dit scherm (geen beoordeling nodig). |

---

## Matrix

| CMP | Component | Homepage | Zoekresultaten | Categoriepagina | Productpagina | Checkout | Winkelwagen | Orderbevestiging | Authenticatie | Partner Onboarding | Dashboards |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 001 | Header (Publiek) | Reeds toegepast | Reeds toegepast | Reeds toegepast | Reeds toegepast | Reeds toegepast | Reeds toegepast | Reeds toegepast | Reeds toegepast (minimale variant) | Reeds toegepast (minimale variant) | – |
| 002 | Footer (Publiek) | Reeds toegepast | Reeds toegepast | Reeds toegepast | Reeds toegepast | – | Reeds toegepast | Reeds toegepast | – | – | – |
| 003 | Breadcrumb | – | – (bewust afwezig, spec sectie 2.2) | Reeds toegepast | Reeds toegepast | Reeds toegepast | – | – | – | – | Nog niet toegepast |
| 004 | Stepper | – | – | – | – | Reeds toegepast | – | – | – | Reeds toegepast | Kan worden hergebruikt |
| 005 | Button | Reeds toegepast | Reeds toegepast | Reeds toegepast | Reeds toegepast | Reeds toegepast | Reeds toegepast | Reeds toegepast | Reeds toegepast | Reeds toegepast | Kan worden hergebruikt |
| 006 | Form Field | – | Reeds toegepast (sorteerkeuze) | Reeds toegepast (sorteerkeuze) | – | Reeds toegepast | – | – | Reeds toegepast | Reeds toegepast | Kan worden hergebruikt |
| 007 | Checkbox | – | Reeds toegepast (filters) | Reeds toegepast (filters) | – | Reeds toegepast | – | – | Reeds toegepast | Reeds toegepast | Kan worden hergebruikt |
| 008 | Badge | Reeds toegepast | Reeds toegepast | Reeds toegepast | Reeds toegepast | Reeds toegepast | Reeds toegepast | Reeds toegepast | – | Reeds toegepast | Kan worden hergebruikt |
| 009 | Tabs | – | – | – | Reeds toegepast | – | – | – | – | – | Kan worden hergebruikt |
| 010 | Table | – | – | – | Reeds toegepast | – | – | – | – | – | Kan worden hergebruikt |
| 011 | Notice | Reeds toegepast | Reeds toegepast | Reeds toegepast | Reeds toegepast | Reeds toegepast | Reeds toegepast | Reeds toegepast | Kan worden hergebruikt | Reeds toegepast | Kan worden hergebruikt |
| 012 | Avatar | – | Reeds toegepast | Reeds toegepast | Reeds toegepast | Reeds toegepast | Reeds toegepast | Reeds toegepast | – | – | Kan worden hergebruikt |
| 013 | Buy Box | – | – | – | Reeds toegepast | – | – | – | – | – | Kan worden hergebruikt (positie-indicator) |
| 014 | Offer Card / Offer Comparison Row | – | – | – | Reeds toegepast | – | – | – | – | – | – |
| 015 | Retailer Card | Reeds toegepast | – | – | Nog niet toegepast | – | – | – | – | – | – |
| 016 | Retailer Indicator | – | Reeds toegepast | Reeds toegepast | Reeds toegepast | Reeds toegepast | Reeds toegepast | Reeds toegepast | – | – | Kan worden hergebruikt |
| 017 | Product Card | Reeds toegepast | Reeds toegepast | Reeds toegepast | Reeds toegepast | – | – | – | – | – | – |
| 018 | Verified™ Badge | Reeds toegepast | Reeds toegepast | Reeds toegepast | Reeds toegepast | – | – | – | – | – | Kan worden hergebruikt |
| 019 | Product Quality Score | – | – | – | – | – | – | – | – | – | Nog niet toegepast |
| 020 | Shipping Badge | – | Reeds toegepast | Reeds toegepast | Reeds toegepast | Reeds toegepast | Reeds toegepast | Reeds toegepast | – | – | – |
| 021 | Delivery Estimate | – | Reeds toegepast | Reeds toegepast | Reeds toegepast | Reeds toegepast | Reeds toegepast | Reeds toegepast (berekende datumrange) | – | – | – |
| 022 | Country of Production Badge | Reeds toegepast | Reeds toegepast | Reeds toegepast | Reeds toegepast | – | – | – | – | – | – |
| 023 | Manufacturer Badge | – | Kan hergebruikt | Kan hergebruikt | Reeds toegepast | – | – | – | – | – | – |
| 024 | Product Owner Badge | – | – | – | – | – | – | – | – | – | Nog niet toegepast |
| 025 | Besteloverzicht / Order Summary | – | – | – | – | Reeds toegepast | Reeds toegepast (`is-editable`) | Reeds toegepast (`is-confirmed`) | – | – | Kan worden hergebruikt (orderdetail) |
| 026 | Choice Card | – | – | – | – | Reeds toegepast | – | – | – | Reeds toegepast (meervoudige variant) | Kan worden hergebruikt |
| 027 | Saved Address Selector | – | – | – | – | Reeds toegepast | – | – | – | – | Kan worden hergebruikt |
| 028 | Sticky Bottom Bar | – | – | – | Reeds toegepast | – | Reeds toegepast (mobiel) | – | – | – | – |
| 029 | Summary Bar | – | – | – | – | Reeds toegepast | – | – | – | – | – |
| 030 | Review Block | – | – | – | – | Reeds toegepast | – | Reeds toegepast (variant zonder wijzigen-link) | – | Reeds toegepast | Kan worden hergebruikt |
| 031 | Gallery | – | – | – | Reeds toegepast | – | – | – | – | – | Kan worden hergebruikt (media-upload) |
| 032 | Category Tile | Reeds toegepast | – | – | – | – | – | – | – | – | – |
| 033 | Advertisement Banner Slot | Reeds toegepast | – (bewust afwezig, geen Blueprint-basis) | Reeds toegepast (categorie-Slider) | – | – | – | – | – | – | – |
| 034 | Filters | – | Reeds toegepast | Reeds toegepast | – | – | – | – | – | – | Kan worden hergebruikt |
| 035 | Pagination | – | Reeds toegepast | Reeds toegepast | – | – | – | – | – | – | Kan worden hergebruikt |
| 036 | Empty State | – | Reeds toegepast | Reeds toegepast | – | – | Kan worden hergebruikt (lege winkelwagen) | – | – | – | Kan worden hergebruikt |
| 037 | Variant Selector | – | – | – | Reeds toegepast | – | – (bewust buiten scope, spec sectie 1.4) | – | – | – | Kan worden hergebruikt |
| 038 | Expandable Text / Show More | – | – | – | Reeds toegepast | – | – | – | – | – | Kan worden hergebruikt |
| 039 | Quantity Stepper | – | – | – | – | – | Reeds toegepast | – | – | – | Kan worden hergebruikt |
| 040 | Code Input (OTP) | – | – | – | – | – | – | – | Reeds toegepast (2FA) | – | Kan worden hergebruikt (Beheerder-2FA) |
| 041 | File Upload | – | – | – | – | – | – | – | – | Reeds toegepast (Partner Onboarding — desktop/tablet drag-and-drop, mobiel cameraopname) | Kan worden hergebruikt |


---

## Geïdentificeerde lacunes ("Ontbreekt")

Geen enkele bestaande component is verkeerd toegepast of ontbreekt voor Productpagina/Checkout (die zijn immers al gebouwd en bevroren). Voor de nog te ontwerpen schermen zijn de volgende **echte lacunes** gevonden — componenten die een scherm nodig heeft, maar die nog geen CMP-ID hebben:

| Scherm | Ontbrekend (historisch) | Toelichting |
|---|---|---|
| ~~Homepage~~ | ~~Category Tile~~ | **Opgelost** — CMP-032, toegepast in Homepage v1.0. |
| ~~Zoekresultaten~~ | ~~Filters, Pagination, Empty State~~ | **Opgelost** — CMP-034/035/036, toegepast in Marketplace Listing Template v1.0. |
| ~~Categoriepagina~~ | ~~Filters, Pagination, Empty State~~ | **Opgelost** — zelfde componenten, gedeelde template. |
| Dashboards | **Sidebar-navigatie**, **Topbar/Notificatiebel**, **Stat/KPI-tile**, **Toggle/switch**, **Bestands-/afbeeldingsuploader**, **Chart/grafiek**, **Approval/review-kaart** | Verwacht en niet verontrustend: Dashboards zijn Sprint 1B/2/3-scope, nog geen enkel dashboardscherm is ontworpen. Deze lacunes bevestigen alleen dat het Design System nog niet vooruit is gebouwd op aannames — precies de bedoeling van de vastleggingsregel. |

**Belangrijk:** conform "geen nieuwe componenten toevoegen tenzij aantoonbaar noodzakelijk" worden bovenstaande lacunes **hier niet ingevuld met nieuwe componentdefinities**. Ze worden toegevoegd aan het Design System op het moment dat het betreffende scherm daadwerkelijk wordt ontworpen (Category Tile bij de Homepage, Filters/Pagination/Empty State bij Zoekresultaten) — exact dezelfde werkwijze als bij Stepper, dat pas bij Checkout ontstond.

---

## Conclusie: is het Design System voldoende voor de resterende Sprint 1A-schermen?

**Ja, met een normale, verwachte aanvulling per scherm — geen structureel tekort.**

- **21 van de 31 bestaande componenten** zijn direct herbruikbaar voor Homepage, Zoekresultaten en/of Categoriepagina zonder wijziging (Header, Footer, Button, Badge, Notice, Product Card, Verified™ Badge, Country of Production Badge, Manufacturer Badge, Shipping Badge, Delivery Estimate, Retailer Indicator, Breadcrumb, Avatar, Checkbox).
- **Homepage** heeft één aantoonbare lacune (Category Tile).
- **Zoekresultaten en Categoriepagina** delen dezelfde drie lacunes (Filters, Pagination, Empty State) — logisch, want ze gebruiken dezelfde Marketplace Template (Wireframe Strategy, sectie 3).
- Dit zijn **kleine, verwachte aanvullingen**, geen teken dat Design System v1.0 onvolledig is opgezet — de bestaande 31 componenten vormen een stabiel fundament waar deze paar nieuwe bovenop komen, niet een fundament dat herzien moet worden.
- **Dashboards** (Sprint 1B) hebben wél aanzienlijke lacunes, maar dat is verwacht: er is nog geen dashboardscherm ontworpen, dus er is nog niets om tegen te toetsen. Dit is geen actiepunt vóór de Homepage.

**Het Design System v1.0 is stabiel genoeg om met de Homepage te starten.** De Homepage zal één nieuw component (Category Tile) introduceren volgens de bestaande, beproefde werkwijze — pas vastgesteld ná toepassing in het wireframe, met een eigen CMP-ID (CMP-032) op dat moment.

---

## Status: Sprint 1B definitief afgesloten — Design System op 41 componenten

Alle Sprint 1A-lacunes zijn ingevuld (zie boven). Over de vier Sprint 1B-onderdelen: **Winkelwagen** introduceerde CMP-039 (Quantity Stepper). **Orderbevestiging** en de basis-Authenticatieschermen introduceerden nul nieuwe componenten. **De 2FA-strategie** introduceerde CMP-040 (Code Input/OTP). **Partner Onboarding** introduceerde CMP-041 (File Upload) plus een meervoudige-selectie-uitbreiding op CMP-026. De onafhankelijke architectuurreview op Partner Onboarding leidde tot vijf verwerkte verbeterpunten, **geen daarvan tot een nieuw component** — uitsluitend een mobiele variant-uitbreiding op CMP-041. **Design System: 41 componenten, definitief voor Sprint 1B.**

**Dubbel-check op overlappende/dubbele componenten (bevestigd, geen samenvoeging nodig):** CMP-039 (Quantity Stepper) vs. generieke Form Field — functioneel verschillend (voorraadgebonden increment/decrement vs. vrije invoer). CMP-040 (Code Input) vs. Form Field — gesegmenteerde numerieke code vs. vrije tekst. CMP-041 (File Upload) vs. CMP-006/CMP-040 — bestandsupload vs. tekst-/codeinvoer. Alle drie nieuwe componenten uit Sprint 1B zijn aantoonbaar onderscheiden van bestaande componenten en van elkaar.

**Volgende stap:** Sprint 1C (zie `06-development/project-status-and-roadmap.md` voor de volledige eindrapportage en openstaande onderwerpen).
