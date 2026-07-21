# EuropMade — Verification Center: Functionele Specificatie (Sprint 1C)

**Status:** v1.1 — **definitief bevroren.** Verwerkt twee goedgekeurde bevindingen (V1, V2) uit de onafhankelijke functionele review; V3, V4 en V5 bewust niet verwerkt, op uitdrukkelijk verzoek.
**Vijfde onderdeel van Sprint 1C**, bouwt uitsluitend voort op de definitief bevroren Product Cloud Architecture (v1.1), Product Management (v1.1), Admin Shell & Dashboard Framework (v1.1) en Moderation Center (v1.1), plus Sprint 1A/1B (Authenticatie, Partner Onboarding, Marketplace Core, RBAC).
**Basis:** Blueprint v2.1, Product Cloud Architecture Deel 7 (Verified Made in Europe, §7.1–7.6) — bevroren, Product Management §6 (Verification Workflow, op hoofdlijnen) — bevroren, Admin Shell §1.9 (module-registratiecontract) en §4.2 (contract-gebaseerd rechtenmodel) — bevroren, Partner Onboarding Stap 3 (reviewer-checklist-patroon, bewijsstukken) — bevroren, Marketplace Core §20 (API-overzicht) — bevroren.
**Scope:** de **volledige uitwerking** van wat Product Management §6 al op hoofdlijnen aankondigde als "Verification Workflow" — de zelfstandige Admin Shell-module die Product Cloud Architecture Deel 7.1 en Admin Shell §1.2 al voorzagen als apart, toekomstig "Verification Center." **Geen nieuwe onderliggende business-logica, geen nieuwe entiteiten, geen nieuwe API's** — dit document ontsluit uitsluitend wat al architecturaal vastligt, als concrete werkplek voor de Beheerder.
**Nadrukkelijk:** dit document wijzigt niets aan enig bevroren document. **Verification Center bevat geen moderatiefunctionaliteit** (claims, matching, geschillen, fraude-signalen, meldingen, hoog-risico publicatiewijzigingen blijven volledig in het bevroren Moderation Center) en **geen Product Management-functionaliteit** (CRUD, versiebeheer blijven volledig in Product Management). Deze twee grenzen worden in dit document nergens overschreden.

---

## 1. Doel en scope

### 1.1 Doel

Het Verification Center is de centrale werkplek waar de Beheerder productverificatie-aanvragen ("Verified Made in Europe," productniveau) beoordeelt — het volledig uitgewerkte, zelfstandige equivalent van het al bevroren Moderation Center, voor exact het onderwerp dat daar expliciet buiten scope werd gehouden (Moderation Center §1.2: *"Verification Workflow... wordt een zelfstandig 'Verification Center,' analoog aan dit document, later apart uitgewerkt"*). Dit document is die aangekondigde, latere uitwerking.

### 1.2 Scope — expliciet afgebakend

**Wel:**
- Beoordeling van productverificatie-aanvragen (Product Cloud Architecture Deel 7.3).
- Periodieke hercontrole-items (Deel 7.5).
- Intrekkingsgevallen die menselijke bevestiging vereisen (Deel 7.6).

**Niet:**
- **Bedrijfsverificatie (Laag 1)** — blijft volledig binnen Partner Onboarding (Stap 3); dit document behandelt uitsluitend Laag 2 (productniveau), en toetst bij elke aanvraag uitsluitend of Laag 1 al geslaagd is (Deel 7.1, harde afhankelijkheid, ongewijzigd) — het voert die toets nooit zelf opnieuw uit.
- **Moderatiefunctionaliteit** — claims, matching-kandidaten, geschillen, fraude-signalen, meldingen, hoog-risico publicatiewijzigingen blijven volledig in het bevroren Moderation Center (v1.1). Een fraude-signaal dat *voortkomt* uit een verificatiebeoordeling (bijv. een herhaald onjuiste productieclaim) wordt door dit document **doorgegeven**, nooit zelf behandeld — zie sectie 6.
- **Product Management-functionaliteit** — CRUD, publicatiestatusbeheer, versiebeheer blijven volledig in Product Management (v1.1). Dit document toetst uitsluitend of een product zich in publicatiestatus "Gepubliceerd" bevindt (voorwaarde, Deel 7.3) — het wijzigt die status nooit zelf.
- **Shell-functionaliteit** — het Verification Center implementeert geen navigatie, dashboard-mechaniek of componenten; het registreert zich uitsluitend via het al bevroren, generieke modulecontract (sectie 9), exact zoals het Moderation Center dat al deed.

