"use client"

import { useState } from "react"

const fieldClass =
  "mt-1 h-8 w-full rounded border border-wf-400 bg-white px-2 text-xs text-wf-900"

export function AiDraftDialog({
  busy,
  defaultKind,
  onClose,
  onCreate,
}: {
  busy: boolean
  defaultKind: "newsletter" | "email" | "follow_up"
  onClose: () => void
  onCreate: (input: {
    kind: "newsletter" | "email" | "follow_up"
    idea: string
    goal: string
    tone: string
    length: "kort" | "normaal" | "uitgebreid"
  }) => void
}) {
  const [kind, setKind] = useState(defaultKind)
  const [idea, setIdea] = useState("")
  const [goal, setGoal] = useState("")
  const [tone, setTone] = useState("Professioneel en enthousiast")
  const [length, setLength] = useState<"kort" | "normaal" | "uitgebreid">("normaal")
  const [error, setError] = useState<string | null>(null)

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4" role="dialog">
      <form
        className="w-full max-w-lg rounded-lg border border-wf-300 bg-white p-4"
        onSubmit={(event) => {
          event.preventDefault()
          if (!idea.trim() || !goal.trim()) {
            setError("Vul een onderwerp en een doel in.")
            return
          }
          onCreate({ kind, idea: idea.trim(), goal: goal.trim(), tone: tone.trim(), length })
        }}
      >
        <h2 className="text-sm font-bold text-wf-900">Maken met AI</h2>
        <p className="mt-1 text-[11px] text-wf-600">
          Dit wordt een concept. Het wordt niet goedgekeurd en niet verzonden.
        </p>
        <fieldset className="mt-3">
          <legend className="text-[11px] text-wf-600">Wat wil je maken?</legend>
          <div className="mt-1 space-y-1 text-xs text-wf-900">
            {(
              [
                ["newsletter", "Nieuwsbrief"],
                ["email", "E-mailbericht"],
                ["follow_up", "Opvolgbericht"],
              ] as const
            ).map(([value, label]) => (
              <label key={value} className="flex items-center gap-2">
                <input
                  type="radio"
                  name="kind"
                  checked={kind === value}
                  onChange={() => setKind(value)}
                />
                {label}
              </label>
            ))}
          </div>
        </fieldset>
        <p className="mt-3 text-[11px] text-wf-600">
          Doelgroep
          <span className="mt-1 block text-xs text-wf-900">Consumenten</span>
        </p>
        <label className="mt-3 block text-[11px] text-wf-600">
          Onderwerp / idee
          <input
            className={fieldClass}
            value={idea}
            onChange={(event) => setIdea(event.target.value)}
            placeholder="Nieuwe Europese merken uit Nederland"
          />
        </label>
        <label className="mt-3 block text-[11px] text-wf-600">
          Doel
          <input
            className={fieldClass}
            value={goal}
            onChange={(event) => setGoal(event.target.value)}
            placeholder="Deze merken onder de aandacht brengen"
          />
        </label>
        <label className="mt-3 block text-[11px] text-wf-600">
          Toon
          <input className={fieldClass} value={tone} onChange={(event) => setTone(event.target.value)} />
        </label>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <label className="text-[11px] text-wf-600">
            Taal
            <input className={fieldClass} value="Nederlands" readOnly />
          </label>
          <label className="text-[11px] text-wf-600">
            Lengte
            <select
              className={fieldClass}
              value={length}
              onChange={(event) => setLength(event.target.value as "kort" | "normaal" | "uitgebreid")}
            >
              <option value="kort">Kort</option>
              <option value="normaal">Normaal</option>
              <option value="uitgebreid">Uitgebreid</option>
            </select>
          </label>
        </div>
        {error ? <p className="mt-3 text-xs text-wf-800">{error}</p> : null}
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" className="h-8 rounded border border-wf-300 px-3 text-[11px]" onClick={onClose}>
            Annuleren
          </button>
          <button
            type="submit"
            disabled={busy}
            className="h-8 rounded bg-wf-900 px-3 text-[11px] font-medium text-white disabled:opacity-50"
          >
            Concept maken
          </button>
        </div>
      </form>
    </div>
  )
}
