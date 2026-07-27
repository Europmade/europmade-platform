# UX Design Review — Productpagina + Buy Box (wireframe v1)

**Rol:** Senior UX Lead-beoordeling, kritisch, vóór definitief maken.
**Onderwerp:** `sprint-1a/01-productpagina-buybox.html` (+ gebruikte componenten uit `00-design-system-foundation.html`).
**Status:** Alleen review — er is nog niets aangepast aan de wireframes.

Elke bevinding: observatie → waarom dit beter kan → impact op UX → impact op ontwikkeling → concreet voorstel. Bevindingen zijn genummerd (F1, F2, ...) zodat je per stuk akkoord kunt geven of kunt afwijzen.

---

## 1. Informatiehiërarchie

**F1 — Twee verschillende "sterren"-ratings zijn visueel niet te onderscheiden**
- Observatie: boven de titel staat "★★★★☆ 4,4 (328 productreviews)" en in de Buy Box staat "★ 4,6" (retailerbeoordeling). Beide gebruiken exact dezelfde ster-notatie en typografie.
- Waarom dit beter kan: de functionele spec (sectie 3.1) benadrukt dat productreview en verkopersreview strikt gescheiden betekenissen hebben — de Buy Box-score gebruikt uitsluitend de verkopersreview. Visueel identieke sterren maken dat onderscheid onzichtbaar.
- Impact op UX: klant kan denken dat 4,4 en 4,6 tegenstrijdige productbeoordelingen zijn, in plaats van twee verschillende dingen (product vs. verkoper).
- Impact op ontwikkeling: gering — vereist een tweede Rating-variant (met een expliciet "verkoper"-label) in het Design System.
- Voorstel: Rating-component splitsen in twee subvarianten: "Productrating" (ster + "productreviews") en "Verkopersrating" (ster + retailernaam of "verkopersbeoordeling"), met een klein tekstlabel dat nooit weggelaten wordt.

**F2 — Geen prijsindicatie zichtbaar vóórdat het oog de Buy Box bereikt**
- Observatie: de titelkolom (kolom 2) toont geen prijs; prijs verschijnt alleen in de Buy Box (kolom 3).
- Waarom dit beter kan: iemand die doorklikt vanuit zoekresultaten wil de prijs razendsnel bevestigd zien; nu moet het oog eerst twee kolommen passeren.
- Impact op UX: vertraagde prijsbevestiging kan tot twijfel/terugklikken leiden, vooral op smallere desktopschermen waar de Buy Box lager op de pagina valt.
- Impact op ontwikkeling: geen — puur een contentplaatsing, geen nieuwe component.
- Voorstel: overweeg een compacte prijsindicatie (bijv. "vanaf € 239,00 · 3 aanbieders") direct onder de titel, die doorverwijst naar de Buy Box/aanbiederstabel.

---

## 2. Scannability binnen 3 seconden

**F3 — Het marketplace-karakter (meerdere aanbieders) is niet direct zichtbaar**
- Observatie: de aanwezigheid van 3 aanbieders is alleen zichtbaar via de kleine tekst "Alle 3 aanbieders bekijken ▾" onderaan de Buy Box (12px, laagste visuele gewicht op de pagina).
- Waarom dit beter kan: dit "N aanbieders, EuropMade kiest niet voor jou"-concept is het kernonderscheidend vermogen van het platform (Blueprint H6, H8.5) — het verdient een prominentere, vroeg zichtbare plek, niet de kleinste tekst op het scherm.
- Impact op UX: eerstebezoekers die het marketplace-concept nog niet kennen, kunnen de pagina aanzien voor een gewone single-seller productpagina.
- Impact op ontwikkeling: geen — contentprioriteit, geen nieuwe component.
- Voorstel: een zichtbaardere indicator vroeg op de pagina (bijv. naast de titel of bovenaan de Buy Box: "3 aanbieders vergelijken"), groter dan de huidige 12px-tekst.

