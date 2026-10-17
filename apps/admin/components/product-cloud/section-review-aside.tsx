"use client"

import type { ReactNode } from "react"
import type { SectionReviewKey, SectionReviewRow } from "../../lib/product-approval-admin-api"
import { SectionReviewControls, sectionReviewStatusLabel } from "./product-review-panel"

export function SectionSplit(props: { children: ReactNode; aside: ReactNode }) {
  return (
    <div className="grid items-start gap-3 tablet:grid-cols-[minmax(0,1fr)_240px]">
      <div className="min-w-0">{props.children}</div>
      <div>{props.aside}</div>
    </div>
  )
}

export function sectionNotes(input: {
  section: "information" | "media" | "mie" | "ce" | "translations"
  blocked: string[]
  documents: Array<{
    code?: string
    name?: string
    status?: string
    rejection_reason?: string | null
  }>
  manufacturerId?: string
}): { missing: string[]; failed: string[] } {
  const match = {
    information: /productnaam|ean|gtin|merk|categorie|beschrijving|variant/i,
    media: /hoofdafbeelding|afbeelding/i,
    mie: /productieland|made in europe|fabrikant|herkomst|eu\/eer/i,
    ce: /ce|compliance|handleiding|gegevens|app /i,
    translations: /vertal/i,
  }[input.section]
  const missing: string[] = []
  const failed: string[] = []
  for (const reason of input.blocked) {
    if (!match.test(reason)) continue
    if (/ontbreekt|geen /i.test(reason)) missing.push(reason)
    else failed.push(reason)
  }
  for (const doc of input.documents) {
    const code = String(doc.code || "")
    const mine =
      input.section === "mie"
        ? code === "doc.made_in_europe"
        : input.section === "ce"
          ? code.startsWith("doc.") && code !== "doc.made_in_europe"
          : input.section === "translations"
            ? code.startsWith("translation.")
            : false
    if (!mine) continue
    const name = doc.name || code
    if (doc.status === "missing") missing.push(`${name}: ontbreekt`)
    else if (doc.status === "rejected") {
      failed.push(`${name}: afgewezen${doc.rejection_reason ? ` — ${doc.rejection_reason}` : ""}`)
    }
  }
  if (
    input.section === "information" &&
    input.manufacturerId &&
    !/^(mfr_|manu_)/.test(input.manufacturerId)
  ) {
    failed.push("Fabrikantnaam is nog niet gekoppeld aan een bestaand fabrikant-id.")
  }
  return { missing: [...new Set(missing)], failed: [...new Set(failed)] }
}

export function SectionReviewAside(props: {
  productId: string
  sectionKey: SectionReviewKey
  review: SectionReviewRow | undefined
  onSaved: () => Promise<void>
  missing: string[]
  failed: string[]
  hideControls?: boolean
}) {
  const status = props.review?.status ?? "unreviewed"
  return (
    <aside className="rounded border border-wf-200 bg-wf-50 p-3">
      {props.hideControls ? null : (
        <>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-wf-500">Beoordeling</p>
          <p className="text-xs font-semibold text-wf-900">{sectionReviewStatusLabel(status)}</p>
          {status === "unreviewed" ? (
            <p className="mt-1 text-[11px] text-wf-600">Nog niet beoordeeld.</p>
          ) : null}
        </>
      )}
      <p className={`${props.hideControls ? "" : "mt-3"} text-[10px] font-semibold uppercase tracking-wide text-wf-500`}>
        Ontbreekt
      </p>
      {props.missing.length ? (
        <ul className="mt-1 list-disc space-y-1 pl-4 text-[11px] text-wf-800">
          {props.missing.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-1 text-[11px] text-emerald-800">Geen ontbrekende gegevens.</p>
      )}
      {props.failed.length ? (
        <>
          <p className="mt-3 text-[10px] font-semibold uppercase tracking-wide text-wf-500">
            Validatie
          </p>
          <ul className="mt-1 list-disc space-y-1 pl-4 text-[11px] text-amber-900">
            {props.failed.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </>
      ) : null}
      {props.hideControls ? null : (
        <div className="mt-3">
          <SectionReviewControls
            compact
            productId={props.productId}
            sectionKey={props.sectionKey}
            review={props.review}
            onSaved={props.onSaved}
          />
        </div>
      )}
    </aside>
  )
}
