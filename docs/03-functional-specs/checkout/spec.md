# EuropMade — Checkout: Complete UX-specificatie

**Status:** v1.0 (definitief, na interne UX-review).
**Component ID-referentie:** CMP-004 (Stepper), CMP-025 (Besteloverzicht/Order Summary), CMP-026 (Choice Card), CMP-027 (Saved Address Selector), CMP-029 (Summary Bar), CMP-030 (Review Block) — zie [`07-design-system/components.md`](../../07-design-system/components.md) voor de volledige, bindende omschrijving.
**Basis:** Blueprint v2.1 (H10.7–10.9), UX-architectuur (`02-ux/ux-architecture.md`), functionele spec Product Cloud/Commerce Cloud/Buy Box, ADR 0001–0005, Wireframe Strategy.
**Voorganger:** Productpagina + Buy Box (bevroren, v1.0) — Checkout begint waar die eindigt: een klant heeft één of meer aanbiedingen in de winkelwagen staan.

---

## 0. Architecturale grondbeslissing (vóór de schermen)

Dit moet vaststaan voordat de schermen zin hebben, en is direct bepalend voor elke stap hieronder:

> **Eén winkelwagen, één betaaltransactie, meerdere orders.** Een klant rekent in één keer af en betaalt één totaalbedrag, ongeacht hoeveel verschillende aanbieders in de winkelwagen zitten. **Na** succesvolle betaling splitst het platform de bestelling server-side op in aparte orders — één per aanbieder (conform ADR 0005: dit gebeurt uitsluitend server-side, nooit client-side). De klant ziet dit vooraf transparant aangekondigd ("Je bestelling wordt opgesplitst in N deelbestellingen"), maar doorloopt zelf maar één betaalproces.
>
> **Twee cart line items met toevallig dezelfde aanbieder worden samengevoegd tot één deelbestelling** — de splitsing gebeurt per unieke aanbieder in de winkelwagen, niet per productregel.

Dit is de directe technische invulling van de "order-splitsing per aanbieder" uit de UX-architectuur (sectie 0.2) en de functionele spec (sectie 0.2), nu geconcretiseerd tot een stappenplan.

## 1. Flow-overzicht

```
[Winkelwagen — Sprint 1B, niet in deze scope]
        ↓ "Afrekenen"
Stap 0 — Gast-of-account-keuzepunt (eenmalig, alleen als nog niet ingelogd)
        ↓
Stap 1 — Verzending (adres + per-aanbieder verzendoverzicht)
        ↓
Stap 2 — Betaling (betaalmethode)
        ↓
Stap 3 — Controle & bevestigen (eindcontrole, akkoord, bestelling plaatsen)
        ↓
[Orderbevestiging — Sprint 1B, niet in deze scope]
```

Een **persistente Besteloverzicht-sidebar** (zelfde structurele patroon als de sticky Buy Box op de Productpagina — bewuste consistentiekeuze) is op alle drie de stappen zichtbaar, met de per-aanbieder-uitsplitsing. Dit is het scherm waar "extra aandacht" (ordersplitsing, verzendkosten/levertijden per retailer, retourinformatie) het zwaarst weegt, en krijgt daarom de meeste diepgang hieronder.

---

## 2. Stap 1 — Besteloverzicht & ordersplitsing (persistente sidebar, alle stappen)

### Doel
De klant te allen tijde exact laten zien wat besteld wordt, bij wie, tegen welke voorwaarden — vóórdat en terwijl betaald wordt. Dit is het scherm dat het multi-vendor-karakter van EuropMade het meest concreet maakt.

### Gebruikersverhaal
*"Als klant met producten van twee verschillende verkopers in mijn winkelwagen wil ik vóór het betalen precies zien wat ik van wie krijg, wat de verzendkosten per verkoper zijn, en dat ik begrijp dat dit als twee aparte leveringen bij me aankomt — zodat ik niet verrast word door twee pakketjes of twee bevestigingsmails."*

### Componenten
- Retailer-groep (herhaald per unieke aanbieder in de winkelwagen): Retailer Indicator, lijst van productregels (afbeelding, naam, aantal, prijs), subtotaal, Shipping Badge, Delivery Estimate, Retourvoorwaarden-link.
- Splitsings-toelichting (info-box, permanent zichtbaar zodra ≥2 aanbieders): "Je bestelling wordt opgesplitst in N deelbestellingen — één per verkoper. Je ontvangt per deelbestelling een aparte bevestiging en track & trace-code."
- Totaalblok: Subtotaal (alle aanbieders), Totale verzendkosten, Totaal te betalen (één bedrag, één betaling).
- "Wijzigen"-link per regel (terug naar Productpagina/Winkelwagen — buiten deze scope, alleen als koppelpunt benoemd).

