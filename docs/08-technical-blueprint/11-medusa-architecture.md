# EuropMade — Medusa Architecture

**Status:** Definitief — de officiële Medusa-richtlijn voor EuropMade, vastgesteld vóór de start van de implementatie (ticket S3-00-07). Dit is de laatste architectuurwijziging vóór de bouw.
**Uitgangspunt:** uitsluitend de bestaande, bevroren Blueprint (`00-context/` t/m `09-implementation-blueprint/`) en de eerdere architectuurreview (S3-00-07-ontwerp). Geen nieuwe functionaliteit, geen nieuw domeinbegrip — dit document legt uitsluitend vast *hoe* de al bestaande architectuur op Medusa wordt gerealiseerd.
**Scope:** geen code, geen implementatie, geen wijziging aan `apps/`, `packages/` of enig ander codebestand.

---

## Leeswijzer

Dit document sluit drie punten af die de vorige architectuurreview (S3-00-07-ontwerp) expliciet openliet: de Customer/Auth-scheiding (sectie 5), de status van Notification (sectie 6), en de rolverdeling tussen Medusa Admin en `apps/admin` (sectie 4). Elke sectie citeert waar mogelijk het exacte Blueprint-document dat zij uitvoert.

---

# 1. Architectuurprincipes

- **Medusa v2 is het fundament van EuropMade.** Niet v1 — v2's Modules API en Module Links zijn het mechanisme waarop elk volgend punt hieronder steunt.
- **Standaard Medusa blijft altijd leidend.** Waar Medusa een module levert, wordt die gebruikt — nooit vervangen "omdat het makkelijker zou zijn."
- **Geen forks van Medusa.** Geen enkel core-pakket wordt gekopieerd, overschreven of losgekoppeld van toekomstige upgrades.
- **Geen wijzigingen aan core-tabellen**, tenzij aantoonbaar technisch onvermijdelijk — en dan uitsluitend na een expliciet, gedocumenteerd besluit (ADR), nooit stilzwijgend.
- **Alle EuropMade-functionaliteit wordt gebouwd als custom Medusa Modules**, gekoppeld via Module Links — consistent met `01-architecture/standard-vs-custom.md`: *"Commerce Cloud = custom Offer-datamodel (via Medusa's module-linksysteem), losstaand van het Product-record."*

---

# 2. Welke Medusa-modules standaard blijven

| Module | Waarom standaard |
|---|---|
| **Customer** | Identiteit (Klant, en de persoon achter een Seller-rol) — `standard-vs-custom.md`: "Standaard \| Medusa Customer-module." Bevat uitsluitend identiteitsvelden, geen credentials (zie sectie 5). |
| **Auth** | Wachtwoordbeheer, e-mailverificatie, sessie-uitgifte — het mechanisme dat sectie 5 hieronder vastlegt. Nergens in de Blueprint bestaat een reden om dit zelf te bouwen. |
| **Product** | Basis product-/variantstructuur — `standard-vs-custom.md`: "uitgebreid met eigenaarschap, EAN-hiërarchie, relaties, Quality/Health Score," nooit vervangen. |
| **Cart** | Winkelwagen (basis) — `winkelwagen/spec.md` bouwt hierop voort, herschrijft het niet. |
| **Order** | Order (basis) — EuropMade's `order_set`/`order`-splitsing (Deel D.1-D.2) gebruikt Medusa v2's eigen multi-order-per-cart-mechanisme, geen eigen ordersysteem. |
| **Payment** | Betaalverwerking — wacht op ADR-01 (PSP-keuze); uitsluitend een payment-provider-plugin toegevoegd, de module zelf blijft ongewijzigd. |
| **Fulfillment** | Verzending/levering — fundament voor `shipment` (Domeinmodel §16, Open). |
| **Inventory** | Voorraad — fundament voor `inventory` (Deel C.2). |
| **Pricing** | Prijslogica — fundament voor `price` (Deel C.3). |
| **Promotions** | Kortingen — infrastructuur voor het (Post-MVP) generieke kortingenplatform; expliciet **niet** gebruikt voor Affiliate-coupons (zie sectie 3, Affiliate). |
| **Region** | Land/valuta/belasting/verzending — `standard-vs-custom.md`: basis voor de 6-landen-launch. |
| **Notification** | Uitgaande kanaalafhandeling (e-mail e.d.) — zie sectie 6 voor de volledige, preciezere toelichting. |
| **Event Bus** | Interne domeingebeurtenissen — fundament voor het al vastgelegde eventmodel (`04-event-model.md`, 43 events); EuropMade's events lopen als abonnees, geen eigen messagebus. |
| **Medusa Admin** | Technisch platformbeheer — zie sectie 4 voor de volledige rolverdeling met `apps/admin`. |

