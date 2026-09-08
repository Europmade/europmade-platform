"use client"

import { pickLocalized, type LocalizedString } from "../../_lib/i18n/locales"
import {
  DEFAULT_STOREFRONT_LOCALE,
  type StorefrontLocale,
} from "../../_lib/i18n/locales"
import { PublicStorefrontChrome } from "../marketplace/public-storefront-chrome"
import { CmsThemeStyle } from "../cms/cms-theme-style"
import {
  postPreviewSelect,
  useCmsPreviewHost,
} from "../../_lib/cms/use-cms-preview-host"

function asLocale(value: string | undefined): StorefrontLocale {
  if (value === "en" || value === "de" || value === "fr" || value === "nl") {
    return value
  }
  return DEFAULT_STOREFRONT_LOCALE
}

function locOf(value: unknown): LocalizedString {
  if (!value || typeof value !== "object") {
    return { nl: "", en: "", de: "", fr: "" }
  }
  const v = value as Record<string, unknown>
  return {
    nl: typeof v.nl === "string" ? v.nl : "",
    en: typeof v.en === "string" ? v.en : "",
    de: typeof v.de === "string" ? v.de : "",
    fr: typeof v.fr === "string" ? v.fr : "",
  }
}

export function PagePreviewClient() {
  const { draft, theme } = useCmsPreviewHost()
  const locale = asLocale(draft?.locale)
  const doc = draft?.document as { sections?: Array<Record<string, unknown>> } | undefined
  const sections = Array.isArray(doc?.sections) ? doc.sections : []

  return (
    <div
      className="em-cms-theme"
      onClick={(e) => {
        const el = (e.target as HTMLElement).closest("[data-cms-section]")
        if (el instanceof HTMLElement && el.dataset.cmsSection) {
          postPreviewSelect(el.dataset.cmsSection)
        }
      }}
    >
      <CmsThemeStyle theme={theme} />
      <PublicStorefrontChrome locale={locale}>
        <main className="px-4 py-8 tablet:px-8">
          {sections.length === 0 ? (
            <p className="text-[13px] text-wf-500">Geen content ingesteld</p>
          ) : (
            sections
              .filter((s) => s.visible !== false)
              .map((section) => {
                const id = String(section.id ?? "")
                const title = pickLocalized(locOf(section.title), locale)
                const body = pickLocalized(locOf(section.body), locale)
                const image = typeof section.image === "string" ? section.image : null
                const selected = draft?.selectedId === id
                return (
                  <section
                    key={id}
                    data-cms-section={id}
                    className={`mb-8 ${selected ? "outline outline-2 outline-sky-400" : ""}`}
                  >
                    {image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={image}
                        alt=""
                        className="mb-4 max-h-72 w-full rounded-xl object-cover"
                      />
                    ) : null}
                    {title ? (
                      <h2 className="text-[22px] font-bold text-wf-900 tablet:text-[28px]">
                        {title}
                      </h2>
                    ) : null}
                    {body ? (
                      <div className="mt-4 max-w-[720px] whitespace-pre-wrap text-[13.5px] leading-relaxed text-wf-700">
                        {body}
                      </div>
                    ) : (
                      <p className="mt-2 text-[13px] text-wf-500">Geen content ingesteld</p>
                    )}
                  </section>
                )
              })
          )}
        </main>
      </PublicStorefrontChrome>
    </div>
  )
}