**F4 — Trust-badges en logistiek-badges zijn visueel identiek**
- Observatie: Verified™, "Gemaakt in Nederland" en "Producent: Merknaam BV" (vertrouwenssignalen) gebruiken exact dezelfde pil-vorm als "Morgen in huis" en "Gratis verzending" (logistieke feiten) in de Buy Box.
- Waarom dit beter kan: twee semantisch verschillende categorieën informatie (vertrouwen vs. logistiek) zijn nu niet uit elkaar te houden zonder de tekst te lezen — een scan van 3 seconden pikt geen onderscheid op.
- Impact op UX: vertraagt herkenning van "dit product is extra betrouwbaar" als signaal.
- Impact op ontwikkeling: gering — twee visuele badge-varianten i.p.v. één, vast te leggen in het Design System.
- Voorstel: aparte structurele vorm (niet per se kleur, dat komt later) voor trust-badges vs. logistiek-badges, bijv. andere positie (trust-badges bij de titel, logistiek-badges alleen in de Buy Box/aanbiederstabel — wat feitelijk al deels zo is, maar nu inconsistent doorgezet wordt doordat Verified™ ook in de Buy Box terugkomt, zie F9).

---

## 3. Conversie-optimalisatie

**F5 — "Toevoegen aan verlanglijst" staat niet in de MVP-scherminventarisatie**
- Observatie: de Buy Box bevat een secundaire knop "Toevoegen aan verlanglijst". Dit scherm/deze functionaliteit komt nergens voor in de 67 schermen uit `ux-architecture.md` sectie 5, noch in de functionele spec.
- Waarom dit beter kan: dit is scope-uitbreiding die niet is afgestemd — een wishlist vereist een eigen datamodel, een eigen overzichtsscherm en eigen rechten, niets hiervan is gedefinieerd.
- Impact op UX: als de knop niets doet omdat de functionaliteit nooit gebouwd wordt, ontstaat een dode knop in een live product.
- Impact op ontwikkeling: als dit wél gebouwd moet worden, is dit een nieuw Medusa-datamodel (customer wishlist is geen standaardmodule) — een niet-begrote uitbreiding.
- Voorstel: verwijderen uit dit wireframe totdat het expliciet als scherm/feature is toegevoegd aan de scherminventarisatie en MVP-scope, óf bewust als Should/Could Have toevoegen aan `05-mvp-scope/` vóórdat het in een wireframe verschijnt.

**F6 — De relatie tussen "Kiezen" (aanbiederstabel) en "In winkelwagen" (Buy Box) is niet eenduidig**
- Observatie: in de tabel staat per rij een knop "Kiezen"/"Gekozen"; in de Buy Box staat "In winkelwagen". De interactienotitie onderaan legt uit dat "Kiezen" alleen de Buy Box ververst, maar dat is nergens in de UI zelf zichtbaar.
- Waarom dit beter kan: een gebruiker die in de tabel op "Kiezen" klikt, verwacht redelijkerwijs een aankoopactie, niet een selectiewissel zonder verdere feedback.
- Impact op UX: verwarring over of het product al is toegevoegd aan de winkelwagen; risico op afhaken of dubbele acties.
- Impact op ontwikkeling: gering — vereist alleen heldere labeling en een duidelijke visuele bevestiging (bijv. scroll-naar-Buy Box na klik, of directe knop "In winkelwagen" per rij).
- Voorstel: label wijzigen naar iets dat het gevolg beschrijft (bijv. "Deze aanbieder tonen") én/of een directe "In winkelwagen"-knop per rij toevoegen, zodat een gebruiker niet per se via de Buy Box hoeft te bestellen.

**F7 — Geen aantalselectie (quantity) bij "In winkelwagen"**
- Observatie: geen zichtbaar aantal-invoerveld naast de primaire CTA.
- Waarom dit beter kan: standaard e-commerce-verwachting; ontbreken ervan dwingt een extra stap in de winkelwagen zelf.
- Impact op UX: kleine frictie, met name voor klanten die meerdere stuks willen bestellen.
- Impact op ontwikkeling: triviaal (Medusa cart line item ondersteunt quantity nativief).
- Voorstel: aantal-stepper toevoegen naast de CTA-knop in de Buy Box.

---

## 4. Vertrouwen