---

# 3. EuropMade Custom Modules

Elke module hieronder is een eigen Medusa-module, gekoppeld aan standaardmodules via **Module Links** — nooit een fork van een standaardschema.

| Custom module | Tabellen (Datamodel-bron) | Gekoppeld aan | Functionele bron |
|---|---|---|---|
| **Partner** | `company`, `seller`, `brand`, `distributor_authorization`, `manufacturer` (Deel A.2-A.6) | Customer (Seller = rol op een Customer, Domeinmodel §1) | `partner-onboarding/spec.md`, `partner-center/spec.md` |
| **Product Cloud** | `product_family`, `product_version`, `identifier`, `attribute_definition/value`, `ownership_record`, `claim`, `dispute`, `match_candidate`, `merge_record`/`split_record`, `media`, `document`, `translation` (Deel B, exclusief B.13/B.14 — zie Verification/Moderation) | Product, Category (standaard) | `product-cloud-architecture/spec.md`, `product-management/spec.md` |
| **Commerce Cloud** | `offer`, `buy_box_computation` (Deel C.1/C.4); uitbreiding op `inventory`/`price` via link | Product, Seller, Inventory, Pricing | `product-cloud-commerce-cloud-buy-box/spec.md` — *"grootste architecturale afwijking"* |
| **Verification** | `product_origin` (Deel B.14) | Product Cloud | `verification-center/spec.md` — *"harde, wederzijdse scope-grens met Moderation Center"* |
| **Moderation** | `moderation_case` (Deel B.13) | Product Cloud, Partner | `moderation-center/spec.md` |
| **Affiliate** | `affiliate`, `affiliate_link`, `click`, `conversion`, `coupon`, `consent_record` (Deel G.1-G.5, G.10) | Customer, Order | `affiliate-platform/spec.md` |
| **Finance** | `commission`, `invoice`, `payout` (Deel G.6-G.8) | Order, Affiliate, Payment | `finance/spec.md` |
| **Messaging** | `message` (Deel G.9) | Order | `messaging-reviews-qa/spec.md` §1 |
| **AI Support** | `ai_metadata` (Deel F.1) | Product, ModerationCase | Domeinobject 22 — "AI ondersteunt, beslist nooit" |
| **Audit** | `audit_log` (Deel F.2) | — (universeel consument, via Event Bus) | `04-event-model.md` §13 |

**Koppeling via Module Links, concreet:** elke custom module definieert zijn eigen schema en registreert een link naar het betreffende standaardmodule-record (bijv. `offer` linkt naar `product_variant_id`, niet andersom) — het standaardmodule-schema wordt hierdoor nooit aangeraakt, en de link is los te maken zonder de standaardmodule te beïnvloeden.

**Zie sectie 9 voor een gevonden leemte** (Review, `advertisement`, `subscription` zijn niet in deze lijst van tien opgenomen).

---

# 4. Admin-architectuur

**Bevestigd, geen open vraag meer:**

