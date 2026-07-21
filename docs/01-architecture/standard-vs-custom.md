# Standard where possible, custom where it creates competitive advantage

**Status:** Definitief

Dit principe stuurt iedere UX- en technische beslissing binnen EuropMade: waar Medusa/Next.js een beproefd, standaard patroon bieden, ontwerpen we daarbinnen (lagere bouwtijd, hogere onderhoudbaarheid, sneller MVP). Waar EuropMade's onderscheidend vermogen zit, ontwerpen we bewust maatwerk, ook als dat meer bouwtijd kost.

## Wat Medusa standaard biedt

Medusa is opgebouwd uit losse modules: Product, Variant, Cart, Order, Customer, Store, **Region** (valuta/belasting/verzending per land), Pricing, Promotion, Fulfillment, Payment, plus een uitbreidbaar Admin-dashboard en een workflow-engine voor bedrijfslogica. Next.js levert hiervoor een aparte, ontkoppelde storefront — er is geen ingebouwde marketplace-checkout of multi-vendor-productpagina.

- **Region-model** = basis voor de 6-landen-launch (zie ook `02-ux/ux-architecture.md`, sectie navigatie): elk land een Medusa Region, vertaald naar Next.js locale-routing.
- **Customer/Cart/Payment** = grotendeels standaard e-commercepatroon.
- **Product/Variant** = basis van de Product Cloud, uitgebreid met eigenaarschap, EAN-hiërarchie, relaties, Quality/Health Score.
- **Medusa Admin** = juiste basis voor de Administrator-rol, uitgebreid met custom widgets/UI-routes.
- **Medusa Admin is géén self-service portal voor externe partners** — het Partnerdashboard wordt een losse Next.js-applicatie (standaard bouwpatroon, maatwerk schermen).

## De belangrijkste architectuurbeslissing: het Buy Box-model

Vrijwel alle bestaande multi-vendor-oplossingen op Medusa volgen het patroon **"1 product = 1 vendor"**, met ordersplitsing per vendor. EuropMade vraagt om **1 product = N aanbieders** met één centrale productpagina en een transparante Buy Box. Dit is precies het punt waarop bewust wordt geïnvesteerd in maatwerk:

- **Product Cloud** = standaard Medusa Product/Variant-model, verrijkt met eigenaarschap, meerdere EAN's, relaties, versiebeheer.
- **Commerce Cloud** = custom **Offer-datamodel** (via Medusa's module-linksysteem), losstaand van het Product-record.
- **Buy Box-UI** = maatwerk-component die alle Offers bij één product ophaalt en sorteert.
- **Checkout met meerdere aanbieders** = maatwerk-uitbreiding op de standaard cart/order-flow: één winkelwagen wordt bij afronden gesplitst in sub-orders per gekozen aanbieder.

Volledige functionele uitwerking: zie [`03-functional-specs/product-cloud-commerce-cloud-buy-box/`](../03-functional-specs/product-cloud-commerce-cloud-buy-box/README.md).

## Overzicht per domein

| Domein | Bouwaard | Toelichting |
|---|---|---|
| Account, login, adresboek | Standaard | Medusa Customer-module |
| Regio/land, valuta, belasting, verzendopties | Standaard | Medusa Region-model |
| Winkelwagen & afrekenproces (basis) | Standaard | Medusa Cart/Payment/Fulfillment |
| Winkelwagen splitsen in sub-orders per gekozen aanbieder | **Maatwerk** | Kern van het Buy Box-model |
| Product-/variantstructuur (basis) | Standaard | Medusa Product-module |
| Product Cloud (eigenaarschap, EAN's, relaties, versiebeheer) | **Maatwerk** | Uitbreiding op standaardmodel |
| Commerce Cloud / Offers + Buy Box-weergave | **Maatwerk** | Grootste architecturale afwijking |
| Retailer Created-status + claim-flow | **Maatwerk** | Uniek eigendomsmodel |
| Wijzigingsvoorstellen + AI-review + producentgoedkeuring | Maatwerk op standaard workflow-engine | Medusa Workflows als technisch fundament |
| Product Quality Score & Product Health Score | **Maatwerk** | Niet aanwezig in Medusa |
| Verified™-label & aanvraagproces | **Maatwerk** | Kernonderscheidend |
| Compliance Dashboard (GPSR/DPP) + AI Compliance Assistent | **Maatwerk** | Niet aanwezig in Medusa |
| Zoekfunctie | Standaard integratie | Externe zoekservice (bijv. Meilisearch/Typesense) |
| Filters categorie-specifiek | Maatwerk (data), standaard (UI-patroon) | |
| Orders, tracking, facturen (basis) | Standaard | Medusa Order-module |
| Retourproces (basis) | Standaard, uitgebreid | Bemiddelingslaag is maatwerk |
| Product-/verkopersreviews (gescheiden) | **Maatwerk** | Niet aanwezig in Medusa |
| Advertentieplatform (banner) | **Maatwerk** | Geen Medusa-equivalent |
| Sponsored Products | **Maatwerk (post-MVP, voorbereid)** | Zie ADR 0003 |
| Partnerdashboard (basisstructuur) | Standaard bouwpatroon, maatwerk schermen | Losse Next.js-app |
| Admin-omgeving (basis) | Standaard, uitgebreid | Medusa Admin + custom widgets |
| Affiliate & Creator platform | **Maatwerk (post-MVP)** | Geen Medusa-equivalent |

Deze indeling is leidend voor prioritering in de wireframe-fase: domeinen gelabeld als **Maatwerk** verdienen de meeste ontwerptijd en iteratie.
