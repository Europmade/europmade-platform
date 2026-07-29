"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@europmade/ui";
import { StatusScreen } from "../_components/status-screen";
import {
  getOnboarding,
  PartnerOnboardingApiError,
  type OnboardingRecord,
} from "../_lib/partner-onboarding-api";

// Scherm #28: Statuspagina, met de vier bevroren varianten (In behandeling,
// Goedgekeurd, Afgekeurd, Aanvullende informatie vereist —
// `04-partner-onboarding-*.html`, schermen 7/7b/7c/7d).
export default function PartnerOnboardingStatusPage() {
  const router = useRouter();
  const [onboarding, setOnboarding] = useState<OnboardingRecord | null | "loading">("loading");

  useEffect(() => {
    let cancelled = false;

    getOnboarding()
      .then(({ onboarding: current }) => {
        if (cancelled) return;
        if (!current) {
          router.replace("/partner-onboarding");
          return;
        }
        setOnboarding(current);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof PartnerOnboardingApiError && err.status === 401) {
          router.replace("/login?redirect=/partner-onboarding/status");
          return;
        }
        router.replace("/partner-onboarding");
      });

    return () => {
      cancelled = true;
    };
  }, [router]);

  if (onboarding === "loading") {
    return (
      <div className="border border-wf-400 bg-white px-6 py-16 text-center text-sm text-wf-600">
        Laden…
      </div>
    );
  }

  if (!onboarding) {
    return null;
  }

  if (onboarding.onboarding_status === "Concept") {
    // Een Concept hoort niet op de statuspagina te landen — terug naar de flow.
    router.replace("/partner-onboarding");
    return null;
  }

  if (onboarding.onboarding_status === "Ingediend" || onboarding.onboarding_status === "In beoordeling") {
    return (
      <StatusScreen icon="⏳" variant="pending" badge="In beoordeling" title="Je aanvraag wordt beoordeeld">
        Dit duurt meestal minder dan één werkdag. Je ontvangt een e-mail zodra er een beslissing is.
        <div className="mt-5">
          <Button variant="ghost" onClick={() => router.push("/")}>
            Naar mijn account
          </Button>
        </div>
      </StatusScreen>
    );
  }

  if (onboarding.onboarding_status === "Goedgekeurd") {
    return (
      <StatusScreen
        icon="✓"
        variant="solid"
        badge="Goedgekeurd"
        title="Welkom als partner!"
        actions={
          // Doelpagina (2FA-instellen) valt buiten deze ticketscope — zie
          // implementatierapport S3-02-03.
          <Button onClick={() => router.push("/account/two-factor-setup")}>
            Tweestapsverificatie instellen
          </Button>
        }
      >
        Voordat je naar je Dashboard kunt, stel je eerst tweestapsverificatie in — verplicht voor
        Retailer- en Producent-accounts.
      </StatusScreen>
    );
  }

  if (onboarding.onboarding_status === "Afgekeurd") {
    return (
      <StatusScreen
        icon="✕"
        variant="rejected"
        badge="Afgekeurd"
        title="Je aanvraag is (nog) niet goedgekeurd"
        actions={
          <Button onClick={() => router.push("/partner-onboarding")}>
            Aanpassen en opnieuw indienen
          </Button>
        }
      >
        <div className="rounded-md border border-dashed border-wf-700 bg-wf-100 px-4 py-3 text-left text-xs text-wf-800">
          De specifieke afkeurreden per onderdeel is nog niet beschikbaar via de API (zie
          implementatierapport S3-02-02) — pas je gegevens aan en dien de aanvraag opnieuw in, of neem
          contact op met EuropMade voor meer toelichting.
        </div>
      </StatusScreen>
    );
  }

  return (
    <StatusScreen
      icon="?"
      variant="pending"
      badge="Aanvullende informatie vereist"
      title="We hebben nog iets van je nodig"
      actions={
        <Button onClick={() => router.push("/partner-onboarding")}>Aanvulling versturen</Button>
      }
    >
      <div className="rounded-md border border-dashed border-wf-700 bg-wf-100 px-4 py-3 text-left text-xs text-wf-800">
        De specifieke vraag van de reviewer is nog niet beschikbaar via de API (zie
        implementatierapport S3-02-02) — ga naar je aanvraag om de gevraagde onderdelen te
        controleren en opnieuw in te dienen.
      </div>
    </StatusScreen>
  );
}
