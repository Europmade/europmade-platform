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
      router.replace("/dashboard");
      router.refresh();
    } catch (err) {
      if (err instanceof MedusaAdminAuthError && err.status === 401) {
        setError("E-mailadres of wachtwoord onjuist.");
      } else if (err instanceof MedusaAdminAuthError) {
        setError(err.message);
      } else {
        setError("Inloggen is tijdelijk niet mogelijk. Probeer het opnieuw.");
      }
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
          className="mb-5 text-[15px] font-bold tracking-tight text-wf-900"
          aria-label="EuropMade"
        >
          EuropMade
        </div>
        <h1 className="mb-1 text-lg font-bold text-wf-900">Beheerder-login</h1>
        <p className="mb-5 text-xs text-wf-600">
          Log in met een Medusa admin-user (niet met een seller-/klantaccount).
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
