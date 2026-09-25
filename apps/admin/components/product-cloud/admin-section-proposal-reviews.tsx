"use client"

import { useState } from "react"
import { Button } from "@europmade/ui"
import {
  ChangeProposalAdminApiError,
  decideChangeProposal,
  type AdminChangeProposal,
} from "../../lib/change-proposal-admin-api"
import { displayMediaUrl } from "../../lib/media-url"

function matchingChanges(
  row: AdminChangeProposal,
  fields: string[]
): NonNullable<AdminChangeProposal["proposed_fields"]>["changes"] {
  const fromFields = (row.proposed_fields?.changes || []).filter((c) =>
    fields.includes(c.field)
  )
  if (fromFields.length) return fromFields
  const legacy: NonNullable<AdminChangeProposal["proposed_fields"]>["changes"] =
    []
  if (fields.includes("title") && row.proposed_title) {
    legacy.push({
      field: "title",
      label: "Productnaam",
      current_value: null,
      proposed_value: row.proposed_title,
    })
  }
  if (fields.includes("description") && row.proposed_description) {
    legacy.push({
      field: "description",
      label: "Beschrijving",
      current_value: null,
      proposed_value: row.proposed_description,
    })
  }
  return legacy
}

export function AdminSectionProposalReviews(props: {
  proposals: AdminChangeProposal[]
  fields: string[]
  highlightId?: string | null
  onDecided: () => Promise<void> | void
}) {
  const pending = props.proposals.filter(
    (p) =>
      p.status === "In behandeling" &&
      matchingChanges(p, props.fields).length > 0
  )
  if (!pending.length) return null

  return (
    <div className="mt-3 space-y-3">
      {pending.map((row) => (
        <AdminProposalCard
          key={row.id}
          row={row}
          fields={props.fields}
          highlight={props.highlightId === row.id}
          onDecided={props.onDecided}
        />
      ))}
    </div>
  )
}

function AdminProposalCard(props: {
  row: AdminChangeProposal
  fields: string[]
  highlight?: boolean
  onDecided: () => Promise<void> | void
}) {
  const { row, fields, highlight, onDecided } = props
  const [reason, setReason] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const changes = matchingChanges(row, fields)

  async function decide(decision: "accept" | "reject") {
    if (decision === "reject" && !reason.trim()) {
      setError("Vul een terugkoppeling in bij afkeuren.")
      return
    }
    setBusy(true)
    setError(null)
    try {
      await decideChangeProposal(
        row.id,
        decision,
        reason.trim() || undefined
      )
      await onDecided()
    } catch (err) {
      setError(
        err instanceof ChangeProposalAdminApiError
          ? err.message
          : "Beslissing opslaan mislukt."
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      id={`proposal-${row.id}`}
      className={`rounded border p-3 text-xs ${
        highlight
          ? "border-em-green bg-emerald-50/40"
          : "border-amber-300 bg-amber-50/40"
      }`}
    >
      <p className="font-semibold text-wf-900">Wijzigingsvoorstel</p>
      <p className="mt-0.5 font-mono text-[10px] text-wf-500">{row.id}</p>
      <p className="mt-2 text-wf-700">
        Toelichting seller: {row.toelichting || "—"}
      </p>
      {changes.some((c) => c.field === "product_manager") ? (
        <p className="mt-2 rounded border border-amber-200 bg-amber-50 px-2 py-1.5 text-[11px] text-amber-950">
          Dit is een Productbeheerder-aanvraag. Bij goedkeuren wordt de
          aanvrager Productbeheerder (bestaande toewijzing wordt vervangen
          volgens de bestaande regels).
        </p>
      ) : null}
      <div className="mt-2 space-y-2">
        {changes.map((c, idx) => (
          <div
            key={`${c.field}-${c.attribute_definition_id || idx}`}
            className="rounded border border-wf-200 bg-white p-2"
          >
            <p className="font-semibold text-wf-900">{c.label}</p>
            <p className="mt-1 text-[11px] text-wf-500">
              Huidige waarde:{" "}
              <span className="text-wf-800">
                {c.current_value?.trim() || "—"}
              </span>
            </p>
            <p className="mt-0.5 text-[11px] text-wf-500">
              Voorgestelde waarde:{" "}
              <span className="whitespace-pre-wrap font-medium text-wf-900">
                {c.proposed_value}
              </span>
            </p>
            {c.storage_references?.length ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {c.storage_references.map((ref) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={ref}
                    src={displayMediaUrl(ref)}
                    alt="Voorgestelde media"
                    className="h-16 w-16 rounded border border-wf-300 object-cover"
                  />
                ))}
              </div>
            ) : null}
          </div>
        ))}
      </div>
      <label className="mt-3 block text-[11px] text-wf-600">
        Terugkoppeling (verplicht bij afkeuren, optioneel bij goedkeuren)
        <textarea
          className="mt-1 w-full rounded border border-wf-300 bg-white px-2 py-1.5 text-xs"
          rows={2}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </label>
      {error ? <p className="mt-1 text-[11px] text-red-700">{error}</p> : null}
      <p className="mt-2 text-[10px] text-wf-500">
        Eén actie: goedkeuren past het voorstel direct toe; afwijzen slaat de
        reden op. Geen aparte opslagstap.
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          disabled={busy}
          onClick={() => void decide("accept")}
        >
          {busy ? "Bezig…" : "Goedkeuren"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={busy}
          onClick={() => void decide("reject")}
        >
          Afwijzen
        </Button>
      </div>
    </div>
  )
}
