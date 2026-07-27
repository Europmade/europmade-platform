# EuropMade — Sprint 1B: Definitieve Eindrapportage

**Status: Sprint 1B definitief afgesloten.**
**Datum-equivalent:** direct na de definitieve bevriezing van Partner Onboarding (vierde en laatste onderdeel).

---

## 1. Opgeleverde functionaliteiten

Sprint 1B bestond uit vier onderdelen, elk volledig doorlopen (architectuuranalyse → functionele specificatie → componentanalyse → wireframes → documentatie → eindcontrole) en stuk voor stuk expliciet goedgekeurd vóór bevriezing.

### 1.1 Winkelwagen (v1.0, definitief bevroren)
Retailer-gegroepeerd, bewerkbaar besteloverzicht (CMP-025 `is-editable`-variant). Aantal wijzigen met voorraadgrens (nieuw component: CMP-039 Quantity Stepper). Volledig uitgewerkte **Guest Cart Merge** (samenvoegen van gast- en accountwinkelwagen bij inloggen) en **prijs-/voorraadwijzigingslogica** tijdens het winkelen. Een winkelwagenregel is gebonden aan een specifieke Offer, wisselt niet automatisch mee met een veranderende Buy Box-winnaar.

### 1.2 Orderbevestiging (v1.0 → v1.3, definitief bevroren)
Succesbevestiging met per-deelbestelling ordernummer, aanbieder en verwachte levering; duidelijke scheiding tussen marketplace-brede en retailer-specifieke informatie. **BTW/OSS-specificatie**, na twee gerichte UX-correctierondes uiteindelijk vereenvoudigd tot: label + info-icoon (ⓘ) + bedrag in de Totalen-box, met de berekeningswijze en een eventuele tariefuitsplitsing uitsluitend in een tooltip. Deze correctie is via een gecontroleerde synchronisatie-update ook op **Checkout** toegepast (v1.0 → v1.3), zodat beide schermen identiek omgaan met BTW.

### 1.3 Authenticatie-flow inclusief 2FA (v1.0 → v1.1, definitief bevroren)
Eén registratieflow zonder rolkeuze — iedereen registreert zich eerst als Consument. Inloggen, Registreren, Wachtwoord vergeten, Nieuw wachtwoord instellen, Controleer je e-mail, E-mailadres bevestigd. **Volledige 2FA-strategie**: optioneel en gestimuleerd voor Consument, **verplicht** voor Retailer/Producent (geen Dashboard-toegang zonder actieve 2FA) en Beheerder (technisch gescheiden, Medusa Admin). Nieuw component: CMP-040 Code Input (OTP). Credential-datamodel bewust methode-onafhankelijk opgezet, voorbereid op toekomstige passkeys/hardware security keys.

### 1.4 Partner Onboarding (v1.0 → v1.1, definitief bevroren)
Meervoudige, optelbare rolselectie (Retailer, Producent/Merkhouder, Distributeur — geen exclusieve keuze). Volledige stap-voor-stap flow: Welkom, Partner kiezen, Bedrijfsgegevens (incl. IBAN/uitbetalingsgegevens), Verificatie (identiteit + Europese productieverificatie, conditioneel per rol), Upload documenten, Samenvatting, Statuspagina. **Volledig uitgewerkte Europese productieverificatie** — verplichte en optionele gegevens, bewijsstukken, handmatige controle, periodieke hercontrole. Nieuw component: CMP-041 File Upload (incl. mobiele cameraopname). **Onafhankelijke architectuurreview** vóór bevriezing leverde vijf verwerkte verbeterpunten op: de status "Aanvullende informatie vereist", een server-side afgedwongen e-mailverificatie-eis vóór de start, mobiele cameraopname bij documentupload, architectuur-/functionele beveiligingseisen voor documentuploads, en een beoordelingschecklist voor reviewers.

---

## 2. Design System — totaal aantal componenten

**41 componenten (CMP-001 t/m CMP-041), definitief.**

