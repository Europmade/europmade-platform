import {
  createStep,
  StepResponse,
} from "@medusajs/framework/workflows-sdk"
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
} from "@medusajs/framework/utils"
import PartnerModuleService from "../../modules/partner/service"
import { PARTNER_MODULE } from "../../modules/partner"
import {
  assertTransitionAllowed,
  EDITABLE_STATUSES,
  OnboardingStatus,
} from "./status-flow"
import {
  assertAtLeastOneRoleSelected,
  OnboardingRoleSelection,
  validateCompanyForSubmission,
} from "./validation"

/**
 * Verplichte e-mailverificatie vóór onboarding kan starten — spec §1.8:
 * "Partner Onboarding kan uitsluitend gestart worden wanneer het account al
 * e-mailgeverifieerd is", "server-side afgedwongen, niet uitsluitend een
 * client-side redirect".
 *
 * Gebruikt uitsluitend het bestaande, standaard Medusa Auth-verificatie-
 * mechanisme (`auth_verification`, Modules.AUTH) — geen nieuw
 * verificatieveld/-tabel toegevoegd. Voor actor_type "customer" +
 * auth_provider "emailpass" is `entity_type` conventioneel "email" en
 * `entity_id` het e-mailadres van de bijbehorende provider-identity.
 */
export const requireVerifiedEmailStep = createStep(
  "require-verified-email",
  async (
    input: { authIdentityId: string },
    { container }
  ) => {
    // Development-only bypass: uitsluitend actief wanneer NODE_ENV=development,
    // zodat lokaal direct na registratie doorgetest kan worden zonder de
    // e-mailverificatielink te hoeven volgen. In elke andere omgeving
    // (production, of geen NODE_ENV gezet) blijft de verplichte
    // e-mailverificatie hieronder volledig en ongewijzigd afgedwongen
    // (spec §1.8).
    if (process.env.NODE_ENV === "development") {
      return new StepResponse({ verified: true })
    }

    const authModuleService = container.resolve(Modules.AUTH)

    const providerIdentities = await authModuleService.listProviderIdentities({
      auth_identity_id: input.authIdentityId,
      provider: "emailpass",
    })
    const providerIdentity = providerIdentities[0]

    if (!providerIdentity) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "E-mailverificatie kon niet worden vastgesteld voor dit account."
      )
    }

    const verifications = await authModuleService.listAuthVerifications({
      auth_identity_id: input.authIdentityId,
      entity_id: providerIdentity.entity_id,
      entity_type: "email",
    })

    const isVerified = verifications.some((v) => !!v.verified_at)

    if (!isVerified) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "Bevestig eerst je e-mailadres voordat je de Partner Onboarding kunt starten (partner-onboarding/spec.md §1.8)."
      )
    }

    return new StepResponse({ verified: true })
  }
)

/** Er mag maximaal één onboardingaanvraag per account bestaan (`seller.customer_id` uniek). */
export const requireNoExistingOnboardingStep = createStep(
  "require-no-existing-onboarding",
  async (input: { customerId: string }, { container }) => {
    const partnerService: PartnerModuleService = container.resolve(PARTNER_MODULE)

    const existing = await partnerService.listSellers({
      customer_id: input.customerId,
    })

    if (existing.length > 0) {
      throw new MedusaError(
        MedusaError.Types.DUPLICATE_ERROR,
        `Er bestaat al een Partner Onboarding-aanvraag voor dit account (status: "${existing[0].onboarding_status}"). Gebruik GET /store/partner-onboarding om de huidige status op te vragen.`
      )
    }

    return new StepResponse({ ok: true })
  }
)

export interface CompanyDraftFields {
  legal_name: string
  chamber_of_commerce_number: string
  vat_number?: string | null
  country_code: string
  iban: string
}

/**
 * Maakt de Concept-aanvraag aan: uitsluitend één `seller`-rij, met de
 * gekozen rol(len) (spec §2.2 stap 1/2, "Welkom" + "Partner kiezen").
 *
 * Er wordt hier bewust GEEN `company` aangemaakt: op dit moment in de flow
 * heeft de partner de Bedrijfsgegevens (stap 3) nog niet ingevuld, dus is er
 * nog geen bedrijfsdata om op te slaan of op duplicaten (KvK-nummer +
 * landcode, `company`-uniekheidsindex) te controleren. `seller.company`
 * is nullable; de company-rij wordt pas aangemaakt zodra de partner
 * daadwerkelijk Bedrijfsgegevens opslaat (zie `updateOnboardingDraftStep`).
 */
