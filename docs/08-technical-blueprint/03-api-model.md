# EuropMade — API Model (architectuur)

**Status:** Concept v0.1 — derde technische document van Sprint 2
**Uitgangspunt:** uitsluitend de goedgekeurde documenten `docs/08-technical-blueprint/01-domain-model.md` (35 domeinobjecten, na de definitieve Affiliate-scopewijziging) en `docs/08-technical-blueprint/02-database-model.md` (47 tabellen). Geen enkel nieuw domeinbegrip, geen enkele nieuwe tabel, geen enkele businessregel die daar niet al in staat.
**Bijgewerkt (v0.2):** nieuwe resources/services toegevoegd voor Affiliate, Finance en Messaging — zie sectie 2/3 hieronder.
**Scope:** de **architectuur** van de API-laag — principes, services, resource-indeling, verantwoordelijkheden, cross-cutting concerns. **Geen code, geen OpenAPI-specificatie, geen REST-endpoints, geen GraphQL-schema.** Waar dit document een concreet pad noemt (bijv. `/products`), is dat illustratief voor de resource-indeling, geen vastgelegd contract.
**Nadrukkelijk:** dit is geen Medusa-, Shopify- of ander pakket-API-model — elke keuze hieronder volgt uit de businessregels in het domein- en datamodel, niet uit een bestaand e-commerce-pakket se API-conventies.

---

## Leeswijzer

Dit document bouwt rechtstreeks voort op Deel A–F van `02-database-model.md`: elke resource hieronder komt overeen met een tabel of tabelgroep daaruit, en elke service-indeling bouwt voort op sectie 5 van dat document ("Tabellen die later waarschijnlijk eigen services krijgen"). Waar dit document een cross-cutting concern beschrijft (rate limiting, idempotency, versiebeheer, webhooks) waarvoor het domein-/datamodel geen expliciete regel bevat, staat dat als zodanig vermeld — dit document verzint geen businessregel, het ontwerpt de architectuur die nodig is om de wél al vastgelegde regels uit te voeren. Elke plek waar dat ontwerp een spanning of gat in de bronnen blootlegt, staat in "Geconstateerde inconsistenties" aan het einde.

---

# 1. API-principes

Direct voortbouwend op TB-01 (Architectuurprincipes) en consequent toegepast op de API-laag:

| Principe | Toepassing op de API-laag |
|---|---|
| **API First** | Elke resource is ontsloten via de API, ook resources die vandaag nog geen externe consument hebben (bijv. `merge_record`, uitsluitend audit-trail). Geen enkele UI-laag (storefront, partnerdashboard, Admin Shell) bevat businesslogica die niet ook via de API bereikbaar is. |
| **Domain Driven Design — Product Cloud ⊥ Commerce Cloud** | Geen enkel API-resourcepad vermengt een Product Cloud-resource met een Commerce Cloud-resource. Een Offer-resource verwijst naar een `identifier_id`, nooit naar een `product_id` rechtstreeks (Databasemodel C.1) — dit geldt evenzeer voor de API-contracten die deze tabellen ontsluiten. |
| **Server-side autoriteit (ADR 0005-principe)** | Elke prijs-, voorraad- en Buy Box-berekening wordt uitsluitend server-side uitgevoerd; geen enkele API staat een client-aangeleverde berekende waarde toe voor deze velden — de API accepteert brongegevens (bijv. `base_price`), nooit een vooraf berekend `total_price`. |
| **Nooit stilzwijgend** | Elke API-operatie die een ingrijpende status wijzigt (claim-uitkomst, verificatie-uitkomst, moderatiebeslissing) vereist een reden-veld in de request, consistent met `audit_log`'s verplichte `reason`-kolom (Datamodel F.2). De API dwingt dit af, niet uitsluitend de UI. |
| **AI ondersteunt, beslist nooit** | Elke API die een AI-aanbeveling retourneert (gekoppeld aan `ai_metadata`, Datamodel F.1) markeert die expliciet als aanbeveling in het response-formaat — nooit als een reeds genomen beslissing. Een aparte, altijd-menselijke beslissings-API blijft het enige pad naar een statuswijziging. |
| **Least privilege per resource** | Autorisatie wordt per resource en per actie afgedwongen (zie sectie 6), consistent met het generieke Admin Shell-modulecontract (`permissie`-veld) dat al bevroren is voor de Beheerder-omgeving. |

---

# 2. Services

Rechtstreeks overgenomen uit `02-database-model.md` sectie 5, hier vertaald naar API-eigenaarschap. Geen enkele service hieronder is nieuw bedacht — de indeling zelf is al vastgelegd; dit document past er uitsluitend een API-verantwoordelijkheid bij.

