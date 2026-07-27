# EuropMade — Wireframe-strategie

**Status:** Ter goedkeuring — nog geen wireframes getekend.
**Basis:** Blueprint v2.1 (definitief), UX-architectuur (`../ux-architecture.md`, definitief), Functionele specificatie Product Cloud/Commerce Cloud/Buy Box (`../../03-functional-specs/product-cloud-commerce-cloud-buy-box/spec.md`, definitief).
**Doel:** vastleggen in welke volgorde en met welke bouwstenen de wireframes ontworpen worden, vóórdat het eerste scherm wordt getekend.

---

## 1. MVP-prioritering

Alle 68 schermen uit de scherminventarisatie (`ux-architecture.md`, sectie 5) zijn verdeeld over Sprint 1–3 en Post-MVP. De verdeling volgt drie criteria, in deze volgorde van zwaarte:

1. **Afhankelijkheid** — kan een scherm functioneren zonder dat een ander scherm al bestaat?
2. **Risico** — bevat het scherm het grootste architecturale risico (Buy Box/order-splitsing, zie `01-architecture/standard-vs-custom.md`) en moet het daarom vroeg gevalideerd worden?
3. **Blueprint-prioriteit** (Must/Should/Could Have, `ux-architecture.md` sectie 5) — leidend binnen elke afhankelijkheidslaag, niet los daarvan.

**Sprint 1 richt zich op de "walking skeleton"**: het kleinst mogelijke, maar volledig doorlopende pad — een bezoeker kan een product vinden, kopen, en er is minimaal één retailer die dat product kan leveren, goedgekeurd door een administrator. Dit valideert het grootste risico (Buy Box + order-splitsing, zie ADR-achtergrond in de functionele spec) het vroegst mogelijk.

**Sprint 2 maakt de Must Have-laag compleet**: alles wat nodig is om een bestelling volledig af te handelen (tracking, retour, communicatie, reviews) en het Product Cloud-eigenaarschapsmodel werkend te krijgen (claims, wijzigingsvoorstellen).

**Sprint 3 voegt de Should Have-laag toe**: vertrouwens- en compliance-elementen (Verified™, Compliance Dashboard) en de tweede inkomstenbron (advertenties) — nodig vóór commerciële lancering, niet blokkerend voor het eerste doorlopende testpad.

**Post-MVP**: expliciet uitgesteld per Blueprint (H15.7, H15A.12) of Could Have-schermen met de laagste directe gebruikerswaarde.

### Sprint 1 — Walking skeleton (22 schermen)

**Opgesplitst in Sprint 1A en Sprint 1B** (vastgesteld na akkoord op deze strategie): de Productpagina en Buy Box vormen het grootste onderscheidende vermogen van EuropMade en worden daarom als eerste, geïsoleerd van de rest van het skelet, volledig beoordeeld voordat verder wordt gegaan. Sprint 1B start pas na expliciet akkoord op Sprint 1A.

#### Sprint 1A — Marketplace Core

**Herziene ontwerpvolgorde binnen Sprint 1A** (vastgesteld na eerste review van de Design System Foundation): de Productpagina en Buy Box worden ontworpen **vóór** Homepage, Zoekresultaten en Categoriepagina — niet in de oorspronkelijke afhankelijkheidsvolgorde. Reden: de Productpagina/Buy Box zijn het hart van EuropMade; wanneer deze volledig staan, volgen de vindbaarheids-schermen (Homepage, Zoekresultaten, Categorie) daar inhoudelijk én visueel logischer uit, in plaats van andersom.

