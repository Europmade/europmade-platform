# Category CMS — ontwerp- en functionele referentie

**Status:** Leidend voor iedere volgende Category CMS-opdracht. Eerst dit document lezen.  
**Datum:** 2026-11-09

## Welk bestand waarvoor leidend is

Alle bestanden staan in deze map. Er is geen tweede CMS.

| Bestand | Rol |
|---|---|
| Dit document | Functionele en visuele eisen van de categoriepagina. |
| [EuropMade categoriepagina's opzet Claude.pdf](./EuropMade%20categoriepagina%27s%20opzet%20Claude.pdf) | Bron van de 21 CMS-blokken en hun diepte per niveau. |
| [EuropMade-Huishouden-Inbouwapparatuur-Vaatwassers-V11.png](./EuropMade-Huishouden-Inbouwapparatuur-Vaatwassers-V11.png) | Leidende paginacompositie voor level 1, 2 en 3. |
| [EuropMade-Huishouden-Inbouwapparatuur-Vaatwassers-V11.pdf](./EuropMade-Huishouden-Inbouwapparatuur-Vaatwassers-V11.pdf) | Aanvullende uitwerking van dezelfde V11-compositie. De PNG blijft de beeldmaat voor de drie kolommen. |
| [EuropMade-Category-Ecosystem-Mockup-V10.pdf](./EuropMade-Category-Ecosystem-Mockup-V10.pdf) | Aanvullende visuele referentie voor het categorie-ecosysteem. Wijzigt de V11-volgorde en de 21 blokken niet. |
| [Hoofdpagina screenshot.png](./Hoofdpagina%20screenshot.png) | Alleen huisstijl: header, navigatie, logo, typografie, navy, groen en afgeronde kaarten. Geen categorie-indeling. |
| [europmade-category-intelligence-masterplan.md](../europmade-category-intelligence-masterplan.md) | Doel en architectuur van automatische content en goedkeuring. |
| Bestaande ADR’s en de werkende Category CMS V2 | Architectuur, datamodel en businessregels. |

De V10- en V11-PDF’s zijn aanvullende visuele referenties. Ze vervangen de Claude-PDF, de V11-PNG en de ADR’s niet.

De drie kolommen in V11 zijn drie verschillende paginatypen. Ze krijgen niet dezelfde pagina met andere teksten.

De gekleurde labels boven de kolommen (“Level 1 — Hoofdcategorie”) horen bij het ontwerpblad, niet bij de live pagina. De pagina begint bij de EuropMade-header.

## Overkoepelende doelstelling

EuropMade moet alle categoriepagina’s automatisch kunnen opbouwen en actueel houden op basis van Product Cloud, Commerce Cloud en goedgekeurde redactionele content.

De AI maakt complete voorstellen voor alle relevante CMS-blokken. De beheerder bekijkt die voorstellen in de Admin Studio, past ze aan, keurt ze goed of wijst ze af. Nieuwe en gewijzigde producten worden automatisch verwerkt. Een relevante wijziging leidt tot herberekening of tot een nieuw AI-voorstel. Niets wordt gepubliceerd zonder expliciete menselijke goedkeuring.

Het doelkader voor die keten staat in [europmade-category-intelligence-masterplan.md](../europmade-category-intelligence-masterplan.md). Dat document is leidend voor het totale doel en de architectuur. Dit referentiedocument blijft leidend voor de functionele en visuele eisen van de categoriepagina. De bestaande afspraken hieronder blijven gelden.

## Paginatypen

| | Level 1 | Level 2 | Level 3 |
|---|---|---|---|
| Voorbeeld | Huishouden | Inbouwapparatuur | Vaatwassers |
| Doel | Ontdekken en inspireren | Oriënteren en kiezen | Vergelijken en kopen |
| Profiel | `level_1` | `level_2` | `level_3` |

### Level 1 — Huishouden

1. Bestaande EuropMade-header en navigatie.
2. Broodkruimels: Home / Huishouden.
3. Hero links: titel, intro, twee knoppen. Rechts een afbeelding.
4. Vier USP’s naast elkaar.
5. Advertentiebanner over de volle breedte.
6. Subcategorieën als tegels, vier op een rij.
7. Productkaarten.
8. Merkenrij.
9. Groene band “Waarom EuropMade?”.
10. Bestaande footer.

Geen filters en geen volledige listing.

### Level 2 — Inbouwapparatuur

1. Header en broodkruimels Home / Huishouden / Inbouwapparatuur.
2. Hero met titel, intro, afbeelding en twee knoppen.
3. Vier USP’s.
4. Advertentiebanner.
5. Productgroepen als tegels.
6. Keuzehulp: tekst links, knop rechts.
7. Drie advieskaarten.
8. Merkenrij.
9. Informatieve sectie “Goed om te weten”.
10. Footer.

Geen filters en geen volledige listing.

### Level 3 — Vaatwassers

1. Header en broodkruimels tot en met Vaatwassers.
2. Hero met titel, intro, afbeelding en twee knoppen.
3. Vier productspecifieke USP’s.
4. Advertentiebanner.
5. Filters links, productgrid rechts.
6. Keuzehulp.
7. Vergelijkingstabel.
8. Koopgids.
9. Merkenrij.
10. Onderaan een afgebakende toekomstnotitie voor sponsoring. Geen sponsorlogica.
11. Footer.

Dit is het enige niveau met filters en een productgrid.

## Blokken

De verplichte V2-volgorde blijft. Optionele blokken vullen de onderdelen die V11 wel toont en de allowlist niet verplicht stelt.

| V11-onderdeel | Blok | Verplicht |
|---|---|---|
| Hero | `hero` | alle profielen |
| Vier USP’s | `usp_bar` | alle profielen |
| Advertentie | `ad_slot` | optioneel, alle profielen |
| Subcategorieën | `subcategory_tiles` | level 1 |
| Productgroepen | `product_group_tiles` | level 2 |
| Producten | `product_carousel` op level 1, `product_grid` op level 3 | volgens profiel |
| Merken | `brand_overview` | verplicht op level 1, optioneel op level 2 en 3 |
| Waarom EuropMade | `why_europmade` | level 1 |
| Keuzehulp | `choice_assistant_cta` | verplicht op level 2, optioneel op level 3 |
| Advies | `advice_compare` | level 2 |
| Filters + grid | `filters` en `product_grid` | level 3, naast elkaar wanneer ze op elkaar volgen |
| Vergelijking | `product_comparison` | level 3 |
| Koopgids | `buying_guide` | level 3 |
| Goed om te weten | `intro` of `seo_content` | optioneel |

Level 3 toont in V11 een keuzehulp. Dat blok was daar niet toegestaan. Het staat nu op de optionele lijst van level 3. Bestaande documenten zonder dat blok blijven geldig. Er is geen migratie.

Een bloktype komt één keer voor. Dupliceren zou de bestaande validatie breken en gebeurt niet. Optionele blokken kunnen worden toegevoegd, verborgen en van plaats gewisseld. Verplichte blokken blijven in de allowlist-volgorde.

Header en footer zijn `PublicStorefrontChrome`, geen CMS-blok.

## Vormgeving

Optioneel veld `presentation` op een blok, in de bestaande JSON van draft en published:

- `background_color`, `text_color`
- `align`: links of midden
- `columns`: 2, 3 of 4
- `image_position`: links of rechts
- `padding`: compact, normaal, ruim
- `radius`: recht, afgerond, extra afgerond
- `button_style`: gevuld of omlijnd

Hero heeft daarnaast optionele `primary_cta_label`, `primary_cta_href`, `secondary_cta_label` en `secondary_cta_href`.

Ontbrekende velden gebruiken de V11-standaard: tekst links, afbeelding rechts, groene gevulde knop, vier kolommen, navy `#16315c`, groen `#1f8a4c`. Bestaande drafts zonder deze velden blijven geldig. Weglaten van de velden bij een volgende normalisatie is de terugval. Er is geen tabelwijziging.

## Data

Producten, prijzen en merknamen komen uit Product Cloud en Commerce Cloud. Ontbreekt iets, dan toont de admin een lege toestand. De voorbeeldproducten, logo’s, prijzen en “Gemaakt in Duitsland” op V11 worden niet overgenomen. Een merkenrij toont alleen merken uit het echte aanbod, zonder verzonnen logo of herkomstzin.

Eén optioneel `ad_slot`-blok bevat nul of meer unieke posities: `below_hero`, `between_content`, `above_product_grid` en `below_product_grid`. Elke positie heeft een eigen id, naam, volgorde en bron (`campaign`, `banner` of `campaign_or_banner`). De pagina haalt betaalde campagnes uit `ad_campaign` via de bestaande live-slotsselectie en redactionele banners uit `cms_banner`. Het categoriedocument bewaart alleen de verwijzing. Een leeg of ongeldig resultaat toont niets. Oudere documenten met alleen `slot_id` blijven geldig en worden niet gemigreerd. Level 2 heeft geen productraster, dus daar zijn alleen `below_hero` en `between_content` zinvol. Level 3 heeft geen tegelblok, dus daar vervalt `between_content`.

Een advieskaart (`advice_compare`) heeft een titel, korte samenvatting, uitleg, afbeelding uit de mediabibliotheek, bijschrift, alt-tekst, CTA-label en link. Een koopgids (`buying_guide`) heeft een optionele introductie, meerdere secties en de bestaande FAQ op dat blok. Een sectie heeft kop, introductie, tekst, tussenkoppen, opsommingen, afbeelding, tip, link en CTA. Het blok kan eindigen met een afsluitende CTA. Ontbrekende velden blijven geldig. Bestaande documenten worden niet herschreven.

`product_comparison` bewaart alleen product-id's en attribuutcodes, in de gekozen volgorde. Namen, afbeeldingen, prijzen en specificatiewaarden worden bij het tonen gelezen uit Product Cloud en Commerce Cloud. Een lege productselectie toont geen tabel. Eén product is een geldige kolom. Een ontbrekende specificatiewaarde blijft een streepje en wordt niet als nul behandeld. Attribuutdefinities hebben geen vergelijkingsrichting, dus de tabel markeert geen beste waarde.

`brand_overview` bewaart geen merkenlijst. De pagina telt de al geselecteerde categorieproducten per stabiele merk-id, één keer per product. De volgorde is dat aantal en daarna de naam. `max_items` en de bestaande kolommen bepalen hoeveel en hoe breed de rij is. Een logo komt uit `logo_url`. Ontbreekt het logo, dan blijft de merknaam staan zonder leeg vlak. Een link ontstaat alleen naar een bestaande gepubliceerde merkpagina met een opgeslagen slug: `/merk/{slug}`. Het land van een merkeigenaar wordt niet als productherkomst getoond. `allow_sponsored` blijft uit.

`faq` is optioneel op level 1, 2 en 3. De pagina toont de opgeslagen vragen in die volgorde als uitklapbare vragen. Een vraag zonder tekst wordt overgeslagen. Er worden geen vragen bijgemaakt. De FAQ op de koopgids blijft een apart veld van `buying_guide`.

`spec_explain` blijft optioneel op level 3. Een item toont de redactionele titel en uitleg. Bestaat de specificatiecode bij de attribuutdefinities, dan komen label, datatype, eenheid en keuzewaarden daaruit. Ontbreken productwaarden of keuzewaarden, dan blijft de uitleg staan en verschijnt er geen schaal. De Level 2-variant met nisschema is niet gebouwd. Daarvoor zijn later een mediabibliotheekafbeelding, maatregels die alleen een bestaande attribuutcode tonen, en redactionele aansluitpunten nodig. Die velden zitten nog niet op het item.

`related_products` blijft optioneel op level 3. De kaarten zijn gepubliceerde producten met een geldige aanbieding waarnaar een opgeslagen `pc_product_relation` wijst vanaf een verkoopbaar product in de categorie. Een product telt één keer. Zonder relatie blijft het blok op de storefront weg. Producten uit dezelfde categorie zijn geen vervanging. De Level 2-accessoirevariant blijft dicht zolang die relaties ontbreken.

Sponsoring wordt niet opgeslagen en niet verkocht. Level 3 toont alleen de toekomstnotitie uit V11.

## Admin

Drie kolommen, op de bestaande studio:

- Links: paginastructuur en blokvolgorde.
- Midden: dezelfde `CategoryV2Page` als de storefront, met desktop, tablet en mobiel.
- Rechts: content en vormgeving van het geselecteerde blok.

Preview en storefront importeren beide `CategoryV2Page`. De preview krijgt het conceptdocument. De storefront krijgt het gepubliceerde document, of een lege structurele V2-pagina als er nog geen V2-publicatie is. Publiceren blijft een aparte handeling. De 511 drafts worden niet overschreven.

## Bewust zichtbaar verschil met V11

- Een lege hero-, tegel-, advies- of koopgidsafbeelding gebruikt een Product Cloud-afbeelding van een product dat bij die categorie hoort. De keuze is vast: eerst een verkoopbaar product, daarna de slug. Een opgeslagen CMS-afbeelding blijft staan. Zonder geschikte afbeelding blijft het vlak leeg.
- Zonder aanbod zijn er geen productkaarten en geen merkrij.
- Zonder ingevulde USP, hero-tekst of koopgids blijft dat veld leeg in de preview, met een korte lege toestand.
- De pagina noemt geen Europese productie zonder een opgeslagen productieland.
