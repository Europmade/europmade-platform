# Marketing, Communicatie & Partner Engagement — Architectuur & MVP

**Status:** Architectuur vastgelegd. P0-01 t/m P0-06 gebouwd (zie §16.1).  
**Datum:** 2026-10-05  
**Bijgewerkt:** 2026-10-06 — P0-06 conversie en human follow-up vastgelegd zoals gebouwd. Eerder dezelfde dag: P0-05 orchestrator; Crisp als externe laag; contentlocatie, enrollment-uniekheid en P0-grens.  
**Bindende beslissingen:** [ADR-0047](../04-decisions/0047-engagement-content-automation-separation.md)  
**Raakt:** ADR-0026 (notification feed), ADR-0036 (AI content offline-first), ADR-0041 (partnerrollen), Blueprint Deel 14

Dit document is de **definitieve architectuur** voor Marketing, Communicatie & Partner Engagement. Het vervangt eerdere chat-ontwerpen als bron van waarheid. P0-01 t/m P0-06 zijn gebouwd binnen deze architectuur; de orchestrator staat in §10.4, conversie en human follow-up in §10.5, de bouwstatus in §16.1. Functionele marketingstrategie (tone of voice, propositie, exacte sequence-teksten) hoort **niet** hier — die volgt in een aparte Marketing-fase.

---

## Architectuur-besluiten die NIET meer ter discussie staan

1. **Content en automation zijn gescheiden.** Engagement bepaalt *wie, wanneer, waarom en welke goedgekeurde content*. Communication CMS bepaalt *wat* er wordt gezegd.
2. **CMS beheert communicatiecontent** (templates, varianten, locales, versies). Automation verwijst naar content-ID’s; teksten zitten niet hardcoded in business logic.
3. **Meerdere contentvarianten per template zijn toegestaan.** A/B-testing komt later; het model laat het toe.
4. **AI genereert voorstellen**, geen autonome onbeperkte verzending. Alleen goedgekeurde content mag de automation gebruiken.
5. **Prospectclassificatie is niet verplicht vóór outreach.** Import mag starten met minimale velden; `unknown` is geldig.
6. **Organization kan meerdere rollen hebben** (brand, seller, manufacturer, distributor, retailer, other, unknown).
7. **Unknown is een geldige status** voor rollen, sales model en vergelijkbare classificatiewaarden.
8. **Self-classification is onderdeel van de toekomstige outreach-flow** (routing-vragen, geen verplichte “bent u brand of seller?”-gate vooraf).
9. **Acquisition en onboarding zijn gescheiden.** Bij registratie: acquisition STOP + onboarding START. Nooit parallel actief zonder expliciete uitzondering.
10. **Crisp is de externe communicatie-, inbox- en human-handoverlaag.** EuropMade bouwt geen mailbox. Reply stopt alleen acquisition; het gesprek blijft in Crisp. Het Crisp-API/MCP-contract wordt niet in deze architectuur ontworpen of geïmplementeerd.
11. **Engagement Orchestrator blijft de automationlaag** (triggers, enrollments, stopregels, render via content-refs, history). Marketingmail gaat later via een e-mailproviderinterface ([ADR-0049](../04-decisions/0049-marketing-delivery-provider.md)). Crisp blijft de conversatie- en overdrachtslaag. P0 verzendt niet. Transactionele Medusa-notificaties en `em_conversation` blijven hiervan gescheiden.

---

## 1. Doel en uitgangspunten

### 1.1 Doel

Eén geïntegreerde communicatie-infrastructuur voor de **Seller Lifecycle** én later newsletters/campagnes voor klanten, sellers en affiliates — flexibel genoeg om marketinginhoud later te optimaliseren **zonder** herontwerp van de technische architectuur.

### 1.2 Communicatielagen

| Laag | Verantwoordelijkheid | Systeem |
|------|----------------------|---------|
| **A Engagement** | Wie, wanneer, waarom, welke goedgekeurde content | Engagement Orchestrator |
| **A′ Content** | Wat er wordt gezegd (subject, preheader, body, CTA, locale, variant, versie) | Communication CMS |
| **B Externe communicatie** | Inbox, human handover, het gesprek | **Crisp** (extern). Geen EuropMade-mailbox. API/MCP-contract nog niet ontworpen. |
| **C Transactioneel** | Auth, MFA, order, return, refund | Medusa Notification / `notificationFeed` (ADR-0026). Volledig gescheiden van Crisp en van Engagement-verzending. |
| **D Orderberichten** | Order- en seller/klantberichten | `em_conversation` (ADR-0025). Volledig gescheiden. |
| **E Partner Platform** | Kennis/leren | SellerGate + partner content (geen mailbox, geen Crisp-inbox, geen BO-vervanging) |