---

## 2. Verificatieworkflow

Eén, generiek proces, volledig hergebruikt uit Product Cloud Architecture Deel 7.3–7.6 en Product Management §6 — geen nieuwe stap:

1. **Aanvraag** — een Producent/Merkhouder dient een verificatie-aanvraag in op een eigen product (Product Management-functionaliteit, buiten dit document); de aanvraag bereikt het Verification Center uitsluitend wanneer de twee preconditie-toetsen (geslaagde bedrijfsverificatie, publicatiestatus "Gepubliceerd," Deel 7.3) al server-side geslaagd zijn — een aanvraag die daar niet aan voldoet, bestaat voor dit document niet.
2. **Item verschijnt in de wachtrij** (sectie 3), gekoppeld aan de specifieke ProductVersion die op het moment van indienen de Gepubliceerde versie was (Deel 7.3, versiebinding).
3. **Beheerder opent het item** — detailweergave (sectie 4), inclusief AI-context (Deel 7.4: AI ondersteunt, beslist nooit).
4. **Beheerder kiest een beschikbare actie** (sectie 5).
5. **Uitkomst wordt vastgelegd** — AuditLogEntry (sectie 7) + notificatie aan de Producent (al bevroren mechanisme, hergebruikt).
6. **Item verlaat de wachtrij** naar een eindstatus: Geverifieerd, Afgewezen, of terug naar "Aangevraagd" bij Aanvullende informatie vereist (Deel 7.3, ongewijzigd statusmodel).

**Periodieke hercontrole (Deel 7.5) en intrekking (Deel 7.6) volgen hetzelfde proces**, met als enige verschil de trigger: niet een nieuwe aanvraag van de Producent, maar een systeemgegenereerd item bij het verstrijken van de 6-maandelijkse cyclus, een directe waarschuwing (verlopen certificaat), of een vanuit Moderation Center doorverwezen bevinding (bijv. een geconstateerde onjuiste claim, Deel 9.3) die de verificatiestatus raakt.

---

## 3. Wachtrijen

**Twee wachtrijtypen** — bewust minder dan het Moderation Center (zeven), omdat Verification een enkelvoudig, samenhangend proces betreft in plaats van meerdere, wezenlijk verschillende moderatiescenario's:

| Wachtrij | Bron (bevroren) | Itemstatus bij binnenkomst | Itemstatus bij vertrek |
|---|---|---|---|
| **Nieuwe verificatie-aanvragen** | Deel 7.3 — Aangevraagd, na geslaagde preconditietoets | Aangevraagd → In beoordeling | Geverifieerd / Afgewezen / (Aanvullende informatie vereist → terug naar Aangevraagd, geen aparte wachtrij) |
| **Periodieke hercontrole & intrekkingsgevallen die menselijke beoordeling vereisen** | Deel 7.5 (6-maandelijkse cyclus of directe trigger), Deel 7.6 — **uitsluitend** de triggers die zelf geen automatische intrekking zijn: mislukte periodieke hercontrole, geconstateerde onjuiste claim (fraudedetectie), verlopen compliance-document, geëscaleerd geschil | Hercontrole vereist / Mogelijke intrekking | Geverifieerd (bevestigd) / Ingetrokken |

**Correctie na de functionele review (V2) — welke intrekkingstriggers wél en welke nooit in deze wachtrij terechtkomen:** Deel 7.6 noemt zes triggers voor intrekking. Daarvan zijn **rollback naar een niet-geverifieerde versie** (Deel 8.6, B2) en **merge** (Deel 5.3, B8) al elders expliciet vastgelegd als **volledig automatisch** — het badge verdwijnt daar onmiddellijk, zonder enige Beheerder-beslissing, uitgevoerd door het al bevroren mechanisme zelf (Deel 8.6/5.3). Deze twee triggers verschijnen daarom **nooit** als item in deze wachtrij — er is niets te beoordelen, de intrekking is bij binnenkomst van het gegeven al voltooid. De overige vier triggers (mislukte hercontrole, fraudedetectie, verlopen document, geëscaleerd geschil) vereisen wél een expliciete Beheerder-beoordeling (Deel 7.6: "nooit stilzwijgend... het recht op een herbeoordeling") en zijn daarom de **enige** bron voor deze wachtrij, naast de reguliere 6-maandelijkse hercontrole (Deel 7.5).