### Interacties
- Sidebar is sticky op desktop/tablet; op mobiel is dit een inklapbare "Bestelling (N items, €X) ▾"-balk boven de stapinhoud (zelfde patroon als de sticky bottom bar op de Productpagina, maar dan bovenaan i.p.v. onderaan, omdat hier geen primaire CTA in zit — de CTA hoort bij de actieve stap).
- Bij wijziging van adres/land (stap 1) herberekent de sidebar automatisch verzendkosten en filtert eventueel niet-leverbare aanbieders (zie edge cases).

### Validaties
- Geen losse velden hier — dit scherm valideert de *consistentie* van de winkelwagen (zie edge cases), niet gebruikersinvoer.

### Edge cases
- **Retailer intussen geschorst of Offer gedeactiveerd** sinds toevoegen aan winkelwagen → regel wordt gemarkeerd met een waarschuwing: "Deze aanbieder is niet meer beschikbaar. Kies een alternatieve aanbieder." + link terug naar de Productpagina/Buy Box van dat product. Checkout kan niet worden afgerond zolang dit openstaat.
- **Prijs of verzendkosten van een aanbieder gewijzigd** sinds toevoegen aan winkelwagen → regel gemarkeerd ("Prijs gewijzigd: was €X, nu €Y") met vereiste expliciete herbevestiging (checkbox of "Doorgaan met nieuwe prijs"-knop) vóórdat naar stap 2 gegaan kan worden.
- **Voorraad niet meer toereikend** (aantal in winkelwagen > huidige voorraad) → aantal automatisch verlaagd naar beschikbare voorraad, met melding, klant moet dit bevestigen.
- **Twee regels, dezelfde aanbieder** → automatisch samengevoegd tot één retailer-groep met één verzendkostenregel (niet dubbel in rekening gebracht).

### API-afhankelijkheden
- Cart-ophaal met line items + gekoppelde Offer-data (retailer, prijs, voorraad, verzendkosten, levertijd, retourvoorwaarden) per regel — vereist dat elke cart line item een referentie naar een specifieke Offer draagt, niet alleen naar een Medusa-variant.
- Real-time hervalidatie-endpoint (prijs/voorraad/status van elke Offer in de cart) — aangeroepen bij het laden van Checkout en bij elke stapwissel.

### Standaard Medusa-functionaliteit
- Cart-module (line items, quantities, totals-berekening) — basis.

### Maatwerk EuropMade
- Cart line item → Offer-referentie (i.p.v. alleen variant) — kern van het Buy Box-model (zie `01-architecture/standard-vs-custom.md`).
- Groeperen per aanbieder, splitsings-toelichting, per-aanbieder revalidatie-logica — volledig custom, geen Medusa-equivalent.

### Acceptatiecriteria
- [ ] Elke unieke aanbieder in de winkelwagen wordt als aparte groep getoond, met eigen subtotaal, verzendkosten, levertijd en retourvoorwaarden.
- [ ] Bij ≥2 aanbieders is de splitsings-toelichting zichtbaar vóór de betaalstap.
- [ ] Er is precies één totaalbedrag en één betaalactie, ongeacht het aantal aanbieders.
- [ ] Twee regels met dezelfde aanbieder worden samengevoegd tot één groep/verzendkostenregel.
- [ ] Een niet meer beschikbare aanbieder blokkeert het afronden van de checkout totdat opgelost.
- [ ] Sidebar is sticky op desktop/tablet, inklapbaar op mobiel.

---

## 3. Stap 0 — Gast-of-account-keuzepunt

### Doel
De drempel vóór checkout minimaliseren (UX-architectuur, voorstel 1: gast-checkout tot het moment van bestellen) zonder de voordelen van een account (ordertracking, snellere volgende aankoop) te verbergen.

### Gebruikersverhaal
*"Als eenmalige koper wil ik kunnen afrekenen zonder verplicht een account aan te maken, maar als terugkerende klant wil ik meteen kunnen inloggen zodat mijn adres al klaarstaat."*

### Componenten
- Twee gelijkwaardige keuzeblokken: "Inloggen" (e-mail/wachtwoord, of magic link) en "Verder als gast" (alleen e-mailadres verplicht).
- Kleine toelichting bij gastoptie: "Je kunt na het plaatsen van je bestelling alsnog een account aanmaken om deze te volgen."

### Desktop
Twee kolommen naast elkaar (Inloggen | Verder als gast), gelijk gewicht — bewust geen visuele voorkeur voor één van beide, in lijn met het EuropMade-principe van geen sturende defaults.

