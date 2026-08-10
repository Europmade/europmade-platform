"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Input } from "@europmade/ui";
import { AuthCard } from "../_components/auth-card";
import { requestPasswordReset } from "../_lib/medusa-auth";
import { useStorefrontLocale } from "../../_lib/i18n/use-storefront-locale";
import { t } from "../../_lib/i18n/messages";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const locale = useStorefrontLocale();
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
      title={t("authForgotTitle", locale)}
      subtitle={t("authForgotSubtitle", locale)}
    >
      <form onSubmit={handleSubmit}>
        <Input
          label={t("authEmail", locale)}
          type="email"
          placeholder={t("authEmailPlaceholder", locale)}
          autoComplete="email"
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
