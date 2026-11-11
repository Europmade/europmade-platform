# EuropMade — Functionele UX-specificatie: Product Cloud, Commerce Cloud & Buy Box

**Status:** Definitief — akkoord ontvangen op alle vier beslispunten (Buy Box-weging, Verified™-drempel, Sponsored Products, tiebreaker) plus het ontwerpprincipe "de Buy Box dient altijd het belang van de klant". Vervolg op de UX-Architectuur (Stap 4) en de technische uitgangspunten (Next.js + Medusa, PostgreSQL, TransIP/EU-hosting).
**Component ID-referentie:** de in dit document beschreven UI-elementen zijn na Design System v1.0 vastgelegd onder CMP-013 (Buy Box), CMP-014 (Offer Card/Offer Comparison Row), CMP-016 (Retailer Indicator), CMP-018 (Verified™ Badge), CMP-020 (Shipping Badge), CMP-021 (Delivery Estimate), CMP-022/023/024 (Country of Production/Manufacturer/Product Owner Badge) — zie [`07-design-system/components.md`](../../07-design-system/components.md) voor de volledige, bindende omschrijving.
**Basis:** EuropMade Blueprint v2.1, met name H5–H9, H11, H13.
**Doel:** dit onderdeel volledig vastleggen omdat het het grootste concurrentievoordeel van EuropMade vormt (H6.13, H7.14, H8.12) — pas na akkoord hierop starten de wireframes.

---

## 1. Product Cloud

### 1.1 Productstructuur

Vaste hiërarchie, direct uit H6.6/H7.3–7.6, gemapt op de Next.js + Medusa-architectuur (zie ook UX-Architectuur sectie 0.2):

```
Product (uniek, onveranderlijke interne Product-ID; één verkoopbaar artikel)
 └─ Technische variant (precies één; geen commerciële variantas — ADR-0050)
     └─ EAN / GTIN / MPN (één of méér voor hetzelfde artikel — meerdere EAN's per land mogelijk, H7.6)
         └─ Aanbiedingen / Offers (Commerce Cloud — één per retailer, gekoppeld aan EAN én land/Region)
```

- **Product** = Medusa Product-module, uitgebreid met eigenaarschapsvelden, productstatus, Quality/Health Score en compliance-metadata. Kleur, maat, inhoud, vermogen, spanning, materiaal, uitvoering, batterij en bundel zijn specificaties van dit product, of een ander zelfstandig product (ADR-0050).
- **Technische variant** = de interne Medusa-variant van dat ene product. Geen `variant_type` als commerciële as. Seller en Admin beheren deze rij niet.
- **EAN/GTIN/MPN** = custom sub-entiteit onder die technische variant (niet standaard 1-op-1 in Medusa), met een `country_scope`-veld omdat hetzelfde artikel meerdere landspecifieke EAN's kan hebben (H7.6).
- **Offer** = het custom Commerce Cloud-datamodel (sectie 2), gekoppeld aan een EAN + Region, nooit aan het Product zelf.

Titel, omschrijving, specificaties, media en documentatie hangen op **Product**-niveau. "Eén productpagina, N aanbieders" gaat over aanbieders van hetzelfde artikel, niet over kleuren of maten als varianten.

### 1.2 Rol: Producent

- Maakt en beheert de officiële productinformatie: titel, omschrijving, specificaties, afbeeldingen, video's, handleidingen, certificeringen (H5.4).
- Heeft **standaard** het laatste woord over elke wijziging aan productinformatie, ook wanneer een retailer een verbetering voorstelt (H9.8).
- Kan producten claimen die door een retailer zijn aangemaakt (*Retailer Created*, zie 1.6).
- Beheert compliance-velden (GPSR, CE-documentatie, DPP-voorbereiding — H13.8, H13.10) en vraagt Verified™ aan (sectie 1.10).
- Heeft **geen** toegang tot Commerce Cloud-gegevens van retailers (prijs, voorraad, levertijd) — dat blijft strikt gescheiden (H5.5, H8.2).

### 1.3 Rol: Merkhouder

- Krijgt **dezelfde rechten als de producent** zodra de merkhouder zelf niet produceert (H5.4) — functioneel identiek aan de Producent-rol binnen de Product Cloud. In dit document worden Producent en Merkhouder daarom als één functionele rol behandeld, tenzij expliciet anders vermeld.
- Praktisch verschil (niet in Blueprint expliciet uitgewerkt, **voorstel**): bij verificatie (1.9) wordt bij een Merkhouder aanvullend gecontroleerd op een geldige merkregistratie/licentierelatie met de producent, in plaats van een fabrieks-/producentregistratie. Dit voorkomt dat een willekeurige partij zich ten onrechte als merkhouder voordoet.

### 1.4 Rol: Retailer (binnen Product Cloud)

- Heeft **in de regel geen** wijzigingsrecht op officiële productinformatie — uitsluitend het recht om een **wijziging voor te stellen** (H9.6).
- **Uitzondering:** bij een door de retailer zelf aangemaakt, nog niet geclaimd product (*Retailer Created*) beheert de retailer tijdelijk zowel productinformatie als commerciële gegevens (H5.4, H6.10).
- Kan producten koppelen aan bestaande Product Cloud-pagina's via EAN-zoeken, CSV-import of API (H9.5).
- Ziet altijd duidelijk welke velden hij zelf beheert en welke door de producent worden beheerd (transparantie-uitgangspunt, H9.2).

