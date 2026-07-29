"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Badge, Notice } from "@europmade/ui";
import {
  displayStatus,
  formatRoles,
  listPartners,
  PartnerAdminApiError,
  type OverviewTab,
  type PartnerListItem,
} from "../../../lib/partner-admin-api";

const TABS: { key: OverviewTab; label: string }[] = [
  { key: "all", label: "Alle" },
  { key: "queue", label: "Aanvragen" },
  { key: "active", label: "Actief" },
];

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function PartnersOverviewPage() {
  const [tab, setTab] = useState<OverviewTab>("all");
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [partners, setPartners] = useState<PartnerListItem[]>([]);
  const [count, setCount] = useState(0);
  const [counts, setCounts] = useState<Record<OverviewTab, number>>({
    all: 0,
    queue: 0,
    active: 0,
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [page, allC, queueC, activeC] = await Promise.all([
        listPartners({ tab, q: search || undefined, limit: 50 }),
        listPartners({ tab: "all", limit: 1 }),
        listPartners({ tab: "queue", limit: 1 }),
        listPartners({ tab: "active", limit: 1 }),
      ]);
      setPartners(page.partners);
      setCount(page.count);
      setCounts({
        all: allC.count,
        queue: queueC.count,
        active: activeC.count,
      });
    } catch (err) {
      setError(
        err instanceof PartnerAdminApiError
          ? err.message
          : "Overzicht laden is niet gelukt.",
      );
    } finally {
      setLoading(false);
    }
  }, [tab, search]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      <p className="mb-4 text-[11.5px] text-wf-500">
        Partnerbeheer &gt; <b className="font-semibold text-wf-800">Overzicht</b>
      </p>
      <h1 className="mb-1.5 text-lg font-bold text-wf-900">Partneroverzicht</h1>
      <p className="mb-5 text-xs text-wf-600">
        Beheer van alle aangesloten en aanvragende partners.
      </p>

      {error && (
        <Notice variant="warning" className="mb-4">
          {error}
        </Notice>
      )}

      <div className="mb-0 flex gap-0 border-b border-wf-300">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`px-4 py-3 text-[12.5px] font-semibold ${
              tab === t.key
                ? "border-b-2 border-wf-900 text-wf-900"
                : "text-wf-500"
            }`}
          >
            {t.label}{" "}
            <span className="font-normal text-wf-500">({counts[t.key]})</span>
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
            placeholder="Zoek op bedrijfsnaam of KvK..."
            className="h-9 w-full rounded-[5px] border border-wf-400 px-3 text-xs text-wf-800"
          />
        </form>
      </div>

      {loading ? (
        <p className="py-10 text-center text-sm text-wf-600">Laden…</p>
      ) : partners.length === 0 ? (
        <div className="py-14 text-center text-wf-600">
          <p className="mb-1.5 text-sm font-bold text-wf-800">Geen partners</p>
          <p className="text-xs">Geen resultaten voor deze filter.</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr>
                  {["Bedrijf", "Rol", "Status", "Aangemeld", ""].map((h) => (
                    <th
                      key={h || "actie"}
                      className="border-b border-wf-400 px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-wf-500 tablet:px-7"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {partners.map((p) => (
                  <tr key={p.id} className="hover:bg-wf-100">
                    <td className="border-b border-wf-200 px-4 py-2.5 text-wf-800 tablet:px-7">
                      {p.company?.legal_name || "—"}
                    </td>
                    <td className="border-b border-wf-200 px-4 py-2.5 text-wf-800 tablet:px-7">
                      {formatRoles(p)}
                    </td>
                    <td className="border-b border-wf-200 px-4 py-2.5 tablet:px-7">
                      <Badge
                        variant={
                          displayStatus(p) === "Actief" ? "solid" : "outline"
                        }
                      >
                        {displayStatus(p)}
                      </Badge>
                    </td>
                    <td className="border-b border-wf-200 px-4 py-2.5 text-wf-800 tablet:px-7">
                      {formatDate(p.created_at)}
                    </td>
                    <td className="border-b border-wf-200 px-4 py-2.5 tablet:px-7">
                      <Link
                        href={`/partners/${p.id}`}
                        className="text-[11px] text-wf-800 underline"
                      >
                        Bekijken
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="px-4 py-3.5 text-[11px] text-wf-500 tablet:px-7">
            1–{partners.length} van {count}
          </p>
        </>
      )}
    </div>
  );
}
