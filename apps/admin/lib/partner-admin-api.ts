/**
 * Partnerbeheer admin-API (S3-02-04 + S3-02-05).
 * Geen Blokkeren — ADR-0006 / partner-center/spec.md.
 */

import { adminFetch } from "./admin-fetch"

export class PartnerAdminApiError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = "PartnerAdminApiError";
    this.status = status;
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await adminFetch(path, init);

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

export type OnboardingStatusFilter = Exclude<
  OnboardingStatus,
  "Concept"
>;

export interface PartnerListItem {
  id: string;
  is_retailer: boolean;
  is_producer_or_brand_owner: boolean;
  is_brand_owner?: boolean;
  is_producer?: boolean;
  is_distributor: boolean;
  onboarding_status: OnboardingStatus;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
  contact_person?: string | null;
  contact_email?: string | null;
  product_count?: number;
  verification_status?: string;
  made_in_europe_status?: string;
  company: {
    legal_name: string;
    chamber_of_commerce_number: string;
    country_code: string;
  } | null;
}

export interface SellerContact {
  email: string | null;
  first_name: string | null;
  last_name: string | null;
}

export interface SellerProductSummary {
  total: number;
  pending_approval: number;
  approved: number;
  rejected: number;
  pending_evidence: number;
}

export interface SellerManufacturer {
  id: string;
  name: string;
  country_code: string | null;
  city: string | null;
  contact_email: string | null;
}

export interface SellerAuditEntry {
  id: string;
  action_type: string;
  reason: string | null;
  created_at: string;
  actor_customer_id: string | null;
}

export interface PartnerDetail {
  id: string;
  customer_id: string;
  is_retailer: boolean;
  is_producer_or_brand_owner: boolean;
  is_brand_owner?: boolean;
  is_producer?: boolean;
  is_distributor: boolean;
  roles?: string[];
  permissions?: string[];
  onboarding_status: OnboardingStatus;
  approved_at: string | null;
  review_note: string | null;
  created_at: string;
  updated_at: string;
  contact?: SellerContact;
  verification_status?: string;
  made_in_europe_status?: string;
  product_summary?: SellerProductSummary;
  audit_log?: SellerAuditEntry[];
  manufacturers?: SellerManufacturer[];
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

export interface SellerProductRow {
  id: string;
  title?: string | null;
  identifier_value?: string | null;
  sku_hint?: string | null;
  publication_status?: string | null;
  lifecycle_status?: string | null;
  workflow_status?: string | null;
  made_in_europe_status?: string | null;
  completeness?: {
    compliance_review_status?: string;
  };
}

export function listPartners(params: {
  tab?: OverviewTab;
  status?: OnboardingStatusFilter;
  q?: string;
  limit?: number;
  offset?: number;
}) {
  const sp = new URLSearchParams();
  if (params.tab) sp.set("tab", params.tab);
  if (params.status) sp.set("status", params.status);
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

export function listSellerProducts(sellerId: string) {
  return request<{ products: SellerProductRow[]; count: number }>(
    `/admin/product-cloud/products?seller_id=${encodeURIComponent(sellerId)}`,
  );
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

export function patchPartnerRoles(
  id: string,
  body: {
    is_retailer?: boolean;
    is_brand_owner?: boolean;
    is_producer?: boolean;
    is_distributor?: boolean;
  },
) {
  return request<{ partner: PartnerDetail }>(`/admin/partners/${id}/roles`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function formatRoles(p: {
  is_retailer: boolean;
  is_producer_or_brand_owner: boolean;
  is_brand_owner?: boolean;
  is_producer?: boolean;
  is_distributor: boolean;
  roles?: string[];
}): string {
  if (p.roles?.length) {
    const labels: Record<string, string> = {
      RETAILER: "Retailer",
      BRAND_OWNER: "Merkeigenaar",
      PRODUCER: "Producent",
    };
    return p.roles.map((r) => labels[r] || r).join(", ") || "—";
  }
  const roles: string[] = [];
  if (p.is_retailer) roles.push("Retailer");
  if (p.is_brand_owner) roles.push("Merkeigenaar");
  if (p.is_producer) roles.push("Producent");
  if (
    p.is_producer_or_brand_owner &&
    !p.is_brand_owner &&
    !p.is_producer
  ) {
    roles.push("Producent/Merkhouder");
  }
  if (p.is_distributor) roles.push("Distributeur");
  return roles.join(", ") || "—";
}

export function displayStatus(p: {
  onboarding_status: OnboardingStatus;
}): string {
  if (p.onboarding_status === "Goedgekeurd") return "Actief";
  return p.onboarding_status;
}