### 1.5 Rol: Distributeur

- Verkoopt namens merken (H9.3); functioneel gelijk aan Retailer binnen de Product Cloud, **tenzij** een specifiek contract met de merkhouder gedelegeerde productrechten toekent.
- **Voorstel (niet expliciet in Blueprint):** voor de MVP krijgt de Distributeur exact dezelfde Product Cloud-rechten als de Retailer (alleen voorstellen doen); gedelegeerde productrechten per merk worden pas overwogen als een post-MVP uitbreiding, om de rechtenstructuur in de MVP eenvoudig te houden.

### 1.6 Productclaims

Volledige flow, uitwerking van H6.10 en H9.8:

1. **Trigger:** een producent/merkhouder zoekt naar een product (via EAN/naam/merk) of ontvangt een systeemmelding "er bestaan niet-geclaimde producten van jouw merk" (proactieve match op merknaam-veld, **voorstel** ter versnelling van claims).
2. **Claimverzoek:** producent klikt "Dit is mijn product" op de productdetailpagina (status *Retailer Created*).
3. **Verificatie:** koppeling met de merk-/producentverificatie uit onboarding (1.9) — geen los verificatieproces per claim, maar een controle of de claimende partij al geverifieerd staat als producent/merkhouder van dát merk.
4. **Overdracht:** bij geslaagde verificatie gaat het beheer van productinformatie **automatisch** over naar de producent; de retailer behoudt uitsluitend zijn eigen commerciële gegevens (H6.10).
5. **Notificatie (UX-voorstel uit de UX-Architectuur, sectie 6.6 punt 2):** de retailer ontvangt een expliciete melding: *"[Producent] heeft dit product overgenomen. Jouw prijs, voorraad en levertijd blijven ongewijzigd actief; productinformatie wordt vanaf nu door [Producent] beheerd."*
6. **Openstaande wijzigingsvoorstellen op moment van claim:** als de retailer op het moment van claim nog een wijzigingsvoorstel had openstaan, wordt dit **automatisch omgezet** in een wijzigingsvoorstel gericht aan de nieuwe producent (in plaats van stilzwijgend te vervallen) — **voorstel**, niet expliciet beschreven in de Blueprint, maar noodzakelijk om geen data te laten verdwijnen.
7. **Geschil over een claim (niet in Blueprint uitgewerkt — voorstel):** als een retailer meent dat een claim onterecht is (bijv. verkeerd merk geclaimd), kan hij dit melden bij de Administrator, die de verificatie herbeoordeelt (koppelt aan Administrator-geschillenbeheer uit de UX-Architectuur, sectie 3.3).

### 1.7 Producteigenaarschap

Eigendomsmatrix, direct uit H5.5 en H7.13, met de Retailer Created-uitzondering:

| Gegeven | Eigenaar (standaardsituatie) | Eigenaar (Retailer Created, niet geclaimd) |
|---|---|---|
| Producttitel, omschrijving, specificaties, handleidingen, foto's | Producent/Merkhouder | Retailer (tijdelijk) |
| Vertalingen | AI + Producent | AI + Retailer (tijdelijk) |
| Compliance-velden | Producent | Retailer (tijdelijk, tot claim) |
| Verkoopprijs, voorraad, levertijd, verzendkosten | Retailer | Retailer |

Deze matrix is **de basis voor rechten in de UI**: elk veld in de Product Cloud-editor toont in de interface wie de eigenaar is (bewerkbaar of alleen-lezen, met tooltip "Dit veld wordt beheerd door [Producent]" wanneer niet-bewerkbaar), conform het transparantie-uitgangspunt van H9.2.

### 1.8 Productmutaties

Twee gescheiden mutatietypen, uit H9.6–9.8:

**A. Commerciële wijzigingen** (prijs, voorraad, levertijd, verzendkosten, acties)
- Altijd direct door de retailer zelf aan te passen, **geen goedkeuring nodig**, direct actief.
- Vindt plaats in de Commerce Cloud, niet in de Product Cloud (zie sectie 2).

**B. Productwijzigingen** (titel, specificatie, afbeelding, handleiding, etc.)
- Retailer dient een **voorstel** in → AI-review (H9.7: inhoudelijke check, ontbrekende informatie, betrouwbaarheid van de bron) → producent beoordeelt → goedkeuren/afwijzen/aanpassen.
- **Uitzondering:** bij Retailer Created-producten (nog geen producent) mag de retailer productwijzigingen **direct** doorvoeren, zonder AI-review/goedkeuringsstap, omdat hij dan zelf eigenaar is (1.7).
- Producent/merkhouder zelf kan zijn eigen productinformatie altijd direct wijzigen, zonder goedkeuringsstap (hij is immers de eigenaar).

### 1.9 Productversies

- Iedere wijziging wordt vastgelegd met datum, gebruiker, oude/nieuwe waarde, reden en goedkeuringsstatus (H11.6) — een volledige, doorzoekbare versiehistorie per product.
- **Onderscheid tussen "nieuwe versie" en "nieuw product"** (H11.6 noemt voorbeelden maar geeft geen harde criteria — **voorstel** om dit in de MVP eenduidig te maken):
  - **Nieuwe versie** (Product-ID blijft gelijk): nieuwe verpakking, verbeterde handleiding, software-update, aanvullende foto's/specificaties, tekstuele verbeteringen.
  - **Nieuw product** (nieuw Product-ID): wijziging van kernidentiteit — ander EAN dat niet als landspecifieke variant is bedoeld, wezenlijk andere technische samenstelling, ander model/type.
  - Dit onderscheid wordt in de UI expliciet aan de producent voorgelegd op het moment dat een wijziging wordt opgeslagen ("Is dit een update van het bestaande product, of een nieuw product?"), zodat de keuze nooit stilzwijgend automatisch gebeurt.