**Sortering:** ontvangstvolgorde (oud naar nieuw) binnen elke wachtrij — zelfde, al bevroren regel als het Moderation Center (Product Cloud Architecture Deel 4.4, hergebruikt), geen kunstmatige prioritering in de MVP.

**Waarom geen aparte wachtrij voor "Aanvullende informatie vereist":** deze status is, zoals in Deel 7.3 expliciet vastgelegd, een tussenstap binnen "In beoordeling" — geen eigen eindstatus die de wachtrij verlaat, maar een terugkeer naar "Aangevraagd" in afwachting van de Producent. Het item keert vanzelf terug in de wachtrij "Nieuwe verificatie-aanvragen" zodra de Producent heeft aangevuld — geen derde wachtrij nodig.

**Koppeling met de Admin Shell:** elke wachtrij levert, via het module-registratiecontract (Admin Shell §1.9), een **Wachtrij-samenvatting-widget** (aantal + label + deep link) aan het dashboard — het Verification Center blijft de enige plek waar de wachtrijinhoud daadwerkelijk getoond wordt (Admin Shell §2.5, ongewijzigd toegepast, zelfde grens als bij het Moderation Center).

---

## 4. Detailweergave van een verificatie

**Generiek formaat, consistent met het al bevroren Moderation Center-patroon (analoog, niet gekopieerd — dit is geen moderatie-item):**

1. **Context:** het betrokken Product, de specifieke ProductVersion waarop de aanvraag is gebaseerd (Deel 7.3, versiebinding), en de Producent/Merkhouder — met een deep link naar het productdetail in Product Management.
2. **Bedrijfsverificatie-status:** een directe bevestiging dat Laag 1 (Partner Onboarding) geslaagd is, met de datum van laatste bedrijfsniveau-hercontrole — uitsluitend ter referentie, dit document voert die toets nooit zelf uit (sectie 1.2).
3. **Bewijsstukken:** het productspecifieke productiebewijs (indien afwijkend van het onboarding-profiel) en de categorie-verplichte compliance-documentatie (Deel 7.3) — hergebruikt hetzelfde CMP-041 File Upload-weergavepatroon dat al bij Partner Onboarding en Product Management is vastgesteld, geen nieuw component.
4. **Reviewer-checklist:** de al bevroren checklist uit Deel 7.4 (hergebruikt van Partner Onboarding Stap 3): komt de productinformatie overeen met het bewijsstuk, is de productieclaim consistent met het onboarding-profiel, zijn categorie-verplichte documenten aanwezig en logisch.
5. **AI-context:** een samenvatting/vergelijking tussen opgegeven productiedata en bekende bedrijfsgegevens — **nooit een vooraf ingevulde beslissing** (Deel 7.4, Blueprint H9.7, ongewijzigd).
6. **Historie:** een directe link naar de relevante AuditLogEntry-tijdlijn (Deel 3.1/8.5) van het betrokken Product — eerdere verificatiepogingen, eerdere intrekkingen, direct zichtbaar.
7. **Beschikbare acties** (sectie 5).

---

## 5. Beschikbare verificatieacties

Exact de acties die Deel 7.3/7.6 al vastleggen — geen nieuwe actie:

| Situatie | Acties | Bron |
|---|---|---|
| Nieuwe aanvraag, In beoordeling | Geverifieerd (badge actief, gebonden aan de beoordeelde ProductVersion), Afgewezen (met verplichte reden), Aanvullende informatie vereist (met verplicht, specifiek verzoek) | Deel 7.3 |
| Periodieke hercontrole | Geverifieerd (bevestigd — geen wijziging), Ingetrokken (met verplichte reden) | Deel 7.5 |
| Directe trigger die menselijke beoordeling vereist (mislukte hercontrole, fraudedetectie, verlopen compliance-document, geëscaleerd geschil) *(verduidelijkt na de functionele review, V2)* | Ingetrokken (met verplichte reden) | Deel 7.6 |

**Elke actie is definitief voor dat specifieke item** — zelfde, al bevroren principe als het Moderation Center (geen "ongedaan maken"-knop); een correctie loopt via de al bevroren herbeoordelingsroute (afgewezen of ingetrokken opnieuw aanvragen, Deel 7.3/7.6, ongewijzigd).

---

## 6. Beslisregels

