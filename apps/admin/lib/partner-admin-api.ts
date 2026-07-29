/**
 * Partnerbeheer admin-API (S3-02-04 + S3-02-05).
 * Geen Blokkeren — ADR-0006 / partner-center/spec.md.
 */

const BACKEND_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? "http://localhost:9000";

export class PartnerAdminApiError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = "PartnerAdminApiError";
    this.status = status;
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${BACKEND_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...init.headers,
    },
  });

  const body: unknown = await response.json().catch(() => undefined);
  if (!response.ok) {
    const message =
      body &&
      typeof body === "object" &&
      "message" in body &&
      typeof body.message === "string"
        ? body.message
        : "Er is iets misgegaan. Probeer het opnieuw.";
    throw new PartnerAdminApiError(message, response.status);
  }
  return body as T;
}

export type OnboardingStatus =
  | "Concept"
  | "Ingediend"
  | "In beoordeling"
  | "Aanvullende informatie vereist"
  | "Goedgekeurd"
  | "Afgekeurd";

export type OverviewTab = "all" | "queue" | "active";

export interface PartnerListItem {
  id: string;
  is_retailer: boolean;
  is_producer_or_brand_owner: boolean;
  is_distributor: boolean;
  onboarding_status: OnboardingStatus;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
  company: {
    legal_name: string;
    chamber_of_commerce_number: string;
    country_code: string;
  } | null;
}

export interface PartnerDetail {
  id: string;
  customer_id: string;
  is_retailer: boolean;
  is_producer_or_brand_owner: boolean;
  is_distributor: boolean;
  onboarding_status: OnboardingStatus;
  approved_at: string | null;
  review_note: string | null;
  created_at: string;
  updated_at: string;
  company: {
    id: string;
    legal_name: string;
    chamber_of_commerce_number: string;
    vat_number: string | null;
    country_code: string;
    iban: string;
  } | null;
  documents: {
    identity_document_file_id: string | null;
    chamber_of_commerce_extract_file_id: string | null;
    production_proof_file_id: string | null;
    authorization_proof_file_id: string | null;
    additional_certifications_file_id: string | null;
  };
}

export function listPartners(params: {
  tab?: OverviewTab;
  q?: string;
  limit?: number;
  offset?: number;
}) {
  const sp = new URLSearchParams();
  if (params.tab) sp.set("tab", params.tab);
  if (params.q) sp.set("q", params.q);
  if (params.limit != null) sp.set("limit", String(params.limit));
  if (params.offset != null) sp.set("offset", String(params.offset));
  const qs = sp.toString();
  return request<{
    partners: PartnerListItem[];
    count: number;
    limit: number;
    offset: number;
  }>(`/admin/partner-onboarding${qs ? `?${qs}` : ""}`);
}

export function getPartner(id: string) {
  return request<{ partner: PartnerDetail }>(`/admin/partner-onboarding/${id}`);
}

export function approvePartner(id: string) {
  return request<{ partner: unknown }>(`/admin/partners/${id}/approve`, {
    method: "POST",
  });
}

export function rejectPartner(id: string, reason: string) {
  return request<{ partner: unknown }>(`/admin/partners/${id}/reject`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}

export function requestAdditionalInfo(id: string, message: string) {
  return request<{ partner: unknown }>(
    `/admin/partners/${id}/request-additional-info`,
    {
      method: "POST",
      body: JSON.stringify({ message }),
    },
  );
}

export function formatRoles(p: {
  is_retailer: boolean;
  is_producer_or_brand_owner: boolean;
  is_distributor: boolean;
}): string {
  const roles: string[] = [];
  if (p.is_retailer) roles.push("Retailer");
  if (p.is_producer_or_brand_owner) roles.push("Producent/Merkhouder");
  if (p.is_distributor) roles.push("Distributeur");
  return roles.join(", ") || "—";
}

export function displayStatus(p: {
  onboarding_status: OnboardingStatus;
}): string {
  if (p.onboarding_status === "Goedgekeurd") return "Actief";
  return p.onboarding_status;
}