### 1.3 Harde scheiding: Automation vs Content vs AI

| Laag | Bepaalt | Bepaalt níet |
|------|---------|--------------|
| **Automation** | Wie, wanneer, waarom, welke `approved` + `active` version, lifecycle-fase, stopregels | Onderwerp, body, CTA-tekst, tone of voice |
| **Content / CMS** | Subject, preheader, body, CTA, links, personalisatievelden, locale, versie, beschikbare varianten | Verzendmoment, audience-selectie, stopregels |
| **AI** | Voorstellen/varianten ter review | Zelfstandig verzenden; zelfstandig audience kiezen; feiten verzinnen |

**Regel:** automation verwijst uitsluitend naar een TemplateVersion met approval `approved` én activation `active` (`template_id` + `variant_id` + `version`). Subject, body, locale en tokens staan niet op de template. Geen marketingtekst in workflow-code.

### 1.4 Marketingstrategie vs techniek

De softwarearchitectuur legt **niet** de marketingstrategie vast. Tone of voice, propositie, timing, segmentatie, aantal follow-ups, CTA-copy en sequence-opbouw worden later als aparte Marketing-fase ingevuld. Dit document levert de **technische fundering** zodat die fase zonder architectuurwijziging past.

---

## 2. Seller Lifecycle

```
PROSPECT
→ SELLER ACQUISITION
→ REGISTRATIE
→ SELLER ONBOARDING
→ PRODUCTACTIVATIE
→ ACTIEVE SELLER
→ GROEI / RETENTIE
```

| Overgang | Communicatie-effect |
|----------|---------------------|
| Reply (menselijk, in Crisp) of handmatig “replied” | Alleen **acquisition**-enrollment STOP → status `human_follow_up`. Het gesprek blijft in Crisp. |
| Registratie / convert | Acquisition STOP + **onboarding**-program START |
| Opt-out / manual stop | Betreffende enrollments STOP (zie stopregels) |

**Enrollment-uniekheid (locked).** Een Contact heeft maximaal één `active` Enrollment per `program_type`. Een Contact heeft nooit tegelijk een `active` acquisition-enrollment én een `active` onboarding-enrollment. `human_follow_up` is geen `active` enrollment en mag naast een actieve onboarding bestaan: reply stopt alleen acquisition. Een nieuwe enrollment is idempotent; hetzelfde trigger-event maakt geen tweede actieve enrollment. Stopregels blijven leidend bij conversion, reply, unsubscribe, suppression en bounce. De databaseconstraint moet dit afdwingen waar dat kan. De SQL wordt hier niet uitgewerkt.

---

## 3. Prospect Database

Gebruik **niet** één simpel veld `type = brand|seller`.

### 3.1 Conceptuele entiteiten

| Entiteit | Doel |
|----------|------|
| **Organization** | Bedrijf/merk/producent als CRM-entiteit vóór (en naast) registratie |
| **Contact** | Persoon + e-mail op een Organization |
| **OrganizationRole** | Meerdere rollen per organization (set) |
| **SalesModel** | Hoe het bedrijf verkoopt |
| **OutreachPurpose** | Doel van de outreach (seller acquisitie, brand partnership, info, …) |
| **ProspectEnrollment** | Koppeling organization/contact ↔ acquisition sequence |
| **ImportBatch** | Herleidbaarheid van Excel/CSV-import |

### 3.2 Rollen (multi-value)

`brand` | `seller` | `manufacturer` | `distributor` | `retailer` | `other` | **`unknown`**

### 3.3 Sales model (voorbeeldwaarden)

`direct_to_consumer` | `reseller_only` | `mixed` | `brand_seeking_partners` | **`unknown`**

### 3.4 Minimale import (mag starten zonder classificatie)

Verplicht/bruikbaar bij import:

- `category` (optioneel)
- `company_name`
- `website` (optioneel)
- `email`

Defaults:

- `roles = [unknown]`
- `sales_model = unknown`
- `outreach_status = new`
- `source = excel_import`
- `import_batch_id = …`

### 3.5 Relatie tot bestaande Seller/Customer

- Na convert: soft refs `converted_customer_id` / `converted_seller_id`.
- **Geen** tweede Seller-tabel. Geregistreerde multi-rol (retailer / brand_owner / producer) blijft ADR-0041 op `seller`.
- Prospect-Organization-rollen en Seller-vlaggen zijn **verschillende lifecycle-stadia**; mapping bij convert is configureerbaar later, niet 1:1 verplicht bij import.

### 3.6 Self-classification (outreach)

Eerste outreach vraagt **niet** verplicht “bent u brand of seller?”, maar routes zoals:

1. Wij verkopen rechtstreeks aan consumenten.  
2. Wij verkopen via retailers/resellers.  
3. Beide.  
4. Wij zijn vooral merk/producent en zoeken verkooppartners.  
5. Anders / n.v.t.

Vervolg: “Zou u zelf via EuropMade willen verkopen?” → `ja` | `nee_via_partners` | `maybe` | `not_relevant`.

Resultaten vloeien terug naar Organization (`sales_model`, roles, outreach_purpose, self_classification_payload).

### 3.7 Referral-model

```
Organization A  --referral-->  Organization B
```

Velden (conceptueel): `source = brand_referral`, `referrer_organization_id`, `referred_organization_id` / prospect-link.

Een organization mag tegelijk: zelf seller worden, brand blijven, én resellers aandragen. Geen single-type lock.

---

## 4. Seller Acquisition

- Sequence van typisch 4–6 stappen (aantal = marketingconfig, niet hardcoded architectuurlimiet).
- Steps verwijzen naar **template + variant**. Geen tekst en geen `version_id` op de step. De orchestrator kiest de hoogste TemplateVersion met approval `approved` en activation `active` (§10.4).
- Stopregels: reply, registratie, opt-out, manual, hard bounce, sequence exhausted.
- AI-drafts zijn niet P0. Later mag AI een draft voorstellen; die is pas verzendbaar nadat zij een TemplateVersion is met approval `approved` en activation `active`.

---

## 5. Seller Onboarding

Aparte **Lifecycle Program** (niet dezelfde sequence als acquisition).

Triggers bij voorkeur **event/status + guard** (milestone ontbreekt + cooldown), niet uitsluitend “dag N”:

- seller/account aangemaakt, onboarding-statuswijzigingen, `SellerOnboarded`
- merk/product milestones, verificatie, publicatie, eerste verkoop

Exacte rule-set is later configureerbaar (P1 Admin rule editor). P0-05 gebruikt een vaste env-config per `program_type`: één `program_id` en één `sequence_id`. Geen database-tabel en geen automatische keuze van het eerste programma. De SequenceStep verwijst naar `template_id` + `variant_id`. De orchestrator kiest zelf de TemplateVersion (zie §10.4). P0 leest bestaande status en `SellerOnboarded`, en emit geen nieuwe product- of verificatie-events. Alle seller-milestones van P0-05 gebruiken `program_type = onboarding`.

---

## 6. CMS / communicatiecontent

### 6.1 Positie t.o.v. bestaande CMS-module

- Bestaande `cms_page` / homepage / `ad_campaign` blijven storefront/ads.
- Communicatiecontent is een **dedicated contentdomein** (conceptueel “Communication CMS”), beheerd in Admin.
- Hergebruik: i18n/JSONB-patronen, editor-UX, publish-workflow-ideeën uit CMS; **niet** ad_campaign of homepage-newsletter-stub hergebruiken als template-store.

### 6.2 CommunicationTemplate (alleen identiteit)

| Veld | Toelichting |
|------|-------------|
| `id` | Stabiele ID |
| `name` | Beheernaam |
| `communication_type` / programmatype | acquisition \| onboarding \| lifecycle \| newsletter \| campaign \| operational |
| overige identiteitsmetadata | Bijvoorbeeld een optionele, zachte step-binding. Geen inhoud. |
| `created_at`, `updated_at` | |

Niet op de template: locale, subject, preheader, body, CTA, personalization-tokens, version number, approval, activation.

### 6.3 TemplateVariant (per locale)

Eén template, meerdere varianten (A persoonlijk, B zakelijk, C kort, of een andere locale).

| Veld | Toelichting |
|------|-------------|
| `locale` | nl / en / … |
| variant-identiteit / naam | Redactionele identiteit binnen de template |

Geen subject, body of approval op de variant zelf. Die staan op de version.

### 6.4 TemplateVersion (immutable inhoud)

| Veld | Toelichting |
|------|-------------|
| subject, preheader, body, CTA | De tekst van deze versie |
| personalization token whitelist | Toegestane tokens voor deze versie |
| version number | Monotoon per variant |
| approval status | `draft` \| `pending_review` \| `approved` \| `rejected` |
| activation status | `inactive` \| `active` \| `archived` |
| overige contentmetadata | Alleen wat bij deze versie hoort |

Regels:

- Een inhoudswijziging maakt een nieuwe TemplateVersion.
- Een gebruikte versie wordt nooit gewijzigd.
- Een AI-draft is geen verzendbare version tot zij is goedgekeurd en als TemplateVersion is vastgelegd.
- Alleen approval `approved` én activation `active` mag later worden verzonden.
- Een step kiest één zulke version. Meerdere goedgekeurde versions mogen beschikbaar zijn.
- **Geen A/B-testing in P0**; het model laat dat later toe zonder deze drie niveaus te herbouwen.

