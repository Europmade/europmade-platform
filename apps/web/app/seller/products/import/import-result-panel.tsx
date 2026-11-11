"use client"

import Link from "next/link"
import { Button } from "@europmade/ui"
import { t } from "../../../_lib/i18n/messages"
import type { StorefrontLocale } from "../../../_lib/i18n/locales"
import type {
  ImportResultItem,
  ImportResultRow,
  ImportResultView,
} from "./import-result-model"

const TONE_CLASS = {
  green: "border-green-200 bg-green-50 text-green-800",
  orange: "border-amber-200 bg-amber-50 text-amber-900",
  red: "border-red-200 bg-red-50 text-red-800",
} as const

function toneLabel(tone: ImportResultRow["tone"], locale: StorefrontLocale) {
  if (tone === "green") return t("importToneComplete", locale)
  if (tone === "orange") return t("importToneAttention", locale)
  return t("importToneFailed", locale)
}

function stepLabel(item: ImportResultItem, locale: StorefrontLocale) {
  if (item.kind === "category") return t("importWarningCategory", locale)
  if (item.step === "sale") return t("importGapSale", locale)
  if (item.step === "publication") return t("importGapPublication", locale)
  if (item.step === "submit") return t("importGapSubmit", locale)
  if (item.step === "create") return t("importGapCreate", locale)
  if (item.step === "followup") return t("importFollowUpShipping", locale)
  if (item.step === "optional") return t("importOptionalHint", locale)
  if (item.kind === "brand") return t("importWarningBrand", locale)
  if (item.kind === "category") return t("importWarningCategory", locale)
  return t("importWarningGeneric", locale)
}

function shortList(items: ImportResultItem[], empty: string) {
  if (!items.length) return empty
  return items
    .map((item) => item.label)
    .filter(Boolean)
    .join(", ") || empty
}

export function SellerImportResult({
  locale,
  result,
  onNewImport,
}: {
  locale: StorefrontLocale
  result: ImportResultView
  onNewImport: () => void
}) {
  const { summary, rows } = result
  const total = Math.max(summary.processedRows, 1)
  const headline =
    summary.importedProducts === 1
      ? t("importStoredOne", locale)
      : t("importStoredMany", locale).replace(
          "{count}",
          String(summary.importedProducts)
        )
  return (
    <section className="mt-4 rounded border border-wf-300 bg-white p-3" data-import-phase="result">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-wf-900">{t("importResultTitle", locale)}</h2>
          <p className="mt-1 text-sm font-semibold text-wf-900">{headline}</p>
        </div>
        <Button size="sm" variant="secondary" onClick={onNewImport}>
          {t("importStartNew", locale)}
        </Button>
      </div>

      <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-wf-100" role="img" aria-label={headline}>
        <span className="bg-green-600" style={{ width: `${(summary.green / total) * 100}%` }} />
        <span className="bg-amber-500" style={{ width: `${(summary.orange / total) * 100}%` }} />
        <span className="bg-red-600" style={{ width: `${(summary.red / total) * 100}%` }} />
      </div>
      <div className="mt-2 grid gap-1 text-[11px] text-wf-700 tablet:grid-cols-3">
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
      <p className="mt-2 text-[11px] leading-5 text-wf-600">
        {t("importCountBreakdown", locale)
          .replace("{rows}", String(summary.processedRows))
          .replace("{created}", String(summary.createdProducts))
          .replace("{reused}", String(summary.reusedProducts))
          .replace("{updated}", String(summary.updatedProducts))
          .replace("{newOffers}", String(summary.newOffers))
          .replace("{updatedOffers}", String(summary.updatedOffers))
          .replace("{skipped}", String(summary.skippedRows))
          .replace("{errors}", String(summary.errorRows))}
      </p>

      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-left text-[11px]">
          <thead>
            <tr className="border-b border-wf-200 text-[10px] uppercase tracking-wide text-wf-500">
              <th className="px-2 py-1.5 font-semibold">{t("importProductName", locale)}</th>
              <th className="px-2 py-1.5 font-semibold">{t("importColEan", locale)}</th>
              <th className="px-2 py-1.5 font-semibold">{t("importColBrand", locale)}</th>
              <th className="px-2 py-1.5 font-semibold">{t("importColCategory", locale)}</th>
              <th className="px-2 py-1.5 font-semibold">{t("importStatusLabel", locale)}</th>
              <th className="px-2 py-1.5 font-semibold">{t("importColRequired", locale)}</th>
              <th className="px-2 py-1.5 font-semibold">{t("importColOptional", locale)}</th>
              <th className="px-2 py-1.5 font-semibold">{t("importColDetails", locale)}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <ResultRow key={row.key} row={row} locale={locale} />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function ResultRow({
  row,
  locale,
}: {
  row: ImportResultRow
  locale: StorefrontLocale
}) {
  const requiredText =
    row.tone === "red"
      ? row.errorReason || t("importRowNotProcessed", locale)
      : shortList(row.required, t("importNothingRequired", locale))
  const optionalText = shortList(row.optional, "—")
  const category = row.europmadeCategory
    ? row.europmadeCategory
    : row.categoryUncertain && row.excelCategory
      ? t("importCategoryUnmatched", locale).replace("{name}", row.excelCategory)
      : row.excelCategory || "—"
  return (
    <>
      <tr className="border-b border-wf-100 align-top text-wf-800">
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
        <td className="px-2 py-1.5">{requiredText}</td>
        <td className="px-2 py-1.5">{optionalText}</td>
        <td className="px-2 py-1.5">
          <details>
            <summary className="cursor-pointer font-semibold text-wf-700">
              {t("importExpandRow", locale)}
            </summary>
            <div className="mt-2 space-y-2 text-wf-700">
              <DetailList
                title={t("importRequiredHeading", locale)}
                items={row.required}
                empty={t("importNothingRequired", locale)}
                locale={locale}
              />
              <DetailList
                title={t("importOptionalHeading", locale)}
                items={row.optional}
                empty={t("importOptionalEmpty", locale)}
                locale={locale}
              />
              <DetailList
                title={t("importWarningsHeading", locale)}
                items={row.warnings}
                empty={t("importWarningsEmpty", locale)}
                locale={locale}
              />
              {row.followUps.length ? (
                <DetailList
                  title={t("importFollowUpHeading", locale)}
                  items={row.followUps}
                  empty=""
                  locale={locale}
                />
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
              {row.productId ? (
                <Link
                  href={`/seller/products/${row.productId}`}
                  className="inline-block font-semibold text-wf-900 underline"
                >
                  {t("importViewImportedProduct", locale)}
                </Link>
              ) : null}
            </div>
          </details>
        </td>
      </tr>
    </>
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
                      (item.kind === "category"
                        ? t("importEuropMadeCategory", locale)
                        : "—")}
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
