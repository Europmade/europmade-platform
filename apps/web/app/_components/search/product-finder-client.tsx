"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  DEFAULT_STOREFRONT_LOCALE,
  type StorefrontLocale,
} from "../../_lib/i18n/locales"
import { t, tFormat } from "../../_lib/i18n/messages"
import {
  PRODUCT_FINDER_STEPS,
  productFinderMessageKey,
  type ProductFinderOptionId,
  type ProductFinderSelectOption,
} from "../../_lib/product-finder-config"

type ProductFinderClientProps = {
  locale?: StorefrontLocale
}

function optionLabel(locale: StorefrontLocale, optionId: ProductFinderOptionId) {
  return t(productFinderMessageKey("option", optionId), locale)
}

function questionLabel(locale: StorefrontLocale, questionId: string) {
  return t(productFinderMessageKey("question", questionId), locale)
}

export function ProductFinderClient({
  locale = DEFAULT_STOREFRONT_LOCALE,
}: ProductFinderClientProps) {
  const router = useRouter()
  const [stepIndex, setStepIndex] = useState(0)
  const [usageArea, setUsageArea] = useState<ProductFinderOptionId>("any_category")
  const [query, setQuery] = useState("")
  const [countryOption, setCountryOption] = useState<ProductFinderOptionId>("country_any")
  const [verified, setVerified] = useState(false)

  const step = PRODUCT_FINDER_STEPS[stepIndex]
  const isLastStep = stepIndex === PRODUCT_FINDER_STEPS.length - 1

  const selectedUsage = useMemo(() => {
    const usageStep = PRODUCT_FINDER_STEPS.find((s) => s.id === "usage_area")
    if (usageStep?.kind !== "select") return null
    return usageStep.options.find((o) => o.id === usageArea) ?? null
  }, [usageArea])

  function reset() {
    setStepIndex(0)
    setUsageArea("any_category")
    setQuery("")
    setCountryOption("country_any")
    setVerified(false)
  }

  function submit() {
    const params = new URLSearchParams()
    if (query.trim()) params.set("q", query.trim())
    if (selectedUsage?.categorySlug) {
      params.set("categorie", selectedUsage.categorySlug)
    }
    const prefStep = PRODUCT_FINDER_STEPS.find((s) => s.id === "preferences")
    if (prefStep?.kind === "preferences") {
      const country = prefStep.countryOptions.find((o) => o.id === countryOption)
      if (country?.countryCode) params.set("country", country.countryCode)
    }
    if (verified) params.set("verified", "true")
    router.push(`/zoeken?${params.toString()}`)
  }

  function renderSelect(options: ProductFinderSelectOption[]) {
    return (
      <div className="space-y-2">
        {options.map((option) => (
          <label
            key={option.id}
            className="flex cursor-pointer items-center gap-2 rounded border border-wf-200 px-3 py-2 text-sm text-wf-800"
          >
            <input
              type="radio"
              name={step.id}
              checked={usageArea === option.id}
              onChange={() => setUsageArea(option.id)}
            />
            {optionLabel(locale, option.id)}
          </label>
        ))}
      </div>
    )
  }

  return (
    <section className="mx-auto max-w-3xl px-4 py-6 tablet:px-8">
      <h1 className="text-xl font-bold text-wf-900">{t("productFinderTitle", locale)}</h1>
      <p className="mt-1 text-sm text-wf-600">{t("productFinderIntro", locale)}</p>

      <div className="mt-4 rounded-lg border border-wf-300 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-wf-500">
          {tFormat("productFinderStepProgress", locale, {
            current: stepIndex + 1,
            total: PRODUCT_FINDER_STEPS.length,
          })}
        </p>
        <h2 className="mt-1 text-base font-semibold text-wf-900">
          {questionLabel(locale, step.id)}
        </h2>

        {step.kind === "select" ? renderSelect(step.options) : null}

        {step.kind === "text" ? (
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("searchPlaceholder", locale)}
            className="mt-3 h-10 w-full rounded border border-wf-300 px-3 text-sm"
          />
        ) : null}

        {step.kind === "preferences" ? (
          <div className="mt-3 space-y-3">
            <div className="space-y-2">
              {step.countryOptions.map((option) => (
                <label
                  key={option.id}
                  className="flex cursor-pointer items-center gap-2 rounded border border-wf-200 px-3 py-2 text-sm text-wf-800"
                >
                  <input
                    type="radio"
                    name="country"
                    checked={countryOption === option.id}
                    onChange={() => setCountryOption(option.id)}
                  />
                  {optionLabel(locale, option.id)}
                </label>
              ))}
            </div>
            <label className="flex items-center gap-2 text-sm text-wf-700">
              <input
                type="checkbox"
                checked={verified}
                onChange={(e) => setVerified(e.target.checked)}
              />
              {t("verifiedOnly", locale)}
            </label>
          </div>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-2">
          {stepIndex > 0 ? (
            <button
              type="button"
              onClick={() => setStepIndex((i) => i - 1)}
              className="rounded border border-wf-300 px-3 py-2 text-sm"
            >
              {t("commonPrevious", locale)}
            </button>
          ) : null}
          {!isLastStep ? (
            <button
              type="button"
              onClick={() => setStepIndex((i) => i + 1)}
              className="rounded bg-wf-900 px-3 py-2 text-sm font-semibold text-white"
            >
              {t("commonNext", locale)}
            </button>
          ) : (
            <button
              type="button"
              onClick={submit}
              className="rounded bg-wf-900 px-3 py-2 text-sm font-semibold text-white"
            >
              {t("productFinderShowResults", locale)}
            </button>
          )}
          <button
            type="button"
            onClick={reset}
            className="rounded border border-wf-300 px-3 py-2 text-sm text-wf-600"
          >
            {t("productFinderRestart", locale)}
          </button>
        </div>
      </div>
    </section>
  )
}