### Tablet
Zelfde twee-koloms opzet, iets smaller; bij <700px breekt dit naar gestapeld (zie mobiel).

### Mobiel
Gestapeld: "Verder als gast" bovenaan (kortste pad naar conversie, minste frictie), "Inloggen" daaronder als secundaire optie — dit is de enige plek waar desktop en mobiel bewust een andere volgorde hanteren, omdat op mobiel de kans op accountherinnering (opgeslagen wachtwoordbeheerder) lager is en frictie zwaarder weegt.

### Interacties
- Kiezen voor "Inloggen" en succesvol inloggen → adres/betaalgegevens uit account worden vooringevuld in stap 1/2.
- Kiezen voor "Verder als gast" → alleen e-mailadres wordt gevraagd, direct door naar stap 1.

### Validaties
- E-mailadres (gast): geldig e-mailformaat verplicht.
- Inloggen: standaard e-mail/wachtwoord-validatie.

### Foutmeldingen
- "Dit e-mailadres bestaat al als account. Log in of gebruik een ander e-mailadres." (voorkomt dubbele/verwarrende gast-vs-accountorders op hetzelfde e-mailadres)
- "Onjuist wachtwoord. Probeer opnieuw of gebruik 'Wachtwoord vergeten'."

### Edge cases
- Gast rondt bestelling af met een e-mailadres dat al een bestaand account heeft → bovenstaande melding, met directe "Inloggen"-optie zonder de winkelwagen te verliezen.
- Klant navigeert met de browser-terugknop terug naar dit scherm ná al ingelogd te zijn → scherm wordt overgeslagen (niet opnieuw tonen aan een reeds herkende gebruiker).

### API-afhankelijkheden
- Medusa Customer-authenticatie (login) en gast-cart (cart zonder `customer_id`, met alleen e-mail).

### Standaard Medusa-functionaliteit
- Volledig standaard: Medusa ondersteunt zowel geauthenticeerde als gast-carts nativief.

### Maatwerk EuropMade
- Geen — dit scherm volgt het standaardpatroon, geen aanpassing nodig (bevestigt "standard where possible").

### Acceptatiecriteria
- [ ] Gast-optie vereist uitsluitend een e-mailadres, geen verdere verplichte accountvelden.
- [ ] Beide opties zijn visueel gelijkwaardig (geen sturende default).
- [ ] Reeds ingelogde klanten zien dit scherm niet.
- [ ] Bestaand-account-op-gastmail wordt gedetecteerd vóór het plaatsen van de order.

---

## 4. Stap 1 — Verzending (adres)

### Doel
Eén correct, valide afleveradres vastleggen en de klant laten zien wat dit betekent voor levertijd/verzendkosten per aanbieder (i.s.m. de persistente sidebar uit sectie 2).

### Gebruikersverhaal
*"Als klant wil ik mijn adres invullen en direct zien of alle aanbieders in mijn winkelwagen naar dat adres kunnen leveren, vóórdat ik ga betalen."*

### Componenten
- Adresformulier: naam, straat + huisnummer, postcode, plaats, land (dropdown, gekoppeld aan Medusa Region), telefoonnummer (voor bezorgupdates).
- "Gebruik dit adres ook als factuuradres"-checkbox (aangevinkt, met uitklap-optie voor apart factuuradres).
- Bij ingelogde klant: lijst van opgeslagen adressen om uit te kiezen, met "Nieuw adres toevoegen" als alternatief.

### Desktop
Formulier links (max-breedte ~480px, niet full-width — lange formuliervelden op brede schermen verminderen leesbaarheid), Besteloverzicht-sidebar rechts (sectie 2).

### Tablet
Formulier full-width boven, Besteloverzicht-sidebar als full-width blok eronder (niet meer naast elkaar — te weinig breedte voor een leesbaar formulier + sidebar naast elkaar).

### Mobiel
Formulier full-width, Besteloverzicht als inklapbare balk bovenaan (sectie 2). Eén kolom voor alle velden (geen twee-koloms postcode+plaats-indeling die op kleine schermen krap wordt).

### Interacties
- Land-wijziging herberekent direct (via de revalidatie-call uit sectie 2) welke aanbieders nog leverbaar zijn en past valuta/verzendkosten aan.
- Postcode-invoer kan (waar beschikbaar) automatisch straat/plaats invullen — versnelt invoer, geen verplichte afhankelijkheid.

