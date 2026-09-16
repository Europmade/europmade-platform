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
import { getMfaStatus } from "../../(auth)/_lib/medusa-auth";
import { useStorefrontLocale } from "../../_lib/i18n/use-storefront-locale";
import { t } from "../../_lib/i18n/messages";
import { statusLabel } from "../../_lib/i18n/status-labels";

// Scherm #28: Statuspagina, met de vier bevroren varianten (In behandeling,
// Goedgekeurd, Afgekeurd, Aanvullende informatie vereist —
// `04-partner-onboarding-*.html`, schermen 7/7b/7c/7d).
export default function PartnerOnboardingStatusPage() {
  const router = useRouter();
  const locale = useStorefrontLocale();
  const [onboarding, setOnboarding] = useState<OnboardingRecord | null | "loading">("loading");
  const [mfaEnabled, setMfaEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;

    getOnboarding()
      .then(async ({ onboarding: current }) => {
        if (cancelled) return;
        if (!current) {
          router.replace("/partner-onboarding");
          return;
        }
        setOnboarding(current);
        if (current.onboarding_status === "Goedgekeurd") {
          try {
            const status = await getMfaStatus();
            if (!cancelled) setMfaEnabled(status.enabled);
          } catch {
            if (!cancelled) setMfaEnabled(false);
          }
        }
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
        {t("loading", locale)}
      </div>
    );
  }

  if (!onboarding) {
    return null;
  }

  if (onboarding.onboarding_status === "Concept") {
    router.replace("/partner-onboarding");
    return null;
  }

  if (
    onboarding.onboarding_status === "Ingediend" ||
    onboarding.onboarding_status === "In beoordeling"
  ) {
    return (
      <StatusScreen
        icon="⏳"
        variant="pending"
        badge={statusLabel("In beoordeling", locale)}
        title={t("partnerStatusPendingTitle", locale)}
      >
        {t("partnerStatusPendingBody", locale)}
        <div className="mt-5">
          <Button variant="ghost" onClick={() => router.push("/")}>
            {t("authGoToAccount", locale)}
          </Button>
        </div>
      </StatusScreen>
    );
  }

  if (onboarding.onboarding_status === "Goedgekeurd") {
    const ready = mfaEnabled === true;
    return (
      <StatusScreen
        icon="✓"
        variant="solid"
        badge={statusLabel("Goedgekeurd", locale)}
        title={t("partnerStatusApprovedTitle", locale)}
        actions={
          mfaEnabled === null ? null : (
            <Button
              onClick={() =>
                router.push(
                  ready
                    ? "/seller"
                    : "/account/two-factor-setup?required=1"
                )
              }
            >
              {ready
                ? t("authOpenDashboard", locale)
                : t("partnerSetup2fa", locale)}
            </Button>
          )
        }
      >
        {ready
          ? t("partnerStatusApprovedReadyBody", locale)
          : t("partnerStatusApprovedBody", locale)}
      </StatusScreen>
    );
  }

  if (onboarding.onboarding_status === "Afgekeurd") {
    return (
      <StatusScreen
        icon="✕"
        variant="rejected"
        badge={statusLabel("Afgekeurd", locale)}
        title={t("partnerStatusRejectedTitle", locale)}
        actions={
          <Button onClick={() => router.push("/partner-onboarding")}>
            {t("partnerStatusRejectedCta", locale)}
          </Button>
        }
      >
        <div className="rounded-md border border-dashed border-wf-700 bg-wf-100 px-4 py-3 text-left text-xs text-wf-800">
          {onboarding.review_note?.trim()
            ? onboarding.review_note
            : t("partnerStatusRejectedFallback", locale)}
        </div>
      </StatusScreen>
    );
  }

  return (
    <StatusScreen
      icon="?"
      variant="pending"
      badge={statusLabel("Aanvullende informatie vereist", locale)}
      title={t("partnerStatusAdditionTitle", locale)}
      actions={
        <Button onClick={() => router.push("/partner-onboarding")}>
          {t("partnerSubmitAddition", locale)}
        </Button>
      }
    >
      <div className="rounded-md border border-dashed border-wf-700 bg-wf-100 px-4 py-3 text-left text-xs text-wf-800">
        {onboarding.review_note?.trim()
          ? onboarding.review_note
          : t("partnerStatusAdditionFallback", locale)}
      </div>
    </StatusScreen>
  );
}
