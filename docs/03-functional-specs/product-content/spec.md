# EuropMade — Productpagina: Product Content-sectie

**Status:** v1.1 (definitief). Gerichte, PO-geautoriseerde uitzondering op de bevriezing van de Productpagina — uitsluitend de contentarchitectuur, niets anders.
**Aanleiding:** Product Owner-review stelt vast dat de Productpagina (v1.0) wel kenmerken/badges toont, maar geen volwaardige productomschrijving — een gat voor SEO, AI Search, conversie, vertrouwen en de volledige benutting van Product Cloud.
**Nadrukkelijk ongewijzigd:** Buy Box, aanbiederstabel, Checkout, Product Cloud (het brondocument `product-cloud-commerce-cloud-buy-box/spec.md` wordt niet aangepast), Commerce Cloud. Dit document werkt uitsluitend de contentarchitectuur van de Productpagina uit.

---

## 0. Aard van deze wijziging

Dit is een bewuste, eenmalige uitzondering op de bevriezingsregel (`sprint-1a/README.md`), geautoriseerd door de Product Owner, met een aantoonbare reden: een ontbrekend onderdeel dat vijf met name genoemde doelstellingen raakt (SEO, AI Search, conversie, vertrouwen, Product Cloud-benutting). Dit is dezelfde categorie uitzondering als eerder toegepast bij de naamgevingsuniformering (Design System v1.0) en de Customer Journey Audit-correcties — een gerichte, gemotiveerde aanpassing, geen algehele heropening van de Productpagina.

---

## 1. Architectuuranalyse: hoe een professionele marketplace-productpagina is opgebouwd

Vóór het ontwerpen van de content is eerst gecontroleerd hoe de contentlaag van een productpagina bij gangbare, grote marketplaces logisch is opgebouwd. Het herkenbare, beproefde patroon bestaat uit drie lagen, elk met een eigen functie:

1. **Directe oriëntatie** (bovenaan, bij de titel): een korte introductie die in een paar zinnen bevestigt *wat* het product is en *voor wie* — vergelijkbaar met de 5-secondenregel die al voor de Homepage is vastgelegd (homepage-spec.md, sectie 0), hier toegepast op productniveau.
2. **Volledige, altijd zichtbare contentlaag** (direct in de hoofdflow van de pagina, niet achter een klik): een uitgebreide productomschrijving die het verhaal, de toepassing en de voordelen van het product vertelt. Dit is de laag die zoekmachines en AI-zoeksystemen daadwerkelijk kunnen lezen zonder interactie, en die de meeste conversiewaarde toevoegt vóórdat een bezoeker moet gaan klikken.
3. **Gestructureerde, op-aanvraag contentlaag** (tabs/accordions): specificaties, downloads, reviews — content die de meeste bezoekers niet in zijn geheel lezen, maar wel gestructureerd willen kunnen doorzoeken wanneer nodig.

**Belangrijkste architecturale les:** de volledige productomschrijving hoort **niet uitsluitend achter een tab-klik** te zitten — dat is precies de tekortkoming die de PO-review signaleerde. Tegelijk is een "Omschrijving"-tab wél gangbaar, omdat bezoekers die eenmaal in tab-navigatiemodus zitten (bijv. na het bekijken van Specificaties) een consistente manier verwachten om terug te kunnen naar de omschrijving zonder omhoog te scrollen. Beide vormen dienen daarom een verschillend doel — zie sectie 3.4 voor hoe dit zonder inhoudelijke duplicatie is opgelost.

**FAQ hoort aan het einde van de contentflow**, na de gestructureerde secties — bezoekers raadplegen dit doorgaans pas nadat ze de omschrijving en specificaties al gezien hebben en nog een laatste twijfel hebben, vlak vóór de aankoopbeslissing.

---

## 2. Bijgewerkte content-architectuur van de Productpagina

Uitsluitend de contentlaag wijzigt. Buy Box, aanbiederstabel en alle overige structuur blijven exact zoals in v1.0.

```
Header (ongewijzigd)
Breadcrumb (ongewijzigd)
┌─ Gallery (ongewijzigd) ─┬─ Productinfo-kolom ─────────────┬─ Buy Box-kolom (ongewijzigd) ─┐
│                          │ Titel (ongewijzigd)             │                                │
│                          │ Rating-regel (ongewijzigd)       │                                │
│                          │ Aanbieders-hint (ongewijzigd)    │                                │
│                          │ Badges (ongewijzigd)             │                                │
│                          │ ► KORTE INTRODUCTIE (NIEUW, 1)   │                                │
│                          │ Kenmerken (ongewijzigd)          │                                │
└──────────────────────────┴───────────────────────────────────┴────────────────────────────────┘
Aanbiederstabel "Alle aanbieders" (ongewijzigd)
► VOLLEDIGE PRODUCTOMSCHRIJVING (NIEUW, 2) — eerste contentsectie ná de aanbiederstabel
► GESCHIKT VOOR (NIEUW, 3)
Tabs: [Omschrijving (NIEUW, 4, anker) | Specificaties | Downloads | Productreviews | Verkopersreviews]
► VEELGESTELDE VRAGEN (NIEUW, 5)
Gerelateerde producten (ongewijzigd)
Footer (ongewijzigd)
```

