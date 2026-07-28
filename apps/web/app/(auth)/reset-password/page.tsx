"use client";

import { Suspense, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Input, Notice } from "@europmade/ui";
import { AuthCard } from "../_components/auth-card";
import { updatePassword } from "../_lib/medusa-auth";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Verlopen/al-gebruikte reset-token → melding + link terug naar "Wachtwoord
  // vergeten", geen doodlopende pagina (wireframe-fix, screen 4).
  if (!token) {
    return (
      <AuthCard title="Nieuw wachtwoord instellen">
        <Notice variant="warning" className="mb-4">
          Deze link is verlopen of al gebruikt.
        </Notice>
        <Link href="/forgot-password" className="text-xs text-wf-800 underline decoration-dotted">
          ← Terug naar Wachtwoord vergeten
        </Link>
      </AuthCard>
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError("De wachtwoorden komen niet overeen.");
      return;
    }
    setIsSubmitting(true);
    try {
      await updatePassword(token, password);
      router.push("/login");
    } catch {
      setError("Deze link is verlopen of al gebruikt.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthCard title="Nieuw wachtwoord instellen" subtitle="Kies een nieuw wachtwoord voor je account">
      <form onSubmit={handleSubmit}>
        {error && (
          <Notice variant="warning" className="mb-4">
            {error}
          </Notice>
        )}
        <Input
          label="Nieuw wachtwoord"
          type="password"
          placeholder="Minimaal 8 tekens"
          autoComplete="new-password"
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <Input
          label="Bevestig wachtwoord"
          type="password"
          placeholder="Herhaal je nieuwe wachtwoord"
          autoComplete="new-password"
          minLength={8}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
        />
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Bezig…" : "Wachtwoord opslaan"}
        </Button>
      </form>
    </AuthCard>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}