### 6.5 Partner content

`PartnerArticle` (of CMS-subtype met seller-only visibility + lifecycle-tags) voor deep-links vanuit mails. Partner Platform ≠ Communication Template-store, maar deelt CMS-beheerprincipes.

---

## 7. AI-assisted content

### 7.1 Scope

Voorstellen voor: acquisition/follow-ups, subjects/preheaders/CTA’s, onboarding-mails, nieuwsbriefcontent, alternatieve formuleringen, doelgroepvarianten, eventueel Partner-artikelen.

### 7.2 Toegestane context (alleen brondata)

Bedrijfsnaam, contactpersoon, websitevelden, categorie, bekende rollen, sales model, outreach purpose, sequence step, beschikbare product-/merkmetadata, lifecycle status — **geen verzonnen claims** (Verified™, Made in Europe, EU ownership, etc. alleen als expliciet aanwezig in brondata).

### 7.3 AiDraft-model

```
proposed → edited → approved → rejected
                ↘ used (na verzending gekoppeld aan MessageSend)
```

Koppelingen: `template_id`, `variant_id`, `sequence_step_id`, prospect/organization context, `creator` / `source` (human|ai), `approval_status`, `approved_by`, timestamps.

### 7.4 Relatie ADR-0036 / ADR-0035

- Zelfde geest: geen stille page-load AI; expliciete generate/approve.
- Engagement-AI is **apart** van CMS SEO offline-analyzer en van moderatie-advisor (ADR-0035). Providerkeuze/EU-DPA blijft extern/ADR-plichtig vóór cloud-LLM in productie.

---

## 8. Campaigns / newsletters

Zelfde Orchestrator, program type `campaign` | `newsletter`.

Audiences: Customer / Seller / Affiliate + marketing consent.  
Segmenten, planning, templates/varianten, unsubscribe, history — **P1** (architectuur nu al voorzien).

Onderscheid: marketing vs transactioneel vs operationeel (zie consent §13).

---

## 9. Partner Platform

- Knowledge/learning layer achter **SellerGate** (bestaande Customer-sessie + goedgekeurde seller + MFA).
- **Geen** mailbox, **geen** Crisp-inbox in EuropMade, **geen** vervanging Seller Backoffice.
- E-mails deep-linken naar artikelen (`/partner/...` of equivalent).
- Content koppelbaar aan lifecycle-milestones (tags).
- PartnerArticle is niet P0. P1: artikelen en deep-links.

---

## 10. Engagement Orchestrator

Centrale automationlaag in de bestaande Medusa-module `engagement`. P0-05 is gebouwd (§10.4). De orchestrator bevat geen marketingtekst en verzendt niets.

### 10.1 Pipeline

1. Trigger ontvangen (event / cron / admin)  
2. Audience/recipient bepalen  
3. Lifecycle/status controleren  
4. Enrollment bepalen  
5. Stopregels evalueren  
6. Template bepalen (**ID**, geen inline tekst)  
7. Variant en een version met approval `approved` én activation `active` bepalen  
8. Personalisatie/context (alleen de whitelist van die version + brondata)  
9. Bericht renderen vanuit die version  
10. CommunicationEvent vastleggen (`queued` of `stopped` in P0)  
11. Volgende step plannen  

**P0 verzendt niet.** P0-05 voert stappen 8 en 9 niet uit: geen render, geen personalisatie, geen provider. History is uitsluitend `queued` of `stopped`; status `sent` wordt niet geschreven. Geen aanroep van Crisp en geen aanroep van `dispatchNotificationWorkflow`. Marketingmail krijgt later een eigen providerinterface (ADR-0049); Crisp blijft conversatie en overdracht. `notificationFeed` en `Modules.NOTIFICATION` blijven het transactionele pad (ADR-0026). Ze zijn niet het Engagement-kanaal.

### 10.2 Boundary

Orchestrator **bevat geen** marketingtekst.  
Orchestrator **vervangt niet** order-messaging (`em_conversation`) en **is niet** de Crisp-inbox.  
Transactionele notificaties, Engagement en `em_conversation` blijven drie gescheiden stromen. Crisp is alleen de externe communicatie-/handoverlaag van Engagement.

### 10.3 Runtime-afhankelijkheden

- Scheduled jobs: Medusa-cron in `apps/backend/src/jobs`. P0-05 heeft één job, `engagement-milestone-scan` (`*/15 * * * *`). Geen Redis en geen Bull.
- Productie: Redis (of equivalent) voor betrouwbare Event Bus/Workflow bij multi-instance blijft een **latere infra-afhankelijkheid**. Geen onderdeel van P0-05.

### 10.4 P0-05 — gebouwd

