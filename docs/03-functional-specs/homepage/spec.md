# EuropMade — Homepage: Commerciële Strategie & UX-specificatie

**Status:** v1.0 (definitief, na interne UX/CRO/Marketplace-review).
**Basis:** Blueprint v2.1 (H5, H6, H14), financieel model v1.0, UX-architectuur, Design System v1.0, Component Coverage Matrix.
**Component ID-referentie:** CMP-001, 002, 005, 006, 008, 011, 015, 017, 018, 022, plus twee nieuwe componenten (CMP-032 Category Tile, CMP-033 Advertisement Banner Slot) — zie sectie 3.

---

## 0. Uitgangspunten

De Homepage is de **belangrijkste commerciële pagina** van EuropMade en dient acht doelen tegelijk (conversie, advertentie-inkomsten, promotie van Europese productie, vertrouwen, overtuiging van nieuwe bezoekers, zichtbaarheid voor partners, snelle route naar aankoop, SEO). Deze doelen staan deels op gespannen voet met elkaar — met name **advertentie-inkomsten vs. conversie/vertrouwen**. Het ontwerp lost dit expliciet op via **sectievolgorde en labeling**, niet door concessies aan één doel ten koste van een ander:

1. **5-secondenregel:** Hero + Trust Bar zijn samen verantwoordelijk voor onmiddellijke duidelijkheid ("dit is een Europese marketplace, hier kan ik veilig kopen") — geen advertentie verschijnt vóór dit punt.
2. **Advertenties nooit vóór organische vertrouwens-/conversiecontent:** de eerste advertentiepositie staat pas na Categorieën + Uitgelichte producten, nooit direct onder de Hero.
3. **Neutraliteitsprincipe herhaald vanuit de Buy Box (functionele spec, sectie 3.0):** "Uitgelichte producten" en "Uitgelichte retailers" zijn redactioneel/algoritmisch bepaald (bijv. bestverkocht, hoogst beoordeeld, rotatie), **nooit** betaald — dezelfde reden waarom de Buy Box niet door advertenties beïnvloed mag worden, geldt hier voor de Homepage-secties die "aanbevolen" ogen.
4. **Personalisatie-voorbereid, MVP eenvoudig:** secties die later gepersonaliseerd kunnen worden (Uitgelichte producten, Categorieën-volgorde) gebruiken nu statische/algoritmische logica (populair/nieuw/hoogst beoordeeld) — dezelfde component, andere databron later, geen structuurwijziging nodig.
5. **Uitsluitend bestaande Design System-componenten**, met twee uitzonderingen die aantoonbaar noodzakelijk zijn (zie sectie 3) — beide al voorzien in de Component Coverage Matrix als verwachte lacune.

---

## 1. Sectievolgorde (vastgesteld, met rationale)

```
1. Header (CMP-001)                          — navigatie + prominente zoekbalk
2. Hero                                       — 5-secondenregel, geen advertentie
3. Trust Bar (Vijf Pijlers)                   — vertrouwen vóór elke commerciële content
4. Categorieën-grid (CMP-032, nieuw)          — snelste organische route naar producten
5. Uitgelichte/trending producten (CMP-017)   — hoogste directe conversiewaarde, vroeg geplaatst
6. Advertentiebanner — positie 1 (CMP-033, nieuw)  — na voldoende organische content
7. Uitgelichte Europese merken/retailers (CMP-015) — partnerzichtbaarheid + "Made in Europe"-verhaal
8. Advertentiebanner — positie 2 (CMP-033)    — tweede, lagere-waarde positie
9. "Made in Europe"-verhaal / SEO-content      — merkopbouw + tekstuele SEO-waarde
10. Nieuwsbrief-aanmelding (CMP-006)           — first-party data, personalisatie-voorbereiding
11. Footer (CMP-002)
```

**Waarom deze volgorde en niet "zoveel mogelijk advertenties bovenaan":** advertentie-inkomsten zijn een **tweede, ondersteunende inkomstenbron** (Blueprint H5.6 — commissie is de primaire bron), niet het hoofddoel van de Homepage. Twee goed gepositioneerde, duidelijk gelabelde advertentieposities met een hoge fill rate (omdat de pagina zelf vertrouwen en verkeer genereert) leveren op termijn meer op dan drie posities die de conversie — en daarmee de commissie-inkomsten, de grotere inkomstenbron — ondermijnen.

---

## 2. Sectiespecificatie (9 punten per sectie)

### Sectie 1 — Header

