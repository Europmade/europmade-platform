# EuropMade — Project Status & Wireframe Roadmap

**Status:** Definitief overzichtsdocument (projectcontrole).
**Methode:** samengesteld uitsluitend uit reeds bestaande, afgeronde documentatie. Geen nieuwe wireframes, geen nieuwe schermontwerpen, geen nieuwe functionele beslissingen — uitsluitend inventarisatie en statusbepaling.
**Peildatum-equivalent:** direct na de definitieve afsluiting van Sprint 1B (Winkelwagen, Orderbevestiging, Authenticatie-flow incl. 2FA, Partner Onboarding — alle vier definitief bevroren).

---

# 1. Projectstatus

| Onderdeel | Status | Gereedheid | Toelichting |
|---|---|---|---|
| **Blueprint** | Gereed | 100% | v2.1, definitief, vaste basis voor alles (`blueprint/`). |
| **Financieel model** | Gereed (inhoudelijk) | ~90% | Inhoudelijk definitief verklaard (v1.0) en overal als kader gebruikt (commissie, bannerplatform), maar het brondocument zelf staat nog **niet** als bestand in de repository (`00-context/blueprint-reference.md` vermeldt dit expliciet als openstaand punt). |
| **UX Architectuur** | Gereed | 100% | `ux-architecture.md`: rollen, user flows, sitemap, navigatie, scherminventarisatie, UX-review — definitief. |
| **Functionele specificaties** | In uitvoering | ~99% | **9** hoofddomeinen definitief uitgewerkt: Product Cloud/Commerce Cloud/Buy Box, Checkout, Homepage, Marketplace Listing, Marketplace Core, Winkelwagen, Orderbevestiging, Authenticatie (incl. 2FA), Partner Onboarding — plus de **Product Cloud-architectuur**, **Product Management**, **Admin Shell & Dashboard Framework**, **Moderation Center**, **Verification Center**, **Partner Center** en **Order Management Center** (alle zeven Sprint 1C, alle zeven definitief bevroren) als tiende t/m zestiende, verdiepende documenten — plus, na de definitieve Affiliate-scopewijziging, **zeven nieuwe MVP-domeinen in concept v1.0**: Affiliate Platform, Retouren & Refunds, Finance, Seller Dashboard, Buyer Dashboard, Berichten/Reviews/Q&A, GDPR & Compliance (zie `03-functional-specs/README.md`). Nog niet uitgewerkt: advertentieplatform (bannerplatform), compliance-en-verified (als zelfstandig, verdiepend domein naast de nu bestaande GDPR-basis), creator-platform. |
| **Design System** | Gereed (structureel, Sprint 1A+1B-scope) | ~85% | v1.0 (structureel/grijswaarden) definitief met **41 componenten** (CMP-001–CMP-041) — volledige dekking voor alle negen bevroren schermen/flows (Sprint 1A + Sprint 1B). Kleur/typografie/iconen bewust nog placeholder (aparte, latere fase). Coverage Matrix identificeert al concrete, nog te bouwen componenten voor Dashboards (Sprint 1C/2/3). |
| **ADR's** | Gereed (proces), lopend (aantal) | — | 5 ADR's vastgesteld (0001–0005), proces is volwassen en werkt aantoonbaar (elke ADR is minstens één keer daadwerkelijk toegepast/getoetst). Meer ADR's zullen ontstaan naarmate nieuwe domeinen (advertenties, compliance-drempels) concrete beslissingen vereisen — dit is verwacht, geen tekort. |
| **Wireframes** | **Sprint 1A én Sprint 1B definitief afgesloten** | **9 van 68 schermen/flows = ~13%**: Homepage, Productpagina + Buy Box, Checkout, Zoekresultaten, Categoriepagina (Sprint 1A) + Winkelwagen, Orderbevestiging, Authenticatie-flow (incl. 2FA, 8 schermen), Partner Onboarding (Sprint 1B) — alle negen **definitief bevroren**. De volledige MVP-kernflow (Homepage t/m Orderbevestiging) én de volledige consument-/partner-toegangsflow (registratie t/m partnerschap) staan hiermee end-to-end in wireframe-vorm. |
| **Development-documentatie** | Nog niet gestart | ~5% | `06-development/roadmap.md`, `backlog.md`, `sprint-01.md`, `sprint-02.md` zijn placeholders; dit document is de eerste inhoudelijke stap daarin. |

**Belangrijkste observatie:** de gereedheidspercentages zijn bewust ongelijk verdeeld — dit is een **strategische keuze**, geen achterstand. De strategie (Wireframe Strategy, sectie 1) koos er expliciet voor om eerst de drie architecturaal risicovolste schermen volledig te doorlopen (inclusief UX-review, Design System-consolidatie en een Customer Journey Audit) vóórdat breedte werd nagestreefd, en zette diezelfde diepgang in Sprint 1B door — inclusief een onafhankelijke architectuurreview op het risicovolste Sprint 1B-onderdeel (Partner Onboarding) vóór bevriezing.