| Herkomst | Aantal | Componenten |
|---|---|---|
| Sprint 1A (bij afsluiting) | 38 | CMP-001 t/m CMP-038 |
| Winkelwagen | +1 | CMP-039 (Quantity Stepper) |
| Orderbevestiging | +0 | — (twee nieuwe, benoemde varianten op CMP-025/CMP-030, geen nieuw component) |
| Authenticatie-flow / 2FA | +1 | CMP-040 (Code Input/OTP) |
| Partner Onboarding | +1 | CMP-041 (File Upload) |
| **Totaal** | **41** | |

Elk nieuw component is vooraf vastgelegd in het Design System, vóór de bijbehorende wireframe werd getekend of uitgebreid — geen enkele uitzondering deze sprint. Twee componenten kregen gedurende de sprint een gedocumenteerde variant-uitbreiding zonder als nieuw component te tellen: CMP-025 (`is-confirmed`), CMP-030 (zonder wijzigen-link), CMP-026 (meervoudige selectie), CMP-041 (mobiele cameravariant).

---

## 3. Totaal aantal definitief bevroren schermen/flows

**9 van de 68 geïnventariseerde schermen/flows**, verdeeld over twee sprints:

**Sprint 1A (5):** Homepage, Zoekresultaten, Categoriepagina, Productpagina + Buy Box, Checkout. (Zoekresultaten en Categoriepagina delen dezelfde Marketplace Listing-template — dit is één gedeelde implementatie voor twee losse schermen, geen apart derde item.)