### 1.10 Verificatie & Verified™

**Verificatie (identiteit, bij onboarding en bij claims):**
- Vaste stap in de onboarding (H9.4): identiteitscontrole, BTW-validatie, bedrijfsgegevens.
- Voor Producent/Merkhouder: aanvullende controle op merk-/producentstatus (bijv. handelsregisterkoppeling, merkregistratie) — **voorstel voor exacte verificatiemethode**, niet in Blueprint gespecificeerd; definitieve keuze (handmatige review door Administrator vs. geautomatiseerde koppeling met een handelsregister-API) moet nog worden vastgesteld.

**Verified™ (kwaliteitslabel per product, H13.5–13.6):**
- Voorwaarden: volledige productinformatie, volledige documentatie, controle/goedkeuring door producent, alle verplichte compliance-velden ingevuld, Product Quality Score boven de minimale norm.
- **Vastgesteld besluit:** er wordt **geen vaste minimale score** (bijv. 90%) in de Blueprint of dit document vastgelegd. Verified™ wordt toegekend wanneer een product voldoet aan de **door EuropMade vastgestelde kwaliteitscriteria** — de minimale Product Quality Score hiervoor is een **configureerbare instelling**, beheerd door de Administrator (zie ook H14.10, waar >90% uitsluitend als platformbreed *gemiddelde* streefcijfer wordt genoemd, niet als vaste per-product-drempel voor Verified™ — dat blijft een bewust gescheiden, instelbaar begrip). Elke wijziging van deze drempelwaarde wordt gelogd (audittrail, H13.11) en direct doorgevoerd in de Verified™-voortgangsindicator die de producent ziet (sectie 5.3).
- Proces: nieuw product → controle in Product Cloud → AI-validatie → controle producent → compliancecontrole → Verified™-status → **periodieke hercontrole** (frequentie niet gespecificeerd in Blueprint — **voorstel:** elke 6 maanden, of direct getriggerd door een Product Health-waarschuwing zoals een verlopen certificaat).
- Verified™ zegt nadrukkelijk **niets over productkwaliteit t.o.v. andere producten** — uitsluitend dat de informatie gecontroleerd en actueel is (H13.5). Dit onderscheid moet consistent worden gecommuniceerd in de UX (zie sectie 5).
- Productstatus-levenscyclus (H7.9), zichtbaar als statusbadge in zowel Partnerdashboard als Admin: `Retailer Created → Concept gecontroleerd → Actief → Verified™ → Uitlopend → Niet meer leverbaar → Gearchiveerd`.

---

## 2. Commerce Cloud

Alle Commerce Cloud-gegevens zijn gekoppeld aan een **Offer**: één record per combinatie van (Retailer × EAN × Land/Region). Dit is het custom datamodel uit de UX-Architectuur sectie 0.2, technisch gebouwd via Medusa's module-linksysteem en Pricing-module als fundament.

### 2.1 Aanbiedingen (Offers)

- Eén Offer per retailer per EAN per land waarin die retailer actief levert.
- Basisvelden: prijs, voorraad, levertijd, verzendkosten, retourvoorwaarden, actie/korting, status (actief/inactief/gepauzeerd).
- Een retailer kan dezelfde EAN met **verschillende** prijzen/voorwaarden per land aanbieden (H8.11) — dit is geen automatische valutaomrekening, maar bewuste per-land instelling.

### 2.2 Prijzen

- Retailer bepaalt zelfstandig, **per actief land** (H8.11) — geen automatische FX-conversie vanuit één basisprijs, om marge- en marktverschillen per land te kunnen beheren.
- Technisch: gebruikt het standaard Medusa Pricing-patroon (prijs per regio/valuta), toegepast op het Offer-model in plaats van rechtstreeks op de Variant — een **standaard technisch patroon, toegepast op een maatwerk-entiteit** (zie UX-Architectuur sectie 0.3).
- Acties/kortingen (tijdelijke korting, bundelkorting, gratis accessoire — H8.3) worden als tijdvak-gebonden aanpassing op de basisprijs vastgelegd, zichtbaar met begin-/einddatum in het retailerdashboard.

### 2.3 Voorraad

- Realtime, optioneel per magazijn (Multi Warehouse, H8.6).
- Synchronisatie via handmatige invoer, CSV-import, API, ERP/PIM-koppeling of connectors (Channable, ChannelEngine).
- Bij een order over meerdere magazijnen: de **Order Routing Engine** bepaalt het magazijn op basis van voorraadbeschikbaarheid, levertijd, verzendkosten en een handmatig ingestelde prioriteit (H8.6) — voor de MVP eenvoudige, transparante bedrijfsregels, **geen AI-optimalisatie** (die volgt pas in een latere fase, H15.7).
- UX-consequentie: de klant ziet nooit "welk magazijn", alleen het resultaat (levertijd/verzendkosten); de retailer ziet in zijn dashboard wél per magazijn de voorraadstand.

### 2.4 Levertijden