| Service | Eigenaar van (tabellen, Datamodel-referentie) |
|---|---|
| **Product Cloud-service** | `product`, `product_version`, `product_variant`, `identifier`, `product_family`, `category`, `attribute_definition`, `attribute_value`, `media`, `document`, `translation`, `ownership_record`, `claim`, `dispute`, `match_candidate`, `merge_record`, `split_record`, `moderation_case`, `product_origin` (Deel B) |
| **Commerce Cloud/Buy Box-service** | `offer`, `inventory`, `price`, `buy_box_computation` (Deel C) |
| **Order-service** | `order_set`, `order`, `order_line`, `shipment`, `return` (Deel D) |
| **Review-service** | `review` (Deel E.1) |
| **Partner-service** | `seller`, `company`, `brand`, `manufacturer`, `distributor_authorization` (Deel A) |
| **AI-ondersteuningsservice** | `ai_metadata` (Deel F.1) |
| **Platformbrede, gedeelde services** | `audit_log`, `notification` (Deel F.2/F.3) |
| **Affiliate-service** *(nieuw, v0.2)* | `affiliate`, `affiliate_link`, `click`, `conversion`, `coupon` (Deel G.1–G.5) |
| **Finance-service** *(nieuw, v0.2)* | `commission`, `invoice`, `payout` (Deel G.6–G.8) |

**Nog zonder toegewezen service** (consistent met Datamodel sectie 5, dat dit al zo constateerde): `customer` (te fundamenteel-gedeeld — blijft voorlopig een gedeelde, platformbrede identiteitsvoorziening, geraadpleegd door elke andere service, geen eigen bounded context), `advertisement` en `subscription` (Status "Open" in het domeinmodel — geen service toe te wijzen vóórdat de onderliggende businessregels zijn vastgesteld).

**Toegewezen aan een bestaande service, niet als nieuwe rij** (v0.2): `message` (Deel G.9) valt onder de **Order-service** — een bericht bestaat uitsluitend binnen de context van een Order. `consent_record` (Deel G.10) valt onder de **Affiliate-service** — het is uitsluitend de voorwaarde voor een `click`.

---

# 3. Resource-indeling

Per service, de resources die zij ontsluit — één resource per tabel(groep), tenzij het datamodel zelf al aangeeft dat meerdere tabellen één samenhangende resource vormen (bijv. `product` + `product_version` als "Product," met versies als sub-resource).

## 3.1 Product Cloud-service

| Resource | Onderliggende tabel(len) | Sub-resources |
|---|---|---|
| Product | `product`, `product_version` | Versies, Media, Documenten, Attribuutwaarden, Vertalingen |
| ProductFamily | `product_family` | — |
| Category | `category` | Attribuutdefinities |
| OwnershipRecord | `ownership_record` | — (uitsluitend leesbaar via Product, geen zelfstandig aan te maken resource) |
| Claim | `claim` | — |
| Dispute | `dispute` | — |
| MatchCandidate | `match_candidate` | — |
| ModerationCase | `moderation_case` | — |
| ProductOrigin | `product_origin` | — |

## 3.2 Commerce Cloud/Buy Box-service

| Resource | Onderliggende tabel(len) | Sub-resources |
|---|---|---|
| Offer | `offer` | Voorraad (`inventory`), Prijs (`price`) |
| BuyBoxResult | `buy_box_computation` | — (uitsluitend leesbaar, nooit direct schrijfbaar — zie sectie 4) |

## 3.3 Order-service

| Resource | Onderliggende tabel(len) | Sub-resources |
|---|---|---|
| OrderSet | `order_set` | Orders |
| Order | `order`, `order_line` | Orderregels |
| Shipment | `shipment` | — (Status Open, Datamodel §16) |
| Return | `return` | — (Status Open, Datamodel §17) |

## 3.4 Review-service

| Resource | Onderliggende tabel(len) |
|---|---|
| Review | `review` |

## 3.5 Partner-service

| Resource | Onderliggende tabel(len) | Sub-resources |
|---|---|---|
| Seller | `seller` | — |
| Company | `company` | — (uitsluitend via Seller bereikbaar, geen los toegangspad — zie sectie 4) |
| Brand | `brand` | DistributorAuthorization |
| Manufacturer | `manufacturer` | — |

## 3.6 AI-ondersteuningsservice

| Resource | Onderliggende tabel(len) |
|---|---|
| AIMetadata | `ai_metadata` — uitsluitend leesbaar als sub-resource van Claim/Dispute/MatchCandidate/ModerationCase/ProductOrigin, geen zelfstandig toegangspad |

## 3.7 Platformbrede, gedeelde services

| Resource | Onderliggende tabel(len) |
|---|---|
| AuditLogEntry | `audit_log` — uitsluitend leesbaar, nooit schrijfbaar via een publiek/Seller-toegankelijk pad; elke schrijving gebeurt intern, door de service die de onderliggende gebeurtenis verwerkt |
| Notification | `notification` |

## 3.8 Gedeelde identiteit (geen eigen service, zie sectie 2)

| Resource | Onderliggende tabel(len) |
|---|---|
| Customer | `customer` |