Uitsluitend hergebruikte, al bevroren regels — geen nieuwe:

- **Bedrijfsverificatie (Laag 1) is een harde, niet-herbeoordeelbare voorwaarde binnen dit document** (Deel 7.1) — een aanvraag zonder geslaagde Laag 1 bereikt het Verification Center nooit; dit document heeft geen bevoegdheid om Laag 1 zelf te beoordelen of te herzien.
- **AI beslist nooit** — op geen van de twee wachtrijtypen (Deel 7.4, Blueprint H9.7, herbevestigd).
- **Verified-status is altijd gebonden aan één specifieke ProductVersion** (Deel 7.3, B2) — een rollback of merge die de gepubliceerde versie wijzigt, trekt de Verified-status **volledig automatisch** in (Deel 8.6, Deel 5.3/B8), zonder enige Beheerder-beslissing. **Correctie na de functionele review (V2):** de eerdere versie van dit document suggereerde hier ten onrechte dat dit een "systeemgegenereerd hercontrole-/aanvraagitem" in de wachtrij van dit document zou opleveren — dat is onjuist en hierbij rechtgezet. Een rollback- of merge-intrekking bereikt de wachtrij van het Verification Center **nooit**: de intrekking is bij het optreden van de gebeurtenis al voltooid door het al bevroren mechanisme zelf (inclusief de al bevroren, verplichte melding aan de Producent, Deel 7.6), en de Producent kan — indien gewenst — via de gewone route een geheel nieuwe aanvraag indienen, die dan wél normaal in de wachtrij "Nieuwe verificatie-aanvragen" (sectie 3) terechtkomt.
- **Een intrekking die menselijke beoordeling vereist (mislukte hercontrole, geconstateerde onjuiste claim/fraudedetectie Deel 9.3, verlopen compliance-document, geëscaleerd geschil) komt wél in de wachtrij van dit document terecht** *(verduidelijkt na de functionele review, V2, ter onderscheiding van de vorige regel)* — dit zijn de vier triggers uit Deel 7.6 die zelf geen automatische intrekking zijn en dus daadwerkelijk een Beheerder-beoordeling vergen (sectie 3, sectie 5).
- **Een intrekking die voortkomt uit een moderatiebevinding (bijv. Deel 9.3, fraudedetectie) wordt door het Moderation Center gesignaleerd, niet door het Verification Center zelf onderzocht** — dit document voert uitsluitend de verificatiebeoordeling/intrekking zelf uit, het beoordeelt nooit een claim, geschil of fraudesignaal (harde grens, sectie 1.2, consistent met de opdracht-eis "Verification bevat geen moderatiefunctionaliteit").
- **Periodieke hercontrole volgt dezelfde 6-maandelijkse cadans op alle drie de niveaus** (bedrijf, product) — één samenhangend hercontrolesysteem, geen aparte klok voor dit document (Deel 7.5, ongewijzigd).
- **Geen actie is zelf ook een beslissing en wordt gelogd** — consistent met het al bevroren, platformbrede "nooit een stille overschrijving"-principe (Deel 1.1), zelfde toepassing als bij het Moderation Center (sectie 7).

---

## 7. Auditregistratie

Elke verificatiebeslissing schrijft, zonder uitzondering — inclusief een bevestigde hercontrole zonder wijziging — een regel in de al bevroren, centrale **AuditLogEntry** (Product Cloud Architecture Deel 3.1/8.5): wie besliste, tijdstip, welk item, welke actie, en de reden (bij Afwijzen/Ingetrokken/Aanvullende informatie vereist altijd een verplicht tekstveld, nooit optioneel). Het Verification Center **voegt geen nieuwe auditstructuur toe** — het is uitsluitend de plek waar deze al bestaande verplichting wordt vervuld, exact zoals het Moderation Center dat al deed voor moderatiebeslissingen.

---

## 8. Rechten en zichtbaarheid

