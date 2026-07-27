# EuropMade — Sprint 1B Architectuurcontrole: Risicobeoordeling

**Status:** Definitief. Uitgevoerd vóór de start van Sprint 1B.
**Methode:** uitsluitend gebaseerd op bestaande documentatie (Blueprint v2.1, UX-architectuur, functionele specificaties, ADR's, Design System v1.0). Geen nieuwe wireframes, geen nieuwe schermontwerpen — uitsluitend risicoanalyse.

---

## 0. Beoordelingskader

Elk onderdeel wordt beoordeeld op vier dimensies:

- **Technisch risico** — hoe groot is de kans op architecturale problemen, en hoe zwaar wegen die (maatwerk vs. standaard, `01-architecture/standard-vs-custom.md`)?
- **Functioneel risico** — hoeveel onopgeloste edge cases/beslissingen staan er nog open in de bestaande specificaties?
- **Impact op het businessmodel** — hoe direct raakt dit onderdeel de twee inkomstenbronnen (commissie, advertenties, Blueprint H5.6) en het kernonderscheidend vermogen (Buy Box/Verified™)?
- **Afhankelijkheden voor ontwikkeling** — hoeveel andere onderdelen moeten al bestaan vóórdat dit onderdeel zinvol gebouwd/getest kan worden, en hoeveel andere onderdelen hangen op hun beurt hiervan af?

---

## 1. Beoordeling per onderdeel

### Product Cloud
| Dimensie | Beoordeling |
|---|---|
| Technisch risico | **Hoog.** Volledig maatwerk (`01-architecture/standard-vs-custom.md`): eigenaarschapsvelden, meerdere EAN's per variant, versiebeheer, productstatus-levenscyclus — geen van dit is standaard Medusa. Elke fout hier propageert naar alles wat erop leest. |
| Functioneel risico | **Hoog.** De functionele spec zelf laat meerdere beslissingen bewust open (bijv. exacte verificatiemethode voor producent/merkhouder-status, sectie 1.10; het onderscheid "nieuwe versie vs. nieuw product", sectie 1.9) — dit zijn onopgeloste regels, geen afgeronde specificatie. |
| Impact op businessmodel | **Hoog.** Draagt Verified™ (kernonderscheidend vermogen, trustopbouw) en is de databron waarop de Buy Box-productinformatie leunt. |
| Afhankelijkheden | **Meest upstream van alle negen onderdelen.** Commerce Cloud, Product Claim Flow, Producent Dashboard, en delen van Retailer Dashboard kunnen niet zinvol gebouwd worden zonder dat dit al bestaat. Hangt zelf van niets af. |

### Commerce Cloud
| Dimensie | Beoordeling |
|---|---|
| Technisch risico | **Hoogst van alle negen onderdelen.** Dit is expliciet en herhaaldelijk benoemd als de grootste architecturale afwijking van standaard Medusa-marketplace-patronen (`01-architecture/standard-vs-custom.md`, sectie 0.2: "1 product = N aanbieders" bestaat niet als standaardpatroon). ADR 0005 verplicht bovendien dat de Buy Box-berekening en de order-splitsing uitsluitend server-side gebeuren — een architecturale eis die nog nergens technisch gevalideerd is (de UX-architectuur noemt dit expliciet als "technische spike" die nog moet gebeuren, sectie 6.7). |
| Functioneel risico | **Hoog.** De Buy Box-weging is met opzet configureerbaar in plaats van vastgelegd (ADR 0001) — dit vereist een configuratiemechanisme dat nog nergens beschreven is buiten de UX-laag. |
| Impact op businessmodel | **Hoogst.** Dit ís de Buy Box, het kernonderscheidend vermogen, en de directe motor achter commissie-inkomsten (elke conversie loopt via een Offer in Commerce Cloud). |
| Afhankelijkheden | Vereist Product Cloud (Offers refereren aan EAN/Variant). Vrijwel alles daarna hangt hiervan af: Winkelwagen (cart line items refereren aan Offers, niet alleen Variants — al vastgelegd in `checkout/spec.md` sectie 0 als maatwerk-eis), Checkout (al bevroren, rust volledig op deze aanname), Retailer Dashboard (commerciële gegevens), Product Claim Flow (retailer behoudt Commerce Cloud-rechten na claim). |

### Product Claim Flow
| Dimensie | Beoordeling |
|---|---|
| Technisch risico | **Middel-hoog.** Vereist matching-logica tussen een claimende producent en bestaande Retailer Created-producten, plus een rechtenoverdracht die niet mag conflicteren met eventuele openstaande wijzigingsvoorstellen (functionele spec sectie 1.6, punt 6). |
| Functioneel risico | **Hoog.** Van de negen onderdelen heeft dit de meeste expliciet erkende, nog onopgeloste edge cases: de exacte verificatiemethode staat open (sectie 1.10), en het geschilproces bij een betwiste claim is een "voorstel, niet in de Blueprint uitgewerkt" (sectie 1.6, punt 7). |
| Impact op businessmodel | **Middel-hoog.** Cruciaal voor de datakwaliteit achter Verified™, maar is een secundaire flow — alleen relevant zodra er al Retailer Created-producten bestaan. |
| Afhankelijkheden | Vereist zowel Product Cloud (eigenaarschapsmodel) als Partner Onboarding (verificatie van de claimende partij) — kan onmogelijk als eerste gebouwd worden. |

### Retailer Dashboard
| Dimensie | Beoordeling |
|---|---|
| Technisch risico | **Middel.** Grotendeels standaard bouwpatroon (Medusa Order, eigen Next.js-app), met één maatwerk-uitschieter: de Buy Box-positie-indicator (functionele spec sectie 5.2), die rechtstreeks op de Commerce Cloud-scoreberekening leunt. |
| Functioneel risico | **Middel.** Rollen en rechten zijn al goed gespecificeerd (functionele spec sectie 4, rollenmatrix); het grootste risico is niet de functionaliteit zelf maar de afhankelijkheid van een nog niet gevalideerde Commerce Cloud. |
| Impact op businessmodel | **Hoog.** Dit is waar retailers daadwerkelijk aanbod creëren — zonder dit scherm ontstaat er geen enkele Offer, dus geen enkele mogelijke commissie. |
| Afhankelijkheden | Vereist Partner Onboarding (moet eerst bestaan) en Product Cloud/Commerce Cloud (waar het op leest/schrijft). |

### Producent Dashboard
| Dimensie | Beoordeling |
|---|---|
| Technisch risico | **Middel.** Wijzigingsvoorstellen-beoordeling gebruikt de Medusa Workflow-engine als technisch fundament (standaard bouwpatroon), maar de AI-voorbeoordeling (functionele spec sectie 1.8) is nog niet technisch gespecificeerd. |
| Functioneel risico | **Hoog.** Bestuurt de kwaliteitsmechanismen (Product Quality Score, Verified™-drempel) die zelf al bewust configureerbaar zijn gehouden (ADR 0002) — dit dashboard moet dus een configuratie-interface bieden die nog nergens beschreven is. |
| Impact op businessmodel | **Hoog.** Verified™ is een expliciet vertrouwens-/conversiehefboom (Homepage-spec, Trust Bar-sectie leunt hier direct op). |
| Afhankelijkheden | Vereist Product Cloud, Product Claim Flow (claimen is de manier waarop een producent producten binnenkrijgt) en Partner Onboarding. |

### Partner Onboarding
| Dimensie | Beoordeling |
|---|---|
| Technisch risico | **Laag-middel.** Grotendeels standaard (identiteitscontrole, BTW-validatie, betaalgegevens) — Blueprint H9.4 stelt hier zelfs een concrete snelheidsdoelstelling (binnen 1 werkdag live), wat wijst op een bewust eenvoudig gehouden proces. |
| Functioneel risico | **Laag-middel.** Eén open punt: de exacte verificatiemethode voor producent-/merkhouderstatus is nog niet vastgelegd (functionele spec sectie 1.10) — relevant, maar geen architecturaal risico. |
| Impact op businessmodel | **Middel-hoog.** Zonder onboarding geen enkele partner, dus geen enkel aanbod — maar het proces zelf differentieert niet (standaard SaaS-onboardingpatroon). |
| Afhankelijkheden | Kan grotendeels **onafhankelijk** van Product Cloud/Commerce Cloud gebouwd worden (het registreert een partij, niet een product) — een van de weinige onderdelen zonder zware voorwaartse afhankelijkheid. |

### Winkelwagen
| Dimensie | Beoordeling |
|---|---|
| Technisch risico | **Laag.** Standaard Medusa Cart-module (`01-architecture/standard-vs-custom.md`), met één maatwerk-detail dat al is vastgelegd: cart line items refereren aan een Offer, niet alleen aan een Variant (`checkout/spec.md`, sectie 0). |
| Functioneel risico | **Laag.** De inhoud en het gedrag zijn al impliciet volledig gespecificeerd via Checkout (dat expliciet begint "waar Winkelwagen eindigt", checkout/spec.md sectie 1) — er is nauwelijks eigen, onbeschreven functionaliteit over. |
| Impact op businessmodel | **Middel.** Noodzakelijke schakel, niet zelf onderscheidend. |
| Afhankelijkheden | Vereist dat Commerce Cloud al Offers kan leveren om ooit iets aan toe te voegen; Checkout (al bevroren) is er al volledig op gebouwd. |

### Orderbevestiging
| Dimensie | Beoordeling |
|---|---|
| Technisch risico | **Laag.** Grotendeels presentatie van een reeds server-side berekend resultaat (de order-splitsing, ADR 0005) — geen eigen zware logica. |
| Functioneel risico | **Laag-middel.** Minimumvereisten liggen al vast (`checkout/spec.md`, sectie 11, toegevoegd na de Customer Journey Audit) — het risico zit niet in onduidelijkheid maar in correcte uitvoering van een reeds gedane belofte. |
| Impact op businessmodel | **Laag-middel.** Bevestigingsmoment, geen eigen conversie- of inkomstenfunctie — wél belangrijk voor vertrouwen/retentie. |
| Afhankelijkheden | **Meest downstream van alle negen onderdelen** — kan pas zinvol gebouwd/getest worden zodra Checkout's order-splitsing-engine (Commerce Cloud + ADR 0005) daadwerkelijk werkt. |

### Mijn Account
| Dimensie | Beoordeling |
|---|---|
| Technisch risico | **Laag.** Standaard Medusa Customer-/Order-patronen (bestellingenoverzicht, orderdetail, adresbeheer). |
| Functioneel risico | **Laag-middel.** Retourproces heeft een bekend escalatiepad (UX-review-voorstel, functionele spec sectie 6.1) dat nog gebouwd moet worden, verder grotendeels standaard. |
| Impact op businessmodel | **Middel.** Verkopersreviews die hier worden geplaatst, voeden rechtstreeks de Buy Box-scoreberekening (functionele spec sectie 3.1) — een indirecte maar reële koppeling met het kernonderscheidend vermogen. |
| Afhankelijkheden | Vereist Orderbevestiging/orderdata om iets te tonen — één van de laatste onderdelen die zinvol gebouwd kan worden. |

---

## 2. Gecombineerde risicorangschikking

| Rang | Onderdeel | Kernreden |
|---|---|---|
| 1 | **Commerce Cloud** | Grootste technische afwijking van standaard Medusa, nog niet technisch gevalideerd (ADR 0005-eis), hoogste directe impact op het verdienmodel. |
| 2 | **Product Cloud** | Meest upstream onderdeel van de hele architectuur; meerdere nog onopgeloste functionele regels. |
| 3 | **Product Claim Flow** | Meeste expliciet erkende, onopgeloste edge cases van alle negen onderdelen. |
| 4 | **Producent Dashboard** | Bestuurt configureerbare kwaliteitsdrempels (ADR 0002) zonder dat de configuratie-interface al bestaat. |
| 5 | **Retailer Dashboard** | Hoge businessimpact (enige bron van nieuw aanbod), technisch risico geconcentreerd in de Buy Box-positie-indicator. |
| 6 | **Partner Onboarding** | Laag-middel risico, maar wel een harde voorwaarde voor #3–#5. |
| 7 | **Winkelwagen** | Grotendeels standaard, al impliciet volledig gespecificeerd door de bevroren Checkout. |
| 8 | **Mijn Account** | Grotendeels standaard, indirecte businessimpact via reviews. |
| 9 | **Orderbevestiging** | Laagste eigen risico — een presentatielaag over een risico dat al bij Commerce Cloud (#1) zit. |

**Patroon:** de twee niet-schermgebonden domeinen (Commerce Cloud, Product Cloud) staan bovenaan — dit bevestigt dat het grootste risico van Sprint 1B niet in een specifiek scherm zit, maar in de onderliggende datamodellen die elk scherm gebruikt. De drie laagste posities (Winkelwagen, Mijn Account, Orderbevestiging) zijn stuk voor stuk al **impliciet volledig gespecificeerd** doordat de bevroren Checkout-specificatie precies vastlegt wat ervoor en erna gebeurt.

---

## 3. Advies

> **"Met welk scherm zou een ervaren softwarearchitect als eerste beginnen?"**

**Product toevoegen — nieuw product (Retailer Created), scherm #34.**

**Motivatie, uitsluitend vanuit architectuur:**

Een traditionele webshop-redenering zou zeggen: begin met wat de klant het eerst ziet, of begin met de kassa omdat daar de omzet vandaan komt. Beide redeneringen zijn hier niet leidend — de vraag is niet welk scherm het meeste omzet oplevert, maar welk scherm het grootste architecturale risico het snelst en het goedkoopst blootlegt.

Uit de risicorangschikking (sectie 2) volgt dat de twee grootste risico's — Commerce Cloud en Product Cloud — **geen van beide een scherm zijn**, maar datamodellen die door bijna elk ander onderdeel worden aangenomen als "het werkt al". De drie reeds bevroren schermen (Productpagina/Buy Box, Checkout, Marketplace Listing) zijn **allemaal ontworpen op de aanname** dat er Offers bestaan die aan EAN's/Variants gekoppeld zijn, dat de Buy Box server-side een winnaar kan berekenen (ADR 0005), en dat een winkelwagenregel naar een Offer verwijst — geen van die aannames is tot nu toe tegen een werkend systeem getoetst.

**Scherm #34 (Retailer Created) is het enige scherm in de hele MVP-scope waar één enkele gebruikersactie tegelijk Product Cloud én Commerce Cloud aanraakt** — een retailer die een nog niet bestaand product toevoegt, creëert in één stap zowel het Product Cloud-record (titel, specificaties — tijdelijk in retailerbeheer, functionele spec sectie 1.6) als het bijbehorende Commerce Cloud-record (prijs, voorraad, levertijd). Geen ander scherm in de scope biedt deze dubbele dekking met één ontwikkelinspanning.

Door dit scherm eerst te bouwen:

1. Wordt het grootste, nog niet gevalideerde architectuurrisico (Commerce Cloud, ADR 0005) het eerst blootgelegd — niet in theorie, maar met een echte database-rij.
2. Ontstaat de eerste **echte** Offer waartegen de al bevroren Productpagina, Buy Box en Checkout voor het eerst tegen een werkend systeem getest kunnen worden, in plaats van tegen de statische wireframe-aannames waarop ze tot nu toe gebouwd zijn.
3. Wordt Product Claim Flow (rang 3) pas zinvol testbaar zodra er via dit scherm daadwerkelijk Retailer Created-producten bestaan om te claimen.
4. Blijft Partner Onboarding (rang 6) een bewust kleine, parallelle prerequisite — nodig om bij dit scherm te komen, maar zelf niet het onderdeel dat het meeste architecturale onzekerheid wegneemt.

**Orderbevestiging, Winkelwagen en Mijn Account blijven bewust laatste** — niet omdat ze onbelangrijk zijn, maar omdat ze pas zinvol te bouwen zijn zodra het risico waar ze bovenop staan (Commerce Cloud) al is aangetoond te werken. Een architect die daar zou beginnen, zou een voltooide bovenbouw neerzetten op een fundament dat nog nooit getoetst is.

**Vervolg:** de volledige functionele uitwerking van dit advies staat in [`03-functional-specs/marketplace-core/spec.md`](../03-functional-specs/marketplace-core/README.md) — de Retailer Created end-to-end flow, de functionele waarheid voor Sprint 1B.
