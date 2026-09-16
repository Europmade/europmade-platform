"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { Button, Notice } from "@europmade/ui"
import { SellerGate } from "../../../_components/seller-gate"
import {
  getProductTranslations,
  prepareProductTranslations,
  ProductCloudApiError,
  saveProductTranslationManual,
  setProductSourceLanguage,
} from "../../../_lib/product-cloud-api"
import { useStorefrontLocale } from "../../../../_lib/i18n/use-storefront-locale"
import { t } from "../../../../_lib/i18n/messages"

type Target = {
  language_code: string
  translation_status: string
  ui_status: string
  review_label?: string
  field_count: number
  has_manual: boolean
  missing_fields?: string[]
}

type TranslationRow = {
  id: string
  field_name: string
  language_code: string
  value: string
  translation_status: string
  origin?: string
}

type EditableField = {
  field_name: string
  label: string
  source_value: string
  required: boolean
}

/**
 * Seller: bron-taal + handmatige vertalingen per doeltaal (title/description).
 * DeepL blijft optioneel; zonder provider kan seller alsnog opslaan.
 */
export default function SellerProductTranslationsPage() {
  const locale = useStorefrontLocale()
  const params = useParams<{ id: string }>()
  const productId = params.id

  const [title, setTitle] = useState("")
  const [sourceTitle, setSourceTitle] = useState("")
  const [sourceDescription, setSourceDescription] = useState("")
  const [source, setSource] = useState("nl")
  const [targets, setTargets] = useState<Target[]>([])
  const [translations, setTranslations] = useState<TranslationRow[]>([])
  const [activeLanguages, setActiveLanguages] = useState<string[]>([])
  const [requiredTargets, setRequiredTargets] = useState<string[]>([])
  const [editableFields, setEditableFields] = useState<EditableField[]>([
    { field_name: "title", label: "Titel", source_value: "", required: true },
    {
      field_name: "description",
      label: "Omschrijving",
      source_value: "",
      required: true,
    },
  ])
  const [selectedTargets, setSelectedTargets] = useState<string[]>([])
  const [drafts, setDrafts] = useState<Record<string, Record<string, string>>>({})
  const [providerOff, setProviderOff] = useState(true)
  const [providerMessage, setProviderMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [busyLang, setBusyLang] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const applySummary = useCallback(
    (res: {
      version: { title: string; description: string }
      source_language_code: string | null
      targets: Target[]
      translations: TranslationRow[]
      provider_configured: boolean
      provider_message: string | null
      active_languages?: string[]
      required_target_languages?: string[]
      editable_fields?: EditableField[]
    }) => {
      setTitle(res.version.title)
      setSource(res.source_language_code ?? "nl")
      setTargets(res.targets)
      setTranslations(res.translations || [])
      const fields =
        res.editable_fields?.length
          ? res.editable_fields
          : [
              {
                field_name: "title",
                label: "Titel",
                source_value: res.version.title || "",
                required: true,
              },
              {
                field_name: "description",
                label: "Omschrijving",
                source_value: res.version.description || "",
                required: true,
              },
            ]
      setEditableFields(fields)
      setSourceTitle(fields.find((f) => f.field_name === "title")?.source_value || "")
      setSourceDescription(
        fields.find((f) => f.field_name === "description")?.source_value || ""
      )
      setActiveLanguages(
        (res.active_languages || []).map((code) => code.toLowerCase())
      )
      const required = (res.required_target_languages || []).map((code) =>
        code.toLowerCase()
      )
      setRequiredTargets(required)
      setProviderOff(!res.provider_configured)
      setProviderMessage(res.provider_message)
      const next: Record<string, Record<string, string>> = {}
      for (const target of res.targets) {
        const lang = target.language_code
        const rows = (res.translations || []).filter(
          (r) => r.language_code === lang
        )
        next[lang] = {}
        for (const field of fields) {
          next[lang][field.field_name] =
            rows.find((r) => r.field_name === field.field_name)?.value || ""
        }
      }
      setDrafts(next)
      setSelectedTargets((prev) => {
        const valid = prev.filter((lang) =>
          res.targets.some((t) => t.language_code === lang)
        )
        if (valid.length > 0) return valid
        const firstMissing = res.targets.find(
          (row) => row.translation_status !== "Gepubliceerd"
        )?.language_code
        return firstMissing ? [firstMissing] : res.targets.slice(0, 1).map((t) => t.language_code)
      })
    },
    []
  )

  const load = useCallback(async () => {
    setError(null)
    const res = await getProductTranslations(productId)
    applySummary(res)
  }, [productId, applySummary])

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

  const missingTargets = useMemo(
    () =>
      targets.filter((row) => row.translation_status !== "Gepubliceerd"),
    [targets]
  )

  const allReady = targets.length > 0 && missingTargets.length === 0
  const visibleTargets = useMemo(() => {
    if (selectedTargets.length === 0) return targets.slice(0, 1)
    return targets.filter((target) => selectedTargets.includes(target.language_code))
  }, [selectedTargets, targets])

  function toggleTarget(lang: string) {
    setSelectedTargets((prev) =>
      prev.includes(lang) ? prev.filter((x) => x !== lang) : [...prev, lang]
    )
  }

  async function saveSource() {
    setBusy(true)
    setNotice(null)
    setError(null)
    try {
      const res = await setProductSourceLanguage(productId, source)
      setTargets(res.targets as Target[])
      setNotice(t("sellerTranslationsSaved", locale))
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

  async function prepare() {
    setBusy(true)
    setNotice(null)
    setError(null)
    try {
      await setProductSourceLanguage(productId, source)
      const res = await prepareProductTranslations(productId)
      if (providerOff || !res.enqueue?.provider_configured) {
        setNotice(
          res.provider_message
            ? `Placeholders aangemaakt (geen AI). Vul hieronder handmatig in.`
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

  async function saveLanguage(languageCode: string) {
    const draft = drafts[languageCode] || {}
    const missing = editableFields
      .filter((f) => f.required)
      .filter((f) => !(draft[f.field_name] || "").trim())
    if (missing.length > 0) {
      setError(`Verplicht: ${missing.map((f) => f.label).join(", ")}.`)
      return
    }
    const fields = Object.fromEntries(
      editableFields
        .map((f) => [f.field_name, (draft[f.field_name] || "").trim()])
        .filter(([, value]) => value.length > 0)
    )
    setBusyLang(languageCode)
    setNotice(null)
    setError(null)
    try {
      const res = await saveProductTranslationManual(productId, {
        language_code: languageCode,
        fields,
        publish: true,
      })
      applySummary(res as Parameters<typeof applySummary>[0])
      setNotice(
        res.message ||
          `Vertaling ${languageCode.toUpperCase()} opgeslagen.`
      )
    } catch (err: unknown) {
      setError(
        err instanceof ProductCloudApiError
          ? err.message
          : t("sellerTranslationsLoadError", locale)
      )
    } finally {
      setBusyLang(null)
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
          href={`/seller/products/${productId}?step=translations`}
          className="text-xs font-semibold text-wf-700 underline"
        >
          {t("sellerTranslationsBack", locale)}
        </Link>
        <h1 className="mt-3 text-xl font-bold text-wf-900">
          {t("sellerTranslationsTitle", locale)}
        </h1>
        <p className="mt-1 text-xs text-wf-600">
          Vul per doeltaal minimaal titel en omschrijving in. Zonder DeepL kun
          je dit handmatig doen; later kan AI dezelfde velden vullen.
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
                geconfigureerd. Je kunt hieronder wel handmatig opslaan.
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

            {allReady ? (
              <Notice variant="info" className="mt-3">
                Alle verplichte doeltaal-vertalingen zijn beschikbaar. Stap 6 is
                gereed — ga door naar Publiceren.
              </Notice>
            ) : missingTargets.length ? (
              <p className="mt-3 text-xs text-amber-800">
                Nog incompleet:{" "}
                {missingTargets.map((r) => r.language_code.toUpperCase()).join(", ")}
              </p>
            ) : null}
            {requiredTargets.length ? (
              <p className="mt-1 text-[11px] text-wf-600">
                Verplicht voor publicatie:{" "}
                {requiredTargets.map((lang) => lang.toUpperCase()).join(", ")}
              </p>
            ) : null}

            <label className="mt-5 block text-xs font-semibold text-wf-700">
              {t("sellerTranslationsSourceLanguage", locale)}
              <select
                className="mt-1 w-full rounded-md border border-wf-300 bg-white px-3 py-2 text-sm"
                value={source}
                onChange={(e) => setSource(e.target.value)}
              >
                {(activeLanguages.length ? activeLanguages : []).map(
                  (code) => (
                    <option key={code} value={code}>
                      {code.toUpperCase()}
                    </option>
                  )
                )}
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

            <div className="mt-4 rounded border border-wf-200 bg-wf-50 p-3 text-[11px] text-wf-700">
              <p className="font-semibold text-wf-900">Brontekst ({source.toUpperCase()})</p>
              <p className="mt-1 font-semibold">{sourceTitle || "—"}</p>
              <p className="mt-1 whitespace-pre-wrap">{sourceDescription || "—"}</p>
            </div>

            <h2 className="mt-6 text-sm font-bold text-wf-900">
              Handmatige vertalingen
            </h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {targets.map((row) => {
                const selected = selectedTargets.includes(row.language_code)
                const required = requiredTargets.includes(row.language_code)
                return (
                  <button
                    key={row.language_code}
                    type="button"
                    className={`rounded border px-2.5 py-1 text-xs font-semibold ${
                      selected
                        ? "border-wf-800 bg-wf-900 text-white"
                        : "border-wf-300 bg-white text-wf-700"
                    }`}
                    onClick={() => toggleTarget(row.language_code)}
                  >
                    {row.language_code.toUpperCase()}
                    {required ? " *" : ""}
                  </button>
                )
              })}
            </div>
            <div className="mt-3 space-y-4">
              {visibleTargets.map((row) => {
                const lang = row.language_code
                const draft = drafts[lang] || {}
                const busyThis = busyLang === lang
                return (
                  <section
                    key={lang}
                    className="rounded border border-wf-300 bg-white p-3"
                  >
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <h3 className="text-xs font-bold uppercase text-wf-900">
                        {lang}
                      </h3>
                      <span className="rounded border border-wf-300 px-2 py-0.5 text-[10px] font-semibold text-wf-800">
                        {row.review_label || row.ui_status}
                      </span>
                    </div>
                    {row.missing_fields?.length ? (
                      <p className="mb-2 text-[11px] text-amber-800">
                        Nog nodig: {row.missing_fields.join(", ")}
                      </p>
                    ) : null}
                    {editableFields.map((field) => {
                      const value = draft[field.field_name] || ""
                      const isLongText = field.field_name.includes("description")
                      return (
                        <label
                          key={field.field_name}
                          className="mb-2 block text-[11px] font-semibold text-wf-500"
                        >
                          {field.label}
                          {field.required ? " *" : ""}
                          {isLongText ? (
                            <textarea
                              className="mt-1 min-h-[96px] w-full rounded border border-wf-400 px-3 py-2 text-xs"
                              value={value}
                              onChange={(e) =>
                                setDrafts((prev) => ({
                                  ...prev,
                                  [lang]: {
                                    ...(prev[lang] || {}),
                                    [field.field_name]: e.target.value,
                                  },
                                }))
                              }
                            />
                          ) : (
                            <input
                              className="mt-1 w-full rounded border border-wf-400 px-3 py-2 text-xs"
                              value={value}
                              onChange={(e) =>
                                setDrafts((prev) => ({
                                  ...prev,
                                  [lang]: {
                                    ...(prev[lang] || {}),
                                    [field.field_name]: e.target.value,
                                  },
                                }))
                              }
                            />
                          )}
                        </label>
                      )
                    })}
                    <Button
                      size="sm"
                      disabled={busyThis || busy}
                      onClick={() => void saveLanguage(lang)}
                    >
                      {busyThis ? "Opslaan…" : "Opslaan"}
                    </Button>
                  </section>
                )
              })}
            </div>

            <p className="mt-4 text-[11px] text-wf-600">
              Opgeslagen vertalingen krijgen status{" "}
              <strong>Beschikbaar (Gepubliceerd)</strong> zodat ze meetellen
              voor publicatie.
            </p>
            <Link
              href={`/seller/products/${productId}?step=publish`}
              className="mt-3 inline-flex text-xs font-semibold underline"
            >
              Naar Publiceren →
            </Link>
          </>
        )}
      </div>
    </SellerGate>
  )
}