**Sprint 1B (4):** Winkelwagen, Orderbevestiging, Authenticatie-flow (Inloggen/Registreren/Wachtwoord vergeten — 8 losse schermtoestanden in twee flows, #9 en #10), Partner Onboarding (#26–28, drie oorspronkelijk losse UX-architectuur-schermen samengevoegd tot één samenhangende flow).

Hiermee staat, end-to-end en definitief bevroren:
- **De volledige MVP-kernflow:** Homepage → Categorie/Zoekresultaten → Productpagina → Winkelwagen → Checkout → Orderbevestiging.
- **De volledige consument-/partner-toegangsflow:** Registreren → E-mailverificatie → Inloggen → (optioneel/verplicht) 2FA → Partner Onboarding → Goedkeuring → verplichte 2FA → Dashboard-toegang (het Dashboard zelf is Sprint 1C-scope).

---

## 4. Wat is nu definitief gereed

- Blueprint, UX-architectuur, ADR's 0001–0005: gereed (ongewijzigd deze sprint).
- Functionele specificaties: **8 domeinen definitief** (Product Cloud/Commerce Cloud/Buy Box, Checkout, Homepage, Marketplace Listing, Marketplace Core, Winkelwagen, Orderbevestiging, Authenticatie incl. 2FA, Partner Onboarding).
- Design System: 41 componenten, structureel definitief (kleur/typografie/iconen bewust nog placeholder, aparte latere fase).
- Component Coverage Matrix: doorlopend bijgewerkt, geen dubbele/overlappende componenten geconstateerd.
- Wireframe Strategy: volledig chronologisch overzicht van alle bevroren schermen, inclusief de twee gecontroleerde synchronisatie-updates (Checkout's BTW-weergave).
- Alle README's, indexdocumenten en het centrale project-status-overzicht zijn bijgewerkt en onderling consistent (componentaantal, versienummers, interne verwijzingen — expliciet gecontroleerd, twee kleine inconsistenties in eerdere statuskoppen gevonden en gecorrigeerd, zie sectie 7).

---

## 5. Bekende MVP-beperkingen (bewust, geen tekortkomingen)

- **Rol toevoegen aan een reeds actief Partneraccount** (bijv. Retailer die later ook Producent wordt) heeft nog geen eigen flow — vermoedelijk een verkorte iteratie op Partner Onboarding, later.
- **Distributeur en Retailer** hebben in de huidige uitwerking identieke rechten, onderscheiden door één document — bewust zo gelaten na de architectuurreview, geen samenvoeging uitgevoerd op uitdrukkelijk verzoek.
- **Eén productielocatie als hoofdclaim** — geen ondersteuning voor meerdere, gelijkwaardige productielocaties zonder één "hoofdproductieland"; bewust buiten scope gehouden.
- **Partner Lifecycle Management** (schorsen/beëindigen van een reeds goedgekeurd partneraccount) ontbreekt volledig — een reëel aandachtspunt zodra de eerste partners daadwerkelijk actief zijn, bewust niet meegenomen in deze sprint.
- **Verzendinstellingen (#29) en ERP/PIM-koppeling** zijn bewust buiten de Partner Onboarding-scope gehouden, ondanks dat de Blueprint (H9.4) ze wel als onboardingstappen noemt — expliciet gemotiveerd, geen vergeten scherm.
- **KvK-/BTW-validatie** is beperkt tot formaatcontrole, geen live koppeling met een extern handelsregister.
- **Eén actieve TOTP-koppeling per account** — geen ondersteuning voor meerdere gelijktijdige authenticator-apps.
- **Guest-cart-samenvoeging bij conflicterende regels** (zelfde product, verschillende aanbieder in beide carts) volgt een vastgelegde regel, maar is nog niet tegen echte gebruikersdata getoetst (inherent aan het wireframe-stadium).

---

## 6. Openstaande onderwerpen voor Sprint 1C

**Aanbevolen prioriteit** (zie `06-development/project-status-and-roadmap.md` sectie 6 voor de volledige onderbouwing):

1. **Retailer/Producent Dashboard-skelet** (#30–32, #34–36) — nu pas zinvol te ontwerpen, want dankzij Partner Onboarding kunnen er daadwerkelijk goedgekeurde partneraccounts bestaan.
2. **Admin-skelet — Partnerbeheer** (#55) — waar de handmatige EU-productieverificatie (met de nu al vastgelegde reviewer-checklist) en de status "Aanvullende informatie vereist" daadwerkelijk landen.
3. **Categorie-/filterbeheer** (Admin, #61) — kleiner, onafhankelijk oppakbaar.
4. **Subcategoriepagina** (#4) en **Verzendinstellingen** (#29) — beide klein, bewust doorgeschoven, geen blokkerende afhankelijkheden.

Daarnaast, niet urgent maar bekend: Partner Lifecycle Management, rol-toevoeging aan een bestaand partneraccount, en de KvK-/BTW-live-validatie zijn kandidaten voor een latere sprint, zodra de eerste operationele ervaring daar aanleiding toe geeft.

---

## 7. Consistentiecontrole — uitgevoerd vóór deze rapportage

- ✓ **Geen eerder bevroren schermen gewijzigd** — alle wireframe-bestanden (Sprint 1A + Sprint 1B) gecontroleerd via bestandshash; identiek aan hun bevroren staat. Eén onbedoelde aanraking van een frozen bestand tijdens deze afsluitende controle is gedetecteerd en direct hersteld tot de exacte, oorspronkelijke inhoud (bevestigd via hash).
- ✓ **Alle versienummers synchroon** — Winkelwagen v1.0, Orderbevestiging v1.3, Checkout v1.3, Authenticatie-flow v1.1, Partner Onboarding v1.1; consistent weergegeven in alle README's en het centrale statusdocument.
- ✓ **Alle interne verwijzingen correct** — bij deze controle zijn twee resterende inconsistenties gevonden en gecorrigeerd: (1) de statuskoppen bovenaan `authenticatie/spec.md` en `orderbevestiging/spec.md` waren nooit bijgewerkt naast hun al langer correcte sluitregel onderaan; (2) verspreide verwijzingen naar "Partner Onboarding, schermen #26–29" (uit de periode vóór Partner Onboarding bestond) zijn gecorrigeerd naar het daadwerkelijk opgeleverde bereik #26–28, met #29 expliciet benoemd als bewust buiten scope.
- ✓ **Alle componentaantallen correct** — 41 componenten, consistent in `components.md` (41 gedefinieerde entries), `coverage-matrix.md` (41 rijen), en alle verwijzende README's/indexdocumenten.
- ✓ **Blueprint-, UX-architectuur-, Design System-, Product Cloud-, Commerce Cloud-, RBAC- en MVP-consistentie** — nogmaals bevestigd, zie `project-status-and-roadmap.md` sectie 5 voor de volledige, puntsgewijze toetsing.

---

## Sprint 1B is hiermee definitief afgesloten.

Geen inhoudelijke wijzigingen zijn uitgevoerd in deze rapportage — uitsluitend statusbevestiging, documentatiebijwerking en consistentiecontrole, conform de opdracht.