---

## 3. Nieuwe secties — specificatie

### 3.1 Korte introductie (direct onder de titel)

| Aspect | Beschrijving |
|---|---|
| Doel | Binnen enkele seconden bevestigen wat het product is en voor wie — productequivalent van de Homepage-5-secondenregel. |
| Lengte | 50–150 woorden (vastgesteld). |
| SEO-waarde | Bevat de belangrijkste zoekwoorden vroeg in de pagina — zwaarder wegend voor rankings dan tekst verderop. |
| AI Search-waarde | Korte, feitelijke samenvatting is precies het tekstformaat dat AI-zoeksystemen (bijv. antwoord-samenvattingen) het makkelijkst extraheren. |
| CRO-waarde | Bevestigt snel de aankoopintentie vóórdat de bezoeker naar de Buy Box kijkt. |
| Vertrouwenswaarde | Kan direct verwijzen naar het Europese herkomstverhaal (zie sectie 4, Europese producenten). |
| Product Cloud-relatie | Nieuw subveld op het bestaande `omschrijving`-veld dat al in de Product Cloud-rechten van Producent/Merkhouder staat vermeld (functionele spec Product Cloud, sectie 1.2: "titel, omschrijving, specificaties..." — dit veld bestond al, het werd alleen nooit weergegeven). Geen wijziging aan het Product Cloud-datamodel zelf. |
| Bouwaard | Standaard bouwpatroon (statische tekstweergave), geen nieuw component. |

### 3.2 Volledige productomschrijving (eerste sectie ná de aanbiederstabel)

| Aspect | Beschrijving |
|---|---|
| Doel | Het volledige verhaal van het product: toepassing, voordelen, materiaal/constructie, en — waar relevant — het Europese herkomstverhaal. |
| Lengte | Geen harde limiet; richtlijn 150–400 woorden, meerdere alinea's toegestaan. |
| SEO-waarde | **Grootste tekstuele SEO-bijdrage van de hele Productpagina** — lange, unieke, relevante tekst is precies wat zoekmachines nodig hebben om een productpagina te laten ranken op long-tail zoekopdrachten (vergelijkbaar met de rol die de Homepage-sectie 9 al vervult op platformniveau, hier op productniveau). |
| AI Search-waarde | Voedt AI-samenvattingen en vraag-beantwoording ("is dit geschikt voor..."-achtige AI-antwoorden trekken bij voorkeur uit doorlopende tekst, niet uit een specificatietabel). |
| CRO-waarde | Beantwoordt "waarom dit product" vóórdat de bezoeker naar specificaties hoeft te scrollen — vermindert het aantal bezoekers dat zonder overtuiging afhaakt. |
| Vertrouwenswaarde | Ruimte voor het merkverhaal (koppelt aan Manufacturer Badge/Country of Production Badge, al aanwezig in de badge-rij) versterkt het "Made in Europe"-vertrouwen op het niveau waar de aankoopbeslissing daadwerkelijk valt. |
| Product Cloud-relatie | Zelfde bestaande `omschrijving`-veld als 3.1, nu voor het eerst **volledig** weergegeven (v1.0 toonde alleen grijze placeholder-regels, geen echte content). Geen datamodelwijziging. |
| Bouwaard | Standaard bouwpatroon, geen nieuw component (hergebruikt bestaande teksttypografie). |
| Plaatsingsmotivatie | **Direct ná de aanbiederstabel**, niet erboven — zo blijft de Buy Box/aanbiedersvergelijking het eerste dat een bezoeker met koopintentie ziet (ongewijzigd t.o.v. v1.0), terwijl de omschrijving toch vóór de tabs staat, dus zonder klik zichtbaar. |

### 3.3 Geschikt voor