### Validaties
- Alle velden verplicht behalve telefoonnummer (optioneel, tenzij een aanbieder in de winkelwagen een verplicht telefoonnummer vereist voor bezorging — zeldzaam, maar wel te ondersteunen als per-Offer-eigenschap).
- Postcode-formaat gevalideerd per land (bijv. NL: `1234 AB`, DE: 5 cijfers) — niet één generiek patroon voor alle landen.

### Foutmeldingen
- "Vul een geldig postcode in voor Nederland (bijv. 1234 AB)." — landspecifiek, nooit een generieke "ongeldige invoer".
- "Retailer X levert niet naar [land]. Kies een andere aanbieder op de productpagina, of verwijder dit item." — gekoppeld aan de sidebar-waarschuwing uit sectie 2.

### Edge cases
- Klant wijzigt land nadat eerder al een niet-leverbare aanbieder in de winkelwagen zat → dezelfde blokkerende waarschuwing als sectie 2, nu getriggerd door de adreswijziging zelf.
- Postcode/plaats-combinatie bestaat niet (bij automatische validatie) → waarschuwing, niet blokkerend (sommige nieuwe adressen staan nog niet in externe validatiebronnen) — klant kan bevestigen dat het adres correct is.

### API-afhankelijkheden
- Medusa Region-koppeling (land → valuta/belasting/verzendopties).
- Adresvalidatie-service (extern, optioneel — postcode-autocomplete).
- Dezelfde revalidatie-endpoint als sectie 2 (opnieuw aangeroepen bij landwijziging).

### Standaard Medusa-functionaliteit
- Adresopslag/-beheer (Customer Address), Region-gekoppelde valuta/belasting — standaard.

### Maatwerk EuropMade
- Per-aanbieder leverbaarheidscontrole gekoppeld aan adreswijziging — custom, bouwt voort op het Offer-model (Commerce Cloud sectie 2.6).

### Acceptatiecriteria
- [ ] Adresformulier valideert per land een eigen postcode-formaat.
- [ ] Landwijziging triggert direct een herberekening van aanbieders-leverbaarheid.
- [ ] Ingelogde klanten kunnen een opgeslagen adres kiezen zonder opnieuw te typen.
- [ ] Niet-leverbare situatie blokkeert doorgaan naar stap 2.

---

## 5. Stap 2 — Betaling

### Doel
Eén betaalmethode kiezen en één betaling voor het volledige bedrag (alle aanbieders samen) laten verlopen.

### Gebruikersverhaal
*"Als klant wil ik met mijn vertrouwde betaalmethode in één keer afrekenen, ook als mijn bestelling uit meerdere aanbieders bestaat — ik wil niet meerdere keren mijn betaalgegevens hoeven invoeren."*

### Componenten
- Betaalmethode-selectie: regionaal relevante methoden (iDEAL/Bancontact/creditcard/PayPal/Apple Pay/Google Pay — per land, conform Blueprint H10.7), als selecteerbare kaarten met logo-placeholder.
- Opgeslagen betaalmethode (ingelogde klant, indien eerder gebruikt) met optie "Nieuwe methode gebruiken".
- Totaalbedrag nogmaals prominent zichtbaar direct boven de betaalactie.

### Desktop / Tablet / Mobiel
Zelfde structuur op alle drie: dit scherm heeft weinig eigen dichtheid (een lijst selecteerbare methoden + totaalbedrag + actieknop) en schaalt zonder structurele aanpassing — kaarten in een grid van 3 (desktop), 2 (tablet), 1 kolom (mobiel). *Dit scherm is in deze iteratie beschreven op componentniveau, niet als los pixel-wireframe per breakpoint — het risico-/differentiatieniveau is laag genoeg (standaard Medusa Payment-patroon) om dat te rechtvaardigen; wordt alsnog als wireframe uitgewerkt zodra de betaalproviders definitief gekozen zijn (buiten deze UX-scope).*

### Interacties
- Selecteren van een methode markeert de kaart, activeert de "Doorgaan"-knop.
- Sommige methoden (iDEAL) tonen een extra stap: bank kiezen.

### Validaties
- Een methode moet geselecteerd zijn vóór "Doorgaan".

### Foutmeldingen
- "Betaling niet gelukt. Probeer het opnieuw of kies een andere betaalmethode." — winkelwagen en ingevoerde gegevens blijven behouden, klant komt terug op dit scherm (niet terug naar stap 0/1).
- "Deze betaalmethode is momenteel niet beschikbaar." (providerstoring) — met alternatieven zichtbaar.

