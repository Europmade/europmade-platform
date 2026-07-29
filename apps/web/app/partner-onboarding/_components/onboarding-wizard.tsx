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

/**
 * Partner Onboarding — schermen #26-28 (`04-partner-onboarding-*.html`,
 * v1.1 BEVROREN). Statusverloop/validatie/e-mailverificatie-gate lopen via
 * de bestaande API uit S3-02-02 — deze component bevat geen eigen
 * businesslogica, uitsluitend formulierstatus en API-aanroepen.
 */

type RoleKey = "is_retailer" | "is_producer_or_brand_owner" | "is_distributor";

const ROLE_OPTIONS: { key: RoleKey; title: string; description: string }[] = [
  {
    key: "is_retailer",
    title: "Retailer",
    description: "Ik verkoop producten, van eigen of andermans merk",
  },
  {
    key: "is_producer_or_brand_owner",
    title: "Producent / Merkhouder",
    description: "Ik produceer en/of bezit een eigen merk",
  },
  {
    key: "is_distributor",
    title: "Distributeur",
    description: "Ik verkoop namens een ander merk, met autorisatie",
  },
];

const STEP_LABELS = [
  "Partner kiezen",
  "Bedrijfsgegevens",
  "Verificatie",
  "Documenten",
  "Samenvatting",
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

export function OnboardingWizard() {
  const router = useRouter();

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
        router.replace("/login?redirect=/partner-onboarding");
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
      setError("Kies ten minste één rol (Retailer, Producent/Merkhouder en/of Distributeur).");
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
      setError(err instanceof Error ? err.message : "Opslaan is niet gelukt.");
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
      setError(err instanceof Error ? err.message : "Opslaan is niet gelukt.");
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
      setError("Upload alle voor je gekozen rol(len) verplichte documenten voordat je verdergaat.");
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
      setError(
        err instanceof Error ? err.message : "Documentupload is niet gelukt.",
      );
    } finally {
      setIsBusy(false);
    }
  }

  const isAddition = onboarding?.onboarding_status === "Aanvullende informatie vereist";

  async function handleSubmit() {
    setError(null);
    if (!isAddition && !acceptedTerms) {
      setError("Je moet akkoord gaan met de Partnervoorwaarden en het verwerkersaddendum.");
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
      setError(err instanceof Error ? err.message : "Indienen is niet gelukt.");
    } finally {
      setIsBusy(false);
    }
  }

  if (phase.name === "loading") {
    return <div className="border border-wf-400 bg-white px-6 py-16 text-center text-sm text-wf-600">Laden…</div>;
  }

  if (phase.name === "welcome") {
    return (
      <div className="border border-wf-400 bg-white px-6 py-9 text-center sm:px-10">
        <h1 className="mb-2 text-xl font-bold text-wf-900">Word partner op EuropMade</h1>
        <p className="mb-6 text-[12.5px] text-wf-600">
          Verkoop je producten aan miljoenen Europese consumenten — meestal binnen één werkdag live.
        </p>
        <Notice className="mb-5 text-left">
          Je hebt nodig: bedrijfsgegevens, een geldig identiteitsbewijs, een KvK-uittreksel, en — als je
          zelf producten produceert of een merk vertegenwoordigt — bewijs van Europese productie.
        </Notice>
        {verificationGateError && (
          <Notice variant="warning" className="mb-5 text-left">
            Bevestig eerst je e-mailadres om partner te worden.{" "}
            <button
              type="button"
              onClick={handleResendVerification}
              disabled={verificationResent}
              className="underline decoration-dotted"
            >
              {verificationResent ? "Verificatiemail opnieuw verstuurd" : "Verstuur de verificatiemail opnieuw"}
            </button>
          </Notice>
        )}
        {error && (
          <Notice variant="warning" className="mb-5 text-left">
            {error}
          </Notice>
        )}
        <Button onClick={handleStartAanmelding} disabled={isBusy}>
          {isBusy ? "Bezig…" : "Start aanmelding"}
        </Button>
      </div>
    );
  }

  const stepIndex = phase.step;

  return (
    <div className="border border-wf-400 bg-white">
      <Stepper steps={STEP_LABELS} currentStep={stepIndex} />
      <div className="p-6 tablet:p-8">
        {error && (
          <Notice variant="warning" className="mb-5">
            {error}
          </Notice>
        )}

        {stepIndex === 0 && (
          <div>
            <h1 className="mb-1.5 text-lg font-bold text-wf-900">Hoe wil je verkopen op EuropMade?</h1>
            <p className="mb-5 text-xs text-wf-600">
              Kies één of meerdere rollen — je kunt bijvoorbeeld tegelijk Producent én Retailer zijn.
            </p>
            <ChoiceCardGroup label="Rol(len) selecteren" className="mb-6">
              {ROLE_OPTIONS.map((option) => (
                <ChoiceCard
                  key={option.key}
                  title={option.title}
                  description={option.description}
                  selected={roles[option.key]}
                  onClick={() => toggleRole(option.key)}
                />
              ))}
            </ChoiceCardGroup>
            <div className="flex justify-end">
              <Button onClick={handleRolesNext} disabled={isBusy}>
                {isBusy ? "Bezig…" : "Volgende"}
              </Button>
            </div>
          </div>
        )}

        {stepIndex === 1 && (
          <div>
            <h1 className="mb-5 text-lg font-bold text-wf-900">Bedrijfsgegevens</h1>
            <Input
              label="Bedrijfsnaam"
              placeholder="Merknaam BV"
              value={company.legal_name}
              onChange={(e) => setCompany((c) => ({ ...c, legal_name: e.target.value }))}
              required
            />
            <div className="grid grid-cols-1 gap-3.5 tablet:grid-cols-2">
              <Input
                label="Rechtsvorm"
                placeholder="BV"
                value={company.legal_form}
                onChange={(e) => setCompany((c) => ({ ...c, legal_form: e.target.value }))}
              />
              <Input
                label="KvK-/bedrijfsregistratienummer"
                placeholder="12345678"
                value={company.chamber_of_commerce_number}
                onChange={(e) =>
                  setCompany((c) => ({ ...c, chamber_of_commerce_number: e.target.value }))
                }
                required
              />
            </div>
            <Input
              label="Bedrijfsadres"
              placeholder="Straat, huisnummer, postcode, plaats"
              value={company.company_address}
              onChange={(e) => setCompany((c) => ({ ...c, company_address: e.target.value }))}
            />
            <Input
              label="Land (ISO-landcode)"
              placeholder="bv. NL, DE, FR"
              maxLength={2}
              hint="Twee letters, conform ISO 3166-1 — bepaalt het vestigingsland van je bedrijf."
              value={company.country_code}
              onChange={(e) =>
                setCompany((c) => ({ ...c, country_code: e.target.value.toUpperCase() }))
              }
              required
            />
            <Input
              label="BTW-nummer"
              placeholder="NL123456789B01"
              value={company.vat_number}
              onChange={(e) => setCompany((c) => ({ ...c, vat_number: e.target.value }))}
              required
            />
            <div className="grid grid-cols-1 gap-3.5 tablet:grid-cols-2">
              <Input
                label="Contactpersoon — naam"
                placeholder="Voor- en achternaam"
                value={company.contact_name}
                onChange={(e) => setCompany((c) => ({ ...c, contact_name: e.target.value }))}
              />
              <Input
                label="Contactpersoon — telefoonnummer"
                placeholder="+31 6 12345678"
                value={company.contact_phone}
                onChange={(e) => setCompany((c) => ({ ...c, contact_phone: e.target.value }))}
              />
            </div>
            <Input
              label="Contactpersoon — e-mailadres"
              placeholder="contact@merknaam.nl"
              hint="Mag afwijken van je inlog-e-mailadres."
              value={company.contact_email}
              onChange={(e) => setCompany((c) => ({ ...c, contact_email: e.target.value }))}
            />
            <div className="grid grid-cols-1 gap-3.5 tablet:grid-cols-2">
              <Input
                label="IBAN (uitbetalingsgegevens)"
                placeholder="NL91 ABNA 0417 1643 00"
                value={company.iban}
                onChange={(e) => setCompany((c) => ({ ...c, iban: e.target.value }))}
                required
              />
              <Input
                label="Rekeninghouder"
                placeholder="Merknaam BV"
                hint="Moet overeenkomen met de bedrijfsnaam."
                value={company.account_holder_name}
                onChange={(e) =>
                  setCompany((c) => ({ ...c, account_holder_name: e.target.value }))
                }
              />
            </div>
            <div className="mt-6 flex justify-between">
              <Button variant="ghost" onClick={() => goToStep(0)}>
                ← Terug
              </Button>
              <Button onClick={handleCompanyNext} disabled={isBusy}>
                {isBusy ? "Bezig…" : "Volgende"}
              </Button>
            </div>
          </div>
        )}

        {stepIndex === 2 && (
          <div>
            <h1 className="mb-1.5 text-lg font-bold text-wf-900">Verificatie</h1>
            <p className="mb-4 text-xs font-semibold text-wf-700">Identiteitscontrole</p>
            <div className="grid grid-cols-1 gap-3.5 tablet:grid-cols-2">
              <Input
                label="Naam bevoegde vertegenwoordiger"
                placeholder="Voor- en achternaam"
                value={verification.representative_name}
                onChange={(e) =>
                  setVerification((v) => ({ ...v, representative_name: e.target.value }))
                }
              />
              <Input
                label="Functie"
                placeholder="Directeur / Eigenaar"
                value={verification.representative_role}
                onChange={(e) =>
                  setVerification((v) => ({ ...v, representative_role: e.target.value }))
                }
              />
            </div>

            {needsProductionVerification && (
              <>
                <p className="mb-4 mt-6 text-xs font-semibold text-wf-700">
                  Europese productieverificatie{" "}
                  <span className="font-normal text-wf-500">
                    — getoond omdat Producent/Merkhouder en/of Distributeur is gekozen
                  </span>
                </p>
                <div className="grid grid-cols-1 gap-3.5 tablet:grid-cols-2">
                  <Input
                    label="Land van productie (hoofdlocatie)"
                    placeholder="Nederland"
                    value={verification.production_country}
                    onChange={(e) =>
                      setVerification((v) => ({ ...v, production_country: e.target.value }))
                    }
                  />
                  <Input
                    label="Fabrikant"
                    placeholder="Merknaam BV — eigen fabriek"
                    value={verification.manufacturer_name}
                    onChange={(e) =>
                      setVerification((v) => ({ ...v, manufacturer_name: e.target.value }))
                    }
                  />
                </div>
                <Input
                  label="Productielocatie(s)"
                  placeholder="Straat, huisnummer, postcode, plaats"
                  hint="Minimaal één verplicht, meerdere locaties toegestaan."
                  value={verification.production_locations}
                  onChange={(e) =>
                    setVerification((v) => ({ ...v, production_locations: e.target.value }))
                  }
                />
                <Input
                  label="Eigendom van het merk"
                  placeholder="Eigen merk"
                  value={verification.brand_ownership}
                  onChange={(e) =>
                    setVerification((v) => ({ ...v, brand_ownership: e.target.value }))
                  }
                />
                <Input
                  label="Eigendom van de fabrikant (optioneel)"
                  placeholder="Eigen faciliteit / externe contractfabrikant"
                  value={verification.manufacturer_ownership}
                  onChange={(e) =>
                    setVerification((v) => ({ ...v, manufacturer_ownership: e.target.value }))
                  }
                />
                {roles.is_distributor && (
                  <Input
                    label="Vertegenwoordigde merk(en)"
                    placeholder="Naam van het/de merk(en) waarvoor je verkoopt"
                    hint="Verplicht voor Distributeur — samen met het autorisatiebewijs bij Documenten."
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
                ← Terug
              </Button>
              <Button onClick={handleVerificationNext}>Volgende</Button>
            </div>
          </div>
        )}

        {stepIndex === 3 && (
          <div>
            <h1 className="mb-1.5 text-lg font-bold text-wf-900">Upload documenten</h1>
            <p className="mb-5 text-xs text-wf-600">
              Op basis van je gekozen rol(len) is het volgende nodig:
            </p>

            <FileUpload
              label="Identiteitsbewijs (bevoegde vertegenwoordiger)"
              requirementLabel="Verplicht — alle rollen"
              value={documents.identity_document}
              onChange={(file) => setDocuments((d) => ({ ...d, identity_document: file }))}
            />
            <FileUpload
              label="KvK-/bedrijfsregistratie-uittreksel"
              requirementLabel="Verplicht — alle rollen"
              value={documents.chamber_of_commerce_extract}
              onChange={(file) =>
                setDocuments((d) => ({ ...d, chamber_of_commerce_extract: file }))
              }
            />
            {roles.is_producer_or_brand_owner && (
              <FileUpload
                label="Productiebewijsstuk"
                requirementLabel="Verplicht — Producent/Merkhouder"
                value={documents.production_proof}
                onChange={(file) => setDocuments((d) => ({ ...d, production_proof: file }))}
              />
            )}
            {roles.is_distributor && (
              <FileUpload
                label="Autorisatiebewijs (distributieovereenkomst)"
                requirementLabel="Verplicht — Distributeur"
                value={documents.authorization_proof}
                onChange={(file) => setDocuments((d) => ({ ...d, authorization_proof: file }))}
              />
            )}
            <FileUpload
              label="Aanvullende certificeringen (optioneel)"
              requirementLabel="Optioneel — alle rollen"
              value={documents.additional_certifications}
              onChange={(file) =>
                setDocuments((d) => ({ ...d, additional_certifications: file }))
              }
            />

            <div className="mt-6 flex justify-between">
              <Button variant="ghost" onClick={() => goToStep(2)}>
                ← Terug
              </Button>
              <Button onClick={handleDocumentsNext} disabled={isBusy}>
                {isBusy ? "Bezig…" : "Volgende"}
              </Button>
            </div>
          </div>
        )}

        {stepIndex === 4 && (
          <div>
            <h1 className="mb-3 text-lg font-bold text-wf-900">Controleer je aanvraag</h1>

            <ReviewBlock title="Gekozen rollen" onEdit={() => goToStep(0)}>
              <p>
                {ROLE_OPTIONS.filter((option) => roles[option.key])
                  .map((option) => option.title)
                  .join(", ") || "Geen rol gekozen"}
              </p>
            </ReviewBlock>

            <ReviewBlock title="Bedrijfsgegevens" onEdit={() => goToStep(1)}>
              <p>
                {company.legal_name || "—"} · KvK {company.chamber_of_commerce_number || "—"} ·{" "}
                {company.vat_number || "—"}
              </p>
              <p>IBAN {company.iban || "—"}</p>
            </ReviewBlock>

            <ReviewBlock title="Verificatie" onEdit={() => goToStep(2)}>
              <p>
                {needsProductionVerification
                  ? `Productie: ${verification.production_country || "—"} · ${verification.manufacturer_name || "—"}`
                  : "Niet van toepassing (uitsluitend Retailer gekozen)"}
              </p>
            </ReviewBlock>

            <ReviewBlock title="Documenten" onEdit={() => goToStep(3)}>
              <p>
                {Object.values(documents).filter(Boolean).length} document(en) geüpload
              </p>
            </ReviewBlock>

            {!isAddition && (
              <div className="my-5">
                <Checkbox
                  label="Ik ga akkoord met de Partnervoorwaarden en het verwerkersaddendum"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  required
                />
              </div>
            )}

            <div className="mt-6 flex justify-between">
              <Button variant="ghost" onClick={() => goToStep(3)}>
                ← Terug
              </Button>
              <Button onClick={handleSubmit} disabled={isBusy}>
                {isBusy ? "Bezig…" : isAddition ? "Aanvulling versturen" : "Aanvraag indienen"}
              </Button>
            </div>
          </div>
        )}

        {onboarding && (
          <p className="mt-6 text-center text-[10.5px] text-wf-500">
            Huidige status: <Badge variant="outline">{onboarding.onboarding_status}</Badge>
          </p>
        )}
      </div>
    </div>
  );
}