**F8 — Trust-elementen staan onderaan en zeer klein**
- Observatie: "Veilig betalen / 30 dagen retour / Verkocht via EuropMade" staat als laatste blok in de Buy Box, in 10px-tekst — kleiner dan alle andere tekst op de pagina.
- Waarom dit beter kan: de Blueprint bouwt het hele platform rond vertrouwen (Vijf Pijlers van Vertrouwen, H13.3) — dat principe is nu de minst prominente tekst op het belangrijkste scherm van het platform.
- Impact op UX: een kernonderscheidend vermogen (vertrouwen) krijgt de laagste visuele prioriteit, tegenovergesteld aan de bedoeling van de Blueprint.
- Impact op ontwikkeling: geen, puur prioriteit/plaatsing.
- Voorstel: trust-rij minimaal even prominent als de logistieke badges maken, en overwegen om "Verkocht via EuropMade" hoger op de pagina te herhalen (bijv. bij de titel), niet uitsluitend in de Buy Box.

**F9 — Geen koppeling van badges naar uitleg (Verified™, "Vijf Pijlers")**
- Observatie: Verified™-badge en "Gemaakt in Nederland" zijn statische pillen zonder aangegeven interactie (link/tooltip).
- Waarom dit beter kan: `ux-architecture.md` (navigatie, sectie 4.1) en de functionele spec (sectie 1.10) veronderstellen dat Verified™ uitlegbaar/klikbaar is — een klant die het label niet kent, heeft nu geen manier om te begrijpen wat het betekent.
- Impact op UX: vermindert het vertrouwenseffect van het label bij nieuwe bezoekers die de term niet kennen.
- Impact op ontwikkeling: gering — tooltip of link naar de "Over EuropMade/Verified™-uitleg"-pagina (scherm #18 uit de inventarisatie, dus al gepland).
- Voorstel: Verified™-badge (en evt. Country of Production-badge) interactief maken: klik/hover toont uitleg of linkt naar scherm #18.

---

## 5. Buy Box duidelijkheid

**F10 — "Beste aanbieding" impliceert een redactionele aanbeveling van EuropMade**
- Observatie: het label boven de Buy Box is "Beste aanbieding".
- Waarom dit beter kan: dit is de meest kritieke bevinding van deze review. De functionele spec legt in sectie 3.0 expliciet vast: *"EuropMade bepaalt niet welke retailer 'wint'"* en *"de Buy Box wordt uitsluitend bepaald op basis van de beste totale aanbieding voor de klant"* — een **algoritmische, objectieve** uitkomst, geen redactionele keuze. "Beste aanbieding" leest als een claim/aanbeveling van EuropMade zelf, wat het neutraliteitsprincipe ondermijnt en zelfs een misleidende-handelspraktijken-risico kan vormen (het suggereert een keuze/beoordeling die EuropMade volgens haar eigen regels niet maakt).
- Impact op UX: klant kan (terecht) denken dat EuropMade een commerciële voorkeur uitspreekt, wat op termijn het vertrouwen ondermijnt als dit ontdekt wordt.
- Impact op ontwikkeling: geen — copy-wijziging.
- Voorstel: neutrale, beschrijvende labeling die het mechanisme benoemt in plaats van een waardeoordeel te vellen, bijv. "Geselecteerd op basis van prijs, levertijd en betrouwbaarheid" — expliciet gekoppeld aan de factoren uit spec sectie 3.1, niet aan een superlatief.

**F11 — Interne term "Buy Box" lekt door naar klantgerichte UI**
- Observatie: in de aanbiederstabel staat een badge met letterlijk de tekst "Buy Box" bij de winnende rij.
- Waarom dit beter kan: "Buy Box" is platform-/vakjargon (ook gebruikt in deze documentatie), geen klantgerichte term. Een klant weet niet wat dit betekent.
- Impact op UX: onbegrijpelijk label op het belangrijkste beslismoment van de pagina.
- Impact op ontwikkeling: geen — copy-wijziging, geen nieuw component (wel dezelfde wijziging als F10, bij voorkeur consistent).
- Voorstel: vervang door dezelfde klantgerichte tekst als bij F10 (of een kort equivalent zoals "Standaardkeuze").

**F12 — Verified™ staat ín de Buy Box, gekoppeld aan de aanbieder, terwijl het een producteigenschap is**
- Observatie: de Verified™-badge staat naast de prijs in de Buy Box, in dezelfde visuele context als de retailer-specifieke gegevens (prijs, levertijd).
- Waarom dit beter kan: dit is een feitelijke inconsistentie met de functionele spec. Verified™ certificeert de **productinformatie** (Product Cloud, sectie 1.10) — het is geen eigenschap van een specifieke aanbieder/Offer (Commerce Cloud). Door de badge in de Buy Box te plaatsen, wekt het de indruk dat "Verified™" een reden is waarom déze aanbieder wint, terwijl Verified™ geen Buy Box-factor is (spec sectie 3.1–3.2) en voor alle aanbieders van dit product evengoed geldt.
- Impact op UX: potentiële verwarring over wat Verified™ betekent en waarom het bij één aanbieder lijkt te horen.
- Impact op ontwikkeling: gering — betreft alleen plaatsing, geen nieuwe datastructuur (Verified™ hoort al op productniveau in de data).
- Voorstel: Verified™-badge verplaatsen naar de producttitel-sectie (waar Country of Production/Manufacturer al staan) en uit de Buy Box zelf weghalen, zodat het ondubbelzinnig een producteigenschap blijft.

**F13 — Retourvoorwaarden ontbreken in de aanbiederstabel**
- Observatie: de "alle aanbieders"-tabel toont Prijs, Levertijd, Verzending, Beoordeling, Voorraad — geen Retourvoorwaarden.
- Waarom dit beter kan: de functionele spec (sectie 2.8) noemt retourvoorwaarden expliciet als een van de acht Commerce Cloud-dimensies die per aanbieder kunnen verschillen (gratis retour/retourkosten/verlengde termijn) — dit ontbreekt nu volledig in de vergelijking, terwijl het voor sommige klanten doorslaggevend kan zijn.
- Impact op UX: onvolledige vergelijkingsbasis op precies het scherm dat vergelijken mogelijk moet maken.
- Impact op ontwikkeling: gering — extra kolom, data bestaat al in het Offer-model.
- Voorstel: kolom "Retour" toevoegen aan de aanbiederstabel.

---

## 6. Mobiele UX

**F14 — Er is geen mobiel wireframe, ondanks het Mobile First-uitgangspunt**
- Observatie: dit wireframe is uitsluitend als 3-koloms desktop-grid uitgewerkt; de enige verwijzing naar mobiel is één tekstregel ("Op mobiel: zelfde rijen, gestapeld als Offer Cards").
- Waarom dit beter kan: zowel de Blueprint (H10.11: "meer dan de helft van de bezoekers via mobiel") als `01-architecture/tech-stack.md` ("Mobile First" als expliciet ontwerpuitgangspunt) én de wireframe-strategie zelf (sectie 3, paginatemplates voor Desktop/Tablet/Mobiel) veronderstellen dat mobiel niet een afgeleide is, maar het uitgangspunt. Dit wireframe doet het omgekeerde.
- Impact op UX: het belangrijkste scherm van het platform is nog niet gevalideerd voor het kanaal waar de meerderheid van het verkeer vandaan komt.
- Impact op ontwikkeling: aanzienlijk als dit laat ontdekt wordt — een sticky sidebar-Buy Box vertaalt zich op mobiel typisch naar een sticky bottom-bar met prijs+CTA, wat een wezenlijk ander interactiepatroon is, geen simpele "stack".
- Voorstel: vóór definitief maken van dit scherm een volwaardig mobiel wireframe toevoegen (niet alleen tablet — expliciet mobiel, gezien Mobile First), inclusief hoe de Buy Box zich gedraagt bij scrollen op een telefoon.

---

## 7. Accessibility (WCAG)

**F15 — De Buy Box-winnaar wordt uitsluitend met kleur/achtergrond aangeduid**
- Observatie: de gemarkeerde rij in de aanbiederstabel (`winner-row`) gebruikt alleen een lichtgrijze achtergrond + vetgedrukte tekst + de (jargon-)badge uit F11.
- Waarom dit beter kan: WCAG 1.4.1 (Use of Color) vereist dat betekenis niet uitsluitend via kleur/achtergrondtint wordt overgebracht. Vetgedrukte tekst helpt, maar is zwak als enige tweede signaal, vooral zodra dit later gestyled wordt met een subtiele merkkleur.
- Impact op UX: slechtziende gebruikers of gebruikers met kleurenblindheid kunnen de winnende rij mogelijk niet betrouwbaar identificeren.
- Impact op ontwikkeling: laag — icoon of expliciet label (al aanwezig via de badge, zie F11) is voldoende, mits die badge zelf goed leesbaar/gelabeld is.
- Voorstel: badge/tekstlabel als primair onderscheid behouden (niet alleen achtergrondkleur), en zorgen dat contrastwaarden in de Design System-fase expliciet getoetst worden.

**F16 — Ster-ratings hebben geen tekstalternatief**
- Observatie: "★★★★☆ 4,4" is een visuele Unicode-representatie zonder aangegeven alternatieve tekst.
- Waarom dit beter kan: schermlezers hebben een expliciet, ondubbelzinnig tekstalternatief nodig (bijv. "4,4 van de 5 sterren, 328 reviews"), niet losse ster-glyphs.
- Impact op UX: ontoegankelijk voor schermlezergebruikers, een van de grotere klanten-segmenten die dit kunnen raken.
- Impact op ontwikkeling: triviaal (aria-label/visually-hidden tekst) — moet wel nu al worden vastgelegd als eis voor de Rating-component in het Design System.
- Voorstel: Rating-component in `07-design-system/components.md` vastleggen mét verplicht tekstalternatief, niet alleen visuele sterren.

**F17 — Geen semantische structuur/heading-niveaus vastgelegd**
- Observatie: het wireframe is met platte `div`'s opgebouwd (verwacht op dit fidelity-niveau), maar er is nog geen aantekening over de beoogde HTML-semantiek (heading-niveaus, tabel-`scope`, landmark-regio's).
- Waarom dit beter kan: zonder vroege vastlegging is het risico reëel dat de uiteindelijke implementatie ad hoc semantiek krijgt, wat WCAG-compliance (Blueprint H13.4 noemt Europese regelgeving, en toegankelijkheid is onderdeel van bredere EU-verplichtingen voor e-commerce) lastiger maakt achteraf te herstellen dan vooraf te ontwerpen.
- Impact op UX: indirect — bepaalt of schermlezer- en toetsenbordgebruikers de pagina logisch kunnen doorlopen.
- Impact op ontwikkeling: laag als nu vastgelegd, hoger als achteraf hersteld moet worden.
- Voorstel: bij de volgende iteratie een semantische annotatielaag toevoegen (welke elementen h1/h2/h3 zijn, welke tabel `<caption>`/`scope` krijgt, focusvolgorde van de Buy Box t.o.v. de aanbiederstabel).