- Retailer kiest per Offer een levertijd-categorie.
- **Voorstel (noodzakelijk voor een eerlijke Buy Box-vergelijking, niet expliciet in Blueprint):** levertijd wordt vastgelegd als **gestructureerde, vaste set opties** (bijv. "Morgen in huis", "2 werkdagen", "3–5 werkdagen", "Pre-order") in plaats van vrije tekst. Vrije tekst zou de Buy Box-vergelijking (sectie 3) onbetrouwbaar maken, omdat "snel" en "2 dagen" dan niet objectief te vergelijken zijn.

### 2.5 Verzendkosten

- Per land, per gewicht of orderwaarde, of gratis (H8.3) — ingesteld per Offer/land door de retailer.

### 2.6 Landen

- Retailer bepaalt zelf naar welke landen hij levert (aan/uit-toggle per land, H8.3-voorbeeld), onafhankelijk voor prijs, levertijd, verzendkosten en retourvoorwaarden per land (H8.11).
- Direct gekoppeld aan het Medusa Region-model (UX-Architectuur sectie 0.1): elk land = een Region, en een Offer is pas zichtbaar in een Region als de retailer die Region heeft geactiveerd én er een prijs voor heeft ingesteld.

### 2.7 Valuta

- Bepaald door de Region (Medusa-standaard), gekoppeld aan het land waarin de klant browst — geen aparte valutakeuze los van land/Region, om verwarring (prijs tonen in een valuta waar niet in geleverd wordt) te voorkomen.

### 2.8 Retourvoorwaarden

- Per Offer/land: gratis retour, retourkosten, of verlengde termijn (H8.3).
- Retourproces zelf loopt platformbreed via EuropMade (H8.9, H10.9), maar de **voorwaarden** (wie betaalt, hoe lang) zijn Commerce Cloud-data van de retailer.

---

## 3. Buy Box — volledige beslislogica

### 3.0 Ontwerpprincipe: de Buy Box dient altijd het belang van de klant

Dit principe is leidend boven alle onderstaande regels en wordt hier expliciet vastgelegd als toetssteen voor iedere toekomstige wijziging aan de Buy Box-logica:

- **EuropMade verkoopt geen eigen producten** (H5.12) — er bestaat dus per definitie geen scenario waarin de Buy Box een "eigen" aanbieding zou kunnen bevoordelen.
- **Advertenties hebben geen invloed op de Buy Box** — het bannerplatform (H14.8) en eventuele toekomstige Sponsored Products (sectie 3.5) zijn en blijven volledig gescheiden van de Buy Box-berekening.
- **Commissies hebben geen invloed op de Buy Box** — de hoogte van de commissie die een retailer aan EuropMade afdraagt, of het totale omzetvolume van een retailer, telt in geen enkele vorm mee in de score.
- **De Buy Box wordt uitsluitend bepaald op basis van de beste totale aanbieding voor de klant** — samengesteld uit de factoren in 3.1–3.2, nooit uit platformbelangen.

Dit principe is direct getoetst tegen H8.5 ("EuropMade bepaalt niet welke retailer 'wint'... transparant algoritme") en wordt in sectie 4 herbevestigd als een recht dat zelfs de Administrator niet buiten deze kaders mag configureren.

### 3.1 Hoe wordt de standaardaanbieder gekozen

De Buy Box wordt berekend **per combinatie van Variant/EAN × Land (Region)** — niet per product als geheel, omdat aanbieders per land verschillen (2.6). Een Duitse bezoeker kan dus een andere Buy Box-winnaar zien dan een Nederlandse bezoeker, voor exact dezelfde productvariant.

De Blueprint (H8.5) noemt de criteria maar legt geen exacte weging vast ("de exacte weging wordt openbaar beschreven"). **Vastgesteld besluit:** er worden **geen vaste percentages** in de Blueprint of dit document vastgelegd. In plaats daarvan wordt de relatieve **prioriteit** van de factoren hier vastgelegd, terwijl de exacte weging een **configureerbare instelling** wordt binnen de Administrator-omgeving (sectie 4, "Buy Box-logica/wegingsfactoren wijzigen").

| Factor | Relatieve prioriteit | Toelichting |
|---|---|---|
| Prijs (incl. verzendkosten, totaalprijs) | Hoogste prioriteit | Totale prijs die de klant daadwerkelijk betaalt, niet alleen de productprijs |
| Levertijd | Hoog | Gestructureerde categorie (2.4), sneller scoort hoger |
| Klantwaardering (verkopersreview-score) | Hoog | Uitsluitend de verkopersreview (H10.10) — nooit de productreview, want die zegt niets over déze specifieke aanbieder |
| Voorraadbeschikbaarheid | Middel | Op voorraad scoort hoger dan lage voorraad; niet-op-voorraad sluit direct uit (zie 3.4) |
| Betrouwbaarheid/Performance Score | Middel-laag | Uit H8.10: annuleringen, retourpercentage, reactiesnelheid, geschillen |
| Retourprestaties | Laagste prioriteit | Afhandelsnelheid en -kwaliteit van retouren |

**Technische en UX-consequentie:** de exacte percentages worden opgeslagen als een instelbare parameter in de Admin-omgeving (H8.5: "de exacte weging wordt openbaar beschreven, zodat partners weten waarop zij kunnen sturen" — dat blijft dus gelden voor de *uitkomst* van de instelling, niet voor een vast getal in dit document). Elke wijziging van de weging door een Administrator wordt gelogd (audittrail, H13.11) en de **actuele** weging wordt altijd openbaar en actueel gepubliceerd richting partners, zowel in documentatie als real-time zichtbaar via een Buy Box-positie-indicator in het retailerdashboard (zie sectie 5.2) — die indicator toont dus altijd de op dát moment geldende configuratie, niet een hardgecodeerde aanname.

