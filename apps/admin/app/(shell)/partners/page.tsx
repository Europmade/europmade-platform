"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Badge, Notice } from "@europmade/ui";
import {
  listPartners,
  PartnerAdminApiError,
  type OnboardingStatus,
  type OverviewTab,
  type PartnerListItem,
} from "../../../lib/partner-admin-api";
import {
  displayOnboardingStatus,
  onboardingBadgeVariant,
  STATUS_FILTERS,
} from "../../../lib/seller-status";

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function PartnersOverviewPage() {
  const [filterKey, setFilterKey] = useState("all");
  const [filterReady, setFilterReady] = useState(false);

  useEffect(() => {
    const tab = new URLSearchParams(window.location.search).get("tab");
    if (tab && STATUS_FILTERS.some((filter) => filter.key === tab)) {
      setFilterKey(tab);
    }
    setFilterReady(true);
  }, []);
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [partners, setPartners] = useState<PartnerListItem[]>([]);
  const [count, setCount] = useState(0);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const activeFilter = useMemo(
    () => STATUS_FILTERS.find((f) => f.key === filterKey) ?? STATUS_FILTERS[0],
    [filterKey],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const listParams = {
        tab: activeFilter.tab ?? ("all" as OverviewTab),
        status: activeFilter.status,
        q: search || undefined,
        limit: 50,
      };
      const [page, ...countPages] = await Promise.all([
        listPartners(listParams),
        ...STATUS_FILTERS.map((f) =>
          listPartners({
            tab: f.tab ?? "all",
            status: f.status,
            limit: 1,
          }),
        ),
      ]);
      setPartners(page.partners);
      setCount(page.count);
      const nextCounts: Record<string, number> = {};
      STATUS_FILTERS.forEach((f, i) => {
        nextCounts[f.key] = countPages[i]?.count ?? 0;
      });
      setCounts(nextCounts);
    } catch (err) {
      setError(
        err instanceof PartnerAdminApiError
          ? err.message
          : "Overzicht laden is niet gelukt.",
      );
    } finally {
      setLoading(false);
    }
  }, [activeFilter, search]);

  useEffect(() => {
    if (!filterReady) return;
    load();
  }, [load, filterReady]);

  return (
    <div>
      <p className="mb-4 text-[11.5px] text-wf-500">
        Sellers &gt;{" "}
        <b className="font-semibold text-wf-800">Seller Management</b>
      </p>
      <h1 className="mb-1.5 text-lg font-bold text-wf-900">Seller Management</h1>
      <p className="mb-5 text-xs text-wf-600">
        Beoordelen en beheren van seller-aanvragen en actieve sellers. Echte
        API-data — geen demo.
      </p>

      {error && (
        <Notice variant="warning" className="mb-4">
          {error}
        </Notice>
      )}

      <div className="mb-0 flex flex-wrap gap-0 border-b border-wf-300">
        {STATUS_FILTERS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setFilterKey(t.key)}
            className={`px-4 py-3 text-[12.5px] font-semibold ${
              filterKey === t.key
                ? "border-b-2 border-wf-900 text-wf-900"
                : "text-wf-500"
            }`}
          >
            {t.label}{" "}
            <span className="font-normal text-wf-500">
              ({counts[t.key] ?? 0})
            </span>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2.5 py-4">
        <form
          className="min-w-[160px] flex-1"
          onSubmit={(e) => {
            e.preventDefault();
            setSearch(q.trim());
          }}
        >
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Zoek op bedrijfsnaam, seller ID, KvK of e-mail…"
            className="h-9 w-full rounded-[5px] border border-wf-400 px-3 text-xs text-wf-800"
          />
        </form>
      </div>

      {loading ? (
        <p className="py-10 text-center text-sm text-wf-600">Laden…</p>
      ) : partners.length === 0 ? (
        <div className="py-14 text-center text-wf-600">
          <p className="mb-1.5 text-sm font-bold text-wf-800">Geen sellers</p>
          <p className="text-xs">Geen resultaten voor deze filter.</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr>
                  {[
                    "Bedrijf",
                    "Contact",
                    "Land",
                    "Seller ID",
                    "Status",
                    "Verificatie",
                    "Made in Europe",
                    "Producten",
                    "Aangemeld",
                    "Laatste wijziging",
                    "",
                  ].map((h) => (
                    <th
                      key={h || "actie"}
                      className="border-b border-wf-400 px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-wf-500"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {partners.map((p) => (
                  <tr key={p.id} className="hover:bg-wf-100">
                    <td className="border-b border-wf-200 px-3 py-2.5 font-medium text-wf-800">
                      {p.company?.legal_name || "—"}
                    </td>
                    <td className="border-b border-wf-200 px-3 py-2.5 text-wf-700">
                      <div>{p.contact_person || "—"}</div>
                      {p.contact_email && (
                        <div className="text-[10px] text-wf-500">
                          {p.contact_email}
                        </div>
                      )}
                    </td>
                    <td className="border-b border-wf-200 px-3 py-2.5 text-wf-700">
                      {p.company?.country_code || "—"}
                    </td>
                    <td className="border-b border-wf-200 px-3 py-2.5 font-mono text-[10px] text-wf-600">
                      {p.id.slice(-12)}
                    </td>
                    <td className="border-b border-wf-200 px-3 py-2.5">
                      <StatusBadge status={p.onboarding_status} />
                    </td>
                    <td className="border-b border-wf-200 px-3 py-2.5 text-wf-700">
                      {p.verification_status ?? "—"}
                    </td>
                    <td className="border-b border-wf-200 px-3 py-2.5 text-wf-700">
                      {p.made_in_europe_status ?? "—"}
                    </td>
                    <td className="border-b border-wf-200 px-3 py-2.5 text-wf-700">
                      {p.product_count ?? 0}
                    </td>
                    <td className="border-b border-wf-200 px-3 py-2.5 text-wf-700">
                      {formatDate(p.created_at)}
                    </td>
                    <td className="border-b border-wf-200 px-3 py-2.5 text-wf-700">
                      {formatDate(p.updated_at)}
                    </td>
                    <td className="border-b border-wf-200 px-3 py-2.5">
                      <Link
                        href={`/partners/${p.id}`}
                        className="text-[11px] text-wf-800 underline"
                      >
                        Review
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="px-3 py-3.5 text-[11px] text-wf-500">
            1–{partners.length} van {count}
          </p>
        </>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: OnboardingStatus }) {
  const variant = onboardingBadgeVariant(status);
  return (
    <Badge variant={variant === "destructive" ? "outline" : variant}>
      {displayOnboardingStatus(status)}
    </Badge>
  );
}
