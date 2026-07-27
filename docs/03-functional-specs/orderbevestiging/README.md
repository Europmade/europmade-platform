# Orderbevestiging

**Status:** v1.3 — definitief bevroren (na twee UX-correctierondes op de BTW-weergave). Tweede scherm van Sprint 1B.

## Doel van het scherm

De klant onmiskenbare zekerheid geven dat de bestelling geplaatst is, een volledig en overzichtelijk beeld geven van wat er nu gebeurt (per aanbieder), en een duidelijk vervolgpad bieden — de laatste stap van de kernflow Homepage → ... → Checkout → Orderbevestiging.

## Belangrijkste UX-keuzes

- Grote, ondubbelzinnige succesmelding bovenaan, zonder scrollen zichtbaar op elk breakpoint.
- Twee betaalstatus-toestanden (synchroon "Betaald" / asynchroon "Betaling wordt verwerkt") delen **exact dezelfde pagina-structuur** — geen tweede schermontwerp voor het asynchrone geval.
- Track & trace wordt nooit als placeholder getoond, uitsluitend een aankondigende tekst.
- Duidelijke visuele scheiding tussen marketplace-brede informatie (adres/betaling, één keer getoond) en retailerinformatie (herhaald per deelbestelling).
- Gast-bestellingen krijgen een aangepast "Bestelling bekijken"-pad (geen "Mijn bestellingen" zonder account) met een niet-opdringerige accountsuggestie.

## Architectuurbeslissingen

- Order-/productdata is een **snapshot**, vastgelegd op het orderrecord bij plaatsing — geen live Product Cloud-/Commerce Cloud-referentie, zodat een latere wijziging elders een bevestigde bestelling nooit met terugwerkende kracht verandert.
- Prijs wordt nooit eerder vastgezet dan het moment van orderplaatsing (consistent met de Winkelwagen-spec, sectie 5B).
- Geen enkel commissiegerelateerd gegeven hoort op dit scherm thuis (bevestigd, niets hoefde verwijderd te worden).
- Dit scherm berekent niets — het toont uitsluitend een reeds server-side vastgestelde staat (ADR 0005).
- **BTW/OSS (v1.1):** de klant betaalt altijd de BTW van het land van levering, bepaald via Medusa's standaard Tax Region-mechanisme; BTW wordt definitief bij orderplaatsing (zelfde moment als de prijs); meerdere tarieven binnen één bestelling worden samengevat per tarief, over alle retailers heen. Geconstateerd: Checkout (bevroren) heeft dezelfde lacune nog niet gedicht — aanbevolen voor een aparte, toekomstige revisie.

## Gebruikte componenten

Uitsluitend bestaande componenten, **geen nieuwe toevoeging**: CMP-001, 002, 005, 008, 011, 012, 016, 020, 021. Twee nieuwe, formeel vastgelegde varianten (zie [`07-design-system/components.md`](../../07-design-system/components.md) sectie 3A):
- **CMP-025 (Besteloverzicht), variant `is-confirmed`** — derde variant naast `is-editable` (Winkelwagen) en de read-only Checkout-uitvoering.
- **CMP-030 (Review Block), variant zonder "Wijzigen"-link** — niets is nog bewerkbaar ná plaatsing.

De succesbevestiging bovenaan is een compositie van bestaande typografie-/badge-patronen, geen los component.

## Afhankelijkheden

| Afhankelijkheid | Aard |
|---|---|
| Checkout (bevroren) | Orderbevestiging toont de bevestigde versie van wat Checkout Stap 3 al liet zien. |
| Winkelwagen (bevroren) | Hergebruikt dezelfde CMP-025-structuur voor de derde keer in de klantreis. |
| Commerce Cloud | Uitsluitend als bron van de snapshot ten tijde van bestellen, niet als live databron op dit scherm. |
| Product Cloud | Zelfde snapshot-principe voor productnaam/-afbeelding. |
| Payments | Synchrone vs. asynchrone betaalbevestiging bepaalt welke status-toestand getoond wordt. |
| Orders (ADR 0005) | Server-side ordersplitsing in N deelbestellingen — dit scherm toont uitsluitend het resultaat. |
| E-mailbevestigingen | Eén bevestiging per deelbestelling — dit scherm kondigt dit expliciet aan. |

## Relatie met andere mappen

- Wireframes: [`02-ux/wireframes/sprint-1b/`](../../02-ux/wireframes/sprint-1b/README.md).
- Voert de minimumvereisten uit die de Customer Journey Audit (`02-ux/customer-journey-audit.md`, bevinding J2) al vastlegde in [`checkout/spec.md`](../checkout/README.md) sectie 11.
- Bouwt voort op [`winkelwagen/`](../winkelwagen/README.md) (CMP-025-structuur, snapshot-principe).
- Sluit de volledige MVP-kernflow (Homepage → Categorie/Zoekresultaten → Productpagina → Winkelwagen → Checkout → Orderbevestiging) — zie `02-ux/wireframes/wireframe-strategie.md` voor de volledige journey-controle.
