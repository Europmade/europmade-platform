# Order Management Center (Sprint 1C)

**Status:** v1.1 — **definitief bevroren**, na een onafhankelijke functionele review (twee bevindingen verwerkt: O1, O2). Zevende onderdeel van Sprint 1C, bouwt uitsluitend voort op de definitief bevroren Product Cloud Architecture (v1.1), Product Management (v1.1), Admin Shell & Dashboard Framework (v1.1), Moderation Center (v1.1), Verification Center (v1.1) en Partner Center (v1.1), plus de bevroren Checkout- en Orderbevestiging-specificaties.

## Inhoud

- [`spec.md`](./spec.md) — volledige functionele specificatie: doel/scope, orderoverzicht, orderdetail, orderstatussen, orderacties, beslisregels, auditregistratie, rechten/zichtbaarheid, Admin Shell-registratiecontract, API-gebruik, datamodel-toets, architectuurcontrole en zelfreview.

## Onafhankelijke functionele review — verwerkt

Twee bevindingen verwerkt vóór bevriezing:
- **O1** — foutieve interne verwijzing gecorrigeerd: de uitzonderingsqueue werd aangewezen als "sectie 3" (Orderdetail), maar staat daadwerkelijk in sectie 4 (Orderstatussen)/sectie 5 (Orderacties).
- **O2** — een rekenkundig onjuiste claim gecorrigeerd: "acht van de negen benodigde functies" kwam niet overeen met de daadwerkelijke, vier functies tellende API-tabel in sectie 10 (drie hergebruikte diensten + één nieuwe dienst).

O3, O4 en O5 zijn op uitdrukkelijk verzoek niet verwerkt.

## Belangrijkste vaststellingen

- **Vult een al door Checkout aangekondigd, tot nu toe niet ingevuld uitzonderingsmechanisme in** — de "geschil-achtige melding... voor handmatige afhandeling" bij een mislukte ordersplitsing ná succesvolle betaling (Checkout sectie 5, Stap 2 — Betaling, Edge cases).
- **Checkout, Winkelwagen en Orderbevestiging blijven volledig eigenaar van hun eigen flows** — het Order Management Center toont uitsluitend **reeds geplaatste** orders, voor de Beheerder.
- **Uitsluitend één, smal begrensde schrijfactie** ("uitzonderingsgeval markeren als afgehandeld") — verder een zuivere leeslaag; geen betalings-, fulfilment-, retour- of klantenservicefunctionaliteit.
- **Eén nieuwe, minimale dienst is aantoonbaar noodzakelijk gebleken:** een Order-inzage-API, omdat geen van de acht al bestaande, benoemde Marketplace Core-diensten Order-/OrderSet-data dekt.
- **Eerlijk over de grens van AuditLogEntry** — die entiteit is architecturaal een Product Cloud-concept; dit document hergebruikt uitsluitend het generieke logformaat, niet de entiteit zelf, voor het Order-domein.

## Relatie met andere mappen

- Bouwt uitsluitend voort op [`product-cloud-architecture/`](../product-cloud-architecture/README.md), [`product-management/`](../product-management/README.md), [`admin-shell/`](../admin-shell/README.md), [`moderation-center/`](../moderation-center/README.md), [`verification-center/`](../verification-center/README.md) en [`partner-center/`](../partner-center/README.md) (alle zes bevroren, v1.1) — geen enkele regel daaruit gewijzigd.
- Hergebruikt de ordersplitsings-, Order-/OrderSet- en BTW-weergaveprincipes uit de bevroren Checkout- en Orderbevestiging-specificaties (sprint 1A/1B) letterlijk, zonder ze te wijzigen.
- Hergebruikt API-namen uit `marketplace-core/` (bevroren) en introduceert er, expliciet gemotiveerd, één nieuwe, minimale dienst naast.
- Geregistreerd als vierde concrete module via het Admin Shell-contract, naar het precedent van Moderation Center, Verification Center en Partner Center.
