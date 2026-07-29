"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Notice } from "@europmade/ui";
import { createSession, loginUser, MedusaAdminAuthError } from "../../lib/medusa-admin-auth";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const { token } = await loginUser(email.trim(), password);
      await createSession(token);
      router.replace("/partners");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof MedusaAdminAuthError
          ? err.message
          : "Inloggen is niet gelukt.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-wf-100 px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md border border-wf-400 bg-white p-6 tablet:p-8"
      >
        <div
          className="mb-5 h-6 w-[130px] rounded bg-wf-300"
          role="img"
          aria-label="EuropMade logo"
        />
        <h1 className="mb-1 text-lg font-bold text-wf-900">Beheerder-login</h1>
        <p className="mb-5 text-xs text-wf-600">
          Log in om Partnerbeheer te openen.
        </p>
        {error && (
          <Notice variant="warning" className="mb-4">
            {error}
          </Notice>
        )}
        <Input
          label="E-mailadres"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="username"
        />
        <Input
          label="Wachtwoord"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
        />
        <div className="mt-4">
          <Button type="submit" disabled={busy} className="w-full">
            {busy ? "Bezig…" : "Inloggen"}
          </Button>
        </div>
      </form>
    </main>
  );
}
