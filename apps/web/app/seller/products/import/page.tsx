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

  const canonical = preview?.canonical_columns || []
  const categoryFields = preview?.category_fields || []
  const headers = preview?.headers || []

  useEffect(() => {
    void listProductCloudLanguages()
      .then((res) => {
        setLanguages(res.languages || [])
      })
      .catch(() => {
        setError("Talenlijst kon niet worden geladen.")
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
      setError("Kies in welke taal de ingevulde productgegevens zijn geschreven.")
      return
    }
    setBusy(true)
    setError(null)
    setShowProductsLink(false)
    setNotice(null)
    setCommitResult(null)
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
      setError("Kies in welke taal de ingevulde productgegevens zijn geschreven.")
      return
    }
    if (preview.summary.error_rows > 0) {
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
        rowOverrides
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
      <h1 className="text-[19px] font-bold text-wf-900">Producten importeren</h1>
      <p className="mt-1 text-xs text-wf-600">
        Eén bestand, één brontaal. Vul titel en beschrijving in die taal in —
        geen aparte Engelse of Duitse kolommen. Na import vertaalt de bestaande
        AI-flow naar de vereiste doeltalen. Zonder EAN wordt een Concept
        aangemaakt (titel, merk, categorie verplicht). EAN/GTIN is verplicht vóór
        indienen, goedkeuring, publicatie en verkoop.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="secondary"
          onClick={() =>
            void downloadProductImportTemplate("xlsx").catch((err) =>
              setError(
                err instanceof Error ? err.message : t("importDownloadFailed", locale)
              )
            )
          }
        >
          EuropMade product template.xlsx
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() =>
            void downloadProductImportTemplate("csv").catch((err) =>
              setError(
                err instanceof Error ? err.message : t("importDownloadFailed", locale)
              )
            )
          }
        >
          EuropMade product import.csv
        </Button>
      </div>
      <p className="mt-2 text-[11px] text-wf-600">
        Rood = verplicht bij aanmaken, lichtblauw = optioneel, geel =
        voorwaardelijk verplicht. CE-/MiE-/GPSR-bewijs en handleidingen: via de
        seller-wizard uploaden, niet via Excel. Categoriekenmerken vul je in
        stap 2 na de preview.
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
      {commitResult ? (
        <div className="mt-3 rounded border border-wf-400 bg-white p-3">
          <h2 className="flex items-center gap-2 text-sm font-bold text-wf-900">
            <span aria-hidden="true">
              {(commitResult.warning_count ?? 0) > 0 ? "!" : "✓"}
            </span>
            {(commitResult.warning_count ?? 0) > 0
              ? t("importSucceededWithWarnings", locale)
              : t("importSucceeded", locale)}
          </h2>
          <ul className="mt-2 space-y-1 text-xs text-wf-800">
            <li>
              {t("importCreatedCount", locale).replace(
                "{count}",
                String(commitResult.created_count ?? commitResult.imported)
              )}
            </li>
            <li>
              {t("importUpdatedCount", locale).replace(
                "{count}",
                String(commitResult.updated_count ?? commitResult.updated)
              )}
            </li>
            <li>
              {t("importWarningCount", locale).replace(
                "{count}",
                String(commitResult.warning_count ?? 0)
              )}
            </li>
            <li>
              {t("importSkippedCount", locale).replace(
                "{count}",
                String(commitResult.skipped_count ?? 0)
              )}
            </li>
            <li>
              {t("importErrorCount", locale).replace(
                "{count}",
                String(commitResult.error_count ?? 0)
              )}
            </li>
          </ul>
          {commitResult.products?.length ? (
            <ul className="mt-3 space-y-3">
              {commitResult.products.map((product) => (
                <li
                  key={product.product_id}
                  className="rounded border border-wf-200 p-2 text-xs text-wf-800"
                >
                  <p>
                    Productnaam:{" "}
                    <span className="font-semibold">{product.title || "—"}</span>
                  </p>
                  <p>
                    {t("importCategoryFromExcel", locale)}:{" "}
                    {product.category_raw || "—"}
                  </p>
                  <p>
                    Status: {product.publication_status || t("importStatusConcept", locale)}
                    {product.lifecycle_status
                      ? ` · ${product.lifecycle_status}`
                      : ""}
                  </p>
                  {product.category_status === "category_pending" ? (
                    <p className="mt-1">
                      <span aria-hidden="true">⚠ </span>
                      {t("importActionChooseCategory", locale)}
                      {product.category_suggestions?.length
                        ? ` Voorstellen: ${product.category_suggestions.join(", ")}.`
                        : ""}
                    </p>
                  ) : null}
                  {product.warning && product.category_status !== "category_pending" ? (
                    <p className="mt-1">
                      <span aria-hidden="true">⚠ </span>
                      {product.warning}
                    </p>
                  ) : null}
                  <Link
                    href={`/seller/products/${product.product_id}`}
                    className="mt-2 inline-block text-xs font-semibold underline"
                  >
                    {t("importViewProduct", locale)}
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
          {commitResult.products?.some(
            (p) => p.category_status === "category_pending"
          ) ? (
            <div className="mt-3 text-xs text-wf-800">
              <p className="font-semibold">
                {t("importCategoryPendingList", locale)}
              </p>
              <ul className="mt-1 list-disc pl-4">
                {commitResult.products
                  .filter((p) => p.category_status === "category_pending")
                  .map((p) => (
                    <li key={`pending-${p.product_id}`}>
                      {p.title || p.product_id}
                    </li>
                  ))}
              </ul>
            </div>
          ) : null}
          {commitResult.errors?.length ? (
            <ul className="mt-2 text-xs text-amber-900">
              {commitResult.errors.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : notice ? (
        <Notice variant="info" className="mt-3">
          {notice}
        </Notice>
      ) : null}

      <div className="mt-4 rounded border border-wf-300 bg-white p-3">
        <label className="block text-[11px] font-semibold text-wf-700">
          In welke taal zijn de ingevulde productgegevens geschreven?
          <select
            className="mt-1 h-8 w-full rounded border border-wf-400 bg-white px-2 text-xs"
            value={sourceLanguage}
            onChange={(e) => setSourceLanguage(e.target.value)}
          >
            <option value="">— kies een taal —</option>
            {languages.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.name} ({lang.code})
              </option>
            ))}
          </select>
        </label>
        <Input
          className="mt-3"
          label="Eigen CSV of XLSX"
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
            {busy ? "Bezig…" : "Stap 1: Preview"}
          </Button>
        </div>
      </div>

      {preview ? (
        <div className="mt-4 space-y-3">
          <div className="rounded border border-wf-300 bg-white p-3 text-xs">
            <p>
              {preview.summary.rows} gegevensregel(s) · {preview.summary.new_products}{" "}
              over te nemen nieuw · {preview.summary.existing_products} bestaand ·{" "}
              {preview.summary.error_rows} fouten ·{" "}
              {preview.summary.skipped_empty ?? 0} lege regel(s) overgeslagen
              {sourceLanguage
                ? ` · brontaal ${
                    languages.find((l) => l.code === sourceLanguage)?.name ||
                    sourceLanguage
                  }`
                : ""}
            </p>
            {preview.structure_error ? (
              <p className="mt-1 text-amber-800">{preview.structure_error}</p>
            ) : null}
            {preview.unknown_columns?.length ? (
              <p className="mt-1 text-wf-600">
                Onbekende kolommen (geen extra producten):{" "}
                {preview.unknown_columns.join(", ")}
              </p>
            ) : null}
          </div>

          {preview.preview.length ? (
            <div className="rounded border border-wf-300 bg-white p-3">
              <h2 className="text-xs font-bold text-wf-900">
                Gegevensregels (één regel = één product)
              </h2>
              <ul className="mt-2 space-y-2 text-[11px] text-wf-700">
                {preview.preview.map((row, index) => {
                  const resolution = row.category_resolution
                  const statusLabel =
                    resolution?.status === "linked"
                      ? "Gekoppeld"
                      : resolution?.status === "suggested"
                        ? "Categorievoorstel beschikbaar"
                        : "Categorie moet worden toegewezen"
                  return (
                    <li
                      key={`${row.row}-${index}`}
                      className="rounded border border-wf-200 p-2"
                    >
                      <p>
                        Excel-regel {row.row} → Product {index + 1}
                        {row.values.title
                          ? `: ${row.values.title}`
                          : " — geen productnaam gelezen"}{" "}
                        <span className="text-wf-500">({row.status})</span>
                      </p>
                      <p className="mt-1">
                        Categorie in Excel:{" "}
                        <span className="font-semibold">
                          {resolution?.raw || row.values.category_raw || "—"}
                        </span>
                      </p>
                      <p>
                        EuropMade-categorie:{" "}
                        {resolution?.matched?.name || "—"} · {statusLabel}
                      </p>
                      {resolution?.suggestions?.length ? (
                        <p className="text-wf-600">
                          Voorstellen:{" "}
                          {resolution.suggestions.map((s) => s.name).join(", ")}
                        </p>
                      ) : null}
                      <label className="mt-1 block">
                        Categorie later kiezen
                        <select
                          className="mt-1 h-7 w-full max-w-md rounded border border-wf-400 bg-white px-1"
                          value={
                            rowOverrides[String(row.row)]?.category ||
                            resolution?.matched?.name ||
                            ""
                          }
                          onChange={(e) =>
                            setRowOverrides((prev) => ({
                              ...prev,
                              [String(row.row)]: {
                                ...(prev[String(row.row)] || {}),
                                category: e.target.value,
                              },
                            }))
                          }
                        >
                          <option value="">
                            — kies een EuropMade-categorie —
                          </option>
                          {(preview.import_categories || []).map((cat) => (
                            <option key={cat.id} value={cat.name}>
                              {cat.name}
                            </option>
                          ))}
                        </select>
                      </label>
                    </li>
                  )
                })}
              </ul>
            </div>
          ) : null}

          <div className="rounded border border-wf-300 bg-white p-3">
            <h2 className="text-xs font-bold text-wf-900">Kolommatching</h2>
            <div className="mt-2 grid gap-2 tablet:grid-cols-2">
              {mappingRows.map((row) => {
                const label = preview.field_labels?.find((f) => f.column === row.col)
                const fieldLabel = label
                  ? `${label.nl_name} (${label.required})`
                  : row.col
                return (
                  <label key={row.col} className="text-[11px] text-wf-700">
                    <span className="mb-1 block font-semibold uppercase tracking-[0.04em] text-wf-500">
                      {fieldLabel}
                    </span>
                    <select
                      className="h-8 w-full rounded border border-wf-400 bg-white px-2 text-xs"
                      value={row.source}
                      onChange={(e) =>
                        setMapping((prev) => ({
                          ...prev,
                          [row.col]: e.target.value || null,
                        }))
                      }
                    >
                      <option value="">— niet gekoppeld —</option>
                      {headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </label>
                )
              })}
            </div>
            <Button
              size="sm"
              variant="secondary"
              className="mt-3"
              disabled={busy}
              onClick={() => void runPreview(mapping)}
            >
              Preview verversen
            </Button>
          </div>

          {categoryFields.length ? (
            <div className="rounded border border-wf-300 bg-white p-3">
              <h2 className="text-xs font-bold text-wf-900">
                Stap 2: Categoriekenmerken
              </h2>
              <p className="mt-1 text-[11px] text-wf-600">
                Herkend: {preview.detected_categories?.join(", ")}. Vul deze
                velden aan vóór je het product later ter controle indient.
              </p>
              <div className="mt-2 overflow-x-auto">
                <table className="min-w-full text-[11px]">
                  <thead>
                    <tr className="text-left text-wf-500">
                      <th className="pr-2">Rij</th>
                      {categoryFields.map((field) => (
                        <th key={field.code} className="pr-2">
                          {field.name}
                          {field.requirement_tier === "category_required"
                            ? " (voorwaardelijk verplicht)"
                            : " (optioneel)"}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.preview.map((row) => (
                      <tr key={row.row}>
                        <td className="pr-2 align-top">{row.row}</td>
                        {categoryFields.map((field) => (
                          <td key={field.code} className="pr-2 pb-1">
                            <input
                              className="h-7 w-full rounded border border-wf-400 px-1"
                              value={
                                rowOverrides[String(row.row)]?.[field.code] ?? ""
                              }
                              onChange={(e) =>
                                setRowOverrides((prev) => ({
                                  ...prev,
                                  [String(row.row)]: {
                                    ...(prev[String(row.row)] || {}),
                                    [field.code]: e.target.value,
                                  },
                                }))
                              }
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : preview.detected_categories?.length ? (
            <p className="text-[11px] text-wf-600">
              Categorie {preview.detected_categories.join(", ")} heeft geen extra
              cataloguskenmerken in deze algemene import.
            </p>
          ) : null}

          {preview.preview.some((p) => p.issues.length) ? (
            <div className="rounded border border-amber-300 bg-amber-50 p-3 text-[11px] text-amber-900">
              {preview.preview
                .filter((p) => p.issues.length)
                .slice(0, 20)
                .map((p) => (
                  <p key={p.row}>
                    Rij {p.row}
                    {p.issues[0]?.field ? `, veld ${p.issues[0].field}` : ""}:{" "}
                    {p.issues.map((i) => i.message).join("; ")}
                  </p>
                ))}
            </div>
          ) : null}

          <Button
            size="sm"
            disabled={
              busy ||
              preview.summary.error_rows > 0 ||
              !sourceLanguage ||
              Boolean(preview.structure_error) ||
              preview.summary.rows === 0
            }
            onClick={() => void runImport()}
          >
            Importeren
          </Button>
          {!sourceLanguage ? (
            <p className="text-[11px] text-amber-800">
              Kies eerst de brontaal voordat je importeert.
            </p>
          ) : null}
        </div>
      ) : null}

      <Link
        href="/seller/products"
        className="mt-4 inline-block text-xs font-semibold underline"
      >
        Terug naar producten
      </Link>
    </SellerGate>
  )
}
