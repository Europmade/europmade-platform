# EuropMade — UX-Architectuur (Stap 4: UX & Product Design)

**Basis:** EuropMade Blueprint v2.1 (definitief) + Financieel model v1.0
**Status:** Architectuurfase — nog geen wireframes/mock-ups
**Scope:** MVP-lancering in 6 landen (NL, BE, DE, FR, IT, ES), Mobile First

---

## 0. Technische uitgangspunten & ontwerpprincipe

Volledig uitgewerkt in [`01-architecture/`](../01-architecture/README.md) (tech-stack.md en standard-vs-custom.md). Kernpunten die deze UX-architectuur sturen:

- Stack: Next.js (frontend) + Medusa (marketplace backend) + PostgreSQL + TransIP/EU-hosting, API-first, Mobile First, Responsive.
- Ontwerpprincipe: *"Standard where possible, custom where it creates competitive advantage."*
- Belangrijkste architectuurbeslissing: het Buy Box-model (één productpagina, meerdere aanbieders) is geen standaard Medusa-marketplace-patroon en vormt daarom het grootste maatwerk-onderdeel — zie [`03-functional-specs/product-cloud-commerce-cloud-buy-box/`](../03-functional-specs/product-cloud-commerce-cloud-buy-box/README.md).

---

## 1. Gebruikersrollen

Per de Blueprint (H5.4, H9.3) is eigendom van productinformatie en commerciële gegevens strikt gescheiden. Dat principe is leidend voor alle rollen: **wie mag wát zien en wijzigen** volgt direct uit hoofdstuk 5.5 en 7.13.

### 1.1 Bezoeker

| | |
|---|---|
| **Doel** | Oriënteren, vertrouwen opbouwen, producten vinden en vergelijken zonder verplichting. |
| **Rechten** | Alleen-lezen: homepage, categorieën, zoeken, filteren, productpagina's (incl. alle aanbieders, specificaties, reviews), merk-/categoriepagina's, contentpagina's (Over EuropMade, Made in Europe, etc.). Geen toegang tot account, bestellen, reviews plaatsen, berichten. |
| **Belangrijkste functionaliteiten** | Zoekfunctie, categorienavigatie, filters, productvergelijking (aanbieders naast elkaar, H10.6), toevoegen aan winkelwagen (zonder account), registreren/inloggen. |

**Ontwerpbeslissing (voorstel, niet expliciet in Blueprint):** Bezoeker kan tot en met het vullen van de winkelwagen alles doen zonder account; een account (of gastcheckout) wordt pas verplicht bij de daadwerkelijke bestelling. Dit verlaagt de drempel conform het "Mobile First, eenvoud voorop"-uitgangspunt van H10.1. Dit punt wordt herhaald in de UX Review (sectie 6).

### 1.2 Klant (consument, ingelogd)

| | |
|---|---|
| **Doel** | Producten kopen, bestellingen volgen, retourneren, vertrouwen bevestigd zien. |
| **Rechten** | Eigen account en gegevens beheren; bestellingen plaatsen en inzien; facturen downloaden; track & trace volgen; retour aanmelden; berichten sturen naar retailer (via EuropMade, H8.8); **productreview** plaatsen (over het product) én **verkopersreview** plaatsen (over de retailer) — strikt gescheiden (H10.10); onjuistheden in productinformatie melden (H11.2, verbetert de Product Cloud maar wijzigt niets zelf). |
| **Belangrijkste functionaliteiten** | Winkelwagen & checkout (adres → levering → betaling → controle → bevestiging, H10.7), orderoverzicht, retourflow (H10.9), berichtencentrum, reviewformulieren (product/verkoper gescheiden), profiel- en adresbeheer, opgeslagen betaalmethoden. |

### 1.3 Retailer

| | |
|---|---|
| **Doel** | Producten verkopen, commerciële data beheren, internationaal uitbreiden met minimale administratieve last. |
| **Rechten** | Volledig beheer van eigen commerciële gegevens (prijs, voorraad, levertijd, verzendkosten, retourvoorwaarden, acties, landinstellingen — H8.3). **Geen** wijzigingsrecht op officiële productinformatie zodra een producent/merkhouder actief is — alleen het recht om een wijziging **voor te stellen** (H9.6–9.8). **Uitzondering:** bij zelf aangemaakte, nog niet geclaimde producten (status *Retailer Created*) beheert de retailer tijdelijk zowel product- als commerciële data (H5.4, H6.10, H6.5, H7.9). Advertentieplekken reserveren en betalen; berichten met klanten beantwoorden. |
| **Belangrijkste functionaliteiten** | Producten koppelen (EAN-zoeken, CSV-import, API — H9.5), Retailer Created-flow, dashboard (Home/Producten/Orders/Berichten/Advertenties — H9.9), voorraad- en multi-warehousebeheer, orderafhandeling, retourafhandeling, advertentiereservering (H9.10, H14.9), rapportages (omzet, orders, CTR, uitbetalingen — H9.11), meldingen (H9.12), compliance-signalen die aan hen worden doorgezet. |

*Sub-rol: **Distributeur** — verkoopt namens merken (H9.3); rechten komen overeen met Retailer, eventueel aangevuld met gedelegeerde productrechten per contract met de merkhouder. Voor de MVP wordt Distributeur functioneel als Retailer-variant behandeld; geen apart dashboard nodig.*

### 1.4 Producent / Merkhouder

