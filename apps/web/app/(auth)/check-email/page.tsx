"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@europmade/ui";
import { StatusScreen } from "../_components/status-screen";
import { requestPasswordReset } from "../_lib/medusa-auth";
import { useStorefrontLocale } from "../../_lib/i18n/use-storefront-locale";
import { t, tFormat } from "../../_lib/i18n/messages";

// Zelfde scherm, twee contexten — na Registreren ("verificatielink") en na
// Wachtwoord vergeten ("resetlink"), alleen de tekst verschilt
// (wireframe-fix, screen 5).
function CheckEmailContent() {
  const locale = useStorefrontLocale();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";
  const context = searchParams.get("context") === "reset" ? "reset" : "register";
  const [resent, setResent] = useState(false);

  async function handleResend() {
    if (context === "reset") {
      try {
        await requestPasswordReset(email);
      } catch {
        // Bewust genegeerd — zelfde beveiligingsprincipe als het aanvraagscherm zelf.
      }
    }
    setResent(true);
  }

  const emailDisplay = email || t("authYourEmail", locale);
  const bodyKey =
    context === "reset" ? "authCheckEmailBodyReset" : "authCheckEmailBodyRegister";

  return (
    <StatusScreen
      icon="✉"
      variant="envelope"
      title={t("authCheckEmailTitle", locale)}
      actions={
        <>
          <Button variant="secondary" onClick={handleResend} disabled={resent}>
            {resent ? t("authResent", locale) : t("authResend", locale)}
          </Button>
          <p className="mt-4 text-xs text-wf-600">
            <Link href="/login" className="text-wf-800 underline decoration-dotted">
              {t("authBackToLogin", locale)}
            </Link>
          </p>
        </>
      }
    >
      {tFormat(bodyKey, locale, { email: emailDisplay })}
    </StatusScreen>
  );
}

export default function CheckEmailPage() {
  return (
    <Suspense fallback={null}>
      <CheckEmailContent />
    </Suspense>
  );
}
