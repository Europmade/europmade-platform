"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Checkbox, Input, Notice } from "@europmade/ui";
import { AuthCard } from "../_components/auth-card";
import {
  createCustomer,
  createSession,
  refreshToken,
  registerAuthIdentity,
} from "../_lib/medusa-auth";

// Eén registratieflow — geen rolkeuze, geen aparte velden voor "ik ben een
// retailer/producent" (authenticatie/spec.md §1.3, wireframe-fix screen 2).
export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existingAccount, setExistingAccount] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setExistingAccount(false);
    setIsSubmitting(true);
    try {
      const { token } = await registerAuthIdentity(email, password);
      const [firstName, ...rest] = name.trim().split(/\s+/);
      await createCustomer(token, {
        email,
        first_name: firstName || undefined,
        last_name: rest.join(" ") || undefined,
      });
      // Het registratietoken heeft nu pas een gekoppeld actor_id — verversen
      // vóór de sessie wordt aangemaakt, anders is de sessie niet bruikbaar
      // voor beveiligde /store/*-aanroepen (o.a. Partner Onboarding, S3-02-03).
      const { token: sessionToken } = await refreshToken(token);
      // Account is direct aangemaakt en direct bruikbaar (spec §1.3) — meteen inloggen.
      await createSession(sessionToken);
      // Development-only: uitsluitend wanneer NODE_ENV=development (automatisch
      // gezet door `next dev`, nooit door `next build`/`next start`) direct door
      // naar Partner Onboarding, zonder de verificatiemail-stap — symmetrisch met
      // de dev-only bypass in `requireVerifiedEmailStep` (backend). In elke
      // andere omgeving (production) blijft de bestaande "Controleer je e-mail"-
      // stap ongewijzigd verplicht.
      if (process.env.NODE_ENV === "development") {
        router.push("/partner-onboarding");
      } else {
        router.push(`/check-email?context=register&email=${encodeURIComponent(email)}`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      if (message.includes("already exists")) {
        setExistingAccount(true);
      } else {
        setError("Registreren is niet gelukt. Probeer het opnieuw.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthCard
      title="Account aanmaken"
      subtitle="Eén account voor kopen — en later, als je dat wilt, ook verkopen"
    >
      <form onSubmit={handleSubmit}>
        {existingAccount && (
          <Notice variant="warning" className="mb-4">
            Dit e-mailadres is al geregistreerd.{" "}
            <Link href="/login" className="underline decoration-dotted">
              Inloggen
            </Link>
          </Notice>
        )}
        {error && (
          <Notice variant="warning" className="mb-4">
            {error}
          </Notice>
        )}
        <Input
          label="Naam"
          placeholder="Voor- en achternaam"
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <Input
          label="E-mailadres"
          type="email"
          placeholder="naam@voorbeeld.nl"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Input
          label="Wachtwoord"
          type="password"
          placeholder="Minimaal 8 tekens"
          autoComplete="new-password"
          minLength={8}
          hint="Minimaal 8 tekens, combinatie van letters en cijfers aanbevolen."
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <div className="mb-5">
          <Checkbox
            label={
              <>
                Ik ga akkoord met de <span className="underline decoration-dotted">voorwaarden</span> en
                het <span className="underline decoration-dotted">privacybeleid</span>
              </>
            }
            checked={acceptedTerms}
            onChange={(e) => setAcceptedTerms(e.target.checked)}
            required
          />
        </div>
        <Button type="submit" className="w-full" disabled={isSubmitting || !acceptedTerms}>
          {isSubmitting ? "Bezig…" : "Account aanmaken"}
        </Button>
      </form>
      <div className="my-[22px] flex items-center gap-[10px] text-[11px] text-wf-500">
        <span className="h-px flex-1 bg-wf-300" />
        of
        <span className="h-px flex-1 bg-wf-300" />
      </div>
      <p className="text-center text-xs text-wf-600">
        Al een account?{" "}
        <Link href="/login" className="text-wf-800 underline decoration-dotted">
          Inloggen
        </Link>
      </p>
    </AuthCard>
  );
}
