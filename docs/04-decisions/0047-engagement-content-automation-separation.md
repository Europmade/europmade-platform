# ADR-0047 — Engagement: content/automation-scheiding & communicatie-architectuur

**Status:** Geaccepteerd  
**Datum:** 2026-10-05  
**Bijgewerkt:** 2026-10-09 — [ADR-0049](./0049-marketing-delivery-provider.md) vervangt voor marketingmail de zin dat het latere verzenddoel Crisp is. Crisp blijft conversatie en menselijke overdracht.  
**Domein:** Marketing, Communicatie, Partner Engagement, CMS, AI Content  
**Raakt:** [Architectuurdocument](../01-architecture/marketing-communication-partner-engagement.md); ADR-0026 (notification feed); ADR-0036 (AI content offline-first); ADR-0041 (partnerrollen); ADR-0025 (order-messaging); Blueprint Deel 14

## Context

EuropMade heeft event-gedreven in-app notificaties (ADR-0026) en Partner/Seller-lifecycle, maar geen prospect-CRM, e-mailsequences of communication CMS. Een geïntegreerde Seller Lifecycle-communicatie (acquisition → onboarding → groei) plus latere newsletters vereist bindende architectuurregels vóór implementatie — vooral de scheiding tussen **wanneer** (automation) en **wat** (content), en de rol van AI. De externe communicatie-/inbox-/human-handoverlaag is **Crisp**. EuropMade bouwt geen eigen mailbox.

## Beslissing

1. **Content ≠ automation.** Engagement bepaalt wie, wanneer, waarom en welke goedgekeurde version. De Engagement Orchestrator voert die automation uit (lifecycle-fase, regels, stopcondities). Communication CMS bepaalt wat er wordt gezegd. Marketingtekst hoort **niet** in workflow-/business-logic.
2. **Communication CMS — contentlocatie (locked).** Drie niveaus, niet door elkaar:
   - **CommunicationTemplate** bevat alleen de stabiele identiteit: `id`, `name`, `communication_type` / programmatype, en metadata die bij die identiteit hoort. Geen subject, preheader, body, CTA, locale, token-whitelist of approval.
   - **TemplateVariant** is de redactionele variant per locale: `locale` en variant-identiteit / naam.
   - **TemplateVersion** bevat de immutable inhoud van die variant: subject, preheader, body, CTA, personalization-token-whitelist, version number, approval status, activation status, en overige contentmetadata van die versie.
   Een inhoudswijziging maakt een nieuwe TemplateVersion. Een gebruikte versie wordt nooit gewijzigd. Een AI-draft is geen verzendbare version tot zij is goedgekeurd en als version is vastgelegd. Alleen een version met approval `approved` én activation `active` mag later worden verzonden. Automation verwijst naar `template_id` + `variant_id` + `version`.