---

## 8. Consistentie met het Design System

**F18 — Geen gedeelde stylesheet; component-CSS is gedupliceerd tussen bestanden**
- Observatie: `00-design-system-foundation.html` en `01-productpagina-buybox.html` bevatten elk hun eigen, volledig losstaande CSS. Componenten als `.dm-badge` zijn met de hand opnieuw overgetypt in het tweede bestand.
- Waarom dit beter kan: dit werkt voor twee bestanden, maar bij 60+ schermen ontstaat onvermijdelijk drift (kleine stijlverschillen die er ongemerkt insluipen) — precies het risico dat `07-design-system/README.md` probeert te voorkomen.
- Impact op UX: inconsistente componenten tussen schermen naarmate er meer wireframes bijkomen.
- Impact op ontwikkeling: bij de daadwerkelijke bouw in Next.js is dit geen probleem (React-componenten worden toch gedeeld) — het risico zit uitsluitend in de wireframe-fase zelf.
- Voorstel: vanaf het volgende wireframe een gedeeld `wireframe-kit.css`-bestand gebruiken dat door alle wireframe-HTML-bestanden wordt ingeladen, in plaats van CSS te kopiëren.

**F19 — De 2px Buy Box-rand is een nieuw patroon dat niet in de Foundation is vastgelegd**
- Observatie: de Buy Box gebruikt een dikke 2px rand (`border:2px solid var(--wf-800)`) — een uitzondering op de standaard 1px-randen die verder overal worden gebruikt.
- Waarom dit beter kan: een bewuste uitzondering (nadruk voor het belangrijkste onderdeel van de pagina) is verdedigbaar, maar is nu stilzwijgend alleen hier toegepast, niet teruggekoppeld naar de Foundation als een herbruikbaar "nadruk"-patroon.
- Impact op UX: gering nu, maar risico op inconsistente nadruk-conventies bij toekomstige schermen (wanneer benadrukken we iets met 2px, wanneer niet?).
- Impact op ontwikkeling: triviaal om nu recht te zetten, kost meer moeite als het patroon zich al heeft verspreid.
- Voorstel: "nadruk-rand" (2px) als expliciet, gedocumenteerd patroon toevoegen aan de Foundation, met de regel wanneer het wel/niet gebruikt wordt (vergelijkbaar met de CDS-restraintregel: één nadruk-element per scherm).

