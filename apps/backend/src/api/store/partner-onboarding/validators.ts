import { z } from "@medusajs/framework/zod"

/**
 * "Partner kiezen" (spec §2.2 stap 2) — slaat uitsluitend de rolkeuze op.
 * Bewust geen `company`-veld: de Bedrijfsgegevens bestaan pas vanaf stap 3
 * en worden daar voor het eerst aangemaakt (zie root cause-analyse van de
 * "Company ... already exists"-bug — een `company`-rij aanmaken vóórdat er
 * bedrijfsgegevens zijn ingevuld veroorzaakte een onterechte duplicaat-hit
 * op de lege placeholder-waarden).
 */
export const StoreStartPartnerOnboarding = z.object({
  is_retailer: z.boolean().optional().default(false),
  is_producer_or_brand_owner: z.boolean().optional().default(false),
  is_distributor: z.boolean().optional().default(false),
})
export type StoreStartPartnerOnboardingInput = z.infer<
  typeof StoreStartPartnerOnboarding
>

export const StoreCompanyDraftForUpdate = z.object({
  legal_name: z.string().optional(),
  chamber_of_commerce_number: z.string().optional(),
  vat_number: z.string().nullable().optional(),
  country_code: z.string().optional(),
  iban: z.string().optional(),
})

export const StoreUpdatePartnerOnboardingDraft = z.object({
  is_retailer: z.boolean().optional(),
  is_producer_or_brand_owner: z.boolean().optional(),
  is_distributor: z.boolean().optional(),
  company: StoreCompanyDraftForUpdate.optional(),
})
export type StoreUpdatePartnerOnboardingDraftInput = z.infer<
  typeof StoreUpdatePartnerOnboardingDraft
>

/**
 * `accepted_terms` — spec §2.6, verplichte voorwaarden-acceptatie bij
 * indienen. Geen kolom op `seller`/`company` (Deel A.2/A.3 kennen dit veld
 * niet) — uitsluitend een indieningsvoorwaarde, zie
 * `assertReadyForSubmissionStep`.
 */
export const StoreSubmitPartnerOnboarding = z.object({
  accepted_terms: z.boolean(),
})
export type StoreSubmitPartnerOnboardingInput = z.infer<
  typeof StoreSubmitPartnerOnboarding
>
