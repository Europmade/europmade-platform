# EU Product Data-laag — kader voor de MVP (besluitklaar)

**Status:** Kader — ADR-0043 **Geaccepteerd** (2026-08-26)  
**Datum:** 2026-08-26  
**PC-checkpoint:** `e435b825` — niet herbouwen  
**ADR-0042:** **Geaccepteerd** (taxonomie-cutover uitgevoerd; zie implementatie-master)  
**ADR-0043:** [Geaccepteerd](../04-decisions/0043-eu-product-data-layer-authority.md)  
**Masterstatus:** [`docs/11-blueprint-v2/README.md`](../11-blueprint-v2/README.md) §6

**Klassen:** A officiële EU-productdatabase · B officiële veiligheids-/toezichtsbron · C bedrijfsregister · D commerciële productdata · E seller-provided · F EuropMade evidence

**Integratiebron** = er bestaat een **bruikbare, ondersteunde** toegangsroute (gedocumenteerde API of contractueel register). Undocumented portal-JSON en scraping tellen **niet**.

---

## 1. Doel

Kader voor hoe EuropMade externe productdata *later* mag gebruiken, zonder tweede productmodel en zonder dat een externe hit Verified™ of Made in Europe maakt.

**Kernregel:** `productdata ≠ verification ≠ Made in Europe`.

---

## 2. Besluit: heeft MVP een live externe EU-productdatabase nodig?

**JA, we kunnen MVP lanceren zonder live externe EU-productdatabase.**

Geen EPREL/GS1/Safety Gate/ICSMS-adapter is nodig om te verkopen. De bewezen keten is intern: seller → Product Cloud → completeness/GPSR → submit → admin approve → publish → offer → catalog → PDP.

GPSR (EU) 2023/988 eist **informatie op de listing** (Art. 19: fabrikant, EU-verantwoordelijke indien van toepassing, productidentificatie, waarschuwingen) en van de **marktplaats** o.a. Safety Gate-portaalregistratie en steekproeven in publieke databases (Art. 22). Dat is **niet** hetzelfde als een product-API. Steekproeven in MVP: **handmatig** op het officiële Safety Gate-portaal.

### Minimale MVP-functionaliteit

- Bestaande Product Cloud (`e435b825`)
- Seller vult productdata, identifiers, GPSR/manufacturer, documenten, origin/MiE-invoer
- Completeness-gates (o.a. GPSR, evidence wanneer geclaimd)
- Admin content-approval (publish)
- Handmatige Laag-2-verification (Verification Center)
- Consument: gepubliceerde versie; Verified-badge alleen bij `product_origin.status = Geverifieerd`

### Wat handmatig blijft

- Laag 2-beslissing
- Evidence-review
- Safety Gate-steekproeven / alerts opzoeken
- Conflictbeslechting als P2-snapshots later komen

### Wat de seller levert

Titel, beschrijving, categoriekoppeling, GTIN/MPN, attributen, media, manufacturer/GPSR-velden, `pc_document`, facility + assemblage/parts/materials + origin-evidence indien MiE geclaimd.

### Wat EuropMade verifieert

Laag 1 (onboarding, al bestaand). Laag 2 alleen na Gepubliceerd: checklist Deel 7.4, score vs drempel (ADR-0002), evidence. **Niet** “staat in EPREL”.

Als een externe bron later **onbeschikbaar** is: catalogus en verification blijven op Product Cloud; snapshots `stale`; geen launch-blokker.

---

## 3. Bronnenmatrix (herbevestigd 2026-08-26)