- **Medusa Admin blijft bestaan** voor technisch platformbeheer: productcatalogus-onderhoud op het niveau van de standaardmodule, order-/betalings-/voorraadbeheer op Medusa-niveau, systeeminstellingen, plugin-/regioconfiguratie.
- **`apps/admin` blijft bestaan** als het **EuropMade Operations Platform**: Partnerbeheer, Moderatiewachtrij, Verification Center, Geschillenbeheer, Compliance-overzicht, Commissie-instellingen, Audittrail — kortom, elk scherm dat een EuropMade-specifiek businessproces bedient (`admin-shell/spec.md`, `moderation-center/spec.md`, `verification-center/spec.md`, `partner-center/spec.md`).
- **Beide vullen elkaar aan, vervangen elkaar niet.** `apps/admin` roept Medusa's Admin-API aan voor alles wat standaard is (bijv. een Order-status opzoeken), en de eigen custom-module-API's voor alles wat EuropMade-specifiek is (bijv. een moderatiebesluit vastleggen). Medusa Admin krijgt op zijn beurt uitsluitend widgets die verwijzen náár `apps/admin` voor EuropMade-specifieke acties — nooit een parallelle implementatie van dezelfde functionaliteit.

| Verantwoordelijkheid | Medusa Admin | apps/admin (EuropMade Operations Platform) |
|---|---|---|
| Productcatalogus (standaardvelden) | ✓ | — |
| Order-/betalings-/voorraadbeheer (standaard) | ✓ | — |
| Systeem-/regio-/plugin-instellingen | ✓ | — |
| Partnerbeheer (goedkeuren/afwijzen/blokkeren) | — | ✓ |
| Moderatiewachtrij | — | ✓ |
| Verification Center (Verified™) | — | ✓ |
| Geschillenbeheer | — | ✓ |
| Commissie-/Affiliate-instellingen | — | ✓ |
| Compliance-overzicht, Audittrail | — | ✓ |

---

# 5. Customer/Auth-architectuur

**Definitief vastgelegd:**

- **Customer-identiteit blijft standaard Medusa.** Geen custom Customer-module, geen fork.
- **Authenticatie verloopt via Medusa's Auth-module** (emailpass-provider voor Klant/Seller, en het bestaande Auth.js-patroon in `apps/admin` blijft uitsluitend voor Beheerder-toegang tot `apps/admin` zelf — twee gescheiden authenticatiecontexten, consistent met sectie 4).
- **Wachtwoorden worden nooit in een custom Customer-module opgeslagen.** Dit corrigeert `02-database-model.md` Deel A.1, waar `password_hash` destijds direct op de `customer`-tabel stond — dat veld hoort bij Medusa's Auth-module (`auth_identity`/`provider_identity`), niet bij Customer. Zie sectie 9 voor de formele afhandeling van deze correctie.
- **EuropMade voegt uitsluitend aanvullende metadata toe waar nodig** — concreet: `two_factor_enabled` (Domeinmodel-eis: verplicht zodra een Seller-rol actief is) wordt een klein, custom veld gekoppeld via Module Link, niet een kolom op Customer of Auth zelf.

---

# 6. Notification-architectuur

**Definitief vastgelegd:** Notification gebruikt de standaard Medusa Notification-module voor alle uitgaande kanaalafhandeling (e-mail, en later eventueel sms/push). EuropMade voegt uitsluitend **subscribers/events** toe die de module aanroepen — geen eigen verzendmechanisme.