| | |
|---|---|
| **Doel** | Officiële productinformatie beheren, merk correct presenteren, compliance borgen. |
| **Rechten** | Volledig beheer van alle officiële productinformatie (titel, omschrijving, specificaties, afbeeldingen, video's, handleidingen, certificeringen — H5.4, H7.13); goedkeuren/afwijzen van wijzigingsvoorstellen van retailers, altijd het laatste woord (H9.8); claimen van *Retailer Created*-producten, waarna beheer automatisch overgaat (H6.10); compliance-data invullen (GPSR, CE, DPP-voorbereiding — H13.8, H13.10); Verified™-status aanvragen (H13.6). Optioneel: ook eigen verkoop (dan tevens Retailer-rechten, rollen zijn combineerbaar — H9.3). |
| **Belangrijkste functionaliteiten** | Product Cloud-beheer (aanmaken, specificaties, EAN's, relaties — H7, ADR-0050), wijzigingsvoorstellen beoordelen (AI-voorcontrole zichtbaar — H9.7), Product Quality Score & Product Health Score-inzicht (H7.10–7.11), Compliance Dashboard + AI Compliance Assistent (H13.9), versiehistorie/audittrail (H13.11), Verified™-aanvraagflow, AI-ondersteuning (vertalingen, SEO, contentsuggesties — H7.12). |

### 1.5 Administrator (EuropMade platformbeheer)

| | |
|---|---|
| **Doel** | Platformkwaliteit, vertrouwen en compliance bewaken; geschillen oplossen; groei faciliteren zonder zelf te verkopen. |
| **Rechten** | Volledige leestoegang tot alle modules; gebruikers- en partnerbeheer (accounts, verificatie, schorsing); moderatie van producten/content en AI-escalaties; bemiddeling bij geschillen tussen klant en retailer (H8.8); beheer van advertentie-inventory (zonder voorkeur voor "eigen" producten, EuropMade verkoopt zelf niets — H8.5, H9.10); platformbrede compliance-monitoring; instellingenbeheer (landen, categorieën, commissies, tarieven). |
| **Belangrijkste functionaliteiten** | Admin dashboard met platform-KPI's (H10.12, H14.10), gebruikers-/partnerbeheer, moderatiewachtrij (AI-signalen + escalaties, H9.7/H13.9), geschillen-/ticketsysteem, advertentie-inventorybeheer, compliance-overzicht platformbreed, categorie- en filterbeheer (Product Cloud-gestuurd, H10.5), audittrail-inzage (H13.11), rapportages/analytics. |

### 1.5A Affiliate (MVP — definitieve scopewijziging)

**Affiliate is per definitieve projectbeslissing onderdeel van de MVP** (vervangt H15.7/H15A.12 op dit punt voor het Affiliate-gedeelte; zie `00-context/blueprint-reference.md`). Volledige functionele uitwerking: `03-functional-specs/affiliate-platform/`.

| Rol | Doel | Rechten | Kernfunctionaliteiten |
|---|---|---|---|
| **Affiliate** | Verkeer/verkopen genereren via promotie, commissie verdienen (H15A) | Toegang tot Affiliate Dashboard, trackinglinks/coupons; géén toegang tot productinformatie-beheer | Registratie, click-/coupon-tracking, dashboard (klikken/conversies/commissies), uitbetalingen |

### 1.6 Toekomstige rollen (voorbereiden, niet volledig bouwen in MVP)

Volgens H15A.5 blijft de **Creator**-rol (los van Affiliate, dat nu MVP is) buiten Fase 1 (MVP). Deze rol wordt daarom **structureel voorbereid** in sitemap en navigatie, maar niet uitgewerkt tot volledige MVP-schermen.

| Rol | Doel | Rechten (toekomstig) | Kernfunctionaliteiten (toekomstig) |
|---|---|---|---|
| **Creator** | Eigen storefront, content en publiek opbouwen (H15A.5) | Profielpagina, collecties, blogs/video's/reviews publiceren; Verified Creator-label mogelijk | Storefrontbeheer, collecties samenstellen, AI-contentassistent, eigen analytics |

---

## 2. User Flows

Notatie per flow: **Startpunt → Schermen → Beslismomenten (◆) → Uitzonderingen (⚠) → Eindpunt.**

### 2.1 Bezoeker — Oriënteren & converteren naar account

**Startpunt:** Landing op Homepage (organisch, advertentie, SEO-landingspagina of directe URL)

1. Homepage → zoekbalk gebruiken **of** categorie kiezen
   ◆ Weet de bezoeker specifiek wat hij zoekt?
   - Ja → Zoekresultatenpagina
   - Nee → Categoriepagina → Subcategorie → Filters toepassen
2. Zoekresultaten-/categoriepagina → Productpagina openen
3. Productpagina: aanbieders vergelijken (prijs/levertijd/beoordeling), specificaties, downloads, reviews, gerelateerde producten bekijken
   ◆ Direct kopen of eerst vergelijken?
   - Vergelijken → terug naar zoekresultaten / gerelateerde producten (loop terug naar stap 2)
   - Kopen → aanbieder kiezen → "In winkelwagen"
4. Winkelwagen (zonder account mogelijk — zie ontwerpvoorstel 1.1)
   ◆ Verdergaan naar checkout?
   - Ja → Registreren/inloggen (of gast, zie sectie 6) → Checkoutflow (wordt Klant-flow, zie 2.2)
   - Nee → verder browsen (terug naar stap 1/2)

⚠ **Uitzonderingen:**
- Geen zoekresultaten → "Niets gevonden"-scherm met synoniemsuggesties, spellingcorrectie (AI, H10.4) en gerelateerde categorieën.
- Product tijdelijk niet leverbaar bij alle aanbieders → duidelijke status + alternatieven/opvolgers tonen (H7.8).

**Eindpunt:** Account aangemaakt + product in checkout, óf bezoeker verlaat sessie (geen harde afsluiting — winkelwagen blijft behouden voor terugkerend bezoek).

### 2.2 Klant — Aankoop, tracking, retour, review

**Startpunt:** Ingelogde klant met gevulde winkelwagen (vervolg op 2.1) of terugkerend bezoek via account.

**A. Checkout**
1. Winkelwagen (overzicht per aanbieder, totaalbedrag) → "Afrekenen"
2. Adresgegevens → Verzendmethode → Betaalmethode (iDEAL/Bancontact/creditcard/PayPal/Apple Pay/Google Pay, per land — H10.7) → Controle-overzicht
   ◆ Klopt alles?
   - Nee → terug naar betreffende stap
   - Ja → "Bestelling plaatsen"
3. Orderbevestiging (ordernummer, verwachte levering per aanbieder)

⚠ Bij meerdere aanbieders in één winkelwagen: bevestiging toont gesplitste levering/verzendkosten per aanbieder (H10.7).
⚠ Betaling mislukt → terug naar betaalstap met foutmelding, winkelwagen blijft behouden.

**Eindpunt A:** Order geplaatst, bevestiging getoond en per e-mail/notificatie verstuurd.

**B. Order volgen & communiceren**
1. Mijn Bestellingen → Orderdetail → Status/Track & trace
   ◆ Vraag aan retailer?
   - Ja → Berichtencentrum (binnen order-context) → bericht + evt. foto/document → verzenden → wacht op reactie retailer
   - Nee → verder

**Eindpunt B:** Klant heeft inzicht/antwoord, blijft binnen EuropMade (geen e-mail-uitwisseling, H10.8).

**C. Retour**
1. Orderdetail → "Retour aanmelden" → Reden kiezen → Foto toevoegen (optioneel) → Verzoek versturen
2. ◆ Retailer keurt goed/af
   - Goedgekeurd → Retourlabel gegenereerd → Klant verzendt terug → Terugbetaling na ontvangst
   - ⚠ Afgekeurd → Bemiddeling door EuropMade (escaleert naar Administrator-flow, 2.5C)

**Eindpunt C:** Terugbetaling verwerkt of geschil in bemiddeling.

**D. Reviews**
1. Na levering (getriggerd): uitnodiging productreview + verkopersreview (twee gescheiden formulieren, H10.10)
   ◆ Beide, één, of geen?
   - Klant kan één, beide of geen achterlaten; niet verplicht.

**Eindpunt D:** Review(s) gepubliceerd (evt. na moderatie-check).

### 2.3 Retailer — Onboarding, productbeheer, orderafhandeling

**Startpunt:** Landing op partner-registratiepagina (via marketing/acquisitie, H14.4)

**A. Onboarding (doel: binnen 1 werkdag live, H9.4)**
1. Account aanmaken → Bedrijfsgegevens → Identiteitscontrole → BTW-validatie → Betaalgegevens → Verzendinstellingen → (optioneel) ERP/PIM-koppeling → Eerste producten publiceren
   ◆ Producten toevoegen via welke methode?
   - EAN-zoeken (los) / CSV-import (bulk) / API-koppeling
2. ◆ Bestaat het product al in de Product Cloud?
   - Ja → automatisch koppelen, retailer voert alleen commerciële gegevens in
   - Nee → retailer maakt nieuw product aan → status *Retailer Created* → retailer beheert tijdelijk ook productinformatie
   ⚠ tot een producent/merkhouder het claimt (H6.10)

**Eindpunt A:** Retailer heeft actieve producten live, dashboard toegankelijk.

**B. Productinformatie wijzigen (bestaand, niet-Retailer-Created product)**
1. Productdetail in dashboard → "Wijziging voorstellen" → veld + toelichting invullen → versturen
2. AI-review (automatisch, H9.7) → naar producent voor beoordeling
   ◆ Producent keurt goed/af
   - Goedgekeurd → wijziging live, retailer krijgt melding
   - Afgekeurd → retailer krijgt melding + reden

**Eindpunt B:** Wijziging verwerkt of afgewezen, met transparante feedback.

**C. Dagelijks beheer (orders, advertenties, berichten)**
1. Dashboard Home (overzicht) → Orders (nieuw/verzonden/retour/geannuleerd) → actie per order
2. Advertenties → positie/land/week kiezen → beschikbaarheid zien → betalen → automatisch publiceren (H14.9)
3. Berichten → klantvraag beantwoorden

**Eindpunt C:** Doorlopend gebruik, geen hard eindpunt (dashboard is dagelijkse werkomgeving, H9.14).

### 2.4 Producent / Merkhouder — Productbeheer, claim, compliance

**Startpunt:** Ingelogde producent in Partnerdashboard.

**A. Product claimen (Retailer Created overnemen)**
1. Zoeken/melding "product zonder producent" → Productdetail → "Dit is mijn product" → verificatie merk/producentstatus
   ◆ Verificatie geslaagd?
   - Ja → beheer productinformatie gaat automatisch over; retailer behoudt alleen commerciële gegevens (H6.10)
   - ⚠ Nee → verzoek geweigerd, contact met Administrator voor verificatie

**Eindpunt A:** Product valt onder producentbeheer.

**B. Productinformatie beheren & wijzigingen beoordelen**
1. Product Cloud-omgeving → nieuw product aanmaken / bestaand bewerken (specificaties, media, documentatie, relaties)
2. Inbox "Wijzigingsvoorstellen" (van retailers, AI-voorgecontroleerd) → beoordelen per voorstel
   ◆ Goedkeuren / afwijzen / aanpassen
3. Product Quality Score & Health Score bekijken → verbeterpunten oppakken

**Eindpunt B:** Productinformatie actueel, score verbeterd.

**C. Verified™ aanvragen**
1. Productdetail → "Verified™ aanvragen" (zichtbaar zodra velden/documentatie/score aan minimale norm voldoen — H13.6)
2. AI-validatie → Compliancecontrole
   ◆ Voldoet aan alle voorwaarden?
   - Ja → Verified™-status toegekend, zichtbaar op productpagina
   - ⚠ Nee → overzicht ontbrekende items, terug naar bewerken

**Eindpunt C:** Verified™-status actief (met periodieke hercontrole) of concrete actielijst.

### 2.5 Administrator — Platformbeheer, moderatie, geschillen

**Startpunt:** Ingelogde administrator in Admin-omgeving.

**A. Partneronboarding goedkeuren**
1. Wachtrij nieuwe partners → identiteits-/BTW-verificatie controleren
   ◆ Goedkeuren / afwijzen / aanvullende info opvragen

**B. Contentmoderatie & AI-escalaties**
1. Moderatiewachtrij (AI-gevlagde producten/reviews/wijzigingen die niet automatisch afgehandeld konden worden) → beoordelen per item
   ◆ Goedkeuren / afwijzen / doorzetten naar producent-retailer

**C. Geschillenbemiddeling**
1. Geschillenoverzicht (bijv. afgekeurde retour, klacht) → dossier openen (volledige berichtenhistorie zichtbaar) → uitspraak/bemiddeling
   ⚠ Escalatie vanuit Klant-retourflow (2.2C) komt hier binnen

**D. Platformbeheer**
1. Instellingen: landen, categorieën/filters (Product Cloud-gestuurd), commissiepercentages, advertentietarieven
2. Rapportages/KPI-dashboard (platformbreed: actieve partners, producten, conversie, Product Quality Score-gemiddelde — H14.10)

**Eindpunt:** Doorlopend gebruik, geen hard eindpunt — operationele werkomgeving.

### 2.6A Affiliate (MVP)

**Startpunt:** Aanmelding Affiliate-programma → beoordeling → Dashboard-toegang → trackinglink/coupon aanmaken → klik-/coupon-tracking → conversie-attributie → commissieberekening → uitbetaling.

Volledig uitgewerkt als MVP-flow, zie `03-functional-specs/affiliate-platform/spec.md`. Deze flow krijgt in de Scherminventarisatie (sectie 5) een "Must Have"-label, niet langer "Could Have"/post-MVP.

### 2.6 Creator (voorbereid, niet MVP)

Beknopte flow ter voorbereiding van de architectuur (niet uit te werken tot schermen in deze fase):

**Startpunt:** Aanmelding Creator-programma → beoordeling → Dashboard-toegang → producten/feeds selecteren → collecties samenstellen → eigen storefront publiceren.

Deze flow wordt in de sitemap en navigatie gereserveerd (zie 3.5 en 4), maar krijgt in de Scherminventarisatie (sectie 5) uitsluitend "Could Have"/post-MVP labels.

---

## 3. Sitemap

Structuur is gecontroleerd tegen alle functionaliteiten uit hoofdstukken 5–15A. Toegevoegde pagina's (niet expliciet genoemd, wel noodzakelijk voor een werkend platform) zijn gemarkeerd met **[+]**.

### 3.1 Publiek (Bezoeker/Klant)

```
Home
├── Zoekresultaten (query-based)
├── Categorie (30 hoofdcategorieën, H14.8)
│   └── Subcategorie
│       └── Sub-subcategorie (indien van toepassing)
├── Productpagina
│   ├── Aanbieders-tab/sectie
│   ├── Specificaties-tab
│   ├── Downloads-tab (handleiding, veiligheidsinfo, certificaten)
│   ├── Reviews-tab (product / verkoper gescheiden)
│   └── Gerelateerde producten
├── Merkpagina [+] (merkoverzicht + producten van dat merk)
├── Landingspagina's (SEO, H14.5): "Made in Europe", duurzame producten, Europese merken, populaire categorieën
├── Kenniscentrum [+] (post-MVP, H14.5: koopgidsen, blogs, vergelijkingen)
├── Winkelwagen
├── Checkout
│   ├── Adres
│   ├── Verzending
│   ├── Betaling
│   └── Bevestiging
├── Account
│   ├── Inloggen / Registreren
│   ├── Wachtwoord vergeten [+]
│   ├── Mijn gegevens & adressen
│   ├── Mijn bestellingen → Orderdetail → Retour aanmelden
│   ├── Mijn reviews [+]
│   └── Berichtencentrum
├── Over EuropMade
│   ├── Missie & Vijf Pijlers van Vertrouwen (H13.3)
│   ├── Verified™ uitleg [+]
│   └── Duurzaamheid/Made in Europe
├── Klantenservice / Help [+] (FAQ, contactopties)
├── Juridisch [+] (Privacybeleid, Algemene Voorwaarden, Cookiebeleid — vereist door AVG/GDPR, H13.4)
└── 404 / Foutpagina's [+]
```

### 3.2 Partnerplatform (Retailer / Producent / Distributeur)

```
Partner-onboarding (publieke registratieflow, los van hoofdnavigatie)
├── Account & bedrijfsgegevens
├── Identiteits- & BTW-verificatie
├── Betaalgegevens
├── Verzendinstellingen
└── ERP/PIM-koppeling (optioneel)

Partnerdashboard (na login)
├── Home (overzicht: omzet, orders, vragen, advertenties, meldingen — H9.9)
├── Producten
│   ├── Productoverzicht (mijn aanbod)
│   ├── Product toevoegen (EAN-zoeken / CSV-import / API)
│   ├── Productdetail (commerciële gegevens: prijs/voorraad/levertijd/verzending/acties)
│   ├── Productinformatie-beheer (uitsluitend voor Producent/Merkhouder, of Retailer bij Retailer Created)
│   ├── Wijzigingsvoorstellen (indienen als Retailer / beoordelen als Producent)
│   ├── Product Quality Score & Health-overzicht
│   └── Verified™-aanvraag (Producent/Merkhouder)
├── Orders
│   ├── Nieuwe orders
│   ├── Verzendingen
│   ├── Retouren
│   └── Annuleringen
├── Berichten (centraal, per order/klant)
├── Advertenties
│   ├── Beschikbaarheid & reserveren
│   ├── Actieve campagnes
│   └── Facturen/betaling advertenties
├── Compliance Dashboard [+] (met name Producent/Merkhouder: GPSR, CE, DPP-voorbereiding — H13.9)
├── Rapportages (omzet, orders, gemiddelde orderwaarde, CTR, uitbetalingen)
├── Landinstellingen (per land: actief, verzendkosten, levertijd, retourvoorwaarden)
├── Uitbetalingen [+] (saldo, historie, facturen)
└── Accountinstellingen (bedrijfsgegevens, gebruikers/rechten, API-sleutels — H9.12)
```

### 3.3 Admin-omgeving (Administrator)

```
Admin Dashboard
├── Platform-KPI's (H14.10)
├── Partnerbeheer (goedkeuren, verifiëren, schorsen)
├── Gebruikersbeheer (klanten)
├── Moderatiewachtrij (AI-escalaties: producten, reviews, wijzigingen)
├── Geschillenbeheer (retouren, klachten, bemiddeling)
├── Compliance-overzicht (platformbreed)
├── Advertentie-inventorybeheer (posities, tarieven, bezetting)
├── Categorie- & filterbeheer (Product Cloud-gestuurd)
├── Commissie- & tariefinstellingen
├── Landbeheer (actieve landen, uitrolstatus)
└── Audittrail / Logs [+]
```

### 3.4 Affiliate (MVP) & Creator (voorbereid, gereserveerd in structuur, post-MVP)

```
Affiliate-registratie [MVP]
Affiliate Dashboard [MVP]
├── Klikken/conversies/commissies
├── Trackinglinks & coupons
└── Uitbetalingen
Creator-registratie [gereserveerd]
Creator Storefront [gereserveerd]
├── Profielpagina
├── Collecties
└── Content (blogs/video's/reviews)
```

### 3.5 Controle tegen Blueprint-functionaliteiten

Belangrijkste toevoegingen ten opzichte van de letterlijke hoofdstuktekst, met onderbouwing:

- **Merkpagina [+]** — logisch gevolg van "producenten/merkhouders" en merkpresentatie (H6.11), niet expliciet als scherm genoemd.
- **Wachtwoord vergeten, 404-pagina's, Juridisch/Footer-pagina's [+]** — noodzakelijke basisschermen voor elk platform, niet apart in Blueprint benoemd maar impliciet vereist (AVG/GDPR, H13.4).
- **Klantenservice/Help [+]** — Blueprint beschrijft dat alle communicatie via EuropMade verloopt (H8.8) maar noemt geen zelfbedieningshelp-sectie; toegevoegd voor lagere supportlast.
- **Compliance Dashboard als apart dashboard-item [+]** — wordt in H13.9 inhoudelijk beschreven maar niet expliciet in de dashboardstructuur van H9.9 genoemd naast Home/Producten/Orders/Berichten/Advertenties; hier toegevoegd als zesde sectie omdat compliance een kernverantwoordelijkheid van de producent is.
- **Uitbetalingen als apart menu-item [+]** — inhoudelijk wel genoemd (H8.10, H9.11) maar verdiend een eigen navigatie-ingang gezien het financiële belang voor partners.

---

## 4. Navigatiestructuur

### 4.1 Desktop

**Hoofdmenu (publiek, sticky header):**
`Logo | Zoekbalk (breed, prominent) | Categorieën (mega-menu, 30 hoofdcategorieën met subcategorieën) | Over EuropMade | Account-icoon | Winkelwagen-icoon`

- Mega-menu bij hover/klik op "Categorieën": kolommen per hoofdcategorie met subcategorieën, conform H14.8 (30 hoofdcategorieën).
- Zoekbalk toont live suggesties tijdens typen (AI-ondersteund, H10.4).

**Footer:**
`Over EuropMade | Vijf Pijlers van Vertrouwen/Verified™ | Klantenservice/FAQ | Verkopen op EuropMade (partner-CTA) | Juridisch (Privacy, Voorwaarden, Cookies) | Taal-/landkiezer | Betaalmethode-iconen | Social links`

**Dashboardnavigatie (Partner & Admin, links vaste sidebar):**
`Home | Producten | Orders | Berichten | Advertenties | Compliance | Rapportages | Uitbetalingen | Instellingen`
- Actieve sectie gemarkeerd; badge-indicatoren voor openstaande items (nieuwe berichten, wijzigingsvoorstellen, lage voorraad — H9.12).

**Breadcrumbs:** Op alle categorie-, product- en dashboardpagina's.
Publiek voorbeeld: `Home > Tuin > Robotmaaiers > Draadloos > [Productnaam]`
Dashboard voorbeeld: `Producten > [Productnaam] > Wijziging voorstellen`

**Zoekfunctie:** Eén centrale zoekbalk in de header, altijd zichtbaar; doorzoekt productnaam, EAN, fabrikantnummer, SKU, merk, categorie, eigenschappen, synoniemen (H6.9, H10.4).

**Filters:** Links naast zoekresultaten/categorielijst, categorie-specifiek en dynamisch aangestuurd vanuit de Product Cloud (H10.5). Actieve filters als verwijderbare "chips" boven de resultaten.

### 4.2 Tablet

- Hoofdmenu comprimeert: categorieën verplaatsen naar een uitklapbaar menu-icoon (hamburger of "Categorieën"-knop), zoekbalk blijft prominent in de header.
- Filters: standaard ingeklapt als zijpaneel dat wordt opgeroepen via een "Filters"-knop boven de resultaten (i.p.v. permanent zichtbare kolom), om ruimte te besparen.
- Dashboardnavigatie: sidebar wordt inklapbaar (icoon-only met tekst bij tap/hover).
- Breadcrumbs en zoekfunctie blijven ongewijzigd t.o.v. desktop.

### 4.3 Mobiel

- **Hoofdmenu:** Vaste bovenbalk met logo, zoek-icoon en hamburgermenu; zoekbalk wordt bij tap volledig scherm (focus op snelheid, grote knoppen — H10.11).
- **Onderste tabbalk (mobile-pattern, niet expliciet in Blueprint maar volgt uit "Mobile First"-principe H10.11):** `Home | Zoeken | Winkelwagen | Account`
- **Categorieën:** volledig scherm menu bij openen hamburger, met terugknop per niveau (i.p.v. mega-menu).
- **Filters:** onderaan-scherm ("bottom sheet") die omhoog schuift via een "Filters"-knop; toegepaste filters tonen een teller op de knop.
- **Breadcrumbs:** vervangen door een "Terug"-knop + huidige categorienaam (breadcrumbs nemen te veel ruimte in op klein scherm) — zie UX Review sectie 6 voor motivatie.
- **Dashboardnavigatie (Partner/Admin, mobiel gebruik):** onderste tabbalk met kernonderdelen (Home, Producten, Orders, Berichten) + "Meer"-menu voor overige secties (Advertenties, Compliance, Rapportages, Uitbetalingen, Instellingen).

### 4.4 Regio- en taalstructuur (Next.js + Medusa Region-model)

De landkiezer uit 4.1–4.3 is geen losse UX-toevoeging maar volgt direct uit de techniek: elk van de 6 launch-landen wordt een Medusa **Region** (eigen valuta, belasting, verzendopties) en krijgt in Next.js een eigen locale-prefix in de URL (bijv. `europmade.com/nl-nl/...`, `/de-de/...`, `/fr-fr/...`). Dit heeft twee directe UX-consequenties:

- De taal-/landkiezer moet **URL-structuur en Region tegelijk wijzigen** — bij wisselen van land verandert dus niet alleen de taal, maar ook prijzen, verzendopties en betaalmethoden zichtbaar op het scherm.
- SEO-landingspagina's (H14.5, "Made in Europe" e.d.) worden per locale opgebouwd, wat aansluit bij de SEO-strategie uit de Blueprint zonder dat dit extra maatwerk buiten het standaard Next.js-routeringspatroon vereist.

---

## 5. Scherminventarisatie (MVP)

Labels: **Must Have** (MVP-kern, direct uit Blueprint H15.7 Fase 1) · **Should Have** (sterk gewenst, ondersteunt kernervaring) · **Could Have** (verrijking, kan na MVP-livegang volgen).

### 5.1 Publiek / Bezoeker & Klant

| # | Scherm | Prioriteit | Gebruiker | Doel |
|---|---|---|---|---|
| 1 | Homepage | Must Have | Bezoeker | Vertrouwen wekken, snel naar juiste categorie/product leiden |
| 2 | Zoekresultaten | Must Have | Bezoeker/Klant | Relevante producten tonen op basis van zoekopdracht |
| 3 | Categoriepagina | Must Have | Bezoeker/Klant | Navigeren binnen een productcategorie |
| 4 | Subcategoriepagina | Must Have | Bezoeker/Klant | Verder verfijnen binnen categorie |
| 5 | Productpagina | Must Have | Bezoeker/Klant | Informeren, vergelijken van aanbieders, aankoopbeslissing ondersteunen |
| 6 | Winkelwagen | Must Have | Bezoeker/Klant | Overzicht van gekozen producten vóór afrekenen |
| 7 | Checkout (adres/verzending/betaling/controle) | Must Have | Klant | Bestelling afronden |
| 8 | Orderbevestiging | Must Have | Klant | Zekerheid geven dat bestelling geplaatst is |
| 9 | Inloggen / Registreren | Must Have | Bezoeker | Toegang tot account |
| 10 | Wachtwoord vergeten | Must Have | Bezoeker/Klant | Toegang herstellen |
| 11 | Mijn bestellingen (overzicht) | Must Have | Klant | Bestellingen inzien |
| 12 | Orderdetail + track & trace | Must Have | Klant | Status en levering volgen |
| 13 | Retour aanmelden | Must Have | Klant | Retourproces starten |
| 14 | Berichtencentrum (klantzijde) | Must Have | Klant | Communiceren met retailer |
| 15 | Productreview plaatsen | Must Have | Klant | Bijdragen aan vertrouwen/kwaliteit |
| 16 | Verkopersreview plaatsen | Must Have | Klant | Retailerprestatie beoordelen |
| 17 | Account & adresbeheer | Must Have | Klant | Persoonlijke gegevens beheren |
| 18 | Over EuropMade / Vertrouwen (Vijf Pijlers, Verified™-uitleg) | Should Have | Bezoeker | Vertrouwen en differentiatie communiceren |
| 19 | Merkpagina | Should Have | Bezoeker/Klant | Merkbeleving en overzicht producten per merk |
| 20 | Klantenservice/FAQ | Should Have | Bezoeker/Klant | Zelfbediening, supportlast verlagen |
| 21 | Juridische pagina's (Privacy/Voorwaarden/Cookies) | Must Have | Bezoeker | Wettelijk vereist (AVG/GDPR) |
| 22 | 404/foutpagina's | Should Have | Bezoeker | Nette afhandeling van fouten |
| 23 | Landingspagina's (Made in Europe, duurzaam, etc.) | Should Have | Bezoeker | SEO en positionering (H14.5) |
| 24 | Kenniscentrum (koopgidsen/blogs) | Could Have | Bezoeker | Organisch verkeer, post-MVP (H14.5 noemt dit expliciet als "na de MVP") |
| 25 | Mijn reviews (overzicht eigen reviews) | Could Have | Klant | Zelfbeheer van geplaatste reviews |

### 5.2 Partnerplatform (Retailer / Producent / Distributeur)

| # | Scherm | Prioriteit | Gebruiker | Doel |
|---|---|---|---|---|
| 26 | Partner-registratie (start onboarding) | Must Have | Retailer/Producent | Toegang tot platform aanvragen |
| 27 | Bedrijfsgegevens & verificatie (identiteit, BTW) | Must Have | Retailer/Producent | Legitimiteit vaststellen |
| 28 | Betaalgegevens instellen | Must Have | Retailer/Producent | Uitbetaling mogelijk maken |
| 29 | Verzendinstellingen | Must Have | Retailer | Basis voor orderafhandeling |
| 30 | Dashboard Home | Must Have | Retailer/Producent | Snel overzicht van status en to-do's |
| 31 | Productoverzicht (mijn aanbod) | Must Have | Retailer/Producent | Beheer van eigen producten |
| 32 | Product toevoegen — EAN-zoeken | Must Have | Retailer | Snel koppelen aan bestaand product |
| 33 | Product toevoegen — CSV-import | Must Have | Retailer | Bulk-onboarding |
| 34 | Product toevoegen — nieuw product (Retailer Created) | Must Have | Retailer | Ontbrekend product toevoegen aan Product Cloud |
| 35 | Productdetail — commerciële gegevens | Must Have | Retailer | Prijs/voorraad/levertijd/verzending beheren |
| 36 | Productdetail — productinformatie-beheer | Must Have | Producent/Merkhouder | Officiële content beheren |
| 37 | Wijzigingsvoorstel indienen | Must Have | Retailer | Verbetering aandragen |
| 38 | Wijzigingsvoorstellen beoordelen | Must Have | Producent/Merkhouder | Kwaliteit en controle borgen |
| 39 | Product claimen (Retailer Created overnemen) | Must Have | Producent/Merkhouder | Eigenaarschap terugnemen conform H6.10 |
| 40 | Orders — nieuw/verzonden/retour/geannuleerd | Must Have | Retailer | Orderafhandeling |
| 41 | Retour beoordelen (retailerzijde) | Must Have | Retailer | Retourverzoek accepteren/weigeren |
| 42 | Berichtencentrum (partnerzijde) | Must Have | Retailer/Producent | Klantvragen beantwoorden |
| 43 | Advertenties — beschikbaarheid & reserveren | Must Have | Retailer/Producent | Zichtbaarheid kopen (H9.10) |
| 44 | Advertenties — actieve campagnes | Should Have | Retailer/Producent | Prestaties inzien |
| 45 | Rapportages (omzet/orders/CTR/uitbetalingen) | Must Have | Retailer/Producent | Inzicht in prestaties |
| 46 | Landinstellingen | Should Have | Retailer | Internationale uitbreiding beheren |
| 47 | Product Quality Score & Health-overzicht | Should Have | Producent/Merkhouder | Kwaliteit verbeteren |
| 48 | Compliance Dashboard + AI-assistent | Must Have | Producent/Merkhouder | GPSR/CE-verplichtingen borgen |
| 49 | Verified™-aanvraag | Should Have | Producent/Merkhouder | Kwaliteitslabel verkrijgen |
| 50 | Uitbetalingen (saldo/historie/facturen) | Must Have | Retailer/Producent | Financiële transparantie |
| 51 | Meldingencentrum | Should Have | Retailer/Producent | Proactief geïnformeerd blijven (H9.12) |
| 52 | ERP/PIM/API-koppeling instellen | Could Have | Retailer/Producent | Automatisering voor grotere partijen |
| 53 | Accountinstellingen (gebruikers/rechten/API-sleutels) | Should Have | Retailer/Producent | Beheer van eigen organisatie |

### 5.3 Admin-omgeving

| # | Scherm | Prioriteit | Gebruiker | Doel |
|---|---|---|---|---|
| 54 | Admin dashboard (platform-KPI's) | Must Have | Administrator | Overzicht platformgezondheid |
| 55 | Partnerbeheer (goedkeuren/verifiëren/schorsen) | Must Have | Administrator | Kwaliteit van aansluitende partners bewaken |
| 56 | Gebruikersbeheer (klanten) | Should Have | Administrator | Supportcases en accountbeheer |
| 57 | Moderatiewachtrij (AI-escalaties) | Must Have | Administrator | Kwaliteitscontrole waar AI niet automatisch kan afhandelen |
| 58 | Geschillenbeheer/bemiddeling | Must Have | Administrator | Klant-retailer conflicten oplossen |
| 59 | Compliance-overzicht platformbreed | Should Have | Administrator | Risico's signaleren |
| 60 | Advertentie-inventorybeheer | Must Have | Administrator | Beschikbaarheid en tarieven beheren |
| 61 | Categorie- & filterbeheer | Must Have | Administrator | Structuur van de Product Cloud sturen |
| 62 | Commissie- & tariefinstellingen | Should Have | Administrator | Verdienmodel beheren |
| 63 | Landbeheer (uitrolstatus) | Could Have | Administrator | Internationale uitbreiding plannen |
| 64 | Audittrail/logs | Should Have | Administrator | Traceerbaarheid en compliance (H13.11) |

### 5.4 Affiliate (MVP) & Creator (post-MVP, structureel gereserveerd)

| # | Scherm | Prioriteit | Gebruiker | Doel |
|---|---|---|---|---|
| 65 | Affiliate-registratie | **Must Have** | Affiliate | Toegang tot programma aanvragen |
| 66 | Affiliate Dashboard | **Must Have** | Affiliate | Klikken/conversies/commissies volgen |
| 67 | Creator Storefront/profiel | Could Have | Creator | Content en collecties publiceren |

### 5.5 Bouwaard per schermgroep (Next.js + Medusa)

Aanvullend op de individuele scherminventarisatie hierboven, hier de koppeling met sectie 0.3 — dit bepaalt waar in de wireframe-fase de meeste ontwerptijd naartoe moet:

| Schermgroep | Bouwaard | Prioriteit in wireframe-fase |
|---|---|---|
| Homepage, categorie-/zoekresultaten, filters-UI (#1–4) | Standaard patroon, maatwerk data/filters | Middel |
| **Productpagina — Aanbieders-sectie/Buy Box (#5)** | **Maatwerk** | **Hoog** — belangrijkste scherm van het platform |
| Winkelwagen (basis, #6) | Standaard | Laag |
| **Checkout met order-splitsing per aanbieder (#7)** | **Maatwerk** | **Hoog** |
| Account, adressen, inloggen (#9–10, #17) | Standaard | Laag |
| Orderoverzicht, orderdetail, track&trace (#11–12) | Standaard | Laag |
| Retour aanmelden (basis, #13) | Standaard, uitgebreid | Middel |
| Berichtencentrum (#14, #42) | Maatwerk (geen Medusa-equivalent) | Middel |
| **Reviews product/verkoper gescheiden (#15–16)** | **Maatwerk** | Middel |
| **Partneronboarding + Retailer Created + claim-flow (#26–39)** | **Maatwerk** | **Hoog** |
| Orders/retouren partnerzijde (#40–41) | Standaard (Medusa Order, partnerweergave) | Laag |
| **Advertenties (#43–44)** | **Maatwerk** | **Hoog** |
| Rapportages/uitbetalingen (#45, #50) | Standaard data, maatwerk weergave | Middel |
| **Compliance Dashboard, Verified™, Quality/Health Score (#47–49)** | **Maatwerk** | **Hoog** |
| Admin-omgeving (#54–64) | Standaard (Medusa Admin) + custom widgets | Middel |
| **Affiliate-registratie & Dashboard (#65–66)** | **Maatwerk (geen Medusa-equivalent)** | **Hoog — nieuw MVP-domein** |
| Creator Storefront/profiel (#67) | Maatwerk, post-MVP | N.v.t. voor MVP-wireframes |

---

## 6. UX Review (Senior UX-perspectief)

### 6.1 Onlogische stappen / frictiepunten

- **Verplicht account vóór checkout is niet expliciet vastgelegd in de Blueprint**, maar als dit de aanname is, ontstaat onnodige frictie vlak vóór conversie. **Voorstel:** sta toe dat de winkelwagen en het begin van checkout zonder account doorlopen worden; vraag pas bij "Bestelling plaatsen" om te registreren of (als gast) door te gaan. Dit sluit beter aan bij het uitgangspunt "zo min mogelijk stappen" (H10.7).
- **Retailer Created-flow kan verwarrend zijn voor de retailer** op het moment van claiming: als een producent een product claimt terwijl de retailer net commerciële wijzigingen heeft doorgevoerd, is niet gespecificeerd wat er met "in behandeling zijnde" wijzigingen gebeurt. **Voorstel:** toon de retailer een expliciete notificatie op het moment van claim ("Dit product is overgenomen door [Producent]; jouw prijs/voorraad blijft actief, productinformatie wordt nu door hen beheerd") zodat er geen onzekerheid ontstaat.
- **Retour afgekeurd → bemiddeling** is in de Blueprint niet als klantgerichte flow uitgewerkt (H8.9 verwijst alleen naar "alle partijen kunnen status volgen"). Zonder een duidelijk vervolgscherm voor de klant ontstaat een doodlopend pad. **Voorstel:** voeg een expliciet "Geschil gestart"-scherm toe met verwachte doorlooptijd, zodat de klant niet in onzekerheid blijft.

### 6.2 Dubbele schermen

- **Product Quality Score-overzicht (H7.10) en Compliance Dashboard (H13.9)** overlappen deels in signalering (beide melden bijvoorbeeld ontbrekende certificeringen/documentatie). **Voorstel:** combineer deze in de navigatie tot één "Kwaliteit & Compliance"-sectie met twee tabbladen, in plaats van twee losse dashboard-items, om verwarring bij producenten te voorkomen over waar ze welke melding moeten zoeken.
- **Rapportages (H9.11) en Dashboard Home (H9.9)** tonen deels dezelfde omzet-/ordercijfers. **Voorstel:** Home toont uitsluitend een compacte samenvatting met doorklik naar het volledige Rapportages-scherm — geen dubbele volledige overzichten.

### 6.3 Ontbrekende pagina's (aangevuld in sitemap, sectie 3.5)

Zie sectie 3.5 voor de volledige lijst en onderbouwing: merkpagina, wachtwoord vergeten, 404, juridische pagina's, klantenservice/FAQ, kenniscentrum, apart uitbetalingenscherm.

### 6.4 Ontbrekende navigatie

- **Geen duidelijke "Verkopen op EuropMade"-ingang in het publieke hoofdmenu** — de Blueprint richt de eerste groeifase volledig op partneracquisitie (H14.3–14.4), maar de sitemap in de brontekst beschrijft geen zichtbare consument-facing link naar partnerregistratie. **Voorstel:** voeg een permanente CTA toe in de footer én, tijdens de acquisitiefase, optioneel in de hoofdnavigatie ("Verkoop jouw producten op EuropMade").
- **Geen taal-/landkiezer expliciet genoemd**, terwijl de MVP in 6 landen tegelijk lanceert (H14.10) met lokale advertenties, betaalmethoden en vertalingen. **Voorstel:** landkiezer prominent in de footer én header (niet alleen footer, zoals in 4.1 opgenomen) zodat gebruikers direct weten in welk land/taal ze winkelen.

### 6.5 Onnodige complexiteit

- **Zes verschillende manieren om binnen het partnerdashboard iets te "beheren"** (commerciële gegevens, productinformatie, wijzigingsvoorstellen, claim, compliance, advertenties) kunnen voor een kleine retailer (10 producten) net zo complex aanvoelen als voor een retailer met 100.000 producten, ondanks het schaalbaarheids-uitgangspunt van H9.2. **Voorstel:** progressive disclosure — toon bij eerste login een vereenvoudigde "Snelstart"-weergave van het dashboard (alleen Producten, Orders, Berichten) en ontsluit Advertenties/Compliance/Rapportages pas zichtbaar zodra er relevante data is (bijv. Compliance-tab pas actief zodra producent-rechten gelden).
- **Breadcrumbs op mobiel weggelaten** (zie 4.3) is een bewuste vereenvoudiging t.o.v. wat je op desktop zou verwachten — dit is geen gemis maar een gerichte reductie van complexiteit op een klein scherm, en wordt hier expliciet benoemd zodat dit als bewuste keuze wordt vastgelegd, niet als omissie.

### 6.7 Architectuur-risico om vroeg te valideren

- **De order-splitsing per aanbieder (checkout met meerdere Offers in één winkelwagen, zie sectie 0.2) is het grootste technische risico van de hele UX**, omdat dit geen bestaand Medusa-patroon volgt. **Voorstel:** valideer dit scenario als eerste technische spike vóór de wireframe-fase begint, zodat de checkout-UX niet wordt ontworpen op aannames die technisch niet haalbaar blijken binnen de MVP-planning (H15.7: 2–3 maanden).
- **Medusa Admin als basis voor de Administrator-rol versus een volledig custom Next.js Partnerdashboard voor Retailer/Producent** creëert twee visueel verschillende dashboard-systemen naast elkaar. **Voorstel:** bewaak in de wireframe-fase een gedeeld ontwerpsysteem (componentbibliotheek) tussen beide, zodat gebruikers die meerdere rollen combineren (H9.3: een producent kan ook retailer zijn) geen wisselende interactiepatronen ervaren.

### 6.6 Samenvatting van voorstellen

1. Gast-checkout tot het moment van bestellen (verlaagt afhaakrisico).
2. Expliciete notificatie bij product-claim richting retailer.
3. "Geschil gestart"-scherm voor afgekeurde retouren.
4. Samenvoegen Product Quality Score en Compliance Dashboard tot één sectie met tabbladen.
5. Home-dashboard beperken tot samenvatting, geen dubbele rapportagedata.
6. Zichtbare "Verkopen op EuropMade"-ingang in publieke navigatie.
7. Taal-/landkiezer ook in de header, niet alleen footer.
8. Progressive disclosure in het partnerdashboard voor kleinere partners.
9. Valideer de order-splitsing per aanbieder (Buy Box-checkout) als technische spike vóór de wireframe-fase.
10. Bewaak één gedeeld componentsysteem tussen Medusa Admin (Administrator) en het custom Next.js Partnerdashboard.

---

## Openstaande vraag voor akkoord

Dit document dekt rollen, user flows, sitemap, navigatie, scherminventarisatie en UX-review — nu inclusief de technische fundering op Next.js + Medusa (sectie 0) en het "standard where possible, custom where it creates competitive advantage"-principe, met een expliciete indeling per domein en schermgroep (sectie 0.3 en 5.5). Er zijn **tien concrete UX-voorstellen** (sectie 6.6) die afwijken van — of een aanvulling zijn op — de letterlijke Blueprint-tekst, waaronder één technisch aandachtspunt (#9) dat vóór de wireframe-fase gevalideerd moet worden. Kun je aangeven of je deze tien voorstellen accepteert, wilt aanpassen, of wilt laten vervallen, zodat de basis voor de wireframes 100% vaststaat voordat we starten?

Na jouw akkoord op deze UX-architectuur (en eventuele aanpassingen op de acht voorstellen) starten we met de wireframes.