### Edge cases
- Betaling succesvol, maar de server-side ordersplitsing (sectie 0) faalt daarna (bijv. een aanbieder net weggevallen) → **betaling wordt niet teruggeboekt zonder melding**; klant krijgt een duidelijke statuspagina ("Je betaling is gelukt, we verwerken je bestelling — dit kan een moment duren") en supportteam/Administrator krijgt een geschil-achtige melding (koppelt aan Admin-geschillenbeheer, `ux-architecture.md` sectie 3.3) voor handmatige afhandeling van het uitzonderingsgeval. Dit scenario moet zeldzaam zijn (revalidatie in stap 1 vangt de meeste gevallen af) maar mag nooit tot geld-kwijt-zonder-product leiden.
- Klant sluit browser tijdens betaalproces (bij externe betaalprovider-redirect) → bij terugkeer wordt de betaalstatus opgevraagd (niet aangenomen), order wordt pas geplaatst bij bevestigde betaling.

### API-afhankelijkheden
- Medusa Payment-module + regionale providers (zie `01-architecture/tech-stack.md`).
- Webhook/statuscontrole voor asynchrone betaalbevestiging (iDEAL e.d.).

### Standaard Medusa-functionaliteit
- Volledig standaard: Medusa Payment-module ondersteunt meerdere providers per Region nativief. Dit is bewust het "standard where possible"-onderdeel van checkout.

### Maatwerk EuropMade
- De koppeling tussen "betaling bevestigd" en "start server-side ordersplitsing" (sectie 0) — dat triggermoment is custom, ook al is de betaling zelf standaard.

### Acceptatiecriteria
- [ ] Klant betaalt precies één keer voor het volledige bedrag, ongeacht het aantal aanbieders.
- [ ] Mislukte betaling behoudt alle eerder ingevoerde gegevens.
- [ ] Ordersplitsing start pas ná bevestigde betaling, nooit ervoor.

---

## 6. Stap 3 — Controle & bevestigen

### Doel
De klant een laatste, volledige controle geven vóór het definitief plaatsen van de bestelling, met expliciete bevestiging van de ordersplitsing.

### Gebruikersverhaal
*"Als klant wil ik vlak vóór het definitief bestellen alles nog eens in één overzicht zien — wie levert wat, wanneer, tegen welke voorwaarden — zodat ik zeker weet dat ik de juiste keuzes heb gemaakt."*

### Componenten
- Volledig overzicht: adres, gekozen betaalmethode, en de volledige per-aanbieder-uitsplitsing uit sectie 2 (nu niet-sticky, maar als hoofdinhoud van dit scherm).
- Voorwaarden-checkbox: "Ik ga akkoord met de Algemene Voorwaarden en het Retourbeleid" (verplicht, gelinkt).
- Primaire actie: "Bestelling plaatsen" (met het totaalbedrag in de knoptekst, bijv. "Bestelling plaatsen — € 512,00").

### Desktop / Tablet / Mobiel
Zelfde structuur op alle breekpunten als stap 1 qua verhouding (hoofdinhoud + sidebar wordt hier hoofdinhoud, aangezien de sidebar-info hier juist de hoofdrol krijgt) — op mobiel wordt de per-aanbieder-uitsplitsing als losse, niet-inklapbare kaarten getoond (in tegenstelling tot de inklapbare balk in stap 1/2, omdat dit hier de kern van de aandacht moet zijn, niet een samenvatting).

### Interacties
- "Wijzigen"-links per sectie (adres → terug naar stap 1, betaalmethode → terug naar stap 2) zonder de rest van de voortgang te verliezen.
- Klikken op "Bestelling plaatsen" toont een laadstatus en schakelt de knop uit tijdens verwerking (voorkomt dubbel klikken/dubbele order).

### Validaties
- Voorwaarden-checkbox moet aangevinkt zijn.
- Laatste server-side revalidatie (zelfde controle als sectie 2) vlak vóór het plaatsen — als hier alsnog iets gewijzigd is, wordt de klant teruggestuurd naar het relevante punt met uitleg, in plaats van de order alsnog te plaatsen op verouderde gegevens.

### Foutmeldingen
- "Er zijn wijzigingen in je bestelling sinds je begon met afrekenen. Controleer de gemarkeerde onderdelen." — met precies aangeduid wélke regel(s) veranderd zijn.
- "Je bestelling kon niet geplaatst worden. Probeer het opnieuw." (generieke serverfout, met retry-optie, geen gegevensverlies).

### Edge cases
- Dubbele klik op "Bestelling plaatsen" → knop is direct uitgeschakeld na eerste klik (idempotente serveraanroep als extra bescherming, niet alleen UI-disable).
- Laatste-moment voorraadwijziging (tussen laden van dit scherm en klikken op "Bestelling plaatsen") → zelfde afhandeling als in sectie 2 (server valideert opnieuw, blokkeert of past aan met melding).