- **Uitsluitend de Beheerder-rol** heeft toegang tot het Verification Center, in de al bevroren **Verificatie-reviewer-weergavepersona** (Admin Shell §4.1) — geen nieuwe rol, geen nieuwe RBAC-regel. Dit is dezelfde Beheerder-rol als bij Moderation Center, uitsluitend een andere, taakgerichte weergavefilter binnen die ene rol.
- **Producent/Merkhouder heeft geen enkele toegang tot het Verification Center zelf** — uitsluitend tot de eigen aanvraagstatus binnen Product Management (§6, ongewijzigd) en de al bevroren, gerichte notificaties over de uitkomst.
- **Retailer en Distributeur hebben geen enkele rol binnen Verification** — consistent met de bevroren rechtenmatrix, waar Verified-aanvragen uitsluitend een Producent/Merkhouder-recht zijn (correctie na de functionele review, V1 — de eerdere versie verwees hier onjuist naar "Product Cloud Architecture §4," dat geen rechtenmatrix bevat; de daadwerkelijke bron is `product-cloud-commerce-cloud-buy-box/spec.md` §4, "Gebruikersrollen — rechten binnen Product Cloud & Commerce Cloud").
- **Contract-gebaseerde zichtbaarheid in de Admin Shell:** het Verification Center registreert zich met `permissie: Beheerder` (Admin Shell §1.9) — het hoofdmenu-item is uitsluitend zichtbaar voor die rol, exact volgens het al bevroren, generieke filterprincipe (Admin Shell §4.2).

---

## 9. Admin Shell-registratiecontract

**Uitsluitend registratie, geen Shell-implementatie** — het Verification Center voegt niets toe aan de Shell zelf, het vervult uitsluitend het al bevroren, generieke contract (Admin Shell §1.9), exact zoals het Moderation Center dat al concreet voordeed:

```
naam: "Verification Center"
route: /admin/verification
icoon: (Design System-icoon, generiek — geen nieuw icoon nodig)
permissie: Beheerder
navigatiepositie: (naast overige Beheerder-modules, incl. Moderation Center)
beschikbare widgets: 2× Wachtrij-samenvatting-widget (één per wachtrijtype, sectie 3)
KPI's: optioneel — bijv. totaal aantal openstaande verificatie-items (kant-en-klaar berekend dóór deze module, nooit door de Shell)
notificatietypen: n.v.t. (dit is de ontvangende, niet de genererende kant van producentgerichte verificatie-notificaties)
taken: optioneel — bijv. "2 verificaties wachten langer dan 5 werkdagen" (kant-en-klaar geformuleerd door deze module)
deep links: naar elk individueel verificatie-item vanuit een zoekresultaat of notificatie elders in het platform
```

**Consistent met de al bevroren regel (Admin Shell §8):** de Shell roept nooit een van de onderliggende business-API's rechtstreeks aan — het Verification Center gebruikt ze zelf, en levert uitsluitend het resultaat via het contract. Geen enkele Shell-wijziging is nodig of voorgesteld om deze module op te nemen.

---

## 10. API-gebruik

**Geen nieuwe API, geen nieuwe database-entiteit** — getoetst en bevestigd, zie sectie 11 en 12.

| Verification Center-functie | Bestaande API/entiteit (ongewijzigd) |
|---|---|
| Verificatie-aanvraag, beoordeling, intrekking | **Claim-/eigenaarschap-API** (Marketplace Core §20 — deze dienst noemt "verificatie" al expliciet als functie, hergebruikt zonder wijziging) |
| AI-context per item | **AI-validatie-API** (Marketplace Core §20) |
| Auditregistratie | **Product Cloud API** (AuditLogEntry, Product Cloud Architecture Deel 3.1) |
| Notificatie aan Producent | **Notificatie-API** (Marketplace Core §20) |

**Nadrukkelijk niet gebruikt:** de Admin-moderatie-API — die dienst hoort bij het Moderation Center (claims/matching/geschillen/fraude/meldingen), niet bij Verification. Dit is een bewuste, expliciete keuze om de scope-grens uit sectie 1.2 ("Verification bevat geen moderatiefunctionaliteit") ook op API-niveau consistent door te voeren.

---

## 11. Datamodel — uitsluitend indien aantoonbaar noodzakelijk

**Uitkomst: geen enkele nieuwe entiteit is noodzakelijk gebleken.** Het Verification Center leest en muteert uitsluitend het al bevroren **VerificationProductRecord** (Product Cloud Architecture Deel 3.1/7.3) — een entiteit die al volledig bestond vóór dit document. Er is geen Verification Center-eigen, persistente data die nog niet ergens anders al bestaat. Dit is exact hetzelfde patroon als het Moderation Center, dat evenmin nieuwe entiteiten introduceerde.

---

## 12. Architectuurcontrole

