"use client"

import { useMemo } from "react"
import { Button } from "@europmade/ui"
import { t } from "../../../_lib/i18n/messages"
import type { StorefrontLocale } from "../../../_lib/i18n/locales"
import {
  buildSellerImportPreview,
  type ImportResultItem,
  type ImportResultRow,
  type SellerImportPreview,
} from "./import-result-model"

const TONE_CLASS = {
  green: "border-green-200 bg-green-50 text-green-800",
  orange: "border-amber-200 bg-amber-50 text-amber-900",
  red: "border-red-200 bg-red-50 text-red-800",
} as const

type CategoryField = {
  code: string
  name: string
  requirement_tier?: string
  option_values?: string[] | null
}

function toneLabel(tone: ImportResultRow["tone"], locale: StorefrontLocale) {
  if (tone === "green") return t("importToneComplete", locale)
  if (tone === "orange") return t("importToneAttention", locale)
  return t("importToneFailed", locale)
}

function stepLabel(item: ImportResultItem, locale: StorefrontLocale) {
  if (item.kind === "category") return t("importWarningCategory", locale)
  if (item.kind === "brand") return t("importWarningBrand", locale)
  if (item.step === "sale") return t("importGapSale", locale)
  if (item.step === "publication") return t("importGapPublication", locale)
  if (item.step === "submit") return t("importGapSubmit", locale)
  if (item.step === "followup") return t("importFollowUpShipping", locale)
  if (item.step === "optional") return t("importOptionalHint", locale)
  if (item.step === "warning") return t("importWarningGeneric", locale)
  return t("importGapCreate", locale)
}