## 3.9 Affiliate-service *(nieuw, v0.2)*

| Resource | Onderliggende tabel(len) | Sub-resources |
|---|---|---|
| Affiliate | `affiliate` | AffiliateLink, Coupon |
| AffiliateLink | `affiliate_link` | — |
| Coupon | `coupon` | — |
| Click | `click` | — (uitsluitend intern gecreëerd bij het volgen van een link, geen los aanmaakpad) |
| Conversion | `conversion` | — |
| ConsentRecord | `consent_record` | — (voorwaarde voor Click, geen zelfstandig toegangspad buiten de cookiebanner-flow) |

## 3.10 Finance-service *(nieuw, v0.2)*

| Resource | Onderliggende tabel(len) | Sub-resources |
|---|---|---|
| Commission | `commission` | — |
| Invoice | `invoice` | — |
| Payout | `payout` | — |

**Order-service, aanvulling (v0.2):** Message (`message`) is een sub-resource van Order — geen zelfstandig toegangspad los van de bijbehorende Order.

---

# 4. CRUD-verantwoordelijkheden

Per resource, welke operaties zijn toegestaan — direct afgeleid van de lifecycle-/soft-delete-kolom in `02-database-model.md`.

| Resource | Create | Read | Update | Delete | Toelichting |
|---|---|---|---|---|---|
| Product | Seller (Producent/Merkhouder) | Publiek (gepubliceerde versie), Seller (eigen concept-versies) | Nee — uitsluitend via een nieuwe ProductVersion | Nee | "Update" op Product zelf bestaat niet; elke wijziging is een nieuwe versie (Datamodel B.3) |
| ProductVersion | Seller (impliciet, via een Product-wijziging) | Publiek (gepubliceerde), Seller (eigen), Beheerder (alle) | Nee (append-only) | Nee | — |
| Category | Beheerder | Publiek | Beheerder | Nee (geen soft delete vastgelegd) | Platformbeheer, nooit per-Seller (Datamodel B.6) |
| OwnershipRecord | Systeem (bij goedgekeurde overdracht) | Seller (eigen historie), Beheerder | Nee | Nee | Append-only, sluit vorige rij af via `valid_until` |
| Claim | Seller | Seller (eigen), Beheerder | Beheerder (status) | Nee | — |
| Dispute | Systeem (bij conflict tussen claims) | Beheerder | Beheerder (status) | Nee | — |
| MatchCandidate | Systeem (matchingpijplijn) | Beheerder | Beheerder (status) | Nee | — |
| ModerationCase | Systeem/Beheerder | Beheerder | Beheerder (status) | Nee | — |
| ProductOrigin | Seller | Publiek (uitkomst-badge), Seller (eigen aanvraag), Beheerder (volledig) | Beheerder (status) | Nee | Handmatige eindbeslissing altijd (Datamodel B.14) |
| Offer | Seller | Publiek (actieve Offers), Seller (eigen) | Seller (eigen) | Seller (soft delete, `deleted_at`) | — |
| Inventory | Seller | Publiek (uitsluitend beschikbaarheid, niet het exacte aantal), Seller (eigen) | Seller | Nee | — |
| Price | Seller | Publiek, Seller (eigen) | Seller | Nee | — |
| BuyBoxResult | Systeem (herberekening) | Publiek, Seller (eigen positie) | Nee — nooit direct schrijfbaar | Nee | Uitsluitend afgeleid; zie sectie "Geconstateerde inconsistenties" |
| OrderSet | Systeem (bij Checkout) | Klant (eigen) | Nee | Nee | — |
| Order | Systeem (bij ordersplitsing) | Klant (eigen), Seller (eigen als aanbieder), Beheerder | Beheerder (uitsluitend `exception_status`) | Nee | — |
| Shipment | Nog niet vastgelegd | Nog niet vastgelegd | Nog niet vastgelegd | Nog niet vastgelegd | Status Open (Datamodel §16) |
| Return | Nog niet vastgelegd | Nog niet vastgelegd | Nog niet vastgelegd | Nog niet vastgelegd | Status Open (Datamodel §17) |
| Review | Klant (eigen, na aankoop) | Publiek | Nee | Klant (eigen, soft delete)/Beheerder (moderatie) | — |
| Seller | Systeem (bij goedgekeurde onboarding) | Seller (eigen), Beheerder | Seller (beperkt — geen rolwijziging), Beheerder | Nee | Geen status ná Goedgekeurd (Datamodel A.3) |
| Company | Seller (bij onboarding) | Seller (eigen), Beheerder | Seller (beperkt) | Nee | — |
| Brand | Seller (bij productaanmelding) | Publiek | Seller (eigen merk) | Nee | — |
| Manufacturer | Seller (bij productaanmelding) | Publiek | Seller (eigen) | Nee | — |
| AIMetadata | Systeem (AI-validatie-API-aanroep) | Beheerder (als onderdeel van het beoordeelde object) | Nee | Nee | — |
| AuditLogEntry | Systeem (intern, bij elke andere schrijfoperatie) | Beheerder | Nee | Nee (append-only) | — |
| Notification | Systeem | Ontvanger (eigen) | Ontvanger (uitsluitend `read_at`) | Nee | — |
| Customer | Bezoeker (registratie) | Klant (eigen), Beheerder | Klant (eigen) | Klant (soft delete) | — |
| Advertisement | Nog niet vastgelegd | Nog niet vastgelegd | Nog niet vastgelegd | Nog niet vastgelegd | Status Open, bewust buiten MVP (Datamodel §19) |
| Subscription | Nog niet vastgelegd | Nog niet vastgelegd | Nog niet vastgelegd | Nog niet vastgelegd | Status Open (Datamodel §20) |