### 3.2 Factoren die meetellen

- Totaalprijs (product + verzendkosten) voor de klant, in het land van de bezoeker.
- Levertijd (gestructureerde categorie).
- Verkopersreview-score (levering, verpakking, communicatie, service — H10.10).
- Voorraadbeschikbaarheid.
- Performance Score van de retailer (H8.10: annuleringen, retourpercentage, reactiesnelheid, klanttevredenheid, geschillen).
- Retourprestaties (afhandelsnelheid, percentage afgewezen retouren).

### 3.3 Factoren die nooit mogen meetellen

Dit is expliciet vastgelegd als vertrouwensprincipe (H8.5: "EuropMade krijgt geen verborgen voorkeuren... EuropMade bepaalt niet welke retailer 'wint'") en volgt rechtstreeks uit het ontwerpprincipe in 3.0. Concreet uitgesloten:

- **Betaalde advertenties of Sponsored-status** — een Sponsored Product mag nooit de Buy Box-positie beïnvloeden (zie 3.5).
- **Omzetvolume of commissie-inkomsten die een retailer bij EuropMade genereert** — grote retailers krijgen geen voorkeurspositie enkel om hun omvang.
- **Persoonlijke of commerciële relaties tussen EuropMade en een retailer.**
- **Of EuropMade zelf ooit producten verkoopt** — is uitgesloten per definitie (H5.12: EuropMade verkoopt nooit zelf producten), dus dit scenario bestaat niet.
- **Willekeur of handmatige override door een Administrator zonder vastgelegde, gedocumenteerde reden** — iedere handmatige ingreep in een Buy Box-uitkomst (bijv. bij fraudevermoeden) moet gelogd worden in de audittrail (H13.11).

### 3.4 Wanneer krijgt een andere aanbieder de Buy Box

De Buy Box wordt **realtime herberekend**, niet periodiek. Triggers voor een wisseling:

- Huidige winnaar raakt **niet op voorraad** → automatische uitsluiting, eerstvolgende hoogst scorende aanbieder met voorraad wint.
- Een andere aanbieder **verlaagt zijn prijs** of **verbetert zijn levertijd** waardoor zijn score de huidige winnaar overtreft.
- De huidige winnaar **verhoogt zijn prijs**, verlaagt beschikbaarheid, of zijn Performance Score daalt (bijv. na een reeks late leveringen).
- Een retailer wordt **geschorst** door de Administrator (bijv. wegens geschillen of non-compliance) → direct uitgesloten van iedere Buy Box tot heractivatie.
- Een retailer **deactiveert** een land of de Offer zelf → direct uitgesloten voor dat land.

### 3.5 Advertenties en Sponsored Products versus de Buy Box

**Belangrijke constatering vooraf:** de Blueprint beschrijft in H5.6, H9.10 en H14.8–14.9 uitsluitend een **bannerplatform** (vaste posities: Hero Banner, Homepage Sliders, categorie-Sliders, verkocht per land/positie/week). Een apart concept **"Sponsored Products"** — betaalde promotie van individuele productvermeldingen binnen zoekresultaten/categorieën — komt in de Blueprint **niet voor**. Omdat de opdracht vraagt dit expliciet uit te werken, volgt hieronder een voorstel dat strikt in lijn is met het Buy Box-vertrouwensprincipe (H8.5) — dit moet als **nieuw besluit** worden bevestigd vóór het wordt meegenomen in wireframes of MVP-scope.

**Voorgestelde regels, indien Sponsored Products in een latere fase wordt toegevoegd:**

1. **Sponsored Products beïnvloeden nooit de Buy Box-winnaar op de productpagina.** De Buy Box blijft altijd uitsluitend gebaseerd op de criteria uit 3.1–3.2.
2. Sponsored Products zijn uitsluitend een **plaatsingsmechanisme binnen zoekresultaten en categorieoverzichten** (extra zichtbaarheid tussen organische resultaten), nooit een wijziging van wélke aanbieder op een productpagina wint.
3. Iedere Sponsored-plaatsing wordt **altijd duidelijk gelabeld** ("Gesponsord"/"Advertentie"), conform het bestaande uitgangspunt dat advertenties altijd herkenbaar zijn (H14.8).
4. Sponsored Products volgen dezelfde eerlijkheidsregel als het bannerplatform: geen voorkeur voor "eigen" producten (want die bestaan niet, H5.12), gelijke toegang voor alle partners, zelfstandig boekbaar.
5. Net als banneradvertenties (H5.8) zou een deel van de opbrengsten uit Sponsored Products in dezelfde herinvesteringslogica passen — dit is echter een uitbreiding van het verdienmodel uit H5.6 en dient apart in het financieel model te worden opgenomen, niet stilzwijgend aan de MVP-scope toegevoegd.

