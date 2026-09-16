"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { Badge, Notice } from "@europmade/ui"
import {
  listAdCampaigns,
  type AdCampaignDto,
} from "../../../../lib/advertising-admin-api"
import { adminMarketLabel } from "../../../../lib/market-labels"
import {
  AD_STATUS_COLORS,
  AD_STATUS_LABELS,
  formatAdDate,
  formatAdDateTime,
  placementLabel,
} from "../../../../lib/advertising-labels"

export default function AdminAdvertisingCampaignsPage() {
  const [campaigns, setCampaigns] = useState<AdCampaignDto[]>([])
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState("")
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    setError(null)
    setLoading(true)
    listAdCampaigns(filter || undefined)
      .then((res) => setCampaigns(res.campaigns))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [filter])

  useEffect(() => {
    load()
  }, [load])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold">Advertising — Campagnes</h1>
          <p className="mt-1 text-sm text-gray-600">
            Beoordeel seller-campagnes. Open een campagne voor het Review Center.
          </p>
        </div>
        <select
          className="rounded border px-3 py-1.5 text-sm"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          aria-label="Filter op status"
        >
          <option value="">Alle statussen</option>
          {Object.entries(AD_STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </div>

      {error && <Notice variant="destructive">{error}</Notice>}

      <div className="overflow-x-auto overflow-hidden rounded-lg border bg-white">
        <table className="w-full min-w-[960px] text-sm">
          <thead className="border-b bg-gray-50">
            <tr>
              {[
                "Status",
                "Campagne",
                "Seller",
                "Positie",
                "Target",
                "Landen",
                "Weken",
                "Prijs",
                "Aangemaakt",
                "Gewijzigd",
                "Actie",
              ].map((h) => (
                <th
                  key={h}
                  className="px-3 py-2.5 text-left text-xs font-medium uppercase text-gray-500"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={11} className="px-4 py-6 text-center text-gray-500">
                  Laden…
                </td>
              </tr>
            )}
            {!loading &&
              campaigns.map((c) => (
                <tr key={c.id} className="border-b last:border-b-0">
                  <td className="px-3 py-2.5">
                    <Badge
                      variant={
                        (AD_STATUS_COLORS[c.status] ?? "outline") as "outline"
                      }
                    >
                      {AD_STATUS_LABELS[c.status] ?? c.status}
                    </Badge>
                  </td>
                  <td className="px-3 py-2.5 font-medium">{c.name}</td>
                  <td className="px-3 py-2.5">
                    <div className="font-medium text-gray-900">
                      {c.seller_name || c.seller_id}
                    </div>
                    {c.seller_name && c.seller_name !== c.seller_id && (
                      <div className="text-[10px] text-gray-400">
                        {c.seller_id}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    {placementLabel(c.placement)}
                  </td>
                  <td className="px-3 py-2.5 text-gray-600">
                    {c.target_value || "—"}
                  </td>
                  <td className="px-3 py-2.5">
                    {(c.markets || [])
                      .map((m) => adminMarketLabel(m))
                      .join(", ") || "—"}
                  </td>
                  <td className="px-3 py-2.5 text-xs">
                    {c.weeks.length > 0
                      ? `${formatAdDate(c.weeks[0].week_start)} – ${formatAdDate(c.weeks[c.weeks.length - 1].week_end)}`
                      : "—"}
                  </td>
                  <td className="px-3 py-2.5 font-medium">
                    €{Number(c.total_price).toFixed(2)}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-gray-600">
                    {formatAdDate(c.created_at)}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-gray-600">
                    {formatAdDateTime(c.updated_at)}
                  </td>
                  <td className="px-3 py-2.5">
                    <Link
                      href={`/advertising/campaigns/${encodeURIComponent(c.id)}`}
                      className="text-sm font-medium text-blue-700 hover:underline"
                    >
                      {c.status === "pending_review" ? "Beoordelen" : "Bekijken"}
                    </Link>
                  </td>
                </tr>
              ))}
            {!loading && campaigns.length === 0 && (
              <tr>
                <td
                  colSpan={11}
                  className="px-4 py-6 text-center text-gray-500"
                >
                  Geen campagnes gevonden.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
