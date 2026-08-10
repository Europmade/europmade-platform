"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@europmade/ui";
import { StatusScreen } from "../_components/status-screen";
import { confirmEmailVerification } from "../_lib/medusa-auth";
import { useStorefrontLocale } from "../../_lib/i18n/use-storefront-locale";
import { t } from "../../_lib/i18n/messages";

// Dubbele klik op dezelfde verificatielink toont dit scherm gewoon opnieuw —
// geen foutmelding voor een account dat al geverifieerd is (wireframe-fix,
// screen 6). De pending/foutstaat zelf staat niet in de wireframe (die toont
// alleen het succesresultaat) en is de minimale, met het Design System
// consistente afhandeling van spec §3.2 ("verlopen link → duidelijke melding,
// geen doodlopende pagina").
function VerifyEmailContent() {
  const router = useRouter();
  const locale = useStorefrontLocale();
  const searchParams = useSearchParams();
  const code = searchParams.get("code");
  const codeProvider = searchParams.get("code_provider") ?? "local";
  const [status, setStatus] = useState<"pending" | "success" | "error">(code ? "pending" : "error");

  useEffect(() => {
    if (!code) return;
    confirmEmailVerification(code, codeProvider)
      .then(() => setStatus("success"))
      .catch(() => setStatus("error"));
  }, [code, codeProvider]);

  if (status === "pending") {
    return (
      <StatusScreen icon="…" title={t("authVerifyPending", locale)}>
        {t("authVerifyPendingBody", locale)}
      </StatusScreen>
    );
  }

  if (status === "error") {
    return (
      <StatusScreen
        icon="!"
        title={t("authVerifyError", locale)}
        actions={
          <Link href="/login" className="text-xs text-wf-800 underline decoration-dotted">
            {t("authGoToLogin", locale)}
          </Link>
        }
      >
        {t("authVerifyErrorBody", locale)}
      </StatusScreen>
    );
  }

  return (
    <StatusScreen
      icon="✓"
      title={t("authVerifySuccess", locale)}
      actions={
        <Button onClick={() => router.push("/")}>{t("authGoToAccount", locale)}</Button>
      }
    >
      {t("authVerifySuccessBody", locale)}
    </StatusScreen>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailContent />
    </Suspense>
  );
}
