"use client"

import { useEffect, useRef, useState } from "react"
import { sanitizeCmsHtml } from "@europmade/utils"
import { adminFetch } from "../../../../../lib/admin-fetch"
import { medusaBackendUrl } from "../../../../../lib/medusa-backend-url"
import { previewHtml } from "../../../../../lib/engagement-message"
import {
  isRichMessage,
  parseMessageBlocks,
  visibleBlocks,
  type MessageBlock,
} from "../../../../../lib/newsletter-document"

function asEmailHtml(value: string): string {
  const withSamples = previewHtml(value).trim()
  if (!withSamples) return "<p>Nog geen tekst.</p>"
  if (/<[a-z][\s\S]*>/i.test(withSamples)) return sanitizeCmsHtml(withSamples)
  const escaped = withSamples
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
  return escaped
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${paragraph.replaceAll("\n", "<br />")}</p>`)
    .join("")
}

function mediaUrl(url: string): string {
  const trimmed = url.trim()
  if (!trimmed) return ""
  if (trimmed.startsWith("/")) return `${medusaBackendUrl()}${trimmed}`
  return trimmed
}

function stopLink(event: { preventDefault: () => void; target: EventTarget | null }) {
  const target = event.target
  if (target instanceof Element && target.closest("a")) event.preventDefault()
}

function VisualImage({ url, alt, tall = false }: { url: string; alt: string; tall?: boolean }) {
  if (!url.trim()) return null
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={mediaUrl(url)} alt={alt} className={`${tall ? "h-52" : "h-40"} w-full object-cover`} />
  )
}

function ProductCard({
  product,
}: {
  product: {
    name: string
    text: string
    imageUrl: string
    linkLabel: string
    linkUrl: string
  }
}) {
  return (
    <article>
      <VisualImage url={product.imageUrl} alt={product.name} />
      <div className="px-4 py-4">
        <h3 className="text-sm font-semibold text-wf-900">{product.name}</h3>
        {product.text ? (
          <p className="mt-1 text-xs leading-relaxed text-wf-700">{product.text}</p>
        ) : null}
        {product.linkLabel && product.linkUrl ? (
          <a
            href={product.linkUrl}
            className="mt-3 inline-block rounded bg-wf-900 px-4 py-2 text-xs font-semibold text-white no-underline"
            onClick={(event) => event.preventDefault()}
          >
            {product.linkLabel}
          </a>
        ) : null}
      </div>
    </article>
  )
}

function BlockView({ block, mobile }: { block: MessageBlock; mobile: boolean }) {
  if (block.kind === "hero") {
    return (
      <>
        <VisualImage url={block.imageUrl} alt={block.headline || "EuropMade"} tall />
        <div className="px-8 pb-2 pt-7 text-center">
          {block.headline ? (
            <h2 className="text-[22px] font-semibold leading-tight text-wf-900">{block.headline}</h2>
          ) : null}
          {block.text ? (
            <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-wf-700">{block.text}</p>
          ) : null}
        </div>
      </>
    )
  }
  if (block.kind === "heading") {
    return <h3 className="px-8 pt-4 text-base font-semibold text-wf-900">{block.text}</h3>
  }
  if (block.kind === "text") {
    return <p className="px-8 py-2 text-sm leading-relaxed text-wf-800">{block.text}</p>
  }
  if (block.kind === "image") {
    return <VisualImage url={block.imageUrl} alt={block.alt} tall />
  }
  if (block.kind === "product") {
    return (
      <div className="bg-white">
        <ProductCard product={block} />
      </div>
    )
  }
  if (block.kind === "product_group") {
    return (
      <section>
        {block.title ? (
          <h3 className="px-8 pb-3 pt-4 text-base font-semibold text-wf-900">{block.title}</h3>
        ) : null}
        <div className={`grid gap-px bg-wf-200 ${mobile ? "grid-cols-1" : "grid-cols-2"}`}>
          {block.products.map((product, index) => (
            <div key={`${product.name}-${index}`} className="bg-white">
              <ProductCard product={product} />
            </div>
          ))}
        </div>
      </section>
    )
  }
  if (block.kind === "cta") {
    return (
      <div className="px-8 py-6 text-center">
        <a
          href={block.url || "#"}
          className="inline-block rounded bg-wf-900 px-5 py-2.5 text-sm font-semibold text-white"
          onClick={(event) => event.preventDefault()}
        >
          {block.label}
        </a>
      </div>
    )
  }
  if (block.kind === "link") {
    return (
      <p className="px-8 py-2 text-center text-sm">
        <a href={block.url || "#"} className="font-semibold text-wf-900 underline" onClick={(event) => event.preventDefault()}>
          {block.label}
        </a>
      </p>
    )
  }
  if (block.kind === "divider") {
    return <hr className="mx-8 my-4 border-wf-200" />
  }
  return (
    <div className={`${mobile ? "" : "grid grid-cols-2"} items-center`}>
      <VisualImage url={block.imageUrl} alt="" />
      <p className="px-6 py-4 text-sm leading-relaxed text-wf-800">{block.text}</p>
    </div>
  )
}

export function MessagePreview({
  subject,
  preheader,
  body,
  ctaLabel,
  ctaUrl,
  mode,
  newsletter = false,
  recipientName = "Maria Müller",
  recipientCompany = "ABC GmbH",
  locale = "nl",
  audience = "consumers",
  onReview,
}: {
  subject: string
  preheader: string
  body: string
  ctaLabel: string
  ctaUrl: string
  mode: "desktop" | "mobile"
  newsletter?: boolean
  recipientName?: string
  recipientCompany?: string
  locale?: string
  audience?: string
  onReview?: (review: { problems: string[]; warnings: string[] }) => void
}) {
  const width = mode === "mobile" ? "w-[320px]" : "w-full max-w-[640px]"
  const visual = body.includes("<!--em-layout:newsletter-->")
  const structured = isRichMessage(body)
  return (
    <div className="rounded-lg bg-wf-100 p-3">
      <div className="mb-3 space-y-1 px-1 text-[11px] text-wf-700">
        <div>
          <span className="font-semibold text-wf-900">Onderwerp </span>
          {previewHtml(subject) || "Geen onderwerp"}
        </div>
        <div>
          <span className="font-semibold text-wf-900">Preheader </span>
          {previewHtml(preheader) || "Geen preheader"}
        </div>
      </div>
      <div className={`mx-auto ${width}`}>
        {visual ? (
          <VisualEmailPreview
            body={body}
            preheader={preheader}
            ctaLabel={ctaLabel}
            ctaUrl={ctaUrl}
            locale={locale}
            audience={audience}
            mode={mode}
            onReview={onReview}
          />
        ) : structured ? (
          <NewsletterFrame
            body={previewHtml(body)}
            ctaLabel={ctaLabel}
            ctaUrl={ctaUrl}
            mobile={mode === "mobile"}
            newsletter={newsletter}
          />
        ) : (
          <LetterFrame
            body={body}
            ctaLabel={ctaLabel}
            ctaUrl={ctaUrl}
            recipientName={recipientName}
            recipientCompany={recipientCompany}
            newsletter={newsletter}
          />
        )}
      </div>
    </div>
  )
}

function VisualEmailPreview({
  body,
  preheader,
  ctaLabel,
  ctaUrl,
  locale,
  audience,
  mode,
  onReview,
}: {
  body: string
  preheader: string
  ctaLabel: string
  ctaUrl: string
  locale: string
  audience: string
  mode: "desktop" | "mobile"
  onReview?: (review: { problems: string[]; warnings: string[] }) => void
}) {
  const [html, setHtml] = useState("")
  const [problems, setProblems] = useState<string[]>([])
  const [warnings, setWarnings] = useState<string[]>([])
  const [status, setStatus] = useState("De nieuwsbrief wordt opgebouwd.")
  const reviewRef = useRef(onReview)
  reviewRef.current = onReview
  useEffect(() => {
    let cancelled = false
    const timer = window.setTimeout(() => {
      void adminFetch("/admin/engagement/newsletter-preview", {
        method: "POST",
        body: JSON.stringify({
          body,
          preheader,
          cta_label: ctaLabel,
          cta_url: ctaUrl,
          locale,
          audience,
        }),
      })
        .then(async (response) => {
          const data = (await response.json().catch(() => ({}))) as {
            html?: string
            problems?: string[]
            warnings?: string[]
            message?: string
          }
          if (cancelled) return
          if (!response.ok) {
            const message = data.message || "De preview is niet beschikbaar."
            setHtml("")
            setProblems([message])
            setWarnings([])
            setStatus("")
            reviewRef.current?.({ problems: [message], warnings: [] })
            return
          }
          const nextProblems = data.problems ?? []
          const nextWarnings = data.warnings ?? []
          setHtml(data.html ?? "")
          setProblems(nextProblems)
          setWarnings(nextWarnings)
          setStatus("")
          reviewRef.current?.({ problems: nextProblems, warnings: nextWarnings })
        })
        .catch(() => {
          if (cancelled) return
          setStatus("")
          setProblems(["De preview is niet beschikbaar."])
          reviewRef.current?.({ problems: ["De preview is niet beschikbaar."], warnings: [] })
        })
    }, 400)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [audience, body, ctaLabel, ctaUrl, locale, preheader])
  const frameWidth = mode === "mobile" ? 320 : 640
  return (
    <div>
      {status ? <p className="mb-2 text-xs text-wf-600">{status}</p> : null}
      {problems.map((problem) => (
        <p key={problem} className="mb-1 text-xs font-semibold text-red-800">
          {problem}
        </p>
      ))}
      {warnings.map((warning) => (
        <p key={warning} className="mb-1 text-xs text-wf-700">
          {warning}
        </p>
      ))}
      {html ? (
        <iframe
          title="Nieuwsbrief"
          sandbox=""
          srcDoc={html}
          style={{ width: frameWidth, height: 1400 }}
          className="mx-auto block border border-wf-300 bg-white"
        />
      ) : null}
    </div>
  )
}

function NewsletterFrame({
  body,
  ctaLabel,
  ctaUrl,
  mobile,
  newsletter,
}: {
  body: string
  ctaLabel: string
  ctaUrl: string
  mobile: boolean
  newsletter: boolean
}) {
  const blocks = visibleBlocks(parseMessageBlocks(body))
  return (
    <article className="overflow-hidden rounded-lg border border-wf-300 bg-white shadow-sm">
      <header className="border-b border-wf-300 px-8 py-4">
        <p className="text-[17px] font-bold tracking-tight text-wf-900">
          Europ<span className="text-wf-700">Made</span>
        </p>
      </header>
      {blocks.map((block, index) => (
        <BlockView key={`${block.kind}-${index}`} block={block} mobile={mobile} />
      ))}
      {ctaLabel.trim() ? (
        <div className="px-8 py-8 text-center">
          {ctaUrl.trim() ? (
            <a
              href={ctaUrl.trim()}
              className="inline-block rounded bg-wf-900 px-5 py-2.5 text-sm font-semibold text-white"
              onClick={(event) => event.preventDefault()}
            >
              {ctaLabel.trim()}
            </a>
          ) : (
            <span className="inline-block rounded bg-wf-900 px-5 py-2.5 text-sm font-semibold text-white">
              {ctaLabel.trim()}
            </span>
          )}
        </div>
      ) : null}
      <MessageFooter newsletter={newsletter} />
    </article>
  )
}

function MessageFooter({ newsletter }: { newsletter: boolean }) {
  if (!newsletter) {
    return (
      <footer className="border-t border-wf-200 bg-wf-50 px-6 py-4 text-xs leading-relaxed text-wf-700">
        Met vriendelijke groet,
        <br />
        EuropMade
      </footer>
    )
  }
  return (
    <footer className="border-t border-wf-200 bg-wf-50 px-8 py-5 text-center text-xs leading-relaxed text-wf-700">
      <div className="font-semibold text-wf-900">EuropMade</div>
      <p className="mt-2">
        Je ontvangt deze nieuwsbrief omdat je je hebt ingeschreven voor de EuropMade-nieuwsbrief.
      </p>
      <a
        href="http://127.0.0.1:3000/nieuwsbrief/uitschrijven/voorbeeld"
        className="mt-2 inline-block font-semibold text-wf-900 underline"
        onClick={(event) => event.preventDefault()}
      >
        Uitschrijven
      </a>
    </footer>
  )
}

function LetterFrame({
  body,
  ctaLabel,
  ctaUrl,
  recipientName,
  recipientCompany,
  newsletter,
}: {
  body: string
  ctaLabel: string
  ctaUrl: string
  recipientName: string
  recipientCompany: string
  newsletter: boolean
}) {
  const html = asEmailHtml(body)
  return (
    <article className="overflow-hidden rounded-lg border border-wf-300 bg-white shadow-sm">
      <header className="border-b border-wf-300 px-6 py-4">
        <p className="text-[15px] font-bold tracking-tight text-wf-900">
          Europ<span className="text-wf-700">Made</span>
        </p>
        <div className="mt-1 text-[11px] text-wf-600">
          Aan {recipientName}
          {recipientCompany ? ` · ${recipientCompany}` : ""}
        </div>
      </header>
      <div
        className="px-6 py-5 text-sm leading-relaxed text-wf-900 [&_a]:underline [&_a[data-em-cta]]:my-2 [&_a[data-em-cta]]:inline-block [&_a[data-em-cta]]:rounded [&_a[data-em-cta]]:bg-wf-900 [&_a[data-em-cta]]:px-4 [&_a[data-em-cta]]:py-2 [&_a[data-em-cta]]:font-semibold [&_a[data-em-cta]]:text-white [&_a[data-em-cta]]:no-underline [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-bold [&_h3]:mb-1 [&_h3]:text-base [&_h3]:font-semibold [&_hr]:my-4 [&_hr]:border-wf-200 [&_img]:my-3 [&_img]:h-auto [&_img]:max-w-full [&_img]:rounded [&_ol]:mb-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-3 [&_ul]:mb-3 [&_ul]:list-disc [&_ul]:pl-5"
        onClick={stopLink}
        dangerouslySetInnerHTML={{ __html: html }}
      />
      {ctaLabel.trim() ? (
        <div className="px-6 pb-6">
          {ctaUrl.trim() ? (
            <a
              href={ctaUrl.trim()}
              className="inline-block rounded bg-wf-900 px-4 py-2 text-sm font-semibold text-white"
              onClick={(event) => event.preventDefault()}
            >
              {ctaLabel.trim()}
            </a>
          ) : (
            <span className="inline-block rounded bg-wf-900 px-4 py-2 text-sm font-semibold text-white">
              {ctaLabel.trim()}
            </span>
          )}
        </div>
      ) : null}
      <MessageFooter newsletter={newsletter} />
    </article>
  )
}
