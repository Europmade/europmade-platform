"use client"

import { emptyLocalized, type LocalizedCms } from "../../lib/cms-admin-api"
import {
  CMS_ICON_KEYS,
  CMS_ICON_LABELS,
  type CmsCtaVariant,
  type CmsFunnelStageKind,
  type CmsPageSection,
  type PageSectionKey,
} from "../../lib/cms-page-document"
import type { CmsI18nMeta } from "../../lib/cms-i18n"
import { CmsLocalizedField } from "./cms-localized-field"
import { CmsLocalizedRichTextField } from "./cms-localized-rich-text-field"

type Props = {
  section: CmsPageSection
  meta: CmsI18nMeta
  onMetaChange: (meta: CmsI18nMeta) => void
  onChange: (next: CmsPageSection) => void
}

function updateItem(
  section: CmsPageSection,
  id: string,
  patch: Partial<NonNullable<CmsPageSection["items"]>[number]>
): CmsPageSection {
  return {
    ...section,
    items: (section.items ?? []).map((it) =>
      it.id === id ? { ...it, ...patch } : it
    ),
  }
}

function uid(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1000)}`
}

export function CmsPageSectionFields({
  section,
  meta,
  onMetaChange,
  onChange,
}: Props) {
  const key = section.key as PageSectionKey

  return (
    <div className="space-y-4">
      <CmsLocalizedField
        label="Titel"
        field={`${section.id}.title`}
        value={section.title}
        onChange={(title) => onChange({ ...section, title })}
        meta={meta}
        onMetaChange={onMetaChange}
      />

      {!["cta_group", "funnel"].includes(key) || key === "offer_band" ? (
        <CmsLocalizedRichTextField
          label={key === "faq" ? "Intro (optioneel)" : "Tekst"}
          field={`${section.id}.body`}
          value={section.body}
          onChange={(body) => onChange({ ...section, body })}
          meta={meta}
          onMetaChange={onMetaChange}
        />
      ) : null}

      {key === "score_breakdown" ? (
        <>
          <label className="block text-sm font-semibold">
            Totaalscore
            <input
              className="mt-1 h-9 w-full rounded border border-wf-400 px-2 text-sm"
              value={section.totalScore ?? ""}
              onChange={(e) =>
                onChange({ ...section, totalScore: e.target.value })
              }
            />
          </label>
          <label className="block text-sm font-semibold">
            Maximumscore (numeriek, optioneel)
            <input
              className="mt-1 h-9 w-full rounded border border-wf-400 px-2 text-sm"
              value={section.maxScore ?? ""}
              onChange={(e) =>
                onChange({ ...section, maxScore: e.target.value })
              }
            />
          </label>
          <CmsLocalizedField
            label="Maximumlabel (bijv. max. 100)"
            field={`${section.id}.maxScoreLabel`}
            value={section.maxScoreLabel ?? emptyLocalized()}
            onChange={(maxScoreLabel) => onChange({ ...section, maxScoreLabel })}
            meta={meta}
            onMetaChange={onMetaChange}
          />
        </>
      ) : null}

      {key === "threshold" ? (
        <>
          <CmsLocalizedField
            label="Linker bereik"
            field={`${section.id}.leftRange`}
            value={section.leftRange ?? emptyLocalized()}
            onChange={(leftRange) => onChange({ ...section, leftRange })}
            meta={meta}
            onMetaChange={onMetaChange}
          />
          <CmsLocalizedField
            label="Linker toelichting"
            field={`${section.id}.leftLabel`}
            value={section.leftLabel ?? emptyLocalized()}
            onChange={(leftLabel) => onChange({ ...section, leftLabel })}
            meta={meta}
            onMetaChange={onMetaChange}
          />
          <CmsLocalizedField
            label="Rechter bereik"
            field={`${section.id}.rightRange`}
            value={section.rightRange ?? emptyLocalized()}
            onChange={(rightRange) => onChange({ ...section, rightRange })}
            meta={meta}
            onMetaChange={onMetaChange}
          />
          <CmsLocalizedField
            label="Rechter toelichting"
            field={`${section.id}.rightLabel`}
            value={section.rightLabel ?? emptyLocalized()}
            onChange={(rightLabel) => onChange({ ...section, rightLabel })}
            meta={meta}
            onMetaChange={onMetaChange}
          />
          <label className="block text-sm font-semibold">
            Grenswaarde % (visuele marker)
            <input
              type="number"
              min={0}
              max={100}
              className="mt-1 h-9 w-full rounded border border-wf-400 px-2 text-sm"
              value={section.boundaryPercent ?? 50}
              onChange={(e) =>
                onChange({
                  ...section,
                  boundaryPercent: Number(e.target.value) || 0,
                })
              }
            />
          </label>
        </>
      ) : null}

      {key === "steps" ||
      key === "cards" ||
      key === "usps" ||
      key === "roles" ? (
        <label className="block text-sm font-semibold">
          Layout
          <select
            className="mt-1 h-9 w-full rounded border border-wf-400 px-2 text-sm"
            value={
              section.layout ??
              (key === "steps" ? "horizontal" : "grid")
            }
            onChange={(e) =>
              onChange({
                ...section,
                layout: e.target.value as "horizontal" | "vertical" | "grid",
              })
            }
          >
            <option value="horizontal">Horizontaal (flow)</option>
            <option value="vertical">Verticaal (genummerd)</option>
            <option value="grid">Grid</option>
          </select>
        </label>
      ) : null}

      {key === "offer_band" || key === "pricing_highlight" ? (
        <>
          {key === "pricing_highlight" ? (
            <CmsLocalizedField
              label="Eyebrow / label"
              field={`${section.id}.eyebrow`}
              value={section.eyebrow ?? emptyLocalized()}
              onChange={(eyebrow) => onChange({ ...section, eyebrow })}
              meta={meta}
              onMetaChange={onMetaChange}
            />
          ) : null}
          <CmsLocalizedField
            label="Aanbod / highlight"
            field={`${section.id}.offerValue`}
            value={section.offerValue ?? emptyLocalized()}
            onChange={(offerValue) => onChange({ ...section, offerValue })}
            meta={meta}
            onMetaChange={onMetaChange}
          />
          <CmsLocalizedRichTextField
            label="Toelichting / voorwaarden"
            field={`${section.id}.note`}
            value={section.note ?? emptyLocalized()}
            onChange={(note) => onChange({ ...section, note })}
            meta={meta}
            onMetaChange={onMetaChange}
          />
        </>
      ) : null}

      {(
        [
          "score_breakdown",
          "cards",
          "usps",
          "steps",
          "roles",
          "faq",
          "pricing_highlight",
        ] as PageSectionKey[]
      ).includes(key) ? (
        <div className="space-y-3 rounded-xl border border-wf-200 p-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold">
              {key === "faq" ? "Vragen" : "Items"}
            </p>
            <button
              type="button"
              className="text-xs font-semibold text-sky-800"
              onClick={() =>
                onChange({
                  ...section,
                  items: [
                    ...(section.items ?? []),
                    {
                      id: uid("item"),
                      icon: "none",
                      title: emptyLocalized(),
                      body: emptyLocalized(),
                      href: "",
                      value: emptyLocalized(),
                      detail: emptyLocalized(),
                    },
                  ],
                })
              }
            >
              + Toevoegen
            </button>
          </div>
          {(section.items ?? []).map((item, index) => (
            <div
              key={item.id}
              className="space-y-2 rounded-lg border border-wf-100 bg-wf-50/60 p-2"
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-wf-600">
                  #{index + 1}
                </p>
                <button
                  type="button"
                  className="text-xs text-red-700"
                  onClick={() =>
                    onChange({
                      ...section,
                      items: (section.items ?? []).filter((x) => x.id !== item.id),
                    })
                  }
                >
                  Verwijderen
                </button>
              </div>
              {key !== "faq" ? (
                <label className="block text-xs font-semibold">
                  Icoon
                  <select
                    className="mt-1 h-8 w-full rounded border border-wf-300 bg-white px-2 text-xs"
                    value={item.icon || "none"}
                    onChange={(e) =>
                      onChange(
                        updateItem(section, item.id, { icon: e.target.value })
                      )
                    }
                  >
                    {CMS_ICON_KEYS.map((ik) => (
                      <option key={ik} value={ik}>
                        {CMS_ICON_LABELS[ik] ?? ik}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              <CmsLocalizedField
                label={key === "faq" ? "Vraag" : "Titel"}
                field={`${item.id}.title`}
                value={item.title}
                onChange={(title) =>
                  onChange(updateItem(section, item.id, { title }))
                }
                meta={meta}
                onMetaChange={onMetaChange}
              />
              {(
                ["score_breakdown", "pricing_highlight"] as PageSectionKey[]
              ).includes(key) ? (
                <CmsLocalizedField
                  label="Waarde"
                  field={`${item.id}.value`}
                  value={item.value ?? emptyLocalized()}
                  onChange={(value) =>
                    onChange(updateItem(section, item.id, { value }))
                  }
                  meta={meta}
                  onMetaChange={onMetaChange}
                />
              ) : null}
              {key === "score_breakdown" ? (
                <CmsLocalizedField
                  label="Toelichting onder score"
                  field={`${item.id}.detail`}
                  value={item.detail ?? emptyLocalized()}
                  onChange={(detail) =>
                    onChange(updateItem(section, item.id, { detail }))
                  }
                  meta={meta}
                  onMetaChange={onMetaChange}
                />
              ) : null}
              <CmsLocalizedRichTextField
                label={key === "faq" ? "Antwoord" : "Tekst"}
                field={`${item.id}.body`}
                value={item.body}
                onChange={(body) =>
                  onChange(updateItem(section, item.id, { body }))
                }
                meta={meta}
                onMetaChange={onMetaChange}
              />
              {key === "roles" || key === "cards" || key === "usps" ? (
                <label className="block text-xs font-semibold">
                  Link (optioneel)
                  <input
                    className="mt-1 h-8 w-full rounded border border-wf-300 px-2 text-xs"
                    value={item.href || ""}
                    onChange={(e) =>
                      onChange(
                        updateItem(section, item.id, { href: e.target.value })
                      )
                    }
                  />
                </label>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      {key === "funnel" ? (
        <div className="space-y-3 rounded-xl border border-wf-200 p-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold">Funnel-stappen</p>
            <button
              type="button"
              className="text-xs font-semibold text-sky-800"
              onClick={() =>
                onChange({
                  ...section,
                  stages: [
                    ...(section.stages ?? []),
                    {
                      id: uid("stage"),
                      kind: "pill",
                      label: emptyLocalized(),
                      icon: "none",
                      markets: [],
                    },
                  ],
                })
              }
            >
              + Stap
            </button>
          </div>
          {(section.stages ?? []).map((stage, index) => (
            <div
              key={stage.id}
              className="space-y-2 rounded-lg border border-wf-100 bg-wf-50/60 p-2"
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold">#{index + 1}</p>
                <button
                  type="button"
                  className="text-xs text-red-700"
                  onClick={() =>
                    onChange({
                      ...section,
                      stages: (section.stages ?? []).filter(
                        (x) => x.id !== stage.id
                      ),
                    })
                  }
                >
                  Verwijderen
                </button>
              </div>
              <label className="block text-xs font-semibold">
                Type
                <select
                  className="mt-1 h-8 w-full rounded border border-wf-300 bg-white px-2 text-xs"
                  value={stage.kind}
                  onChange={(e) =>
                    onChange({
                      ...section,
                      stages: (section.stages ?? []).map((st) =>
                        st.id === stage.id
                          ? {
                              ...st,
                              kind: e.target.value as CmsFunnelStageKind,
                            }
                          : st
                      ),
                    })
                  }
                >
                  <option value="pill">Pill</option>
                  <option value="hub">Hub</option>
                  <option value="markets">Markten</option>
                  <option value="customers">Klanten</option>
                  <option value="tagline">Tagline</option>
                </select>
              </label>
              <CmsLocalizedField
                label="Label"
                field={`${stage.id}.label`}
                value={stage.label}
                onChange={(label) =>
                  onChange({
                    ...section,
                    stages: (section.stages ?? []).map((st) =>
                      st.id === stage.id ? { ...st, label } : st
                    ),
                  })
                }
                meta={meta}
                onMetaChange={onMetaChange}
              />
              {stage.kind === "markets" ? (
                <label className="block text-xs font-semibold">
                  Markten (één per regel, formaat nl|en|de|fr)
                  <textarea
                    className="mt-1 min-h-[80px] w-full rounded border border-wf-300 px-2 py-1 text-xs"
                    value={(stage.markets ?? [])
                      .map((m) => `${m.nl}|${m.en}|${m.de}|${m.fr}`)
                      .join("\n")}
                    onChange={(e) => {
                      const markets = e.target.value
                        .split("\n")
                        .map((line) => line.trim())
                        .filter(Boolean)
                        .map((line) => {
                          const [nl = "", en = "", de = "", fr = ""] =
                            line.split("|")
                          return { nl, en, de, fr } satisfies LocalizedCms
                        })
                      onChange({
                        ...section,
                        stages: (section.stages ?? []).map((st) =>
                          st.id === stage.id ? { ...st, markets } : st
                        ),
                      })
                    }}
                  />
                </label>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      {(
        ["cta_group", "offer_band", "hero", "pricing_highlight", "steps"] as PageSectionKey[]
      ).includes(key) || key === "cta" ? (
        <div className="space-y-3 rounded-xl border border-wf-200 p-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold">
              {key === "cta" ? "CTA (legacy + groep)" : "CTA's"}
            </p>
            {key !== "cta" ? (
              <button
                type="button"
                className="text-xs font-semibold text-sky-800"
                onClick={() =>
                  onChange({
                    ...section,
                    ctas: [
                      ...(section.ctas ?? []),
                      {
                        id: uid("cta"),
                        label: emptyLocalized(),
                        href: "",
                        variant: "primary" as CmsCtaVariant,
                      },
                    ],
                  })
                }
              >
                + CTA
              </button>
            ) : null}
          </div>
          {key === "cta" || key === "hero" ? (
            <>
              <CmsLocalizedField
                label="CTA-tekst (legacy enkel)"
                field={`${section.id}.cta`}
                value={section.ctaLabel || emptyLocalized()}
                onChange={(ctaLabel) => onChange({ ...section, ctaLabel })}
                meta={meta}
                onMetaChange={onMetaChange}
              />
              <label className="block text-sm font-semibold">
                CTA-link (legacy)
                <input
                  className="mt-1 h-9 w-full rounded border border-wf-400 bg-white px-2 text-sm"
                  value={section.href || ""}
                  onChange={(e) =>
                    onChange({ ...section, href: e.target.value })
                  }
                  placeholder="/pad-of-https://…"
                />
              </label>
            </>
          ) : null}
          {(section.ctas ?? []).map((cta, index) => (
            <div
              key={cta.id}
              className="space-y-2 rounded-lg border border-wf-100 bg-wf-50/60 p-2"
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold">CTA #{index + 1}</p>
                <button
                  type="button"
                  className="text-xs text-red-700"
                  onClick={() =>
                    onChange({
                      ...section,
                      ctas: (section.ctas ?? []).filter((x) => x.id !== cta.id),
                    })
                  }
                >
                  Verwijderen
                </button>
              </div>
              <CmsLocalizedField
                label="Tekst"
                field={`${cta.id}.label`}
                value={cta.label}
                onChange={(label) =>
                  onChange({
                    ...section,
                    ctas: (section.ctas ?? []).map((c) =>
                      c.id === cta.id ? { ...c, label } : c
                    ),
                  })
                }
                meta={meta}
                onMetaChange={onMetaChange}
              />
              <label className="block text-xs font-semibold">
                URL
                <input
                  className="mt-1 h-8 w-full rounded border border-wf-300 px-2 text-xs"
                  value={cta.href}
                  onChange={(e) =>
                    onChange({
                      ...section,
                      ctas: (section.ctas ?? []).map((c) =>
                        c.id === cta.id ? { ...c, href: e.target.value } : c
                      ),
                    })
                  }
                />
              </label>
              <label className="block text-xs font-semibold">
                Type
                <select
                  className="mt-1 h-8 w-full rounded border border-wf-300 bg-white px-2 text-xs"
                  value={cta.variant}
                  onChange={(e) =>
                    onChange({
                      ...section,
                      ctas: (section.ctas ?? []).map((c) =>
                        c.id === cta.id
                          ? {
                              ...c,
                              variant: e.target.value as CmsCtaVariant,
                            }
                          : c
                      ),
                    })
                  }
                >
                  <option value="primary">Primair</option>
                  <option value="secondary">Secundair</option>
                  <option value="link">Tekstlink</option>
                </select>
              </label>
              <label className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={Boolean(cta.openInNewWindow)}
                  onChange={(e) =>
                    onChange({
                      ...section,
                      ctas: (section.ctas ?? []).map((c) =>
                        c.id === cta.id
                          ? { ...c, openInNewWindow: e.target.checked }
                          : c
                      ),
                    })
                  }
                />
                Open in nieuw venster
              </label>
            </div>
          ))}
        </div>
      ) : null}

      <label className="flex items-center gap-2 text-sm text-wf-800">
        <input
          type="checkbox"
          checked={section.visible}
          onChange={(e) =>
            onChange({ ...section, visible: e.target.checked })
          }
        />
        Sectie zichtbaar
      </label>
    </div>
  )
}
