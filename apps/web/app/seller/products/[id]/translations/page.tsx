"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { Badge, Button, Notice } from "@europmade/ui"
import { SellerGate } from "../../../_components/seller-gate"
import {
  getProductTranslations,
  prepareProductTranslations,
  ProductCloudApiError,
  setProductSourceLanguage,
} from "../../../_lib/product-cloud-api"
import { useStorefrontLocale } from "../../../../_lib/i18n/use-storefront-locale"
import { t } from "../../../../_lib/i18n/messages"

const SOURCE_OPTIONS = [
  { code: "nl", key: "sellerTranslationsLangNl" as const },
  { code: "en", key: "sellerTranslationsLangEn" as const },
  { code: "de", key: "sellerTranslationsLangDe" as const },
  { code: "fr", key: "sellerTranslationsLangFr" as const },
]

type Target = {
  language_code: string
  translation_status: string
  ui_status: string
}

/**
 * Seller: bron-taal + translation status + enqueue ("Vertalingen voorbereiden").
 * Geen handmatig beheer van alle vertalingen in deze sprint.
 */
export default function SellerProductTranslationsPage() {
  const locale = useStorefrontLocale()
  const params = useParams<{ id: string }>()
  const productId = params.id

  const [title, setTitle] = useState("")
  const [source, setSource] = useState("nl")
  const [targets, setTargets] = useState<Target[]>([])
  const [providerOff, setProviderOff] = useState(true)
  const [providerMessage, setProviderMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    const res = await getProductTranslations(productId)
    setTitle(res.version.title)
    setSource(res.source_language_code ?? "nl")
    setTargets(res.targets)
    setProviderOff(!res.provider_configured)
    setProviderMessage(res.provider_message)
  }, [productId])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    load()
      .catch((err: unknown) => {
        if (cancelled) return
        if (err instanceof ProductCloudApiError && err.status === 403) {
          setError(t("sellerTranslationsForbidden", locale))
        } else if (err instanceof ProductCloudApiError) {
          setError(err.message)
        } else {
          setError(t("sellerTranslationsLoadError", locale))
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [load, locale])

  async function saveSource() {
    setBusy(true)
    setNotice(null)
    setError(null)
    try {
      const res = await setProductSourceLanguage(productId, source)
      setTargets(res.targets)
      setNotice(t("sellerTranslationsSaved", locale))
    } catch (err: unknown) {
      setError(
        err instanceof ProductCloudApiError
          ? err.message
          : t("sellerTranslationsLoadError", locale)
      )
    } finally {
      setBusy(false)
    }
  }

  async function prepare() {
    setBusy(true)
    setNotice(null)
    setError(null)
    try {
      // Persist selected source language before enqueue (required by API).
      await setProductSourceLanguage(productId, source)
      const res = await prepareProductTranslations(productId)
      if (providerOff || !res.enqueue?.provider_configured) {
        setNotice(
          res.provider_message
            ? `Placeholders aangemaakt (geen AI). ${res.provider_message}`
            : t("transPlaceholderCreated", locale)
        )
      } else {
        setNotice(
          res.provider_message
            ? `${t("sellerTranslationsPrepared", locale)} ${res.provider_message}.`
            : t("sellerTranslationsPrepared", locale)
        )
      }
      await load()
    } catch (err: unknown) {
      setError(
        err instanceof ProductCloudApiError
          ? err.message
          : t("sellerTranslationsLoadError", locale)
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <SellerGate
      breadcrumb={[
        { label: t("sellerDashboardTitle", locale), href: "/seller" },
        { label: t("sellerNavProducts", locale), href: "/seller/products" },
        {
          label: title || productId,
          href: `/seller/products/${productId}`,
        },
        { label: t("sellerTranslationsTitle", locale) },
      ]}
    >
      <div className="mx-auto max-w-3xl">
        <Link
          href={`/seller/products/${productId}`}
          className="text-xs font-semibold text-wf-700 underline"
        >
          {t("sellerTranslationsBack", locale)}
        </Link>
        <h1 className="mt-3 text-xl font-bold text-wf-900">
          {t("sellerTranslationsTitle", locale)}
        </h1>
        <p className="mt-1 text-xs text-wf-600">
          {t("sellerTranslationsIntro", locale)}
        </p>

        {loading ? (
          <p className="mt-6 text-xs text-wf-600">…</p>
        ) : error && !title ? (
          <Notice variant="warning" className="mt-4">
            {error}
          </Notice>
        ) : (
          <>
            <p className="mt-4 text-sm font-semibold text-wf-900">{title}</p>

            {providerOff ? (
              <Notice variant="info" className="mt-3">
                {providerMessage || t("sellerTranslationsProviderOff", locale)}{" "}
                Er wordt geen AI-vertaling uitgevoerd zolang DeepL niet is
                geconfigureerd.
              </Notice>
            ) : null}
            {error ? (
              <Notice variant="warning" className="mt-3">
                {error}
              </Notice>
            ) : null}
            {notice ? (
              <Notice variant="info" className="mt-3">
                {notice}
              </Notice>
            ) : null}

            <label className="mt-5 block text-xs font-semibold text-wf-700">
              {t("sellerTranslationsSourceLanguage", locale)}
              <select
                className="mt-1 w-full rounded-md border border-wf-300 bg-white px-3 py-2 text-sm"
                value={source}
                onChange={(e) => setSource(e.target.value)}
              >
                {SOURCE_OPTIONS.map((opt) => (
                  <option key={opt.code} value={opt.code}>
                    {t(opt.key, locale)}
                  </option>
                ))}
              </select>
            </label>

            <div className="mt-3 flex flex-wrap gap-2">
              <Button type="button" disabled={busy} onClick={() => void saveSource()}>
                {t("sellerTranslationsSaveSource", locale)}
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={busy}
                onClick={() => void prepare()}
              >
                {providerOff
                  ? "Placeholders aanmaken (geen AI)"
                  : "Vertalen met DeepL"}
              </Button>
            </div>

            <h2 className="mt-6 text-sm font-bold text-wf-900">
              {t("sellerTranslationsStatusHeading", locale)}
            </h2>
            <p className="mt-1 text-[11px] text-wf-600">
              Status per doeltaal (alleen-lezen). Handmatige bewerking van
              vertaalregels is hier niet beschikbaar.
            </p>
            <ul className="mt-2 space-y-2">
              {targets.map((row) => (
                <li
                  key={row.language_code}
                  className="flex items-center justify-between rounded-md border border-wf-200 bg-white px-3 py-2 text-xs"
                >
                  <span className="font-semibold uppercase">
                    {row.language_code}
                  </span>
                  <Badge variant="outline">{row.ui_status}</Badge>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </SellerGate>
  )
}
