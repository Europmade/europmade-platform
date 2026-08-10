"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Badge, Notice } from "@europmade/ui"
import {
  listTranslationOverview,
  ProductCloudTranslationsApiError,
  uiStatusLabel,
  type OverviewItem,
} from "../../../../lib/product-cloud-translations-api"

/**
 * Product Cloud — vertaaloverzicht (admin).
 */
export default function ProductCloudTranslationsOverviewPage() {
  const [items, setItems] = useState<OverviewItem[] | "loading">("loading")
  const [providerMessage, setProviderMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    listTranslationOverview(50)
      .then((res) => {
        if (cancelled) return
        setItems(res.items)
        setProviderMessage(res.provider_message)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(
          err instanceof ProductCloudTranslationsApiError
            ? err.message
            : "Vertaaloverzicht laden mislukt."
        )
        setItems([])
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div>
      <h1 className="text-[19px] font-bold text-wf-900">
        Product Cloud — Vertalingen
      </h1>
      <p className="mt-1.5 text-xs text-wf-600">
        Overzicht van productvertalingen per taal. Productinhoud loopt via
        Product Cloud; UI-labels via i18n.
      </p>

      {providerMessage ? (
        <Notice variant="info" className="mt-4">
          {providerMessage}. Handmatige correctie en statusbeheer werken wel.
        </Notice>
      ) : null}

      {error ? (
        <Notice variant="warning" className="mt-4">
          {error}
        </Notice>
      ) : null}

      {items === "loading" ? (
        <p className="mt-6 text-xs text-wf-600">Laden…</p>
      ) : items.length === 0 ? (
        <p className="mt-6 text-xs text-wf-600">
          Geen producten met versies gevonden.
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-wf-300 text-wf-600">
                <th className="py-2 pr-3 font-semibold">Product</th>
                <th className="py-2 pr-3 font-semibold">Bron</th>
                <th className="py-2 pr-3 font-semibold">Vertalingen</th>
                <th className="py-2 pr-3 font-semibold">Aandacht</th>
                <th className="py-2 font-semibold" />
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr
                  key={item.version_id}
                  className="border-b border-wf-200 text-wf-800"
                >
                  <td className="py-2.5 pr-3 font-medium">{item.title}</td>
                  <td className="py-2.5 pr-3 uppercase">
                    {item.source_language_code ?? "—"}
                  </td>
                  <td className="py-2.5 pr-3">
                    <div className="flex flex-wrap gap-1.5">
                      {item.targets.map((t) => (
                        <Badge
                          key={t.language_code}
                          variant={
                            ["Ontbreekt", "Verouderd", "Mislukt"].includes(
                              t.translation_status
                            )
                              ? "outline"
                              : "solid"
                          }
                        >
                          {t.language_code.toUpperCase()} —{" "}
                          {t.ui_status || uiStatusLabel(t.translation_status)}
                        </Badge>
                      ))}
                    </div>
                  </td>
                  <td className="py-2.5 pr-3">{item.attention_count}</td>
                  <td className="py-2.5 text-right">
                    <Link
                      href={`/product-cloud/translations/${item.version_id}`}
                      className="font-semibold text-wf-900 underline"
                    >
                      Beheren
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
