# EuropMade — Moderation Center: Functionele Specificatie (Sprint 1C)

**Status:** v1.1 — **definitief bevroren.** Verwerkt zes goedgekeurde bevindingen (F1, F2, F3, F4, F5, F6) uit de onafhankelijke functionele review; F7 en F8 bewust niet verwerkt, op uitdrukkelijk verzoek.
**Vierde onderdeel van Sprint 1C**, bouwt uitsluitend voort op de definitief bevroren Product Cloud Architecture (v1.1), Product Management (v1.1) en Admin Shell & Dashboard Framework (v1.1), plus Sprint 1A/1B (Authenticatie, Marketplace Core, RBAC).
**Basis:** Blueprint v2.1, Product Cloud Architecture Deel 4 (Producteigendom), Deel 5 (Product Matching) en Deel 9 (Moderatie) — bevroren, Product Management §5 (Moderation Workflow, op hoofdlijnen) — bevroren, Admin Shell §1.9 (module-registratiecontract) — bevroren, Marketplace Core §20 (API-overzicht) — bevroren.
**Scope:** de **volledige uitwerking** van wat Product Management §5 al op hoofdlijnen aankondigde als "Moderation Workflow" — dit document is de zelfstandige module die Admin Shell §1.2 al voorzag ("Moderation... als zelfstandige, uitgebreide module... nog niet gebouwd"). **Geen nieuwe onderliggende business-logica, geen nieuwe entiteiten, geen nieuwe API's** — dit document ontsluit uitsluitend wat al architecturaal vastligt, als concrete werkplek voor de Beheerder.
**Nadrukkelijk:** dit document wijzigt niets aan enig bevroren document. Verification Workflow (het verificatie-equivalent) is expliciet **geen** onderdeel van dit document — dat blijft een apart, nog te bouwen "Verification Center," analoog maar zelfstandig.

---

## 1. Doel en scope

### 1.1 Doel

Het Moderation Center is de centrale werkplek waar de Beheerder (in de al bevroren Moderator-persona, Admin Shell §4.1) elk moderatie-item beoordeelt dat de Product Cloud Architecture en Product Management al hebben gedefinieerd, maar waarvoor nog geen concrete werkomgeving bestond. Het is geen nieuw proces — het is de **eerste daadwerkelijke, zelfstandige module** die zich via het generieke registratiecontract (Admin Shell §1.9) in de Shell voegt.

### 1.2 Scope — expliciet afgebakend

**Wel:**
- Beoordeling van claims zonder identifier-match (Product Cloud Architecture Deel 4.4).
- **Beoordeling van eigendomsoverdrachten tussen twee reeds geverifieerde eigenaren, buiten een claim om (Route B)** (Deel 4.3) *(nieuw, verwerkt na de functionele review, F1)*.
- Beoordeling van matching-kandidaten/mogelijke duplicaten (Deel 5.1–5.2).
- Beslechting van geschillen/Disputes (Deel 4.5).
- Behandeling van fraude-signalen (Deel 9.3).
- Behandeling van meldingen door derde partijen (Deel 9.4).
- Beoordeling van hoog-risico publicatiewijzigingen (Product Management §4, die verwijst naar Product Cloud Architecture Deel 8.4 voor het onderliggende risicomodel, waar reviewwaardig).

