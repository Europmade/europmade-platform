"use client";

import { Suspense, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Checkbox, CodeInput, Input, Notice } from "@europmade/ui";
import { AuthCard } from "../_components/auth-card";
import { createSession, loginWithMfa, MedusaAuthError, storeMfaTrustToken, verifyMfaChallenge } from "../_lib/medusa-auth";
import { claimPendingGuestOrder, mergeGuestCart } from "../../_lib/order-service-api";
import { getOnboarding } from "../../partner-onboarding/_lib/partner-onboarding-api";
import { useStorefrontLocale } from "../../_lib/i18n/use-storefront-locale";
import { t } from "../../_lib/i18n/messages";

type Step =
  | { name: "credentials" }
  | { name: "mfa"; challengeId: string; useRecoveryCode: boolean };

// Alleen interne, relatieve paden toestaan als terugkeer-bestemming na login
// (voorkomt een open redirect via een gemanipuleerde `redirect`-queryparam).
function sanitizeRedirectTarget(value: string | null): string {
  if (!value) return "/";
  if (!value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}

function LoginPageContent() {
  const router = useRouter();
  const locale = useStorefrontLocale();
  const searchParams = useSearchParams();
  const redirectTo = sanitizeRedirectTarget(searchParams.get("redirect"));
  const claimPaymentReference = searchParams.get("payment_reference");
  const [step, setStep] = useState<Step>({ name: "credentials" });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [code, setCode] = useState("");
  const [trustDevice, setTrustDevice] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function finishLogin(token: string) {
    await createSession(token);
    // ADR-0022: guest cart → customer cart behouden na login.
    await mergeGuestCart();
    await claimPendingGuestOrder(claimPaymentReference);
    // Rollen bepalen welk dashboard opent: goedgekeurde seller → Seller Dashboard
    // wanneer geen expliciete redirect is opgegeven.
    let destination = redirectTo;
    if (redirectTo === "/") {
      try {
        const { onboarding } = await getOnboarding();
        if (onboarding?.onboarding_status === "Goedgekeurd") {
          destination = "/seller";
        }
      } catch {
        // Geen seller-sessie / onboarding onbekend → storefront home.
      }
    }
    router.push(destination);
    router.refresh();
  }

  async function handleCredentialsSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const result = await loginWithMfa(email, password);
      if (result.mfa_required && result.mfa_challenge) {
        setStep({ name: "mfa", challengeId: result.mfa_challenge.id, useRecoveryCode: false });
        return;
      }
      if (result.token) {
        await finishLogin(result.token);
        return;
      }
      setError(t("authLoginError", locale));
    } catch (err) {
      if (err instanceof MedusaAuthError && err.status === 401) {
        setError(t("authLoginError", locale));
      } else if (err instanceof MedusaAuthError) {
        setError(err.message);
      } else {
        setError(t("authLoginUnavailable", locale));
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleMfaSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (step.name !== "mfa") return;
    setError(null);
    setIsSubmitting(true);
    try {
      const result = await verifyMfaChallenge(
        step.challengeId,
        step.useRecoveryCode ? "recovery_code" : "totp",
        code,
        trustDevice,
      );
      if (result.trust_token) {
        storeMfaTrustToken(result.trust_token);
      }
      await finishLogin(result.token);
    } catch {
      setError(
        step.useRecoveryCode
          ? t("authMfaRecoveryError", locale)
          : t("authMfaCodeError", locale),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (step.name === "mfa") {
    const { useRecoveryCode } = step;
    return (
      <AuthCard
        title={t("authMfaTitle", locale)}
        subtitle={t("authMfaSubtitle", locale)}
      >
        <form onSubmit={handleMfaSubmit}>
          {error && (
            <Notice variant="warning" className="mb-4">
              {error}
            </Notice>
          )}
          {useRecoveryCode ? (
            <Input
              label={t("authRecoveryCode", locale)}
              placeholder={t("authRecoveryCodePlaceholder", locale)}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              autoFocus
              required
            />
          ) : (
            <CodeInput value={code} onChange={setCode} autoFocus />
          )}
          <div className="my-[18px] flex items-center justify-between text-xs">
            <Checkbox
              label={t("authTrustDevice", locale)}
              checked={trustDevice}
              onChange={(e) => setTrustDevice(e.target.checked)}
            />
          </div>
          <Button type="submit" className="w-full" disabled={isSubmitting || code.length === 0}>
            {t("authConfirm", locale)}
          </Button>
          <p className="mt-4 text-center text-xs text-wf-600">
            {useRecoveryCode ? (
              <button
                type="button"
                className="underline decoration-dotted"
                onClick={() => {
                  setCode("");
                  setError(null);
                  setStep({ ...step, useRecoveryCode: false });
                }}
              >
                {t("authUseAuthenticator", locale)}
              </button>
            ) : (
              <>
                {t("authNoAppAccess", locale)}{" "}
                <button
                  type="button"
                  className="underline decoration-dotted"
                  onClick={() => {
                    setCode("");
                    setError(null);
                    setStep({ ...step, useRecoveryCode: true });
                  }}
                >
                  {t("authUseRecovery", locale)}
                </button>
              </>
            )}
          </p>
        </form>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title={t("authLoginTitle", locale)}
      subtitle={t("authWelcomeBack", locale)}
    >
      <form onSubmit={handleCredentialsSubmit}>
        {error && (
          <Notice variant="warning" className="mb-4">
            {error}
          </Notice>
        )}
        <Input
          label={t("authEmail", locale)}
          type="email"
          placeholder={t("authEmailPlaceholder", locale)}
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Input
          label={t("authPassword", locale)}
          type="password"
          placeholder="••••••••"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <div className="mb-[18px] flex flex-col items-start gap-2 text-xs tablet:flex-row tablet:items-center tablet:justify-between">
          <Checkbox
            label={t("authRememberMe", locale)}
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
          />
          <Link href="/forgot-password" className="text-wf-800 underline decoration-dotted">
            {t("authForgotPassword", locale)}
          </Link>
        </div>
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? t("authSigningIn", locale) : t("authLoginTitle", locale)}
        </Button>
      </form>
      <div className="my-[22px] flex items-center gap-[10px] text-[11px] text-wf-500">
        <span className="h-px flex-1 bg-wf-300" />
        {t("authOr", locale)}
        <span className="h-px flex-1 bg-wf-300" />
      </div>
      <p className="text-center text-xs text-wf-600">
        {t("authNoAccount", locale)}{" "}
        <Link
          href={`/register${redirectTo !== "/" ? `?redirect=${encodeURIComponent(redirectTo)}` : ""}`}
          className="text-wf-800 underline decoration-dotted"
        >
          {t("authRegister", locale)}
        </Link>
      </p>
    </AuthCard>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageContent />
    </Suspense>
  );
}
