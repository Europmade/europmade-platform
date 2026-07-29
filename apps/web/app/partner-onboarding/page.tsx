import { OnboardingWizard } from "./_components/onboarding-wizard";

// Schermen #26/#27: Welkom + de stapsgewijze flow (Partner kiezen t/m
// Samenvatting). Statuslogica en resume-gedrag zitten in de client-component
// zelf (S3-02-02-API-aanroepen vereisen de browsersessie/cookie).
export default function PartnerOnboardingPage() {
  return <OnboardingWizard />;
}
