"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Badge,
  Button,
  Checkbox,
  ChoiceCard,
  ChoiceCardGroup,
  FileUpload,
  Input,
  Notice,
  ReviewBlock,
  Stepper,
} from "@europmade/ui";
import {
  getCurrentCustomer,
  getOnboarding,
  PartnerOnboardingApiError,
  requestEmailVerification,
  startOnboarding,
  submitOnboarding,
  submitOnboardingAddition,
  updateOnboardingDraft,
  uploadOnboardingDocument,
  type OnboardingRecord,
} from "../_lib/partner-onboarding-api";
import { useStorefrontLocale } from "../../_lib/i18n/use-storefront-locale";
import { t, tFormat, type StorefrontMessageKey } from "../../_lib/i18n/messages";
import { statusLabel } from "../../_lib/i18n/status-labels";
import type { StorefrontLocale } from "../../_lib/i18n/locales";

/**
 * Partner Onboarding — schermen #26-28 (`04-partner-onboarding-*.html`,
 * v1.1 BEVROREN). Statusverloop/validatie/e-mailverificatie-gate lopen via
 * de bestaande API uit S3-02-02 — deze component bevat geen eigen
 * businesslogica, uitsluitend formulierstatus en API-aanroepen.
 */

type RoleKey = "is_retailer" | "is_producer_or_brand_owner" | "is_distributor";

const ROLE_OPTION_KEYS: {
  key: RoleKey;
  titleKey: StorefrontMessageKey;
  descriptionKey: StorefrontMessageKey;
}[] = [
  {
    key: "is_retailer",
    titleKey: "partnerRoleRetailer",
    descriptionKey: "partnerRoleRetailerDesc",
  },
  {
    key: "is_producer_or_brand_owner",
    titleKey: "partnerRoleProducer",
    descriptionKey: "partnerRoleProducerDesc",
  },
  {
    key: "is_distributor",
    titleKey: "partnerRoleDistributor",
    descriptionKey: "partnerRoleDistributorDesc",
  },
];

const STEP_LABEL_KEYS: StorefrontMessageKey[] = [
  "partnerStepChoose",
  "partnerStepCompany",
  "partnerStepVerification",
  "partnerStepDocuments",
  "partnerStepSummary",
];

interface CompanyFormState {
  legal_name: string;
  legal_form: string;
  chamber_of_commerce_number: string;
  company_address: string;
  country_code: string;
  vat_number: string;
  contact_name: string;
  contact_phone: string;
  contact_email: string;
  iban: string;
  account_holder_name: string;
}

const EMPTY_COMPANY: CompanyFormState = {
  legal_name: "",
  legal_form: "",
  chamber_of_commerce_number: "",
  company_address: "",
  country_code: "",
  vat_number: "",
  contact_name: "",
  contact_phone: "",
  contact_email: "",
  iban: "",
  account_holder_name: "",
};

interface VerificationFormState {
  representative_name: string;
  representative_role: string;
  production_country: string;
  manufacturer_name: string;
  production_locations: string;
  brand_ownership: string;
  manufacturer_ownership: string;
  represented_brands: string;
}

const EMPTY_VERIFICATION: VerificationFormState = {
  representative_name: "",
  representative_role: "",
  production_country: "",
  manufacturer_name: "",
  production_locations: "",
  brand_ownership: "",
  manufacturer_ownership: "",
  represented_brands: "",
};

interface DocumentsState {
  identity_document: File | null;
  chamber_of_commerce_extract: File | null;
  production_proof: File | null;
  authorization_proof: File | null;
  additional_certifications: File | null;
}

const EMPTY_DOCUMENTS: DocumentsState = {
  identity_document: null,
  chamber_of_commerce_extract: null,
  production_proof: null,
  authorization_proof: null,
  additional_certifications: null,
};

type Phase = { name: "loading" } | { name: "welcome" } | { name: "wizard"; step: number };

function stepLabels(locale: StorefrontLocale): string[] {
  return STEP_LABEL_KEYS.map((key) => t(key, locale));
}