---

# 5. Authenticatie

Rechtstreeks overgenomen uit de bevroren Authenticatie-specificatie en Domeinmodel §14/§1 (Customer/Seller):

- **Server-side sessiebeheer** — nooit een uitsluitend client-side aanname over ingelogd-zijn; elke API-aanroep die om identiteit vraagt, valideert een server-side sessie.
- **Verplichte 2FA voor elke Seller-rol en voor Beheerder** — een API-aanroep vanuit een Seller-/Beheerder-sessie zonder actieve 2FA wordt geweigerd, ongeacht het aangevraagde endpoint.
- **Technisch gescheiden infrastructuur voor de Beheerder-rol** (TB-01 Deel 3.1) — de Admin Shell-API-toegang loopt via een aparte authenticatiegrens dan de publieke/Seller-API's, niet uitsluitend een rolcontrole binnen dezelfde sessie-infrastructuur.
- **Gastentoegang (geen `customer`-record)** is toegestaan voor publieke, leesbare resources (Product, Offer, Category) en voor het plaatsen van een Order (Checkout, bevroren) — niet voor enige Seller- of Beheerder-resource.

---

# 6. Autorisatie

Server-side afgedwongen op elk niveau, nooit uitsluitend een UI-restrictie (ADR 0005-principe, platformbreed):

- **Rolgebaseerd**, met de rollen uit het domeinmodel: Bezoeker/Klant (`customer`, geen Seller-rol), Retailer/Producent-Merkhouder/Distributeur (`seller`-rolvlaggen, optelbaar), Beheerder.
- **Resource-eigenaarschap als aanvullende autorisatielaag** — een Seller mag uitsluitend zijn eigen `offer`, `product` (als eigenaar via `ownership_record`), `claim`, `product_origin`-aanvragen bewerken; nooit die van een andere Seller, ongeacht de rol.
- **Het generieke Admin Shell-modulecontract** (al bevroren, `permissie`-veld) is het model voor Beheerder-zijdige autorisatie: elke Beheerder-resource declareert welke rol vereist is, een generieke laag filtert — geen los rechtensysteem per module.
- **Gevoelige-gegevenstoegang wordt afzonderlijk gelogd** (Datamodel A.2, Company: "elke inzage wordt gelogd") — autorisatie en auditing zijn twee gekoppelde, maar losse verantwoordelijkheden.

---

# 7. Versiebeheer

**Geen enkele regel hierover is al vastgelegd in het domein- of datamodel** — dit is architecturaal nieuw terrein, geen herhaling van een bestaande beslissing. Ter oriëntatie, zonder een keuze te forceren:

- Een API-brede versiestrategie (bijv. een versie-aanduiding in het toegangspad) is gebruikelijk zodra een tweede, incompatibele versie van een resource-contract ontstaat.
- Consistent met de per-service-indeling (sectie 2): versiebeheer zou logischerwijs per service, niet noodzakelijk platformbreed synchroon, kunnen verlopen — een wijziging aan de Product Cloud-service hoeft de Order-service-contracten niet te raken.

Dit is een **open ontwerpkeuze** voor een volgend Sprint 2-document — zie Geconstateerde inconsistenties.

---

# 8. Foutafhandeling

Afgeleid van het platformbrede "nooit stilzwijgend"-principe (Datamodel F.2, Audit Log):

- Elke foutrespons draagt een consistente, herkenbare vorm (type fout, mensleesbare toelichting, technische code) — nooit uitsluitend een statuscode zonder context.
- Een fout die het gevolg is van een businessregel (bijv. een Offer aanmaken zonder geldige Inventory) is inhoudelijk onderscheiden van een technische fout (bijv. een niet-bestaande resource) — de aanroeper moet het verschil kunnen zien.
- Een geweigerde actie wegens onvoldoende autorisatie onthult nooit meer over de reden dan strikt nodig (bijv. niet bevestigen of een resource wél bestaat maar ontoegankelijk is, versus niet bestaat — waar dat gevoelige informatie zou prijsgeven, consistent met de al bevroren privacy-by-design-principes).

---

# 9. Rate limiting