export const createOnboardingDraftStep = createStep(
  "create-onboarding-draft",
  async (
    input: {
      customerId: string
      roles: OnboardingRoleSelection
    },
    { container }
  ) => {
    assertAtLeastOneRoleSelected(input.roles)

    const partnerService: PartnerModuleService = container.resolve(PARTNER_MODULE)

    const seller = await partnerService.createSellers({
      customer_id: input.customerId,
      is_retailer: input.roles.is_retailer,
      is_producer_or_brand_owner: input.roles.is_producer_or_brand_owner,
      is_distributor: input.roles.is_distributor,
      onboarding_status: "Concept",
      approved_at: null,
    })

    // Zelfde platte vorm als GET /store/partner-onboarding (seller-velden +
    // `company`) — niet de eerdere `{ seller, company }`-wrapper, die niet
    // overeenkwam met wat de frontend als `OnboardingRecord` verwacht.
    return new StepResponse({ ...seller, company: null }, { sellerId: seller.id })
  },
  async (compensateInput, { container }) => {
    if (!compensateInput) return
    const partnerService: PartnerModuleService = container.resolve(PARTNER_MODULE)
    await partnerService.deleteSellers([compensateInput.sellerId])
  }
)

/**
 * Werkt de Concept- (of "Aanvullende informatie vereist"-)aanvraag bij —
 * uitsluitend toegestaan in de statussen waarin de partner nog zelf mag
 * wijzigen (spec §1.2, §2.8A, `EDITABLE_STATUSES`).
 *
 * `company` wordt hier pas voor het eerst aangemaakt (bij `input.company`
 * en `seller.company` nog `null`) — dit is het daadwerkelijke moment waarop
 * de partner Bedrijfsgegevens (spec §2.2 stap 3) opslaat. Pas vanaf dat
 * moment ontstaat de `company`-rij en daarmee ook de duplicaatcontrole op
 * KvK-nummer + landcode (zie root cause-analyse: dit gebeurde voorheen al
 * bij "Partner kiezen", vóórdat er bedrijfsgegevens bestonden).
 */
export const updateOnboardingDraftStep = createStep(
  "update-onboarding-draft",
  async (
    input: {
      sellerId: string
      roles?: Partial<OnboardingRoleSelection>
      company?: Partial<CompanyDraftFields>
    },
    { container }
  ) => {
    const partnerService: PartnerModuleService = container.resolve(PARTNER_MODULE)

    const seller = await partnerService.retrieveSeller(input.sellerId, {
      relations: ["company"],
    })

    if (!EDITABLE_STATUSES.includes(seller.onboarding_status as OnboardingStatus)) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        `Deze aanvraag kan niet meer bewerkt worden in status "${seller.onboarding_status}" (spec §1.2).`
      )
    }

    const previousSeller = {
      is_retailer: seller.is_retailer,
      is_producer_or_brand_owner: seller.is_producer_or_brand_owner,
      is_distributor: seller.is_distributor,
    }
    const previousCompany = seller.company ? { ...seller.company } : null

    const nextRoles: OnboardingRoleSelection = {
      is_retailer: input.roles?.is_retailer ?? seller.is_retailer,
      is_producer_or_brand_owner:
        input.roles?.is_producer_or_brand_owner ??
        seller.is_producer_or_brand_owner,
      is_distributor: input.roles?.is_distributor ?? seller.is_distributor,
    }
    assertAtLeastOneRoleSelected(nextRoles)

    // Company vóór de seller-update aanmaken/bijwerken, zodat de
    // seller-update de nieuwe `company_id` in dezelfde aanroep kan
    // meenemen (voorkomt dat de teruggegeven seller een verouderde/lege
    // `company_id` bevat).
    let updatedCompany = seller.company
    let createdCompanyId: string | null = null
    if (input.company) {
      if (seller.company) {
        updatedCompany = await partnerService.updateCompanies({
          id: seller.company.id,
          ...input.company,
        })
      } else {
        updatedCompany = await partnerService.createCompanies({
          legal_name: input.company.legal_name ?? "",
          chamber_of_commerce_number:
            input.company.chamber_of_commerce_number ?? "",
          vat_number: input.company.vat_number ?? null,
          country_code: input.company.country_code ?? "",
          iban: input.company.iban ?? "",
        })
        createdCompanyId = updatedCompany.id
      }
    }

    const updatedSeller = await partnerService.updateSellers({
      id: seller.id,
      ...nextRoles,
      ...(createdCompanyId ? { company_id: createdCompanyId } : {}),
    })

    // Zelfde platte vorm als GET /store/partner-onboarding.
    return new StepResponse(
      { ...updatedSeller, company: updatedCompany ?? null },
      {
        sellerId: seller.id,
        companyId: seller.company?.id ?? null,
        createdCompanyId,
        previousSeller,
        previousCompany,
      }
    )
  },
  async (compensateInput, { container }) => {
    if (!compensateInput) return
    const partnerService: PartnerModuleService = container.resolve(PARTNER_MODULE)
    await partnerService.updateSellers({
      id: compensateInput.sellerId,
      ...compensateInput.previousSeller,
    })
    if (compensateInput.createdCompanyId) {
      await partnerService.updateSellers({
        id: compensateInput.sellerId,
        company_id: null,
      })
      await partnerService.deleteCompanies([compensateInput.createdCompanyId])
    } else if (compensateInput.companyId && compensateInput.previousCompany) {
      await partnerService.updateCompanies({
        id: compensateInput.companyId,
        legal_name: compensateInput.previousCompany.legal_name,
        chamber_of_commerce_number:
          compensateInput.previousCompany.chamber_of_commerce_number,
        vat_number: compensateInput.previousCompany.vat_number,
        country_code: compensateInput.previousCompany.country_code,
        iban: compensateInput.previousCompany.iban,
      })
    }
  }
)

