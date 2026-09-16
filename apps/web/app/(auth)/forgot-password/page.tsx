"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Input, Notice } from "@europmade/ui";
import { AuthCard } from "../_components/auth-card";
import { requestPasswordReset } from "../_lib/medusa-auth";
import { isValidLoginEmail, normalizeLoginEmail } from "../_lib/login-email";
import { useStorefrontLocale } from "../../_lib/i18n/use-storefront-locale";
import { t } from "../../_lib/i18n/messages";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const locale = useStorefrontLocale();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedEmail = normalizeLoginEmail(email);
    setEmail(normalizedEmail);
    if (!isValidLoginEmail(normalizedEmail)) {
      setError(t("authEmailInvalid", locale));
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await requestPasswordReset(normalizedEmail);
    } catch {
      // Bewust genegeerd: dit scherm toont altijd hetzelfde vervolg (spec §1.5),
      // ongeacht of het adres bestaat of de aanroep faalt — voorkomt dat een
      // aanvaller kan testen welke e-mailadressen geregistreerd zijn.
    } finally {
      router.push(`/check-email?context=reset&email=${encodeURIComponent(normalizedEmail)}`);
    }
  }

  return (
    <AuthCard
      title={t("authForgotTitle", locale)}
      subtitle={t("authForgotSubtitle", locale)}
    >
      <form onSubmit={handleSubmit}>
        {error ? (
          <Notice variant="warning" className="mb-4">
            {error}
          </Notice>
        ) : null}
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
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? t("authCreatingAccount", locale) : t("authSendResetLink", locale)}
        </Button>
      </form>
      <p className="mt-[18px] text-center text-xs text-wf-600">
        <Link href="/login" className="text-wf-800 underline decoration-dotted">
          {t("authBackToLogin", locale)}
        </Link>
      </p>
    </AuthCard>
  );
}