**Niet:**
- **Verification Workflow** (productverificatie, Verified Made in Europe) — expliciet een apart onderwerp (Product Cloud Architecture Deel 7, Product Management §6), hier bewust niet meegenomen; wordt een zelfstandig "Verification Center," analoog aan dit document, later apart uitgewerkt.
- **Merge/Split-uitvoering zelf** — de **beoordeling** van een matching-kandidaat (leidt tot een besluit: mergen of niet) hoort hier; de **technische uitvoering** van een merge is al volledig vastgelegd (Deel 5.3–5.4) en wordt hier niet opnieuw beschreven, uitsluitend aangeroepen als resultaat van een beoordeling.
- **Product CRUD, versiebeheer** — blijft volledig Product Management.
- **Partnerbeheer (#55), Categorie-/filterbeheer (#61)** — afzonderlijke, nog niet gebouwde modules.

---

## 2. Moderatieproces

Eén, generiek proces voor elk itemtype, ongewijzigd t.o.v. wat al architecturaal vastligt:

1. **Item ontstaat** — een gebeurtenis in Product Cloud Architecture of Product Management creëert een moderatie-item (bijv. een claim zonder identifier-match, Deel 4.4 stap 3; een matching-kandidaat met onvoldoende AI-zekerheid, Deel 5.1 stap 3; een geëscaleerd geschil, Deel 4.5).
2. **Item verschijnt in de bijbehorende wachtrij** (sectie 3), in ontvangstvolgorde (al bevroren regel, Product Management §5).
3. **Beheerder opent het item** — detailweergave (sectie 4), inclusief AI-context waar van toepassing (nooit een vooraf ingevulde beslissing, Deel 9.1, ongewijzigd).
4. **Beheerder kiest een beschikbare actie** (sectie 5) — het itemtype bepaalt welke acties beschikbaar zijn, nooit een generieke, voor alle types identieke actieset.
5. **Uitkomst wordt vastgelegd** — AuditLogEntry (sectie 7) + eventuele notificatie aan de betrokken partij (al bevroren notificatiemechanisme, Admin Shell §1.7, Marketplace Core Notificatie-API).
6. **Item verlaat de wachtrij** — naar een itemtype-specifieke eindstatus (bijv. Goedgekeurd/Afgewezen voor een claim; Geëscaleerd voor een fraude-signaal, al vastgelegd in Product Management §5).

**Geen enkele stap in dit proces is nieuw** — dit document formaliseert uitsluitend de al bestaande stappen tot één samenhangende werkplek.

---

## 3. Wachtrijen

**Zeven wachtrijtypen** (bijgewerkt na de functionele review, F1 — was aanvankelijk zes; het aantal bleek onvolledig, zie hieronder), elk een directe, ongewijzigde toepassing van een al bevroren mechanisme:

| Wachtrij | Bron (bevroren) | Itemstatus bij binnenkomst | Itemstatus bij vertrek |
|---|---|---|---|
| **Claims** | Product Cloud Architecture Deel 4.4 — claim zonder identifier-match | In beoordeling | Goedgekeurd / Afgewezen |
| **Eigendomsoverdracht (Route B)** *(nieuw, verwerkt na de functionele review, F1)* | Deel 4.3 — overdracht tussen twee reeds geverifieerde eigenaren (bijv. bedrijfsovername), buiten een claim om | Ingediend | Goedgekeurd (nieuw OwnershipRecord) / Afgewezen |
| **Matching-kandidaten** | Deel 5.1–5.2 — AI-matching met onvoldoende zekerheid, of periodieke duplicaatdetectie | Kandidaat, onbeoordeeld | Merge uitgevoerd / Geen actie (bevestigd geen duplicaat) |
| **Geschillen (Disputes)** | Deel 4.5 — conflicterende claim, betwiste eigendomsoverdracht, of geëscaleerde melding | Open | Bevestiging huidige eigenaar / Overdracht / Tijdelijke terugzetting naar niet-geclaimd |
| **Fraude-signalen** | Deel 9.3 | Gesignaleerd | Geen actie / **Geëscaleerd** (lokaal eindpunt, al vastgelegd Product Management §5) |
| **Meldingen door derde partijen** | Deel 9.4 | Gemeld | Behandeld als Dispute, of als losse contentmoderatie-uitkomst, afhankelijk van aard (al vastgelegd) |
| **Hoog-risico publicatiewijzigingen** | Product Cloud Architecture Deel 8.4 (correctie tijdens de interne verwijzingscontrole — niet Product Management §8.4, wat een ander onderwerp betreft) — compliance-veld, categoriewijziging, kernidentiteitsveld | In review | Goedgekeurd (→ Gepubliceerd na eigenaar-actie) / Afgewezen (→ terug naar Concept) |

**Toelichting bij de nieuwe wachtrij "Eigendomsoverdracht (Route B)" (F1):** Deel 4.3 legt expliciet vast dat een overdracht tussen twee reeds geverifieerde eigenaren **altijd** een handmatige Beheerder-goedkeuring vereist, ongeacht hoe overtuigend het bewijs lijkt — ook wanneer er geen sprake is van een geschil. Dit scenario werd in de vorige versie van dit document ten onrechte niet als eigen wachtrij herkend (het werd alleen impliciet via de Geschillen-wachtrij gedekt, en dan uitsluitend voor het uitzonderingsgeval "bij een geschil/onbereikbare voormalige eigenaar," Deel 4.3). **Geen nieuwe entiteit, geen nieuwe API:** deze wachtrij gebruikt het al bestaande OwnershipRecord (Deel 4.3) en de al bevroren Claim-/eigenaarschap-API, die expliciet al "overdracht" als functie noemt (Marketplace Core §20) — uitsluitend een ontbrekende operationele toegangspoort tot een al architecturaal vastgelegd proces, geen nieuwe architectuur.

**Sortering:** elke wachtrij toont items van oud naar nieuw (ontvangstvolgorde) — al vastgelegde regel, geen kunstmatige, per-item afwijkende prioritering in de MVP (Product Cloud Architecture Deel 4.4, Product Management §5).

**Koppeling met de Admin Shell:** elke wachtrij levert, via het module-registratiecontract (Admin Shell §1.9), een **Wachtrij-samenvatting-widget** (aantal + label + deep link) aan het dashboard — het Moderation Center zelf blijft de enige plek waar de wachtrijinhoud daadwerkelijk getoond wordt, consistent met de al bevroren regel dat de Shell nooit wachtrijinhoud herimplementeert (Admin Shell §2.5).

---

## 4. Detailweergave van een moderatie-item

**Generiek formaat, ongeacht wachtrijtype** — elk item toont:

1. **Context:** wat voor item dit is (claim/matching/geschil/fraude/melding/publicatiewijziging), en op welk Product/Claim/Dispute het betrekking heeft, met een deep link naar het onderliggende record (bijv. het productdetail in Product Management).
2. **Bewijs/onderbouwing:** de door de indiener aangeleverde gegevens — bij een claim bijvoorbeeld het productspecifieke bewijs (Deel 4.4 stap 2); bij matching de vergelijking tussen kandidaten (Deel 5.5); bij een hoog-risico wijziging het oude versus nieuwe veld (Product Management §4, versievergelijking).
3. **AI-context** (waar van toepassing): een samenvatting of aanbeveling, **nooit een vooraf ingevulde beslissing** — exact het al bevroren onderscheid (Deel 9.1: AI ondersteunt, beslist nooit).
4. **Historie:** een directe link naar de relevante AuditLogEntry-tijdlijn (Deel 3.1/8.5) van het betrokken Product/Claim — zodat een eerdere, gerelateerde gebeurtenis (bijv. een eerdere afwijzing van dezelfde claim) direct zichtbaar is zonder de detailweergave zelf op te blazen met historische data.
5. **Beschikbare acties** (sectie 5) — itemtype-specifiek, nooit een universele actieset.

---

## 5. Beschikbare moderatieacties

Per itemtype, **exact de acties die al architecturaal zijn vastgelegd** — dit document introduceert geen enkele nieuwe actie:

| Itemtype | Acties | Bron |
|---|---|---|
| Claim | Goedkeuren, Afwijzen (met verplichte reden) | Deel 4.4 |
| **Eigendomsoverdracht (Route B)** *(nieuw, F1)* | Goedkeuren (nieuw OwnershipRecord), Afwijzen (met verplichte reden) | Deel 4.3 |
| Matching-kandidaat | Merge uitvoeren (roept de al bevroren mergemechaniek aan, Deel 5.3), Geen actie | Deel 5.1–5.3 |
| Geschil | Bevestiging huidige eigenaar, Overdracht naar betwistende partij, Tijdelijke terugzetting naar niet-geclaimd | Deel 4.5 |
| Fraude-signaal | Geen actie, Geëscaleerd (naar partneraccount-niveau — buiten deze module, Partner Lifecycle Management, bewust niet in MVP-scope) | Deel 9.3, Product Management §5 |
| Melding | Zelfde acties als Geschil, of een losse "Afgehandeld, geen overtreding"-uitkomst bij een puur contentmoderatie-melding | Deel 9.4 |
| Hoog-risico publicatiewijziging | Goedkeuren, Afwijzen (terug naar Concept, met reden) | Product Cloud Architecture Deel 8.4 |

**Correctie na de functionele review (F2):** de eerdere versie van dit document vermeldde ook "Aanvullende informatie vereist" als claimactie. Bij controle bleek deze status voor Claims **niet aantoonbaar vastgelegd** in Deel 4.4 — die sectie noemt de term uitsluitend analoog ("zelfde principe als... uit Partner Onboarding," "zelfde motivatie als...") ter onderbouwing van de al wél bestaande Afwijzings- en Herbeoordelingsregels, nooit als een eigen, formele claimstatus. De status bestaat formeel uitsluitend voor Verificatie (Deel 7.3, waar dit expliciet als hergebruik wordt benoemd) — niet voor Claims. Hierbij verwijderd als claimactie; het bestaande Afwijzing + Herbeoordeling/beroep-mechanisme (Deel 4.4 stap 5–6, ongewijzigd) blijft de enige, al bevroren route voor een claim die aanvulling behoeft.

**Elke actie is definitief voor dat specifieke item** — een actie kan niet worden teruggedraaid vanuit het Moderation Center zelf; een correctie loopt via de al bevroren herbeoordelings-/beroepsmechanismen (bijv. een afgewezen claim opnieuw indienen, Deel 4.4 stap 6), niet via een "ongedaan maken"-knop in deze module.

---

## 6. Beslisregels

Uitsluitend hergebruikte, al bevroren regels — geen nieuwe:

- **Identifier-match bij een claim is altijd automatisch, bereikt het Moderation Center nooit** (Deel 4.4 stap 3) — dit document ziet uitsluitend de claims die al buiten die automatische afhandeling vielen.
- **Twee gelijktijdige claims op hetzelfde product worden nooit als twee losse claims behandeld — altijd een Geschil** (Deel 4.4 stap 4).
- **Een eigendomsoverdracht tussen twee reeds geverifieerde eigenaren vereist altijd een handmatige Beheerder-goedkeuring, ongeacht hoe overtuigend het bewijs lijkt** (Deel 4.3, nieuw expliciet vastgelegd in deze module — F1) — dit onderscheidt Route B nadrukkelijk van een gewone Claim: er is al een bestaande, geverifieerde eigenaar die iets ontnomen wordt, dus geen automatische goedkeuring, ook niet bij een sterk overeenkomende identifier.
- **AI beslist nooit** — op geen van de **zeven** wachtrijtypen (Deel 9.1, herbevestigd; correctie na de functionele review, F3 — was eerder onjuist als "vijf" vermeld terwijl dit document er zeven definieert, zie sectie 3).
- **Drie of meer afgewezen claimpogingen door dezelfde partij op hetzelfde product escaleren automatisch naar een fraude-signaal** (Deel 4.4 stap 6) — het Moderation Center ontvangt dit signaal, genereert het niet zelf.
- **Een merge trekt de Verified-status van beide betrokken producten in** (Deel 5.3/B8) — de Beheerder ziet deze consequentie **vooraf getoond** bij het uitvoeren van een merge-actie, als directe weergave van wat Deel 5.3 al vastlegt (correctie na de functionele review, F4 — de eerdere versie verwees hier abusievelijk naar een niet-bestaande sectie "Admin Shell §12.2"; Admin Shell telt maximaal elf secties. Dit is geen aparte UX-eis uit een ander document, uitsluitend de rechtstreekse, noodzakelijke zichtbaarheid van een al in Deel 5.3 vastgelegd gevolg op het moment dat de Beheerder de actie uitvoert).
- **Een geëscaleerd fraude-signaal krijgt een lokaal eindpunt binnen dit Moderation Center** ("Geëscaleerd") — de eventuele vervolgafhandeling op partneraccount-niveau valt buiten deze module (Product Management §5, B-PM6, ongewijzigd).

---

## 7. Auditregistratie

Elke moderatiebeslissing schrijft, **zonder uitzondering — inclusief "Geen actie"** (F6, nieuw expliciet vastgelegd na de functionele review: ook een bewuste beoordeling die tot geen ingreep leidt, is zelf een beslissing en blijft daarmee onderworpen aan het al bevroren "nooit een stille overschrijving"-principe, Product Cloud Architecture Deel 1.1 — een item verlaat een wachtrij dus nooit spoorloos) — een regel in de al bevroren, centrale **AuditLogEntry** (Product Cloud Architecture Deel 3.1/8.5): wie besliste, tijdstip, welk item, welke actie, en de reden (bij Afwijzen/Overdracht altijd een verplicht tekstveld, nooit optioneel; bij Goedkeuren/Geen actie is een reden niet verplicht, maar de beslissing zelf wordt evengoed gelogd). Dit is consistent met het al bevroren principe dat een negatieve of ingrijpende beslissing nooit zonder reden wordt vastgelegd — **correctie na de functionele review (F5):** de eerdere versie van dit document verwees hier abusievelijk naar "Product Management §2.8A," een sectie die in dat document niet bestaat. Het juiste, al bevroren precedent voor dit patroon is **Partner Onboarding, sectie 2.8A** ("Status Aanvullende informatie vereist") — hierbij gecorrigeerd naar de daadwerkelijke bron. Het Moderation Center **voegt geen nieuwe auditstructuur toe** — het is uitsluitend de plek waar deze al bestaande verplichting wordt vervuld.

---

## 8. Rechten en zichtbaarheid

- **Uitsluitend de Beheerder-rol** heeft toegang tot het Moderation Center, in de al bevroren **Moderator-weergavepersona** (Admin Shell §4.1) — geen nieuwe rol, geen nieuwe RBAC-regel.
- **Producent, Retailer en Distributeur hebben geen enkele toegang** tot het Moderation Center zelf — zij ontvangen uitsluitend de al bevroren, gerichte notificaties over de uitkomst van hun eigen ingediende item (claim-uitkomst, wijzigingsvoorstel-uitkomst — Product Management §7/B-PM7, ongewijzigd).
- **Contract-gebaseerde zichtbaarheid in de Admin Shell:** het Moderation Center registreert zich met `permissie: Beheerder` (Admin Shell §1.9) — het hoofdmenu-item is uitsluitend zichtbaar voor die rol, exact volgens het al bevroren, generieke filterprincipe (Admin Shell §4.2), zonder dat de Shell de module verder kent.

---

## 9. API-gebruik — uitsluitend hergebruik van bestaande contracten

**Geen nieuwe API, geen nieuwe database-entiteit** — getoetst en bevestigd, zie sectie 10.

| Moderation Center-functie | Bestaande API/entiteit (ongewijzigd) |
|---|---|
| Claims-wachtrij, claimbeoordeling | **Claim-/eigenaarschap-API** (Marketplace Core §20) |
| **Eigendomsoverdracht (Route B)-wachtrij, beoordeling** *(nieuw, F1)* | **Claim-/eigenaarschap-API** (Marketplace Core §20 — deze dienst noemt "overdracht" al expliciet als functie, hergebruikt zonder wijziging) |
| Matching-kandidaten, merge-uitvoering | **Product Cloud API** (matching/merge, zoals al toegepast in Product Management §10) |
| Geschillen, fraude-signalen, meldingen | **Admin-moderatie-API** (Marketplace Core §20) |
| Hoog-risico publicatiewijzigingen | **Wijzigingsvoorstel-API** / **Product Cloud API** (Product Management §10) |
| AI-context per item | **AI-validatie-API** (Marketplace Core §20) |
| Auditregistratie | **Product Cloud API** (AuditLogEntry, Product Cloud Architecture Deel 3.1) |
| Notificatie aan betrokken partij | **Notificatie-API** (Marketplace Core §20) |

**Module-registratie bij de Admin Shell (concreet voorbeeld van het al bevroren contract, Admin Shell §1.9), ter illustratie van correcte aansluiting zonder enige Shell-wijziging:**

```
naam: "Moderation Center"
route: /admin/moderation
icoon: (Design System-icoon, generiek — geen nieuw icoon nodig)
permissie: Beheerder
navigatiepositie: (naast overige Beheerder-modules)
beschikbare widgets: 7× Wachtrij-samenvatting-widget (één per wachtrijtype, sectie 3)
KPI's: optioneel — bijv. totaal aantal openstaande items over alle wachtrijen (indien gewenst, kant-en-klaar berekend dóór deze module, nooit door de Shell)
notificatietypen: n.v.t. (dit is de ontvangende, niet de genererende kant van claim-/verificatie-notificaties)
taken: optioneel — bijv. "3 claims wachten langer dan 2 werkdagen" (kant-en-klaar geformuleerd door deze module)
deep links: naar elk individueel wachtrij-item vanuit een zoekresultaat of notificatie elders in het platform
```

**Consistent met de al bevroren regel (Admin Shell §8):** de Shell roept nooit een van bovenstaande API's rechtstreeks aan — het Moderation Center gebruikt ze zelf, en levert uitsluitend het resultaat via het contract.

---

## 10. Architectuurcontrole

- ✓ **Blueprint-consistent** — geen enkel proces wijkt af van wat al vastligt (H9.7–9.8, geschillen-/moderatiebeginselen).
- ✓ **Product Cloud Architecture-consistent** — geen enkele entiteit, status of regel uit Deel 4/5/9 gewijzigd; dit document ontsluit uitsluitend wat daar al staat — nu vollediger dan voorheen, met de toegevoegde Route B-wachtrij (Deel 4.3, F1) die eerder ten onrechte ontbrak.
- ✓ **Product Management-consistent** — de wachtrij-tabel (sectie 3) is een directe, ongewijzigde uitwerking van Product Management §5; geen dubbele functionaliteit — CRUD/versiebeheer blijven volledig in Product Management.
- ✓ **Admin Shell-consistent** — het Moderation Center registreert zich uitsluitend via het al bevroren generieke contract (sectie 9); geen enkele Shell-wijziging nodig of voorgesteld. De eerder foutieve verwijzing naar een niet-bestaande Admin Shell-sectie (F4) is gecorrigeerd.
- ✓ **Marketplace Core-consistent** — alle API's hergebruikt zoals al benoemd (§20), geen nieuwe dienst; de nieuwe Route B-wachtrij hergebruikt de al bestaande, expliciet "overdracht" noemende Claim-/eigenaarschap-API.
- ✓ **RBAC-consistent** — uitsluitend de bestaande Beheerder-rol, in de al bevroren Moderator-persona; geen nieuwe rol.
- ✓ **MVP-consistent** — Verification Workflow, Partner Lifecycle Management-escalatie, en Merge/Split-uitvoeringsmechaniek zijn expliciet buiten scope gehouden of als kruisverwijzing behandeld, niet zelf (opnieuw) uitgewerkt. De toegevoegde Route B-wachtrij is geen scope-uitbreiding — het is een al bevroren, verplicht Beheerder-proces (Deel 4.3) dat abusievelijk zonder wachtrij was gebleven.
- ✓ **Geen wijziging aan bevroren documenten** — bevestigd, zie de eindrapportage bij oplevering.
- ✓ **Functionele review verwerkt** — zes bevindingen (F1, F2, F3, F4, F5, F6) volledig verwerkt: F1 (Route B-wachtrij toegevoegd, sectie 3/5/6/9), F2 (niet-onderbouwde "Aanvullende informatie vereist"-claimactie verwijderd, sectie 3/5), F3 (rekenfout "vijf" naar "zeven" gecorrigeerd, sectie 6), F4 (foutieve Admin Shell-verwijzing gecorrigeerd, sectie 6), F5 (foutieve Product Management-verwijzing gecorrigeerd naar Partner Onboarding sectie 2.8A, sectie 7), F6 ("Geen actie" expliciet ook auditeerbaar vastgelegd, sectie 7). F7 en F8 bewust niet verwerkt, op uitdrukkelijk verzoek.
- ✓ **Aanvullende bevinding tijdens de verplichte interne verwijzingscontrole (niet in de oorspronkelijke F-lijst, maar wel gevonden en gecorrigeerd conform de opdracht "controleer alle interne verwijzingen"):** drie citaties naar "Product Management §8.4" bleken onjuist — dat onderwerp (Reviewproces, gedifferentieerd naar risico) staat daadwerkelijk in **Product Cloud Architecture Deel 8.4**, niet in Product Management (waar §8 over zoek-/filter-/bulkacties gaat). Gecorrigeerd op alle drie de plekken (sectie 1.2, 3, 5).

---

## 11. Zelfreview

- **Introduceert dit document, ook ná de verwerking, ergens een nieuwe entiteit of API?** Getoetst: nee. De nieuwe Route B-wachtrij (F1) gebruikt uitsluitend het al bestaande OwnershipRecord en de al bestaande, "overdracht" expliciet noemende Claim-/eigenaarschap-API — geen enkele nieuwe database-entiteit of dienst.
- **Is F2 correct beoordeeld, niet te snel afgedaan of te snel verworpen?** Expliciet herlezen: Deel 4.4 noemt "Aanvullende informatie vereist" op twee plekken, beide keren uitdrukkelijk als vergelijking ("zelfde principe als," "zelfde motivatie als") ter onderbouwing van al bestaande regels (Afwijzing, Herbeoordeling-zonder-limiet) — nooit als eigen, formeel vastgelegde claimstatus. Dat onderscheid (analogie versus formele vastlegging) is doorslaggevend geweest voor de beslissing dit te verwerken.
- **Is de nieuwe Route B-wachtrij zelf weer consistent doorgevoerd op alle relevante plekken, niet alleen in sectie 3?** Gecontroleerd: sectie 1.2 (scope), sectie 3 (wachtrij), sectie 5 (acties), sectie 6 (beslisregel), sectie 9 (API-mapping en widget-aantal) — overal consistent bijgewerkt, geen plek waar de oude, onvolledige telling is blijven staan.
- **Zijn alle gecorrigeerde verwijzingen (F4, F5) nu naar daadwerkelijk bestaande secties?** Herbevestigd: Admin Shell telt elf secties (§1–§11), de verwijzing naar §12.2 is volledig verwijderd, niet vervangen door een andere gok. Partner Onboarding sectie 2.8A is geverifieerd te bestaan (het document dat oorspronkelijk de "Aanvullende informatie vereist"-status introduceerde).

**Dit document is hierbij DEFINITIEF BEVROREN.**
