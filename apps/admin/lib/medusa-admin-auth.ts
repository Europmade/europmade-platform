/**
 * Medusa Admin User-auth — zelfde patroon als apps/web customer-auth,
 * maar met actor_type "user" (Beheerder).
 */

const BACKEND_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? "http://localhost:9000";

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
  const response = await fetch(`${BACKEND_URL}${path}`, {
    ...rest,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
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
export function loginUser(email: string, password: string) {
  return request<{ token: string }>("/auth/user/emailpass", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

/** POST /auth/session */
export function createSession(token: string) {
  return request<{ user: unknown }>("/auth/session", {
    method: "POST",
    auth: token,
  });
}

/** DELETE /auth/session */
export function endSession() {
  return request<void>("/auth/session", { method: "DELETE" });
}
