"use client"

import type { CmsLocale } from "../../lib/cms-i18n"
import {
  pickLoc,
  SECTION_LABELS,
  type HomepageCmsDoc,
} from "../../lib/cms-homepage-document"
import { CmsPreviewFrame } from "./cms-preview-frame"

export function CmsHomepagePreview({
  doc,
  locale,
  viewport,
}: {
  doc: HomepageCmsDoc
  locale: CmsLocale
  viewport: "desktop" | "mobile"
}) {
  const hero = doc.hero
  const sections = [...doc.sections].sort((a, b) => a.sortOrder - b.sortOrder)

  return (
    <CmsPreviewFrame viewport={viewport}>
      <div className="min-h-[320px] bg-white text-wf-800">
        {hero.visible ? (
          <section
            className="border-b border-wf-100 px-4 py-5"
            style={{ background: hero.backgroundGradient }}
          >
            {hero.heroImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={hero.heroImage}
                alt={pickLoc(hero.heroImageAlt, locale)}
                className="mb-3 max-h-40 w-full rounded-lg object-cover"
              />
            ) : null}
            <h1 className="max-w-[36rem] text-[22px] font-bold leading-tight text-wf-900">
              {pickLoc(hero.title, locale)}
            </h1>
            <p className="mt-2 max-w-[34rem] text-[13px] text-wf-600">
              {pickLoc(hero.subtitle, locale)}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="inline-flex h-9 items-center rounded-xl bg-wf-900 px-3.5 text-[12.5px] font-semibold text-white">
                {pickLoc(hero.cta1.label, locale)}
              </span>
              <span className="inline-flex h-9 items-center rounded-xl border border-wf-300 bg-white px-3.5 text-[12.5px] font-semibold text-wf-800">
                {pickLoc(hero.cta2.label, locale)}
              </span>
            </div>
          </section>
        ) : null}

        {sections
          .filter((s) => s.visible)
          .map((section) => (
            <section
              key={section.id}
              className="border-b border-wf-50 px-4 py-4"
            >
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-wf-400">
                {SECTION_LABELS[section.key]}
              </p>
              <h2 className="text-base font-bold text-wf-900">
                {pickLoc(section.title, locale)}
              </h2>
              {section.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={section.image}
                  alt=""
                  className="mt-2 max-h-32 w-full rounded object-cover"
                />
              ) : null}
              {pickLoc(section.subtitle, locale) ? (
                <p className="mt-1 text-[12px] text-wf-600">
                  {pickLoc(section.subtitle, locale)}
                </p>
              ) : null}
              {section.body && pickLoc(section.body, locale) ? (
                <p className="mt-2 whitespace-pre-wrap text-[13px] text-wf-700">
                  {pickLoc(section.body, locale)}
                </p>
              ) : null}
            </section>
          ))}
      </div>
    </CmsPreviewFrame>
  )
}
