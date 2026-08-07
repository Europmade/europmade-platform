"use client"

import Link from "next/link"
import type { StorefrontLocale } from "../../_lib/i18n/locales"
import type { ListingProduct } from "../../_lib/listing-products"
import type {
  ResolvedEditorialBlock,
  ResolvedProductCloudInsight,
} from "../../_lib/cms/resolve-category"
import {
  findAttributeKnowledge,
  type UltimateGuide,
} from "../../_lib/category/ultimate-guide"
import { TopicVisualFace } from "./category-topic-visual"

type CategoryBuyGuideProps = {
  title: string
  categorySlug: string
  categoryLabel: string
  locale: StorefrontLocale
  blocks: ResolvedEditorialBlock[]
  insights: ResolvedProductCloudInsight[]
  insightsTitle: string
  products: ListingProduct[]
  guide: UltimateGuide
  openAttrId: string | null
  setOpenAttrId: (id: string | null) => void
  openQuestionId: string | null
  setOpenQuestionId: (id: string | null) => void
  onPersona: (personaId: string, title: string) => void
  onApplyFilters: (filterIds: string[], label: string) => void
}

const PERSONA_TINT: Record<string, string> = {
  daily: "from-[#eef2ff] to-white",
  student: "from-[#ecfdf5] to-white",
  family: "from-[#fff7ed] to-white",
  pro: "from-[#f5f3ff] to-white",
  budget: "from-[#f0fdfa] to-white",
  value: "from-[#f3f6fb] to-white",
  premium: "from-[#fdf2f8] to-white",
  intensive: "from-[#fef3c7] to-white",
  pets: "from-[#fef9c3] to-white",
  large: "from-[#e0f2fe] to-white",
  small: "from-[#f0fdf4] to-white",
  work: "from-[#f1f5f9] to-white",
}

/**
 * Ultimate interactive buying guide — decision helper (presentation only).
 */