---

# 2. Volledige scherminventarisatie (68 schermen, per rol)

Labels ongewijzigd t.o.v. `ux-architecture.md`: **Must Have / Should Have / Could Have**. Sprint-indeling ongewijzigd t.o.v. `wireframe-strategie.md`. "Gedeeld" = scherm dient meerdere rollen; hier genoteerd bij elke relevante rol.

### Bezoeker

| # | Scherm | Status | Sprint | Desktop | Tablet | Mobiel | Wireframe aanwezig |
|---|---|---|---|---|---|---|---|
| 1 | Homepage | **Gereed (v1.0, bevroren)** | 1A | Ja | Ja | Ja | **Ja** |
| 2 | Zoekresultaten | **Gereed (v1.0, bevroren)** | 1A | Ja | Ja | Ja | **Ja** |
| 3 | Categoriepagina | **Gereed (v1.0, bevroren)** | 1A | Ja | Ja | Ja | **Ja** |
| 4 | Subcategoriepagina | Nog niet gestart | 1B | Nee | Nee | Nee | Nee |
| 5 | Productpagina | **Gereed (v1.0, bevroren)** | 1A | Ja | Ja | Ja | **Ja** |
| 6 | Winkelwagen | **Gereed (v1.0, definitief bevroren)** | 1B | Ja | Ja | Ja | **Ja** |
| 9 | Inloggen/Registreren | **Gereed (v1.1, definitief bevroren — incl. 2FA-strategie)** | 1B | Ja | Ja | Ja | **Ja** |
| 10 | Wachtwoord vergeten | **Gereed (v1.1, definitief bevroren — zelfde bestand als #9)** | 1B | Ja | Ja | Ja | **Ja** |
| 18 | Over EuropMade/Vertrouwen | Nog niet gestart | 2 | Nee | Nee | Nee | Nee |
| 19 | Merkpagina | Nog niet gestart | 3 | Nee | Nee | Nee | Nee |
| 20 | Klantenservice/FAQ | Nog niet gestart | 3 | Nee | Nee | Nee | Nee |
| 21 | Juridische pagina's (Cookie Consent-onderdeel **Gereed, Sprint 3 P0**; overige juridische tekstpagina's nog niet gestart) | **Gedeeltelijk** | 2 | Gedeeltelijk | Gedeeltelijk | Gedeeltelijk | Gedeeltelijk |
| 22 | 404/foutpagina's | Nog niet gestart | 3 | Nee | Nee | Nee | Nee |
| 23 | Landingspagina's (SEO) | Nog niet gestart | 3 | Nee | Nee | Nee | Nee |
| 24 | Kenniscentrum | Post-MVP | Post-MVP | Nee | Nee | Nee | Nee |

### Klant

| # | Scherm | Status | Sprint | Desktop | Tablet | Mobiel | Wireframe aanwezig |
|---|---|---|---|---|---|---|---|
| 6 | Winkelwagen (gedeeld met Bezoeker) | **Gereed (v1.0, bevroren)** | 1B | Ja | Ja | Ja | **Ja** |
| 7 | Checkout | **Gereed (v1.3, bevroren)** | 1A | Ja | Ja | Ja | **Ja** (Stap 0/1/3; Stap 2 bewust op componentniveau, geen apart wireframe) |
| 8 | Orderbevestiging | **Gereed (v1.3, definitief bevroren)** | 1B | Ja | Ja | Ja | **Ja** |
| 11 | Mijn bestellingen | **Gereed (Sprint 3 P0)** | 2 | Ja | Ja | Ja | Ja |
| 12 | Orderdetail + track&trace | Nog niet gestart | 2 | Nee | Nee | Nee | Nee |
| 13 | Retour aanmelden | Nog niet gestart | 2 | Nee | Nee | Nee | Nee |
| 14 | Berichtencentrum (klant) | Nog niet gestart | 2 | Nee | Nee | Nee | Nee |
| 15 | Productreview plaatsen | Nog niet gestart | 2 | Nee | Nee | Nee | Nee |
| 16 | Verkopersreview plaatsen | Nog niet gestart | 2 | Nee | Nee | Nee | Nee |
| 17 | Account & adresbeheer | Nog niet gestart | 2 | Nee | Nee | Nee | Nee |
| 25 | Mijn reviews | Post-MVP | Post-MVP | Nee | Nee | Nee | Nee |
| 68 | Verlanglijst/Wishlist | Post-MVP (F5, expliciet uitgesteld) | Post-MVP | Nee | Nee | Nee | Nee |

### Retailer