Reeds impliciet benoemd als openstaand aandachtspunt in de bevroren Partner Onboarding-specificatie (bij het aanvraagendpoint) — hier platformbreed doorgetrokken als architecturaal principe, zonder concrete limieten vast te leggen (die zijn nog niet bepaald):

- Publieke, ongeauthenticeerde endpoints (Product-weergave, Category-navigatie) hebben het strengste rate-limiting-regime, aangezien zij het grootste aanvalsoppervlak vormen.
- Seller-zijdige bulk-operaties (sectie 14) vereisen een ander regime dan interactieve, individuele aanroepen — een bulk-taak telt als één logische operatie, niet als N losse aanroepen, voor rate-limiting-doeleinden.
- Exacte limieten: nog niet vastgelegd — open ontwerpkeuze.

---

# 10. Idempotency

Met name relevant bij **Order-plaatsing** — de bevroren Checkout-/Order Management Center-documentatie beschrijft expliciet het uitzonderingsgeval "betaling geslaagd, ordersplitsing mislukt" als iets dat *nooit* tot een dubbele afschrijving of een verloren order mag leiden. Dit vertaalt zich naar een architecturaal vereiste:

- Elke operatie die een betaling of een orderplaatsing raakt, moet idempotent herhaalbaar zijn (een herhaalde aanroep met dezelfde idempotency-sleutel levert exact hetzelfde resultaat, nooit een tweede order of een tweede afschrijving).
- Bulk-operaties (sectie 14) zijn eveneens idempotent per item — een gedeeltelijk mislukte bulk-taak (BulkActionJob-status "Gedeeltelijk voltooid," al bevroren in Product Management) mag bij een herhaalde aanroep niet de al geslaagde items opnieuw uitvoeren.

---

# 11. Filtering

Direct gebaseerd op het al bevroren, gestructureerde Attribute-model (Datamodel B.8): omdat attribuutwaarden nooit vrije tekst zijn, is betrouwbaar filteren op elk gestructureerd attribuut (per Category) een architecturaal geborgde mogelijkheid, niet een losse toevoeging per endpoint. Filtering is voorzien op minimaal: Category, Attribuutwaarden, prijsbereik (Offer/Price), beschikbaarheid (Inventory), Seller-rol (Partner-service), en status-velden (bijv. ProductOrigin-status).

---

# 12. Sorteren

Consistent met de al bevroren Buy Box-wegingsfactoren (Datamodel §13/domeinmodel): de standaardsortering van een Offer-lijst binnen een productcontext volgt de Buy Box-uitkomst zelf (winnaar eerst), niet een aparte, losse sorteerparameter — een aanvullende, expliciete sortering (bijv. op prijs oplopend) blijft daarnaast beschikbaar als aanroeper-keuze.

---

# 13. Paginering

Elke lijst-resource (Product, Offer, Order, Review, e.a.) is architecturaal voorzien van paginering — geen enkele resource retourneert ongeclipt een volledige tabel. Consistent met de schaal die de Product Cloud Architecture zelf al als toetsingscriterium hanteert (10 miljoen producten, TB-01 Deel 9), is cursor-gebaseerde paginering voor grote, wijzigende resultaatsets (Product, Offer) architecturaal passender dan offset-gebaseerde paginering, die bij die schaal degradeert — dit is een architecturale aanbeveling, geen vastgelegde keuze (zie Geconstateerde inconsistenties).

---

# 14. Bulk-operaties

Rechtstreeks gegrond in de al bevroren BulkActionJob (Product Management-specificatie): een bulk-operatie is een eigen, asynchrone resource met een eigen statusverloop (Voltooid/Gedeeltelijk voltooid/Mislukt), nooit een simpele lus van N synchrone aanroepen vanuit het perspectief van de aanroeper. Toepasbaar op minimaal: Product-publicatiestatuswijzigingen (Product Management), en — volgend uit hetzelfde patroon — Offer-prijs-/voorraadwijzigingen (Commerce Cloud-service) voor Sellers met een groot assortiment.

---

# 15. Webhooks

**Geen enkele regel hierover is al vastgelegd** — architecturaal nieuw terrein. Relevant vanuit twee, wél al bevroren hoeken:

- **Inkomend:** externe partijen (PSP, verzenders — zie sectie 17) melden statuswijzigingen (betaling voltooid, zending afgeleverd) via een inkomend webhook-patroon, dat vervolgens de bevroren interne event-/statuslogica triggert (bijv. de Order-service die een betaalbevestiging verwerkt).
- **Uitgaand:** een toekomstige externe integratie (bijv. een Seller die zijn eigen ERP wil laten meeluisteren op ordergebeurtenissen) zou via uitgaande webhooks kunnen lopen — dit is nog geen bevroren functionaliteit, uitsluitend een architecturale plek waar dit zou landen.

---

# 16. Events