**Status: COMPLETE.** Geen nieuwe migration: de programma-koppeling is env, geen tabel.

**Orchestrator.** Verwerkt alleen Enrollments met `status = active` waarvan `next_step_at <= now`. Bepaalt de huidige SequenceStep, de TemplateVariant van die step, en de TemplateVersion met de hoogste `version_number` waarvoor `approval_status = approved` en `activation_status = active`. Een andere versie wordt niet gebruikt.

Bestaat zo’n version, dan controleert de orchestrator opnieuw actieve Suppression voor de preference category van het programma (`onboarding` → `operational`). Geen suppression: `recordCommunicationEvent` met status `queued` en `template_version_id`. Wel suppression: status `stopped`, geen `queued`; de enrollment wordt `suppressed` en `next_step_at` wordt `null`.

Geen sendable version: één `CommunicationEvent` met status `stopped`. De step schuift niet op. Een volgende run slaat die step over zolang dat `stopped`-event er al is. Verschijnt later een geldige version, dan wordt alsnog `queued`.

Na een `queued` event: volgende SequenceStep is de eerstvolgende hogere `step_order`. `next_step_at = now + delay_minutes` van díe volgende step. Geen volgende step: `status = completed`, `next_step_at = null`. `sequence_step_id` blijft de laatste step, omdat die kolom verplicht is.

**Timing.** Eerste step: `next_step_at = now + delay_minutes` van de step met de laagste `step_order`. `delay_minutes = 0` is direct due. Er is geen andere datumlogica. De subscriber plant de eerste step; de job verwerkt due stappen.

**Configuratie.** Per `program_type` exact één programma en één sequence, via env:

| program_type | program | sequence |
|--------------|---------|----------|
| acquisition | `ENGAGEMENT_ACQUISITION_PROGRAM_ID` | `ENGAGEMENT_ACQUISITION_SEQUENCE_ID` |
| onboarding | `ENGAGEMENT_ONBOARDING_PROGRAM_ID` | `ENGAGEMENT_ONBOARDING_SEQUENCE_ID` |
| lifecycle | `ENGAGEMENT_LIFECYCLE_PROGRAM_ID` | `ENGAGEMENT_LIFECYCLE_SEQUENCE_ID` |
| newsletter | `ENGAGEMENT_NEWSLETTER_PROGRAM_ID` | `ENGAGEMENT_NEWSLETTER_SEQUENCE_ID` |
| campaign | `ENGAGEMENT_CAMPAIGN_PROGRAM_ID` | `ENGAGEMENT_CAMPAIGN_SEQUENCE_ID` |
| operational | `ENGAGEMENT_OPERATIONAL_PROGRAM_ID` | `ENGAGEMENT_OPERATIONAL_SEQUENCE_ID` |

Beide waarden moeten gezet zijn. Ontbreekt de config: duidelijke log, geen enrollment.

**Ontvanger.** Alleen `seller_id` → bestaande seller/customer-relatie → `Organization.converted_seller_id` → Contact. Geen nieuwe foreign keys naar Seller of Customer. Geen seller, geen customer-koppeling, geen organization, meer dan één organization, of geen contact: log waarom, geen enrollment. De bestaande `SellerOnboarded`-flow wordt daardoor niet onderbroken.

**SellerOnboarded** blijft de primaire onboarding-trigger. Subscriber op het bestaande event, payload `{ seller_id }`, trigger key `seller_onboarded:${seller_id}`. Enrollment uitsluitend via `enrollContact`.

**Milestone-scan.** Eén job ontdekt de overige milestones op bestaande data. Geen nieuwe lifecycle-events. `onboarding_approved` is alleen een vangnet naast `SellerOnboarded`, met een andere trigger key.

Alle onderstaande milestones gebruiken `program_type = onboarding`:

| Milestone | Voorwaarde | trigger_key |
|-----------|------------|-------------|
| Account created | seller, status `Concept` | `account_created:${seller_id}` |
| Onboarding submitted | `Ingediend` of `In beoordeling` | `onboarding_submitted:${seller_id}` |
| Onboarding approved (vangnet) | `Goedgekeurd` | `onboarding_approved:${seller_id}` |
| First product | vroegste `product_version.created_by_seller_id` | `first_product:${seller_id}` |
| Product incomplete | `computeProductCompleteness`, `information_quality = insufficient` | `product_incomplete:${product_version_id}` |
| Verification | `product_origin` status `Geverifieerd` | `verification:${product_origin_id}` |
| Product published | `publication_status = Gepubliceerd` | `product_published:${product_version_id}` |
| First sale | vroegste `em_order` met `seller_id` (gevuld vanuit OrderSplit). Niet `OrderPlaced`. | `first_sale:${seller_id}` |

