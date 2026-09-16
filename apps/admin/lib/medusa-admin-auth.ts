/**
 * Medusa Admin User-auth — zelfde patroon als apps/web customer-auth,
 * maar met actor_type "user" (Beheerder).
 */

import { adminFetch, setAdminAuthToken } from "./admin-fetch"

export class MedusaAdminAuthError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = "MedusaAdminAuthError";
    this.status = status;
  }
}

async function request<T>(
  path: string,
  init: RequestInit & { auth?: string } = {},
): Promise<T> {
  const { auth, headers, ...rest } = init;
  const response = await adminFetch(path, {
    ...rest,
    headers: {
      ...(auth ? { Authorization: `Bearer ${auth}` } : {}),
      ...headers,
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
    throw new MedusaAdminAuthError(message, response.status);
  }
  return body as T;
}

/** POST /auth/user/emailpass */
export async function loginUser(email: string, password: string) {
  const result = await request<{ token: string }>("/auth/user/emailpass", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  if (result.token) setAdminAuthToken(result.token);
  return result;
}

/** POST /auth/session */
export function createSession(token: string) {
  setAdminAuthToken(token);
  return request<{ user: unknown }>("/auth/session", {
    method: "POST",
    auth: token,
  });
}

/** GET /admin/users/me — huidige admin-gebruiker (sessiecookie en/of Bearer). */
export function getSession() {
  return request<{
    user?: {
      email?: string
      first_name?: string | null
      last_name?: string | null
      id?: string
    } | null
  }>("/admin/users/me", { method: "GET" })
}

/** DELETE /auth/session */
export async function endSession() {
  try {
    await request<void>("/auth/session", { method: "DELETE" });
  } finally {
    setAdminAuthToken(null);
  }
}
