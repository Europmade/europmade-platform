"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Badge, Button, Notice } from "@europmade/ui";
import {
  approvePartner,
  displayStatus,
  formatRoles,
  getPartner,
  PartnerAdminApiError,
  type PartnerDetail,
} from "../../../../lib/partner-admin-api";

export default function PartnerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [partner, setPartner] = useState<PartnerDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getPartner(id)
      .then(({ partner: p }) => {
        if (!cancelled) setPartner(p);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof PartnerAdminApiError
              ? err.message
              : "Partner laden is niet gelukt.",
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function handleApprove() {
    setBusy(true);
    setError(null);
    try {
      await approvePartner(id);
      router.push(`/partners/${id}/approved`);
    } catch (err) {
      setError(
        err instanceof PartnerAdminApiError
          ? err.message
          : "Goedkeuren is niet gelukt.",
      );
      setBusy(false);
    }
  }

  if (!partner && !error) {
    return <p className="text-sm text-wf-600">Laden…</p>;
  }

  if (!partner) {
    return (
      <Notice variant="warning">{error ?? "Partner niet gevonden."}</Notice>
    );
  }

  const name = partner.company?.legal_name ?? "Partner";
  const inReview = partner.onboarding_status === "In beoordeling";
  const docs = partner.documents;

  return (
    <div>
      <p className="mb-4 text-[11.5px] text-wf-500">
        Partnerbeheer &gt;{" "}
        <b className="font-semibold text-wf-800">{name}</b>
      </p>
      <h1 className="mb-1.5 text-lg font-bold text-wf-900">Partnerdetail</h1>
      <p className="mb-5 text-xs text-wf-600">
        {inReview
          ? "Beoordeling van een partneraanvraag."
          : "Gegevens van deze partner."}
      </p>

      {error && (
        <Notice variant="warning" className="mb-4">
          {error}
        </Notice>
      )}

      <div className="mb-5 grid grid-cols-1 gap-5 tablet:grid-cols-[1.7fr_1fr]">
        <div>
          <div className="mb-4 rounded-lg border border-wf-200 p-5">
            <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-wf-500">
              Bedrijfsgegevens
            </h3>
            <DetailRow label="Bedrijfsnaam" value={name} />
            <DetailRow
              label="KvK-nummer"
              value={partner.company?.chamber_of_commerce_number ?? "—"}
            />
            <DetailRow
              label="BTW-nummer"
              value={partner.company?.vat_number ?? "—"}
            />
            <DetailRow
              label="Vestigingsland"
              value={partner.company?.country_code ?? "—"}
            />
            <DetailRow label="Rol(len)" value={formatRoles(partner)} />
            <DetailRow
              label="Status"
              value={
                <Badge
                  variant={
                    displayStatus(partner) === "Actief" ? "solid" : "outline"
                  }
                >
                  {displayStatus(partner)}
                </Badge>
              }
            />
            {partner.review_note && (
              <DetailRow label="Reviewnotitie" value={partner.review_note} />
            )}
          </div>

          <div className="rounded-lg border border-wf-200 p-5">
            <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-wf-500">
              Bewijsstukken
            </h3>
            <DocRow
              label="Identiteitsbewijs"
              present={!!docs.identity_document_file_id}
            />
            <DocRow
              label="KvK-uittreksel"
              present={!!docs.chamber_of_commerce_extract_file_id}
            />
            <DocRow
              label="Productiebewijs"
              present={!!docs.production_proof_file_id}
            />
            <DocRow
              label="Autorisatiebewijs"
              present={!!docs.authorization_proof_file_id}
            />
            <DocRow
              label="Aanvullende certificeringen"
              present={!!docs.additional_certifications_file_id}
            />
          </div>
        </div>

        <div className="rounded-md border border-dashed border-wf-500 p-4 text-[11.5px] leading-relaxed text-wf-700">
          <p className="mb-1.5">
            {docs.identity_document_file_id &&
            docs.chamber_of_commerce_extract_file_id
              ? "✓ Verplichte basisdocumenten aanwezig"
              : "⚠ Nog niet alle verplichte basisdocumenten gekoppeld"}
          </p>
          <p>
            Status: <strong>{partner.onboarding_status}</strong>
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2.5 border-t border-wf-300 bg-wf-100 px-0 py-4">
        <div className="flex flex-wrap gap-2.5">
          {inReview && (
            <Button
              variant="destructive"
              onClick={() => router.push(`/partners/${id}/reject`)}
            >
              Afwijzen
            </Button>
          )}
        </div>
        <div className="flex flex-wrap gap-2.5">
          <Button variant="secondary" onClick={() => router.push("/partners")}>
            Terug
          </Button>
          {inReview && (
            <>
              <Button
                variant="secondary"
                onClick={() => router.push(`/partners/${id}/request-info`)}
              >
                Aanvullende info opvragen
              </Button>
              <Button onClick={handleApprove} disabled={busy}>
                {busy ? "Bezig…" : "Goedkeuren"}
              </Button>
            </>
          )}
        </div>
      </div>

      <p className="mt-4 text-center text-[11px]">
        <Link href="/partners" className="text-wf-700 underline">
          Naar overzicht
        </Link>
      </p>
    </div>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex justify-between gap-3 py-1.5 text-[12.5px] text-wf-800">
      <span className="text-wf-600">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}

function DocRow({ label, present }: { label: string; present: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 text-[12.5px]">
      <span className="text-wf-800">{label}</span>
      <span className="text-[11px] text-wf-600">
        {present ? "Aanwezig" : "Ontbreekt"}
      </span>
    </div>
  );
}