Rechtstreeks gebaseerd op TB-01's "Event Driven waar zinvol"-principe en Medusa's ingebouwde workflow-/event-engine (TB-01 Deel 3): gebeurtenissen die meerdere services raken, lopen via events, niet via directe, synchrone cross-service-aanroepen. Concreet, al bevroren voorbeelden die dit patroon vereisen:

- Een succesvolle betaling → ordersplitsing (Checkout) → een event per gesplitste Order richting de Order-service.
- Een goedgekeurde merge (Product Cloud-service) → een event dat de Verified-status intrekt (Datamodel B.14, Businessregels) — dit raakt zowel Product Cloud als, indirect, elke Offer die aan het samengevoegde product hangt.
- Een Review-aggregaat-wijziging (Review-service) → een event richting de Commerce Cloud/Buy Box-service, die de Buy Box-herberekening triggert (Datamodel C.4, Businessregels: "wordt herberekend bij elke relevante wijziging").

---

# 17. Externe API's

| Externe partij | Aard van de integratie | Richting | Grondslag |
|---|---|---|---|
| **Shopify (of vergelijkbaar)** | Mogelijke synchronisatie van assortiment/voorraad voor een Seller die al elders (bijv. Shopify) verkoopt | Inkomend (data van de externe winkel naar Offer/Inventory) | Niet bevroren — architecturale plek gereserveerd, geen besluit dat dit daadwerkelijk gebouwd wordt |
| **PSP (betaalprovider)** | Betaalverwerking bij Checkout | Uitgaand (betaalverzoek) + inkomend (webhook, statusbevestiging) | Medusa-standaardmodule Payment (TB-01 Deel 3.1/6), leverancier zelf nog niet gekozen (TB-01 Open punten) |
| **Verzenders** | Fulfilment/verzendstatus | Uitgaand (zending aanmelden) + inkomend (track & trace-updates) | Medusa-standaardmodule Fulfilment (TB-01 Deel 3.1), gekoppeld aan het nog niet gebouwde Shipment-domeinobject (Datamodel §16, Status Open) |
| **AI-validatie-API** | AI-ondersteuning bij matching, claims, moderatie, verificatie | Uitgaand (aanroep) + inkomend (aanbeveling, opgeslagen als `ai_metadata`) | Al bevroren, meermaals toegepast in Sprint 1C-modules; AI beslist nooit (Blueprint H9.7) |
| **Externe zoekservice** | Productindexering voor zoekfunctie | Uitgaand (event-gedreven indexering bij relevante statusovergang) | `standard-vs-custom.md`, TB-01 Deel 3.1 |

---

# A. API-overzicht per domein

| Domein | Service | Kernresources |
|---|---|---|
| Identiteit & Partners | Partner-service (+ gedeelde Customer-identiteit) | Customer, Seller, Company, Brand, Manufacturer |
| Product Cloud | Product Cloud-service | Product, ProductFamily, Category, OwnershipRecord, Claim, Dispute, MatchCandidate, ModerationCase, ProductOrigin |
| Commerce Cloud | Commerce Cloud/Buy Box-service | Offer, BuyBoxResult |
| Orders & Fulfilment | Order-service | OrderSet, Order, Shipment (open), Return (open) |
| Reviews | Review-service | Review |
| Ondersteuning (nog geen service) | — | Advertisement (open), Subscription (open) |
| Cross-cutting | AI-ondersteuningsservice, Platformbrede gedeelde services | AIMetadata, AuditLogEntry, Notification |
| Affiliate *(nieuw, v0.2)* | Affiliate-service | Affiliate, AffiliateLink, Coupon, Click, Conversion, ConsentRecord |
| Finance *(nieuw, v0.2)* | Finance-service | Commission, Invoice, Payout |

---

# B. Service-eigenaarschap per resource

*(Zie sectie 2 voor de volledige tabel-toewijzing; onderstaand uitsluitend de resource-op-service-samenvatting.)*

| Resource | Eigenaar-service |
|---|---|
| Customer | Gedeelde identiteit (geen eigen service) |
| Seller, Company, Brand, Manufacturer | Partner-service |
| Product, ProductFamily, Category, OwnershipRecord, Claim, Dispute, MatchCandidate, ModerationCase, ProductOrigin | Product Cloud-service |
| Offer, BuyBoxResult | Commerce Cloud/Buy Box-service |
| OrderSet, Order, Shipment, Return, Message | Order-service |
| Review | Review-service |
| AIMetadata | AI-ondersteuningsservice |
| AuditLogEntry, Notification | Platformbrede, gedeelde services |
| Advertisement, Subscription | Nog geen service toegewezen (Status Open) |
| Affiliate, AffiliateLink, Coupon, Click, Conversion, ConsentRecord | Affiliate-service *(nieuw, v0.2)* |
| Commission, Invoice, Payout | Finance-service *(nieuw, v0.2)* |

---

# C. Publiek / Seller / Intern per resource