| # | Scherm | Status | Sprint | Desktop | Tablet | Mobiel | Wireframe aanwezig |
|---|---|---|---|---|---|---|---|
| 26 | Partner-registratie (gedeeld met Producent) | **Gereed (v1.1, definitief bevroren)** | 1B | Ja | Ja | Ja | **Ja** (Welkom + Partner kiezen) |
| 27 | Bedrijfsgegevens & verificatie (gedeeld) | **Gereed (v1.1, definitief bevroren)** | 1B | Ja | Ja | Ja | **Ja** (incl. identiteitscontrole + Europese productieverificatie) |
| 28 | Betaalgegevens (gedeeld) | **Gereed (v1.1, definitief bevroren)** | 1B | Ja | Ja | Ja | **Ja** (IBAN/uitbetalingsgegevens, onderdeel van Bedrijfsgegevens-stap) |
| 29 | Verzendinstellingen | Nog niet gestart — bewust buiten de Partner Onboarding-scope gehouden (onafhankelijke architectuurreview, expliciet verzoek) | 1B | Nee | Nee | Nee | Nee |
| 30 | Dashboard Home (gedeeld) | **Gereed (Sprint 3 P0)** | 1B | Ja | Ja | Ja | Ja |
| 31 | Productoverzicht (gedeeld) | Nog niet gestart | 1B | Nee | Nee | Nee | Nee |
| 32 | Product toevoegen — EAN-zoeken | **Gereed (Sprint 3 P0)** | 1B | Ja | Ja | Ja | Ja |
| 33 | Product toevoegen — CSV-import | Nog niet gestart | 2 | Nee | Nee | Nee | Nee |
| 34 | Product toevoegen — Retailer Created | Nog niet gestart | 1B | Nee | Nee | Nee | Nee |
| 35 | Productdetail — commerciële gegevens | **Gereed (Sprint 3 P0)** | 1B | Ja | Ja | Ja | Ja |
| 37 | Wijzigingsvoorstel indienen | Nog niet gestart | 2 | Nee | Nee | Nee | Nee |
| 40 | Orders | Nog niet gestart | 2 | Nee | Nee | Nee | Nee |
| 41 | Retour beoordelen | Nog niet gestart | 2 | Nee | Nee | Nee | Nee |
| 42 | Berichtencentrum (gedeeld met Producent) | Nog niet gestart | 2 | Nee | Nee | Nee | Nee |
| 43 | Advertenties — beschikbaarheid & reserveren (gedeeld) | Nog niet gestart | 3 | Nee | Nee | Nee | Nee |
| 44 | Advertenties — actieve campagnes (gedeeld) | Nog niet gestart | 3 | Nee | Nee | Nee | Nee |
| 45 | Rapportages (gedeeld) | Nog niet gestart | 2 | Nee | Nee | Nee | Nee |
| 46 | Landinstellingen | Nog niet gestart | 3 | Nee | Nee | Nee | Nee |
| 50 | Uitbetalingen (gedeeld) | **Gereed (Sprint 3 P0)** | 2 | Ja | Ja | Ja | Ja |
| 51 | Meldingencentrum (gedeeld) | Nog niet gestart | 3 | Nee | Nee | Nee | Nee |
| 52 | ERP/PIM/API-koppeling (gedeeld) | Post-MVP | Post-MVP | Nee | Nee | Nee | Nee |
| 53 | Accountinstellingen (gedeeld) | Nog niet gestart | 3 | Nee | Nee | Nee | Nee |

### Producent

| # | Scherm | Status | Sprint | Desktop | Tablet | Mobiel | Wireframe aanwezig |
|---|---|---|---|---|---|---|---|
| 26–28 | Onboarding (gedeeld met Retailer) | **Gereed (v1.1, definitief bevroren)** | 1B | Ja | Ja | Ja | **Ja** |
| 29–31 | Verzendinstellingen (n.v.t. voor pure Producent) + Dashboard Home + Productoverzicht (gedeeld met Retailer) | Nog niet gestart | 1B | Nee | Nee | Nee | Nee |
| 36 | Productdetail — productinformatie-beheer | Nog niet gestart | 1B | Nee | Nee | Nee | Nee |
| 38 | Wijzigingsvoorstellen beoordelen | Nog niet gestart | 2 | Nee | Nee | Nee | Nee |
| 39 | Product claimen | Nog niet gestart | 2 | Nee | Nee | Nee | Nee |
| 42, 45, 50–53 | Berichten/Rapportages/Uitbetalingen/Meldingen/ERP/Account (gedeeld met Retailer) | Nog niet gestart | 2–3/Post-MVP | Nee | Nee | Nee | Nee |
| 43–44 | Advertenties (gedeeld, indien Producent ook zelf verkoopt) | Nog niet gestart | 3 | Nee | Nee | Nee | Nee |
| 47 | Product Quality Score & Health-overzicht | Nog niet gestart | 3 | Nee | Nee | Nee | Nee |
| 48 | Compliance Dashboard + AI-assistent | Nog niet gestart | 3 | Nee | Nee | Nee | Nee |
| 49 | Verified™-aanvraag | Nog niet gestart | 3 | Nee | Nee | Nee | Nee |