---

## 9. Consistentie met de Blueprint

**F20 — Productreview en verkopersreview zijn samengevoegd tot één tab**
- Observatie: de tab heet "Reviews (328)" — één tab, één getal.
- Waarom dit beter kan: H10.10 en de functionele spec (sectie 2.1 UX klant) zijn expliciet: productreview en verkopersreview zijn **strikt gescheiden** — dat principe geldt niet alleen voor het plaatsen van reviews (al goed geborgd in de UX-architectuur, schermen #15/#16) maar zou ook consistent in de weergave moeten doorwerken.
- Impact op UX: klant kan niet in één oogopslag zien of 328 over het product gaat, over een specifieke verkoper, of een mix.
- Impact op ontwikkeling: gering — twee subsecties/tellers i.p.v. één samengevoegd getal.
- Voorstel: "Reviews"-tab opsplitsen in twee duidelijk gelabelde subsecties (Productreviews / Verkopersreviews per gekozen aanbieder), of in ieder geval het aantal per categorie apart tonen.

**F21 — Geen "meld onjuistheid"-actie op de pagina**
- Observatie: nergens op de pagina is een manier om onjuiste productinformatie te melden.
- Waarom dit beter kan: dit is een expliciet vastgelegd klantrecht (functionele spec sectie 1.2 sectie "Klant", H11.2) dat de Product Cloud-kwaliteit voedt — het ontbreekt volledig in dit wireframe.
- Impact op UX: gemiste kans om klant-gedreven datakwaliteit te faciliteren; functioneel gat t.o.v. vastgestelde rechten.
- Impact op ontwikkeling: gering — een kleine link/actie bij de specificaties-tab, gekoppeld aan een al bestaand meldingsmechanisme richting Product Cloud.
- Voorstel: "Onjuistheid melden"-link toevoegen bij het Specificaties-tabblad.

---

## 10. Consistentie met Product Cloud / Commerce Cloud

**F22 — Merknaam is geen link naar de Merkpagina**
- Observatie: "Producent: Merknaam BV" staat als statische badge, geen verwijzing naar scherm #19 (Merkpagina) uit de scherminventarisatie.
- Waarom dit beter kan: de Merkpagina bestaat al in de sitemap juist om merkbeleving en vertrouwen te versterken (`ux-architecture.md`, sectie 3.5) — deze badge is de meest logische toegangspoort ernaartoe en die kans wordt nu gemist.
- Impact op UX: gemiste navigatiemogelijkheid, minder merkbeleving.
- Impact op ontwikkeling: triviaal (link).
- Voorstel: Manufacturer Badge klikbaar maken, linkend naar de Merkpagina.

*(Zie ook F13, retourvoorwaarden ontbreken in de Commerce Cloud-vergelijking — inhoudelijk een Product/Commerce Cloud-datacompleetheidsissue, hierboven al opgenomen onder Buy Box-duidelijkheid.)*

---

## 11. Consistentie met de Buy Box-principes

Zie **F10, F11, F12** hierboven — dit zijn de drie zwaarste bevindingen van de hele review, omdat ze direct raken aan het in ADR/spec vastgelegde neutraliteitsprincipe (sectie 3.0: "de Buy Box dient altijd het belang van de klant", geen commerciële/redactionele suggestie). Aanvullend:

**F23 — Geen zichtbare bevestiging dat de weging configureerbaar/transparant is (ADR 0001)**
- Observatie: nergens op de klant-pagina wordt aangegeven wáárom deze aanbieder is geselecteerd (welke factoren meespelen).
- Waarom dit beter kan: ADR 0001 legt vast dat de weging configureerbaar is maar altijd actueel gepubliceerd wordt richting partners — dat is retailer-facing transparantie. Voor de klant is er geen equivalent, wat een gemiste kans is om vertrouwen te winnen ("waarom zie ik deze aanbieder als eerste?").
- Impact op UX: vermindert de uitlegbaarheid van het platform-mechanisme richting de klant, wat júist het onderscheidend vermogen is.
- Impact op ontwikkeling: gering — een info-icoon met korte uitleg (geen exacte percentages, die blijven intern/retailer-facing).
- Voorstel: klein "ⓘ"-element bij het Buy Box-label (na herziening van F10) dat in gewone taal uitlegt welke factoren meespelen, zonder exacte gewichten prijs te geven.

---

## 12. Technische haalbaarheid binnen Next.js + Medusa

**F24 — Buy Box-berekening moet server-side gebeuren, niet client-side**
- Observatie: het wireframe (en de interactienotitie) impliceert dat het wisselen van aanbieder in de tabel de Buy Box direct bijwerkt.
- Waarom dit beter kan: als deze logica in de browser wordt herberekend, kan een kwaadwillende gebruiker de scoreberekening manipuleren of omzeilen — de Buy Box-uitkomst moet **altijd** serverzijdig (custom Medusa-module) berekend en al voorzien van een "winnaar"-vlag aan de Next.js-frontend geleverd worden; de client toont uitsluitend het resultaat.
- Impact op UX: geen direct verschil zichtbaar voor de gebruiker, mits correct geïmplementeerd.
- Impact op ontwikkeling: architecturaal significant — bevestigt nogmaals (zie UX-architectuur, voorstel 9) dat dit als eerste technische spike gevalideerd moet worden, nu met een concrete eis: "winnaar"-bepaling en respons op aanbiederwissel lopen via een API-call, nooit puur client-side state.
- Voorstel: vastleggen als expliciete technische eis (ADR of aanvulling op de functionele spec) vóórdat de interactie wordt gebouwd: elke aanbiederwissel is een nieuwe, serverzijdig gevalideerde requestronde.

**F25 — Geselecteerde aanbieder moet in de URL zichtbaar zijn (deelbaarheid, terug-knop)**
- Observatie: er is geen voorstel voor hoe de keuze van een alternatieve aanbieder zich verhoudt tot de Next.js-route/URL.
- Waarom dit beter kan: zonder een URL-parameter (bijv. `?offer=retailer-y`) is een gekozen alternatieve aanbieding niet deelbaar, niet bookmarkbaar, en werkt de browser-terugknop niet intuïtief.
- Impact op UX: klant die een link deelt of terugkeert via de browserknop, ziet mogelijk weer de standaard Buy Box-winnaar in plaats van de eerder gekozen aanbieder.
- Impact op ontwikkeling: gering als nu meegenomen (Next.js `searchParams`), vervelend om achteraf toe te voegen.
- Voorstel: vastleggen dat aanbiederselectie een query-parameter wordt, niet uitsluitend lokale component-state.

---

## Samenvatting — zwaarte van de bevindingen

| Prioriteit | Bevindingen | Reden |
|---|---|---|
| **Kritiek — vóór definitief maken oplossen** | F10, F11, F12 (Buy Box-neutraliteit/jargon), F14 (geen mobiel wireframe), F24 (server-side Buy Box-berekening) | Raken direct aan het kernprincipe van de Buy Box (spec sectie 3.0), aan het Mobile First-uitgangspunt, of aan een architecturale integriteitsrisico |
| **Belangrijk** | F1, F5, F6, F8, F13, F20, F21, F25 | Functionele gaten t.o.v. Blueprint/spec, of reëel conversie-/vertrouwensrisico |
| **Verbetering** | F2, F3, F4, F7, F9, F15, F16, F17, F18, F19, F22, F23 | Versterkt kwaliteit, geen blokkerend risico |

---

## Openstaande vraag voor akkoord

Dit is uitsluitend de review — er is nog niets aangepast. Graag per bevinding (of per prioriteitsgroep) je akkoord, aanpassing, of afwijzing, zodat ik de verwerking in één keer correct doorvoer. Na akkoord verwerk ik de wijzigingen en beschouwen we de Productpagina als definitief; daarna gaan we verder met de Buy Box als afzonderlijk, dieper uitgewerkt interactiescherm.
