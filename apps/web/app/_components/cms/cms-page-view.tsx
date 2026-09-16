import Link from "next/link"
import type {
  ResolvedCmsCta,
  ResolvedCmsPage,
  ResolvedCmsPageSection,
} from "../../_lib/cms/resolve-cms-page-draft"
import type { StorefrontLocale } from "../../_lib/i18n/locales"
import { PublicStorefrontChrome } from "../marketplace/public-storefront-chrome"
import { CmsPageIcon } from "./cms-page-icon"

type CmsPageViewProps = {
  page: ResolvedCmsPage
  locale: StorefrontLocale
  selectedId?: string | null
  interactive?: boolean
}

function CtaButtons({ ctas }: { ctas: ResolvedCmsCta[] }) {
  if (!ctas.length) return null
  return (
    <div className="mt-5 flex flex-wrap gap-3">
      {ctas.map((cta) => {
        if (!cta.label || !cta.href) return null
        const className =
          cta.variant === "primary"
            ? "rounded-md bg-wf-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-wf-800"
            : cta.variant === "secondary"
              ? "rounded-md border border-wf-400 bg-white/80 px-5 py-2.5 text-sm font-semibold text-wf-900"
              : "rounded-md px-5 py-2.5 text-sm font-semibold text-wf-700 underline-offset-2 hover:underline"
        return (
          <Link
            key={cta.id}
            href={cta.href}
            className={className}
            target={cta.openInNewWindow ? "_blank" : undefined}
            rel={cta.openInNewWindow ? "noopener noreferrer" : undefined}
          >
            {cta.label}
          </Link>
        )
      })}
    </div>
  )
}