**Idempotency.** Alleen `enrollContact` met `trigger_key`. Dezelfde key levert de bestaande enrollment terug en zet `next_step_at` niet terug. Subscribers en de job doen geen rechtstreekse Enrollment-inserts. Een tweede trigger op hetzelfde contact terwijl een actieve onboarding-enrollment bestaat, volgt de bestaande active-regel en wordt gelogd.

**CommunicationEvent** is history. P0-05 schrijft `queued` of `stopped` en nooit `sent`.

**Niet in P0-05:** Crisp, e-mailprovider, AI/LLM, `Modules.NOTIFICATION`, `dispatchNotificationWorkflow`, `em_conversation`, Redis, Bull, nieuwe Seller- of Customer-tabellen, Admin UI, en wijzigingen aan bestaande transactionele notification flows. Conversie en handmatig “mark as replied” staan in §10.5 (P0-06).

### 10.5 P0-06 — gebouwd

**Status: COMPLETE.** Geen nieuwe migration en geen nieuwe enrollmentstatus. Geen CommunicationEvent voor conversie of human follow-up. Niets wordt verzonden.

**Conversion.** `convertOrganization` markeert een bestaande Organization als geconverteerd. De functie schrijft uitsluitend de soft refs `converted_customer_id` en `converted_seller_id`. Geen foreign key en geen nieuw Customer- of Seller-record. Een al gevulde ref wordt niet overschreven. Dezelfde conversie opnieuw is idempotent. Het resultaat noemt het type `customer`, `seller` of `both`.

Bij conversie stopt alleen een **active acquisition** (`stopEnrollmentForConversion`, reden `conversion`; Enrollment heeft geen reden-kolom). Onboarding start daarna alleen via de bestaande `enrollContact` en de P0-config uit §10.4, met trigger `organization_converted:${organization_id}`. Ontbreekt die config, dan geen onboarding-enrollment; de soft refs en de acquisition-stop blijven staan. Een contact met al een active onboarding krijgt geen tweede enrollment.

**Human follow-up.** `markContactForHumanFollowUp` zet alleen een **active acquisition** op `human_follow_up` en maakt `next_step_at` `null`. Onboarding blijft active. `stopped`, `completed` en `suppressed` blijven ongewijzigd. Opnieuw aanroepen verandert niets. De orchestrator verwerkt `human_follow_up` niet. Er wordt geen CommunicationEvent aangemaakt.

`human_follow_up` is een automatische communicatiestop. Geen Crisp-conversatie en geen mailbox. Crisp blijft de latere externe handover-laag.

---

## 11. Communication history

Minimaal vastleggen per send/stop:

- recipient (prospect contact / customer_id)  
- timestamp  
- sequence / step / program  
- `template_id`, `variant_id`, `version`  
- of AI-draft is gebruikt (`ai_draft_id`) + wie content goedkeurde  
- status (queued, sent, bounced, failed, stopped)  
- bounce / unsubscribe / reply-stop signaal  
- provider message id (indien beschikbaar)

Doel: controle, debugging, marketinganalyse, audit.

---

## 12. Crisp

**Keuze:** Crisp is de definitieve externe communicatie-, inbox- en human-handoverlaag.

**In repo:** geen Crisp-code, -config, -API of -MCP. Het contract wordt in dit document **niet** ontworpen en **niet** geïmplementeerd.

**EuropMade**

- Engagement bepaalt wie, wanneer, waarom en welke goedgekeurde content.
- Communication CMS bepaalt wat er wordt gezegd.
- De orchestrator legt communication history vast. In P0 is dat `queued` of `stopped`, zonder verzending. Latere verzending gaat richting Crisp, pas nadat het contract vastligt.
- Bij reply, of zolang er geen koppeling is bij handmatig “Mark as replied”: acquisition-enrollment → `human_follow_up`.
- EuropMade bouwt geen eigen mailbox. Admin toont alleen de EuropMade-status: “Persoonlijke opvolging actief in Crisp.”

**Crisp**

- De inbox en het menselijke gesprek. De conversatie blijft in Crisp.

**Later, niet nu**

Een EuropMade MCP/API-laag kan gecontroleerde EuropMade-data aan Crisp beschikbaar stellen. Die laag, inclusief tools en payloads, wordt hier niet uitgewerkt.

**Gescheiden van Crisp**

- Transactioneel: Medusa Notification, `notificationFeed`, auth, MFA, order, return, refund (ADR-0026).
- Orderberichten: `em_conversation` (ADR-0025).

---

## 13. Consent / AVG (niet-juridisch)