| Volgorde | Onderdeel | Waarom als eerste, geïsoleerd blok |
|---|---|---|
| 1 | Design System Foundation (incl. domeinspecifieke componenten) | Fundament waar elk volgend onderdeel op leunt — moet compleet vaststaan vóórdat enig scherm wordt getekend |
| 2 | Productpagina (#5) | **Het meest kritieke scherm van het platform** — hier wordt het onderscheidend vermogen zichtbaar; bewust vóór Homepage ontworpen |
| 3 | Buy Box (onderdeel van #5, apart benoemd) | **Grootste architectuur- en UX-risico** — verdient volledige, geïsoleerde aandacht vóórdat andere schermen erop voortbouwen |
| 4 | Checkout (#7) | Toont direct of de Buy Box-keuze correct doorwerkt in de order-splitsing per aanbieder |
| 5 | Homepage (#1) | Eerste toepassing van de Marketplace Template — nu logischer te ontwerpen omdat vaststaat waar de homepage naartoe moet leiden (Productpagina) |
| 6 | Zoekresultaten (#2) | Eerste manier om bij een product te komen, hergebruikt Product Card uit de nu al bestaande Productpagina/Buy Box-componenten |
| 7 | Categoriepagina (#3) | Tweede manier om bij een product te komen, zelfde template als #6 |

**Subcategoriepagina (#4), Winkelwagen (#6) en Orderbevestiging (#8)** verschuiven bewust naar Sprint 1B: ze zijn functioneel triviale uitbreidingen op resp. Categoriepagina, Checkout en Checkout, en voegen niets toe aan de beoordeling van het kernonderscheidend vermogen (Productpagina/Buy Box) die nu vooropstaat.

#### Sprint 1B — Marketplace Core (restant) + Partner/Admin-skelet

**Voortgang:** Winkelwagen (#6) is bevroren (v1.0) — zie [`03-functional-specs/winkelwagen/spec.md`](../../03-functional-specs/winkelwagen/README.md). Orderbevestiging (#8) is **definitief bevroren (v1.3, na twee UX-correctierondes op de BTW-weergave)** — zie [`03-functional-specs/orderbevestiging/spec.md`](../../03-functional-specs/orderbevestiging/README.md), en lost de minimumvereisten in die de Customer Journey Audit (bevinding J2) eerder al vastlegde in `checkout/spec.md` sectie 11. Bij de BTW-uitbreiding van Orderbevestiging is een gecontroleerde synchronisatie-update op **Checkout (nu eveneens v1.3)** doorgevoerd — beide schermen tonen nu identieke BTW-weergave: label + info-icoon (ⓘ) + bedrag in de Totalen-box, met de berekeningswijze/tariefuitsplitsing uitsluitend in een tooltip, nooit standaard zichtbaar (`checkout/spec.md` sectie 13). **Authenticatie-flow (#9/#10) is definitief bevroren (v1.1, incl. 2FA-strategie)** — zie [`03-functional-specs/authenticatie/spec.md`](../../03-functional-specs/authenticatie/README.md): één registratieflow zonder rolkeuze, Retailer/Producent-status volgt later via een aparte Partner Onboarding-flow, Beheerder-authenticatie volledig gescheiden (Medusa Admin), plus een volledige 2FA-strategie (optioneel voor Consument, verplicht voor Retailer/Producent/Beheerder) met één nieuw component (CMP-040 Code Input/OTP).

**Partner Onboarding (#26–28; #29 Verzendinstellingen bewust buiten scope, zie architectuurreview) is definitief bevroren (v1.1, na een onafhankelijke architectuurreview)** — zie [`03-functional-specs/partner-onboarding/spec.md`](../../03-functional-specs/partner-onboarding/README.md): meervoudige rolselectie (Retailer/Producent-Merkhouder/Distributeur), volledig uitgewerkte Europese productieverificatie met een reviewer-checklist, conditionele flow per rol, een uitgebreid statusmodel (incl. de status "Aanvullende informatie vereist"), een verplichte e-mailverificatie-gate vóór de start, beveiligingseisen voor documentuploads, en één nieuw component (CMP-041 File Upload, met mobiele cameraopname). Kent bij goedkeuring de rol toe die de Authenticatie-spec al had voorbereid, en verwijst direct door naar de verplichte 2FA-instelstap.

**Sprint 1B is hiermee definitief afgesloten** — alle vier onderdelen (Winkelwagen, Orderbevestiging, Authenticatie-flow incl. 2FA, Partner Onboarding) zijn definitief bevroren. Zie `06-development/project-status-and-roadmap.md` voor de volledige eindrapportage.

| # | Scherm | Status |
|---|---|---|
| 4 | Subcategoriepagina | Nog niet gestart |
| 6 | Winkelwagen | **v1.0, bevroren** |
| 8 | Orderbevestiging | **v1.3, definitief bevroren** |
| 9 | Inloggen/Registreren | **v1.1, definitief bevroren** (incl. 2FA-strategie) |
| 10 | Wachtwoord vergeten | **v1.1, definitief bevroren** (zelfde bestand/flow als #9) |
| 26–28 | Partner Onboarding (Welkom/Partner kiezen/Bedrijfsgegevens/Verificatie/Documenten/Samenvatting/Statuspagina) | **v1.1, definitief bevroren** |
| 29 | Verzendinstellingen | Nog niet gestart — bewust buiten de Partner Onboarding-scope gehouden (architectuurreview) |
| 30, 32, 34, 35 | Seller Dashboard-skelet, EAN-zoeken, Nieuw product, Productdetail commercieel | **Gereed (Sprint 3 P0)** — zie `sprint-3-p0/` |
| 31, 33, 36 | Productoverzicht, CSV-import, Productdetail-productinformatie | Nog niet gestart |
| 55 | Partnerbeheer | **Gereed (Sprint 3 P0)** — zie `sprint-3-p0/` |
| 61 | Categorie-/filterbeheer | Nog niet gestart |

### Volledige customer journey — controle na de Orderbevestiging

Met Orderbevestiging opgeleverd, is de volledige MVP-kernflow die de Customer Journey Audit (`02-ux/customer-journey-audit.md`) beoordeelde nu voor het eerst **compleet in wireframe-vorm aanwezig**:

```
Homepage → Categorie / Zoekresultaten → Productpagina → Winkelwagen → Checkout → Orderbevestiging
 v1.0          v1.1 (gedeelde template)      v1.2          v1.0        v1.0        v1.0
bevroren            bevroren                bevroren     bevroren    bevroren        bevroren
```

Categorie en Zoekresultaten zijn **parallelle, gelijkwaardige ingangspunten** vanaf de Homepage (geen vaste onderlinge volgorde — beide leiden naar dezelfde Productpagina, zoals ook al in de Customer Journey Audit vastgesteld), geen sequentiële stap tussen de twee.

**Resultaat van de controle:** alle zes eerdere schakels zijn bevroren en onderling consistent (gedeelde componenten: CMP-016, CMP-017, CMP-020, CMP-021, CMP-025 als rode draad door Winkelwagen/Checkout/Orderbevestiging). Orderbevestiging is de **laatste ontbrekende schakel** van deze kernflow — zodra deze is bevroren, is de volledige MVP-klantreis van eerste bezoek tot bevestigde aankoop end-to-end in wireframe-vorm gedekt.

Onderstaande tabellen tonen de **oorspronkelijke, volledige Sprint 1-samenstelling** (nu verdeeld over 1A/1B zoals hierboven) inclusief motivatie per scherm:

**Publiek (10):**

| # | Scherm | Motivatie |
|---|---|---|
| 1 | Homepage | Instappunt voor elke andere flow; nodig om Marketplace-template te valideren |
| 2 | Zoekresultaten | Eerste manier om een product te vinden |
| 3 | Categoriepagina | Tweede manier om een product te vinden |
| 4 | Subcategoriepagina | Verfijning op categorie, zelfde template als #3 |
| 5 | Productpagina (Buy Box) | **Hoogste risico van het platform** (zie `01-architecture/standard-vs-custom.md`) — moet als eerste gevalideerd worden, alles daarna hangt hiervan af |
| 6 | Winkelwagen | Directe vervolgstap op #5 |
| 7 | Checkout | Bevat de order-splitsing per aanbieder — tweede grootste risico, hoort daarom bij het skelet |
| 8 | Orderbevestiging | Sluit de kernflow af, nodig om te bewijzen dat de flow werkt |
| 9 | Inloggen/Registreren | Noodzakelijk om Checkout te bereiken |
| 10 | Wachtwoord vergeten | Zelfde Focused Flow-template als #9, minimale meerkosten om nu mee te nemen |

**Partnerplatform (10):**

| # | Scherm | Motivatie |
|---|---|---|
| 26 | Partner-registratie | Zonder retailer geen aanbod, dus geen product om te kopen |
| 27 | Bedrijfsgegevens & verificatie | Vervolgstap op #26, verplicht voor elke partner |
| 28 | Betaalgegevens | Vervolgstap op #26, nodig voor een werkend account |
| 29 | Verzendinstellingen | Vervolgstap op #26, nodig voor een werkend Offer |
| 30 | Dashboard Home | Eerste scherm na onboarding, valideert het Dashboard-template |
| 31 | Productoverzicht | Toegangspunt tot productbeheer |
| 32 | Product toevoegen — EAN-zoeken | Snelste weg naar een eerste Offer in de Buy Box |
| 34 | Product toevoegen — Retailer Created | Nodig zodra het eerste product nog niet in de Product Cloud bestaat — realistisch scenario bij launch |
| 35 | Productdetail — commerciële gegevens | Zonder dit scherm geen prijs/voorraad, dus geen zichtbare Offer |
| 36 | Productdetail — productinformatie-beheer | Nodig zodra een producent zich aansluit, of als retailer bij Retailer Created |

**Admin (2):**

| # | Scherm | Motivatie |
|---|---|---|
| 55 | Partnerbeheer (goedkeuren) | Zonder goedkeuring kan geen enkele retailer uit Sprint 1 daadwerkelijk live |
| 61 | Categorie- & filterbeheer | Categorieën moeten bestaan vóórdat een product er ooit in geplaatst kan worden |

### Sprint 2 — Must Have compleet: ordercyclus + eigenaarschap (22 schermen)

**Publiek (9):**

| # | Scherm | Motivatie |
|---|---|---|
| 11 | Mijn bestellingen (overzicht) | Vervolgstap op Orderbevestiging (#8), nu de basisflow werkt |
| 12 | Orderdetail + track & trace | Detailniveau van #11 |
| 13 | Retour aanmelden | Onderdeel van de volledige ordercyclus |
| 14 | Berichtencentrum (klant) | Nodig zodra order-gerelateerde vragen kunnen ontstaan |
| 15 | Productreview plaatsen | Kan pas zinvol ontworpen worden ná een afgeronde orderflow |
| 16 | Verkopersreview plaatsen | Zelfde afhankelijkheid als #15, telt bovendien mee in de Buy Box (spec sectie 3.1) |
| 17 | Account & adresbeheer | Ondersteunt #7 en #11–13 |
| 18 | Over EuropMade / Vertrouwen | Versterkt vertrouwen rond de net gebouwde reviewflow |
| 21 | Juridische pagina's | Wettelijk verplicht (AVG/GDPR) vóór livegang, geen functionele afhankelijkheid maar harde deadline |

**Partnerplatform (9):**

| # | Scherm | Motivatie |
|---|---|---|
| 33 | Product toevoegen — CSV-import | Uitbreiding op #32/#34, nodig zodra meerdere retailers meedoen |
| 37 | Wijzigingsvoorstel indienen | Vervolgstap op #36, activeert het Product Cloud-eigenaarschapsmodel |
| 38 | Wijzigingsvoorstellen beoordelen | Producentzijde van #37, kan pas ontworpen worden als #37 vaststaat |
| 39 | Product claimen | Sluit het eigenaarschapsmodel uit de functionele spec (sectie 1.6) |
| 40 | Orders (nieuw/verzonden/retour/geannuleerd) | Retailerzijde van #11–13 |
| 41 | Retour beoordelen | Retailerzijde van #13 |
| 42 | Berichtencentrum (partnerzijde) | Retailerzijde van #14 |
| 45 | Rapportages | Vereist afgeronde orders (#40) om zinvolle data te tonen |
| 50 | Uitbetalingen | Vereist afgeronde orders (#40) |

**Admin (4):**

| # | Scherm | Motivatie |
|---|---|---|
| 54 | Admin dashboard (platform-KPI's) | Nu er echte orders/producten zijn (Sprint 1–2), pas dan zinvol te ontwerpen |
| 56 | Gebruikersbeheer | Ondersteunt supportcases die uit #14 kunnen ontstaan |
| 57 | Moderatiewachtrij | Nodig zodra #37/#38 wijzigingsvoorstellen genereren die kunnen escaleren |
| 58 | Geschillenbeheer | Nodig zodra #41 retouren kan afwijzen (functionele spec, sectie 6.1 UX-review-punt) |

### Sprint 3 — Should Have: vertrouwen, compliance, groei (16 schermen)

**Publiek (4):**

| # | Scherm | Motivatie |
|---|---|---|
| 19 | Merkpagina | Uitbreiding op Productpagina (#5), geen nieuwe afhankelijkheid |
| 20 | Klantenservice/FAQ | Verlaagt supportlast nu het platform draait, niet blokkerend voor kernflow |
| 22 | 404/foutpagina's | Utility-template, kan los van de rest |
| 23 | Landingspagina's (SEO) | Marketing-uitbreiding, functioneel niet nodig voor de kernflow |

**Partnerplatform (8):**

| # | Scherm | Motivatie |
|---|---|---|
| 43 | Advertenties — beschikbaarheid & reserveren | Tweede inkomstenbron, nodig vóór commerciële lancering, niet voor het eerste testpad |
| 44 | Advertenties — actieve campagnes | Vervolgstap op #43 |
| 46 | Landinstellingen | Verrijking op #29, nodig bij internationale opschaling |
| 47 | Product Quality Score & Health-overzicht | Ondersteunt #38, verhoogt kwaliteit maar blokkeert niets |
| 48 | Compliance Dashboard | Must Have vóór productielive-gang, maar niet blokkerend voor het eerste doorlopende testpad |
| 49 | Verified™-aanvraag | Vereist #47/#48 als functionele basis (functionele spec, sectie 1.10) |
| 51 | Meldingencentrum | Comfortfunctie bovenop reeds bestaande dashboardacties |
| 53 | Accountinstellingen | Uitbreiding op #27, niet blokkerend |

**Admin (4):**

| # | Scherm | Motivatie |
|---|---|---|
| 59 | Compliance-overzicht platformbreed | Vereist dat #48 bij partners al data genereert |
| 60 | Advertentie-inventorybeheer | Vereist dat #43 bestaat om te beheren |
| 62 | Commissie- & tariefinstellingen | Financiële instelling, geen functionele blokkade voor eerdere sprints |
| 64 | Audittrail/logs | Ondersteunend, waardevol zodra er genoeg platformactiviteit is om te loggen |

### Post-MVP (7 schermen)

| # | Scherm | Motivatie |
|---|---|---|
| 24 | Kenniscentrum | Expliciet "na de MVP" in de Blueprint (H14.5) |
| 25 | Mijn reviews (overzicht) | Could Have, zelfbeheerfunctie zonder directe transactiewaarde |
| 52 | ERP/PIM/API-koppeling | Could Have, waardevol pas bij grotere partners na launch |
| 63 | Landbeheer (uitrolstatus) | Could Have, relevant bij opschaling naar meer landen dan de 6 launch-landen |
| 65–66 | Affiliate (registratie, dashboard) | **Definitief MVP** (scopewijziging, zie `00-context/blueprint-reference.md` — vervangt Blueprint H15.7/H15A.12 op dit punt) — toe te voegen aan de wireframe-planning |
| 67 | Creator (storefront) | Expliciet buiten Fase 1-scope (Blueprint H15A.12) — uitsluitend Creator blijft post-MVP |
| 68 (nieuw, toegevoegd n.a.v. UX-review F5) | Verlanglijst / Wishlist | Verscheen als knop in de Productpagina-wireframe zonder in de scherminventarisatie te staan (scope-inconsistentie, UX-review F5) — hier alsnog formeel als Post-MVP/Could Have vastgelegd, uit de Sprint 1A-wireframe verwijderd totdat dit expliciet als scherm/feature wordt toegevoegd aan een toekomstige MVP-scope |

**Sponsored Products** (ADR 0003) is hier bewust niet apart opgenomen als scherm: het staat buiten de MVP-functionaliteit en heeft daardoor geen wireframe-behoefte in deze fase.

---

## 2. Component Inventory

Componenten zijn ingedeeld naar hergebruik-bereik: **Global** (in vrijwel elk scherm), **Marketplace** (publieke schermen), **Dashboard** (Partner + Admin, gedeeld), **Formulier** (binnen meerdere templates), en **Domain-kritiek** (EuropMade-specifieke, onderscheidende componenten — komen ook op meerdere plekken terug, maar zijn geen generieke e-commerce-bouwstenen).

### Global (overal)

| Component | Terugkerend in |
|---|---|
| Button (primary/secondary/destructive/ghost) | Elk scherm |
| Input / Select / Checkbox / Radio (form-atomen) | Elk formulier, elke template |
| Badge (generieke basis, statusneutraal) | Product Cloud-status, meldingen, labels |
| Card (basis) | Product Card, Offer Card, KPI-tile, Approval Card |
| Modal / Dialog | Bevestigingen, claim-flow, retourflow, formulieren |
| Alert / Toast/Snackbar | Foutmeldingen, succesbevestigingen, systeemwaarschuwingen |
| Breadcrumbs | Categorie/product/dashboard-navigatie |
| Tabs | Productpagina (specificaties/downloads/reviews), Compliance/Quality-tabblad (UX-review-voorstel 4), Instellingen |
| Table (basis, sorteerbaar/filterbaar) | Orders, Rapportages, Gebruikersbeheer, Audittrail |
| Pagination | Zoekresultaten, Productoverzicht, Orders |
| Tooltip | Uitleg bij Buy Box-factoren, formuliervelden |
| Loading/skeleton-state | Elk scherm met data-ophaal |
| Empty state | Lege winkelwagen, geen orders, geen productenresultaten |
| Avatar/logo-placeholder | Account, merkpagina, partnerprofiel |
| Header (2 varianten: publiek / dashboard) | Elk publiek scherm resp. elk dashboardscherm |
| Footer (publiek) | Elk publiek scherm |
| Taal-/landkiezer | Header + footer (`ux-architecture.md`, sectie 4.4) |

### Marketplace-specifiek (publiek)

| Component | Terugkerend in |
|---|---|
| Zoekbalk | Header (overal publiek) |
| Filters (paneel/bottom sheet/chips) | Zoekresultaten, categoriepagina's |
| Product Card | Homepage, zoekresultaten, categorie, gerelateerde producten |
| Price-weergave (incl. valuta/regio) | Product Card, Buy Box, Offer Card, winkelwagen |
| Delivery time-badge | Buy Box, Offer Card |
| Stock-indicator | Buy Box, Offer Card |
| Category tile / Brand tile | Homepage, categoriepagina, merkpagina |
| Cart line item | Winkelwagen, checkout-overzicht |
| Order status-tijdlijn | Orderdetail/track & trace |
| Review-formulier | Product- en verkopersreview |
| Berichten-draad (chatbubbels) | Berichtencentrum klant én partner |

### Domain-kritiek (EuropMade-onderscheidend, meerdere contexten)

> **Component ID's** (CMP-XXX) zijn na Design System v1.0 het bindende referentiepunt — zie [`07-design-system/components.md`](../../07-design-system/components.md) sectie 5 voor het volledige register. Deze tabel is bijgewerkt met de definitieve ID's.

| ID | Component | Terugkerend in |
|---|---|---|
| CMP-013 | **Buy Box** (samengestelde component) | Productpagina (klant), Buy Box-positie-indicator (retailer, andere weergave van dezelfde databron) |
| CMP-014 | **Offer Card / Offer Comparison Row** | Buy Box "alle aanbieders"-lijst |
| CMP-015 | **Retailer Card** (voorbereid, nog niet toegepast) | Buy Box "alle aanbieders"-lijst (retailer-identiteit binnen een Offer), retailerprofiel/merkpagina-context |
| — | **Rating** (sterren, gescheiden product/verkoper — géén zelfstandig component, inline tekst binnen CMP-016/CMP-014) | Productpagina, Offer Card, Retailer Card, Partnerdashboard-rapportages |
| CMP-018 | **Verified™ Badge** | Productpagina, Partnerdashboard, Merkpagina — **nooit** in een Offer-/Buy Box-context (F12) |
| CMP-019 | **Product Quality Score** (interne indicator, niet klantzichtbaar, voorbereid) | Partnerdashboard (Productdetail, Quality/Health-overzicht), Verified™-aanvraag |
| CMP-020 | **Shipping Badge** (verzendkosten-indicatie) | Offer Card, Buy Box, Besteloverzicht (Checkout) |
| CMP-021 | **Delivery Estimate** (gestructureerde levertijd-categorie, spec sectie 2.4) | Offer Card, Buy Box, Besteloverzicht (Checkout) |
| CMP-022 | **Country of Production Badge** ("Made in ...") | Productpagina, Product Card, Merkpagina |
| CMP-023 | **Manufacturer Badge** (producent/merkhouder-identiteit, klikbaar) | Productpagina, Merkpagina |
| CMP-024 | **Product Owner Badge** (voorbereid, uitsluitend intern) | Partnerdashboard (Productdetail), Admin-omgeving |
| CMP-016 | **Retailer Indicator** (compacte retailer-referentie) | Productpagina, Besteloverzicht (Checkout), Orders, Rapportages, Admin-partnerbeheer |
| CMP-025 | **Besteloverzicht / Order Summary** (nieuw, uit Checkout) | Checkout stap 1/2/3 |
| — | **Productstatus-badge** (Retailer Created/Concept/Actief/Verified™/Uitlopend/Niet leverbaar/Gearchiveerd — variant van CMP-008 Badge, nog niet in een echt scherm toegepast) | Partnerdashboard, Admin-omgeving |

Deze twaalf componenten dragen het onderscheidend vermogen van EuropMade (functionele spec, sectie 3 en 5) en zijn daarom onderdeel van de Design System Foundation, ontworpen vóór het eerste scherm (herziene volgorde, sectie 1).

### Dashboard-specifiek (Partner + Admin, gedeeld basispatroon)

| Component | Terugkerend in |
|---|---|
| Sidebar-navigatie (inklapbaar) | Elk dashboardscherm |
| Topbar (notificaties/account) | Elk dashboardscherm |
| Stat/KPI-tile | Dashboard Home, Admin dashboard, Rapportages |
| Approval/review-kaart | Wijzigingsvoorstellen beoordelen, Moderatiewachtrij, Geschillenbeheer |
| Buy Box-positie-indicator | Productdetail commercieel (retailer) |
| Notificatiebel/-centrum | Topbar → Meldingencentrum |
| Toggle/switch | Landinstellingen (land aan/uit), Advertentie-status |
| Stepper (voortgangsindicator) | Onboarding, Verified™-aanvraag-voortgang |
| Data table met bulkacties | Productoverzicht, Orders, Gebruikersbeheer |
| Chart/grafiek | Rapportages, Admin dashboard |
| Audit-/log-regel | Audittrail |

### Formulier-specifiek

| Component | Terugkerend in |
|---|---|
| Formulierveld-wrapper (label + hint + foutmelding) | Elk formulier |
| Multi-step formulier/wizard | Partner-onboarding, Checkout |
| Bestands-/afbeeldingsuploader | Productmedia, compliance-documenten, retourfoto |
| Adresformulier | Checkout, Account, Partner-onboarding |
| Zoek-select/autocomplete | EAN-zoeken, categorie kiezen |
| CSV-upload & kolommapping | Product toevoegen — CSV-import |

---

## 3. Paginatemplates

> **Beleidswijziging (vastgesteld n.a.v. UX-review, bevinding F14):** vanaf de Productpagina/Buy Box wordt elk kernscherm uitgewerkt in **Desktop, Tablet én Mobiel** — niet als een desktop-eerst wireframe met een losse tekstnotitie over mobiel gedrag. Mobile First blijft het uitgangspunt (Blueprint H10.11, `01-architecture/tech-stack.md`); dat betekent in de praktijk dat het mobiele gedrag (bijv. de sticky bottom bar voor de Buy Box) net zo expliciet wordt ontworpen als het desktopgedrag, niet achteraf afgeleid.

Om te voorkomen dat 68 schermen tot tientallen unieke layouts leiden, worden alle schermen teruggebracht tot **vijf basistemplates**. Elk scherm uit de inventarisatie valt in precies één template; verschillen tussen schermen binnen hetzelfde template zitten uitsluitend in de content, niet in de basislayout.

| Template | Beschrijving | Voorbeeldschermen |
|---|---|---|
| **1. Marketplace Template** | Publieke header + footer, volle breedte content, secties/grid-opbouw | Homepage, Zoekresultaten, Categorie, Subcategorie, Productpagina, Merkpagina, Landingspagina's, Over EuropMade, Kenniscentrum |
| **2. Focused Flow Template** | Minimale header (geen volledige navigatie), gecentreerde kolom, optioneel een stepper, geen afleidende footer-navigatie | Winkelwagen, Checkout, Orderbevestiging, Inloggen/Registreren, Wachtwoord vergeten, Partner-onboarding (#26–28) |
| **3. Account Shell Template** | Publieke header/footer + vaste sub-navigatie voor het klantaccount | Mijn bestellingen, Orderdetail, Retour aanmelden, Berichtencentrum (klant), Reviews plaatsen, Account & adresbeheer, Mijn reviews |
| **4. Dashboard Template** | Sidebar-navigatie + topbar, gedeeld tussen Partner én Admin (verschillende navigatie-items, dezelfde structuur); Instellingenschermen zijn een tab-variant binnen dit template, geen apart template | Alle Partnerdashboard-schermen (#30–53), alle Admin-schermen (#54–64) |
| **5. Utility Template** | Minimaal, geen navigatiestructuur nodig | 404/foutpagina's, lege/foutstaten |

**Toelichting op "Formulieren" en "Instellingen":** dit zijn in de praktijk geen aparte paginatemplates, maar **contentpatronen die binnen een van bovenstaande templates leven** — een formulier op de Checkout-pagina gebruikt de Focused Flow Template, een formulier in het Partnerdashboard (bijv. Productdetail-bewerking) gebruikt de Dashboard Template. Dit voorkomt dat "een formulier" per ongeluk als los, zesde template wordt behandeld.

**Belangrijke ontwerpconsequentie:** de Dashboard Template wordt gedeeld tussen Retailer, Producent en Administrator (`01-architecture/tech-stack.md`: Partnerdashboard is een losse Next.js-app, Admin-omgeving bouwt op Medusa Admin) — dit is precies het punt dat in de UX-review van de UX-architectuur al als aandachtspunt is vastgelegd (sectie 6.7, voorstel 10: bewaak één gedeeld componentsysteem tussen Medusa Admin en het custom Partnerdashboard). Deze wireframe-strategie bevestigt dat aandachtspunt door beide bewust in hetzelfde template onder te brengen.

---

## 4. Wireframe-volgorde

Dit is de **ontwerpvolgorde**, niet de sprintvolgorde uit sectie 1 — sommige schermen worden pas in Sprint 2/3 gebouwd, maar de basis-UI-beslissing erover moet soms al eerder vallen omdat een later scherm ervan afhangt. De volgorde is gebaseerd op afhankelijkheid: elk scherm wordt pas ontworpen zodra de schermen waarvan het conceptueel of visueel afhangt, vaststaan.

```
0. Design System-fundamenten (zie sectie 5)
   ↓
1. Homepage
   → vestigt Marketplace Template + publieke Header/Footer
   ↓
2. Zoekresultaten
   → introduceert Filters + Product Card
   ↓
3. Categoriepagina / Subcategoriepagina
   → hergebruikt Zoekresultaten-patroon, geen nieuwe componenten
   ↓
4. Productpagina (incl. Buy Box + Offer Card + Verified™ Badge)
   → het meest kritieke scherm: bepaalt hoe een Offer, Verified™-status
     en de "koop"-beslissing eruitzien — alles vanaf hier bouwt hierop voort
   ↓
5. Winkelwagen → Checkout → Orderbevestiging
   → checkout kan pas ontworpen worden zodra vaststaat wélke data
     (aanbieder, prijs, levertijd) vanaf de Productpagina meekomt
   ↓
6. Inloggen/Registreren/Wachtwoord vergeten
   → nodig om het gast-vs-account-moment in Checkout (UX-review-voorstel 1)
     concreet te maken; ontworpen direct na Checkout, niet ervoor
   ↓
7. Klant-accountgebied (Mijn bestellingen, Orderdetail/tracking, Retour,
   Berichtencentrum klant, Reviews, Account & adresbeheer)
   → vereist dat een Order-concept uit stap 5 vaststaat
   ↓
8. Retailer Dashboard — onboarding & productbeheer
   (Partner-registratie t/m Productdetail commercieel/productinfo)
   → hergebruikt de Buy Box-datastructuur uit stap 4 (nu vanuit
     retailer-perspectief: de Buy Box-positie-indicator)
   ↓
9. Producent-flows binnen hetzelfde dashboard
   (Wijzigingsvoorstellen beoordelen, Product claimen, Compliance,
   Verified™-aanvraag, Quality/Health Score)
   → vereist dat het wijzigingsvoorstel-concept uit stap 8 al bestaat
     (retailer dient in, producent beoordeelt: twee kanten van hetzelfde scherm)
   ↓
10. Order-/communicatie-/advertentiebeheer Partnerzijde
    (Orders, Retour beoordelen, Berichten, Advertenties, Rapportages, Uitbetalingen)
    → hergebruikt Dashboard Template + Order-concept uit stap 7/8
   ↓
11. Administrator
    (Partnerbeheer, Categorie-/filterbeheer, Moderatiewachtrij,
    Geschillenbeheer, Admin dashboard, overige Admin-schermen)
    → de Administrator modereert/beoordeelt wat in stap 8–10 is ontworpen;
      kan pas realistisch ontworpen worden als die content-vormen vaststaan
   ↓
12. Content- en Utility-pagina's
    (Merkpagina, Over EuropMade, FAQ, Juridisch, 404, Landingspagina's)
    → laagste afhankelijkheid, geen ander scherm wacht hierop; wordt
      ingepland zodra capaciteit beschikbaar is, niet noodzakelijk als laatste
      in kalendertijd
```

**Waarom dit afwijkt van een hoofdstuk-volgorde:** de Blueprint behandelt Product Cloud (H7) vóór Commerce Cloud (H8) en Partnerplatform (H9) vóór Klantreis (H10). Wireframe-gewijs is dat niet werkbaar: je kunt een retailer-dashboard niet zinvol ontwerpen vóórdat vaststaat hoe een klant een Offer te zien krijgt (stap 4), en je kunt geen Buy Box-positie-indicator (stap 8) ontwerpen vóórdat de Buy Box zelf (stap 4) vaststaat. De volgorde hierboven volgt daarom **conceptuele afhankelijkheid**, niet documentstructuur.

---

## 5. Design System — eerst te ontwerpen componenten

Om herontwerp te voorkomen zodra Sprint 1 start, worden onderstaande componenten **vóór het eerste scherm (Homepage)** vastgelegd in `docs/07-design-system/`. Volgorde van invullen:

### Fase A — Tokens (vóór elk component)

1. `colors.md` — inclusief de functionele kleuren (Verified™, Buy Box-winnaar, statuskleuren) die al benoemd staan als placeholder.
2. `typography.md` — onderscheid publieke context vs. dashboardcontext.
3. `spacing.md` — grid + breakpoints (Desktop/Tablet/Mobiel).

### Fase B — Universele atomen (nodig voor élk scherm, dus vóór Homepage)

Button, Input/Select/Checkbox/Radio, Badge (basis), Card (basis), Modal, Alert/Toast, Breadcrumbs, Tabs, Table (basis), Pagination, Tooltip, Loading/skeleton, Empty state, Avatar.

### Fase C — Template-shells (nodig zodra het eerste scherm per template wordt ontworpen)

Publieke Header + Footer (Marketplace Template, nodig vóór Homepage), Taal-/landkiezer, Dashboard Sidebar + Topbar (nodig vóór het eerste Partnerdashboard-scherm in Sprint 1).

### Fase D — Domain-kritieke componenten (nodig vóór de Productpagina, nu stap 2 van de herziene Sprint 1A-volgorde)

**Dit is de belangrijkste groep om vroeg goed te krijgen**, omdat ze het onderscheidend vermogen van EuropMade dragen en op meerdere plekken (klant én retailer) terugkomen. Volledige set, uitgebreid na review van de eerste Design System Foundation:

1. **Buy Box** (samengestelde component)
2. **Offer Card**
3. **Retailer Card**
4. **Verified™ Badge**
5. **Product Quality Score** (interne indicator)
6. **Shipping Badge**
7. **Delivery Estimate**
8. **Country of Production Badge**
9. **Manufacturer Badge**
10. **Product Owner Badge**
11. **Retailer Indicator**
12. **Offer Comparison Row**
13. **Rating** (product/verkoper gescheiden)
14. Product Card, Filters (paneel/chips) — ondersteunend, gedeeld met Homepage/Zoekresultaten/Categorie (stap 5–7)

### Fase E — Dashboard-specifieke componenten (nodig zodra Retailer Dashboard wordt ontworpen, stap 8)

Stat/KPI-tile, Approval/review-kaart, Buy Box-positie-indicator, Stepper, Data table met bulkacties, Toggle/switch, Notificatiebel, Bestands-/afbeeldingsuploader, CSV-upload & kolommapping.

**Vastleggingsregel (ongewijzigd vanuit `docs/07-design-system/README.md`):** elk component wordt pas als "vastgesteld" gemarkeerd in het design system nadat het daadwerkelijk in minimaal één wireframe is toegepast — bovenstaande fasering bepaalt alleen de **volgorde**, niet een vooraf losstaand ontwerp zonder wireframe-toetsing.

---

## Status: Sprint-indeling bevestigd (herzien)

Sprint 1 is opgesplitst in **Sprint 1A (Marketplace Core)** en **Sprint 1B (restant Sprint 1)**. Binnen Sprint 1A geldt een herziene ontwerpvolgorde: **Design System Foundation → Productpagina → Buy Box → Checkout → Homepage → Zoekresultaten → Categoriepagina**, omdat de Productpagina en Buy Box het hart van EuropMade vormen en eerst volledig geperfectioneerd worden voordat de vindbaarheids-schermen daarop voortbouwen.

**Voortgang:** Productpagina + Buy Box (v1.0, bevroren), Checkout (v1.0, bevroren), Homepage (v1.0, bevroren) en **Marketplace Listing Template — Zoekresultaten + Categoriepagina (v1.0, bevroren)** zijn afgerond. Design System v1.0 staat op **36 componenten** (CMP-001–CMP-036). Een Customer Journey Audit valideerde de kernflow; de Marketplace Listing Template doorliep dezelfde architectuurcontrole-werkwijze als Productpagina en Checkout (vooraf controleren, inconsistenties identificeren, minimaal corrigeren, dan pas ontwerpen).

**Sprint 1A (Marketplace Core) is hiermee volledig afgerond:** Design System Foundation, Productpagina + Buy Box (**v1.1**, aangevuld met de Product Content-sectie ná PO-review), Checkout, Homepage, Zoekresultaten, Categoriepagina — alle zes onderdelen definitief bevroren.

**Volgende stap:** Sprint 1B.