### API-afhankelijkheden
- Dezelfde revalidatie-endpoint (sectie 2/4) als laatste controle.
- Order-plaatsingsendpoint die betaalbevestiging + ordersplitsing (sectie 0) orkestreert.

### Standaard Medusa-functionaliteit
- Order-aanmaak op basis van een cart — basispatroon standaard.

### Maatwerk EuropMade
- De laatste-moment revalidatie vóór het definitief plaatsen, en de orkestratie die van "één betaalde cart" naar "N orders, één per aanbieder" gaat (sectie 0) — dit is samen met sectie 2 het architecturaal zwaarste onderdeel van de hele checkout.

### Acceptatiecriteria
- [ ] Klant ziet vlak vóór bevestigen een volledig, actueel overzicht — geen verouderde gegevens.
- [ ] Voorwaarden-acceptatie is verplicht en gelogd (audit, vergelijkbaar met H13.11).
- [ ] Dubbele bestellingen door dubbelklikken zijn uitgesloten, zowel client- als server-side.
- [ ] Na succesvolle plaatsing ontvangt de klant een duidelijke overgang naar orderbevestiging (Sprint 1B) — dit scherm laat de klant nooit "in het niets" achter na klikken.

---

## 7. Mobiele UX — samenvattend (F14-beleid toegepast)

Checkout is, meer nog dan de Productpagina, een scherm waar mobiele frictie direct conversie kost (Blueprint H10.11). Kernprincipes die op alle drie de stappen zijn toegepast:

- Besteloverzicht is op mobiel altijd **inklapbaar**, nooit verplicht scrollen-langs voordat het formulier bereikt wordt (stap 1/2); in stap 3 juist wél volledig uitgeklapt, omdat daar de controle de hoofdtaak is.
- Eén kolom voor alle formuliervelden — geen naast-elkaar-velden die op kleine schermen krap worden (bijv. postcode+plaats).
- Primaire actieknop is op elk stapscherm de onderste, volledige-breedte, duimvriendelijke knop — consistent met het sticky-bottombar-patroon van de Productpagina, al is een sticky knop hier niet nodig omdat elke stap kort genoeg is om zonder lang scrollen de knop te bereiken (in tegenstelling tot de lange Productpagina).
- Stappen-indicator (1/2/3) bovenaan, compact, zodat een klant altijd weet hoeveel stappen resteren — belangrijk bij een kortere aandachtsspanne op mobiel.

---

## 8. Gast-checkout vs. account-checkout — samenvattend verschil

| Aspect | Gast | Account |
|---|---|---|
| Verplichte velden vooraf | Alleen e-mailadres | Inloggegevens |
| Adres | Altijd handmatig invoeren | Kan uit opgeslagen adressen kiezen |
| Betaalmethode | Altijd nieuw invoeren | Kan opgeslagen methode hergebruiken |
| Na bestelling | Bevestiging per e-mail, geen accountoverzicht tenzij achteraf een account gekoppeld wordt | Bestelling direct zichtbaar in "Mijn bestellingen" |
| Retour/track&trace | Via e-maillink / ordernummer + e-mailadres | Via account |

Deze tabel is de directe onderbouwing van waarom stap 0 als losstaand, vroeg keuzepunt is ontworpen: de vervolgstappen (1–3) blijven voor beide paden identiek in structuur, alleen het voorinvullen verschilt.

---

## 9. Interne UX-review (uitgevoerd vóór oplevering als v1.0)

Zelfde kritische toets als bij de Productpagina toegepast, nu vooraf verwerkt in bovenstaande specificatie in plaats van als los te accorderen lijst. Belangrijkste bevindingen en hoe ze al in de tekst hierboven zijn verwerkt:

