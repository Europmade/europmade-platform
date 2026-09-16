"use client";

import { Suspense, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Checkbox, Input, Notice } from "@europmade/ui";
import { AuthCard } from "../_components/auth-card";
import { createCustomer, createSession, refreshToken, registerAuthIdentity } from "../_lib/medusa-auth";
import { isValidLoginEmail, normalizeLoginEmail } from "../_lib/login-email";
import { claimPendingGuestOrder, mergeGuestCart } from "../../_lib/order-service-api";
import { useStorefrontLocale } from "../../_lib/i18n/use-storefront-locale";
import { t } from "../../_lib/i18n/messages";

// Eén registratieflow — geen rolkeuze, geen aparte velden voor "ik ben een
// retailer/producent" (authenticatie/spec.md §1.3, wireframe-fix screen 2).
function RegisterPageContent() {
  const router = useRouter();
  const locale = useStorefrontLocale();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect")?.trim() || "";
  const claimPaymentReference = searchParams.get("payment_reference")?.trim() || "";
  const isPartnerSignup =
    redirectTo.includes("/partner-onboarding") ||
    searchParams.get("intent")?.trim() === "partner";
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
    const normalizedEmail = normalizeLoginEmail(email);
    setEmail(normalizedEmail);
    if (!isValidLoginEmail(normalizedEmail)) {
      setError(t("authEmailInvalid", locale));
      return;
    }
    setIsSubmitting(true);
    try {
      const { token } = await registerAuthIdentity(normalizedEmail, password);
      const [firstName, ...rest] = name.trim().split(/\s+/);
      await createCustomer(token, {
        email: normalizedEmail,
        first_name: firstName || undefined,
        last_name: rest.join(" ") || undefined,
      });
      // Het registratietoken heeft nu pas een gekoppeld actor_id — verversen
      // vóór de sessie wordt aangemaakt, anders is de sessie niet bruikbaar
      // voor beveiligde /store/*-aanroepen (o.a. Partner Onboarding, S3-02-03).
      const { token: sessionToken } = await refreshToken(token);
      // Account is direct aangemaakt en direct bruikbaar (spec §1.3) — meteen inloggen.
      await createSession(sessionToken);
      // ADR-0022: guest cart behouden na registratie (zelfde merge als login).
      await mergeGuestCart();
      await claimPendingGuestOrder(claimPaymentReference || null);
      if (redirectTo.startsWith("/") && !redirectTo.startsWith("//")) {
        router.push(redirectTo);
        return;
      }
      // Development-only: uitsluitend wanneer NODE_ENV=development (automatisch
      // gezet door `next dev`, nooit door `next build`/`next start`) direct door
      // naar Partner Onboarding, zonder de verificatiemail-stap — symmetrisch met
      // de dev-only bypass in `requireVerifiedEmailStep` (backend). In elke
      // andere omgeving (production) blijft de bestaande "Controleer je e-mail"-
      // stap ongewijzigd verplicht.
      if (process.env.NODE_ENV === "development") {
        router.push("/partner-onboarding");
      } else {
        router.push(`/check-email?context=register&email=${encodeURIComponent(normalizedEmail)}`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      if (message.includes("already exists")) {
        setExistingAccount(true);
      } else {
        setError(t("authRegisterFailed", locale));
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthCard
      title={
        isPartnerSignup
          ? t("authRegisterPartnerTitle", locale)
          : t("authRegisterTitle", locale)
      }
      subtitle={
        isPartnerSignup
          ? t("authRegisterPartnerSubtitle", locale)
          : t("authRegisterSubtitle", locale)
      }
    >
      <form onSubmit={handleSubmit}>
        {existingAccount && (
          <Notice variant="warning" className="mb-4">
            {t("authEmailExists", locale)}{" "}
            <Link
              href={`/login${redirectTo ? `?redirect=${encodeURIComponent(redirectTo)}` : ""}`}
              className="underline decoration-dotted"
            >
              {t("authLoginTitle", locale)}
            </Link>
          </Notice>
        )}
        {error && (
          <Notice variant="warning" className="mb-4">
            {error}
          </Notice>
        )}
        <Input
          label={t("authFullName", locale)}
          placeholder={t("authFullNamePlaceholder", locale)}
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <Input
          label={t("authEmail", locale)}
          type="text"
          inputMode="email"
          name="email"
          placeholder={t("authEmailPlaceholder", locale)}
          autoComplete="email"
          spellCheck={false}
          autoCapitalize="none"
          autoCorrect="off"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Input
          label={t("authPassword", locale)}
          type="password"
          placeholder={t("authPasswordHint", locale)}
          autoComplete="new-password"
          minLength={8}
          hint={t("authPasswordHintLong", locale)}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <div className="mb-5">
          <Checkbox
            label={t("authAcceptTerms", locale)}
            checked={acceptedTerms}
            onChange={(e) => setAcceptedTerms(e.target.checked)}
            required
          />
        </div>
        <Button type="submit" className="w-full" disabled={isSubmitting || !acceptedTerms}>
          {isSubmitting ? t("authCreatingAccount", locale) : t("authRegisterTitle", locale)}
        </Button>
      </form>
      <div className="my-[22px] flex items-center gap-[10px] text-[11px] text-wf-500">
        <span className="h-px flex-1 bg-wf-300" />
        {t("authOr", locale)}
        <span className="h-px flex-1 bg-wf-300" />
      </div>
      <p className="text-center text-xs text-wf-600">
        {t("authAlreadyHaveAccount", locale)}{" "}
        <Link
          href={`/login${redirectTo ? `?redirect=${encodeURIComponent(redirectTo)}` : ""}`}
          className="text-wf-800 underline decoration-dotted"
        >
          {t("authLoginTitle", locale)}
        </Link>
      </p>
    </AuthCard>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterPageContent />
    </Suspense>
  );
}