3. **Meerdere varianten per template** zijn verplicht. Elke variant heeft eigen versions. Approval en activation zitten op de version, niet op de template. Een step gebruikt één gekozen version die `approved` én `active` is. A/B-testing is **buiten P0**; het model mag dat later toevoegen zonder de drie niveaus te herbouwen.
4. **AI** genereert alleen voorstellen (`AiDraft`: proposed → edited → approved | rejected → used). Geen autonome onbeperkte verzending. Geen verzonnen feiten of compliance-claims. Alleen goedgekeurde content mag de orchestrator gebruiken. Cloud-LLM blijft onderhevig aan EU/DPA-eisen (in lijn met ADR-0036).
5. **Prospectmodel** = Organization + Contact + multi-roles + sales_model + outreach_purpose. Rollen en sales_model mogen **`unknown`** zijn. Classificatie is **niet** verplicht vóór outreach/import. Geen single field `type=brand|seller`.
6. **Self-classification** via outreach (verkoopmodel-vragen + “zelf verkopen?”) schrijft terug naar Organization; geen verplichte brand/seller-gate vóór eerste contact.
7. **Referral:** Organization→Organization relaties (`brand_referral`, referrer/referred) zijn toegestaan; multi-rol blijft mogelijk.
8. **Acquisition en onboarding zijn gescheiden. Enrollment-uniekheid (locked).** Een Contact heeft maximaal één `active` Enrollment per `program_type`. Een Contact heeft nooit tegelijk een `active` acquisition-enrollment én een `active` onboarding-enrollment. `human_follow_up` is geen `active` enrollment en mag naast een andere actieve lifecycle bestaan waar deze ADR dat toestaat (reply stopt alleen acquisition; onboarding mag actief blijven). Een nieuwe enrollment is idempotent: hetzelfde trigger-event maakt geen tweede actieve enrollment. Registratie: acquisition STOP + onboarding START. Reply of handmatig “replied” stopt alleen acquisition; menselijke follow-up blijft in **Crisp** (geen EuropMade-mailbox). Stopregels blijven leidend bij conversion, reply, unsubscribe, suppression en bounce. De databaseconstraint moet deze uniekheid afdwingen waar dat kan; de SQL wordt niet in dit ADR uitgewerkt.
9. **Engagement Orchestrator** is de centrale automationlaag (triggers → enrollment → stopregels → content-refs → render → history → next step). Bevat geen marketingtekst. Het latere verzenddoel is Crisp. **P0 roept geen externe mailprovider en geen `dispatchNotificationWorkflow` aan**; een CommunicationEvent mag `queued` of `stopped` vastleggen. Het Crisp-API/MCP-contract wordt in dit ADR niet ontworpen en niet geïmplementeerd.
10. **Communication history** is verplicht voor sends/stops (template/variant/version, AI-draft/approval, status, bounce/unsubscribe/reply).
11. **Partner Platform** = knowledge layer onder SellerGate; geen mailbox, geen Crisp-inbox, geen Seller BO-vervanging; mails mogen deep-linken naar partner content.
12. **Transactionele** mails (auth, MFA, order, return, refund) blijven volledig op bestaande Medusa Notification/Auth-paden en `notificationFeed` (ADR-0026). Order-messaging (`em_conversation`) blijft volledig ADR-0025. Geen van beide loopt via Crisp of via de Engagement-orchestrator.
13. **Marketingstrategie** (tone, copy, timing, segmentkeuzes) wordt later ingevuld; deze ADR/architectuur wijzigt daarvoor niet.
14. Volledige uitwerking: `docs/01-architecture/marketing-communication-partner-engagement.md`.
15. **P0-grens (locked).** P0 bevat: module `engagement`, Communication CMS (template / variant / version), Organization, Contact, OrganizationRole, ImportBatch, LifecycleProgram, Sequence, SequenceStep, Enrollment, Preference, Suppression, CommunicationEvent/history, orchestrator, de bestaande trigger `SellerOnboarded`, een status-job voor milestones zonder event, de convert-regel, en handmatig “mark as replied”. P0 bevat niet: daadwerkelijke verzending, Crisp-adapter, Crisp-API/MCP, AI-generatie, cloud-LLM, PartnerArticle, nieuwsbrief- of campaign-automation, en nieuwe product- of verificatie-events.

## Consequenties

- Implementatie start pas na expliciete bouwopdracht; dit ADR blokkeert hardcoded mailcopy in automation.
- Een latere bouwopdracht mag startmomenten, doelgroepen en geplande campagnes uitvoeren tot een enrollment en history `queued` of `stopped`, zonder verzending of Crisp.
- [ADR-0049](./0049-marketing-delivery-provider.md) legt de marketing-verzendlaag vast als providerinterface op de bestaande history. Die laag is geen Crisp en geen Medusa-notificatie. P0 zelf verzendt nog steeds niet.
- Nieuwe custom module(s) (bijv. `engagement` + communication content) naast bestaande CMS-storefront/`ad_campaign`.
- Prospect-Organization-rollen ≠ ADR-0041 seller-vlaggen (verschillende lifecycle-stadia); mapping bij convert later configureerbaar.
- Crisp is de gekozen externe laag. Het API/MCP-contract blijft **buiten dit ADR** tot het extern vastligt; P0 mag “mark as replied” bevatten. Een latere EuropMade MCP/API-laag mag gecontroleerde EuropMade-data aan Crisp beschikbaar stellen; die laag wordt hier niet ontworpen.
- Productievereisten (Crisp-DPA/EU-hosting, Redis/jobs) zijn operationele afhankelijkheden, geen wijziging van deze beslissing.

## Niet-besloten (bewust open)

- Crisp-API, webhooks, auth en MCP-tools (bewust niet ontworpen in dit ADR).
- Juridische grondslag per communicatiecategorie (jurist).
- Exacte P0 rule-inhoud/copy (Marketing-fase).
- Of `PartnerArticle` een dedicated tabel of CMS-page-subtype wordt (beide toegestaan zolang seller-only + lifecycle-tags mogelijk zijn).