- **Risico: klant begrijpt niet waarom er meerdere pakketjes/mails komen.** → Opgelost door de verplichte, altijd-zichtbare splitsings-toelichting (sectie 2), niet pas ná bestellen gecommuniceerd maar al bij het eerste zicht op de Besteloverzicht-sidebar.
- **Risico: betaling gelukt, maar order-splitsing faalt (technisch randgeval).** → Expliciet als edge case benoemd (sectie 5) mét een concrete afhandeling (statuspagina + Admin-geschiltraject), in plaats van dit onbenoemd te laten — dit was het scenario met het grootste "geld kwijt zonder duidelijkheid"-risico.
- **Risico: dubbele bestellingen door ongeduldig dubbelklikken.** → Expliciet client- én server-side geadresseerd (sectie 6), niet alleen als UI-detail behandeld.
- **Risico: gast bestelt per ongeluk twee keer met hetzelfde e-mailadres dat al een account heeft, zonder dit te weten.** → Gedetecteerd en opgevangen in stap 0 (sectie 3), vóórdat dit tot verwarrende dubbele klantprofielen leidt.
- **Risico: sturende default tussen gast/account ondermijnt het "geen manipulatieve keuzes"-principe dat ook aan de Buy Box ten grondslag ligt (spec sectie 3.0).** → Bewust gelijkwaardige visuele behandeling van beide opties in stap 0, met alleen op mobiel een volgorde-aanpassing die frictie vermindert (niet een aanpassing die "aanraadt").
- **Overwogen en bewust losgelaten:** een aparte betaalstatus per aanbieder (zoals sommige marktplaatsen tonen) — dit zou de "één simpele betaling"-belofte ondermijnen en is daarom expliciet niet toegevoegd; slechts één betaalstatus voor het geheel (sectie 0), met de splitsing pas ná betaling zichtbaar op orderniveau.
- **Bewuste scopebeperking, transparant gemaakt:** stap 2 (Betaling) is beschreven op componentniveau in plaats van als pixel-wireframe per breakpoint, omdat het risiconiveau laag is (standaard Medusa-patroon) — zie sectie 5. Dit is een bewuste, beargumenteerde keuze, geen omissie.

---

## 10. Consistentiecontrole

### Tegen de Blueprint
- H10.7 (adres → levering → betaling → controle → bevestiging): **consistent** — exacte stappenvolgorde aangehouden, "levering" is hier verwerkt als onderdeel van de adres-/verzendstap (geen apart keuzemoment, omdat verzendmethode niet klant-selecteerbaar is, zie sectie 4).
- H10.7 (gesplitste levering/verzendkosten bij meerdere aanbieders in bevestiging): **consistent**, hier al vóór het bevestigingsscherm (in elke stap) zichtbaar gemaakt — een aanscherping t.o.v. de letterlijke Blueprint-tekst, niet een afwijking.
- H10.11 (Mobile First): **consistent**, sectie 7.

### Tegen de UX-architectuur
- UX-review-voorstel 1 (gast-checkout tot het moment van bestellen): **consistent**, letterlijk geïmplementeerd in stap 0.
- Scherm #7 (Checkout) uit de scherminventarisatie: **consistent**, hier uitgewerkt tot de 4 substappen die het scherm in de praktijk vormt.

### Tegen Product Cloud
- Geen productinformatie-bewerking vindt hier plaats — Checkout raakt uitsluitend Commerce Cloud-data. **Consistent**, geen vermenging.

### Tegen Commerce Cloud
- Alle relevante dimensies (prijs, voorraad, levertijd, verzendkosten, land, retourvoorwaarden) komen terug in de Besteloverzicht-sidebar. **Consistent**, en vult de eerder geconstateerde F13-omissie (Productpagina) niet opnieuw aan met eenzelfde gat.

### Tegen de ADR's
- ADR 0005 (server-side-only Buy Box/ordersplitsing): **consistent en leidend** — sectie 0 is direct hierop gebaseerd, en elke revalidatiestap (secties 2, 4, 5, 6) herbevestigt dat niets client-side wordt aangenomen.
- ADR 0001 (configureerbare Buy Box-weging): niet direct van toepassing op Checkout (Buy Box-keuze is al gemaakt vóór checkout), geen conflict.

### Tegen de Wireframe Strategy
- F14-beleid (Desktop/Tablet/Mobiel voor kernschermen): **consistent toegepast** op stap 0, 1 en 3 (volledig uitgewerkt); stap 2 bewust lichter behandeld met expliciete motivatie (sectie 5) — vastgelegd, niet verzwegen.
- Sprint 1A-volgorde: **consistent**, Checkout volgt na Productpagina/Buy Box zoals vastgesteld.

---

## 11. Minimumvereisten voor Orderbevestiging (Sprint 1B) — vastgelegd nu, ontworpen later

**Toegevoegd na de Customer Journey Audit (bevinding J2).** Dit is uitsluitend een vereisten-vastlegging, **geen schermontwerp** — geen wireframe, geen componenttoewijzing, geen visuele beslissing. Het doel is te voorkomen dat Orderbevestiging in Sprint 1B ontworpen wordt met alleen de summiere doelomschrijving uit de scherminventarisatie ("zekerheid geven dat bestelling geplaatst is") als leidraad, terwijl deze Checkout-specificatie al een concrete belofte doet over ordersplitsing.