| Bron | Klasse | Doel | Dekking | ID-methode | GTIN / MPN / model | Relevante velden (bekend, niet verzonnen) | API | Key/licentie | Publiek | Voorwaarden | Auto-match | MiE-verificatie | MVP/P2 | Integratiebron? |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Product Cloud | E | Master productinfo | Heel platform | `prod` / versie | `identifier` GTIN\|MPN | titel, beschrijving, attrs | eigen | n.v.t. | intern | intern | n.v.t. | Nee (is geen externe bron) | **MVP** | n.v.t. intern |
| Manufacturer + GPSR-attrs | E | GPSR Art. 16/19-achtige contactinfo | Alle listings | `manu` | n.v.t. | naam, adres, land, e-mail; EU responsible | eigen | n.v.t. | intern | intern | n.v.t. | Nee | **MVP** | n.v.t. intern |
| `pc_document` / origin-evidence | F | Bewijs | Per product/versie | storage_reference | n.v.t. | CE, DoC, MiE-foto/pdf | eigen | n.v.t. | intern | intern | n.v.t. | Ja (ná reviewer) | **MVP** (E2E review OPEN) | n.v.t. intern |
| `product_origin` + MiE-score | E+system | Claim + score | Per `product_version` | origin-id | n.v.t. | land, facility, banden, status | eigen | n.v.t. | intern | intern | n.v.t. | Score ≠ badge | **MVP** | n.v.t. intern |
| **EPREL** | **A** (sectoraal, niet algemeen) | Energielabel + fiche | **Alleen** energiegelabelde productgroepen (huishouden + B2B-modellen in scope) | EPREL-registratienummer; zoek merk/model; GTIN **kan** (niet altijd gevuld) | GTIN optioneel; model/merk; geen algemene MPN-plicht | energielabel, productinformatieblad, technische parameters **per groep**; leverancier verantwoordelijk voor juistheid | **Ja** Public API | **Ja** key apart; T&C Commissie; data “as is”, geen volledigheid/juridische betrouwbaarheidsgarantie | Publieke data; API onder T&C | [API T&C PDF](https://ec.europa.eu/assets/move-ener/eprel/EPREL%20Public/Public%20API%20Term%20and%20Conditions/API_TERMS_AND_CONDITIONS_EN.pdf) | **Voorwaardelijk** (GTIN of registratienummer); geen match ≠ fout | **Nee** | **P2** + aparte bron-ADR | **Ja, P2** |
| **Safety Gate** (RAPEX) | **B** | Alerts gevaarlijke non-food | Gemelde producten, niet de catalogus | alertreferentie; soms barcode/merk in de melding | soms barcode; geen volledig GTIN-register | risico, maatregelen, productnaam, land | **Nee** (geen gedocumenteerde marktplaats-API). Portaal publiek. Undocumented SPA-JSON = geen architectuur | n.v.t. | Ja (portaal) | Commissie-portaal | Nee als integratie; handmatige zoek | **Nee** | MVP: **handmatig**; P2: alleen na bron-ADR | **Nee** tot ondersteunde export |
| Safety Gate **portaalregistratie** | B (operationeel) | GPSR Art. 22 marketplace | EuropMade als marktplaats | EU Login | n.v.t. | contactpunt marktautoriteiten | portaal, geen product-API | EU Login | registratieplicht | GPSR Art. 22 | n.v.t. | Nee | **MVP operationeel** (geen productlaag) | Nee (geen productdata) |
| **ICSMS** | **B** | MSA-uitwisseling | Toezichtbestanden | intern | geen publiek GTIN-API | non-compliance (beperkt publiek) | **Nee** publieke product-API | autoriteitstoegang intern | beperkt web | intern/vertrouwelijk | Nee | Nee | niet | **Nee** |
| **GS1 GDSN / Verified by GS1** | **D** | Handelsidentiteit / syndicatie | Wat merkeigenaar deelt | GTIN, GLN | GTIN centraal; geen herkomstplicht | merk, beschrijving, soms GPC; **niet** productieland-als-MiE | commerciële API’s | **Ja** lidmaatschap/licentie/key | beperkte vrije lookup, geen productiefeed | GS1 T&C | mogelijk ná contract | **Nee** | P2 optioneel | Nee tot commerciële ADR |
| KvK / BRIS | **C** | Onderneming, niet product | Bedrijven | KvK/BRN | n.v.t. | naam, adres | live **buiten MVP** (onboarding: alleen formaat) | vaak betaald | deels | nationaal | Nee voor producten | Nee | niet in productlaag | **Nee** (MVP-besluit) |
| NANDO | B | Notified bodies | Instanties | body-id | n.v.t. | geen productrecord | website | n.v.t. | ja | n.v.t. | Nee | Nee | niet | **Nee** |
| SCIP / EUDAMED / CosIng | A/B sectoraal | Stoffen / MD / cosmetica | Niche | wisselend | niet algemeen | sectoraal | niet als marketplace-feed aangenomen | wisselend | deels UI | wisselend | Nee | Nee | niet | **Nee** tot bron-ADR |
| DPP / ESPR | A toekomst | Digitale pas | toekomst | open | open | open | niet MVP | — | — | — | Nee | Nee | post-MVP | **Nee** |
| AI / open web | — | Extractie | willekeurig | geen | geen | voorstellen | geen officiële API | — | — | ADR-0035 | Nee | **Nee** | advisor only | **Nee** |

**GPSR zelf** is regelgeving, geen database: geen centrale EU-productinschrijving voor alle consumentenproducten.

**Geen algemene klasse-A-bron** voor heel EuropMade. EPREL is klasse A **binnen energielabel-scope**.

---

## 4. Data ownership (definitief voorstel)

Kolommen: invoeren / voorstellen / wijzigen / goedkeuren / voorrang / provenance.

| Data | Seller | External (P2) | AI | Admin | Verification |
|---|---|---|---|---|---|
| Titel, beschrijving | invoeren+wijzigen op Concept | voorstellen via snapshot | voorstellen | goedkeuren publish | mag niet overschrijven |
| GTIN/MPN | invoeren op variant | match-hint; geen tweede ID | voorstellen | duplicate/match | geen master |
| Merk | merkeigenaar wijzigt (ADR-0041) | voorstellen (merkstring) | voorstellen | goedkeuren conflict | geen |
| Fabrikant / GPSR-contact | invoeren+wijzigen | voorstellen (EPREL-leverancier ≠ GPSR-fabrikant) | voorstellen | GPSR-twijfel | geen badge-koppeling |
| Categorie | koppelen | hint productgroep | voorstellen | boom later | geen |
| Technische attrs | invoeren | EPREL-params als voorstel | voorstellen | publish | geen |
| EU responsible person | invoeren indien fabrikant buiten EU | niet als bron bekend | voorstellen | publish-gate | geen |
| Documenten | upload F | niet auto | OCR-voorstel | completeness | review CE-evidence |
| production_country / Made in … | invoeren claim | **niet** bevestigen via EPREL/GS1 | voorstellen | niet automatisch | **goedkeuren badge** |
| MiE-banden / score | invoeren banden; score = system | geen | geen score-write | geen | gebruikt score + evidence |
| Verified™ | aanvragen | **verboden** | **verboden** | niet i.p.v. Verification | **enige goedkeurder** |
| External snapshot | lezen | schrijven cache | n.v.t. | n.v.t. | lezen als signaal |

**Voorrang:** goedgekeurde/gepubliceerde Product Cloud-versie **leidt**. Snapshot en AI hebben **nooit** voorrang. Provenance: seller-velden = E; geaccepteerd voorstel = bron-ID + `accepted_at`; Verified = F + reviewer-id.

**NOOIT** automatisch een goedgekeurde `product_version` overschrijven.

---

## 5. Conceptueel P2-model (geen tabellen nu)

Bestaand hergebruik: `pc_product`, `product_version`, `identifier`, `pc_category`, `pc_document`, `pc_field_change`, `change_proposal`, `manufacturer`, `product_origin`, `product_origin_evidence`, MiE-score.

Toekomstig concept (niet implementeren):

| Concept | Rol |
|---|---|
| **ExternalSource** | Register (eprel, …), T&C-versie, trust_class |
| **ExternalSnapshot** | Cache: bron-ID, fetched_at, raw + genormaliseerde subset, expires_at |
| **ExternalMatch** | Koppeling snapshot ↔ `identifier` en/of `product_version`; match_method; confidence; status (unmatched/conflict/accepted/rejected) |
| **ExternalEvidence** | Alleen als reviewer een snapshot **expliciet** als bijlage aan een verification-item hangt — geen auto-badge |

Geen write naar `product_version` vanuit adapter. Overname = mens via `change_proposal` of field_change-approval.

---

## 6. Provenance

Iedere externe waarde (P2) herleidbaar:

| Concept | Inhoud |
|---|---|
| bron | ExternalSource |
| bron-ID | EPREL registration number, alert ref, … |
| opgehaald op | `fetched_at` |
| bronversie | API/model-version indien de bron die levert; anders null |
| matchmethode | gtin_exact / registration_number / brand_model_fuzzy / manual |
| confidence | 0–1 of enum |
| oorspronkelijke waarde | raw payload-veld |
| genormaliseerde waarde | intern veldvoorstel |
| beslissing | pending / accepted_into_pc / rejected / stale |

Geen magische velden op de PDP.

---

## 7. Conflictvoorbeelden

**Regel:** niets auto-overschrijven; conflict tonen; reviewer beslist; approved PC blijft leidend.

| Seller | External | Actie |
|---|---|---|
| Made in Germany | Manufacturer address France (GPSR/EPREL-leverancier) | Geen landwijziging. Signaal: juridisch adres ≠ productieland (dat mag). MiE blijft evidence+reviewer. |
| Brand X | Brand X Ltd. | Geen automatische rename. Match “zelfde merk?” voor reviewer; `brand_id` ongewijzigd tot merkeigenaar/admin. |
| EAN 123 + model A | Zelfde GTIN, ander modelnummer | Conflict op ExternalMatch. Identifier 123 blijft; geen tweede product. Reviewer: verkeerde EAN of verkeerde EPREL-rij. |
| Niet in EPREL | — | Geen fout, geen “niet EU”, geen verification-minpunten. |
| Safety Gate-alert op barcode | Listing live | MVP: handmatige take-down/review (GPSR). P2: eventueel banner zonder veldwijziging — **OPEN**. |

---

## 8. Made in Europe

```
Seller claim (banden + land + facility)
  → evidence (F) indien geclaimd
  → completeness / publish (content)   ≠ Verified
  → aanvraag Laag 2 (na Gepubliceerd + Laag 1)
  → reviewer (Verification Center)
  → Verified™ alleen op díe product_version
```

Externe hit mag: identificeren, voorstellen, controleren, als **ExternalEvidence** dienen ná menselijke koppeling.

Externe hit mag **niet:** Verified toekennen, MiE toekennen, productieplaats “bewezen” verklaren (EPREL/GS1/Safety Gate leveren dat niet als betrouwbaar herkomstbewijs).

Merkland ≠ fabrikantland ≠ productieland ≠ assemblageland.

---

## 9. EPREL als eerste P2-adapter

**Waarom kandidaat:** officiële Commissie-bron; publieke modeldata; Public API onder T&C; GTIN *kan*; relevant als EuropMade energiegelabelde groepen voert.

**Waarom niet algemene EU-DB:** alleen gelabelde groepen; data van leveranciers (“as is”); **niet** productieland/MiE.

**Gedrag buiten scope:** geen fout; geen negatieve verification; geen fallback “niet EU”.

**Nooit:** auto Verified / auto Made in Europe.

**Live:** pas na bron-ADR (key, T&C-acceptatie, EU-hosting, veldmapping uit officiële spec — niet uit third-party clients).

---

## 10. MVP vs P2

**MVP:** bestaande PC + verification; seller-data; bestaande evidence; provenance-concept; handmatige verification; consumer Verified volgens Deel 7; handmatige Safety Gate-steekproeven; **geen** live product-API.

**P2:** adapters; EPREL eerst; GTIN-matching; snapshot/cache; conflict-inbox; automatische *proposals* (geen writes); eventueel GS1/Safety Gate ná eigen ADR.

Auto-overwrite: **nooit** (MVP en P2).

---

## 11. Opdracht externe ontwikkelaar (later, niet nu inhuren)

Scope ná geaccepteerde ADR-0043 **en** EPREL-bron-ADR:

- Adapter-architecture (read-only, retries, monitoring, T&C-compliance)
- Eerste source: EPREL Public API
- Snapshot/cache + provenance-velden hierboven
- GTIN/MPN/registratienummer-matching → ExternalMatch
- Conflict detection vs `product_version` / `identifier`
- Tests: no-auto-overwrite; not-in-EPREL is OK; AI kan status niet zetten; stale snapshot
- **Geen** write naar `product_version`

---

## 12–15. Taxonomie, security, audit, AI

Ongewijzigd t.o.v. vorige versie: ADR-0042 niet uitvoeren; geen scraping; audit_log + field_change; AI advisor only (ADR-0035).

---

## 16. Open (na ADR-0043)

1. Formeel **accepteren** van ADR-0043  
2. Safety Gate-banner op PDP zonder veldwijziging?  
3. Snapshot-TTL vs 6-maanden hercontrole  
4. GS1 later ja/nee  
5. ADR-0042 blijft apart  
6. Evidence-E2E Verification Center afronden (belofte, niet deze ADR)

---

## Referenties

PC Architecture Deel 7; Verification Center spec; overlay §7; GPSR (EU) 2023/988 Art. 19/22; EPREL Public API T&C; `e435b825`.