**Vastgesteld besluit:** Sponsored Products wordt **voorbereid in de architectuur** (bovenstaande regels 1–5 gelden als toekomstig kader, zodat het datamodel en de scheiding met de Buy Box er al rekening mee houden), maar maakt **geen onderdeel uit van de MVP-functionaliteit**. De MVP gebruikt uitsluitend het bannerplatform zoals beschreven in de Blueprint (H14.8–14.9: vaste posities per land/categorie/week). Dit is consistent met het vastgestelde verdienmodel (H5.6) en de Fase 1-scope (H15.7), en met de Product Cloud/Commerce Cloud-scheiding die al in de UX-Architectuur is vastgelegd (Advertenties als apart, van de Buy Box losstaand dashboardonderdeel).

### 3.6 Gelijkspel-scenario (meerdere aanbieders scoren exact gelijk)

Niet beschreven in de Blueprint — **vastgesteld besluit**, volgorde:

1. **Eerste tiebreaker:** hoogste Performance Score (H8.10) — een objectieve, reeds bestaande betrouwbaarheidsmaatstaf.
2. **Tweede tiebreaker:** langste positieve prestaties op EuropMade (bewezen trackrecord, niet enkel kale anciënniteit) — beloont partners met een aantoonbaar goede staat van dienst zonder nieuwe subjectieve criteria te introduceren.
3. **Derde tiebreaker: willekeurige eerlijke rotatie** — de Buy Box wisselt op basis van een eerlijk rotatiemechanisme tussen de exact gelijk scorende aanbieders, zodat geen enkele aanbieder structureel wordt bevoordeeld of benadeeld. Dit sluit aan bij het fundamentele eerlijkheidsprincipe van H8.5 en het ontwerpprincipe in 3.0, en voorkomt willekeurige bevoordeling van bijv. de retailer die toevallig als eerste is aangemaakt.
4. **UX-weergave bij gelijkspel:** voor de klant blijft dit onzichtbaar — er is altijd precies één Buy Box-winnaar zichtbaar; de rotatielogica speelt zich volledig server-side af.

---

## 4. Gebruikersrollen — rechten binnen Product Cloud & Commerce Cloud

| Recht | Producent | Merkhouder | Retailer | Distributeur | Administrator |
|---|---|---|---|---|---|
| Officiële productinformatie aanmaken/bewerken | ✅ | ✅ (indien niet zelf producerend) | ❌ (behalve Retailer Created) | ❌ (behalve gedelegeerd, post-MVP) | ✅ (uitsluitend bij moderatie/escalatie) |
| Productwijziging voorstellen | ✅ (eigen product) | ✅ (eigen product) | ✅ | ✅ | — |
| Wijzigingsvoorstellen beoordelen | ✅ | ✅ | ❌ | ❌ | ✅ (bij escalatie) |
| Product claimen (Retailer Created) | ✅ | ✅ | ❌ | ❌ | ✅ (bij geschil, herbeoordeling) |
| Verified™ aanvragen | ✅ | ✅ | ❌ | ❌ | — |
| Compliance-velden beheren | ✅ | ✅ | ❌ | ❌ | ✅ (alleen inzage/monitoring) |
| Eigen Offer aanmaken/bewerken (prijs/voorraad/levertijd/verzending/retour) | ✅ (indien ook verkoper) | ✅ (indien ook verkoper) | ✅ | ✅ | ❌ (verkoopt zelf nooit, H5.12) |
| Andermans Offers inzien | ❌ (alleen samengevat op productpagina, zoals elke bezoeker) | ❌ | ❌ (alleen samengevat, zoals elke bezoeker) | ❌ | ✅ (volledig, t.b.v. moderatie/geschillen) |
| Buy Box-positie/simulatie inzien (eigen Offer) | n.v.t. | n.v.t. | ✅ | ✅ | ✅ (alle Offers) |
| Retailer/producent schorsen | ❌ | ❌ | ❌ | ❌ | ✅ |
| Buy Box-wegingsfactoren configureren (binnen de vastgestelde factoren/prioriteit uit 3.1) | ❌ | ❌ | ❌ | ❌ | ✅ (met verplichte publicatie richting partners, H8.5, en gebonden aan het ontwerpprincipe uit 3.0 — advertenties/commissies/eigen belang mogen nooit als factor worden toegevoegd) |
| Product Quality Score-drempel voor Verified™ instellen | ❌ | ❌ | ❌ | ❌ | ✅ (gelogd in audittrail) |

---

## 5. UX — volledige gebruikerservaring

### 5.1 Wat ziet de klant

**Op de productpagina (H10.6), in volgorde van verschijnen:**

1. **Direct zichtbaar bij laden:** productinformatie (titel, hoofdfoto, samenvatting), Verified™-badge indien van toepassing, en de **Buy Box** — bovenaan, met de winnende aanbieder al vooringevuld in "In winkelwagen" (prijs, levertijd, korte betrouwbaarheidsindicatie).
2. **Direct daaronder, uitklapbaar/zichtbaar zonder extra klik op desktop, als los tabblad op mobiel:** volledige lijst "Alle aanbieders" (H10.6-tabel: aanbieder, prijs, levertijd, beoordeling) zodat de klant zelf een andere aanbieder kan kiezen — dit gebeurt **niet pas na een klik op een verborgen link** (best practice, voorkomt het "verstopte alternatieven"-effect van sommige bestaande marketplaces).
3. **Specificaties, downloads, reviews (product/verkoper gescheiden), gerelateerde producten** volgen daaronder, ongewijzigd t.o.v. H10.6.
4. **Regio-afhankelijkheid:** prijs, beschikbare aanbieders en levertijden passen zich direct aan op het land dat de klant heeft gekozen (Region, UX-Architectuur sectie 4.4) — geen aparte stap nodig.
5. **Wat de klant nooit ziet:** magazijnkeuze, Performance Score-cijfers van retailers, Product Quality Score, interne Buy Box-scoreberekening — dit blijft achter de schermen (H8.10: "deze statistieken blijven intern").

