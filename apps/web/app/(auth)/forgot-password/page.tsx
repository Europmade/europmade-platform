"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Input } from "@europmade/ui";
import { AuthCard } from "../_components/auth-card";
import { requestPasswordReset } from "../_lib/medusa-auth";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      await requestPasswordReset(email);
    } catch {
      // Bewust genegeerd: dit scherm toont altijd hetzelfde vervolg (spec §1.5),
      // ongeacht of het adres bestaat of de aanroep faalt — voorkomt dat een
      // aanvaller kan testen welke e-mailadressen geregistreerd zijn.
    } finally {
      router.push(`/check-email?context=reset&email=${encodeURIComponent(email)}`);
    }
  }

  return (
    <AuthCard
      title="Wachtwoord vergeten"
      subtitle="Vul je e-mailadres in, we sturen je een link om een nieuw wachtwoord in te stellen"
    >
      <form onSubmit={handleSubmit}>
        <Input
          label="E-mailadres"
          type="email"
          placeholder="naam@voorbeeld.nl"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Bezig…" : "Verstuur resetlink"}
        </Button>
      </form>
      <p className="mt-[18px] text-center text-xs text-wf-600">
        ← Terug naar{" "}
        <Link href="/login" className="text-wf-800 underline decoration-dotted">
          Inloggen
        </Link>
      </p>
    </AuthCard>
  );
}
