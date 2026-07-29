/**
 * Dunne fetch-wrapper rond de bestaande Partner Onboarding-API (S3-02-02) en
 * de generieke Medusa-verificatie-endpoint — zelfde patroon als
 * `app/(auth)/_lib/medusa-auth.ts`, geen eigen backend-logica.
 */

const BACKEND_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? "http://localhost:9000";
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? "";

export class PartnerOnboardingApiError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "PartnerOnboardingApiError";
    this.status = status;
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${BACKEND_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(PUBLISHABLE_KEY ? { "x-publishable-api-key": PUBLISHABLE_KEY } : {}),
      ...init.headers,
    },
  });

  const body: unknown = await response.json().catch(() => undefined);

  if (!response.ok) {
    const message =
      body && typeof body === "object" && "message" in body && typeof body.message === "string"
        ? body.message
        : "Er is iets misgegaan. Probeer het opnieuw.";
    throw new PartnerOnboardingApiError(message, response.status);
  }

  return body as T;
}

export interface OnboardingCompany {
  id: string;
  legal_name: string;
  chamber_of_commerce_number: string;
  vat_number: string | null;
  country_code: string;
  iban: string;
}

export interface OnboardingRecord {
  id: string;
  customer_id: string;
  company_id: string;
  is_retailer: boolean;
  is_producer_or_brand_owner: boolean;
  is_distributor: boolean;
  onboarding_status:
    | "Concept"
    | "Ingediend"
    | "In beoordeling"
    | "Aanvullende informatie vereist"
    | "Goedgekeurd"
    | "Afgekeurd";
  approved_at: string | null;
  company: OnboardingCompany;
}

export interface RoleSelection {
  is_retailer: boolean;
  is_producer_or_brand_owner: boolean;
  is_distributor: boolean;
}

export interface CompanyDraftInput {
  legal_name?: string;
  chamber_of_commerce_number?: string;
  vat_number?: string | null;
  country_code?: string;
  iban?: string;
}

/** GET /store/partner-onboarding — eigen status/draft opvragen (S3-02-02). */
export function getOnboarding() {
  return request<{ onboarding: OnboardingRecord | null }>("/store/partner-onboarding", {
    method: "GET",
  });
}

/** POST /store/partner-onboarding — starten (server-side e-mailverificatie-gate). */
export function startOnboarding(data: RoleSelection & { company: CompanyDraftInput }) {
  return request<{ onboarding: OnboardingRecord }>("/store/partner-onboarding", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/** PATCH /store/partner-onboarding — Concept/Aanvullende-informatie-vereist/Afgekeurd bijwerken. */
export function updateOnboardingDraft(
  data: Partial<RoleSelection> & { company?: CompanyDraftInput },
) {
  return request<{ onboarding: OnboardingRecord }>("/store/partner-onboarding", {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

/** POST /store/partner-onboarding/submit — indienen (Concept/Afgekeurd → In beoordeling). */
export function submitOnboarding(acceptedTerms: boolean) {
  return request<{ onboarding: OnboardingRecord }>("/store/partner-onboarding/submit", {
    method: "POST",
    body: JSON.stringify({ accepted_terms: acceptedTerms }),
  });
}

/** POST /store/partner-onboarding/submit-addition — aanvulling versturen (spec §2.8A). */
export function submitOnboardingAddition() {
  return request<{ onboarding: OnboardingRecord }>(
    "/store/partner-onboarding/submit-addition",
    { method: "POST" },
  );
}

/** GET /store/customers/me — standaard Medusa Store-endpoint, voor het e-mailadres bij de verificatiegate. */
export function getCurrentCustomer() {
  return request<{ customer: { id: string; email: string } }>("/store/customers/me", {
    method: "GET",
  });
}

/**
 * POST /auth/verification/request — generieke Medusa-verificatie, hergebruikt
 * voor "verificatiemail opnieuw versturen" (spec §1.8, geen nieuw scherm).
 * `entity_type`/`entity_id` conform het emailpass-verificatiecontract
 * (S3-02-02-onderzoek: entity_type "email", entity_id = e-mailadres).
 */
export function requestEmailVerification(email: string) {
  return request<void>("/auth/verification/request", {
    method: "POST",
    body: JSON.stringify({
      entity_id: email,
      entity_type: "email",
      code_provider: "token",
    }),
  });
}