### 5.2 Wat de retailer ziet

**In het Commerce Cloud-gedeelte van het Partnerdashboard (Producten → Productdetail):**

1. Zijn eigen Offer-gegevens (prijs, voorraad, levertijd, verzendkosten, retourvoorwaarden) — volledig bewerkbaar, direct actief na opslaan.
2. **Buy Box-positie-indicator (voorstel, direct volgend uit H8.5 "partners weten waarop zij kunnen sturen"):** een duidelijk zichtbaar label bij elk eigen aanbod: *"Jij bent de Buy Box-winnaar"* of *"Je staat op positie 3 van 5 — een lagere prijs of snellere levertijd kan je positie verbeteren."* Geen exacte concurrentieprijzen van andere retailers (dat zou oneerlijke prijsafstemming faciliteren), wel een **richtinggevende score-uitleg** per factor (bijv. "Prijs: gemiddeld — Levertijd: sterk — Voorraad: sterk").
3. Productinformatie-gedeelte: alleen-lezen tenzij Retailer Created (dan bewerkbaar), met een duidelijk "Voorstel indienen"-knop op elk niet-bewerkbaar veld.
4. Status van eerder ingediende wijzigingsvoorstellen (in behandeling/goedgekeurd/afgewezen, met reden).

### 5.3 Wat de producent ziet

**In het Product Cloud-gedeelte van het Partnerdashboard:**

1. Volledig bewerkbare productinformatie voor zijn eigen producten.
2. **Nooit** de commerciële gegevens (prijzen/voorraad) van individuele retailers die zijn product verkopen — wel een **geaggregeerd** overzicht ("12 retailers actief, prijsrange €99–€119") zodat de producent inzicht heeft zonder dat Product Cloud en Commerce Cloud vermengd raken (bewaakt de scheiding uit H5.5/H8.2).
3. Inbox met wijzigingsvoorstellen van retailers (AI-voorbeoordeeld, H9.7), met één-klik goedkeuren/afwijzen/aanpassen.
4. Product Quality Score, Product Health Score en Compliance-status, met concrete verbeterpunten.
5. Verified™-status en -voortgang (welke voorwaarden nog ontbreken, sectie 1.10).
6. Meldingen over niet-geclaimde producten van zijn merk (claim-suggesties, sectie 1.6).

### 5.4 Wanneer verschijnt welke informatie — samenvattend tijdlijnoverzicht

| Moment | Klant ziet | Retailer ziet | Producent ziet |
|---|---|---|---|
| Product bestaat nog niet | — | "Product aanmaken"-optie bij EAN-zoeken zonder resultaat | — |
| Retailer maakt product aan (Retailer Created) | Product zichtbaar zodra status "Concept gecontroleerd" of hoger | Volledige beheerrechten (tijdelijk) | Melding "niet-geclaimd product van jouw merk" (indien merknaam matcht) |
| Producent claimt product | Geen zichtbare wijziging (product blijft gewoon zichtbaar) | Notificatie + rechten wijzigen naar alleen-commercieel | Volledige productrechten, claim-bevestiging |
| Retailer voegt Offer toe | Nieuwe aanbieder verschijnt direct in Buy Box-vergelijking (na Buy Box-herberekening) | Eigen Offer + Buy Box-positie-indicator | Geaggregeerd aanbiedersaantal +1 |
| Product bereikt Quality Score-drempel | Verified™-badge verschijnt op productpagina (na producentgoedkeuring) | — | Verified™-aanvraagoptie wordt actief |
| Retailer wordt geschorst | Aanbieder verdwijnt direct uit Buy Box/aanbiederslijst | Account geblokkeerd, melding met reden | Geaggregeerd aanbiedersaantal −1 |

---

## 6. MVP — Must/Should/Could Have

### 6.1 Product Cloud

| Onderdeel | Prioriteit |
|---|---|
| Productstructuur (Product/Variant/EAN, gedeelde basisinformatie) | Must Have |
| Producent-/Merkhouder-rechten (volledig beheer eigen product) | Must Have |
| Retailer-voorstelrecht + AI-review + producentgoedkeuring | Must Have |
| Retailer Created-status + tijdelijk volledig beheer | Must Have |
| Productclaim-flow (basis: claim + automatische rechtenoverdracht) | Must Have |
| Notificatie bij claim naar retailer | Should Have |
| Omzetten van openstaande voorstellen bij claim naar nieuwe producent | Should Have |
| Geschil-over-claim-flow (escalatie naar Administrator) | Could Have |
| Productversies (basis: wijzigingshistorie) | Must Have |
| Expliciete "nieuwe versie vs. nieuw product"-keuze in UI | Should Have |
| Identiteitsverificatie bij onboarding | Must Have |
| Aanvullende merk-/producentverificatie | Should Have |
| Product Quality Score | Must Have |
| Product Health Score | Should Have |
| Verified™ aanvragen en tonen | Should Have |
| Automatische periodieke hercontrole Verified™ | Could Have |
| Meerdere EAN's per variant (landspecifiek) | Should Have |

### 6.2 Commerce Cloud

