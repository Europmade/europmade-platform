# EuropMade — Category Intelligence masterplan

**Status:** Doelkader. Geen implementatieopdracht.  
**Datum:** 2026-11-05  
**Domein:** Category CMS V2, Product Cloud, Commerce Cloud, Admin Studio, AI-voorstellen

Dit document is het centrale technische en functionele doelkader voor automatische categorieopbouw, AI-content, continue actualisering en goedkeuring. Het vervangt geen ADR en geen werkende code. Het voegt geen tweede CMS, taxonomie, mediabibliotheek, productlijst of publicatiesysteem toe.

## Documenthiërarchie

Bij iedere Category CMS-opdracht geldt deze volgorde:

1. Dit masterplan is leidend voor het totale doel en de architectuur van automatische categoriecontent.
2. [category-cms-design-and-functional-reference.md](./category-cms-reference/category-cms-design-and-functional-reference.md) is leidend voor de functionele en visuele eisen van de categoriepagina.
3. [EuropMade categoriepagina's opzet Claude.pdf](./category-cms-reference/EuropMade%20categoriepagina%27s%20opzet%20Claude.pdf) is de oorspronkelijke bron van de 21 CMS-blokken en hun diepte per niveau.
4. [EuropMade-Huishouden-Inbouwapparatuur-Vaatwassers-V11.png](./category-cms-reference/EuropMade-Huishouden-Inbouwapparatuur-Vaatwassers-V11.png) is de leidende paginacompositie voor level 1, 2 en 3.
5. [EuropMade-Huishouden-Inbouwapparatuur-Vaatwassers-V11.pdf](./category-cms-reference/EuropMade-Huishouden-Inbouwapparatuur-Vaatwassers-V11.pdf) is de aanvullende uitwerking van diezelfde compositie. De PNG blijft de beeldmaat.
6. [EuropMade-Category-Ecosystem-Mockup-V10.pdf](./category-cms-reference/EuropMade-Category-Ecosystem-Mockup-V10.pdf) is een aanvullende ecosysteemreferentie. Die wijzigt de V11-volgorde en de 21 blokken niet.
7. [Hoofdpagina screenshot.png](./category-cms-reference/Hoofdpagina%20screenshot.png) is uitsluitend de huisstijlreferentie: navy, groen, bestaande header en footer, afgeronde kaarten.
8. Bestaande ADR’s en de werkende code bepalen de architectuur en de implementatiegrenzen. Richtinggevend zijn [ADR-0036](../04-decisions/0036-ai-content-engine-offline-first.md), [ADR-0047](../04-decisions/0047-engagement-content-automation-separation.md) voor de scheiding tussen voorstel en publicatie, [Published/Draft](./category-cms-published-draft.md) en [AI Category Intelligence](./category-cms-ai-intelligence.md).

Een tegenstrijdigheid wordt gerapporteerd. Een opdracht wijkt niet zelfstandig af van een eerder goedgekeurde afspraak. Bekende spanningen staan onderaan.

## Verplichte werkwijze voor latere opdrachten

Iedere Category CMS-opdracht leest eerst dit masterplan, het referentiedocument en de bron die bij het onderdeel hoort: de Claude-PDF voor een blok, V11 voor de compositie, de homepage-screenshot alleen voor kleur en chrome.

Een implementatieopdracht noemt:

- welk onderdeel van dit masterplan wordt uitgevoerd;
- welke bestaande onderdelen worden hergebruikt;
- welke afhankelijkheden gelden;
- welke acceptatietests bewijzen dat het onderdeel werkt;
- hoe het resultaat op de volledige categoriepagina aansluit.

Geen nieuwe losse architectuur en geen alternatief CMS. Voorstellen, drafts en publicaties blijven de keten uit [AI Category Intelligence](./category-cms-ai-intelligence.md) §2.

---

## A. Ondernemingsdoel en gewenste werking

EuropMade bouwt en houdt alle categoriepagina’s actueel vanuit Product Cloud, Commerce Cloud en goedgekeurde redactionele content.

De pagina ontstaat niet als een eenmalige tekst. Productkoppelingen, specificaties, merken, relaties, prijzen en voorraad bepalen wat de bezoeker ziet. Redactionele tekst vult alleen aan waar een feit of een goedgekeurde formulering bestaat.

De AI is de assistent voor blokvoorstellen, vertalingen, SEO en afbeeldingssuggesties uit de bestaande mediabibliotheek. Zij publiceert niet, schrijft niet naar Product Cloud en vervangt geen goedgekeurde tekst.

De beheerder is eindverantwoordelijk. In de Admin Studio bekijkt, wijzigt, keurt of wijst hij een voorstel af. Publiceren blijft een aparte, bevestigde handeling.

## B. Architectuur

Zes lagen, in deze richting:

| Laag | Rol | Bestaande plek |
|---|---|---|
| Product Cloud | Product, categorie, merk, specificatie, herkomst, productrelatie | `pc_category`, `pc_product`, `attribute_definition`, `attribute_value`, `pc_product_relation`, merkmodel |
| Commerce Cloud | Actuele prijs en voorraad, geldige aanbieding | Zelfde selectie als de storefrontlisting |
| Category Intelligence Engine | Feitenpakket, fingerprint, dekking, veroudering | `buildCategoryFactPackages`. Prijs en voorraad zitten daar nog niet in |
| AI Content & Page Builder | Voorstel per blok en per taal, met bronpaden | Nog niet gebouwd. Patroon: providerregistry uit ADR-0036 |
| Category CMS V2 | Het paginadocument: profiel, blokken, volgorde, presentatie | `cms_category.draft_document` en `published_document` |
| Admin Studio | Structuur, preview, instellingen, later voorstellen | Bestaande drie kolommen en `CategoryV2Page` |

Draft en Published blijven gescheiden. Revisies blijven `cms_category_revision`. De storefront leest alleen het gepubliceerde document, of een lege structurele V2-pagina als er nog geen V2-publicatie is. Een voorstel is geen draft. Een draft is geen publicatie.

ADR-0047 scheidt content en automation voor marketingcommunicatie (template, variant, version). Die tabellen worden niet de categoriepagina. Wel geldt hetzelfde principe: een AI-voorstel is pas bruikbaar nadat een mens het heeft goedgekeurd.

Header en footer blijven `PublicStorefrontChrome`. `ad_slot` blijft het bestaande advertentieblok naast de 21 Claude-blokken.

## C. Continue actualisering

Wijzigingen worden gedetecteerd. Zij schrijven niet vanzelf naar een draft of naar live.

| Gebeurtenis | Wat wordt herberekend | Wat de AI doet |
|---|---|---|
| Nieuw gepubliceerd product in de categorie of een nakomeling | Listing, filters, merken, tellingen, vergelijkbare specificaties | Nieuw voorstel alleen voor blokken waarvan de feitenfingerprint veranderde |
| Gewijzigde productfeiten: specificatie, merk, herkomst, relatie, publicatiestatus | Hetzelfde, beperkt tot de geraakte categorieën | Voorstel wordt `outdated`. De draft blijft staan tot een expliciete regeneratie |
| Prijs of voorraad wijzigt, lidmaatschap van de categorie niet | De winkelweergave, bij het laden van de pagina | Geen nieuwe tekst. Prijs en voorraad staan niet in het CMS-document |
| Product valt weg uit het verkoopbare aanbod | Listing, merken, vergelijking, gerelateerde kaarten | Tekstvoorstellen die een aantal of een product noemen worden `outdated` |
| Alleen een redactionele draftwijziging | Niets aan de feiten | De fingerprint verschuift niet. Handmatige inhoud blijft beschermd |

Afhankelijkheden lopen van product naar de categorieën waaraan het gekoppeld is, inclusief voorouders, omdat de listing nakomelingen meeneemt. Een vingerafdruk is de bestaande SHA-256 over de gesorteerde feiten, zonder tijdstempel en zonder CMS-tekst. Een gelijke vingerafdruk hergebruikt het voorstel. Een afwijkende vingerafdruk markeert het voorstel als verouderd en laat de draft ongemoeid.

De verwerking is idempotent: hetzelfde productevent maakt geen tweede voorstel en geen tweede draft. Een periodieke reconciliatie vergelijkt de opgeslagen vingerafdruk met een vers berekende package en haalt gemiste events in. Zij herschrijft geen documenten.

Keuzehulp en vergelijking worden herbeoordeeld op dezelfde feiten: een vraag of een kolom bestaat alleen als de specificatie vergelijkbaar is, een betrouwbaar datatype heeft en minstens twee verkoopbare producten een echte waarde hebben. Ontbreekt dat, dan blijft de keuzehulp de redactionele CTA en blijft een vergelijking leeg.

## D. De 21 CMS-blokken

De Claude-PDF houdt deze 21 blokken. Een blok wordt niet verwijderd en niet stil vervangen door een ander type. Waar al een V2-type bestaat, gebruikt een later voorstel dat type. Waar nog geen type bestaat, komt er pas een veld bij na een aparte opdracht die dit masterplan aanwijst. Tot die tijd blijft de allowlist zoals die in de code staat.

Voor ieder blok geldt dezelfde goedkeuring: voorstel bekijken, aanpassen, goedkeuren of afwijzen. Goedkeuren schrijft alleen naar de draft. Publiceren is daarna de bestaande knop. Ontbrekende feiten blijven leeg en worden gemeld. Zij worden niet aangevuld met een aanname.

`ad_slot` staat apart onder de 21. Het document bewaart alleen positie en bron. De banner of campagne komt uit de bestaande advertentiemodules. AI vult geen campagnetekst in dit blok.

### 1. Hero / banner — `hero`

- **Data:** categorienaam, optioneel het aantal gepubliceerde producten en de namen van kinderen. Afbeelding uit de mediabibliotheek, niet uit een verzonnen productfoto.
- **AI:** titel en intro alleen uit die feiten. Knoppen alleen als het doel een bestaande categorie, keuzehulp of listing is.
- **Gegevens:** naam, kindcategorieën, mediabibliotheek-asset.
- **CMS:** titel, intro, twee knoppen, desktop- en mobielbeeld, alt, bijschrift, hero zichtbaar, presentatie.
- **Goedkeuring:** per veld. Een gevulde handmatige titel blijft staan.
- **Ontbrekend:** lege intro in de preview, geen herkomstzin, geen verzonnen beeld.

### 2. Introductie — `intro`

- **Data:** taxonomie en tellingen uit het feitenpakket.
- **AI:** korte introductie, alleen met een `used_facts`-pad.
- **Gegevens:** categorienaam, ouder, kinderen, aantal producten.
- **CMS:** tekst, presentatie.
- **Goedkeuring:** als de overige tekstblokken.
- **Ontbrekend:** het blok blijft leeg of verborgen op de storefront.

### 3. Paginanavigatie

- **Data:** de categorieketen voor broodkruimels. De fasebalk Ontdekken, Kiezen, Kopen, Installeren is redactioneel en hoort in het PDF-ontwerp bij level 2.
- **AI:** geen verzonnen fasen. Ankers wijzen alleen naar blokken die op de pagina staan.
- **Gegevens:** broodkruimels bestaan al in `CategoryV2Page`. Een fasebalk heeft nog geen V2-type.
- **CMS:** nog niet. Later: labels en ankers, geen tweede menu naast de header.
- **Goedkeuring:** pas zodra het type bestaat.
- **Ontbrekend:** de pagina toont de bestaande broodkruimels en geen fasebalk.

### 4. Subcategorietegels — `subcategory_tiles` en `product_group_tiles`

- **Data:** kindcategorieën uit Product Cloud, met gepubliceerd productaantal.
- **AI:** geen verzonnen tegelnamen. Een optioneel bijschrift alleen als het een feit herhaalt.
- **Gegevens:** slug, naam, aantal. Een tegelafbeelding uit Product Cloud bestaat nog niet; een CMS-beeld komt uit de mediabibliotheek.
- **CMS:** titel, op te nemen slugs, maximum, tegelbeelden.
- **Goedkeuring:** de lijst kinderen is data. Alleen het bijschrift en het beeld zijn een voorstel.
- **Ontbrekend:** geen kinderen betekent een lege toestand in de preview en geen verzonnen tegels.

### 5. Snelkoppelingen

- **Data:** bestaande filterwaarden met minstens één verkoopbaar product.
- **AI:** label van een snelle link alleen als de filterwaarde echt voorkomt.
- **Gegevens:** attribuutcode en waargenomen waarde. Nog geen V2-type.
- **CMS:** later een lijst van filtercodes, geen vrije verzonnen landingspagina.
- **Goedkeuring:** een link zonder waarden wordt afgewezen.
- **Ontbrekend:** het onderdeel blijft weg. Op Vaatwassers zijn de winkelattributen leeg, dus een snelkoppeling is nu niet mogelijk.

### 6. Productoverzicht en filters — `filters` en `product_grid`

- **Data:** gepubliceerde producten met een geldige aanbieding. Facetten alleen voor filterbare attributen met echte waarden.
- **AI:** geen filteroptie verzinnen. De grid zelf is data, geen tekstvoorstel.
- **Gegevens:** product-id, prijs, voorraad, specificatiewaarden.
- **CMS:** zichtbare filtercontrols, sortering, aantal. Prijs en voorraad worden niet in het document opgeslagen.
- **Goedkeuring:** de control-lijst kan worden goedgekeurd. De kaarten volgen het live-aanbod.
- **Ontbrekend:** geen waarden betekent geen filterkolom op de publieke pagina. Een categorie zonder producten toont de lege toestand en geen 404.

### 7. Productcarrousel — `product_carousel`

- **Data:** dezelfde verkoopbare producten als de listing.
- **AI:** titel. Geen populaire volgorde verzinnen. Populariteit heeft in het feitenpakket geen bron.
- **Gegevens:** product-id, limiet. Sortering is een beheerdersinstelling van het bestaande blok.
- **CMS:** titel, sortering, aantal, presentatie.
- **Goedkeuring:** titel wel, de kaarten niet als tekst.
- **Ontbrekend:** geen aanbod, geen kaarten.

### 8. Uitgelicht product

- **Data:** één gepubliceerd product met geldige aanbieding, gekozen op stabiel product-id.
- **AI:** een motivatiezin alleen als die een opgeslagen specificatie of categoriefeit herhaalt.
- **Gegevens:** nog geen veld op een V2-blok. Niet de carrousel vullen met een willekeurig product.
- **CMS:** later één product-id en een optionele motivatie.
- **Goedkeuring:** het id moet in het categorie-aanbod zitten.
- **Ontbrekend:** geen kaart.

### 9. Keuzehulp — `choice_assistant_cta`

- **Data:** vergelijkbare specificaties met echte waarden op minstens twee verkoopbare producten.
- **AI:** de redactionele CTA. De interactieve vragen komen later uit dezelfde filterfacetten, niet uit een tweede vraagmodel.
- **Gegevens:** titel, tekst, knop, href, optionele kaarten. Interactieve attribuutcodes zijn nog niet opgeslagen.
- **CMS:** de bestaande velden. De studio meldt dat de interactieve hulp later komt.
- **Goedkeuring:** een knop zonder criterium wordt niet als werkende keuzehulp gepubliceerd. De redactionele CTA mag wel.
- **Ontbrekend:** de publieke pagina houdt de redactionele CTA. Er worden geen vragen getoond.

### 10. Productvergelijking — `product_comparison`

- **Data:** opgeslagen product-id’s en attribuutcodes. Waarden bij het tonen uit Product Cloud en Commerce Cloud.
- **AI:** mag codes voorstellen die vergelijkbaar zijn en op minstens twee producten een waarde hebben. Geen beste-waarde-markering: de attribuutdefinitie heeft geen richting.
- **Gegevens:** id’s en codes. Geen gekopieerde waarden.
- **CMS:** titel, productkeuze, specificatiekeuze.
- **Goedkeuring:** een code zonder waarden wordt ter verwijdering geadviseerd en niet automatisch gewist.
- **Ontbrekend:** geen producten, geen tabel. Een ontbrekende cel blijft een streepje.

### 11. Specificatie-uitleg — `spec_explain`

- **Data:** attribuutdefinitie: label, datatype, eenheid, keuzewaarden. Level 3 is gebouwd.
- **AI:** uitleg die de definitie niet tegenspreekt en geen waarde verzint die op geen product staat.
- **Gegevens:** titel, specificatiecode, specificatietitel, uitleg.
- **CMS:** die velden. De code wordt gekozen uit bestaande definities.
- **Goedkeuring:** een onbekende code blijft een tekstvoorstel zonder schaal.
- **Ontbrekend:** de uitleg blijft staan. De schaal blijft weg. De level 2-variant met nisschema heeft nog geen beeldveld, maatregel of aansluitpunt.

### 12. Koopadvies — `buying_guide`

- **Data:** gevulde, vergelijkbare specificaties. De tekst is redactioneel.
- **AI:** secties alleen rond die specificaties. Geen gids die alleen de categorienaam herhaalt.
- **Gegevens:** intro, secties, FAQ op dit blok, afsluitende CTA, beelden uit de mediabibliotheek.
- **CMS:** de bestaande koopgidseditor.
- **Goedkeuring:** per sectie. De FAQ op de gids is niet het losse `faq`-blok.
- **Ontbrekend:** lege gids in de preview, verborgen op de storefront als er niets is ingevuld.

### 13. Merkoverzicht — `brand_overview`

- **Data:** merken van de al geselecteerde categorieproducten, één keer per product, gesorteerd op aantal en naam.
- **AI:** titel. Geen merkenlijst en geen herkomstzin uit het land van de merkeigenaar.
- **Gegevens:** `max_items`, kolommen. Logo uit `logo_url`. Link alleen naar een gepubliceerde merkpagina met opgeslagen slug.
- **CMS:** titel, maximum, presentatie. `allow_sponsored` blijft uit.
- **Goedkeuring:** de rij is data. Alleen de titel is een voorstel.
- **Ontbrekend:** geen aanbod, geen rij. Een merk zonder logo toont de naam.

### 14. Merkverhaal — `brand_story`

- **Data:** bestaand merk: naam, slug, logo. Het type bestaat, staat op geen allowlist en heeft geen renderer.
- **AI:** tekst alleen over opgeslagen merkfeiten. Geen productieland uit het land van de eigenaar.
- **Gegevens:** titel, tekst, `brand_slug`. Nog geen categoriebeeld op het blok.
- **CMS:** nog niet beschikbaar in de studio.
- **Goedkeuring:** pas nadat het blok op level 2 is toegestaan.
- **Ontbrekend:** het onderdeel wordt niet getoond.

### 15. EuropMade-herkomstverhaal — `why_europmade`

- **Data:** ISO-productieland, geverifieerde herkomst of een echte Made in Europe-score. Drie aparte feiten blijven apart.
- **AI:** de volledige band op level 1 alleen met zo’n feit. De compacte level 2-variant en de ene regel op level 3 bestaan nog niet op het blok.
- **Gegevens:** titel en tekst. Het blok is verplicht op level 1.
- **CMS:** titel en tekst.
- **Goedkeuring:** zonder herkomstfeit blijft het voorstel `blocked`.
- **Ontbrekend:** geen Europese productiezijn. Een handmatige tekst blijft staan.

### 16. Inspiratie en artikelen

- **Data:** geen artikelengine. Kaarten zijn redactioneel, met een beeld uit de mediabibliotheek en een link naar een bestaande pagina.
- **AI:** titel en samenvatting zonder verzonnen onderzoek of leestijd als die niet is opgeslagen.
- **Gegevens:** nog geen V2-type. Geen tweede publicatiesysteem.
- **CMS:** later kaarten met titel, tekst, beeld en link.
- **Goedkeuring:** een kaart zonder bestemming wordt niet getoond.
- **Ontbrekend:** het onderdeel blijft weg. Het hoort in de PDF bij level 1.

### 17. Gerelateerde producten — `related_products`

- **Data:** `pc_product_relation` vanaf een verkoopbaar categorieproduct naar een gepubliceerd product met geldige aanbieding.
- **AI:** titel. Geen relatie verzinnen en geen vervanging door andere producten uit dezelfde categorie.
- **Gegevens:** titel en aantal. De kaarten komen uit de relatie.
- **CMS:** die twee velden. De studio meldt een lege relatietabel.
- **Goedkeuring:** de titel wel. De kaarten volgen de relaties.
- **Ontbrekend:** het blok blijft op de storefront weg. De tabel heeft nu geen rijen. De level 2-accessoirevariant blijft dicht zolang er geen accessoirerelaties zijn.

### 18. Onderhoud

- **Data:** redactionele frequenties. Accessoires ernaast alleen via een accessoirerelatie.
- **AI:** stappen alleen als een beheerder ze goedkeurt. Geen verzonnen onderhoudsschema uit de producttitel.
- **Gegevens:** nog geen V2-type.
- **CMS:** later vier stappen met frequentie en tekst.
- **Goedkeuring:** als een gewoon tekstblok.
- **Ontbrekend:** het onderdeel blijft weg. Het hoort in de PDF bij level 3.

### 19. USP-blok — `usp_bar`

- **Data:** tellingen of een herkomstfeit per slot. Vier posities blijven bestaan.
- **AI:** hoogstens het slot waarvoor een feit bestaat.
- **Gegevens:** vier slots met titel, tekst en icoon.
- **CMS:** de bestaande USP-editor. `manual_override` beschermt een gewijzigd slot.
- **Goedkeuring:** een handmatig slot wordt overgeslagen. Een acceptatie mag een leeg slot vullen zonder het alleen daardoor handmatig te maken. Die acceptatiestap bestaat nog niet.
- **Ontbrekend:** lege slots blijven leeg.

### 20. FAQ — `faq`

- **Data:** geen automatische vragen uit specificaties. De tekst is redactioneel. FAQPage-schema gebruikt alleen opgeslagen vraag en antwoord.
- **AI:** vragen die een feit of een goedgekeurde koopregel herhalen. Geen vragen die een ontbrekend feit verzinnen.
- **Gegevens:** titel, vraag, antwoord, volgorde, talen nl, en, de, fr.
- **CMS:** optioneel op level 1, 2 en 3. De koopgids houdt haar eigen FAQ.
- **Goedkeuring:** per vraag. Afwijzen laat de draft staan.
- **Ontbrekend:** geen vraagtekst, geen item. Een lege lijst blijft op de storefront weg.

### 21. SEO-content — `seo_content` en `document.seo`

- **Data:** categorienaam, kinderen, ouder, tellingen. H1 blijft de categorienaam zolang de draft-H1 leeg is.
- **AI:** title en meta description alleen als er een feit is om te noemen. Elke slug krijgt een eigen tekst. Interne links alleen naar ouder, kind of een categorie uit het feitenpakket.
- **Gegevens:** seo-titel, meta description, H1, en het optionele SEO-blok met titel en tekst.
- **CMS:** de bestaande SEO-velden en het blok.
- **Goedkeuring:** een gevulde H1 is handmatig en blijft staan.
- **Ontbrekend:** title en description blijven leeg. Geen keywordlijst en geen alinea die alleen bestaat omdat het blok leeg was.

### Advertentie — `ad_slot`

Blijft naast de 21. Posities: `below_hero`, `between_content`, `above_product_grid`, `below_product_grid`. De pagina haalt de campagne of banner live op. Een leeg resultaat toont niets. AI publiceert geen advertentie. Sponsoring van merken blijft de V11-notitie en wordt niet verkocht.

## E. Level 1, 2 en 3

V11 is de paginacompositie. De PDF beschrijft daarnaast de diepte per blok. Een niveau krijgt niet de pagina van een ander niveau met andere teksten.

| | Level 1 | Level 2 | Level 3 |
|---|---|---|---|
| Voorbeeld | Huishouden | Inbouwapparatuur | Vaatwassers |
| Doel | Ontdekken | Oriënteren | Vergelijken en kopen |
| V11-volgorde | Header, kruimels, hero, vier USP’s, advertentie, subcategorietegels, productkaarten, merken, groene herkomstband, footer | Header, kruimels, hero, USP’s, advertentie, productgroeptegels, keuzehulp, drie advieskaarten, merken, “Goed om te weten”, footer | Header, kruimels, hero, USP’s, advertentie, filters naast grid, keuzehulp, vergelijking, koopgids, merken, sponsornotitie, footer |
| Niet op dit niveau | Filters en volledige listing | Filters en volledige listing | Subcategorietegels als vervanging van het grid |

Verplichte V2-blokken blijven in de allowlist-volgorde. Optionele blokken vullen V11-onderdelen die niet verplicht zijn: advertentie overal, merken op level 2 en 3, keuzehulp op level 3, intro of SEO voor “Goed om te weten”. FAQ, specificatie-uitleg en gerelateerde producten zijn optioneel waar de allowlist dat nu toestaat. Zij verschuiven de andere blokken niet vanzelf.

De PDF-onderdelen paginanavigatie, snelkoppelingen, uitgelicht product, inspiratie, onderhoud, merkverhaal en de compacte herkomstvarianten horen bij de bibliotheek. Zij worden pas op een niveau toegestaan als een latere opdracht de allowlist uitbreidt.

## F. AI en automatische invulling

Een generatie maakt een voorstel per toegestaan blok, met de structuur uit [AI Category Intelligence](./category-cms-ai-intelligence.md) §3: status, confidence, `used_facts`, `missing`, provider, promptversie en kosten. `content` is leeg als het blok geblokkeerd is.

Afbeeldingssuggesties wijzen naar een bestaand mediabibliotheek-asset. Zij kopiëren het bestand niet en gebruiken geen productfoto als sfeerbeeld zonder dat die foto het product zelf is.

Productselectie gebruikt de bestaande listing, vergelijkings-id’s, merkafleiding en productrelaties. De AI kiest geen producten buiten die bronnen.

SEO volgt §D.21. Talen zijn nl, en, de en fr. Een vertaling voegt geen feit toe dat in het Nederlandse voorstel ontbreekt.

Bronverantwoording is het pad in het feitenpakket of de mediabibliotheek-id. Zonder pad blijft het veld leeg.

Goedgekeurde en handmatige content wordt niet overschreven. Een nieuwe generatie maakt hoogstens een nieuw voorstel. `accepted` en `modified` blijven in de draft staan. Alleen het voorstelrecord kan `outdated` worden.

De storefront roept geen model aan. Externe providers blijven uit tot een nieuw ADR EU-hosting en een verwerkersovereenkomst vastlegt. De bestaande analyzer die herkomst aanvult met “Europese makers” of een land zonder ISO-code wordt niet op de drafts losgelaten.

## G. Admin Studio

De studio houdt drie kolommen.

- Links: paginastructuur en blokvolgorde. Verplichte blokken blijven vast. Optionele blokken kunnen worden toegevoegd, verborgen en verplaatst.
- Midden: dezelfde `CategoryV2Page` als de storefront, desktop, tablet en mobiel. De preview leest het conceptdocument. De gepubliceerde weergave leest alleen Published.
- Rechts: de bestaande velden en vormgeving. Een latere derde laag op die kolom toont het voorstel van het geselecteerde blok: status, confidence, gebruikte feiten, ontbrekende feiten en de voorgestelde velden naast de draft.

Acties, pas als de voorstelkolom bestaat: goedkeuren, aanpassen, opnieuw genereren en afwijzen. Opnieuw genereren is een expliciete actie. Een verouderde vingerafdruk toont het verschil en vervangt niets. Versiehistorie blijft de bestaande revisie bij publicatie plus de voorstelstatussen. Een overzicht van verouderde en ontbrekende content leest `missing` en `outdated`, niet een tweede CMS.

Opslaan blijft Draft opslaan. Publiceren blijft de bestaande knop, met bevestiging en de stale-base-controle.

## H. Datakwaliteit

De engine rapporteert per categorie, zonder de gaten te vullen:

- productdekking: gepubliceerde producten in de boom, en daarvan het aantal met een geldige aanbieding;
- ingevulde specificaties tegen de attribuutdefinities;
- filters die een echte waarde hebben;
- vergelijkingen waar minstens twee producten dezelfde specificatie vullen;
- keuzehulp die alleen dan interactief kan worden;
- ontbrekende productinformatie, met code, zoals nu in het feitenpakket;
- wat een verkoper nog moet aanvullen, als voorstel aan de bestaande Product Cloud-aanvulroute, niet als verzonnen waarde op de categoriepagina.

GPSR- en compliancevelden blijven feiten en worden geen winkelfilter of koopadvies.

## I. AI-kosten en prestaties

Een gelijke vingerafdruk hergebruikt het voorstel en slaat de provider over. Alleen een blok waarvan de feiten veranderden komt in aanmerking voor een nieuwe generatie, en pas na een expliciete actie of een goedgekeurde batch.

Batchverwerking loopt per categorie, niet per page view. Kosten horen bij de generatie: provider, model, tokens, bedrag, taal, blok. De offline-analyzer boekt nul. Totalen later per categorie, blok en provider.

De registry blijft provider-agnostisch. Stubs voor externe modellen blijven weigeren tot het ADR uit ADR-0036 er is.

## J. Implementatievolgorde

Elke stap hergebruikt V2, de fact package, Draft/Published en `CategoryV2Page`. Geen stap ontwerpt een tweede pagina.

| Stap | Inhoud | Hangt af van | Acceptatie |
|---|---|---|---|
| 0 | Dit masterplan en het referentiedocument | De bronnen in de hiërarchie | De 21 blokken, V11, goedkeuring en de 511 drafts staan beschreven. Geen code |
| 1 | Voorstelregels zonder opslag en zonder provider. Dit is 4B uit het AI-ontwerp | Bestaande fact package | Elektronica, Sport en Duurzaam geven `blocked`, `partial` of `factual` met `used_facts`. Niets opgeslagen |
| 2 | Acceptatie naar de draft zonder publicatie en zonder handmatige USP’s te overschrijven. Dit is 4C | Stap 1 | Eén testcategorie. Published ongewijzigd. Een handmatig USP-slot blijft gelijk |
| 3 | Opslag van voorstellen en kosten, buiten draft en published. Dit is 4D | Stap 2 en een aparte migratie-opdracht | Gelijke vingerafdruk leest het oude voorstel. Een draft wordt niet bij de migratie herschreven |
| 4 | Voorstelkolom in de studio. Dit is 4E | Stap 3 | Goedkeuren, aanpassen, afwijzen en opnieuw genereren werken op de preview. Publiceren blijft apart |
| 5 | Detectie en reconciliatie | Stap 3 | Een gewijzigd productfeit zet het voorstel op `outdated` en laat de draft staan. Hetzelfde event twee keer maakt één voorstel |
| 6 | Dekkingsrapport in de studio | Stap 5 en de bestaande package | De cijfers kloppen met de storefronttelling. Gaten worden niet gevuld |
| 7 | Resterende PDF-blokken als uitbreiding van V2 | Stap 4, en alleen het blok dat de opdracht noemt | Het blok staat op de afgesproken niveaus, rendert in `CategoryV2Page` en heeft een voorstelregel uit stap 1 |
| 8 | Providervergelijking | Een nieuw ADR plus stap 4 | Externe aanroep alleen in een job. Page load blijft vrij van AI |

Stap 7 bouwt geen blok voordat de voorstelvorm uit stap 1 dat bloktype kent. Daarmee hoeft een visueel blok later niet een tweede contentmodel te krijgen.

## K. Bescherming van bestaande gegevens

- De 511 bestaande V2-drafts blijven behouden. Geen bulkupdate en geen normalisatie over die verzameling.
- Published blijft gescheiden van Draft. De storefront leest Published.
- Handmatige wijzigingen, waaronder `manual_override` op USP-slots, worden beschermd.
- Goedgekeurde content wordt niet automatisch vervangen.
- Een AI-voorstel is geen publicatie en geen draft, tot een beheerder het expliciet overneemt.
- Geen ongevraagde bulkupdates van categorieën, producten, media of relaties.
- Geen verzonnen producten, prijzen, specificaties, reviews, voorraad, merken of Europese herkomst.
- Mode en E2E Cat blijven buiten de actieve CMS-lijst. Algemeen en Duurzaam blijven erin.

## Bekende spanningen

Deze zinnen zijn niet weggewerkt, omdat dit document geen andere specificatie herschrijft.

- [Published/Draft](./category-cms-published-draft.md) noemt zichzelf nog “ontwerp, nog niet geïmplementeerd”. Draft, Published en revisies zijn in de werkende Category CMS V2 in gebruik. De werkende code is hier de grens.
- [AI Category Intelligence](./category-cms-ai-intelligence.md) zegt dat het referentiedocument niet in de repository staat. Het staat in `category-cms-reference/`.
- De V11-PNG en de V11-PDF tonen dezelfde drie kolommen. De PNG is de beeldmaat; de PDF is de aanvullende uitwerking.
- Het AI-ontwerp zegt dat een carrousel geen populariteitssortering krijgt, omdat populariteit geen Product Cloud-feit is. De bestaande carrousel heeft wel een beheerderssortering. Die instelling blijft een CMS-keuze. De AI verzint geen populariteitsfeit en pakt die sortering niet af.
- ADR-0047 beschrijft een communicatie-CMS voor marketing. Dat is niet het categoriedocument. Alleen de goedkeuringsregel wordt gedeeld.
