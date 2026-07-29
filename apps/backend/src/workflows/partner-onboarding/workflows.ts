import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import {
  requireVerifiedEmailStep,
  requireNoExistingOnboardingStep,
  createOnboardingDraftStep,
  updateOnboardingDraftStep,
  assertReadyForSubmissionStep,
  transitionOnboardingStatusStep,
  emitSellerOnboardedEventStep,
  CompanyDraftFields,
} from "./steps"
import { ONBOARDING_STATUS } from "./status-flow"
import { OnboardingRoleSelection } from "./validation"

/**
 * Start Partner Onboarding — spec §2.2 stap 1/2 ("Welkom" + "Partner
 * kiezen"). Server-side e-mailverificatie-gate (spec §1.8), meervoudige
 * rolselectie (spec §1.1), maximaal één aanvraag per account (Deel A.3,
 * `customer_id` uniek).
 *
 * Slaat uitsluitend de rolkeuze op — geen `company` (die bestaat pas na
 * stap 3 "Bedrijfsgegevens", zie root cause-analyse van de "already exists"-
 * bug en `createOnboardingDraftStep`).
 */
export const startPartnerOnboardingWorkflow = createWorkflow(
  "start-partner-onboarding",
  (input: {
    customerId: string
    authIdentityId: string
    roles: OnboardingRoleSelection
  }) => {
    requireVerifiedEmailStep({ authIdentityId: input.authIdentityId })
    requireNoExistingOnboardingStep({ customerId: input.customerId })

    const draft = createOnboardingDraftStep({
      customerId: input.customerId,
      roles: input.roles,
    })

    return new WorkflowResponse(draft)
  }
)

/**
 * Bijwerken van de Concept- (of "Aanvullende informatie vereist"-)aanvraag —
 * spec §2.2 stap 3 ("Bedrijfsgegevens") + §2.11 ("voortgang blijft bewaard,
 * server-side").
 */
export const updatePartnerOnboardingDraftWorkflow = createWorkflow(
  "update-partner-onboarding-draft",
  (input: {
    sellerId: string
    roles?: Partial<OnboardingRoleSelection>
    company?: Partial<CompanyDraftFields>
  }) => {
    const updated = updateOnboardingDraftStep(input)
    return new WorkflowResponse(updated)
  }
)

/**
 * Indienen — vanuit Concept (eerste indiening) of Afgekeurd (§1.2: "terug
 * naar Ingediend, niet terug naar Concept"). Voert de volledige
 * indieningsvalidatie uit (spec §2.10/§2.12), zet daarna "Ingediend" en
 * onmiddellijk aansluitend "In beoordeling" (zie toelichting in
 * `status-flow.ts` waarom dit één samenhangende, automatische overgang is).
 */
export const submitPartnerOnboardingWorkflow = createWorkflow(
  "submit-partner-onboarding",
  (input: { sellerId: string; acceptedTerms: boolean }) => {
    assertReadyForSubmissionStep(input)

    const ingediend = transitionOnboardingStatusStep({
      sellerId: input.sellerId,
      expectedCurrentStatuses: [
        ONBOARDING_STATUS.CONCEPT,
        ONBOARDING_STATUS.AFGEKEURD,
      ],
      to: ONBOARDING_STATUS.INGEDIEND,
      transitionLabel: "indienen",
    }).config({ name: "transition-to-ingediend" })

    const inBeoordeling = transitionOnboardingStatusStep({
      sellerId: ingediend.id,
      expectedCurrentStatuses: [ONBOARDING_STATUS.INGEDIEND],
      to: ONBOARDING_STATUS.IN_BEOORDELING,
      transitionLabel: "automatische start beoordeling",
    }).config({ name: "transition-to-in-beoordeling" })

    return new WorkflowResponse(inBeoordeling)
  }
)

/**
 * Aanvulling versturen na "Aanvullende informatie vereist" — spec §2.8A:
 * "Opnieuw ingediend → In beoordeling (zelfde reviewronde)". Zie
 * `status-flow.ts` voor de toelichting waarom "Opnieuw ingediend" hier
 * uitsluitend een logische/log-omschrijving is, geen aparte database-status.
 */
export const submitPartnerOnboardingAdditionWorkflow = createWorkflow(
  "submit-partner-onboarding-addition",
  (input: { sellerId: string }) => {
    const updated = transitionOnboardingStatusStep({
      sellerId: input.sellerId,
      expectedCurrentStatuses: [
        ONBOARDING_STATUS.AANVULLENDE_INFORMATIE_VEREIST,
      ],
      to: ONBOARDING_STATUS.IN_BEOORDELING,
      transitionLabel: "opnieuw ingediend (na aanvullende informatie)",
    })
    return new WorkflowResponse(updated)
  }
)

/**
 * Goedkeuren (reviewer/Beheerder) — spec §1.2/§1.5: rol(len) staan al op
 * `seller` (vastgelegd bij intake), deze overgang bevestigt/activeert de
 * aanvraag en emit het bevroren `SellerOnboarded`-event
 * (`04-event-model.md` §2.5).
 */
export const approvePartnerOnboardingWorkflow = createWorkflow(
  "approve-partner-onboarding",
  (input: { sellerId: string; actor?: string }) => {
    const approved = transitionOnboardingStatusStep({
      sellerId: input.sellerId,
      expectedCurrentStatuses: [ONBOARDING_STATUS.IN_BEOORDELING],
      to: ONBOARDING_STATUS.GOEDGEKEURD,
      transitionLabel: "goedgekeurd",
      actor: input.actor,
    })

    emitSellerOnboardedEventStep({ sellerId: approved.id })

    return new WorkflowResponse(approved)
  }
)

/** Afkeuren (reviewer/Beheerder) — spec §1.2: "met reden" (verplicht). */
export const rejectPartnerOnboardingWorkflow = createWorkflow(
  "reject-partner-onboarding",
  (input: { sellerId: string; reason: string; actor?: string }) => {
    const rejected = transitionOnboardingStatusStep({
      sellerId: input.sellerId,
      expectedCurrentStatuses: [ONBOARDING_STATUS.IN_BEOORDELING],
      to: ONBOARDING_STATUS.AFGEKEURD,
      transitionLabel: "afgekeurd",
      reviewNote: input.reason,
      actor: input.actor,
    })
    return new WorkflowResponse(rejected)
  }
)

/**
 * Aanvullende informatie vragen (reviewer/Beheerder) — spec §2.8A: verplicht,
 * specifiek vrij-tekstveld gekoppeld aan de aanvraag.
 */
export const requestPartnerOnboardingInfoWorkflow = createWorkflow(
  "request-partner-onboarding-info",
  (input: { sellerId: string; message: string; actor?: string }) => {
    const updated = transitionOnboardingStatusStep({
      sellerId: input.sellerId,
      expectedCurrentStatuses: [ONBOARDING_STATUS.IN_BEOORDELING],
      to: ONBOARDING_STATUS.AANVULLENDE_INFORMATIE_VEREIST,
      transitionLabel: "aanvullende informatie vereist",
      reviewNote: input.message,
      actor: input.actor,
    })
    return new WorkflowResponse(updated)
  }
)