export function SellerImportPreview({
  locale,
  preview,
  categoryOverrides,
  categoryFields,
  categories,
  rowValues,
  onCategoryChange,
  onAttributeChange,
  mappingRows,
  headers,
  onMappingChange,
  onRefreshPreview,
  onImport,
  busy,
  importDisabled,
  needsReuseConfirm,
  reuseConfirmed,
  onReuseConfirmed,
}: {
  locale: StorefrontLocale
  preview: SellerImportPreview
  categoryOverrides: Record<string, string>
  categoryFields: CategoryField[]
  categories: Array<{ id: string; name: string }>
  rowValues: Record<string, Record<string, string>>
  onCategoryChange: (row: number, value: string) => void
  onAttributeChange: (row: number, code: string, value: string) => void
  mappingRows: Array<{ col: string; source: string }>
  headers: string[]
  onMappingChange: (column: string, value: string) => void
  onRefreshPreview: () => void
  onImport: () => void
  busy: boolean
  importDisabled: boolean
  needsReuseConfirm: boolean
  reuseConfirmed: boolean
  onReuseConfirmed: (value: boolean) => void
}) {
  const result = useMemo(
    () => buildSellerImportPreview(preview, categoryOverrides),
    [preview, categoryOverrides]
  )
  const { summary } = result
  const plain = t("importPreviewPlain", locale)
    .replace("{products}", String(summary.processedRows))
    .replace("{existing}", String(summary.reusedProducts))
    .replace("{newOffers}", String(summary.newOffers))
    .replace("{problems}", String(summary.red))
  const willCreate = t("importWillCreate", locale)
    .replace("{created}", String(summary.createdProducts))
    .replace("{newOffers}", String(summary.newOffers))
    .replace("{reused}", String(summary.reusedProducts))
    .replace("{updatedOffers}", String(summary.updatedOffers))
  const total = Math.max(summary.processedRows, 1)
  const fieldLabels = new Map(
    (preview.field_labels || []).map((field) => [field.column, field.nl_name])
  )

  return (
    <div className="mt-4 space-y-3" data-import-phase="preview">
      <section className="rounded border border-wf-300 bg-white p-3">
        <h2 className="text-sm font-bold text-wf-900">{t("importDataRowsHeading", locale)}</h2>
        <p className="mt-1 text-sm text-wf-800">{plain}</p>
        <div
          className="mt-3 flex h-2 overflow-hidden rounded-full bg-wf-100"
          role="img"
          aria-label={plain}
        >
          <span className="bg-green-600" style={{ width: `${(summary.green / total) * 100}%` }} />
          <span className="bg-amber-500" style={{ width: `${(summary.orange / total) * 100}%` }} />
          <span className="bg-red-600" style={{ width: `${(summary.red / total) * 100}%` }} />
        </div>
        <div className="mt-2 grid gap-1 text-[11px] tablet:grid-cols-3">
          <p className="text-green-800">
            {t("importCountComplete", locale).replace("{count}", String(summary.green))}
          </p>
          <p className="text-amber-800">
            {t("importCountAttention", locale).replace("{count}", String(summary.orange))}
          </p>
          <p className="text-red-800">
            {t("importCountFailed", locale).replace("{count}", String(summary.red))}
          </p>
        </div>
        <p className="mt-2 text-[11px] leading-5 text-wf-700">{willCreate}</p>
        {needsReuseConfirm ? (
          <label className="mt-3 flex items-start gap-2 text-xs text-wf-800">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={reuseConfirmed}
              onChange={(event) => onReuseConfirmed(event.target.checked)}
            />
            <span>{t("importReuseConfirm", locale)}</span>
          </label>
        ) : null}
        <div className="mt-3">
          <Button size="sm" disabled={importDisabled || busy} onClick={onImport}>
            {busy ? t("importBusy", locale) : t("importSubmit", locale)}
          </Button>
        </div>
      </section>

      <div className="overflow-x-auto rounded border border-wf-300 bg-white">
        <table className="w-full min-w-[720px] border-collapse text-left text-[11px]" data-preview-table="true">
          <thead>
            <tr className="border-b border-wf-200 text-[10px] uppercase tracking-wide text-wf-500">
              <th className="px-2 py-1.5 font-semibold">{t("importProductName", locale)}</th>
              <th className="px-2 py-1.5 font-semibold">{t("importColEan", locale)}</th>
              <th className="px-2 py-1.5 font-semibold">{t("importColBrand", locale)}</th>
              <th className="px-2 py-1.5 font-semibold">{t("importColCategory", locale)}</th>
              <th className="px-2 py-1.5 font-semibold">{t("importStatusLabel", locale)}</th>
              <th className="px-2 py-1.5 font-semibold">{t("importColDetails", locale)}</th>
            </tr>
          </thead>
          <tbody>
            {result.rows.map((row) => {
              const category = row.europmadeCategory
                ? row.europmadeCategory
                : row.categoryUncertain && row.excelCategory
                  ? t("importCategoryUnmatched", locale).replace("{name}", row.excelCategory)
                  : row.excelCategory || "—"
              const values = rowValues[String(row.row)] || {}
              return (
                <tr key={row.key} className="border-b border-wf-100 align-top text-wf-800">
                  <td className="px-2 py-1.5 font-semibold text-wf-900">
                    {row.title || t("importNoProductName", locale)}
                  </td>
                  <td className="px-2 py-1.5 font-mono">{row.ean || "—"}</td>
                  <td className="px-2 py-1.5">{row.brand || "—"}</td>
                  <td className="px-2 py-1.5">{category}</td>
                  <td className="px-2 py-1.5">
                    <span className={`inline-block rounded-full border px-2 py-0.5 font-semibold ${TONE_CLASS[row.tone]}`}>
                      {toneLabel(row.tone, locale)}
                    </span>
                  </td>
                  <td className="px-2 py-1.5">
                    <details>
                      <summary className="cursor-pointer font-semibold text-wf-700">
                        {t("importExpandRow", locale)}
                      </summary>
                      <div className="mt-2 max-w-md space-y-2">
                        <DetailList title={t("importRequiredHeading", locale)} items={row.required} empty={t("importNothingRequired", locale)} locale={locale} />
                        <DetailList title={t("importOptionalHeading", locale)} items={row.optional} empty={t("importOptionalEmpty", locale)} locale={locale} />
                        <DetailList title={t("importWarningsHeading", locale)} items={row.warnings} empty={t("importWarningsEmpty", locale)} locale={locale} />
                        {row.followUps.length ? (
                          <DetailList title={t("importFollowUpHeading", locale)} items={row.followUps} empty="" locale={locale} />
                        ) : null}
                        {row.tone === "red" ? (
                          <p>{row.errorReason || t("importRowNotProcessed", locale)}</p>
                        ) : null}
                        <p className="text-wf-500">{t("importOptionalNotBlocking", locale)}</p>
                        {row.excelCategory ? (
                          <p>
                            {t("importCategoryInExcel", locale)}: {row.excelCategory}
                          </p>
                        ) : null}
                        {row.categoryUncertain ? (
                          <label className="block">
                            {t("importChooseCategoryLater", locale)}
                            <select
                              className="mt-1 h-7 w-full rounded border border-wf-400 bg-white px-1"
                              value={values.category || ""}
                              onChange={(event) => onCategoryChange(row.row, event.target.value)}
                            >
                              <option value="">{t("importChooseCategoryPlaceholder", locale)}</option>
                              {categories.map((cat) => (
                                <option key={cat.id} value={cat.name}>
                                  {cat.name}
                                </option>
                              ))}
                            </select>
                          </label>
                        ) : null}
                        {categoryFields.map((field) => {
                          const options = field.option_values || []
                          const value = values[field.code] || ""
                          return (
                            <label key={field.code} className="block">
                              {field.name}{" "}
                              {field.requirement_tier === "category_required"
                                ? t("importConditionallyRequired", locale)
                                : t("importOptional", locale)}
                              {options.length ? (
                                <select
                                  className="mt-1 h-7 w-full rounded border border-wf-400 bg-white px-1"
                                  value={value}
                                  onChange={(event) =>
                                    onAttributeChange(row.row, field.code, event.target.value)
                                  }
                                >
                                  <option value="">—</option>
                                  {options.map((opt) => (
                                    <option key={opt} value={opt}>
                                      {opt}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <input
                                  className="mt-1 h-7 w-full rounded border border-wf-400 px-1"
                                  value={value}
                                  onChange={(event) =>
                                    onAttributeChange(row.row, field.code, event.target.value)
                                  }
                                />
                              )}
                            </label>
                          )
                        })}
                      </div>
                    </details>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <details className="rounded border border-wf-300 bg-white p-3" data-advanced-columns="true">
        <summary className="cursor-pointer text-xs font-bold text-wf-900">
          {t("importAdvancedColumns", locale)}
        </summary>
        <p className="mt-2 text-[11px] text-wf-600">{t("importAdvancedColumnsHelp", locale)}</p>
        <div className="mt-2 grid gap-2 tablet:grid-cols-2">
          {mappingRows.map((mapping) => (
            <label key={mapping.col} className="text-[11px] text-wf-700">
              <span className="mb-1 block font-semibold text-wf-800">
                {fieldLabels.get(mapping.col) || mapping.col}
              </span>
              <select
                className="h-8 w-full rounded border border-wf-400 bg-white px-2 text-xs"
                value={mapping.source}
                onChange={(event) => onMappingChange(mapping.col, event.target.value)}
              >
                <option value="">{t("importNotMapped", locale)}</option>
                {headers.map((header) => (
                  <option key={header} value={header}>
                    {header}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
        <Button
          size="sm"
          variant="secondary"
          className="mt-3"
          disabled={busy}
          onClick={onRefreshPreview}
        >
          {t("importRefreshPreview", locale)}
        </Button>
      </details>
    </div>
  )
}

function DetailList({
  title,
  items,
  empty,
  locale,
}: {
  title: string
  items: ImportResultItem[]
  empty: string
  locale: StorefrontLocale
}) {
  return (
    <div>
      <p className="font-semibold text-wf-900">{title}</p>
      {items.length ? (
        <ul className="mt-1 list-disc pl-4">
          {items.map((item, index) => (
            <li key={`${item.label}-${item.step}-${index}`}>
              {item.step === "followup" ? (
                <>
                  <span className="font-semibold">{item.label}</span>
                  {" – "}
                  {stepLabel(item, locale)}
                </>
              ) : (
                <>
                  <span className="font-semibold">
                    {item.label ||
                      (item.kind === "category" ? t("importEuropMadeCategory", locale) : "—")}
                  </span>
                  {". "}
                  {stepLabel(item, locale)}
                </>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p>{empty}</p>
      )}
    </div>
  )
}
