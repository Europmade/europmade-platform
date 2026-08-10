"use client";

import { Suspense, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Input, Notice } from "@europmade/ui";
import { AuthCard } from "../_components/auth-card";
import { updatePassword } from "../_lib/medusa-auth";
import { useStorefrontLocale } from "../../_lib/i18n/use-storefront-locale";
import { t } from "../../_lib/i18n/messages";

function ResetPasswordForm() {
  const router = useRouter();
  const locale = useStorefrontLocale();
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
      <AuthCard title={t("authResetTitle", locale)}>
        <Notice variant="warning" className="mb-4">
          {t("authResetLinkExpired", locale)}
        </Notice>
        <Link href="/forgot-password" className="text-xs text-wf-800 underline decoration-dotted">
          {t("authBackToForgot", locale)}
        </Link>
      </AuthCard>
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError(t("authPasswordMismatch", locale));
      return;
    }
    setIsSubmitting(true);
    try {
      await updatePassword(token, password);
      router.push("/login");
    } catch {
      setError(t("authResetLinkExpired", locale));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthCard title={t("authResetTitle", locale)} subtitle={t("authResetSubtitle", locale)}>
      <form onSubmit={handleSubmit}>
        {error && (
          <Notice variant="warning" className="mb-4">
            {error}
          </Notice>
        )}
        <Input
          label={t("authNewPassword", locale)}
          type="password"
          placeholder={t("authPasswordHint", locale)}
          autoComplete="new-password"
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <Input
          label={t("authConfirmPassword", locale)}
          type="password"
          placeholder={t("authConfirmPasswordPlaceholder", locale)}
          autoComplete="new-password"
          minLength={8}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
        />
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? t("authCreatingAccount", locale) : t("authSavePassword", locale)}
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