| Resource | Publiek (Bezoeker/Klant) | Seller (eigen) | Intern (Beheerder-only) |
|---|---|---|---|
| Product | Lezen (gepubliceerde versie) | Lezen/schrijven (eigen concept) | Volledig |
| Category | Lezen | — | Schrijven |
| OwnershipRecord | — | Lezen (eigen historie) | Volledig |
| Claim | — | Lezen/schrijven (indienen) | Beoordelen |
| Dispute | — | — | Volledig |
| MatchCandidate | — | — | Volledig |
| ModerationCase | — | — | Volledig |
| ProductOrigin | Lezen (badge-uitkomst) | Lezen/schrijven (aanvraag) | Beoordelen |
| Offer | Lezen (actieve Offers) | Lezen/schrijven (eigen) | Volledig |
| Inventory | Lezen (beschikbaarheid, niet exact aantal) | Lezen/schrijven (eigen) | Volledig |
| Price | Lezen | Lezen/schrijven (eigen) | Volledig |
| BuyBoxResult | Lezen | Lezen (eigen positie) | Volledig |
| OrderSet, Order | — | Lezen (eigen als koper/Klant of aanbieder/Seller) | Volledig |
| Shipment, Return | Nog niet vastgelegd | Nog niet vastgelegd | Nog niet vastgelegd |
| Message | — | Lezen/schrijven (eigen Order-conversatie, Klant of Seller) | Lezen (bij escalatie) |
| Review | Lezen | Schrijven (eigen, als Klant, na aankoop) | Modereren |
| Seller, Company | — | Lezen/schrijven (eigen) | Volledig |
| Brand, Manufacturer | Lezen | Lezen/schrijven (eigen) | Volledig |
| AIMetadata | — | — | Lezen (als onderdeel van een beoordeling) |
| AuditLogEntry | — | — | Lezen |
| Notification | — | Lezen (eigen) | Lezen (alle) |
| Customer | — | Lezen/schrijven (eigen) | Lezen |
| Advertisement, Subscription | Nog niet vastgelegd | Nog niet vastgelegd | Nog niet vastgelegd |
| Affiliate, AffiliateLink, Coupon | — | Lezen/schrijven (eigen, als Affiliate) | Volledig |
| Click, Conversion | — | Lezen (eigen, als Affiliate) | Volledig |
| ConsentRecord | Schrijven (cookiebanner-interactie) | — | Lezen |
| Commission, Payout | — | Lezen (eigen, als Seller/Affiliate) | Volledig |
| Invoice | Lezen (eigen, als Klant) | Lezen (eigen, als Seller) | Volledig |

---

# D. Geconstateerde inconsistenties

Conform de opdracht: de bronnen (`01-domain-model.md`, `02-database-model.md`) zijn niet aangepast. Onderstaand elke plek waar het ontwerpen van deze API-architectuur een spanning, gat of onbeantwoorde vraag blootlegde.

1. **`buy_box_computation` is in het datamodel een cache-tabel zonder audit-trail, maar de API-laag vereist een expliciete "nooit direct schrijfbaar"-regel die nergens formeel is vastgelegd.** Sectie 4 (CRUD) van dit document legt vast dat BuyBoxResult nooit direct door een aanroeper geschreven mag worden — uitsluitend intern herberekend. Dit is een logische, maar zelfstandige aanname van dit API-document, niet een letterlijk overgenomen regel uit de bronnen. **Aanbeveling:** bevestig deze regel expliciet in een van de brondocumenten, zodat toekomstige API-ontwerpers dit niet opnieuw hoeven af te leiden.

2. **Versiebeheer, rate limiting, webhooks en paginering-strategie hebben geen enkele grondslag in het domein- of datamodel.** Dit is geen fout van deze documenten (ze gaan over domein/data, niet over API-mechaniek), maar het betekent dat secties 7, 9, 13 en 15 van dit document uitsluitend architecturale oriëntatie bieden, geen vastgelegde keuze. **Aanbeveling:** een apart Sprint 2-document ("API-conventies" of vergelijkbaar) dat deze vier onderwerpen expliciet vaststelt, zodat services ze niet elk apart, inconsistent invullen.

3. **`Company` heeft geen eigen toegangspad, maar het datamodel geeft `company` wel een eigen tabel met eigen gevoelige velden (IBAN, KvK-nummer).** Sectie 3.5 van dit document plaatst Company uitsluitend als sub-resource van Seller, zonder zelfstandig REST-pad — een keuze van dit document, niet expliciet voorgeschreven door het datamodel. Gegeven dat `company`'s inzage al apart gelogd wordt (Datamodel A.2), is een zelfstandig, apart geautoriseerd toegangspad wellicht toch gewenst. **Aanbeveling:** bevestig of Company een eigen resource-toegangspad verdient, los van Seller.

