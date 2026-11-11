"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Button, Input, Notice } from "@europmade/ui"
import { SellerGate } from "../../_components/seller-gate"
import {
  ProductCloudApiError,
  commitProductImportFile,
  downloadProductImportTemplate,
  listProductCloudLanguages,
  previewProductImportFile,
  recoverImportCommitAfterFailure,
  sanitizeImportUserMessage,
  type ImportCommitResponse,
  type ImportPreviewResponse,
} from "../../_lib/product-cloud-api"
import { useStorefrontLocale } from "../../../_lib/i18n/use-storefront-locale"
import { t } from "../../../_lib/i18n/messages"
import {
  buildSellerImportResult,
  sellerImportPhase,
} from "./import-result-model"
import { SellerImportPreview } from "./import-preview-panel"
import { SellerImportResult } from "./import-result-panel"

/**
 * Producten → Importeren — één brontaal, algemene tekstvelden, categorie-stap 2.
 */
export default function ProductImportPage() {
  const locale = useStorefrontLocale()
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<ImportPreviewResponse | null>(null)
  const [mapping, setMapping] = useState<Record<string, string | null>>({})
  const [sourceLanguage, setSourceLanguage] = useState("")
  const [languages, setLanguages] = useState<Array<{ code: string; name: string }>>(
    []
  )
  const [rowOverrides, setRowOverrides] = useState<
    Record<string, Record<string, string>>
  >({})
  const [error, setError] = useState<string | null>(null)
  const [showProductsLink, setShowProductsLink] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [commitResult, setCommitResult] = useState<ImportCommitResponse | null>(
    null
  )
  const [busy, setBusy] = useState(false)
  const [reuseConfirmed, setReuseConfirmed] = useState(false)

  const canonical = preview?.canonical_columns || []
  const categoryFields = preview?.category_fields || []
  const headers = preview?.headers || []
  const phase = sellerImportPhase({
    hasPreview: Boolean(preview),
    hasResult: Boolean(commitResult),
  })
  const importResult = useMemo(
    () => (commitResult ? buildSellerImportResult(commitResult, preview) : null),
    [commitResult, preview]
  )

  function startNewImport() {
    setFile(null)
    setPreview(null)
    setMapping({})
    setRowOverrides({})
    setCommitResult(null)
    setError(null)
    setNotice(null)
    setShowProductsLink(false)
    setReuseConfirmed(false)
  }

  useEffect(() => {
    void listProductCloudLanguages()
      .then((res) => {
        setLanguages(res.languages || [])
      })
      .catch(() => {
        setError(t("importLanguagesLoadFailed", locale))
      })
    // Only on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function runPreview(nextMapping?: Record<string, string | null>) {
    if (!file) {
      setError(t("importChooseFile", locale))
      return
    }
    if (!sourceLanguage) {
      setError(t("importChooseSourceLanguage", locale))
      return
    }
    setBusy(true)
    setError(null)
    setShowProductsLink(false)
    setNotice(null)
    setCommitResult(null)
    setReuseConfirmed(false)
    try {
      const res = await previewProductImportFile(
        file,
        nextMapping,
        sourceLanguage || undefined
      )
      setPreview(res)
      setMapping(nextMapping || res.mapping)
      const nextOverrides: Record<string, Record<string, string>> = {}
      for (const row of res.preview) {
        const fields: Record<string, string> = {}
        for (const field of res.category_fields || []) {
          fields[field.code] = row.values[field.code] || ""
        }
        if (row.category_resolution?.matched?.name) {
          fields.category = row.category_resolution.matched.name
        }
        if (Object.keys(fields).length) nextOverrides[String(row.row)] = fields
      }
      setRowOverrides(nextOverrides)
    } catch (err) {
      const raw =
        err instanceof ProductCloudApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : t("importPreviewFailed", locale)
      setError(sanitizeImportUserMessage(raw, t("importPreviewFailed", locale)))
    } finally {
      setBusy(false)
    }
  }

  async function runImport() {
    if (!file || !preview) return
    if (!sourceLanguage) {
      setError(t("importChooseSourceLanguage", locale))
      return
    }
    const importable =
      preview.summary.new_products + preview.summary.existing_products
    if (importable === 0) {
      setError(t("importBlockedErrors", locale))
      return
    }
    setBusy(true)
    setError(null)
    setShowProductsLink(false)
    setCommitResult(null)
    try {
      const res = await commitProductImportFile(
        file,
        mapping,
        sourceLanguage,
        rowOverrides,
        preview.summary.existing_products > 0
      )
      setCommitResult(res)
      setNotice(null)
    } catch (err) {
      const recovered = await recoverImportCommitAfterFailure(preview)
      if (recovered) {
        setCommitResult(recovered)
        setError(null)
        setNotice(null)
        return
      }
      const raw =
        err instanceof ProductCloudApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : t("importFailed", locale)
      setError(sanitizeImportUserMessage(raw, t("importFailedMaybeCreated", locale)))
      setShowProductsLink(true)
    } finally {
      setBusy(false)
    }
  }

  const mappingRows = useMemo(
    () =>
      canonical
        .filter((col) => !/^title_[a-z]{2}$/i.test(col) && !/^description_[a-z]{2}$/i.test(col))
        .map((col) => ({
          col,
          source: mapping[col] ?? "",
          category: false,
        })),
    [canonical, mapping]
  )

  return (
    <SellerGate
      breadcrumb={[
        { label: t("sellerDashboardTitle", locale), href: "/seller" },
        { label: t("sellerNavProducts", locale), href: "/seller/products" },
        { label: t("importBreadcrumb", locale) },
      ]}
    >
      <h1 className="text-[19px] font-bold text-wf-900">
        {t("importTitle", locale)}
      </h1>
      <p className="mt-1 text-xs text-wf-600">{t("importIntro", locale)}</p>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="secondary"
          onClick={() =>
            void downloadProductImportTemplate("xlsx", locale).catch((err) =>
              setError(
                err instanceof Error ? err.message : t("importDownloadFailed", locale)
              )
            )
          }
        >
          {t("importDownloadXlsx", locale)}
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() =>
            void downloadProductImportTemplate("csv", locale).catch((err) =>
              setError(
                err instanceof Error ? err.message : t("importDownloadFailed", locale)
              )
            )
          }
        >
          {t("importDownloadCsv", locale)}
        </Button>
      </div>
      <p className="mt-2 text-[11px] text-wf-600">
        {t("importTemplateHelp", locale)}
      </p>

      {error ? (
        <Notice variant="warning" className="mt-3">
          <span aria-hidden="true">⚠ </span>
          {error}
          {showProductsLink ? (
            <Link
              href="/seller/products"
              className="mt-2 block text-xs font-semibold underline"
            >
              {t("importOpenProductList", locale)}
            </Link>
          ) : null}
        </Notice>
      ) : null}
      {phase === "result" && importResult ? (
        <SellerImportResult
          locale={locale}
          result={importResult}
          onNewImport={startNewImport}
        />
      ) : notice ? (
        <Notice variant="info" className="mt-3">
          {notice}
        </Notice>
      ) : null}

      {phase !== "result" ? (
      <div className="mt-4 rounded border border-wf-300 bg-white p-3" data-import-phase="upload">
        <label className="block text-[11px] font-semibold text-wf-700">
          {t("importSourceLanguageLabel", locale)}
          <select
            className="mt-1 h-8 w-full rounded border border-wf-400 bg-white px-2 text-xs"
            value={sourceLanguage}
            onChange={(e) => setSourceLanguage(e.target.value)}
          >
            <option value="">{t("importSourceLanguagePlaceholder", locale)}</option>
            {languages.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.name} ({lang.code})
              </option>
            ))}
          </select>
        </label>
        <p className="mt-2 text-[11px] font-normal text-wf-600">
          {t("importLanguageHelper", locale)}
        </p>
        <Input
          className="mt-3"
          label={t("importFileLabel", locale)}
          type="file"
          accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          onChange={(e) => {
            const next = e.target.files?.[0] || null
            setFile(next)
            setPreview(null)
            setCommitResult(null)
            setNotice(null)
          }}
        />
        <div className="mt-3">
          <Button
            size="sm"
            disabled={!file || busy || !sourceLanguage}
            onClick={() => void runPreview()}
          >
            {busy ? t("importBusy", locale) : t("importPreviewStep", locale)}
          </Button>
        </div>
      </div>
      ) : null}

      {phase === "preview" && preview ? (
        <SellerImportPreview
          locale={locale}
          preview={preview}
          categoryOverrides={Object.fromEntries(
            Object.entries(rowOverrides)
              .filter(([, fields]) => fields.category)
              .map(([row, fields]) => [row, fields.category])
          )}
          categoryFields={categoryFields}
          categories={preview.import_categories || []}
          rowValues={rowOverrides}
          onCategoryChange={(row, value) =>
            setRowOverrides((prev) => ({
              ...prev,
              [String(row)]: { ...(prev[String(row)] || {}), category: value },
            }))
          }
          onAttributeChange={(row, code, value) =>
            setRowOverrides((prev) => ({
              ...prev,
              [String(row)]: { ...(prev[String(row)] || {}), [code]: value },
            }))
          }
          mappingRows={mappingRows}
          headers={headers}
          onMappingChange={(column, value) =>
            setMapping((prev) => ({ ...prev, [column]: value || null }))
          }
          onRefreshPreview={() => void runPreview(mapping)}
          onImport={() => void runImport()}
          busy={busy}
          importDisabled={
            busy ||
            preview.summary.new_products + preview.summary.existing_products === 0 ||
            !sourceLanguage ||
            Boolean(preview.structure_error) ||
            preview.summary.rows === 0 ||
            (preview.summary.existing_products > 0 && !reuseConfirmed)
          }
          needsReuseConfirm={preview.summary.existing_products > 0}
          reuseConfirmed={reuseConfirmed}
          onReuseConfirmed={setReuseConfirmed}
        />
      ) : null}

      <Link
        href="/seller/products"
        className="mt-4 inline-block text-xs font-semibold underline"
      >
        {t("importBackToProducts", locale)}
      </Link>
    </SellerGate>
  )
}