export function CategoryBuyGuide({
  title,
  locale,
  blocks,
  insights,
  insightsTitle,
  guide,
  openAttrId,
  setOpenAttrId,
  openQuestionId,
  setOpenQuestionId,
  onPersona,
  onApplyFilters,
}: CategoryBuyGuideProps) {
  const topicBlock = blocks.find((b) => b.kind === "topic_visual")
  const topics =
    topicBlock?.topicVisuals?.length
      ? topicBlock.topicVisuals
      : guide.attributes.map((a) => ({
          id: a.id,
          topic: a.title,
          imageKind: a.match,
          imageSrc: null as string | null,
          caption: a.what,
          importance: 3,
        }))

  return (
    <section
      className="border-t border-wf-100 px-4 py-5 tablet:px-8 tablet:py-6"
      data-ai-content-block="buy-guide"
      data-guide-family={guide.family}
      data-ultimate-guide="v7"
    >
      <h2 className="mb-3 text-[20px] font-bold tracking-tight text-wf-900 tablet:text-[24px]">
        {title}
      </h2>

      {/* Interactive buying questions */}
      <div className="mb-5" data-block="buying-questions">
        <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-wf-500">
          {guide.questionsHeading}
        </p>
        <ul className="space-y-1.5">
          {guide.buyingQuestions.map((q) => {
            const open = openQuestionId === q.id
            return (
              <li
                key={q.id}
                className="overflow-hidden rounded-xl border border-wf-200 bg-white shadow-sm"
              >
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition hover:bg-wf-50"
                  aria-expanded={open}
                  data-question={q.id}
                  onClick={() => {
                    setOpenQuestionId(open ? null : q.id)
                    if (!open && q.focusAttr) {
                      const attr = findAttributeKnowledge(guide, q.focusAttr)
                      if (attr) setOpenAttrId(attr.id)
                    }
                    if (!open && q.filterIds?.length) {
                      onApplyFilters(q.filterIds, q.question)
                    }
                  }}
                >
                  <span className="text-[13px] font-bold text-wf-900">
                    {q.question}
                  </span>
                  <span className="text-[11px] font-semibold text-wf-500">
                    {open ? "−" : "+"}
                  </span>
                </button>
                {open ? (
                  <div className="border-t border-wf-100 bg-[#f7f8fa] px-3 py-2.5">
                    <p className="text-[12.5px] leading-snug text-wf-700">
                      {q.answer}
                    </p>
                    {q.focusAttr ? (
                      <button
                        type="button"
                        className="mt-2 text-[11px] font-bold text-wf-900 underline"
                        onClick={() => {
                          const attr = findAttributeKnowledge(guide, q.focusAttr!)
                          if (attr) {
                            setOpenAttrId(attr.id)
                            document
                              .getElementById("guide-attributes")
                              ?.scrollIntoView({ behavior: "smooth" })
                          }
                        }}
                      >
                        {locale === "en"
                          ? "Open attribute guide →"
                          : "Open eigenschapengids →"}
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </li>
            )
          })}
        </ul>
      </div>

      {/* Insights */}
      {insights.length > 0 ? (
        <div className="mb-5" data-block="product-insights">
          <h3 className="mb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-wf-500">
            {insightsTitle}
          </h3>
          <ul className="grid grid-cols-2 gap-1.5 tablet:grid-cols-3 desktop:grid-cols-6">
            {insights.map((ins) => (
              <li
                key={ins.id}
                className="rounded-lg border border-wf-200 bg-white px-2.5 py-2 shadow-sm"
                data-pc-source={ins.source}
              >
                <p className="text-[9.5px] font-semibold uppercase tracking-wide text-wf-500">
                  {ins.label}
                </p>
                <p className="mt-0.5 text-[15px] font-bold text-wf-900">
                  {ins.value}
                  {ins.unit ? (
                    <span className="ml-0.5 text-[10px] font-medium text-wf-500">
                      {ins.unit}
                    </span>
                  ) : null}
                </p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* Interactive personas */}
      <div className="mb-5" data-editorial-kind="advice">
        <h3 className="mb-2.5 text-[17px] font-bold tracking-tight text-wf-900">
          {guide.personasHeading}
        </h3>
        <ul className="grid gap-2 tablet:grid-cols-2 desktop:grid-cols-3">
          {guide.personas.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                data-persona={p.id}
                onClick={() => onPersona(p.id, p.title)}
                className={`group flex h-full w-full flex-col rounded-xl border border-wf-200 bg-gradient-to-br p-3 text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-wf-400 hover:shadow-md ${PERSONA_TINT[p.id] ?? "from-[#f7f8fa] to-white"}`}
              >
                <p className="text-[14px] font-bold text-wf-900">{p.title}</p>
                <p className="mt-1.5 text-[12px] leading-snug text-wf-800">
                  <span className="font-semibold">→ </span>
                  {p.recommended}
                </p>
                <p className="mt-1.5 text-[11.5px] leading-snug text-wf-600">
                  {p.why}
                </p>
                <p className="mt-2 rounded-lg bg-white/80 px-2 py-1.5 text-[11px] leading-snug text-wf-600">
                  <span className="font-semibold text-wf-800">Let op: </span>
                  {p.watch}
                </p>
                <span className="mt-3 inline-flex w-fit items-center rounded-full bg-wf-900 px-2.5 py-1 text-[11px] font-bold text-white transition group-hover:bg-wf-700">
                  {guide.personaCta} →
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Attribute knowledge center */}
      <div id="guide-attributes" className="mb-5 scroll-mt-6" data-editorial-kind="topic_visual">
        <h3 className="mb-2 text-[17px] font-bold tracking-tight text-wf-900">
          {guide.attributesHeading}
        </h3>
        <ul className="grid grid-cols-2 gap-1.5 tablet:grid-cols-3 desktop:grid-cols-4">
          {topics.slice(0, 8).map((tv) => {
            const knowledge =
              findAttributeKnowledge(guide, tv.topic) ??
              findAttributeKnowledge(guide, tv.imageKind)
            const id = knowledge?.id ?? tv.id
            const open = openAttrId === id
            return (
              <li key={tv.id}>
                <button
                  type="button"
                  data-attr={id}
                  aria-expanded={open}
                  onClick={() => setOpenAttrId(open ? null : id)}
                  className={`group flex w-full gap-2 rounded-lg border p-2 text-left shadow-sm transition hover:border-wf-400 ${
                    open
                      ? "border-wf-400 bg-[#f3f6fb]"
                      : "border-wf-200 bg-white"
                  }`}
                >
                  <TopicVisualFace
                    topic={tv.topic}
                    imageKind={tv.imageKind}
                    imageSrc={tv.imageSrc}
                    caption={tv.caption}
                    compact
                    className="!h-10 !w-10 shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="text-[12px] font-bold text-wf-900">
                      {knowledge?.title ?? tv.topic}
                    </p>
                    <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-wf-600">
                      {knowledge?.what ??
                        tv.caption ??
                        (locale === "en"
                          ? "Tap for full guide"
                          : "Tik voor volledige gids")}
                    </p>
                  </div>
                </button>
              </li>
            )
          })}
        </ul>
        {openAttrId
          ? (() => {
              const knowledge = guide.attributes.find((a) => a.id === openAttrId)
              if (!knowledge) return null
              return (
                <div
                  className="mt-2 rounded-xl border border-wf-300 bg-white p-3 text-[12px] leading-snug text-wf-700 shadow-sm"
                  data-attr-panel={knowledge.id}
                >
                  <p className="mb-2 text-[14px] font-bold text-wf-900">
                    {knowledge.title}
                  </p>
                  <AttrLine
                    label={locale === "en" ? "What it does" : "Wat doet dit?"}
                    body={knowledge.what}
                  />
                  <AttrLine
                    label={
                      locale === "en" ? "When important" : "Wanneer belangrijk"
                    }
                    body={knowledge.whenImportant}
                  />
                  <AttrLine
                    label={locale === "en" ? "When not" : "Wanneer niet"}
                    body={knowledge.whenNot}
                  />
                  <AttrLine
                    label={
                      locale === "en" ? "Common mistake" : "Veelgemaakte fout"
                    }
                    body={knowledge.commonMistake}
                  />
                  <AttrLine
                    label={locale === "en" ? "Recommended" : "Aanbevolen"}
                    body={knowledge.recommended}
                  />
                  <AttrLine
                    label={locale === "en" ? "Examples" : "Voorbeelden"}
                    body={knowledge.examples}
                  />
                </div>
              )
            })()
          : null}
      </div>

      {/* Steps */}
      <div className="mb-5" data-editorial-kind="look_for">
        <h3 className="mb-2 text-[17px] font-bold text-wf-900">
          {guide.lookHeading}
        </h3>
        <ol className="grid gap-1.5 tablet:grid-cols-3 desktop:grid-cols-5">
          {guide.lookSteps.map((step, i) => (
            <li
              key={step.title}
              className="relative rounded-xl border border-wf-200 bg-gradient-to-b from-white to-[#f7f8fa] px-3 py-2.5"
            >
              <p className="text-[11px] font-bold uppercase tracking-wide text-wf-500">
                Stap {i + 1}
              </p>
              <p className="mt-1 text-[12.5px] font-bold text-wf-900">
                {step.title.replace(/^\d+\.\s*/, "")}
              </p>
              <p className="mt-1 text-[11.5px] leading-snug text-wf-600">
                {step.body}
              </p>
            </li>
          ))}
        </ol>
      </div>

      {/* Expert tips */}
      <div
        className="mb-5 rounded-xl border border-emerald-200/80 bg-[#f4f7f2] px-3.5 py-3"
        data-editorial-kind="expert_tip"
      >
        <h3 className="text-[17px] font-bold text-wf-900">
          {guide.expertHeading}
        </h3>
        <ul className="mt-2 grid gap-1.5 tablet:grid-cols-2">
          {guide.expertTips.map((tip) => (
            <li
              key={tip}
              className="flex gap-2 text-[12.5px] leading-snug text-wf-800"
            >
              <span className="font-bold text-emerald-700" aria-hidden>
                ✓
              </span>
              {tip}
            </li>
          ))}
        </ul>
      </div>

      {/* Mistakes */}
      <div
        className="mb-5 rounded-xl border border-amber-200/80 bg-[#fbf8f4] px-3.5 py-3"
        data-editorial-kind="common_mistakes"
      >
        <h3 className="text-[17px] font-bold text-wf-900">
          {guide.mistakesHeading}
        </h3>
        <ul className="mt-2 grid gap-1.5 tablet:grid-cols-2">
          {guide.mistakes.map((m) => (
            <li
              key={m}
              className="flex gap-2 text-[12.5px] leading-snug text-wf-800"
            >
              <span className="font-bold text-amber-700" aria-hidden>
                ✕
              </span>
              {m}
            </li>
          ))}
        </ul>
      </div>

      {/* When not */}
      <div
        className="mb-5 rounded-xl border border-wf-300 bg-wf-900 px-3.5 py-3 text-white"
        data-block="when-not"
      >
        <h3 className="text-[17px] font-bold">{guide.whenNotHeading}</h3>
        <ul className="mt-2 grid gap-1.5 tablet:grid-cols-2">
          {guide.whenNot.map((item) => (
            <li key={item} className="flex gap-2 text-[12.5px] leading-snug text-white/90">
              <span aria-hidden>—</span>
              {item}
            </li>
          ))}
        </ul>
      </div>

      {/* Save money */}
      <div
        className="mb-5 rounded-xl border border-sky-200 bg-[#f0f9ff] px-3.5 py-3"
        data-block="save-money"
      >
        <h3 className="text-[17px] font-bold text-wf-900">
          {guide.saveMoneyHeading}
        </h3>
        <ul className="mt-2 grid gap-1.5 tablet:grid-cols-2">
          {guide.saveMoney.map((item) => (
            <li
              key={item}
              className="flex gap-2 rounded-lg border border-sky-100 bg-white/80 px-2.5 py-2 text-[12.5px] leading-snug text-wf-800"
            >
              <span className="font-bold text-sky-700" aria-hidden>
                €
              </span>
              {item}
            </li>
          ))}
        </ul>
      </div>

      {/* Lifespan */}
      <div className="mb-5" data-block="lifespan">
        <h3 className="mb-2 text-[17px] font-bold text-wf-900">
          {guide.lifespanHeading}
        </h3>
        <ul className="grid gap-1.5 tablet:grid-cols-2 desktop:grid-cols-3">
          {guide.lifespan.map((row) => (
            <li
              key={row.title}
              className="rounded-xl border border-wf-200 bg-white px-3 py-2.5 shadow-sm"
            >
              <p className="text-[12.5px] font-bold text-wf-900">{row.title}</p>
              <p className="mt-1 text-[11.5px] leading-snug text-wf-600">
                {row.body}
              </p>
            </li>
          ))}
        </ul>
      </div>

      {/* Comparison table */}
      <div className="mb-5" data-block="comparison-use">
        <h3 className="mb-2 text-[17px] font-bold text-wf-900">
          {guide.comparisonHeading}
        </h3>
        <div className="overflow-x-auto rounded-xl border border-wf-200 bg-white shadow-sm">
          <table className="min-w-full text-left text-[12.5px]">
            <thead className="bg-wf-50 text-[11px] uppercase tracking-wide text-wf-500">
              <tr>
                <th className="px-3 py-2 font-semibold">
                  {locale === "en" ? "Use" : "Gebruik"}
                </th>
                <th className="px-3 py-2 font-semibold">
                  {locale === "en" ? "Pick" : "Kies"}
                </th>
                <th className="px-3 py-2 font-semibold">
                  {locale === "en" ? "Why" : "Waarom"}
                </th>
              </tr>
            </thead>
            <tbody>
              {guide.comparisonRows.map((row) => (
                <tr key={row.scenario} className="border-t border-wf-100">
                  <td className="px-3 py-2.5 font-bold text-wf-900">
                    {row.scenario}
                  </td>
                  <td className="px-3 py-2.5 text-wf-800">{row.pick}</td>
                  <td className="px-3 py-2.5 text-wf-600">{row.why}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Checklist */}
      <div data-editorial-kind="checklist">
        <h3 className="mb-2 text-[17px] font-bold text-wf-900">
          {guide.checklistHeading}
        </h3>
        <ul className="grid gap-1.5 tablet:grid-cols-2 desktop:grid-cols-3">
          {guide.checklist.map((item) => (
            <li
              key={item}
              className="flex items-start gap-2 rounded-lg border border-wf-200 bg-white px-2.5 py-2 text-[12.5px] leading-snug text-wf-700"
            >
              <span
                className="mt-0.5 flex h-3.5 w-3.5 shrink-0 rounded border border-wf-300"
                aria-hidden
              />
              {item}
            </li>
          ))}
        </ul>
        <p className="mt-3">
          <Link
            href="#category-results"
            className="inline-flex rounded-full bg-wf-900 px-3.5 py-2 text-[12px] font-bold text-white transition hover:bg-wf-700"
          >
            {guide.showProductsLabel} →
          </Link>
        </p>
      </div>
    </section>
  )
}

function AttrLine({ label, body }: { label: string; body: string }) {
  return (
    <p className="mb-1.5 last:mb-0">
      <span className="font-bold text-wf-900">{label}: </span>
      {body}
    </p>
  )
}
