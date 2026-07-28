"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@europmade/ui";
import { StatusScreen } from "../_components/status-screen";
import { confirmEmailVerification } from "../_lib/medusa-auth";

// Dubbele klik op dezelfde verificatielink toont dit scherm gewoon opnieuw —
// geen foutmelding voor een account dat al geverifieerd is (wireframe-fix,
// screen 6). De pending/foutstaat zelf staat niet in de wireframe (die toont
// alleen het succesresultaat) en is de minimale, met het Design System
// consistente afhandeling van spec §3.2 ("verlopen link → duidelijke melding,
// geen doodlopende pagina").
function VerifyEmailContent() {
  const router = useRouter();
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
      <StatusScreen icon="…" title="Bezig met bevestigen">
        Een moment geduld terwijl we je e-mailadres bevestigen.
      </StatusScreen>
    );
  }

  if (status === "error") {
    return (
      <StatusScreen
        icon="!"
        title="Deze link is niet (meer) geldig"
        actions={
          <Link href="/login" className="text-xs text-wf-800 underline decoration-dotted">
            Naar inloggen
          </Link>
        }
      >
        E-mailverificatie blokkeert het winkelen niet — je kunt gewoon inloggen en verdergaan.
      </StatusScreen>
    );
  }

  return (
    <StatusScreen
      icon="✓"
      title="E-mailadres bevestigd!"
      actions={<Button onClick={() => router.push("/")}>Naar mijn account</Button>}
    >
      Je account is helemaal klaar. Je kunt nu inloggen en beginnen met winkelen op EuropMade.
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
