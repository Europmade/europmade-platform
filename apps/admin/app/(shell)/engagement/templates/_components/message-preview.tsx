"use client"

import { sanitizeCmsHtml } from "@europmade/utils"
import { previewHtml } from "../../../../../lib/engagement-message"

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
}) {
  const html = asEmailHtml(body)
  const width = mode === "mobile" ? "w-[320px]" : "w-full max-w-[640px]"
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
        <article className="overflow-hidden rounded-lg border border-wf-300 bg-white shadow-sm">
          <header className="border-b border-wf-200 px-6 py-4">
            <div className="text-sm font-bold tracking-wide text-wf-900">EuropMade</div>
            <div className="mt-1 text-[11px] text-wf-600">
              Aan {recipientName}
              {recipientCompany ? ` · ${recipientCompany}` : ""}
            </div>
          </header>
          <div
            className="px-6 py-5 text-sm leading-relaxed text-wf-900 [&_a]:underline [&_a[data-em-cta]]:my-2 [&_a[data-em-cta]]:inline-block [&_a[data-em-cta]]:rounded [&_a[data-em-cta]]:bg-wf-900 [&_a[data-em-cta]]:px-4 [&_a[data-em-cta]]:py-2 [&_a[data-em-cta]]:font-semibold [&_a[data-em-cta]]:text-white [&_a[data-em-cta]]:no-underline [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-bold [&_h3]:mb-1 [&_h3]:text-base [&_h3]:font-semibold [&_hr]:my-4 [&_hr]:border-wf-200 [&_img]:my-3 [&_img]:h-auto [&_img]:max-w-full [&_img]:rounded [&_ol]:mb-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-3 [&_ul]:mb-3 [&_ul]:list-disc [&_ul]:pl-5"
            onClick={(event) => {
              const target = event.target
              if (target instanceof Element && target.closest("a")) event.preventDefault()
            }}
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
          <footer className="border-t border-wf-200 bg-wf-50 px-6 py-4 text-xs leading-relaxed text-wf-700">
            {newsletter ? (
              <>
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
              </>
            ) : (
              <>
                Met vriendelijke groet,
                <br />
                EuropMade
              </>
            )}
          </footer>
        </article>
      </div>
    </div>
  )
}