Orderbevestiging moet, zodra ontworpen, minimaal:

1. **Elke deelbestelling afzonderlijk tonen** — niet één samengevoegde bevestiging — consistent met de splitsings-toelichting die de klant al in Checkout heeft gezien (sectie 2: "Je ontvangt per deelbestelling een aparte bevestiging en track & trace-code").
2. **Per deelbestelling minimaal tonen:** aanbieder, bestelde producten, verwacht leverbedrag, verwachte levertijd — dezelfde gegevens die al in de Besteloverzicht-sidebar stonden, nu bevestigd i.p.v. voorlopig.
3. **Een totaaloverzicht behouden** (totaal betaald bedrag) naast de uitsplitsing, zodat de klant niet zelf hoeft op te tellen.
4. **Een pad bieden naar ordertracking** — voor ingelogde klanten naar "Mijn bestellingen", voor gasten een duidelijke uitleg hoe ze hun bestelling later kunnen terugvinden (koppelt aan Checkout sectie 8, gast-vs-account-verschillen).

Dit legt vast **wat** het scherm moet bevatten; **hoe** dit eruitziet (layout, breakpoints, componentkeuze) is een ontwerpbeslissing voor Sprint 1B, niet voor dit document.

## 12. Technische SEO-vereiste (aangevuld na Customer Journey Audit, bevinding J5)

Checkout en Orderbevestiging zijn transactionele, persoonsgebonden pagina's en krijgen bij implementatie een `noindex, nofollow`-directive — standaard technische SEO-praktijk om te voorkomen dat bestelinhoud via gedeelde/gebookmarkte links in zoekmachines terechtkomt, en om dunne/duplicate content in de index te vermijden. Dit staat los van de SEO-doelstellingen die wél gelden voor Homepage, Productpagina, Zoeken en Categorie.

---

## 13. BTW-synchronisatie met Orderbevestiging (gecontroleerde updates, na v1.0-bevriezing)

Tijdens de eindcontrole van de Orderbevestiging-uitbreiding is vastgesteld dat de Totals-box van Checkout dezelfde BTW-weergave miste. Dit is een **gecontroleerde, PO-geautoriseerde synchronisatie-update**, doorlopen in drie versies:

- **v1.1:** BTW uitsluitend als toelichtende tekst onder de Totalen-box.
- **v1.2:** BTW als eigen, structurele regel, met de toelichtende tekst ernaast en een standaard zichtbaar uitklapblok voor meerdere tarieven.
- **v1.3 (definitief), na een tweede UX-review:** te veel zichtbare informatie tegelijk. Vereenvoudigd naar label + info-icoon (ⓘ) + bedrag, verder niets standaard zichtbaar:

```
Subtotaal              EUR 308,95
Verzendkosten           EUR   4,95
BTW icoon                EUR  54,48
-----------------------------
Totaal te betalen       EUR 313,90
```

Het info-icoon hergebruikt het al bestaande `.info-dot`-patroon (Buy Box, EU-eigendom) en toont bij hover/klik een compacte tooltip met de berekeningswijze, het land + toegepaste tarief, en — uitsluitend indien van toepassing — een tariefuitsplitsing bij meerdere tarieven binnen dezelfde bestelling. De toelichtende tekst en het standaard zichtbare uitklapblok uit v1.2 zijn volledig vervallen.

Zelfde regels als vastgelegd in `orderbevestiging/spec.md` Stap 5A gelden hier onverkort: tarief bepaald door het land van levering, definitief bij orderplaatsing, geen fiscale berekening in de wireframe/weergave zelf, alles server-side.

**Geen nieuwe componenten, geen nieuwe pagina's, geen layoutwijziging** — uitsluitend de bestaande BTW-regel binnen de `.totals`-structuur (CMP-025) uitgebreid met een informatie-icoon.

---

## Status: v1.3

Geen resterende inconsistenties tegen Blueprint, UX-architectuur, Product Cloud, Commerce Cloud, ADR's of Wireframe Strategy. De interne UX-review (sectie 9) is uitgevoerd en verwerkt vóór oplevering, conform de opdracht. Secties 11 en 12 zijn toegevoegd na de Customer Journey Audit (bevindingen J2 en J5). Sectie 13 (BTW-synchronisatie) is drie keer bijgewerkt (v1.1 toelichtende tekst → v1.2 structurele regel → v1.3 vereenvoudigd met tooltip) — telkens geautoriseerd, geen ongecontroleerde wijziging. Checkout en Orderbevestiging tonen nu **identiek** dezelfde, vereenvoudigde BTW-weergave.

**Checkout is hierbij definitief bevroren op v1.3.**