export function OnboardingWizard() {
  const router = useRouter();
  const locale = useStorefrontLocale();

  const [phase, setPhase] = useState<Phase>({ name: "loading" });
  const [onboarding, setOnboarding] = useState<OnboardingRecord | null>(null);
  const [customerEmail, setCustomerEmail] = useState("");

  const [roles, setRoles] = useState<Record<RoleKey, boolean>>({
    is_retailer: false,
    is_producer_or_brand_owner: false,
    is_distributor: false,
  });
  const [company, setCompany] = useState<CompanyFormState>(EMPTY_COMPANY);
  const [verification, setVerification] = useState<VerificationFormState>(EMPTY_VERIFICATION);
  const [documents, setDocuments] = useState<DocumentsState>(EMPTY_DOCUMENTS);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [verificationGateError, setVerificationGateError] = useState(false);
  const [verificationResent, setVerificationResent] = useState(false);
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        const { customer } = await getCurrentCustomer();
        if (cancelled) return;
        setCustomerEmail(customer.email);
      } catch {
        router.replace("/register?redirect=/partner-onboarding");
        return;
      }

      try {
        const { onboarding: existing } = await getOnboarding();
        if (cancelled) return;

        if (!existing) {
          setPhase({ name: "welcome" });
          return;
        }

        const nonEditableStatuses: OnboardingRecord["onboarding_status"][] = [
          "Ingediend",
          "In beoordeling",
          "Goedgekeurd",
        ];
        if (nonEditableStatuses.includes(existing.onboarding_status)) {
          router.replace("/partner-onboarding/status");
          return;
        }

        setOnboarding(existing);
        setRoles({
          is_retailer: existing.is_retailer,
          is_producer_or_brand_owner: existing.is_producer_or_brand_owner,
          is_distributor: existing.is_distributor,
        });
        // `company` bestaat pas nadat de Bedrijfsgegevens-stap is opgeslagen
        // (net na "Partner kiezen" is dit nog `null`).
        if (existing.company) {
          const existingCompany = existing.company;
          setCompany((prev) => ({
            ...prev,
            legal_name: existingCompany.legal_name,
            chamber_of_commerce_number: existingCompany.chamber_of_commerce_number,
            vat_number: existingCompany.vat_number ?? "",
            country_code: existingCompany.country_code,
            iban: existingCompany.iban,
          }));
        }
        setPhase({ name: "wizard", step: 0 });
      } catch {
        setPhase({ name: "welcome" });
      }
    }

    bootstrap();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggleRole(key: RoleKey) {
    setRoles((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  const anyRoleSelected = roles.is_retailer || roles.is_producer_or_brand_owner || roles.is_distributor;
  const needsProductionVerification = roles.is_producer_or_brand_owner || roles.is_distributor;

  function handleStartAanmelding() {
    // De S3-02-02-API vereist minstens één geselecteerde rol bij het aanmaken
    // van een Concept (createOnboardingDraftStep), die pas in stap 0 ("Partner
    // kiezen") bekend wordt. Deze knop opent daarom alleen de wizard; het
    // daadwerkelijke aanmaken (met de e-mailverificatie-gate, spec §1.8)
    // gebeurt in handleRolesNext zodra de rol/rollen bekend zijn.
    setError(null);
    setVerificationGateError(false);
    setPhase({ name: "wizard", step: 0 });
  }

  async function handleResendVerification() {
    try {
      await requestEmailVerification(customerEmail);
    } catch {
      // Bewust genegeerd — zelfde beveiligingsprincipe als de Authenticatie-flow.
    } finally {
      setVerificationResent(true);
    }
  }

  async function goToStep(step: number) {
    setPhase({ name: "wizard", step });
  }

  async function handleRolesNext() {
    setError(null);
    if (!anyRoleSelected) {
      setError(t("partnerSelectRoleError", locale));
      return;
    }
    setIsBusy(true);
    try {
      if (onboarding) {
        const { onboarding: updated } = await updateOnboardingDraft({ ...roles });
        setOnboarding(updated);
      } else {
        // Server-side e-mailverificatie-gate (spec §1.8) — afgedwongen door de
        // bestaande S3-02-02-API zelf, hier uitsluitend afgevangen. Slaat
        // uitsluitend de rolkeuze op; er wordt hier geen company aangemaakt
        // (die ontstaat pas bij handleCompanyNext hieronder).
        const { onboarding: created } = await startOnboarding(roles);
        setOnboarding(created);
      }
      goToStep(1);
    } catch (err) {
      if (!onboarding && err instanceof PartnerOnboardingApiError && /e-mailadres/i.test(err.message)) {
        setVerificationGateError(true);
        setPhase({ name: "welcome" });
        return;
      }
      setError(err instanceof Error ? err.message : t("partnerSaveFailed", locale));
    } finally {
      setIsBusy(false);
    }
  }

  async function handleCompanyNext() {
    setError(null);
    setIsBusy(true);
    try {
      const { onboarding: updated } = await updateOnboardingDraft({
        company: {
          legal_name: company.legal_name,
          chamber_of_commerce_number: company.chamber_of_commerce_number,
          vat_number: company.vat_number || null,
          country_code: company.country_code,
          iban: company.iban,
        },
      });
      setOnboarding(updated);
      goToStep(2);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("partnerSaveFailed", locale));
    } finally {
      setIsBusy(false);
    }
  }

  function handleVerificationNext() {
    setError(null);
    goToStep(3);
  }

  const requiredDocumentsPresent =
    documents.identity_document &&
    documents.chamber_of_commerce_extract &&
    (!roles.is_producer_or_brand_owner || documents.production_proof) &&
    (!roles.is_distributor || documents.authorization_proof);

  async function handleDocumentsNext() {
    setError(null);
    if (!requiredDocumentsPresent) {
      setError(t("partnerDocumentsRequiredError", locale));
      return;
    }
    setIsBusy(true);
    try {
      const uploads: { type: string; file: File }[] = [];
      if (documents.identity_document) {
        uploads.push({ type: "identity_document", file: documents.identity_document });
      }
      if (documents.chamber_of_commerce_extract) {
        uploads.push({
          type: "chamber_of_commerce_extract",
          file: documents.chamber_of_commerce_extract,
        });
      }
      if (documents.production_proof) {
        uploads.push({ type: "production_proof", file: documents.production_proof });
      }
      if (documents.authorization_proof) {
        uploads.push({ type: "authorization_proof", file: documents.authorization_proof });
      }
      if (documents.additional_certifications) {
        uploads.push({
          type: "additional_certifications",
          file: documents.additional_certifications,
        });
      }
      for (const item of uploads) {
        await uploadOnboardingDocument(item.type, item.file);
      }
      goToStep(4);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("partnerUploadFailed", locale));
    } finally {
      setIsBusy(false);
    }
  }

  const isAddition = onboarding?.onboarding_status === "Aanvullende informatie vereist";

  async function handleSubmit() {
    setError(null);
    if (!isAddition && !acceptedTerms) {
      setError(t("partnerTermsRequiredError", locale));
      return;
    }
    setIsBusy(true);
    try {
      if (isAddition) {
        await submitOnboardingAddition();
      } else {
        await submitOnboarding(acceptedTerms);
      }
      router.push("/partner-onboarding/status");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("partnerSubmitFailed", locale));
    } finally {
      setIsBusy(false);
    }
  }

  if (phase.name === "loading") {
    return (
      <div className="border border-wf-400 bg-white px-6 py-16 text-center text-sm text-wf-600">
        {t("loading", locale)}
      </div>
    );
  }

  if (phase.name === "welcome") {
    return (
      <div className="border border-wf-400 bg-white px-6 py-9 text-center sm:px-10">
        <h1 className="mb-2 text-xl font-bold text-wf-900">
          {t("partnerWelcomeTitle", locale)}
        </h1>
        <p className="mb-6 text-[12.5px] text-wf-600">
          {t("partnerWelcomeSubtitle", locale)}
        </p>
        <Notice className="mb-5 text-left">
          {t("partnerWelcomeNeeds", locale)}
        </Notice>
        {verificationGateError && (
          <Notice variant="warning" className="mb-5 text-left">
            {t("partnerVerifyEmailGate", locale)}{" "}
            <button
              type="button"
              onClick={handleResendVerification}
              disabled={verificationResent}
              className="underline decoration-dotted"
            >
              {verificationResent
                ? t("partnerVerificationResent", locale)
                : t("partnerResendVerification", locale)}
            </button>
          </Notice>
        )}
        {error && (
          <Notice variant="warning" className="mb-5 text-left">
            {error}
          </Notice>
        )}
        <Button onClick={handleStartAanmelding} disabled={isBusy}>
          {isBusy ? t("authCreatingAccount", locale) : t("partnerStart", locale)}
        </Button>
      </div>
    );
  }

  const stepIndex = phase.step;

  return (
    <div className="border border-wf-400 bg-white">
      <Stepper steps={stepLabels(locale)} currentStep={stepIndex} />
      <div className="p-6 tablet:p-8">
        {error && (
          <Notice variant="warning" className="mb-5">
            {error}
          </Notice>
        )}

        {stepIndex === 0 && (
          <div>
            <h1 className="mb-1.5 text-lg font-bold text-wf-900">
              {t("partnerRoleQuestion", locale)}
            </h1>
            <p className="mb-5 text-xs text-wf-600">{t("partnerRoleHint", locale)}</p>
            <ChoiceCardGroup label={t("partnerSelectRoles", locale)} className="mb-6">
              {ROLE_OPTION_KEYS.map((option) => (
                <ChoiceCard
                  key={option.key}
                  title={t(option.titleKey, locale)}
                  description={t(option.descriptionKey, locale)}
                  selected={roles[option.key]}
                  onClick={() => toggleRole(option.key)}
                />
              ))}
            </ChoiceCardGroup>
            <div className="flex justify-end">
              <Button onClick={handleRolesNext} disabled={isBusy}>
                {isBusy ? t("authCreatingAccount", locale) : t("commonNext", locale)}
              </Button>
            </div>
          </div>
        )}

        {stepIndex === 1 && (
          <div>
            <h1 className="mb-5 text-lg font-bold text-wf-900">
              {t("partnerStepCompany", locale)}
            </h1>
            <Input
              label={t("partnerCompanyName", locale)}
              placeholder={t("partnerCompanyNamePlaceholder", locale)}
              value={company.legal_name}
              onChange={(e) => setCompany((c) => ({ ...c, legal_name: e.target.value }))}
              required
            />
            <div className="grid grid-cols-1 gap-3.5 tablet:grid-cols-2">
              <Input
                label={t("partnerLegalForm", locale)}
                placeholder={t("partnerLegalFormPlaceholder", locale)}
                value={company.legal_form}
                onChange={(e) => setCompany((c) => ({ ...c, legal_form: e.target.value }))}
              />
              <Input
                label={t("partnerChamberNumber", locale)}
                placeholder="12345678"
                value={company.chamber_of_commerce_number}
                onChange={(e) =>
                  setCompany((c) => ({ ...c, chamber_of_commerce_number: e.target.value }))
                }
                required
              />
            </div>
            <Input
              label={t("partnerCompanyAddress", locale)}
              placeholder={t("partnerCompanyAddressPlaceholder", locale)}
              value={company.company_address}
              onChange={(e) => setCompany((c) => ({ ...c, company_address: e.target.value }))}
            />
            <Input
              label={t("partnerCountryCode", locale)}
              placeholder={t("partnerCountryCodePlaceholder", locale)}
              maxLength={2}
              hint={t("partnerCountryCodeHint", locale)}
              value={company.country_code}
              onChange={(e) =>
                setCompany((c) => ({ ...c, country_code: e.target.value.toUpperCase() }))
              }
              required
            />
            <Input
              label={t("partnerVatNumber", locale)}
              placeholder={t("partnerVatPlaceholder", locale)}
              value={company.vat_number}
              onChange={(e) => setCompany((c) => ({ ...c, vat_number: e.target.value }))}
              required
            />
            <div className="grid grid-cols-1 gap-3.5 tablet:grid-cols-2">
              <Input
                label={t("partnerContactName", locale)}
                placeholder={t("authFullNamePlaceholder", locale)}
                value={company.contact_name}
                onChange={(e) => setCompany((c) => ({ ...c, contact_name: e.target.value }))}
              />
              <Input
                label={t("partnerContactPhone", locale)}
                placeholder={t("partnerContactPhonePlaceholder", locale)}
                value={company.contact_phone}
                onChange={(e) => setCompany((c) => ({ ...c, contact_phone: e.target.value }))}
              />
            </div>
            <Input
              label={t("partnerContactEmail", locale)}
              placeholder={t("partnerContactEmailPlaceholder", locale)}
              hint={t("partnerContactEmailHint", locale)}
              value={company.contact_email}
              onChange={(e) => setCompany((c) => ({ ...c, contact_email: e.target.value }))}
            />
            <div className="grid grid-cols-1 gap-3.5 tablet:grid-cols-2">
              <Input
                label={t("partnerIban", locale)}
                placeholder={t("partnerIbanPlaceholder", locale)}
                value={company.iban}
                onChange={(e) => setCompany((c) => ({ ...c, iban: e.target.value }))}
                required
              />
              <Input
                label={t("partnerAccountHolder", locale)}
                placeholder={t("partnerCompanyNamePlaceholder", locale)}
                hint={t("partnerAccountHolderHint", locale)}
                value={company.account_holder_name}
                onChange={(e) =>
                  setCompany((c) => ({ ...c, account_holder_name: e.target.value }))
                }
              />
            </div>
            <div className="mt-6 flex justify-between">
              <Button variant="ghost" onClick={() => goToStep(0)}>
                {t("commonPrevious", locale)}
              </Button>
              <Button onClick={handleCompanyNext} disabled={isBusy}>
                {isBusy ? t("authCreatingAccount", locale) : t("commonNext", locale)}
              </Button>
            </div>
          </div>
        )}

        {stepIndex === 2 && (
          <div>
            <h1 className="mb-1.5 text-lg font-bold text-wf-900">
              {t("partnerStepVerification", locale)}
            </h1>
            <p className="mb-4 text-xs font-semibold text-wf-700">
              {t("partnerIdentityCheck", locale)}
            </p>
            <div className="grid grid-cols-1 gap-3.5 tablet:grid-cols-2">
              <Input
                label={t("partnerRepName", locale)}
                placeholder={t("authFullNamePlaceholder", locale)}
                value={verification.representative_name}
                onChange={(e) =>
                  setVerification((v) => ({ ...v, representative_name: e.target.value }))
                }
              />
              <Input
                label={t("partnerRepRole", locale)}
                placeholder={t("partnerRepRolePlaceholder", locale)}
                value={verification.representative_role}
                onChange={(e) =>
                  setVerification((v) => ({ ...v, representative_role: e.target.value }))
                }
              />
            </div>

            {needsProductionVerification && (
              <>
                <p className="mb-4 mt-6 text-xs font-semibold text-wf-700">
                  {t("partnerEuProductionTitle", locale)}{" "}
                  <span className="font-normal text-wf-500">
                    {t("partnerEuProductionReason", locale)}
                  </span>
                </p>
                <div className="grid grid-cols-1 gap-3.5 tablet:grid-cols-2">
                  <Input
                    label={t("partnerProductionCountry", locale)}
                    placeholder={t("countryNL", locale)}
                    value={verification.production_country}
                    onChange={(e) =>
                      setVerification((v) => ({ ...v, production_country: e.target.value }))
                    }
                  />
                  <Input
                    label={t("partnerManufacturer", locale)}
                    placeholder={t("partnerManufacturerPlaceholder", locale)}
                    value={verification.manufacturer_name}
                    onChange={(e) =>
                      setVerification((v) => ({ ...v, manufacturer_name: e.target.value }))
                    }
                  />
                </div>
                <Input
                  label={t("partnerProductionLocations", locale)}
                  placeholder={t("partnerCompanyAddressPlaceholder", locale)}
                  hint={t("partnerProductionLocationsHint", locale)}
                  value={verification.production_locations}
                  onChange={(e) =>
                    setVerification((v) => ({ ...v, production_locations: e.target.value }))
                  }
                />
                <Input
                  label={t("partnerBrandOwnership", locale)}
                  placeholder={t("partnerBrandOwnershipPlaceholder", locale)}
                  value={verification.brand_ownership}
                  onChange={(e) =>
                    setVerification((v) => ({ ...v, brand_ownership: e.target.value }))
                  }
                />
                <Input
                  label={t("partnerManufacturerOwnership", locale)}
                  placeholder={t("partnerManufacturerOwnershipPlaceholder", locale)}
                  value={verification.manufacturer_ownership}
                  onChange={(e) =>
                    setVerification((v) => ({ ...v, manufacturer_ownership: e.target.value }))
                  }
                />
                {roles.is_distributor && (
                  <Input
                    label={t("partnerRepresentedBrands", locale)}
                    placeholder={t("partnerRepresentedBrandsPlaceholder", locale)}
                    hint={t("partnerRepresentedBrandsHint", locale)}
                    value={verification.represented_brands}
                    onChange={(e) =>
                      setVerification((v) => ({ ...v, represented_brands: e.target.value }))
                    }
                  />
                )}
              </>
            )}

            <div className="mt-6 flex justify-between">
              <Button variant="ghost" onClick={() => goToStep(1)}>
                {t("commonPrevious", locale)}
              </Button>
              <Button onClick={handleVerificationNext}>{t("commonNext", locale)}</Button>
            </div>
          </div>
        )}

        {stepIndex === 3 && (
          <div>
            <h1 className="mb-1.5 text-lg font-bold text-wf-900">
              {t("partnerUploadDocuments", locale)}
            </h1>
            <p className="mb-5 text-xs text-wf-600">{t("partnerUploadDocumentsHint", locale)}</p>

            <FileUpload
              label={t("partnerDocIdentity", locale)}
              requirementLabel={t("partnerReqAllRoles", locale)}
              value={documents.identity_document}
              onChange={(file) => setDocuments((d) => ({ ...d, identity_document: file }))}
            />
            <FileUpload
              label={t("partnerDocChamber", locale)}
              requirementLabel={t("partnerReqAllRoles", locale)}
              value={documents.chamber_of_commerce_extract}
              onChange={(file) =>
                setDocuments((d) => ({ ...d, chamber_of_commerce_extract: file }))
              }
            />
            {roles.is_producer_or_brand_owner && (
              <FileUpload
                label={t("partnerDocProduction", locale)}
                requirementLabel={t("partnerReqProducer", locale)}
                value={documents.production_proof}
                onChange={(file) => setDocuments((d) => ({ ...d, production_proof: file }))}
              />
            )}
            {roles.is_distributor && (
              <FileUpload
                label={t("partnerDocAuthorization", locale)}
                requirementLabel={t("partnerReqDistributor", locale)}
                value={documents.authorization_proof}
                onChange={(file) => setDocuments((d) => ({ ...d, authorization_proof: file }))}
              />
            )}
            <FileUpload
              label={t("partnerDocCertifications", locale)}
              requirementLabel={t("partnerReqOptional", locale)}
              value={documents.additional_certifications}
              onChange={(file) =>
                setDocuments((d) => ({ ...d, additional_certifications: file }))
              }
            />

            <div className="mt-6 flex justify-between">
              <Button variant="ghost" onClick={() => goToStep(2)}>
                {t("commonPrevious", locale)}
              </Button>
              <Button onClick={handleDocumentsNext} disabled={isBusy}>
                {isBusy ? t("authCreatingAccount", locale) : t("commonNext", locale)}
              </Button>
            </div>
          </div>
        )}

        {stepIndex === 4 && (
          <div>
            <h1 className="mb-3 text-lg font-bold text-wf-900">
              {t("partnerReviewTitle", locale)}
            </h1>

            <ReviewBlock title={t("partnerReviewRoles", locale)} onEdit={() => goToStep(0)}>
              <p>
                {ROLE_OPTION_KEYS.filter((option) => roles[option.key])
                  .map((option) => t(option.titleKey, locale))
                  .join(", ") || t("partnerReviewNoRole", locale)}
              </p>
            </ReviewBlock>

            <ReviewBlock title={t("partnerStepCompany", locale)} onEdit={() => goToStep(1)}>
              <p>
                {tFormat("partnerReviewCompanyLine", locale, {
                  name: company.legal_name || "—",
                  chamber: company.chamber_of_commerce_number || "—",
                  vat: company.vat_number || "—",
                })}
              </p>
              <p>
                {tFormat("partnerReviewIbanLine", locale, {
                  iban: company.iban || "—",
                })}
              </p>
            </ReviewBlock>

            <ReviewBlock title={t("partnerStepVerification", locale)} onEdit={() => goToStep(2)}>
              <p>
                {needsProductionVerification
                  ? tFormat("partnerReviewProduction", locale, {
                      country: verification.production_country || "—",
                      manufacturer: verification.manufacturer_name || "—",
                    })
                  : t("partnerReviewRetailerOnly", locale)}
              </p>
            </ReviewBlock>

            <ReviewBlock title={t("partnerStepDocuments", locale)} onEdit={() => goToStep(3)}>
              <p>
                {tFormat("partnerReviewDocumentsCount", locale, {
                  count: Object.values(documents).filter(Boolean).length,
                })}
              </p>
            </ReviewBlock>

            {!isAddition && (
              <div className="my-5">
                <Checkbox
                  label={t("partnerAcceptPartnerTerms", locale)}
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  required
                />
              </div>
            )}

            <div className="mt-6 flex justify-between">
              <Button variant="ghost" onClick={() => goToStep(3)}>
                {t("commonPrevious", locale)}
              </Button>
              <Button onClick={handleSubmit} disabled={isBusy}>
                {isBusy
                  ? t("authCreatingAccount", locale)
                  : isAddition
                    ? t("partnerSubmitAddition", locale)
                    : t("partnerSubmit", locale)}
              </Button>
            </div>
          </div>
        )}

        {onboarding && (
          <p className="mt-6 text-center text-[10.5px] text-wf-500">
            {t("partnerCurrentStatus", locale)}{" "}
            <Badge variant="outline">
              {statusLabel(onboarding.onboarding_status, locale)}
            </Badge>
          </p>
        )}
      </div>
    </div>
  );
}