| Categorie | Richting | Te verifiëren |
|-----------|----------|---------------|
| Transactioneel | Bestaand Medusa/auth/order-pad | — |
| Operationeel seller (onboarding nudges) | Zakelijke noodzaak? | Jurist |
| Marketing newsletter/campagne | Opt-in + unsubscribe | Double opt-in? |
| B2B acquisition | Legitimate interest / opt-out | Jurist + proces |
| Affiliate `consent_record` | Trackingcookies (ADR-0029) | **Niet** hergebruiken als marketing-consent |

---

## 14. Admin UX (conceptueel)

```
Marketing & Communicatie
├── Dashboard                    P1
├── Prospects                    P0
├── Organizations                P0
├── Contacts                     P0
├── Acquisition
│   ├── Sequences                P0
│   └── Steps                    P0
├── Onboarding
│   ├── Programs                 P0
│   └── Rules                    P0 (vast) / P1 (editor)
├── Content / CMS
│   ├── Email Templates          P0
│   ├── Variants                 P0
│   ├── Subjects                 P0 (veld op TemplateVersion, niet op de template)
│   └── Localizations            P1 als beheerworkflow; het locale-veld op TemplateVariant is P0
├── AI Drafts                    P1
├── Automations                  P0
├── Communication History        P0
├── Crisp-status                 P0
├── Campaigns                    P1
├── Newsletters                  P1
├── Segments                     P1
└── Partner Content              P1
```

---

## 15. Seller UX (Partner Platform)

```
Partnerplatform (SellerGate)
├── Start hier           P1
├── Leren / Handleidingen P1
├── Mijn voortgang       P1
├── Webinars/evenementen P2
└── Nieuws/updates       P1/P2
```

---

## 16. MVP P0 / P1 / P2

### P0 — locked

Dit is de afgesproken grens. De bouwstatus staat in §16.1. Conversie en handmatig “mark as replied” zijn gebouwd in P0-06 (§10.5). Admin UI, daadwerkelijke verzending, Crisp-integratie en AI/LLM-integratie zijn niet gebouwd en horen niet bij de afgeronde P0-backendgrens.

Bevat:

- Module `engagement`
- Communication CMS: CommunicationTemplate, TemplateVariant, TemplateVersion
- Organization, Contact, OrganizationRole, ImportBatch
- LifecycleProgram, Sequence, SequenceStep
- Enrollment (uniekheid uit §2)
- Preference en Suppression
- CommunicationEvent / history
- Orchestrator die bepaalt en registreert, en in P0 niet verzendt (`queued` of `stopped`)
- Bestaande trigger `SellerOnboarded`
- Status-job voor milestones zonder bus-event
- Convert-regel: registratie stopt acquisition en start onboarding
- Handmatig “mark as replied”

Bevat niet:

- Daadwerkelijke verzending
- Crisp-adapter, Crisp-API of MCP
- AI-generatie en cloud-LLM
- PartnerArticle
- Nieuwsbrief- of campaign-automation
- Nieuwe product- of verificatie-events

Redis blijft een latere productie-afhankelijkheid voor jobs, geen onderdeel van de P0-functie. P0-05 voegt geen Redis en geen Bull toe.

### 16.1 Gebouwde P0-slices

| Slice | Inhoud | Status |
|-------|--------|--------|
| P0-01 | Communication CMS: CommunicationTemplate, TemplateVariant, TemplateVersion | COMPLETE |
| P0-02 | Organization, Contact, OrganizationRole, ImportBatch | COMPLETE |
| P0-03 | LifecycleProgram, Sequence, SequenceStep | COMPLETE |
| P0-04 | Enrollment, Preference, Suppression, CommunicationEvent | COMPLETE |
| P0-05 | Orchestrator, `SellerOnboarded`-subscriber, milestone-scan (§10.4) | COMPLETE |
| P0-06 | `convertOrganization`, `markContactForHumanFollowUp` (§10.5) | COMPLETE |

§14 blijft de conceptuele Admin-indeling. Admin UI, daadwerkelijke verzending, Crisp-integratie en AI/LLM-integratie zijn niet gebouwd. Die onderdelen behoren niet tot de afgeronde P0-backendgrens.

### P1

- Partner Platform basis + deep-links  
- Newsletters, segments, campaigns  
- Rule editor, localizations, rijkere AI  
- Basis open/click stats  
- Self-classification capture in outreach  
- Referral-relaties UI/API

### P2

- A/B-testing op varianten  
- Geavanceerde personalisatie & analytics  
- Webinars/events, growth automation  
- Paid promo ↔ e-mail orchestration (ads blijven CMS placements)

---

## 17. Bouwvolgorde