**Eén precisering, geen afwijking van de instructie:** `02-database-model.md` Deel F.3 beschrijft naast verzending ook een **in-app meldingenfeed** (het "Meldingencentrum," scherm #51) — een per-gebruiker opvraagbare lijst van eerdere meldingen. Medusa's Notification-module regelt de *verzending*, niet per definitie een opvraagbare, persistente feed. Deze feed blijft daarom een dunne, custom uitbreiding (gekoppeld via Module Link aan Customer), niet een aparte verzendmodule — de instructie "uitsluitend subscribers/events toevoegen" blijft voor de verzendkant volledig van toepassing; de feed zelf is doorzoekbare opslag, geen verzendlogica.

---

# 7. Upgradebeleid

Regels die toekomstige Medusa-upgrades eenvoudig houden:

1. **Nooit een core-bestand van Medusa direct bewerken.** Elke aanpassing loopt via een custom module, een Module Link, een Workflow-hook, of een Admin-widget.
2. **Custom modules volgen Medusa's eigen moduleconventies** (schema, migraties, service-laag) — geen eigen, afwijkend patroon ernaast.
3. **Elke koppeling aan een standaardmodule loopt via Module Links**, nooit via een directe foreign key in een standaardtabel.
4. **Bij elke Medusa-major-upgrade:** eerst de custom modules geïsoleerd testen tegen de nieuwe kernversie, vóórdat een upgrade wordt doorgevoerd — een custom module die breekt, mag nooit een reden zijn om de kern zelf aan te passen.
5. **Geen versie-pinning op een fork of patch van Medusa** — uitsluitend officiële releases.

---

# 8. Definitieve repositorystructuur (na S3-00-07)

```
EuropMade/
├── apps/
│   ├── backend/                      ← Medusa v2-applicatie
│   │   ├── medusa-config.ts
│   │   └── src/
│   │       ├── modules/
│   │       │   ├── partner/
│   │       │   ├── product-cloud/
│   │       │   ├── commerce-cloud/
│   │       │   ├── verification/
│   │       │   ├── moderation/
│   │       │   ├── affiliate/
│   │       │   ├── finance/
│   │       │   ├── messaging/
│   │       │   ├── ai-support/
│   │       │   └── audit/
│   │       ├── links/                ← Module Links naar standaardmodules
│   │       ├── workflows/            ← hooks op standaard-workflows
│   │       ├── subscribers/          ← Event Bus-abonnees (04-event-model.md)
│   │       ├── api/                  ← custom admin-/store-routes
│   │       └── admin/widgets/        ← verwijzen naar apps/admin, geen duplicatie
│   ├── web/                          ← ongewijzigd — Medusa Store-API
│   └── admin/                        ← EuropMade Operations Platform (sectie 4)
├── packages/
│   ├── config/                       ← ongewijzigd
│   ├── types/                        ← uitgebreid met Medusa-afgeleide domeintypes
│   ├── ui/                           ← ongewijzigd
│   └── utils/                        ← ongewijzigd
├── docker-compose.yml                ← ongewijzigd
└── pnpm-workspace.yaml               ← `apps/backend` toegevoegd
```

---

# 9. Controle — aansluiting op de bestaande Blueprint

**Drie eerder openstaande punten (S3-00-07-ontwerp), nu afgesloten door dit document:**

1. **Customer/Auth-conflatie** — afgesloten door sectie 5. **Resterende, niet-doorgevoerde correctie:** `02-database-model.md` Deel A.1 vermeldt `password_hash` nog letterlijk als kolom op `customer`. Dit document legt vast dat dat technisch onjuist is (hoort bij Auth), maar wijzigt Deel A.1 zelf niet — conform de instructie "wijzig geen andere Blueprint-documenten." **Voorstel:** een klein, toekomstig ADR dat Deel A.1 formeel corrigeert (verwijder `password_hash`, voeg een toelichting toe dat credentials via Medusa Auth lopen).
2. **Notification-classificatie** — afgesloten door sectie 6, inclusief de precisering over de in-app-feed.
3. **Twee admin-omgevingen** — afgesloten door sectie 4, met een expliciete verantwoordelijkhedentabel.

**Eén nieuwe leemte, gevonden tijdens het opstellen van dit document:**

4. **Review, Advertisement en Subscription staan niet in de gevraagde lijst van tien custom modules.** `review` (Deel E.1) heeft een eigen, functioneel bevroren spec (`messaging-reviews-qa/spec.md` §2) maar geen eigen module in sectie 3 hierboven. `advertisement`/`subscription` (Deel E.2/E.3) zijn beide Status Open/bewust Post-MVP — voor hen is geen actie nodig. **Voorstel:** Review onderbrengen bij de Messaging-module (beide zijn Order-gekoppeld, beide uit dezelfde functionele spec) — geen wijziging in dit document doorgevoerd, uitsluitend als aandachtspunt vastgelegd voor de daadwerkelijke S3-00-07/S3-06-01-implementatie.

**Verder: geen enkele tegenstrijdigheid gevonden** tussen deze Medusa-architectuur en `01-architecture/standard-vs-custom.md`, `05-service-architecture.md`, `07-deployment-architecture.md` of `09-adr-overview.md`. De Modular Monolith-keuze (Sprint 2) en Medusa v2's eigen Modules-architectuur zijn wederzijds consistent, niet concurrerend.