- ✓ **Blueprint-consistent** — geen enkel proces wijkt af van wat al vastligt (H9.7, H13.5–13.6, Verified™-beginselen).
- ✓ **Product Cloud Architecture-consistent** — geen enkele entiteit, status of regel uit Deel 7 gewijzigd; dit document ontsluit uitsluitend wat daar al staat — nu preciezer dan voorheen, met een expliciet onderscheid tussen automatische (rollback/merge, Deel 8.6/5.3) en door de Beheerder te beoordelen (Deel 7.6) intrekkingstriggers.
- ✓ **Product Management-consistent** — sectie 2 (workflow) is een directe, ongewijzigde uitwerking van Product Management §6; geen dubbele functionaliteit.
- ✓ **Admin Shell-consistent** — het Verification Center registreert zich uitsluitend via het al bevroren generieke contract (sectie 9); geen enkele Shell-wijziging nodig of voorgesteld.
- ✓ **Moderation Center-consistent, met een harde, wederzijdse scope-grens** — geen enkel moderatie-itemtype wordt in dit document behandeld.
- ✓ **`product-cloud-commerce-cloud-buy-box/spec.md`-consistent** — de rechtenmatrix-verwijzing (sectie 8) wijst nu naar het daadwerkelijk juiste, bevroren document (correctie V1) in plaats van naar een sectie die niet bestaat.
- ✓ **Marketplace Core-consistent** — alle API's hergebruikt zoals al benoemd (§20); de Admin-moderatie-API is bewust **niet** gebruikt.
- ✓ **RBAC-consistent** — uitsluitend de bestaande Beheerder-rol, in de al bevroren Verificatie-reviewer-persona; geen nieuwe rol.
- ✓ **MVP-consistent** — geen enkele functionaliteit uit een latere module vooruit gebouwd.
- ✓ **Geen wijziging aan bevroren documenten** — bevestigd, zie de eindrapportage bij oplevering.
- ✓ **Functionele review verwerkt** — twee bevindingen (V1, V2) volledig verwerkt: V1 (foutieve verwijzing "Product Cloud Architecture §4" gecorrigeerd naar `product-cloud-commerce-cloud-buy-box/spec.md` §4, sectie 8), V2 (ambiguïteit tussen automatische en door de Beheerder te beoordelen intrekkingstriggers opgelost — rollback/merge bereiken de wachtrij nooit, de overige vier Deel 7.6-triggers wél, sectie 3/5/6). V3, V4 en V5 bewust niet verwerkt, op uitdrukkelijk verzoek.

---

## 13. Zelfreview

- **Is de scope-grens met Moderation Center daadwerkelijk sluitend, niet alleen beweerd?** Getoetst op drie niveaus: proces (sectie 2), beslisregels (sectie 6), API-gebruik (sectie 10) — nu ook scherper op het punt waar de review een ambiguïteit vond: de fraude-gerelateerde intrekkingstrigger blijft uitdrukkelijk een kruisverwijzing, nooit een eigen beoordeling.
- **Is V2 correct en volledig doorgevoerd, niet alleen in de beslisregel zelf?** Gecontroleerd op alle drie de relevante plekken: sectie 3 (wachtrijtabel, nu met expliciete uitsluiting van rollback/merge), sectie 5 (actietabel, "Directe trigger" nu beperkt tot de vier mensbeoordeling-vereisende triggers), sectie 6 (de beslisregel zelf, herschreven zonder de tegenstrijdige "systeemgegenereerd item"-formulering) — consistent op alle drie de plekken, geen plek waar de oude, ambigue formulering is blijven staan.
- **Introduceert de V2-correctie zelf ergens nieuwe functionaliteit of scope?** Getoetst: nee — de correctie verduidelijkt uitsluitend een al bestaand onderscheid dat al in Deel 8.6/5.3/7.6 stond (automatisch versus mensbeoordeling), zonder een nieuwe regel, status of actie toe te voegen.
- **Is de V1-correctie naar de juiste bron, niet naar een andere gok?** Herbevestigd: `product-cloud-commerce-cloud-buy-box/spec.md` §4 is het document dat daadwerkelijk de rechtenmatrix met de rij "Verified™ aanvragen" per rol bevat — geverifieerd vóór de correctie, niet aangenomen.
- **Ontbreekt er iets dat de opdracht wél vroeg?** Alle dertien gevraagde onderdelen zijn aanwezig. Geen wireframes gemaakt, zoals gevraagd.

**Dit document is hierbij DEFINITIEF BEVROREN.**