1. ADR-0047 + dit document, inclusief de locks op contentlocatie, enrollment en P0 (gedaan)  
2. P0-01 COMPLETE — Communication CMS: template, variant, immutable version  
3. P0-02 COMPLETE — Organization, Contact, OrganizationRole, ImportBatch  
4. P0-03 COMPLETE — LifecycleProgram, Sequence, SequenceStep (alleen id-verwijzingen)  
5. P0-04 COMPLETE — Enrollment, Preference, Suppression, CommunicationEvent  
6. P0-05 COMPLETE — Orchestrator: `SellerOnboarded`, status-job, history `queued`/`stopped`, geen verzending (§10.4)  
7. P0-06 COMPLETE — Conversie en human follow-up (§10.5)  
8. Crisp-adapter (pas nadat het contract extern vastligt; niet de afgeronde P0-backendgrens)  
9. AI-drafts, Partner Platform, newsletters/campaigns (niet de afgeronde P0-backendgrens)

---

## 18. Hergebruik bestaande onderdelen

| Bestaand | Gebruik |
|----------|---------|
| Event Bus / subscribers / workflows | Triggers voor orchestrator |
| ADR-0026 `notificationFeed` + `Modules.NOTIFICATION` | Alleen transactioneel. Niet het Engagement- of Crisp-kanaal. |
| Partner `seller`, onboarding_status, `SellerOnboarded` | Onboarding lifecycle |
| SellerGate / Customer auth / MFA | Partner Platform access |
| Product Cloud / verification **status** | Onboarding/activatie via de P0-status-job. Geen bus-events die de code niet emit. |
| CMS i18n/editor-patronen | Communication CMS UX |
| `src/jobs` | P0-05 milestone-scan en due enrollments. Geen Redis/Bull. |
| ADR-0041 seller-rollen | Post-registratie accountrollen (niet prospect-roles) |
| Order messaging | Los houden (H10.8 / ADR-0025) |

---

## 19. Nog te bouwen

P0-01 t/m P0-06 staan in de module `engagement` (§16.1). Dat is de afgeronde P0-backendgrens.

Niet gebouwd, en geen onderdeel van die grens:

- Admin UI (de indeling in §14 blijft conceptueel)
- Daadwerkelijke verzending
- Crisp-integratie
- AI/LLM-integratie
- AiDraft
- Referral als aparte entiteit
- Partner Platform UI + articles
- Segment/campaign engine  

---

## 20. Open externe afhankelijkheden

1. Crisp-API/webhooks/auth en een eventuele EuropMade MCP/API naar Crisp (**nog niet ontworpen**; later extern vast te leggen)  
2. Operationele EU/DPA-eisen voor Crisp (geen tweede communicatieplatform naast Crisp)  
3. Redis/productie Event Bus voor jobs  
4. Juridisch: acquisition grounds, operational vs marketing mails, retention  
5. Cloud-LLM voor AI drafts: EU-hosting/DPA + eventueel nieuw ADR (in lijn met ADR-0036)  
6. Of Partner Platform-routes onder `apps/web` (verwacht) of aparte host  

---

## 21. Besluiten die later door Marketing worden ingevuld

- Tone of voice en merkpropositie per segment  
- Exacte sequence-lengte, delays, CTA’s  
- Welke variant default per step  
- Self-classification copy en routing-logica (inhoudelijk)  
- Nieuwsbriefkalender en campagnethema’s  
- Partner Platform curriculum-volgorde  
- Success metrics (open rate-doelen, etc.)

---

## 22. Conceptueel datamodel (samenvatting)

**P0:** Organization, Contact, OrganizationRole, ImportBatch, LifecycleProgram, Sequence, SequenceStep, Enrollment, CommunicationTemplate, TemplateVariant, TemplateVersion, Preference, Suppression, CommunicationEvent.

**Later, niet P0:** SalesModel en OutreachPurpose als aparte entiteiten (in P0 volstaan velden op Organization), Referral, LifecycleRule-editor, AiDraft, Campaign, Segment, PartnerArticle, PartnerContentProgress. Unsubscribe is een signaal dat Preference en Suppression schrijft, geen vierde P0-tabel. MarketingConsent is geen aparte tabel naast Preference.

**Bestaand hergebruik:** Customer, Seller, in_app_notification, Medusa notification (provider), cms_page (alleen als optioneel later subtype — default: dedicated partner/communication content).

---

## 23. Stopregels (samenvatting)

| Signaal | Acquisition | Onboarding | Marketing |
|---------|-------------|------------|-----------|
| Reply in Crisp / marked replied | STOP | blijft (tenzij gepauzeerd) | n.v.t. |
| Registratie | STOP + start onboarding | — | — |
| Marketing unsubscribe | STOP indien van toepassing | *juridisch* | STOP |
| Manual / hard bounce | STOP | STOP channel | STOP |

---

*Einde architectuurdocument. P0-01 t/m P0-06 zijn gebouwd. Admin UI, verzending, Crisp en AI/LLM horen niet bij die backendgrens.*
