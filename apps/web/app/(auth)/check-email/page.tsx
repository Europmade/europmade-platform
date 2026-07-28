"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@europmade/ui";
import { StatusScreen } from "../_components/status-screen";
import { requestPasswordReset } from "../_lib/medusa-auth";

// Zelfde scherm, twee contexten — na Registreren ("verificatielink") en na
// Wachtwoord vergeten ("resetlink"), alleen de tekst verschilt
// (wireframe-fix, screen 5).
function CheckEmailContent() {
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

  return (
    <StatusScreen
      icon="✉"
      variant="envelope"
      title="Controleer je e-mail"
      actions={
        <>
          <Button variant="secondary" onClick={handleResend} disabled={resent}>
            {resent ? "Opnieuw verstuurd" : "Opnieuw versturen"}
          </Button>
          <p className="mt-4 text-xs text-wf-600">
            ← Terug naar{" "}
            <Link href="/login" className="text-wf-800 underline decoration-dotted">
              Inloggen
            </Link>
          </p>
        </>
      }
    >
      We hebben een {context === "reset" ? "resetlink" : "verificatielink"} gestuurd naar{" "}
      <b>{email || "je e-mailadres"}</b>. Klik op de link om verder te gaan.
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