| Aspect | Beschrijving |
|---|---|
| Doel | Bezoeker in staat stellen zichzelf snel te "kwalificeren" — past dit product bij mijn situatie? |
| Vorm | Korte bullet-lijst (3–6 punten), bijv. "Geschikt voor tuinen tot 800 m²", "Geschikt voor licht hellend terrein". |
| SEO-waarde | Ondersteunt long-tail zoekopdrachten van het type "robotmaaier voor [situatie]". |
| AI Search-waarde | Gestructureerde, korte beweringen zijn het meest extraheerbare tekstformaat voor AI-zoeksystemen die een directe ja/nee-achtige vraag beantwoorden ("is product X geschikt voor Y"). |
| CRO-waarde | Voorkomt verkeerde aankopen (en dus retouren) door zelfselectie vóór het afrekenen — een directe bijdrage aan een lager retourpercentage. |
| Product Cloud-relatie | **Geen nieuw datamodel** — dit is een gecureerde, klantgerichte herformulering van attributen die al in de specificatietabel staan (bijv. "werkgebied" wordt "geschikt voor tuinen tot..."), geen nieuw Product Cloud-veld. |
| Bouwaard | Standaard bouwpatroon, hergebruikt het bestaande bullet-lijstpatroon (zelfde stijl als "Kenmerken"). |

### 3.4 Tab "Omschrijving" (vóór Specificaties)

| Aspect | Beschrijving |
|---|---|
| Doel | Consistente tab-navigatie bieden voor bezoekers die al in tab-modus zitten (bijv. na Specificaties bekeken te hebben) — niet een tweede, dubbele contentblok. |
| Gedrag | **Ankerlink/scroll-naar-boven** naar de al zichtbare Productomschrijving (sectie 3.2) — geen inhoudelijke duplicatie, geen nieuw tekstblok. Dit is een bewuste architectuurbeslissing (sectie 1) om zowel "altijd zichtbaar voor SEO" als "consistent met tab-navigatie" te bedienen zonder dubbele content. |
| SEO-overweging | Voorkomt het risico van dubbele content binnen dezelfde pagina (geen twee kopieën van dezelfde tekst in de DOM). |
| Bouwaard | Standaard bouwpatroon (ankernavigatie), geen nieuw component — hergebruikt de bestaande Tabs-component (CMP-009) met een aangepast klikgedrag voor uitsluitend dit ene tabblad. |

### 3.5 Veelgestelde vragen

