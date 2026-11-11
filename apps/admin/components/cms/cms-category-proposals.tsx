"use client"

import { useEffect, useState } from "react"
import { Button } from "@europmade/ui"
import type { CategoryCmsBlock, CategoryCmsDocumentV2 } from "@europmade/utils"
import {
  acceptCmsCategoryProposal,
  listCmsCategoryProposals,
  modifyCmsCategoryProposal,
  rejectCmsCategoryProposal,
  type CmsCategoryProposalDto,
} from "../../lib/cms-admin-api"
import { CATEGORY_CMS_BLOCK_LABEL } from "../../lib/cms-category-blocks"

const LOCALES = ["nl", "en", "de", "fr"] as const

function draftText(block: CategoryCmsBlock | undefined, locale: string): string {
  if (!block) return ""
  if (block.type === "hero") return block.intro[locale as "nl"] || ""
  if (block.type === "usp_bar") return block.slots.map((slot) => slot.title[locale as "nl"] || "").filter(Boolean).join(" · ")
  if ("body" in block && block.body && typeof block.body === "object") {
    return (block.body as Record<string, string>)[locale] || ""
  }
  if ("title" in block && block.title && typeof block.title === "object") {
    return (block.title as Record<string, string>)[locale] || ""
  }
  return ""
}

function proposalText(proposal: CmsCategoryProposalDto, locale: string): string {
  const fields = proposal.content?.[locale]
  if (!fields) return ""
  return Object.values(fields).filter(Boolean).join("\n")
}

export function CmsCategoryProposals({
  slug,
  doc,
  selectedId,
  locale,
  readOnly,
  draftRevision,
  onAccepted,
  onError,
  refreshKey,
}: {
  slug: string
  doc: CategoryCmsDocumentV2
  selectedId: string
  locale: "nl" | "en" | "de" | "fr"
  readOnly: boolean
  draftRevision: number | null
  onAccepted: () => Promise<void>
  onError: (message: string) => void
  refreshKey: number
}) {
  const [rows, setRows] = useState<CmsCategoryProposalDto[]>([])
  const [costs, setCosts] = useState<Array<{ proposal_id: string; amount_minor: number; currency: string }>>([])
  const [edit, setEdit] = useState("")
  const block = doc.blocks.find((item) => item.id === selectedId)
  const matches = rows.filter((row) => row.block_type === block?.type)
  const proposal =
    matches.find((row) => row.status !== "outdated" && row.status !== "rejected") ??
    matches.find((row) => row.status !== "outdated") ??
    matches[0] ??
    null
  const outdated = proposal?.status === "outdated"

  useEffect(() => {
    listCmsCategoryProposals(slug)
      .then((result) => {
        setRows(result.proposals)
        setCosts(result.costs)
      })
      .catch((err: Error) => onError(err.message))
  }, [slug, refreshKey, onError])

  useEffect(() => {
    setEdit(proposal ? proposalText(proposal, locale) : "")
  }, [proposal, locale])

  if (!rows.length) return null
  const cost = proposal
    ? costs
        .filter((row) => row.proposal_id === proposal.id)
        .reduce((sum, row) => sum + row.amount_minor, 0)
    : 0
  const label = block ? (CATEGORY_CMS_BLOCK_LABEL[block.type] ?? block.type) : ""

  async function decide(action: "accept" | "reject") {
    try {
      if (action === "accept") {
        if (draftRevision == null) {
          onError("Geen draftrevisie. Vernieuw de studio en probeer opnieuw.")
          return
        }
        const result = await acceptCmsCategoryProposal(slug, proposal!.id, draftRevision)
        if (result.applied === false) onError("Niets overgenomen. Handmatige of gevulde velden blijven staan.")
        else await onAccepted()
      } else {
        await rejectCmsCategoryProposal(slug, proposal!.id)
      }
      const fresh = await listCmsCategoryProposals(slug)
      setRows(fresh.proposals)
      setCosts(fresh.costs)
    } catch (err) {
      onError(err instanceof Error ? err.message : "Voorstelactie mislukt")
    }
  }

  async function saveEdit() {
    if (!proposal?.content) return
    const content = {
      ...proposal.content,
      [locale]: { ...proposal.content[locale], body: edit, intro: edit, caption: edit },
    }
    try {
      await modifyCmsCategoryProposal(slug, proposal.id, content)
      const fresh = await listCmsCategoryProposals(slug)
      setRows(fresh.proposals)
    } catch (err) {
      onError(err instanceof Error ? err.message : "Aanpassen mislukt")
    }
  }

  return (
    <section className="space-y-2 rounded-lg border border-wf-200 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-wf-500">Voorstellen</p>
      <ul className="space-y-1 text-[11px] text-wf-600">
        {rows.map((row) => (
          <li key={row.id}>
            {CATEGORY_CMS_BLOCK_LABEL[row.block_type as keyof typeof CATEGORY_CMS_BLOCK_LABEL] ?? row.block_type} · {row.profile} · {row.status}
          </li>
        ))}
      </ul>
      {!proposal || !block ? (
        <p className="text-xs text-wf-500">Selecteer een blok met een voorstel.</p>
      ) : null}
      {proposal && block ? (
        <>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-wf-500">Voorstel · {label}</p>
      <p className="text-xs text-wf-700">
        {proposal.profile} · {proposal.status} · {proposal.confidence} · {locale.toUpperCase()}
        {proposal.missing_locales.includes(locale) ? " · vertaling ontbreekt" : ""}
      </p>
      <p className="break-all text-[11px] text-wf-500">Fingerprint {proposal.fact_fingerprint.slice(0, 12)}</p>
      <p className="text-xs text-wf-600">{proposal.generation_reason}</p>
      <p className="text-[11px] text-wf-500">
        Bronnen: {proposal.used_facts.map((fact) => fact.path).join(", ") || "geen"}
      </p>
      <p className="text-[11px] text-wf-500">
        Ontbreekt: {proposal.missing.map((gap) => gap.code).join(", ") || "niets"}
      </p>
      <p className="text-[11px] text-wf-500">Kosten {cost} {costs[0]?.currency ?? "EUR"}</p>
      <div className="grid gap-2 text-xs">
        <p><span className="font-semibold">Draft:</span> {draftText(block, locale) || "leeg"}</p>
        <p><span className="font-semibold">Voorstel:</span> {proposalText(proposal, locale) || "geen tekst"}</p>
      </div>
      {LOCALES.filter((item) => proposal.missing_locales.includes(item)).length > 0 ? (
        <p className="text-[11px] text-amber-800">Ontbrekende talen: {proposal.missing_locales.join(", ")}</p>
      ) : null}
      {outdated ? (
        <p className="text-[11px] text-amber-800">Verouderd. Een nieuw voorstel ontstaat alleen na een expliciete generatie.</p>
      ) : null}
      {!readOnly && proposal.content && !outdated ? (
        <>
          <textarea className="w-full rounded-lg border border-wf-300 px-2 py-1.5 text-sm" rows={3} value={edit} onChange={(event) => setEdit(event.target.value)} />
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={() => void saveEdit()}>Aanpassen</Button>
            <Button type="button" onClick={() => void decide("accept")}>Accepteren</Button>
            <Button type="button" variant="secondary" onClick={() => void decide("reject")}>Afwijzen</Button>
          </div>
        </>
      ) : null}
      <p className="text-[11px] text-wf-500">Accepteren publiceert niet. Publiceren blijft de aparte knop.</p>
        </>
      ) : null}
    </section>
  )
}