| # | Beschrijving |
|---|---|
| 1. Doel | Navigatie, zoeken, land-/valutakeuze vanaf elk publiek scherm. |
| 2. Commerciële waarde | Zoekbalk is het kortste conversiepad voor bezoekers met concrete koopintentie. |
| 3. UX-waarde | Bevestigt in <1 seconde "dit is een winkel"; zoeken altijd direct bereikbaar. |
| 4. SEO-waarde | Structurele interne links naar categorieën (crawlbaarheid), geen directe rankingwaarde zelf. |
| 5. KPI's | Zoekbalk-gebruik (%), CTR vanuit mega-menu naar categorieën. |
| 6. CMP-ID('s) | CMP-001. |
| 7. Bouwaard | Standaard bouwpatroon (bestaand, bevroren component). |
| 8. Advertentiemogelijkheden | Geen — neutrale ruimte, essentieel voor vertrouwen. |
| 9. Conversiebijdrage | Snelste route naar conversie voor bezoekers met koopintentie. |

### Sectie 2 — Hero

| # | Beschrijving |
|---|---|
| 1. Doel | Binnen 5 seconden duidelijk maken wat EuropMade is; emotioneel anker "Made in Europe". |
| 2. Commerciële waarde | Zet premium positionering neer, verhoogt merkvertrouwen dat conversie verderop beïnvloedt. |
| 3. UX-waarde | Eerste indruk; grote kop + herhaalde/vergrote zoekbalk + heldere CTA. |
| 4. SEO-waarde | Eén `<h1>` met kernpropositie + belangrijkste zoekwoorden ("Europese producten", "marketplace"). |
| 5. KPI's | Bounce rate, scroll-diepte (%), CTR op hero-CTA/zoekbalk. |
| 6. CMP-ID('s) | CMP-005 (Button), CMP-008 (Badge, "Made in Europe"-anker), zoekbalk uit CMP-001 herhaald/vergroot. |
| 7. Bouwaard | Standaard bouwpatroon, statische/redactionele content voor MVP. |
| 8. Advertentiemogelijkheden | **Geen — bewust EuropMade's eigen redactionele ruimte**, niet verkoopbaar (bewaart geloofwaardigheid van de belofte). |
| 9. Conversiebijdrage | Leidt direct naar zoeken/categorieën; hier gewekt vertrouwen verlaagt afhaakkans verderop. |

### Sectie 3 — Trust Bar (Vijf Pijlers, compact)

| # | Beschrijving |
|---|---|
| 1. Doel | Compacte, direct zichtbare vertrouwenssignalen (Verified™, retourbeleid, Europese productie, veilig betalen). |
| 2. Commerciële waarde | Verlaagt aarzeling bij nieuwe bezoekers vóór elke commerciële content. |
| 3. UX-waarde | Scanbaar in <2 sec, herkenbare badges. |
| 4. SEO-waarde | Tekstuele vertrouwenscontent ("30 dagen retour", "Europese kwaliteitsnormen") ondersteunt long-tail zoekwoorden. |
| 5. KPI's | CTR naar "Over EuropMade"/Verified™-uitleg. |
| 6. CMP-ID('s) | CMP-008 (Badge). |
| 7. Bouwaard | Standaard. |
| 8. Advertentiemogelijkheden | **Geen** — vertrouwen moet neutraal blijven, zelfde principe als de Buy Box (spec sectie 3.0). |
| 9. Conversiebijdrage | Reduceert perceived risk — bekend CRO-principe, verlaagt aankoopdrempel bij onbekende retailers. |

### Sectie 4 — Categorieën-grid

| # | Beschrijving |
|---|---|
| 1. Doel | Snelle, visuele toegang tot de 30 hoofdcategorieën (Blueprint H14.8). |
| 2. Commerciële waarde | Redactionele curatie kan categorieën met hoogste omzet/marge prominent plaatsen. |
| 3. UX-waarde | Directe visuele navigatie, sluit aan bij de 5-secondenregel. |
| 4. SEO-waarde | Interne links met keyword-rijke ankertekst naar alle 30 categoriepagina's — sterke interne linkstructuur. |
| 5. KPI's | CTR per categorietegel, klikverdeling (databasis voor toekomstige personalisatie). |
| 6. CMP-ID('s) | **CMP-032 (nieuw)**. |
| 7. Bouwaard | Standaard bouwpatroon, data uit Product Cloud (categoriestructuur). |
| 8. Advertentiemogelijkheden | Geen directe advertentie; volgorde/prominentie is voor de MVP redactioneel — een betaalde uitbreiding is post-MVP-materiaal (vergelijkbaar met Sponsored Products, ADR 0003), hier niet gebouwd. |
| 9. Conversiebijdrage | Verkort het pad tot relevante producten voor browsers zonder specifieke zoekintentie. |

### Sectie 5 — Uitgelichte/trending producten

| # | Beschrijving |
|---|---|
| 1. Doel | Directe productontdekking, kortste pad naar een Productpagina/Buy Box. |
| 2. Commerciële waarde | **Hoogste directe conversiebijdrage van de hele Homepage.** |
| 3. UX-waarde | Vertrouwd e-commercepatroon: grid met prijs/beoordeling/Verified™. |
| 4. SEO-waarde | Interne links naar productpagina's; regelmatige wisseling ondersteunt "freshness"-signalen. |
| 5. KPI's | CTR per productkaart, doorklik-naar-aankoop-ratio vanaf deze sectie. |
| 6. CMP-ID('s) | CMP-017 (Product Card), CMP-018 (Verified™ Badge), CMP-022 (Country of Production Badge). |
| 7. Bouwaard | Standaard bouwpatroon, data-gedreven (bestverkocht/hoogst beoordeeld — selectiealgoritme buiten deze UX-scope). |
| 8. Advertentiemogelijkheden | **Geen — bewust neutraal/algoritmisch bepaald**, niet gesponsord, zelfde reden als de Buy Box-neutraliteit: vermenging van "uitgelicht" met "betaald" ondermijnt vertrouwen. Sponsored Products (ADR 0003) blijft de aparte, toekomstige laag. |
| 9. Conversiebijdrage | Direct — kortste afstand tot een Buy Box/aankoop. |

### Sectie 6 — Advertentiebanner, positie 1

| # | Beschrijving |
|---|---|
| 1. Doel | Betaalde zichtbaarheid voor retailers/producenten, na voldoende organische/vertrouwenscontent. |
| 2. Commerciële waarde | **Directe inkomstenbron** — kern van het bannerplatform (Blueprint H5.6, H14.8–14.9), tweede inkomstenbron naast commissie. |
| 3. UX-waarde | Duidelijk gelabeld ("Advertentie"/"Gesponsord"), zodat het onderscheid met redactionele content (Hero, Categorieën, Uitgelichte producten) helder blijft. |
| 4. SEO-waarde | Geen directe waarde; eventuele links krijgen `rel="sponsored"` om zoekmachines niet te misleiden. |
| 5. KPI's | **Fill rate** (bezetting van beschikbare slots), CTR, omzet per positie/week. |
| 6. CMP-ID('s) | **CMP-033 (nieuw)**. |
| 7. Bouwaard | **Maatwerk** — geen Medusa-equivalent. |
| 8. Advertentiemogelijkheden | Dit IS de advertentiepositie — zelfstandig boekbaar per land/week, gelijke toegang voor alle partners, geen voorkeur voor grote partijen (zelfde eerlijkheidsprincipe als de Buy Box, hier toegepast op advertentieplaatsing). |
| 9. Conversiebijdrage | Indirect — genereert platformomzet die groei/marketing financiert (Blueprint H5.8: herinvestering); draagt niet rechtstreeks bij aan de conversie van déze bezoeker, daarom bewust ná de hoog-converterende secties geplaatst. |

### Sectie 7 — Uitgelichte Europese merken/retailers

| # | Beschrijving |
|---|---|
| 1. Doel | Producenten en retailers zichtbaarheid geven (expliciete doelstelling). |
| 2. Commerciële waarde | Verhoogt partnertevredenheid/-retentie (niet-financiële waardepropositie, Blueprint H9.2); een betaalde "featured"-variant is denkbaar post-MVP, hier niet gebouwd. |
| 3. UX-waarde | Menselijk/verhalend element ("wie maakt dit") versterkt het "Made in Europe"-verhaal, doorbreekt de puur transactionele toon. |
| 4. SEO-waarde | Interne links naar Merkpagina's (scherm #19); content over Europese producenten ondersteunt long-tail zoekverkeer. |
| 5. KPI's | CTR naar merkpagina's, tijd doorgebracht op deze sectie. |
| 6. CMP-ID('s) | **CMP-015 (Retailer Card)** — status wijzigt hiermee van "Voorbereid" naar "Bevestigd". |
| 7. Bouwaard | Standaard bouwpatroon, data uit Commerce Cloud/Product Cloud. |
| 8. Advertentiemogelijkheden | Redactioneel gecureerd voor MVP (bijv. nieuwste/best beoordeelde partners, met **verplichte rotatie** — zie interne review, sectie 4) — geen betaalde plaatsing in de MVP. |
| 9. Conversiebijdrage | Indirect — bouwt vertrouwen in specifieke verkopers vóórdat de bezoeker een productpagina bereikt. |

### Sectie 8 — Advertentiebanner, positie 2

| # | Beschrijving |
|---|---|
| 1. Doel | Tweede, lagere advertentiepositie — extra voorraad voor het bannerplatform. |
| 2. Commerciële waarde | Extra advertentie-inkomsten, lagere prijs dan positie 1 door lagere verwachte zichtbaarheid/CTR. |
| 3. UX-waarde | Zelfde duidelijke labeling als positie 1. |
| 4. SEO-waarde | Geen. |
| 5. KPI's | Fill rate, CTR, omzet — apart gemeten per positie t.b.v. data-gedreven prijsstelling. |
| 6. CMP-ID('s) | CMP-033 (hergebruik). |
| 7. Bouwaard | Maatwerk (zelfde component als sectie 6). |
| 8. Advertentiemogelijkheden | Dit IS een advertentiepositie. |
| 9. Conversiebijdrage | Indirect (platformomzet), zelfde overweging als sectie 6. |

### Sectie 9 — "Made in Europe"-verhaal / SEO-content

| # | Beschrijving |
|---|---|
| 1. Doel | Merkverhaal/missie kort samenvatten, met links naar verdiepende content. |
| 2. Commerciële waarde | Positioneert EuropMade als premium/betrouwbaar; ondersteunt merkopbouw die conversie op lange termijn verhoogt. |
| 3. UX-waarde | Geeft de pagina een inspirerend element naast het transactionele. |
| 4. SEO-waarde | **Hoogste tekstuele SEO-waarde van de Homepage** — ruimte voor kernzoekwoorden, interne links naar landingspagina's (#23) en Over EuropMade (#18). |
| 5. KPI's | Scroll-diepte tot deze sectie, CTR naar "Over EuropMade", organisch verkeer naar de Homepage. |
| 6. CMP-ID('s) | CMP-032 (Category Tile, hergebruikt als link-tegel naar landingspagina's), CMP-005 (Button). |
| 7. Bouwaard | Standaard, grotendeels statische/redactionele content. |
| 8. Advertentiemogelijkheden | Geen. |
| 9. Conversiebijdrage | Indirect/merkopbouwend; ondersteunt herhaalbezoek (personalisatie-relevant voor de toekomst). |

### Sectie 10 — Nieuwsbrief-aanmelding

| # | Beschrijving |
|---|---|
| 1. Doel | E-mailadres vastleggen voor terugkerende betrokkenheid; basis voor toekomstige personalisatie. |
| 2. Commerciële waarde | Kostenefficiënt remarketingkanaal; bouwt first-party-datalaag op (relevant gezien de EU-datastrategie, H13.4 — geen afhankelijkheid van tracking door derden). |
| 3. UX-waarde | Laagdrempelig (één veld), heldere waardepropositie. |
| 4. SEO-waarde | Geen directe waarde. |
| 5. KPI's | Inschrijvingspercentage, aantal nieuwe inschrijvingen/week. |
| 6. CMP-ID('s) | CMP-006 (Form Field), CMP-005 (Button). |
| 7. Bouwaard | Standaard. |
| 8. Advertentiemogelijkheden | Geen. |
| 9. Conversiebijdrage | Geen directe bijdrage nu; voorbereidend op toekomstige personalisatie-gedreven conversie — MVP verzamelt uitsluitend data, geen segmentatielogica. |

### Sectie 11 — Footer

Ongewijzigd t.o.v. het bestaande, bevestigde component (CMP-002) — geen aanvullende specificatie nodig.

---

## 3. Nieuwe componenten (aantoonbaar noodzakelijk, conform Component Coverage Matrix)

Beide componenten waren al als verwachte lacune benoemd in `07-design-system/coverage-matrix.md` — dit is het moment waarop de noodzaak aantoonbaar wordt (toepassing in een echt wireframe), conform de bestaande vastleggingsregel.

### CMP-032 — Category Tile
| Aspect | Beschrijving |
|---|---|
| Doel | Eén categorie tonen als klikbare tegel (afbeelding/icoon + label) in een grid of scroll-rij. |
| Varianten | Grid-item (desktop/tablet), horizontaal scrollend kaart-item (mobiel) — zelfde responsive patroon als CMP-017 Product Card. |
| Interacties | Klik/tap navigeert naar de categoriepagina. |
| Toegankelijkheid | Afbeelding/icoon is decoratief (`aria-hidden`) wanneer het label al als tekst aanwezig is; hele tegel klikbaar/focusbaar. |
| Bouwaard | Standaard bouwpatroon, data uit Product Cloud (categoriestructuur). |
| Afhankelijkheden | Categoriestructuur, categorieafbeeldingen. |
| Waarom nu pas toegevoegd | Kwam niet voor in Productpagina/Buy Box/Checkout — exact zoals de vastleggingsregel voorschrijft, nu bevestigd door toepassing op de Homepage. |

### CMP-033 — Advertisement Banner Slot
| Aspect | Beschrijving |
|---|---|
| Doel | Eén verkoopbare advertentiepositie tonen (Blueprint H14.8: Hero Banner, Homepage Sliders, categorie-Sliders). |
| Varianten | Positiegebonden (grootte/aspect ratio verschilt per positie — voor de MVP twee posities op de Homepage), niet content-gebonden — de banner-inhoud zelf is partnerdata, geen platformcontent. |
| Staten | Gevuld (actieve advertentie), leeg/onverkocht (voor de MVP: toont een neutrale, niet-commerciële placeholder — bijv. een korte EuropMade-boodschap — nooit een lege witruimte, dat oogt onprofessioneel op een premium marketplace). |
| Interacties | Klik navigeert naar de partner-/productpagina van de adverteerder. |
| Toegankelijkheid | Verplicht `alt`-tekst; verplicht zichtbaar "Advertentie"-label, niet alleen via kleur/kleine tekst (zelfde regel als CMP-008 Badge: betekenis nooit uitsluitend visueel). |
| Bouwaard | **Maatwerk** — geen Medusa-equivalent, kern van het bannerplatform (`01-architecture/standard-vs-custom.md`). |
| Afhankelijkheden | Advertentie-inventorybeheer (Admin, scherm #60), boekingssysteem (buiten deze UX-scope). |
| Waarom nu pas toegevoegd | Kwam niet voor in Productpagina/Buy Box/Checkout (geen van beide is verkoopbare advertentieruimte) — nu aantoonbaar noodzakelijk omdat de Homepage expliciet advertentie-inkomsten moet maximaliseren. |

**Bijwerking Component Coverage Matrix:** met deze twee toevoegingen zijn de voor de Homepage geïdentificeerde lacunes opgelost; Retailer Card (CMP-015) gaat van "Voorbereid" naar "Bevestigd". Zoekresultaten/Categoriepagina behouden hun eigen, nog openstaande lacunes (Filters, Pagination, Empty State) — die worden pas ingevuld wanneer die schermen zelf ontworpen worden.

---

## 4. Interne UX-, CRO- en Marketplace-review (vóór oplevering verwerkt)

Zelfde werkwijze als bij Checkout: kritisch getoetst en verwerkt vóórdat dit document als v1.0 wordt opgeleverd, niet als losse ronde achteraf.

- **Risico: "Uitgelichte retailers" (sectie 7) kan onbedoeld altijd dezelfde paar retailers bevoordelen**, wat het eerlijkheidsprincipe van de Buy Box (spec sectie 3.0) op Homepage-niveau zou tegenspreken. → **Verwerkt:** expliciete eis toegevoegd dat de selectie **roteert** (bijv. wekelijks, over alle in aanmerking komende retailers/merken die aan een minimale kwaliteitsdrempel voldoen), niet een vaste, handmatig gekozen lijst — dezelfde geest als de Buy Box-tiebreaker-rotatie (ADR 0004), hier toegepast op redactionele zichtbaarheid.
- **Risico: twee advertentieposities zouden de "Homepage is de belangrijkste commerciële pagina"-opdracht kunnen laten interpreteren als "zoveel mogelijk advertenties".** → **Verwerkt:** sectie 0/1 legt expliciet vast waarom commissie (niet advertenties) de primaire inkomstenbron is (Blueprint H5.6), en waarom advertenties bewust ná de hoog-converterende secties staan — een bewuste, beargumenteerde volgorde-keuze, niet een omissie.
- **Risico: "Uitgelichte producten" (sectie 5) en Sponsored Products (post-MVP, ADR 0003) zouden in de toekomst door elkaar kunnen gaan lopen**, zeker als Sponsored Products ooit wordt gebouwd. → **Verwerkt:** sectie 5, punt 8 legt expliciet vast dat deze sectie **nooit** gesponsord wordt, zelfde principe als de Buy Box — een toekomstige ontwikkelaar kan dit niet per ongeluk aanpassen zonder tegen deze vastgelegde regel in te gaan.
- **Risico: lege/onverkochte advertentieslots ogen onprofessioneel op een premium marketplace.** → **Verwerkt:** CMP-033 heeft een verplichte, niet-lege fallback-staat (sectie 3), zodat de MVP nooit een kale placeholder toont bij lage bezetting.
- **Risico: SEO-doelstelling en advertentie-doelstelling conflicteren** (advertentielinks die zoekmachines beïnvloeden). → **Verwerkt:** `rel="sponsored"`-eis expliciet vastgelegd bij CMP-033 (sectie 6, punt 4).
- **Overwogen en bewust losgelaten: gepersonaliseerde Hero-content voor de MVP** (bijv. "Welkom terug, [naam]"). → Expliciet **niet** gedaan — sectie 0, punt 4 legt vast dat personalisatie een toekomstige laag is; de MVP-Hero is voor iedereen identiek, wat ook consistenter is met de 5-secondenregel (een onbekende bezoeker mag nooit een "leeg" persoonlijk element zien).
- **Marketplace-fairness-check op sectie 4 (Categorieën):** volgorde is redactioneel (Administrator-bepaald), niet retailer-betaald — bevestigd consistent met het Buy Box-neutraliteitsprincipe; geen wijziging nodig, al correct opgezet.
- **Mobiele CRO-check:** op mobiel neemt een te grote advertentiebanner verhoudingsgewijs meer beeldschermruimte in dan op desktop, wat de conversie sterker kan schaden. → **Verwerkt in de wireframe (sectie 5):** CMP-033 krijgt op mobiel een bewust kleinere, vaste beeldverhouding (geen full-bleed groot formaat), zodat de banner nooit meer dan een beperkt deel van het eerste scherm in beslag neemt.

---

## 5. Wireframe

Zie [`02-ux/wireframes/sprint-1a/03-homepage-desktop.html`](../../02-ux/wireframes/sprint-1a/03-homepage-desktop.html), `-tablet.html`, `-mobile.html` — uitgewerkt ná deze specificatie, conform de opdracht ("ontwerp daarna pas de wireframe").

---

## 6. Consistentiecontrole

- **Blueprint:** H5.6 (commissie primair, advertenties secundair) — consistent, sturend voor de sectievolgorde. H14.8–14.9 (bannerposities, eerlijke boeking) — consistent, CMP-033. H13.3 (Vijf Pijlers) — consistent, sectie 3.
- **UX-architectuur:** scherm #1 (Homepage, Must Have) — consistent; landingspagina's (#23) en Over EuropMade (#18) correct als linkdoelen gebruikt, niet gedupliceerd.
- **Product Cloud / Commerce Cloud:** geen vermenging — Categorieën/Product Card/Retailer Card lezen alleen, wijzigen niets; advertentiedata (CMP-033) is expliciet gescheiden van Product Cloud/Commerce Cloud-data.
- **ADR's:** ADR 0003 (Sponsored Products post-MVP) — consistent, expliciet niet toegepast op "Uitgelichte producten". ADR 0004 (tiebreaker-rotatie) — geest hergebruikt voor de retailer-rotatie-eis (sectie 4 van dit document), geen nieuwe ADR nodig omdat het principe al bestond, hier alleen toegepast op een nieuwe context.
- **Wireframe Strategy / Design System v1.0:** canonieke namen en CMP-ID's gebruikt; twee nieuwe componenten toegevoegd volgens de bestaande vastleggingsregel, niet buiten die regel om.

---

## 7. Sectiedoelclassificatie — conversie, advertentie-inkomsten, SEO, vertrouwen, merkpositionering

**Toevoeging op verzoek, na v1.0.** Dit is een **documentatie-uitbreiding**, geen wijziging aan het bevroren wireframe: er verandert niets visueels, structureels of functioneels aan `03-homepage-*.html`. De classificatie maakt expliciet wat in de sectiespecificatie (sectie 2, punten 2–5) al impliciet vastlag, en voegt een schaalbaarheidsperspectief toe (sectie 8).

Elke sectie dient meerdere doelen (zoals de opdracht van de Homepage zelf al vaststelt), maar heeft één of twee **primaire** doelstellingen. Onderstaande matrix maakt dat voor het eerst expliciet en in één oogopslag vergelijkbaar.

| Sectie | Primair | Secundair |
|---|---|---|
| 1. Header | **Conversie** (zoekbalk = kortste pad) | Vertrouwen (neutrale, betrouwbare chrome) |
| 2. Hero | **Vertrouwen + Merkpositionering** (5-secondenregel, premium eerste indruk) | Conversie (herhaalde zoekbalk) |
| 3. Trust Bar | **Vertrouwen** (uitsluitend) | — |
| 4. Categorieën-grid | **Conversie** (navigatiepad) | SEO (interne linkstructuur naar 30 categoriepagina's) |
| 5. Uitgelichte producten | **Conversie** (hoogste directe bijdrage van de hele pagina) | Merkpositionering (Verified™/Country of Production zichtbaar) |
| 6. Advertentiebanner, positie 1 | **Advertentie-inkomsten** (uitsluitend) | — |
| 7. Uitgelichte Europese merken | **Merkpositionering** (partnerzichtbaarheid, "Made in Europe"-verhaal) | Vertrouwen, SEO (links naar merkpagina's) |
| 8. Advertentiebanner, positie 2 | **Advertentie-inkomsten** (uitsluitend) | — |
| 9. "Made in Europe"-verhaal | **SEO** (hoogste tekstuele/keyword-waarde van de pagina) | Merkpositionering |
| 10. Nieuwsbrief | *Geen van de vijf nu primair* | Voorbereidend op toekomstige conversie via personalisatie (sectie 0, punt 4) |
| 11. Footer | SEO (interne links), Vertrouwen (juridische links) | — |

**Wat dit oplevert:** exact twee secties zijn zuiver advertentie-gedreven (6 en 8), exact twee zijn zuiver vertrouwens-/merkgedreven zonder enige commerciële boodschap (2 grotendeels, 3 volledig), en de zwaarste conversie-secties (1, 4, 5) staan bewust vóór beide advertentieposities — dit bevestigt cijfermatig de volgordekeuze uit sectie 1 en 4 (interne review) in plaats van die alleen kwalitatief te beargumenteren.

**Geen enkele sectie is tegelijk primair "Advertentie-inkomsten" én primair iets anders** — een bewust vastgehouden scheiding, direct voortvloeiend uit het neutraliteitsprincipe (sectie 0, punt 3): advertentie-secties doen uitsluitend dat, zodat vertrouwens- en conversiesecties nooit de schijn wekken commercieel beïnvloed te zijn.

---

## 8. Lange-termijn schaalbaarheid (MVP → Europese marketplace met miljoenen bezoekers)

**Eveneens een documentatie-uitbreiding** — onderstaande zijn architectuur-/implementatie-eisen voor de bouwfase, geen wijzigingen aan het bevroren wireframe zelf. Het wireframe blijft structureel geschikt voor groei; wat hieronder staat, bepaalt hoe het *achter* diezelfde structuur schaalt.

### 8.1 Performance & caching
- De Homepage is voor het overgrote deel **niet persoonsgebonden** in de MVP (sectie 0, punt 4) — dit maakt volledige edge-/CDN-caching per land/taal (Next.js ISR — Incremental Static Regeneration) mogelijk vanaf dag één, wat bij miljoenen bezoekers essentieel is.
- **Toekomstige personalisatie mag deze cacheability niet doorbreken:** wanneer secties 5 (Uitgelichte producten) of 10 (Nieuwsbrief-opvolging) ooit persoonlijk worden, moet dit via een **losstaand, client-side of edge-side gepersonaliseerd fragment** binnen de verder statische pagina (dezelfde CMP-017-grid, andere databron per klant) — niet door de hele pagina niet-cachebaar te maken. Dit is al voorzien in sectie 0, punt 4; hier expliciet als technische randvoorwaarde vastgelegd.
- **Core Web Vitals (LCP):** de Hero (sectie 2) bepaalt de Largest Contentful Paint — advertentieslots (CMP-033, secties 6/8) moeten **lazy-loaded** worden (pas laden wanneer ze in beeld komen), zodat betaalde content nooit de laadsnelheid van de organische, hoogst-converterende bovenkant van de pagina vertraagt.

### 8.2 SEO op schaal
- **Structured data (schema.org):** `Organization`-markup voor EuropMade zelf, `ItemList`/`Product`-markup voor de secties Categorieën en Uitgelichte producten — nodig voor rich results bij miljoenen geïndexeerde pagina's, niet alleen de Homepage zelf.
- **hreflang:** verplicht zodra meer dan één taal/land actief is (al vanaf de 6 launch-landen, H14.10) — voorkomt duplicate-content-problemen tussen landversies van dezelfde Homepage-structuur.
- **Canonical URLs per land/Region**, consistent met de Medusa Region-koppeling (`01-architecture/tech-stack.md`).
- **Spanning met advertenties (8.1 herhaald vanuit SEO-perspectief):** Core Web Vitals zijn zelf een Google-rankingfactor — een trage Homepage door zwaar ladende advertenties schaadt dus niet alleen conversie maar ook organische SEO-groei. Dit is een van de weinige plekken waar de twee primaire doelstellingen van de Homepage (SEO en advertentie-inkomsten) elkaar rechtstreeks kunnen tegenwerken; de oplossing (lazy-loading, sectie 8.1) is vastgelegd, niet alleen benoemd.

### 8.3 Advertenties op schaal
- CMP-033 is bewust **contentagnostisch** gedefinieerd (component toont "wat er geboekt is", bevat geen eigen selectielogica) — dit betekent dat een toekomstig programmatisch boekingssysteem, frequency capping, of A/B-geteste advertentieformaten **zonder wijziging aan het component zelf** geïmplementeerd kunnen worden, uitsluitend aan de kant van het boekingssysteem (buiten deze UX-scope, al genoemd in sectie 3).
- Bij miljoenen bezoekers wordt **fill rate** (sectie 2, punt 5 van elke advertentiesectie) een capaciteitsvraagstuk, niet alleen een commercieel vraagstuk — de verplichte niet-lege fallback-staat (sectie 3, CMP-033) blijft daarom ook op grote schaal een harde eis, niet een MVP-noodgreep.

### 8.4 Catalogus-/contentschaal
- **Categorieën-grid (CMP-032):** blijft vast op ~30 hoofdcategorieën (Blueprint H14.8) — groeit niet mee met het aantal producten, dus geen schaalbaarheidsrisico.
- **Uitgelichte producten/retailers (CMP-017/CMP-015):** de selectie (bestverkocht/hoogst beoordeeld/rotatie) moet bij miljoenen producten/retailers **vooraf berekend en gecachet** worden (bijv. periodiek ververste lijst), niet live per pagina-load bevraagd — anders wordt de Homepage zelf een performance-bottleneck naarmate de catalogus groeit. Dit is een expliciete eis aan de toekomstige backend-implementatie, geen wireframe-wijziging.

### 8.5 Vertrouwen op schaal
- De Trust Bar (sectie 3) gebruikt in de MVP statische claims ("Uitsluitend Europese producenten", "30 dagen retour"). Een logische, niet-verplichte evolutie bij groei is het tonen van **actuele aantallen** ("14.000+ Europese producten", "60.000+ tevreden klanten") zodra die aantallen aantrekkelijk genoeg zijn — dit past binnen dezelfde component (CMP-008 Badge/tekst), vereist geen nieuw component, en wordt hier bewust als toekomstige, optionele evolutie genoteerd, niet als eis voor nu.

### 8.6 Internationalisering op schaal
- Alle secties gebruiken tekstlabels zonder vaste pixelbreedtes die zouden kunnen breken bij langere vertalingen (bijv. Duitse samengestelde woorden) — al zo opgezet in het grijswaarden-wireframe (flexibele containers, geen harde tekstbreedtes), dus geen wijziging nodig, alleen bevestigd als bestaande eigenschap die schaalt naar meer talen dan de huidige 6.

### 8.7 Meten & experimenteren
- Elke sectie is in de wireframe-structuur al **onafhankelijk identificeerbaar** (aparte secties, eigen CMP-ID's) — dit maakt sectie-niveau A/B-testen (bijv. andere sectievolgorde, andere Hero-copy) mogelijk zonder de hele pagina te herbouwen. Een vereiste voor duurzame CRO-optimalisatie op lange termijn, mogelijk gemaakt door een keuze die al in sectie 1 lag, hier expliciet benoemd als schaalvoordeel.

---

## Status: v1.0 (definitief, aangevuld met sectie 7–8)

Alle acht commerciële doelstellingen zijn per sectie geadresseerd, de interne review is vóór oplevering verwerkt, en de consistentiecontrole toont geen resterende inconsistenties. Secties 7 en 8 (op verzoek toegevoegd) maken expliciet welke doelstelling elke sectie primair dient, en leggen vast hoe de Homepage van MVP naar een marketplace met miljoenen bezoekers kan groeien zonder de structuur te herzien — beide zijn documentatie-uitbreidingen, het bevroren wireframe zelf is ongewijzigd. **Homepage-specificatie blijft v1.0.** Wireframe: zie sectie 5.
