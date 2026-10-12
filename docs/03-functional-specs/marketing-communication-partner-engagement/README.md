# Marketing, Communicatie & Partner Engagement

**Status:** Architectuur vastgelegd. P0-01 t/m P0-06 gebouwd. Functionele schermspecs en marketingcopy nog niet gestart.  
**Architectuurbron:** [`docs/01-architecture/marketing-communication-partner-engagement.md`](../../01-architecture/marketing-communication-partner-engagement.md)  
**ADR:** [ADR-0047](../../04-decisions/0047-engagement-content-automation-separation.md)

## P0-status

| Slice | Status |
|-------|--------|
| P0-01 Communication CMS | COMPLETE |
| P0-02 Organization, Contact, OrganizationRole, ImportBatch | COMPLETE |
| P0-03 LifecycleProgram, Sequence, SequenceStep | COMPLETE |
| P0-04 Enrollment, Preference, Suppression, CommunicationEvent | COMPLETE |
| P0-05 Orchestrator, `SellerOnboarded`, milestone-scan | COMPLETE |
| P0-06 Conversie en human follow-up | COMPLETE |

P0-05 staat in architectuur §10.4. Alle seller-milestones gebruiken `program_type = onboarding`. `SellerOnboarded` is de primaire trigger; `onboarding_approved` is alleen het status-vangnet. Overige milestones komen uit de scheduled job. Er zijn geen nieuwe lifecycle-events. History is `queued` of `stopped`; er wordt niets verzonden. First sale leest `em_order.seller_id` (OrderSplit), niet `OrderPlaced`.

P0-06 staat in architectuur §10.5. `convertOrganization` schrijft alleen `converted_customer_id` en `converted_seller_id`, overschrijft een bestaande ref niet en is idempotent. Active acquisition stopt; onboarding start alleen via `enrollContact` en de P0-config. Er komt geen Customer- of Seller-record bij. `markContactForHumanFollowUp` zet alleen active acquisition op `human_follow_up`, maakt `next_step_at` leeg en laat onboarding active. `stopped`, `completed` en `suppressed` blijven staan. De orchestrator verwerkt `human_follow_up` niet. Er wordt geen CommunicationEvent voor aangemaakt.

Admin UI voor automatiseringen is later toegevoegd. Startmomenten, doelgroepen en geplande campagnes schrijven een enrollment en history `queued` of `stopped`. Er wordt niets verzonden en er is geen Crisp-adapter.

De marketing-verzendlaag is een providerinterface met dry-run (ADR-0049). Er is geen e-mailprovider aangesloten en er wordt niets verzonden.

## Scope (samenvatting)

Prospect database, Seller Acquisition, Seller Onboarding lifecycle-communicatie, Communication CMS, campagnes/nieuwsbrieven (later), Partner Platform (kennislaag, later), communication history, Engagement Orchestrator. Inhoud staat op TemplateVersion, niet op de template. Enrollment: maximaal één `active` per contact per programmatype; acquisition en onboarding niet beide `active`. Crisp is de externe communicatie-/inbox-/human-handoverlaag. EuropMade bouwt geen mailbox. P0 verzendt niet en bevat geen Crisp-adapter, AI-generatie of nieuwsbrief-automation. Transactionele Medusa-notificaties en `em_conversation` blijven gescheiden. Het Crisp-API/MCP-contract is nog niet ontworpen.

## Nog te ontwikkelen

- Functionele specs per scherm (Admin Marketing & Communicatie, Partner Platform).
- Marketing-fase: tone of voice, copy, sequence-inhoud, timing.
- Verdere implementatieslices alleen na expliciete bouwopdracht. De P0-backendgrens P0-01 t/m P0-06 is af. Admin UI, verzending, Crisp en AI/LLM blijven buiten die grens.