| Onderdeel | Prioriteit |
|---|---|
| Offer-model (prijs/voorraad/levertijd/verzending/retour per land) | Must Have |
| Prijs per land, geen automatische FX-conversie | Must Have |
| Gestructureerde levertijd-categorieën | Must Have |
| Voorraadbeheer (basis, single warehouse) | Must Have |
| Multi-warehouse + Order Routing Engine (eenvoudige regels) | Should Have |
| AI-geoptimaliseerde Order Routing | Could Have (expliciet post-MVP, H15.7) |
| Land-activatie per retailer (aan/uit) | Must Have |
| Acties/kortingen (tijdvak-gebonden) | Should Have |
| Retourvoorwaarden per land | Must Have |

### 6.3 Buy Box

| Onderdeel | Prioriteit |
|---|---|
| Basis-scoreberekening (prijs, levertijd, review, voorraad — vaste factoren, configureerbare weging) | Must Have |
| Volledige factorset incl. Performance Score en retourprestaties | Should Have |
| Configuratiescherm voor Administrator (wegingsfactoren instellen) | Should Have |
| Realtime herberekening bij voorraad/prijswijziging | Must Have |
| Uitsluiting bij geschorste retailer | Must Have |
| Tiebreaker-logica (Performance Score → langste positieve prestaties → willekeurige eerlijke rotatie) | Should Have |
| Buy Box-positie-indicator in retailerdashboard | Should Have |
| Sponsored Products (architectuur voorbereid, géén onderdeel van MVP-functionaliteit) | **Buiten MVP-scope** — voorbereid in datamodel/architectuur, niet gebouwd; MVP gebruikt uitsluitend het bannerplatform (H14.8–14.9) |
| Handmatige Administrator-override met verplichte logging | Could Have |

---

## 7. Controle tegen Blueprint en Next.js + Medusa-architectuur

**Aansluiting op de Blueprint:** alle kernonderdelen zijn direct herleidbaar naar H5–H9, H11 en H13, met bronverwijzing bij iedere paragraaf hierboven. De vier beslispunten die niet letterlijk in de Blueprint stonden, zijn nu **definitief vastgesteld**:

1. **Buy Box-weging** (sectie 3.1) — geen vaste percentages; uitsluitend factoren en hun relatieve prioriteit zijn vastgelegd, de exacte weging is een configureerbare instelling binnen de Administrator-omgeving.
2. **Verified™-drempelwaarde** (sectie 1.10) — geen vaste minimale score; toekenning volgt de door EuropMade vastgestelde kwaliteitscriteria, met een door de Administrator configureerbare minimale Product Quality Score.
3. **Sponsored Products** (sectie 3.5) — voorbereid in de architectuur/het datamodel, geen onderdeel van de MVP-functionaliteit; de MVP gebruikt uitsluitend het bannerplatform.
4. **Tiebreaker-volgorde** (sectie 3.6) — Performance Score → langste positieve prestaties → willekeurige eerlijke rotatie.

Daarnaast is het **ontwerpprincipe "de Buy Box dient altijd het belang van de klant"** vastgelegd in een nieuwe sectie 3.0, met de vier expliciete waarborgen (geen eigen producten, geen invloed van advertenties, geen invloed van commissies, uitsluitend de beste totale aanbieding voor de klant) als toetssteen voor elke toekomstige wijziging aan de Buy Box-configuratie — inclusief een expliciete begrenzing van de Administrator-configuratierechten in de rollenmatrix (sectie 4).

**Aansluiting op Next.js + Medusa:**

- Productstructuur bouwt voort op Medusa's Product/Variant-module (standaard), met EAN- en Offer-lagen als custom uitbreidingen via module-links — consistent met het principe "standard where possible, custom where it creates competitive advantage" (UX-Architectuur sectie 0).
- Prijzen per Offer/Region hergebruiken het standaard Medusa Pricing-patroon, toegepast op het maatwerk Offer-model — geen noodzaak om een volledig nieuw prijssysteem te bouwen.
- De Buy Box-berekening en checkout-ordersplitsing (sectie 3, en UX-Architectuur sectie 0.2) blijven het grootste technische aandachtspunt en bevestigen waarom dit als **eerste technische spike** moet worden gevalideerd vóór de wireframes (UX-Architectuur, voorstel 9) — dit document maakt nu concreet wélke scoreberekening en welke tiebreaker-logica in die spike getest moet worden.
- Region-koppeling (land = valuta + beschikbare Offers) sluit direct aan bij sectie 2.6–2.7 hierboven en bevestigt de eerdere aanname in de UX-Architectuur (sectie 4.4).

---

## Status: definitief

Alle vier beslispunten zijn vastgesteld (sectie 3.1, 1.10, 3.5, 3.6), inclusief het aanvullende ontwerpprincipe "de Buy Box dient altijd het belang van de klant" (sectie 3.0). Dit document vormt hiermee, samen met de UX-Architectuur (Stap 4) en de technische uitgangspunten (Next.js + Medusa), het vastgestelde functionele fundament voor de Product Cloud, Commerce Cloud en Buy Box.

**Volgende stap: wireframes**, te beginnen bij de schermen die in de UX-Architectuur (sectie 5.5) als hoogste prioriteit zijn gemarkeerd: de productpagina met Buy Box, de checkout met order-splitsing per aanbieder, de Retailer Created/claim-flow, het Advertentiebeheer en het Compliance/Verified™-dashboard.