| Aspect | Beschrijving |
|---|---|
| Doel | Directe, expliciete beantwoording van veelvoorkomende twijfels vlak vóór de aankoopbeslissing. |
| Vorm | 4–8 vraag-antwoordparen, **altijd volledig zichtbaar** (geen inklapbare accordion) — bewuste keuze, zie toelichting. |
| Toelichting bij de vorm-keuze | Een inklapbare accordion (interactie nodig om content te zien) zou **nieuwe functionaliteit** vereisen (een nieuw Design System-component) en het risico op onvolledige indexering/extractie door zoek-/AI-systemen vergroten. Een altijd zichtbare lijst is zowel eenvoudiger te bouwen (geen nieuw component, conform "geen nieuwe functionaliteit tenzij aantoonbaar noodzakelijk") als beter voor SEO/AI Search. |
| SEO-waarde | Directe kandidaat voor FAQPage-structured data (schema.org) — een van de sterkste vormen van rich results voor productpagina's. |
| AI Search-waarde | **Hoogste AI Search-waarde van alle vijf nieuwe secties** — vraag-antwoordparen zijn het exacte formaat waarin AI-zoeksystemen en voice-assistenten content het makkelijkst hergebruiken. |
| CRO-waarde | Adresseert bekende aarzelingen (garantie, levertijd-verwachting, geschiktheid, onderhoud) rechtstreeks, vermindert supportvragen achteraf (zelfde functie als de bestaande Klantenservice/FAQ-pagina, scherm #20, nu productspecifiek). |
| Product Cloud-relatie | Vraagt een nieuw, klein contentveld (vraag-antwoordparen per product) — dit is de enige van de vijf secties die niet volledig uit bestaande Product Cloud-velden te putten is. **Aantoonbaar noodzakelijke, minimale uitbreiding**, geen architecturale wijziging: zelfde governance-model als het bestaande `omschrijving`-veld (Producent-beheerd, AI-ondersteund — functionele spec sectie 1.10). Wordt hier uitsluitend benoemd, niet uitgewerkt — het brondocument `product-cloud-commerce-cloud-buy-box/spec.md` blijft ongewijzigd, conform de opdracht. |
| Bouwaard | Standaard bouwpatroon, geen nieuw component. |

---

## 4. Controle: is de Productpagina hiermee optimaal?

| Doelstelling | Beoordeling |
|---|---|
| **SEO** | Ja. De pagina bevat nu drie tekstuele lagen (introductie, volledige omschrijving, FAQ) die vóór deze wijziging vrijwel volledig ontbraken — v1.0 had alleen korte badge-labels en een specificatietabel, geen doorlopende tekst. Dit sluit het grootste gat dat in de Customer Journey Audit al impliciet zichtbaar werd (Bevinding J4: Productpagina miste een SEO-paragraaf die de Homepage wél kreeg) — dit document lost dat gat nu inhoudelijk op. |
| **AI Search** | Ja. FAQ (vraag-antwoordformaat) en "Geschikt voor" (korte, feitelijke beweringen) zijn beide expliciet gekozen op basis van wat AI-samenvattingssystemen het beste kunnen extraheren — geen enkele nieuwe sectie hangt af van interactie (klikken/uitklappen) om zichtbaar te worden. |
| **CRO** | Ja. Elke nieuwe sectie adresseert een ander punt in de aarzeling-tot-aankoop-keten: introductie (snelle bevestiging), omschrijving (overtuiging), geschikt-voor (zelfselectie, minder retouren), FAQ (laatste-moment-twijfels) — dit dekt de volledige conversietrechter op productniveau, niet alleen het begin (Buy Box) of einde (Checkout) zoals voorheen. |
| **Europese producenten** | Ja. De volledige productomschrijving (3.2) is expliciet aangewezen als de plek waar het merkverhaal en de Europese herkomst inhoudelijk verteld kunnen worden — tot nu toe bestond dat verhaal alleen op platformniveau (Homepage sectie 9) en als badge (Country of Production), niet als productspecifiek verhaal. Dit sluit die kloof. |
| **Product Cloud** | Grotendeels ja, met één klein, expliciet benoemd openstaand punt. Introductie, omschrijving en "Geschikt voor" putten volledig uit al bestaande Product Cloud-velden/attributen (geen enkele wijziging aan het datamodel). FAQ vereist een klein, nieuw contentveld — hier alleen benoemd als noodzakelijke, toekomstige, minimale uitbreiding, niet uitgewerkt (het brondocument blijft ongewijzigd, conform de opdracht). |

---

## 5. Design System-impact

**Geen nieuwe componenten nodig.** Alle vijf secties hergebruiken bestaande typografie- en lijstpatronen (dezelfde stijl als de bestaande "Kenmerken"-sectie en Tabs-component CMP-009). Dit is een bewuste, gecontroleerde uitkomst — consistent met "geen nieuwe functionaliteit tenzij aantoonbaar noodzakelijk" — en wordt hier expliciet vastgelegd zodat het niet als omissie wordt gelezen: er was géén nieuw component nodig voor deze uitbreiding.

---

## 6. Wireframe-wijzigingen

Toegepast op alle drie de breakpoints (`01-productpagina-buybox-desktop.html`, `-tablet.html`, `-mobile.html`):

- Placeholder "summary-block" (grijze lijnen zonder echte tekst) vervangen door een echte Korte Introductie-tekst (3.1).
- Nieuwe sectie "Productomschrijving" toegevoegd direct ná de aanbiederstabel, vóór de Tabs-sectie (3.2).
- Nieuwe sectie "Geschikt voor" toegevoegd direct daarna (3.3).
- Tabs-rij uitgebreid met "Omschrijving" als eerste tab, vóór "Specificaties" (3.4).
- Nieuwe sectie "Veelgestelde vragen" toegevoegd ná de Tabs-sectie, vóór "Gerelateerde producten" (3.5).

**Expliciet ongewijzigd** (geverifieerd per bestand): Header, Breadcrumb, Gallery, Producttitel, Rating-regel, Aanbieders-hint, Badge-rij, Buy Box (volledige kolom), Aanbiederstabel (volledige structuur en inhoud), Specificaties-tabinhoud, Downloads-tab, Productreviews/Verkopersreviews-secties, Gerelateerde producten, Footer.

---

## 7. Consistentiecontrole

- **Blueprint:** H11 (Productinformatie & Databeheer) noemt "omschrijving" al expliciet als kernonderdeel van productinformatie — deze wijziging brengt de Productpagina voor het eerst in lijn met wat de Blueprint al vereiste, geen nieuwe Blueprint-eis.
- **ADR's:** geen van de vijf ADR's wordt geraakt — deze gaan over Buy Box-weging, Verified™-drempel, Sponsored Products en server-side-verwerking, stuk voor stuk buiten de contentlaag.
- **Product Cloud/Commerce Cloud-spec:** ongewijzigd, zoals opgedragen — geverifieerd dat het brondocument niet is aangeraakt.
- **Buy Box/aanbiederstabel/Checkout:** ongewijzigd, zoals opgedragen — geverifieerd per wireframe-bestand (sectie 6).

---

## Status: v1.1 (definitief) — Sprint 1A hiermee volledig afgesloten

Met de integratie van de Product Content-sectie is de Productpagina compleet voor SEO, AI Search, conversie, vertrouwen en Product Cloud-benutting. **Sprint 1A wordt hiermee definitief afgesloten**, zoals expliciet voorwaarde gesteld.
