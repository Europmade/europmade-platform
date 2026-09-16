/**
 * Dunne fetch-wrapper rond de bestaande, standaard Medusa v2 Auth-/Store-API.
 *
 * Geen eigen authenticatielogica — uitsluitend directe aanroepen van de al
 * bestaande endpoints, met de exacte request-/responsecontracten zoals
 * geverifieerd in de implementatierapporten van S3-01-02 (Registratie/Login/
 * Wachtwoord vergeten) en S3-01-03 (2FA).
 */

import { medusaBackendUrl } from "../../_lib/medusa-backend-url";

const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? "";

export class MedusaAuthError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "MedusaAuthError";
    this.status = status;
  }
}

async function request<T>(
  path: string,
  init: RequestInit & { auth?: string } = {},
): Promise<T> {
  const { auth, headers, ...rest } = init;

  const response = await fetch(`${medusaBackendUrl()}${path}`, {
    ...rest,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(PUBLISHABLE_KEY ? { "x-publishable-api-key": PUBLISHABLE_KEY } : {}),
      ...(auth ? { Authorization: `Bearer ${auth}` } : {}),
      ...headers,
    },
  });

  const body: unknown = await response.json().catch(() => undefined);

  if (!response.ok) {
    const message =
      body && typeof body === "object" && "message" in body && typeof body.message === "string"
        ? body.message
        : "Er is iets misgegaan. Probeer het opnieuw.";
    throw new MedusaAuthError(message, response.status);
  }

  return body as T;
}

export interface LoginResult {
  token?: string;
  mfa_required?: boolean;
  mfa_challenge?: { id: string };
  verification_required?: boolean;
}

/** POST /auth/customer/emailpass — bestaande Medusa Auth-login. */
export function login(email: string, password: string) {
  return request<LoginResult>("/auth/customer/emailpass", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

/** POST /auth/customer/emailpass/register — stap 1 van de bestaande registratieflow (auth identity). */
export function registerAuthIdentity(email: string, password: string) {
  return request<{ token: string }>("/auth/customer/emailpass/register", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

/** POST /store/customers — stap 2 van de bestaande registratieflow (Customer-record). */
export function createCustomer(
  token: string,
  data: { email: string; first_name?: string; last_name?: string },
) {
  return request<{ customer: unknown }>("/store/customers", {
    method: "POST",
    auth: token,
    body: JSON.stringify(data),
  });
}

/**
 * POST /auth/token/refresh — ververst een token nadat de bijbehorende actor
 * (hier: Customer) is aangemaakt/gekoppeld. Vereist tussen `createCustomer`
 * en `createSession`: het token van `registerAuthIdentity` heeft op het
 * moment van uitgifte nog een leeg `actor_id` (de auth identity is dan nog
 * niet gekoppeld) — zonder deze verversing bevat de sessie een token zonder
 * `actor_id`, waardoor elke latere beveiligde `/store/*`-aanroep (incl.
 * `/store/customers/me`) ten onrechte 401 geeft. Zie Medusa-documentatie
 * "Registration Token" / "Refresh Token"-route.
 */
export function refreshToken(token: string) {
  return request<{ token: string }>("/auth/token/refresh", {
    method: "POST",
    auth: token,
  });
}

/** POST /auth/session — server-side sessie aanmaken (httpOnly cookie). */
export function createSession(token: string) {
  return request<{ user: unknown }>("/auth/session", {
    method: "POST",
    auth: token,
  });
}

/** DELETE /auth/session — server-side sessie beëindigen. */
export function endSession() {
  return request<void>("/auth/session", { method: "DELETE" });
}

/** POST /auth/customer/emailpass/reset-password — toont bewust altijd hetzelfde resultaat. */
export function requestPasswordReset(email: string) {
  return request<void>("/auth/customer/emailpass/reset-password", {
    method: "POST",
    body: JSON.stringify({ identifier: email }),
  });
}

/** POST /auth/customer/emailpass/update — met het reset-token uit de e-maillink als Bearer-token. */
export function updatePassword(resetToken: string, password: string) {
  return request<{ success: boolean }>("/auth/customer/emailpass/update", {
    method: "POST",
    auth: resetToken,
    body: JSON.stringify({ password }),
  });
}

/** POST /store/mfa/challenges/{id}/verify — 2FA-stap tijdens inloggen (TOTP of herstelcode). */
export function verifyMfaChallenge(
  challengeId: string,
  method: "totp" | "recovery_code",
  code: string,
  trustDevice = false,
) {
  return request<{ token: string; trust_token?: string }>(
    `/store/mfa/challenges/${challengeId}/verify`,
    {
      method: "POST",
      body: JSON.stringify({
        method,
        code,
        trust_device: trustDevice,
      }),
    },
  );
}

const MFA_TRUST_STORAGE_KEY = "em_mfa_trust_token";

export function storeMfaTrustToken(token: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(MFA_TRUST_STORAGE_KEY, token);
  } catch {
    // ignore quota / private mode
  }
}

export function readMfaTrustToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(MFA_TRUST_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function clearMfaTrustToken() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(MFA_TRUST_STORAGE_KEY);
  } catch {
    // ignore
  }
}

export type MfaStatus = {
  enabled: boolean;
  pending: boolean;
};

/** GET /store/mfa — of 2FA actief is. */
export function getMfaStatus() {
  return request<MfaStatus>("/store/mfa");
}

/** POST /store/mfa/enroll — start TOTP-setup. */
export function enrollMfa() {
  return request<{
    secret: string;
    manual_entry_key: string;
    otpauth_url: string;
    qr_data_url: string;
  }>("/store/mfa/enroll", { method: "POST", body: "{}" });
}

/** POST /store/mfa/confirm — bevestig code; activeert 2FA. */
export function confirmMfa(code: string) {
  return request<{ enabled: true; recovery_codes: string[] }>("/store/mfa/confirm", {
    method: "POST",
    body: JSON.stringify({ code }),
  });
}

/**
 * Login met optionele 2FA-challenge wanneer het account MFA heeft.
 * Medusa emailpass geeft een token; bij actieve MFA maken we een challenge
 * vóór createSession (authenticatie/spec.md §1.7).
 */
export async function loginWithMfa(email: string, password: string): Promise<LoginResult> {
  const result = await login(email, password);
  if (!result.token || result.mfa_required) {
    return result;
  }

  try {
    const status = await request<MfaStatus>("/store/mfa", {
      auth: result.token,
    });
    if (!status.enabled) {
      return result;
    }
    const trust_token = readMfaTrustToken();
    const challenge = await request<{
      skipped?: boolean;
      mfa_challenge?: { id: string };
    }>("/store/mfa/challenges", {
      method: "POST",
      auth: result.token,
      body: JSON.stringify({
        auth_token: result.token,
        ...(trust_token ? { trust_token } : {}),
      }),
    });
    if (challenge.skipped) {
      return result;
    }
    if (!challenge.mfa_challenge?.id) {
      return result;
    }
    return {
      mfa_required: true,
      mfa_challenge: { id: challenge.mfa_challenge.id },
    };
  } catch {
    // Geen MFA-module/status → normale login zonder challenge.
    return result;
  }
}

/** POST /auth/verification/confirm — generieke Medusa-verificatie-bevestiging. */
export function confirmEmailVerification(code: string, codeProvider: string) {
  return request<{ entity_id: string }>("/auth/verification/confirm", {
    method: "POST",
    body: JSON.stringify({ code, code_provider: codeProvider }),
  });
}