4. **Customer heeft geen toegewezen service (consistent met het datamodel), maar dat betekent dat de API-architectuur geen duidelijk "eigenaarschap" voor Customer-mutaties kan aanwijzen.** In de praktijk zal élke service Customer-gegevens moeten kunnen lezen (voor autorisatie, weergave van eigenaarschap, e.a.) — zonder een aangewezen eigenaar-service is onduidelijk welke service verantwoordelijk is voor Customer-schrijfoperaties (registratie, profielwijziging). **Aanbeveling:** wijs alsnog een "Identity-service" aan, of bevestig expliciet dat dit in de kern-monoliet blijft als gedeelde voorziening zonder eigen service-grens.

5. **Shipment, Return, Advertisement en Subscription hebben, consistent met hun Status "Open," ook op API-niveau geen enkele ingevulde rij** (sectie 4, C). Dit is geen inconsistentie tussen documenten — het is de correcte, eerlijke doorvertaling van een al erkend gat — maar het betekent dat dit API-model voor vier van de 25 domeinobjecten nog geen enkele bruikbare architectuur biedt. **Aanbeveling:** geen aparte actie nodig bovenop wat het domeinmodel al aangeeft; dit API-document kan deze vier pas invullen zodra de onderliggende businessregels alsnog worden vastgesteld.

---

## API-besluitstatus

Per belangrijke API-keuze in dit document: de **Status** (Definitief/Voorlopig/Open), de primaire **Bron**, en of validatie nog nodig is vóórdat een volgend Sprint 2-document (code, OpenAPI, REST-endpoints) erop voortbouwt. Zelfde conventie als de Besluitstatus-tabel in `01-domain-model.md`.

| Onderwerp | Status | Bron | Moet nog gevalideerd worden? |
|---|---|---|---|
| API-versiebeheer | Open | Nieuw ontwerp Sprint 2 | Ja — geen enkele regel vastgelegd in domein-/datamodel (sectie 7) |
| Authenticatie | Definitief | Bestaande documentatie | Nee — rechtstreeks overgenomen uit de bevroren Authenticatie-specificatie (sectie 5) |
| Autorisatie | Definitief | Bestaande documentatie | Nee — rechtstreeks ADR 0005-principe, platformbreed al toegepast (sectie 6) |
| Rate limiting | Voorlopig | Bestaande documentatie + Nieuw ontwerp Sprint 2 | Ja — het principe is gegrond (Partner Onboarding), concrete limieten zijn niet vastgelegd (sectie 9) |
| Idempotency | Voorlopig | Bestaande documentatie + Nieuw ontwerp Sprint 2 | Ja — de noodzaak is gegrond (Checkout/Order Management Center-edge case), het mechanisme (idempotency-sleutel) is hier voor het eerst ontworpen (sectie 10) |
| Filtering | Voorlopig | Bestaande documentatie + Nieuw ontwerp Sprint 2 | Ja — het principe is gegrond (Attribute-model), de concrete filterlijst is een samenstelling van dit document (sectie 11) |
| Sorteren | Voorlopig | Bestaande documentatie + Nieuw ontwerp Sprint 2 | Ja — standaardsortering-op-Buy Box is gegrond, de API-keuze zelf is hier voor het eerst vastgelegd (sectie 12) |
| Paginering | Open | Nieuw ontwerp Sprint 2 | Ja — uitsluitend een architecturale aanbeveling (cursor- versus offset-gebaseerd), geen vastgelegde keuze (sectie 13, zie ook Geconstateerde inconsistenties #2) |
| Bulk-operaties | Voorlopig | Bestaande documentatie + Nieuw ontwerp Sprint 2 | Ja — gegrond voor Product Management (BulkActionJob), de uitbreiding naar Offer-bulk-operaties is hier nieuw voorgesteld (sectie 14) |
| Webhooks | Open | Nieuw ontwerp Sprint 2 | Ja — geen enkele regel vastgelegd, uitsluitend architecturaal gereserveerd (sectie 15) |
| Events | Voorlopig | Bestaande documentatie + Nieuw ontwerp Sprint 2 | Ja — het principe en de concrete triggers zijn gegrond (TB-01, meerdere bevroren specificaties), het volledige event-schema zelf staat expliciet als Open punt in TB-01 (sectie 16) |
| Externe API-integraties | Voorlopig | Bestaande documentatie + Nieuw ontwerp Sprint 2 | Ja — AI-validatie-API en externe zoekservice zijn bevroren; PSP/verzender-leveranciers zijn nog niet gekozen (TB-01 Open punten); Shopify-integratie is uitsluitend een gereserveerde plek, geen besluit (sectie 17) |

**Samenvatting:** 2 van de 12 onderwerpen zijn **Definitief** (Authenticatie, Autorisatie), 7 zijn **Voorlopig**, 3 zijn **Open** (API-versiebeheer, Paginering, Webhooks). Alle 10 niet-Definitieve onderwerpen vereisen validatie vóórdat dit API-model als basis dient voor een concreet REST-/OpenAPI-ontwerp.
