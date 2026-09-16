"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Badge, Button, Notice } from "@europmade/ui";
import {
  listComplianceEvidence,
  type ComplianceEvidenceRow,
} from "../../../../lib/compliance-admin-api";
import {
  approvePartner,
  displayStatus,
  formatRoles,
  getPartner,
  listSellerProducts,
  PartnerAdminApiError,
  type PartnerDetail,
  type SellerProductRow,
} from "../../../../lib/partner-admin-api";
import {
  displayOnboardingStatus,
  DOCUMENT_LABELS,
  evidenceStatusLabel,
  onboardingBadgeVariant,
} from "../../../../lib/seller-status";

type ProductFilter = "all" | "pending" | "approved" | "rejected";

export default function PartnerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [partner, setPartner] = useState<PartnerDetail | null>(null);
  const [products, setProducts] = useState<SellerProductRow[]>([]);
  const [evidence, setEvidence] = useState<ComplianceEvidenceRow[]>([]);
  const [productFilter, setProductFilter] = useState<ProductFilter>("all");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmApprove, setConfirmApprove] = useState(false);

  const reload = useCallback(async () => {
    const [{ partner: p }, prodRes, evAll, evPending] = await Promise.all([
      getPartner(id),
      listSellerProducts(id).catch(() => ({ products: [], count: 0 })),
      listComplianceEvidence("all", id).catch(() => ({ evidence: [], count: 0 })),
      listComplianceEvidence("pending", id).catch(() => ({
        evidence: [],
        count: 0,
      })),
    ]);
    setPartner(p);
    setProducts(prodRes.products);
    const merged = [...evPending.evidence]
    for (const row of evAll.evidence) {
      if (!merged.some((m) => m.id === row.id)) merged.push(row)
    }
    setEvidence(merged)
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    reload()
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof PartnerAdminApiError
              ? err.message
              : "Seller laden is niet gelukt.",
          );
        }
      })
      .then(() => {
        if (!cancelled) setError(null);
      });
    return () => {
      cancelled = true;
    };
  }, [reload]);

  async function handleApprove() {
    if (!partner) return;
    setBusy(true);
    setError(null);
    try {
      await approvePartner(id);
      await reload();
      setConfirmApprove(false);
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
      <Notice variant="warning">{error ?? "Seller niet gevonden."}</Notice>
    );
  }

  const name = partner.company?.legal_name ?? "Seller";
  const inReview = partner.onboarding_status === "In beoordeling";
  const docs = partner.documents;
  const contactName = [partner.contact?.first_name, partner.contact?.last_name]
    .filter(Boolean)
    .join(" ");

  const filteredProducts = products.filter((p) => {
    const ps = p.publication_status ?? "";
    if (productFilter === "pending") return ps === "In review";
    if (productFilter === "approved")
      return ps === "Goedgekeurd" || ps === "Gepubliceerd";
    if (productFilter === "rejected")
      return ps === "Gearchiveerd" || ps === "Verwijderd";
    return true;
  });

  return (
    <div>
      <p className="mb-4 text-[11.5px] text-wf-500">
        Sellers &gt;{" "}
        <Link href="/partners" className="text-wf-700 underline">
          Seller Management
        </Link>{" "}
        &gt; <b className="font-semibold text-wf-800">{name}</b>
      </p>

      <div className="mb-5 rounded-lg border border-wf-300 bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-lg font-bold text-wf-900">{name}</h1>
            <p className="mt-1 font-mono text-[11px] text-wf-500">{partner.id}</p>
            <p className="mt-1 text-xs text-wf-600">
              {partner.company?.country_code ?? "—"} ·{" "}
              {formatRoles(partner)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <StatusPill
              label="Status"
              value={displayOnboardingStatus(partner.onboarding_status)}
              variant={onboardingBadgeVariant(partner.onboarding_status)}
            />
            <StatusPill
              label="Verificatie"
              value={partner.verification_status ?? "—"}
            />
            <StatusPill
              label="Made in Europe"
              value={partner.made_in_europe_status ?? "—"}
            />
          </div>
        </div>
      </div>

      {error && (
        <Notice variant="warning" className="mb-4">
          {error}
        </Notice>
      )}

      {confirmApprove && (
        <Notice variant="warning" className="mb-4">
          <p className="mb-2 font-semibold">Seller goedkeuren?</p>
          <p className="mb-3 text-xs">
            <strong>{name}</strong> ({partner.id}) — huidige status:{" "}
            {partner.onboarding_status}
          </p>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => void handleApprove()} disabled={busy}>
              {busy ? "Bezig…" : "Bevestig goedkeuring"}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setConfirmApprove(false)}
            >
              Annuleren
            </Button>
          </div>
        </Notice>
      )}

      <div className="grid grid-cols-1 gap-5 tablet:grid-cols-[1.7fr_1fr]">
        <div className="space-y-5">
          <Section title="A. Bedrijfsgegevens">
            <DetailRow label="Bedrijfsnaam" value={name} />
            <DetailRow label="Juridische naam" value={name} />
            <DetailRow
              label="KvK / registratienummer"
              value={partner.company?.chamber_of_commerce_number ?? "—"}
            />
            <DetailRow
              label="BTW-nummer"
              value={partner.company?.vat_number ?? "—"}
            />
            <DetailRow
              label="Land"
              value={partner.company?.country_code ?? "—"}
            />
            <DetailRow label="IBAN" value={partner.company?.iban ?? "—"} />
            <DetailRow label="Contactpersoon" value={contactName || "—"} />
            <DetailRow
              label="E-mail"
              value={partner.contact?.email ?? "—"}
            />
            <DetailRow label="Rol(len)" value={formatRoles(partner)} />
          </Section>

          <Section title="B. Seller status">
            <DetailRow
              label="Onboarding status"
              value={
                <Badge variant="outline">{partner.onboarding_status}</Badge>
              }
            />
            <DetailRow
              label="Weergavestatus"
              value={displayStatus(partner)}
            />
            <DetailRow
              label="Bedrijfsverificatie"
              value={partner.verification_status ?? "—"}
            />
            <DetailRow
              label="Made in Europe (Laag 1)"
              value={partner.made_in_europe_status ?? "—"}
            />
            <DetailRow
              label="Goedgekeurd op"
              value={
                partner.approved_at
                  ? new Date(partner.approved_at).toLocaleString("nl-NL")
                  : "—"
              }
            />
            {partner.review_note && (
              <DetailRow label="Reviewnotitie" value={partner.review_note} />
            )}
            {partner.product_summary && (
              <>
                <DetailRow
                  label="Producten totaal"
                  value={String(partner.product_summary.total)}
                />
                <DetailRow
                  label="Producten in review"
                  value={String(partner.product_summary.pending_approval)}
                />
                <DetailRow
                  label="Open compliance-bewijs"
                  value={String(partner.product_summary.pending_evidence)}
                />
              </>
            )}
          </Section>

          {(partner.manufacturers?.length ?? 0) > 0 && (
            <Section title="Made in Europe — fabrikanten">
              {partner.manufacturers!.map((m) => (
                <div
                  key={m.id}
                  className="mb-3 border-b border-wf-100 pb-3 last:mb-0 last:border-0"
                >
                  <DetailRow label="Producent" value={m.name} />
                  <DetailRow
                    label="Land productie"
                    value={m.country_code ?? "—"}
                  />
                  <DetailRow label="Plaats" value={m.city ?? "—"} />
                  <DetailRow
                    label="Contact"
                    value={m.contact_email ?? "—"}
                  />
                </div>
              ))}
            </Section>
          )}

          <Section title="C. Documenten & bewijs (onboarding)">
            {Object.entries(DOCUMENT_LABELS).map(([key, label]) => {
              const fileId =
                docs[key as keyof typeof docs] as string | null | undefined;
              return (
                <DocRow key={key} label={label} fileId={fileId ?? null} />
              );
            })}
            {evidence.length > 0 && (
              <div className="mt-4 border-t border-wf-200 pt-4">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-wf-500">
                  Product compliance-bewijs
                </p>
                {evidence.map((row) => (
                  <div
                    key={row.id}
                    className="mb-3 border-b border-wf-100 pb-3 last:mb-0 last:border-0"
                  >
                    <DetailRow
                      label="Product"
                      value={row.product_title ?? row.product_id}
                    />
                    <DetailRow label="Type" value={row.document_type} />
                    <DetailRow
                      label="Status"
                      value={evidenceStatusLabel(row.verification_status)}
                    />
                    <DetailRow
                      label="Datum"
                      value={
                        row.created_at
                          ? new Date(row.created_at).toLocaleDateString("nl-NL")
                          : "—"
                      }
                    />
                    {row.verification_notes && (
                      <DetailRow label="Opmerking" value={row.verification_notes} />
                    )}
                    {row.file_name && (
                      <DetailRow label="Bestand" value={row.file_name} />
                    )}
                  </div>
                ))}
              </div>
            )}
            {evidence.length === 0 && (
              <p className="mt-2 text-[11px] text-wf-500">
                Geen product compliance-bewijs voor deze seller.
              </p>
            )}
          </Section>

          <Section title="D. Producten">
            <div className="mb-3 flex flex-wrap gap-2">
              {(
                [
                  ["all", "Alle"],
                  ["pending", "Pending"],
                  ["approved", "Goedgekeurd"],
                  ["rejected", "Afgewezen"],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setProductFilter(key)}
                  className={`rounded px-2.5 py-1 text-[11px] ${
                    productFilter === key
                      ? "bg-wf-900 text-white"
                      : "border border-wf-300 text-wf-700"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            {filteredProducts.length === 0 ? (
              <p className="text-xs text-wf-600">Geen producten in deze filter.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr>
                      {[
                        "Product",
                        "EAN/SKU",
                        "Status",
                        "Approval",
                        "MiE",
                        "Compliance",
                        "",
                      ].map((h) => (
                        <th
                          key={h || "link"}
                          className="border-b border-wf-300 px-2 py-2 text-left text-[10px] uppercase text-wf-500"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.map((p) => (
                      <tr key={p.id} className="hover:bg-wf-50">
                        <td className="border-b border-wf-100 px-2 py-2">
                          {p.title ?? p.id.slice(-10)}
                        </td>
                        <td className="border-b border-wf-100 px-2 py-2 font-mono text-[10px]">
                          {p.identifier_value ?? p.sku_hint ?? "—"}
                        </td>
                        <td className="border-b border-wf-100 px-2 py-2">
                          {p.lifecycle_status ?? "—"}
                        </td>
                        <td className="border-b border-wf-100 px-2 py-2">
                          {p.publication_status ?? "—"}
                        </td>
                        <td className="border-b border-wf-100 px-2 py-2">
                          {p.made_in_europe_status ?? "—"}
                        </td>
                        <td className="border-b border-wf-100 px-2 py-2">
                          {p.completeness?.compliance_review_status ?? "—"}
                        </td>
                        <td className="border-b border-wf-100 px-2 py-2">
                          <Link
                            href={`/product-cloud/products/${p.id}`}
                            className="underline"
                          >
                            Detail
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Section>

          <Section title="E. Audit / geschiedenis">
            {(partner.audit_log?.length ?? 0) === 0 ? (
              <p className="text-xs text-wf-600">
                Geen audit-logregels voor deze seller. Reject/request-info worden
                momenteel alleen in structured logs vastgelegd, niet in
                audit_log.
              </p>
            ) : (
              <ul className="space-y-2 text-xs">
                {partner.audit_log!.map((entry) => (
                  <li
                    key={entry.id}
                    className="rounded border border-wf-200 px-3 py-2"
                  >
                    <div className="font-medium text-wf-800">
                      {entry.action_type}
                    </div>
                    <div className="text-[11px] text-wf-500">
                      {new Date(entry.created_at).toLocaleString("nl-NL")}
                    </div>
                    {entry.reason && (
                      <div className="mt-1 text-wf-700">{entry.reason}</div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>

        <aside className="space-y-4">
          <div className="rounded-md border border-dashed border-wf-500 p-4 text-[11.5px] leading-relaxed text-wf-700">
            <p className="mb-2 font-semibold">Actie vereist</p>
            {inReview ? (
              <p>
                Deze seller wacht op beoordeling. Controleer bedrijfsgegevens,
                documenten en producten vóór goedkeuring.
              </p>
            ) : partner.onboarding_status === "Aanvullende informatie vereist" ? (
              <p>Wacht op aanvullende informatie van de seller.</p>
            ) : partner.onboarding_status === "Goedgekeurd" ? (
              <p>Actieve seller — read-only review (geen onboarding-acties).</p>
            ) : (
              <p>Status: {partner.onboarding_status}</p>
            )}
          </div>

          <div className="rounded-lg border border-wf-200 p-4">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-wf-500">
              Documentcheck
            </p>
            <p className="text-xs text-wf-700">
              {docs.identity_document_file_id &&
              docs.chamber_of_commerce_extract_file_id
                ? "✓ Verplichte basisdocumenten aanwezig"
                : "⚠ Nog niet alle verplichte basisdocumenten gekoppeld"}
            </p>
          </div>
        </aside>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-2.5 border-t border-wf-300 pt-4">
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
            Terug naar overzicht
          </Button>
          {inReview && (
            <>
              <Button
                variant="secondary"
                onClick={() => router.push(`/partners/${id}/request-info`)}
              >
                Informatie opvragen
              </Button>
              <Button
                onClick={() => setConfirmApprove(true)}
                disabled={busy || confirmApprove}
              >
                Goedkeuren
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-wf-200 bg-white p-5">
      <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-wf-500">
        {title}
      </h3>
      {children}
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
    <div className="flex justify-between gap-3 border-b border-wf-100 py-2 text-[12.5px] last:border-0">
      <span className="text-wf-600">{label}</span>
      <span className="max-w-[60%] text-right text-wf-800">{value}</span>
    </div>
  );
}

function DocRow({
  label,
  present,
  fileId,
}: {
  label: string;
  present?: boolean;
  fileId: string | null;
}) {
  const isPresent = present ?? !!fileId;
  return (
    <div className="flex items-start justify-between gap-3 border-b border-wf-100 py-2 text-[12.5px] last:border-0">
      <span className="text-wf-800">{label}</span>
      <span className="text-right text-[11px] text-wf-600">
        {isPresent ? (
          <>
            <span className="text-wf-800">Aanwezig</span>
            {fileId && (
              <span className="mt-0.5 block font-mono text-[10px] text-wf-500">
                {fileId.slice(-16)}
              </span>
            )}
          </>
        ) : (
          "Ontbreekt"
        )}
      </span>
    </div>
  );
}

function StatusPill({
  label,
  value,
  variant = "outline",
}: {
  label: string;
  value: string;
  variant?: "solid" | "outline";
}) {
  return (
    <div className="text-center">
      <div className="mb-1 text-[10px] uppercase tracking-wide text-wf-500">
        {label}
      </div>
      <Badge variant={variant}>{value}</Badge>
    </div>
  );
}