function Prose({ html, className = "" }: { html: string; className?: string }) {
  if (!html) return null
  return (
    <div
      className={`prose-em max-w-[720px] text-[13.5px] leading-relaxed text-wf-700 [&_a]:font-semibold [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-wf-300 [&_blockquote]:pl-3 [&_blockquote]:italic [&_h2]:mt-6 [&_h2]:text-[18px] [&_h2]:font-bold [&_h3]:mt-4 [&_h3]:text-[16px] [&_h3]:font-bold [&_li]:my-1 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-3 [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-5 ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

function ScoreBreakdown({ section }: { section: ResolvedCmsPageSection }) {
  return (
    <section className="rounded-2xl border border-emerald-800/20 bg-gradient-to-b from-emerald-50/80 to-white px-4 py-8 tablet:px-8">
      {section.title ? (
        <p className="text-center text-xs font-bold uppercase tracking-[0.14em] text-emerald-900">
          {section.title}
        </p>
      ) : null}
      {section.totalScore ? (
        <p className="mt-2 text-center text-4xl font-bold tabular-nums text-emerald-950 tablet:text-5xl">
          {section.totalScore}
          {section.maxScoreLabel ? (
            <span className="ml-2 text-base font-semibold text-emerald-800/80">
              {section.maxScoreLabel}
            </span>
          ) : null}
        </p>
      ) : null}
      <div className="mx-auto mt-3 h-px w-16 bg-emerald-800/30" />
      <div className="mt-8 grid gap-4 tablet:grid-cols-3">
        {section.items.map((item) => (
          <div
            key={item.id}
            className="rounded-xl border border-wf-200 bg-white px-4 py-5 text-center shadow-sm"
          >
            <CmsPageIcon
              name={item.icon}
              className="mx-auto h-8 w-8 text-emerald-900"
            />
            {item.title ? (
              <p className="mt-3 text-xs font-bold uppercase tracking-wide text-wf-600">
                {item.title}
              </p>
            ) : null}
            {item.value ? (
              <p className="mt-1 text-3xl font-bold tabular-nums text-wf-950">
                {item.value}
              </p>
            ) : null}
            {item.detail ? (
              <p className="mt-1 text-[11px] text-wf-500">{item.detail}</p>
            ) : null}
            <Prose html={item.bodyHtml} className="mt-2 text-left" />
          </div>
        ))}
      </div>
      <Prose html={section.bodyHtml} className="mx-auto mt-6 max-w-2xl text-center tablet:text-sm" />
    </section>
  )
}

function Threshold({ section }: { section: ResolvedCmsPageSection }) {
  const pct = Math.min(100, Math.max(0, section.boundaryPercent || 50))
  return (
    <section>
      {section.title ? (
        <h2 className="text-lg font-bold text-wf-900 tablet:text-xl">
          {section.title}
        </h2>
      ) : null}
      <div className="mt-5 overflow-hidden rounded-xl border border-wf-200">
        <div className="grid tablet:grid-cols-2">
          <div className="border-b border-wf-200 bg-wf-100 px-4 py-5 tablet:border-b-0 tablet:border-r">
            <div className="flex items-center gap-2 text-wf-600">
              <CmsPageIcon name="cross" className="h-5 w-5" />
              <span className="text-xs font-bold uppercase tracking-wide">
                {section.leftRange}
              </span>
            </div>
            <p className="mt-2 text-sm font-semibold text-wf-800">
              {section.leftLabel}
            </p>
          </div>
          <div className="bg-emerald-50 px-4 py-5">
            <div className="flex items-center gap-2 text-emerald-900">
              <CmsPageIcon name="check" className="h-5 w-5" />
              <span className="text-xs font-bold uppercase tracking-wide">
                {section.rightRange}
              </span>
            </div>
            <p className="mt-2 text-sm font-semibold text-emerald-950">
              {section.rightLabel}
            </p>
          </div>
        </div>
        <div className="relative h-3 bg-gradient-to-r from-wf-300 via-wf-300 to-emerald-600">
          <div
            className="absolute top-1/2 h-5 w-0.5 -translate-x-1/2 -translate-y-1/2 bg-wf-900"
            style={{ left: `${pct}%` }}
          />
        </div>
      </div>
      <Prose html={section.bodyHtml} className="mt-4" />
    </section>
  )
}

/** Shared responsive grid: 1 → 2 (tablet) → 3 (desktop). Used by steps/cards/roles. */
const CMS_ITEM_GRID_CLASS =
  "mt-6 grid grid-cols-1 gap-3 tablet:grid-cols-2 desktop:grid-cols-3"

function resolveItemLayout(
  layout: ResolvedCmsPageSection["layout"] | undefined,
  fallback: "grid" | "horizontal" | "vertical"
): "grid" | "horizontal" | "vertical" {
  if (layout === "grid" || layout === "horizontal" || layout === "vertical") {
    return layout
  }
  return fallback
}

function CardsGrid({ section }: { section: ResolvedCmsPageSection }) {
  const mode = resolveItemLayout(section.layout, "grid")
  const listClass =
    mode === "vertical"
      ? "mt-6 flex flex-col gap-3"
      : mode === "horizontal"
        ? "mt-6 flex flex-col items-stretch gap-2 tablet:flex-row tablet:flex-wrap tablet:items-start tablet:gap-2"
        : CMS_ITEM_GRID_CLASS

  return (
    <section>
      {section.title ? (
        <h2 className="text-lg font-bold text-wf-900 tablet:text-2xl">
          {section.title}
        </h2>
      ) : null}
      <Prose html={section.bodyHtml} className="mt-3" />
      <ul className={listClass}>
        {section.items.map((item) => (
          <li
            key={item.id}
            className={
              mode === "horizontal"
                ? "flex min-w-0 flex-1 flex-col tablet:min-w-[30%]"
                : "flex min-w-0 items-start gap-2 rounded-xl border border-wf-200 bg-white px-4 py-4 shadow-sm"
            }
          >
            {mode === "horizontal" ? (
              <div className="flex h-full w-full flex-col items-start gap-2 rounded-xl border border-wf-200 bg-white px-4 py-4 shadow-sm">
                <CmsPageIcon
                  name={item.icon}
                  className="h-6 w-6 text-emerald-900"
                />
                {item.title ? (
                  <h3 className="text-base font-bold text-wf-900">{item.title}</h3>
                ) : null}
                {item.value ? (
                  <p className="text-xl font-bold tabular-nums text-wf-950">
                    {item.value}
                  </p>
                ) : null}
                <Prose html={item.bodyHtml} />
                {item.detail ? (
                  <p className="mt-1 text-[11px] text-wf-600">{item.detail}</p>
                ) : null}
                {item.href ? (
                  <Link
                    href={item.href}
                    className="mt-2 inline-flex text-sm font-semibold text-wf-900 underline"
                  >
                    {item.title || item.href}
                  </Link>
                ) : null}
              </div>
            ) : (
              <>
                <CmsPageIcon
                  name={item.icon}
                  className="mt-0.5 h-6 w-6 text-emerald-900"
                />
                <div className="min-w-0 flex-1">
                  {item.title ? (
                    <h3 className="text-base font-bold text-wf-900">
                      {item.title}
                    </h3>
                  ) : null}
                  {item.value ? (
                    <p className="text-xl font-bold tabular-nums text-wf-950">
                      {item.value}
                    </p>
                  ) : null}
                  <Prose html={item.bodyHtml} />
                  {item.detail ? (
                    <p className="mt-1 text-[11px] text-wf-600">{item.detail}</p>
                  ) : null}
                  {item.href ? (
                    <Link
                      href={item.href}
                      className="mt-2 inline-flex text-sm font-semibold text-wf-900 underline"
                    >
                      {item.title || item.href}
                    </Link>
                  ) : null}
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
      <CtaButtons ctas={section.ctas} />
    </section>
  )
}

function StepsFlow({ section }: { section: ResolvedCmsPageSection }) {
  const mode = resolveItemLayout(section.layout, "horizontal")

  function StepHeading({
    item,
    index,
    align = "start",
  }: {
    item: (typeof section.items)[number]
    index: number
    align?: "start" | "center"
  }) {
    const iconKey = item.icon || "none"
    const showNumber = iconKey === "step_number"
    const hasGlyph = Boolean(
      iconKey && iconKey !== "none" && iconKey !== "step_number"
    )
    return (
      <div
        className={
          align === "center"
            ? "flex flex-wrap items-center justify-center gap-2"
            : "flex flex-wrap items-center gap-2"
        }
      >
        {showNumber || hasGlyph ? (
          <span className="inline-flex items-center gap-2">
            {showNumber ? (
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-wf-900 text-xs font-bold text-white">
                {index + 1}
              </span>
            ) : null}
            {hasGlyph ? (
              <CmsPageIcon
                name={item.icon}
                className="h-5 w-5 shrink-0 text-emerald-900"
              />
            ) : null}
            {item.title ? (
              <span className="text-sm font-semibold leading-snug text-wf-900">
                {item.title}
              </span>
            ) : null}
          </span>
        ) : item.title ? (
          <span className="text-sm font-semibold leading-snug text-wf-900">
            {item.title}
          </span>
        ) : null}
      </div>
    )
  }

  if (mode === "vertical") {
    return (
      <section>
        {section.title ? (
          <h2 className="text-xl font-bold text-wf-900 tablet:text-2xl">
            {section.title}
          </h2>
        ) : null}
        <Prose html={section.bodyHtml} className="mt-3" />
        <ol className="mx-auto mt-8 flex max-w-md flex-col items-center gap-2">
          {section.items.map((item, index) => (
            <li
              key={item.id}
              className="flex w-full max-w-sm flex-col items-center"
            >
              {index > 0 ? (
                <CmsPageIcon
                  name="arrow_down"
                  className="mb-2 h-4 w-4 text-wf-400"
                />
              ) : null}
              <div className="w-fit max-w-full rounded-lg border border-wf-200 bg-white px-4 py-2.5 shadow-sm">
                <StepHeading item={item} index={index} align="center" />
                {item.bodyHtml ? (
                  <Prose html={item.bodyHtml} className="mt-2 text-left" />
                ) : null}
              </div>
            </li>
          ))}
        </ol>
        <CtaButtons ctas={section.ctas} />
      </section>
    )
  }

  if (mode === "horizontal") {
    return (
      <section>
        {section.title ? (
          <h2 className="text-xl font-bold text-wf-900 tablet:text-2xl">
            {section.title}
          </h2>
        ) : null}
        <Prose html={section.bodyHtml} className="mt-3" />
        <ol className="mt-6 flex flex-col flex-wrap items-center justify-center gap-2 tablet:flex-row tablet:gap-3">
          {section.items.map((item, index) => (
            <li
              key={item.id}
              className="flex max-w-full flex-col items-center tablet:flex-row tablet:items-center"
            >
              {index > 0 ? (
                <CmsPageIcon
                  name="arrow_down"
                  className="mb-2 h-4 w-4 rotate-0 text-wf-400 tablet:mb-0 tablet:mr-3 tablet:-rotate-90"
                />
              ) : null}
              <div className="w-fit max-w-[16rem] rounded-xl border border-wf-200 bg-white px-3 py-3 shadow-sm">
                <StepHeading item={item} index={index} align="center" />
                {item.bodyHtml ? (
                  <Prose html={item.bodyHtml} className="mt-2 text-left" />
                ) : null}
              </div>
            </li>
          ))}
        </ol>
        <CtaButtons ctas={section.ctas} />
      </section>
    )
  }

  // Grid — compact cards in a real CSS grid (not full-bleed stacked cards).
  return (
    <section>
      {section.title ? (
        <h2 className="text-xl font-bold text-wf-900 tablet:text-2xl">
          {section.title}
        </h2>
      ) : null}
      <Prose html={section.bodyHtml} className="mt-3" />
      <ol className="mx-auto mt-6 grid w-full max-w-3xl grid-cols-1 gap-3 tablet:grid-cols-2 desktop:grid-cols-3">
        {section.items.map((item, index) => (
          <li key={item.id} className="min-w-0">
            <div className="flex h-full flex-col rounded-xl border border-wf-200 bg-white px-3 py-3 shadow-sm">
              <StepHeading item={item} index={index} />
              {item.bodyHtml ? (
                <Prose html={item.bodyHtml} className="mt-2" />
              ) : null}
            </div>
          </li>
        ))}
      </ol>
      <CtaButtons ctas={section.ctas} />
    </section>
  )
}

function Funnel({ section }: { section: ResolvedCmsPageSection }) {
  return (
    <section className="rounded-2xl border border-wf-200 bg-white/90 px-4 py-6 shadow-sm">
      {section.title ? (
        <p className="mb-4 text-center text-sm font-bold text-emerald-950">
          {section.title}
        </p>
      ) : null}
      <div className="flex flex-col items-center gap-2">
        {section.stages.map((stage, i) => (
          <div key={stage.id} className="flex w-full flex-col items-center">
            {i > 0 ? (
              <CmsPageIcon
                name="arrow_down"
                className="my-2 h-4 w-4 text-wf-400"
              />
            ) : null}
            {stage.kind === "markets" ? (
              <ul className="flex flex-wrap justify-center gap-1.5">
                {stage.markets.map((m) => (
                  <li
                    key={m}
                    className="rounded-full border border-wf-200 bg-wf-50 px-2 py-0.5 text-[10px] font-semibold text-wf-800"
                  >
                    {m}
                  </li>
                ))}
              </ul>
            ) : stage.kind === "hub" ? (
              <p className="rounded-full bg-emerald-900 px-3 py-1 text-xs font-bold text-white">
                {stage.label}
              </p>
            ) : stage.kind === "customers" ? (
              <p className="flex items-center gap-2 text-sm font-bold text-wf-900">
                <CmsPageIcon
                  name={stage.icon || "users"}
                  className="h-5 w-5 text-emerald-900"
                />
                {stage.label}
              </p>
            ) : stage.kind === "tagline" ? (
              <p className="mt-2 text-center text-base font-bold text-emerald-950">
                {stage.label}
              </p>
            ) : (
              <p className="rounded-full bg-wf-900 px-3 py-1 text-xs font-bold text-white">
                {stage.label}
              </p>
            )}
          </div>
        ))}
      </div>
      <Prose html={section.bodyHtml} className="mt-4 text-center" />
    </section>
  )
}

function PricingHighlight({ section }: { section: ResolvedCmsPageSection }) {
  return (
    <article className="rounded-xl border border-emerald-800/20 bg-emerald-50/60 px-5 py-5">
      {section.eyebrow ? (
        <p className="text-xs font-bold uppercase tracking-wide text-emerald-900">
          {section.eyebrow}
        </p>
      ) : null}
      {section.title ? (
        <h2 className="text-lg font-bold text-emerald-950">{section.title}</h2>
      ) : null}
      <Prose html={section.bodyHtml} className="mt-2 text-emerald-950/80" />
      <div className="mt-4 grid grid-cols-2 gap-3">
        {section.items.map((item) => (
          <div
            key={item.id}
            className="flex h-full flex-col items-center justify-start rounded-lg border border-wf-200 bg-white px-3 py-3 text-center"
          >
            <CmsPageIcon
              name={item.icon}
              className="h-6 w-6 shrink-0 text-wf-800"
            />
            {item.value ? (
              <p className="mt-2 text-xl font-bold leading-none tabular-nums text-wf-950">
                {item.value}
              </p>
            ) : null}
            {item.title ? (
              <p className="mt-2 text-[11px] font-semibold leading-snug text-wf-600">
                {item.title}
              </p>
            ) : null}
            <Prose html={item.bodyHtml} />
          </div>
        ))}
      </div>
      {section.noteHtml ? (
        <div
          className="mt-3 text-xs leading-relaxed text-wf-600"
          dangerouslySetInnerHTML={{ __html: section.noteHtml }}
        />
      ) : null}
      <CtaButtons ctas={section.ctas} />
    </article>
  )
}

function Roles({ section }: { section: ResolvedCmsPageSection }) {
  const mode = resolveItemLayout(section.layout, "grid")
  const listClass =
    mode === "vertical"
      ? "mt-6 flex flex-col gap-4"
      : mode === "horizontal"
        ? "mt-6 flex flex-col gap-4 tablet:flex-row tablet:flex-wrap tablet:gap-4"
        : "mt-6 grid grid-cols-1 gap-4 tablet:grid-cols-2 desktop:grid-cols-3"

  return (
    <section>
      {section.title ? (
        <h2 className="text-2xl font-bold text-wf-950">{section.title}</h2>
      ) : null}
      <Prose html={section.bodyHtml} className="mt-3" />
      <div className={listClass}>
        {section.items.map((role) => (
          <article
            key={role.id}
            className={
              mode === "horizontal"
                ? "min-w-0 flex-1 rounded-xl border border-wf-200 bg-white px-4 py-5 shadow-sm tablet:min-w-[30%]"
                : "rounded-xl border border-wf-200 bg-white px-4 py-5 shadow-sm"
            }
          >
            <CmsPageIcon
              name={role.icon}
              className="h-7 w-7 text-emerald-900"
            />
            <h3 className="mt-3 text-base font-bold text-wf-900">{role.title}</h3>
            <Prose html={role.bodyHtml} className="mt-2" />
            {role.href ? (
              <Link
                href={role.href}
                className="mt-3 inline-flex text-sm font-semibold underline"
              >
                {role.value || role.href}
              </Link>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  )
}

function Faq({ section }: { section: ResolvedCmsPageSection }) {
  return (
    <section>
      {section.title ? (
        <h2 className="text-2xl font-bold text-wf-950">{section.title}</h2>
      ) : null}
      <div className="mt-6 max-w-3xl divide-y divide-wf-200 border-y border-wf-200">
        {section.items.map((item) => (
          <details key={item.id} className="group py-3">
            <summary className="cursor-pointer list-none text-sm font-bold text-wf-900 [&::-webkit-details-marker]:hidden">
              <span className="flex items-start justify-between gap-3">
                {item.title}
                <span className="text-wf-400 transition group-open:rotate-180">
                  ▾
                </span>
              </span>
            </summary>
            <Prose html={item.bodyHtml} className="mt-2 pr-6" />
          </details>
        ))}
      </div>
    </section>
  )
}

function OfferBand({ section }: { section: ResolvedCmsPageSection }) {
  return (
    <section className="rounded-xl bg-gradient-to-br from-wf-900 to-[#1a3a2e] px-4 py-12 text-white tablet:px-8">
      {section.title ? (
        <h2 className="text-2xl font-bold tablet:text-3xl">{section.title}</h2>
      ) : null}
      <Prose
        html={section.bodyHtml}
        className="mt-3 max-w-3xl text-white/85 [&_*]:text-white/85"
      />
      {section.offerValue ? (
        <p className="mt-6 text-xl font-bold tablet:text-2xl">
          {section.offerValue}
        </p>
      ) : null}
      {section.noteHtml ? (
        <div
          className="mt-3 max-w-3xl text-xs text-white/70 tablet:text-sm"
          dangerouslySetInnerHTML={{ __html: section.noteHtml }}
        />
      ) : null}
      <div className="mt-7 flex flex-wrap gap-3">
        {section.ctas.map((cta) => {
          if (!cta.label || !cta.href) return null
          const className =
            cta.variant === "primary"
              ? "rounded-md bg-white px-5 py-2.5 text-sm font-semibold text-wf-900"
              : "rounded-md border border-white/40 px-5 py-2.5 text-sm font-semibold text-white"
          return (
            <Link
              key={cta.id}
              href={cta.href}
              className={className}
              target={cta.openInNewWindow ? "_blank" : undefined}
              rel={cta.openInNewWindow ? "noopener noreferrer" : undefined}
            >
              {cta.label}
            </Link>
          )
        })}
      </div>
    </section>
  )
}

function DefaultSection({ section }: { section: ResolvedCmsPageSection }) {
  const showLegacyCta =
    (section.key === "cta" || section.key === "hero") &&
    section.href &&
    section.ctaLabel
  return (
    <section>
      {section.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={section.image}
          alt=""
          className="mb-5 max-h-72 w-full rounded-xl object-cover"
        />
      ) : null}
      {section.title ? (
        <h2
          className={
            section.key === "hero"
              ? "text-[26px] font-bold text-wf-900 tablet:text-[34px]"
              : "text-[22px] font-bold text-wf-900 tablet:text-[28px]"
          }
        >
          {section.title}
        </h2>
      ) : null}
      <Prose html={section.bodyHtml} className="mt-4" />
      {showLegacyCta ? (
        <div className="mt-5">
          <Link
            href={section.href}
            className="inline-flex h-10 items-center rounded-lg bg-wf-900 px-4 text-[13px] font-semibold text-white hover:bg-wf-800"
          >
            {section.ctaLabel}
          </Link>
        </div>
      ) : null}
      <CtaButtons ctas={section.ctas} />
    </section>
  )
}

function renderSection(section: ResolvedCmsPageSection) {
  switch (section.key) {
    case "score_breakdown":
      return <ScoreBreakdown section={section} />
    case "threshold":
      return <Threshold section={section} />
    case "cards":
    case "usps":
      return <CardsGrid section={section} />
    case "steps":
      return <StepsFlow section={section} />
    case "funnel":
      return <Funnel section={section} />
    case "pricing_highlight":
      return <PricingHighlight section={section} />
    case "roles":
      return <Roles section={section} />
    case "faq":
      return <Faq section={section} />
    case "offer_band":
      return <OfferBand section={section} />
    case "cta_group":
      return (
        <section>
          {section.title ? (
            <h2 className="text-xl font-bold text-wf-900">{section.title}</h2>
          ) : null}
          <Prose html={section.bodyHtml} />
          <CtaButtons ctas={section.ctas} />
        </section>
      )
    default:
      return <DefaultSection section={section} />
  }
}

/**
 * Shared CMS page renderer for live fixed routes, /pagina/[slug], and preview.
 */
export function CmsPageView({
  page,
  locale,
  selectedId = null,
  interactive = false,
}: CmsPageViewProps) {
  return (
    <PublicStorefrontChrome locale={locale}>
      <main>
        {page.sections.length === 0 ? (
          <div className="px-4 py-10 tablet:px-8">
            <p className="text-[13px] text-wf-500">Geen content ingesteld</p>
          </div>
        ) : (
          page.sections.map((section) => {
            const selected = selectedId === section.id
            const shell = `px-4 py-8 tablet:px-8 ${
              interactive && selected ? "outline outline-2 outline-sky-400" : ""
            }`
            return (
              <div
                key={section.id}
                data-cms-section={section.id}
                className={shell}
              >
                {renderSection(section)}
              </div>
            )
          })
        )}
      </main>
    </PublicStorefrontChrome>
  )
}