/**
 * Indieningsvalidatie (spec §2.10, §2.12): "indienen is geblokkeerd totdat
 * alle verplichte velden ... en de voorwaarden-acceptatie compleet zijn."
 * `acceptedTerms` is een verplicht, expliciet request-veld (spec §2.6) — er
 * is bewust geen kolom toegevoegd aan `seller`/`company` om dit te bewaren
 * (geen kolom hiervoor in het bevroren Deel A.2/A.3-schema); de acceptatie
 * wordt wel gelogd (zie `transitionOnboardingStatusStep`). Zie
 * implementatierapport S3-02-02, "Open punten".
 */
export const assertReadyForSubmissionStep = createStep(
  "assert-ready-for-submission",
  async (
    input: { sellerId: string; acceptedTerms: boolean },
    { container }
  ) => {
    const partnerService: PartnerModuleService = container.resolve(PARTNER_MODULE)
    const seller = await partnerService.retrieveSeller(input.sellerId, {
      relations: ["company"],
    })

    const errors = validateCompanyForSubmission(seller.company ?? {})

    if (!input.acceptedTerms) {
      errors.push(
        "Je moet akkoord gaan met de Partnervoorwaarden en het verwerkersaddendum voordat je kunt indienen."
      )
    }

    if (errors.length > 0) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, errors.join(" "))
    }

    return new StepResponse({ ok: true })
  }
)

/**
 * Generieke statusovergang-stap — valideert de overgang tegen
 * `ONBOARDING_TRANSITIONS` (status-flow.ts, exact conform spec §1.2/§2.8A),
 * past ze toe, en logt de overgang conform de bestaande architectuur
 * (structured logger; voor "Goedgekeurd" bovendien het bevroren
 * `SellerOnboarded`-domeinevent, `04-event-model.md` §2.5).
 *
 * `reviewNote` (afkeurreden / aanvullende-informatie-vraag) wordt uitsluitend
 * gelogd, niet opgeslagen — `seller` (Deel A.3) kent geen kolom hiervoor.
 * Zie implementatierapport S3-02-02, "Open punten", voor de aanbeveling om
 * dit in een vervolgticket/ADR alsnog een kolom te geven zodat een toekomstig
 * Statuspagina-scherm de exacte reden kan tonen (spec §2.8/§2.8A).
 */
export const transitionOnboardingStatusStep = createStep(
  "transition-onboarding-status",
  async (
    input: {
      sellerId: string
      expectedCurrentStatuses: OnboardingStatus[]
      to: OnboardingStatus
      transitionLabel: string
      reviewNote?: string
      actor?: string
    },
    { container }
  ) => {
    const partnerService: PartnerModuleService = container.resolve(PARTNER_MODULE)
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

    const seller = await partnerService.retrieveSeller(input.sellerId)

    if (
      !input.expectedCurrentStatuses.includes(
        seller.onboarding_status as OnboardingStatus
      )
    ) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        `Aanvraag ${input.sellerId} heeft status "${seller.onboarding_status}", verwacht één van: ${input.expectedCurrentStatuses.join(", ")}.`
      )
    }

    assertTransitionAllowed(seller.onboarding_status, input.to)

    const previousStatus = seller.onboarding_status
    const updated = await partnerService.updateSellers({
      id: seller.id,
      onboarding_status: input.to,
      approved_at: input.to === "Goedgekeurd" ? new Date() : seller.approved_at,
    })

    logger.info(
      `[partner-onboarding] ${input.transitionLabel}: seller=${seller.id} "${previousStatus}" -> "${input.to}"` +
        (input.actor ? ` (actor=${input.actor})` : "") +
        (input.reviewNote ? ` — reviewNote="${input.reviewNote}"` : "")
    )

    return new StepResponse(updated, {
      sellerId: seller.id,
      previousStatus,
      previousApprovedAt: seller.approved_at,
    })
  },
  async (compensateInput, { container }) => {
    if (!compensateInput) return
    const partnerService: PartnerModuleService = container.resolve(PARTNER_MODULE)
    await partnerService.updateSellers({
      id: compensateInput.sellerId,
      onboarding_status: compensateInput.previousStatus,
      approved_at: compensateInput.previousApprovedAt,
    })
  }
)

/** Emit van het enige in `04-event-model.md` §2.5 gedefinieerde Partner-service-event. */
export const emitSellerOnboardedEventStep = createStep(
  "emit-seller-onboarded-event",
  async (input: { sellerId: string }, { container }) => {
    const eventBus = container.resolve(Modules.EVENT_BUS)
    await eventBus.emit({
      name: "SellerOnboarded",
      data: { seller_id: input.sellerId },
    })
    return new StepResponse({ emitted: true })
  }
)
