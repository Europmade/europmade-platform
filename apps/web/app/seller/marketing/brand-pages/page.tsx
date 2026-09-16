"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Badge, Notice } from "@europmade/ui"
import { SellerGate } from "../../_components/seller-gate"
import { EmptyState } from "../../_components/empty-state"
import {
  BrandApiError,
  listSellerBrands,
  type ManageableBrand,
} from "../../_lib/brands-api"
import { useStorefrontLocale } from "../../../_lib/i18n/use-storefront-locale"
import { t } from "../../../_lib/i18n/messages"

function statusVariant(status: string | undefined) {
  if (status === "Gepubliceerd" || status === "Goedgekeurd") return "solid" as const
  if (status === "In beoordeling" || status === "Aanvulling gevraagd") {
    return "outline" as const
  }
  return "outline" as const
}

export default function SellerBrandPagesHubPage() {
  const locale = useStorefrontLocale()
  const [brands, setBrands] = useState<ManageableBrand[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    listSellerBrands()
      .then((res) => {
        if (cancelled) return
        setBrands(res.brands || [])
      })
      .catch((err) => {
        if (cancelled) return
        setError(
          err instanceof BrandApiError ? err.message : "Merken laden mislukt."
        )
        setBrands([])
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <SellerGate
      breadcrumb={[
        { label: t("sellerDashboardTitle", locale), href: "/seller" },
        { label: t("sellerNavMarketing", locale), href: "/seller/marketing" },
        { label: t("sellerMktBrandPageTitle", locale) },
      ]}
    >
      <h1 className="text-[19px] font-bold text-wf-900">
        {t("sellerMktBrandPageTitle", locale)}
      </h1>
      <p className="mt-1.5 max-w-2xl text-xs text-wf-600">
        {t("sellerBrandPagesHubIntro", locale)}
      </p>

      <h2 className="mb-2.5 mt-8 text-[12px] uppercase tracking-[0.04em] text-wf-500">
        {t("sellerBrandPagesHubTitle", locale)}
      </h2>

      {error ? (
        <Notice variant="warning" className="mb-4">
          {error}
        </Notice>
      ) : null}

      {brands === null ? (
        <p className="text-xs text-wf-500">Laden…</p>
      ) : brands.length === 0 ? (
        <EmptyState
          title="Nog geen merken"
          description="Koppel of maak eerst een merk via Merken. Daarna kun je hier de officiële merkpagina aanvragen."
          primaryAction={{ label: "Naar merken", href: "/seller/brands" }}
        />
      ) : (
        <ul className="space-y-3">
          {brands.map((brand) => {
            const status = brand.page_flow_status || "Niet aangevraagd"
            const canEdit = brand.can_manage_public_page === true
            return (
              <li
                key={brand.id}
                className="rounded-lg border border-wf-300 bg-white px-4 py-3.5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-wf-900">{brand.name}</p>
                    <p className="mt-0.5 text-[11px] text-wf-500">
                      /merk/{brand.slug}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <Badge variant={statusVariant(status)}>{status}</Badge>
                      <Badge variant="outline">
                        {brand.claimed
                          ? "Geclaimd door merkeigenaar"
                          : "Niet geclaimd"}
                      </Badge>
                    </div>
                    <p className="mt-2 text-[11px] text-wf-600">
                      Wie mag aanpassen: {brand.editor_scope || "—"}
                    </p>
                    {brand.ownership_status ? (
                      <p className="mt-1 text-[11px] text-wf-600">
                        Eigenaarschap: {brand.ownership_status}
                      </p>
                    ) : (
                      <p className="mt-1 text-[11px] text-wf-600">
                        Eigenaarschap: nog niet aangevraagd
                      </p>
                    )}
                  </div>
                  <Link
                    href={`/seller/marketing/brand-pages/${encodeURIComponent(brand.id)}`}
                    className="inline-flex h-9 items-center rounded-wf bg-wf-900 px-3 text-xs font-semibold text-white hover:bg-wf-800"
                  >
                    {canEdit
                      ? t("sellerBrandPageManage", locale)
                      : t("sellerBrandPageRequest", locale)}
                  </Link>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </SellerGate>
  )
}