### Affiliate

**Amendement na de definitieve Affiliate-scopewijziging** (zie `00-context/blueprint-reference.md`): schermen #65–66 zijn niet langer Post-MVP.

| # | Scherm | Status | Sprint | Desktop | Tablet | Mobiel | Wireframe aanwezig |
|---|---|---|---|---|---|---|---|
| 65 | Affiliate-registratie | **Gereed (Sprint 3 P0)** | 2 (nieuw toegewezen) | Ja | Ja | Ja | Ja |
| 66 | Affiliate Dashboard | **Gereed (Sprint 3 P0)** | 2 (nieuw toegewezen) | Ja | Ja | Ja | Ja |

### Creator

| # | Scherm | Status | Sprint | Desktop | Tablet | Mobiel | Wireframe aanwezig |
|---|---|---|---|---|---|---|---|
| 65 | Creator-registratie (losgetrokken van Affiliate na ADR-52) | Post-MVP | Post-MVP | Nee | Nee | Nee | Nee |
| 67 | Creator Storefront/profiel | Post-MVP | Post-MVP | Nee | Nee | Nee | Nee |

### Administrator

| # | Scherm | Status | Sprint | Desktop | Tablet | Mobiel | Wireframe aanwezig |
|---|---|---|---|---|---|---|---|
| 54 | Admin dashboard (platform-KPI's) | **Gereed (Sprint 3 P0)** | 2 | Ja | Ja | Ja | Ja |
| 55 | Partnerbeheer | **Gereed (Sprint 3 P0)** | 1B | Ja | Ja | Ja | Ja |
| 56 | Gebruikersbeheer | Nog niet gestart | 2 | Nee | Nee | Nee | Nee |
| 57 | Moderatiewachtrij | **Gereed (Sprint 3 P0)** | 2 | Ja | Ja | Ja | Ja |
| 58 | Geschillenbeheer | Nog niet gestart | 2 | Nee | Nee | Nee | Nee |
| 59 | Compliance-overzicht platformbreed | Nog niet gestart | 3 | Nee | Nee | Nee | Nee |
| 60 | Advertentie-inventorybeheer | Nog niet gestart | 3 | Nee | Nee | Nee | Nee |
| 61 | Categorie- & filterbeheer | Nog niet gestart | 1B | Nee | Nee | Nee | Nee |
| 62 | Commissie- & tariefinstellingen | Nog niet gestart | 3 | Nee | Nee | Nee | Nee |
| 63 | Landbeheer | Post-MVP | Post-MVP | Nee | Nee | Nee | Nee |
| 64 | Audittrail/logs | Nog niet gestart | 3 | Nee | Nee | Nee | Nee |

**Totaal:** 68 schermen/flows (Inloggen/Registreren en Wachtwoord vergeten tellen als één flow/bestand, conform Focused Flow Template). **Gereed: 19** (de oorspronkelijke 9 — Homepage, Productpagina, Checkout, Zoekresultaten, Categoriepagina, Winkelwagen, Orderbevestiging, Authenticatie-flow incl. 2FA, Partner Onboarding #26–28 — **plus 10 nieuw (Sprint 3 P0): #11 Mijn bestellingen, #30 Dashboard Home, #32 Product toevoegen EAN, #35 Productdetail commercieel, #50 Uitbetalingen, #54 Admin dashboard, #55 Partnerbeheer, #57 Moderatiewachtrij, #65 Affiliate-registratie, #66 Affiliate Dashboard**). **Gedeeltelijk: 1** (#21 Juridische pagina's — Cookie Consent-onderdeel Gereed, overige juridische tekstpagina's nog niet gestart). **In uitvoering: 0.** **Nog niet gestart: 43** (54 min de 10 nu Gereed min de 1 nu Gedeeltelijk; incl. #29 Verzendinstellingen, bewust niet meegenomen in Partner Onboarding). **Post-MVP (bewust buiten scope): 7** (Kenniscentrum, Mijn reviews, Wishlist, ERP/PIM, Landbeheer, Creator-registratie #65 en Creator Storefront #67 — na ADR-52 definitief bevestigd als Post-MVP). **Aandachtspunt, niet veroorzaakt door deze update:** 19+1+0+43+7=70, niet 68 — deze 2-punts afwijking bestond al vóór de Sprint 3 P0-wireframes en vereist een aparte, volledige hertelling van de 68-rijen-tabel; buiten de scope van deze consistentiecontrole.

---

# 3. Sprintplanning — wat ontbreekt er nog precies

### Sprint 1A — Marketplace Core (7 onderdelen) — ✅ **VOLLEDIG AFGEROND**
✅ Design System Foundation · ✅ Productpagina + Buy Box · ✅ Checkout · ✅ Homepage · ✅ Zoekresultaten · ✅ Categoriepagina

Alle Sprint 1A-onderdelen zijn bevroren op v1.0. Design System stond bij afsluiting op 36 componenten, volledig dekkend voor deze zes schermen.

### Sprint 1B — Kernflow-afronding + Partner-toegang — ✅ **VOLLEDIG AFGEROND**
✅ Winkelwagen (#6) · ✅ Orderbevestiging (#8, incl. BTW/OSS-specificatie) · ✅ Authenticatie-flow incl. 2FA (#9/#10) · ✅ Partner Onboarding (#26–28, incl. onafhankelijke architectuurreview)

Alle vier Sprint 1B-onderdelen zijn **definitief bevroren**. Design System staat na Sprint 1B op **41 componenten** (CMP-039 Quantity Stepper, CMP-040 Code Input/OTP, CMP-041 File Upload — alle drie nieuw deze sprint). Checkout is bij deze sprint tweemaal via een gecontroleerde synchronisatie-update bijgewerkt (v1.0 → v1.3, BTW-weergave) zonder de kern van het bevroren scherm te wijzigen. **Bewust niet meegenomen in Sprint 1B:** #4 (Subcategoriepagina), #29 (Verzendinstellingen — expliciet uit Partner Onboarding gehouden), #30–32 (Dashboard Home/Productoverzicht/EAN-zoeken), #34 (Retailer Created), #35–36 (Productdetail), #55 (Partnerbeheer), #61 (Categorie-/filterbeheer) — deze schuiven door naar Sprint 1C.

### Sprint 1C — gestart, eerste onderdeel afgerond
**Product Cloud-architectuur (`03-functional-specs/product-cloud-architecture/spec.md`) is definitief bevroren (v1.1)** — het eerste onderdeel van Sprint 1C, uitsluitend architectuur (geen UX/wireframes), bijgewerkt na een onafhankelijke architectuurreview. Legt vast: volledig datamodel (Product/Productfamilie/Variant/Identifiers/Attributen), producteigendom en eigendomsoverdracht, volledig uitgewerkte productclaims, een nieuwe Product Matching-pijplijn (EAN/AI/handmatig, merge/split), een twee-laags "Verified Made in Europe"-model, en drie orthogonale statusassen (levenscyclus/publicatie/verificatie) plus een afgeleide Visibility-status.

**Product Management (`03-functional-specs/product-management/spec.md`) is definitief bevroren (v1.1)** — het tweede onderdeel van Sprint 1C, bijgewerkt na een onafhankelijke functionele review (zeven bevindingen verwerkt, waaronder het aanvankelijk ontbrekende beheerproces voor de productlevenscyclusstatus). Legt vast: de volledige werkomgeving waarin Beheerders en geverifieerde Producenten de Product Cloud-architectuur daadwerkelijk gebruiken — CRUD-flow, versiebeheer, moderatie- en verificatiewerkstroom, audit-/historyweergave, zoek-/filter-/bulkacties, rollen/rechten, API-overzicht, UX-flow op hoofdlijnen.

**Admin Shell & Dashboard Framework (`03-functional-specs/admin-shell/spec.md`) is definitief bevroren (v1.1)** — het derde onderdeel van Sprint 1C, bijgewerkt na een onafhankelijke generieke platformreview (vijf bevindingen verwerkt). Legt vast: een generiek module-registratiecontract (naam/route/icoon/permissie/navigatiepositie/widgets/KPI's/notificatietypen/taken/deep links) als de **enige** interactie tussen de Shell en elke huidige of toekomstige module — navigatiestructuur, contract-gebaseerd Dashboard Framework, contract-gebaseerd rechtenmodel, generieke dashboardcomponenten, UX-flow op hoofdlijnen. Introduceert geen nieuwe rollen, geen nieuwe API's, geen nieuwe database-entiteiten, en herimplementeert nergens bestaande modulefunctionaliteit.

**Moderation Center (`03-functional-specs/moderation-center/spec.md`) is definitief bevroren (v1.1)** — het vierde onderdeel van Sprint 1C, bijgewerkt na een onafhankelijke functionele review (zes bevindingen verwerkt, waaronder een aanvankelijk ontbrekende, architecturaal altijd-verplichte wachtrij voor eigendomsoverdracht tussen twee reeds geverifieerde eigenaren). Legt vast: zeven wachtrijtypen, generieke detailweergave, itemtype-specifieke acties, beslisregels, auditregistratie (incl. "Geen actie"), rechten. Geen nieuwe architectuur, entiteiten of API's. Verification Workflow blijft expliciet buiten scope (apart, toekomstig "Verification Center").

**Verification Center (`03-functional-specs/verification-center/spec.md`) is definitief bevroren (v1.1)** — het vijfde onderdeel van Sprint 1C, bijgewerkt na een onafhankelijke functionele review (twee bevindingen verwerkt: een citatiefout gecorrigeerd, en een ambiguïteit opgelost tussen automatische en door de Beheerder te beoordelen intrekkingstriggers). Legt vast: de volledige productverificatie-werkstroom (twee wachtrijtypen: nieuwe aanvragen, periodieke hercontrole/intrekking), detailweergave, acties, beslisregels, auditregistratie, rechten, Admin Shell-registratie. Geen nieuwe architectuur, entiteiten of API's; harde, wederzijdse scope-grens met Moderation Center en Product Management.

**Partner Center (`03-functional-specs/partner-center/spec.md`) is definitief bevroren (v1.1)** — het zesde onderdeel van Sprint 1C, bijgewerkt na een onafhankelijke functionele review (één bevinding verwerkt: een voorbeeld dat het Admin Shell-persona-principe tegensprak, gecorrigeerd). Legt vast: partneroverzicht en -detail voor reeds goedgekeurde partners, uitsluitend lezend — geen enkele muterende actie, omdat Partner Lifecycle Management (schorsen/deactiveren, rol toevoegen) al drie keer eerder expliciet buiten de MVP-scope is gehouden (Partner Onboarding, Product Cloud Architecture, Moderation Center). Geen nieuwe architectuur, entiteiten of API's.

**Order Management Center (`03-functional-specs/order-management-center/spec.md`) is definitief bevroren (v1.1)** — het zevende onderdeel van Sprint 1C, bijgewerkt na een onafhankelijke functionele review (twee bevindingen verwerkt: een foutieve interne verwijzing en een rekenkundig onjuiste claim, beide gecorrigeerd). Vult een al door Checkout aangekondigd, tot nu toe niet ingevuld uitzonderingsmechanisme in (mislukte ordersplitsing ná succesvolle betaling). Checkout, Winkelwagen en Orderbevestiging blijven volledig eigenaar van hun eigen flows; dit document toont uitsluitend reeds geplaatste orders. Uitsluitend lezend op één, smal begrensde schrijfactie na; één nieuwe, expliciet gemotiveerde Order-inzage-API, geen nieuwe database-entiteit.

Logisch vervolg, nog te starten: wireframe-uitwerking van de Admin Shell (formele Design System-registratie van de generieke componenten volgt dan), Product Management, Moderation Center, Verification Center, Partner Center en Order Management Center, het Retailer/Producent Dashboard-skelet (#30–32, #34–36), en Categorie-/filterbeheer (#61). #4 en #29 kunnen als kleinere, tussendoor op te pakken items meelopen. Zie sectie 6 (Eindadvies) voor de aanbevolen volgorde.

### Sprint 2 — Ordercyclus + eigenaarschap compleet (22 schermen, **5 gereed/gedeeltelijk na Sprint 3 P0**)
**Gereed (Sprint 3 P0):** #11, #50, #54, #57. **Gedeeltelijk (Sprint 3 P0):** #21 (Cookie Consent-onderdeel). Ontbreekt nog volledig: #12–17 (publiek/klant), #33, #37–42 (partner, met #40/#41/#42 nu deels gedekt door de Seller Dashboard-navigatiestructuur uit Sprint 3 P0, zonder dat deze specifieke schermen zelf al zijn uitgewerkt), #45 (partner), #56, #58 (admin).

### Sprint 3 — Should Have: vertrouwen, compliance, groei (16 schermen, 0 gereed)
Ontbreekt volledig: #19–20, #22–23 (publiek), #43–44, #46–49, #51, #53 (partner), #59–60, #62, #64 (admin).

### Post-MVP (7 schermen, bewust niet gepland binnen Sprint 1–3)
#24–25, #52, #63, #67–68 — correct buiten scope, geen actie nodig vóór MVP-livegang. **Correctie (ontdekt tijdens de Sprint 3 P0-consistentiecontrole, los van dit wireframe-werk zelf):** deze regel vermeldde voorheen abusievelijk "#65–68" — #65 en #66 (Affiliate) zijn na de definitieve scopewijziging (ADR-52) al geruime tijd MVP, niet Post-MVP, en zijn bovendien inmiddels ook al gewireframed (Sprint 3 P0). Uitsluitend #67 (Creator) en #68 (Wishlist) horen in dit rijtje thuis.

---

# 4. Afhankelijkheden

Welke schermen moeten eerst bestaan voordat andere schermen logisch kunnen volgen — uitsluitend gebaseerd op reeds vastgelegde afhankelijkheidsredenen (`wireframe-strategie.md`, `checkout/spec.md`, functionele specs):

| Voorwaarde (moet eerst bestaan) | Maakt mogelijk | Bron |
|---|---|---|
| Design System v1.0 (✓ gereed) | Elk volgend scherm | Vastleggingsregel, alle documenten |
| Productpagina + Buy Box (✓ gereed) | Checkout, Zoekresultaten/Categoriepagina (hergebruiken CMP-013/014/017), Retailerdashboard Buy Box-positie-indicator (Sprint 1C/2) | Wireframe Strategy sectie 4 |
| Checkout (✓ gereed) | Winkelwagen (✓ gereed), Orderbevestiging (✓ gereed) | `checkout/spec.md` sectie 1, sectie 11 |
| Homepage (✓ gereed) | Niets structureel — Zoekresultaten/Categoriepagina zijn parallel te bouwen, niet afhankelijk van Homepage zelf, wel van hetzelfde Marketplace Template | Wireframe Strategy sectie 4 |
| Zoekresultaten + Categoriepagina (✓ gereed) | Subcategoriepagina (#4, "zelfde template als #3", nog niet gestart) | Wireframe Strategy, Sprint 1-motivatie |
| Inloggen/Registreren (✓ gereed, incl. 2FA) | Checkout Stap 0 kon al zonder (gastflow was al volledig ontworpen); Partner Onboarding (✓ gereed, vereiste de verplichte e-mailverificatie-gate), Mijn bestellingen (#11), Account (#17) — die laatste twee vereisen nog wel een bestaand authenticatiescherm en zijn Sprint 2-scope | ux-architecture.md sectie 4, Checkout-spec sectie 3/8, Authenticatie-spec sectie 1.8 |
| Partner Onboarding #26–28 (✓ gereed) | Retailer/Producent Dashboard-skelet #30–32/34–36 (Sprint 1C — nu pas zinvol: er bestaan dankzij Onboarding daadwerkelijk goedgekeurde partneraccounts), Partnerbeheer Admin #55 (waar de reviewer-checklist uit Partner Onboarding Stap 3 landt), Wijzigingsvoorstel indienen/beoordelen (#37–39, Sprint 2) | `partner-onboarding/spec.md`, Wireframe Strategy Sprint 1C-motivatie |
| Orders (#40, ontbreekt) | Rapportages (#45), Uitbetalingen (#50) — beide vereisen afgeronde orderdata | Wireframe Strategy, Sprint 2-motivatie |
| Compliance Dashboard + Quality Score (#47–48, ontbreken) | Verified™-aanvraag (#49) — inhoudelijk verbonden met de bedrijfsniveau-productieclaim uit Partner Onboarding Stap 3, maar een aparte, productniveau-beoordeling | Functionele spec Product Cloud, sectie 1.10; `partner-onboarding/spec.md` Stap 3 |
| Advertenties — beschikbaarheid (#43, ontbreekt) | Advertentie-inventorybeheer Admin (#60) | Wireframe Strategy, Sprint 3-motivatie |

**Geen enkele afhankelijkheid wijst terug** naar een nog niet gereed onderdeel van Sprint 1A of Sprint 1B — bevestigt dat Sprint 1C zonder blokkade gestart kan worden.

---

# 5. Architectuurcontrole

**Komen alle schermen uit de Blueprint terug?**
Ja — alle 67 oorspronkelijke schermen zijn herleidbaar naar een Blueprint-hoofdstuk (`ux-architecture.md` sectie 5, met per scherm de Must/Should/Could Have-onderbouwing). Het enige niet uit de Blueprint afkomstige scherm (#68, Wishlist) is expliciet als scope-toevoeging gemarkeerd (UX-review F5) en naar Post-MVP verplaatst — geen onbedoelde toevoeging.

**Zijn alle UX-flows compleet?**
Voor de nu bevroren schermen: ja, met twee bevestigde, verholpen tekortkomingen. (1) De Customer Journey Audit (J2) vond dat Orderbevestiging (#8) onvoldoende was voorbereid op de expliciete belofte die Checkout doet over ordersplitsing — verholpen met een minimumvereisten-paragraaf (`checkout/spec.md` sectie 11), later volledig uitgewerkt in `orderbevestiging/spec.md`. (2) De onafhankelijke architectuurreview op Partner Onboarding vond vijf verbeterpunten (ontbrekende tussenstatus, ontbrekende e-mailverificatie-afdwinging, zwak mobiel uploadpatroon, onvoldoende beveiligingseisen, ontbrekende reviewer-checklist) — alle vijf verwerkt vóór bevriezing (`partner-onboarding/spec.md` v1.1). Geen andere onvolledige flows gevonden binnen wat al ontworpen is.

**Ontbreken er schermen?**
Nee, niet ten opzichte van de Blueprint-scope. Wel ontbreken er, zoals sectie 2/3 hierboven laat zien, **58 van de 68 schermen nog als wireframe** — dat is verwacht op dit punt in het project, geen architecturaal gebrek. #29 (Verzendinstellingen) is bewust, met expliciete onderbouwing, buiten de Partner Onboarding-scope gehouden (zie sectie 3) — een bekende MVP-beperking, geen vergeten scherm.

**Bestaan er dubbele schermen?**
Nee. De enige twijfelgevallen zijn de bewust gedeelde schermen tussen Retailer en Producent (#26–31, #42, #45, #50–53) en tussen Affiliate en Creator (#65) — dit zijn geen duplicaten maar één scherm met meerdere doelgroepen, al zo vastgelegd in `ux-architecture.md` sectie 1 (rollen kunnen gecombineerd worden, bijv. een producent die ook retailer is) en nu concreet bevestigd door Partner Onboarding's meervoudige rolselectie.

**Consistentiecontrole vóór afsluiting Sprint 1B (uitgevoerd):**
- ✓ **Blueprint-consistent** — rollen (H9.3), onboardingvolgorde (H9.4, op #29 na expliciet gemotiveerd), producent-voorrangsprincipe (H9.8), Buy Box-neutraliteit, BTW/OSS-uitgangspunt — allemaal herleidbaar.
- ✓ **UX-architectuur-consistent** — Focused Flow Template consequent toegepast op Winkelwagen, Checkout, Orderbevestiging, Authenticatie-flow en Partner Onboarding (`wireframe-strategie.md`).
- ✓ **Design System-consistent** — 41 componenten, geen dubbele/overlappende componenten (expliciet getoetst bij elke toevoeging, laatst bevestigd in `coverage-matrix.md`).
- ✓ **Product Cloud-consistent** — Producent/Merkhouder-rechten ongewijzigd, Partner Onboarding kent uitsluitend de rol toe.
- ✓ **Commerce Cloud-consistent** — Retailer/Distributeur-rechten (Offers aanmaken) ongewijzigd, uitsluitend toegekend.
- ✓ **RBAC-consistent** — server-side afgedwongen autorisatie, rollen optelbaar, Dashboard-toegang vereist zowel Goedgekeurd als actieve 2FA (Authenticatie-spec ↔ Partner Onboarding, wederzijds correct verwezen).
- ✓ **MVP-consistent** — vijf aanbevelingen uit de architectuurreview bewust buiten scope gehouden (Distributeur-rol, meerdere productielocaties, Partner Lifecycle Management, ERP/PIM, Verzendinstellingen), expliciet vastgelegd, niet stilzwijgend weggelaten.
- ✓ **Geen wijzigingen aan eerder bevroren schermen** buiten de twee gecontroleerde, geautoriseerde synchronisatie-updates (Checkout's BTW-weergave, meegegroeid met Orderbevestiging) — bevestigd via bestandshash bij elke stap.
- ✓ **Versienummers synchroon** — Checkout v1.3, Orderbevestiging v1.3 (identieke BTW-structuur), Authenticatie-flow v1.1, Partner Onboarding v1.1, Winkelwagen v1.0 (ongewijzigd sinds bevriezing).
- ✓ **Componentaantal correct** — 41 componenten in zowel `components.md` als `coverage-matrix.md` (41 rijen), onderling consistent.

---

# 6. Eindadvies

**Sprint 1A en Sprint 1B zijn beide volledig afgerond.** De volledige MVP-kernflow (Homepage → Categorie/Zoekresultaten → Productpagina → Winkelwagen → Checkout → Orderbevestiging) én de volledige consument-/partner-toegangsflow (Registreren → Inloggen → 2FA → Partner Onboarding → Goedkeuring) staan end-to-end, definitief bevroren, in wireframe-vorm.

**Aanbevolen prioriteit voor Sprint 1C:**

1. **Retailer/Producent Dashboard-skelet (#30–32, #34–36)** — nu pas zinvol te ontwerpen: dankzij Partner Onboarding kunnen er daadwerkelijk goedgekeurde partneraccounts met een actieve rol bestaan die het Dashboard mogen betreden. Volgt dezelfde diepgang (architectuuranalyse, UX-review) als de eerdere kernonderdelen.
2. **Admin-skelet — Partnerbeheer (#55)** — waar de handmatige EU-productieverificatie (met de nu al vastgelegde reviewer-checklist, `partner-onboarding/spec.md` Stap 3) en de behandeling van de status "Aanvullende informatie vereist" daadwerkelijk landen. Zonder dit scherm bestaat de beoordelingsstap alleen op papier.
3. **Categorie-/filterbeheer (Admin, #61)** — kleiner, onafhankelijk van de Dashboard-keten, kan tussendoor.
4. **Subcategoriepagina (#4) en Verzendinstellingen (#29)** — beide klein, bewust doorgeschoven, geen architecturale afhankelijkheden die eerst opgelost moeten worden.

**Bekende, bewuste MVP-beperkingen om mee te nemen naar Sprint 1C (geen tekortkomingen, wel aandachtspunten):**
- Rol toevoegen aan een reeds actief Partneraccount (bijv. Retailer die later ook Producent wordt) heeft nog geen eigen, verkorte flow.
- Partner Lifecycle Management (schorsen/beëindigen van een goedgekeurd partneraccount) ontbreekt nog volledig — relevant zodra de eerste partners actief zijn.
- KvK-/BTW-validatie is beperkt tot formaatcontrole, geen live registerkoppeling (bewuste MVP-scopekeuze).
- Eén actieve TOTP-koppeling per account (geen meerdere gelijktijdige authenticator-apps).
