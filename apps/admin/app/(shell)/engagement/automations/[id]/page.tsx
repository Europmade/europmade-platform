"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { Notice } from "@europmade/ui"
import {
  COMMUNICATION_TYPES,
  EngagementAdminApiError,
  createEngagementSequence,
  createEngagementStep,
  deleteEngagementStep,
  listEngagementPrograms,
  listEngagementStartTriggers,
  listEngagementTemplates,
  orderEngagementSteps,
  updateEngagementProgram,
  updateEngagementStep,
  type EngagementProgram,
  type EngagementStep,
  type EngagementTemplate,
  type StartTriggerOption,
} from "../../../../../lib/engagement-admin-api"
import {
  delayLabel,
  delayParts,
  flowSequence,
  minutesFromDelay,
  sendableVariant,
  startLines,
  stepIsSendable,
  stepSubject,
  stepSummary,
  translateAutomationError,
  typeLabel,
  type DelayUnit,
} from "../../../../../lib/engagement-automation"
import { isDemoRecordName } from "../../../../../lib/engagement-demo"
import { isMessageAudience, messageStatus } from "../../../../../lib/engagement-message"

const fieldClass =
  "mt-1 h-9 w-full rounded border border-wf-400 bg-white px-2 text-sm text-wf-900"

function splitIds(value: string): string[] {
  return value
    .split(/[\s,]+/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function messageOf(err: unknown, fallback: string): string {
  const raw = err instanceof EngagementAdminApiError ? err.message : fallback
  return translateAutomationError(raw)
}

function Arrow() {
  return (
    <div className="flex flex-col items-center py-1 text-wf-500" aria-hidden>
      <div className="h-3 w-px bg-wf-400" />
      <div className="text-sm leading-none">↓</div>
    </div>
  )
}

export default function AutomationFlowPage() {
  const { id } = useParams<{ id: string }>()
  const [program, setProgram] = useState<EngagementProgram | null>(null)
  const [templates, setTemplates] = useState<EngagementTemplate[]>([])
  const [name, setName] = useState("")
  const [type, setType] = useState("onboarding")
  const [startTrigger, setStartTrigger] = useState("")
  const [startMode, setStartMode] = useState<"" | "event" | "condition" | "scheduled">("")
  const [scheduleDate, setScheduleDate] = useState("")
  const [scheduleTime, setScheduleTime] = useState("19:00")
  const [scheduleTimezone, setScheduleTimezone] = useState("Europe/Amsterdam")
  const [programAudience, setProgramAudience] = useState("")
  const [locales, setLocales] = useState<string[]>([])
  const [productIds, setProductIds] = useState("")
  const [brandIds, setBrandIds] = useState("")
  const [categoryIds, setCategoryIds] = useState("")
  const [triggers, setTriggers] = useState<StartTriggerOption[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [problems, setProblems] = useState<string[]>([])
  const [pickerOpen, setPickerOpen] = useState(false)

  function applyPrograms(
    programs: EngagementProgram[],
    preferId?: string,
    triggerRows: StartTriggerOption[] = triggers
  ) {
    const next = programs.find((item) => item.id === (preferId ?? id)) ?? null
    setProgram(next)
    if (next) {
      setName(next.name)
      setType(next.program_type)
      setStartTrigger(next.start_trigger ?? "")
      const chosen = triggerRows.find((item) => item.key === next.start_trigger)
      setStartMode(
        next.start_mode === "scheduled"
          ? "scheduled"
          : chosen?.kind === "condition" || next.start_mode === "condition"
            ? "condition"
            : next.start_trigger || next.start_mode === "event"
              ? "event"
              : ""
      )
      const moment = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/.exec(next.scheduled_at ?? "")
      setScheduleDate(moment?.[1] ?? "")
      setScheduleTime(moment?.[2] ?? "19:00")
      setScheduleTimezone(next.schedule_timezone || "Europe/Amsterdam")
      setProgramAudience(isMessageAudience(next.audience) ? next.audience : "")
      const criteria = next.selection_criteria
      setLocales(criteria?.locales ?? [])
      setProductIds((criteria?.product_ids ?? []).join(", "))
      setBrandIds((criteria?.brand_ids ?? []).join(", "))
      setCategoryIds((criteria?.category_ids ?? []).join(", "))
    }
    return next
  }

  function startPayload() {
    const scheduled = startMode === "scheduled"
    const audienceNeeded = type === "newsletter" || type === "campaign"
    return {
      name: name.trim(),
      program_type: type,
      start_mode: startMode || null,
      start_trigger: startMode === "event" || startMode === "condition" ? startTrigger || null : null,
      scheduled_at: scheduled && scheduleDate ? `${scheduleDate}T${scheduleTime || "00:00"}` : null,
      schedule_timezone: scheduled ? scheduleTimezone : null,
      audience: scheduled && audienceNeeded ? programAudience || null : null,
      selection_criteria: audienceNeeded
        ? {
            locales,
            product_ids: splitIds(productIds),
            brand_ids: splitIds(brandIds),
            category_ids: splitIds(categoryIds),
          }
        : null,
    }
  }

  function load() {
    return Promise.all([
      listEngagementPrograms(),
      listEngagementTemplates(),
      listEngagementStartTriggers(),
    ]).then(([programs, templateRows, triggerRows]) => {
        setTemplates(templateRows)
        setTriggers(triggerRows)
        applyPrograms(programs, undefined, triggerRows)
        setError(null)
      }
    )
  }

  useEffect(() => {
    if (!id) return
    let cancelled = false
    load()
      .catch((err: unknown) => {
        if (!cancelled) setError(messageOf(err, "Automatisering laden mislukt."))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
    // load uses id from the closure of this effect
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function run(action: () => Promise<void>) {
    setBusy(true)
    setError(null)
    setNotice(null)
    setProblems([])
    try {
      await action()
    } catch (err: unknown) {
      const message = messageOf(err, "Opslaan mislukt.")
      const lines = message.split("\n").map((line) => line.trim()).filter(Boolean)
      if (lines.length > 1) {
        setError("Deze automatisering kan nog niet worden geactiveerd.")
        setProblems(lines)
      } else {
        setError(message)
      }
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <p className="text-xs text-wf-500">Laden…</p>
  if (!program) {
    return error ? (
      <Notice variant="warning">{error}</Notice>
    ) : (
      <p className="text-xs text-wf-700">Automatisering niet gevonden.</p>
    )
  }

  const sequence = flowSequence(program)
  const steps = sequence?.steps ?? []
  const status = program.activation_status === "active" ? "Actief" : "Concept"
  const start = startLines(program)

  async function ensureSequence() {
    if (!program) throw new Error("Automatisering laden mislukt.")
    if (sequence) return sequence
    const programs = await createEngagementSequence(program.id, name.trim() || program.name)
    const next = applyPrograms(programs, program.id)
    const created = next ? flowSequence(next) : null
    if (!created) throw new Error("De automatisering kon niet worden voorbereid.")
    return created
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/engagement/automations" className="text-[11px] text-wf-600 hover:text-wf-900">
        ← Automatiseringen
      </Link>
      <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[19px] font-bold text-wf-900">{program.name}</h1>
          <p className="mt-1 text-xs text-wf-700">
            {typeLabel(program.program_type)} · <span className="font-semibold">{status}</span>
          </p>
          <p className="mt-2 text-xs text-wf-800">
            <span className="font-semibold">Start: </span>
            {start.title}
          </p>
          {start.note ? <p className="text-[11px] text-wf-500">{start.note}</p> : null}
          <p className="mt-1 text-xs text-wf-600">
            {steps.length === 1 ? "1 bericht" : `${steps.length} berichten`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            className="h-8 rounded border border-wf-400 bg-white px-3 text-[11px] font-medium text-wf-900 disabled:opacity-50"
            onClick={() =>
              run(async () => {
                const programs = await updateEngagementProgram(program.id, startPayload())
                applyPrograms(programs, program.id)
                setNotice("Opgeslagen.")
              })
            }
          >
            Opslaan
          </button>
          <button
            type="button"
            disabled={busy}
            className="h-8 rounded bg-wf-900 px-3 text-[11px] font-medium text-white disabled:opacity-50"
            onClick={() =>
              run(async () => {
                const programs = await updateEngagementProgram(program.id, {
                  ...startPayload(),
                  activate: true,
                })
                const next = applyPrograms(programs, program.id)
                if (next?.activation_status !== "active") {
                  setError("Deze automatisering kan nog niet worden geactiveerd.")
                  return
                }
                setNotice("Deze automatisering is actief. Er wordt niets verzonden.")
              })
            }
          >
            Activeren
          </button>
        </div>
      </div>
      {error ? (
        <div className="mt-3">
          <Notice variant="warning">{error}</Notice>
          {problems.length > 0 ? (
            <ul className="mt-2 list-disc pl-5 text-xs text-wf-800">
              {problems.map((problem) => (
                <li key={problem}>{problem}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
      {notice ? <p className="mt-3 text-xs text-wf-700">{notice}</p> : null}
      <div className="mt-4 grid grid-cols-1 gap-3 tablet:grid-cols-2">
        <label className="text-[11px] text-wf-600">
          Naam
          <input className={fieldClass} value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        <label className="text-[11px] text-wf-600">
          Type
          <select className={fieldClass} value={type} onChange={(event) => setType(event.target.value)}>
            {COMMUNICATION_TYPES.map((item) => (
              <option key={item} value={item}>
                {typeLabel(item)}
              </option>
            ))}
          </select>
        </label>
        <label className="text-[11px] text-wf-600">
          Start
          <select
            className={fieldClass}
            value={startMode}
            onChange={(event) =>
              setStartMode(event.target.value as "" | "event" | "condition" | "scheduled")
            }
          >
            <option value="">Nog geen start</option>
            <option value="event">Automatisch, op een gebeurtenis</option>
            <option value="condition">Automatisch, op basis van gegevens</option>
            <option value="scheduled" disabled={type !== "newsletter" && type !== "campaign"}>
              Handmatig plannen
            </option>
          </select>
        </label>
        {startMode === "event" || startMode === "condition" ? (
          <label className="text-[11px] text-wf-600 tablet:col-span-2">
            Start wanneer
            <select className={fieldClass} value={startTrigger} onChange={(event) => setStartTrigger(event.target.value)}>
              <option value="">Nog geen startmoment</option>
              {(
                [
                  ["sellers", "Verkopers"],
                  ["consumers", "Consumenten"],
                  ["affiliates", "Affiliatepartners"],
                ] as const
              ).map(([audience, label]) => (
                <optgroup key={audience} label={label}>
                  {triggers
                    .filter((item) => item.audience === audience && (item.kind ?? "event") === startMode)
                    .map((item) => (
                      <option key={item.key} value={item.key} disabled={!item.available}>
                        {item.available
                          ? `${item.label} · ${label}`
                          : `${item.label} · ${label} — Nog niet beschikbaar`}
                      </option>
                    ))}
                </optgroup>
              ))}
            </select>
          </label>
        ) : null}
        {startMode === "scheduled" ? (
          <>
            <label className="text-[11px] text-wf-600">
              Startdatum
              <input className={fieldClass} type="date" value={scheduleDate} onChange={(event) => setScheduleDate(event.target.value)} />
            </label>
            <label className="text-[11px] text-wf-600">
              Starttijd
              <input className={fieldClass} type="time" value={scheduleTime} onChange={(event) => setScheduleTime(event.target.value)} />
            </label>
            <label className="text-[11px] text-wf-600">
              Tijdzone
              <select className={fieldClass} value={scheduleTimezone} onChange={(event) => setScheduleTimezone(event.target.value)}>
                <option value="Europe/Amsterdam">Amsterdam</option>
                <option value="Europe/Brussels">Brussel</option>
                <option value="Europe/Berlin">Berlijn</option>
                <option value="Europe/Paris">Parijs</option>
                <option value="Europe/London">Londen</option>
                <option value="UTC">UTC</option>
              </select>
            </label>
            <label className="text-[11px] text-wf-600">
              Doelgroep
              <select className={fieldClass} value={programAudience} onChange={(event) => setProgramAudience(event.target.value)}>
                <option value="">Kies een doelgroep</option>
                <option value="consumers">Consumenten</option>
                <option value="sellers">Verkopers</option>
                <option value="affiliates">Affiliate Partners</option>
              </select>
            </label>
            <p className="text-[11px] text-wf-600 tablet:col-span-2">
              Het geplande moment wordt opgeslagen. Er wordt niets verzonden.
            </p>
          </>
        ) : null}
      </div>
      {type === "newsletter" || type === "campaign" ? (
        <CampaignCriteriaFields
          locales={locales}
          productIds={productIds}
          brandIds={brandIds}
          categoryIds={categoryIds}
          catalog={
            (startMode === "scheduled"
              ? programAudience
              : triggers.find((item) => item.key === startTrigger)?.audience) !== "consumers"
          }
          note={program.selection_note}
          onLocales={setLocales}
          onProducts={setProductIds}
          onBrands={setBrandIds}
          onCategories={setCategoryIds}
        />
      ) : null}

      <div className="mx-auto mt-8 w-full max-w-[440px]">
        <FlowCard title={program.name} meta={typeLabel(program.program_type)} />
        <Arrow />
        <div className="rounded-lg border border-wf-300 bg-wf-50 px-4 py-3 text-center">
          <div className="text-[11px] font-semibold text-wf-500">Start wanneer</div>
          <div className="mt-1 text-sm text-wf-900">{start.title}</div>
          {start.note ? <p className="mt-1 text-[11px] text-wf-600">{start.note}</p> : null}
        </div>
        {steps.map((step, index) => (
          <div key={step.id}>
            <Arrow />
            <WaitEditor
              step={step}
              first={index === 0}
              scheduled={program.start_mode === "scheduled"}
              disabled={busy}
              onSave={(minutes) =>
                run(async () => {
                  if (!sequence) return
                  const programs = await updateEngagementStep(
                    program.id,
                    sequence.id,
                    step.id,
                    {
                      step_order: step.step_order,
                      delay_minutes: minutes,
                      template_id: step.template_id,
                      variant_id: step.variant_id,
                    }
                  )
                  applyPrograms(programs, program.id)
                  setNotice("Wachttijd opgeslagen.")
                })
              }
            />
            <Arrow />
            <MessageCard
              step={step}
              index={index}
              total={steps.length}
              templates={templates}
              disabled={busy}
              onMove={(direction) =>
                run(async () => {
                  if (!sequence) return
                  const ordered = [...steps]
                  const target = index + direction
                  const moved = ordered[index]
                  if (!moved || target < 0 || target >= ordered.length) return
                  ordered.splice(index, 1)
                  ordered.splice(target, 0, moved)
                  const programs = await orderEngagementSteps(
                    program.id,
                    sequence.id,
                    ordered.map((item, order) => ({ id: item.id, step_order: order + 1 }))
                  )
                  applyPrograms(programs, program.id)
                })
              }
              onDelete={() =>
                run(async () => {
                  if (!sequence) return
                  const programs = await deleteEngagementStep(program.id, sequence.id, step.id)
                  applyPrograms(programs, program.id)
                  setNotice("Bericht verwijderd.")
                })
              }
            />
          </div>
        ))}
        <Arrow />
        <div className="rounded-lg border border-dashed border-wf-400 py-3 text-center text-xs font-semibold text-wf-600">
          Einde van deze reeks
        </div>
        <div className="mt-4 text-center">
          <button
            type="button"
            disabled={busy}
            className="h-8 rounded bg-wf-900 px-3 text-[11px] font-medium text-white disabled:opacity-50"
            onClick={() => setPickerOpen(true)}
          >
            + Bericht toevoegen
          </button>
        </div>
      </div>
      {pickerOpen ? (
        <MessagePicker
          templates={templates.filter((template) => !isDemoRecordName(template.name))}
          onClose={() => setPickerOpen(false)}
          onPick={(template) => {
            const variant = sendableVariant(template)
            if (!variant) {
              setError("Dit bericht is nog niet actief.")
              return
            }
            setPickerOpen(false)
            void run(async () => {
              const current = await ensureSequence()
              const nextOrder =
                current.steps.reduce((max, step) => Math.max(max, step.step_order), 0) + 1
              const programs = await createEngagementStep(program.id, current.id, {
                step_order: nextOrder,
                delay_minutes: nextOrder === 1 ? 0 : 1440,
                template_id: template.id,
                variant_id: variant.id,
              })
              applyPrograms(programs, program.id)
              setNotice("Bericht toegevoegd.")
            })
          }}
        />
      ) : null}
    </div>
  )
}

function FlowCard({ title, meta }: { title: string; meta: string }) {
  return (
    <div className="rounded-lg border border-wf-300 bg-white px-4 py-3 text-center shadow-sm">
      <div className="text-sm font-semibold text-wf-900">{title}</div>
      <div className="mt-0.5 text-[11px] text-wf-600">{meta}</div>
    </div>
  )
}

function WaitEditor({
  step,
  first,
  scheduled,
  disabled,
  onSave,
}: {
  step: EngagementStep
  first: boolean
  scheduled: boolean
  disabled: boolean
  onSave: (minutes: number) => void
}) {
  const initial = delayParts(step.delay_minutes)
  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState(String(initial.amount))
  const [unit, setUnit] = useState<DelayUnit>(initial.unit)

  useEffect(() => {
    const next = delayParts(step.delay_minutes)
    setAmount(String(next.amount))
    setUnit(next.unit)
  }, [step.delay_minutes])

  return (
    <div className="text-center">
      <button
        type="button"
        className="rounded-full border border-wf-300 bg-white px-3 py-1 text-xs text-wf-800"
        onClick={() => setOpen((value) => !value)}
      >
        ⏱ {delayLabel(step.delay_minutes, first, scheduled)}
      </button>
      {open ? (
        <div className="mx-auto mt-2 max-w-[280px]">
          {first ? (
            <button
              type="button"
              disabled={disabled}
              className="mb-2 text-[11px] text-wf-800 underline disabled:opacity-50"
              onClick={() => {
                onSave(0)
                setOpen(false)
              }}
            >
              {scheduled ? "Op het geplande moment" : "Direct na start"}
            </button>
          ) : null}
          <div className="flex items-end justify-center gap-2">
          <label className="text-[11px] text-wf-600">
            Wacht
            <input
              className="mt-1 h-8 w-16 rounded border border-wf-400 px-2 text-xs"
              inputMode="numeric"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
          </label>
          <select
            className="h-8 rounded border border-wf-400 bg-white px-2 text-xs"
            value={unit}
            onChange={(event) => setUnit(event.target.value as DelayUnit)}
          >
            <option value="minuten">minuten</option>
            <option value="uren">uren</option>
            <option value="dagen">dagen</option>
          </select>
          <button
            type="button"
            disabled={disabled}
            className="h-8 rounded bg-wf-900 px-2 text-[11px] font-medium text-white disabled:opacity-50"
            onClick={() => {
              const parsed = Number(amount)
              if (!Number.isFinite(parsed) || parsed < 0) return
              onSave(minutesFromDelay(parsed, unit))
              setOpen(false)
            }}
          >
            Opslaan
          </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function MessageCard({
  step,
  index,
  total,
  templates,
  disabled,
  onMove,
  onDelete,
}: {
  step: EngagementStep
  index: number
  total: number
  templates: EngagementTemplate[]
  disabled: boolean
  onMove: (direction: -1 | 1) => void
  onDelete: () => void
}) {
  const [confirm, setConfirm] = useState(false)
  const template = templates.find((item) => item.id === step.template_id)
  const active = stepIsSendable(step, templates)
  const variant = template?.variants.find((item) => item.id === step.variant_id)
  const version = variant?.versions.find((item) => messageStatus(item) === "Actief")
  const status = version ? messageStatus(version) : active ? "Actief" : "Concept"
  const subject = stepSubject(step, templates)
  const summary = stepSummary(step, templates)
  return (
    <article className="rounded-lg border border-wf-300 bg-white px-4 py-3 shadow-sm">
      <div className="text-[11px] text-wf-500">Stap {index + 1}</div>
      <div className="mt-1 text-sm font-semibold text-wf-900">{step.template_name || template?.name || "Bericht"}</div>
      {summary || subject ? (
        <p className="mt-1 text-xs leading-relaxed text-wf-700">{summary || subject}</p>
      ) : null}
      <div className="mt-1 text-[11px] text-wf-600">{status}</div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Link
          href={`/engagement/templates/${step.template_id}`}
          className="inline-flex h-7 items-center rounded border border-wf-300 px-2 text-[11px] text-wf-900"
        >
          Bericht bekijken
        </Link>
        <button
          type="button"
          disabled={disabled || index === 0}
          className="h-7 rounded border border-wf-300 px-2 text-[11px] disabled:opacity-40"
          onClick={() => onMove(-1)}
        >
          ↑
        </button>
        <button
          type="button"
          disabled={disabled || index === total - 1}
          className="h-7 rounded border border-wf-300 px-2 text-[11px] disabled:opacity-40"
          onClick={() => onMove(1)}
        >
          ↓
        </button>
        {confirm ? null : (
          <button
            type="button"
            disabled={disabled}
            className="h-7 rounded border border-wf-300 px-2 text-[11px] text-wf-800"
            onClick={() => setConfirm(true)}
          >
            Verwijderen
          </button>
        )}
      </div>
      {confirm ? (
        <div className="mt-3 rounded border border-wf-300 bg-wf-50 px-3 py-2">
          <p className="text-xs font-semibold text-wf-900">Bericht verwijderen?</p>
          <p className="mt-1 text-[11px] text-wf-700">
            Deze stap wordt uit de automatisering verwijderd.
          </p>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              className="h-7 rounded border border-wf-300 bg-white px-2 text-[11px]"
              onClick={() => setConfirm(false)}
            >
              Annuleren
            </button>
            <button
              type="button"
              disabled={disabled}
              className="h-7 rounded bg-wf-900 px-2 text-[11px] font-medium text-white disabled:opacity-50"
              onClick={onDelete}
            >
              Verwijderen
            </button>
          </div>
        </div>
      ) : null}
    </article>
  )
}

function MessagePicker({
  templates,
  onClose,
  onPick,
}: {
  templates: EngagementTemplate[]
  onClose: () => void
  onPick: (template: EngagementTemplate) => void
}) {
  const [hint, setHint] = useState<string | null>(null)
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4" role="dialog">
      <div className="max-h-[80vh] w-full max-w-md overflow-y-auto rounded-lg border border-wf-300 bg-white p-4">
        <h2 className="text-sm font-bold text-wf-900">Bericht toevoegen</h2>
        <div className="mt-3 divide-y divide-wf-200 border-y border-wf-200">
          {templates.length === 0 ? (
            <p className="py-3 text-xs text-wf-600">Er zijn nog geen berichten van dit type.</p>
          ) : (
            templates.map((template) => {
              const ready = Boolean(sendableVariant(template))
              return (
                <button
                  key={template.id}
                  type="button"
                  className="flex w-full cursor-pointer items-center justify-between gap-3 py-2 text-left hover:bg-wf-50"
                  onClick={() => {
                    if (!ready) {
                      setHint("Dit bericht is nog niet actief.")
                      return
                    }
                    onPick(template)
                  }}
                >
                  <span className="text-sm text-wf-900">{template.name}</span>
                  <span className="text-[11px] text-wf-600">
                    {ready ? "Actief" : "Dit bericht is nog niet actief."}
                  </span>
                </button>
              )
            })
          )}
        </div>
        {hint ? <p className="mt-2 text-xs text-wf-800">{hint}</p> : null}
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            className="h-8 rounded border border-wf-300 px-3 text-[11px]"
            onClick={onClose}
          >
            Annuleren
          </button>
        </div>
      </div>
    </div>
  )
}

function CampaignCriteriaFields({
  locales,
  productIds,
  brandIds,
  categoryIds,
  catalog,
  note,
  onLocales,
  onProducts,
  onBrands,
  onCategories,
}: {
  locales: string[]
  productIds: string
  brandIds: string
  categoryIds: string
  catalog: boolean
  note?: string | null
  onLocales: (locales: string[]) => void
  onProducts: (value: string) => void
  onBrands: (value: string) => void
  onCategories: (value: string) => void
}) {
  return (
    <div className="mt-4 rounded border border-wf-300 bg-wf-50 px-3 py-3">
      <div className="text-[11px] font-semibold text-wf-900">Doelgroep en selectie</div>
      <p className="mt-1 text-[11px] text-wf-700">
        Taal filtert op de taal van het account. Product, merk en categorie filteren alleen verkopers met een gepubliceerd product en affiliatepartners met een productlink. Consumenten hebben die koppeling niet. Uitschrijvingen, voorkeuren en suppressies blijven gelden. Er wordt niets verzonden.
      </p>
      <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-wf-800">
        {(["nl", "en", "de", "fr"] as const).map((locale) => (
          <label key={locale} className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={locales.includes(locale)}
              onChange={(event) =>
                onLocales(
                  event.target.checked
                    ? [...locales, locale]
                    : locales.filter((item) => item !== locale)
                )
              }
            />
            {locale}
          </label>
        ))}
      </div>
      {catalog ? (
        <div className="mt-3 grid grid-cols-1 gap-3 tablet:grid-cols-3">
          <label className="text-[11px] text-wf-600">
            Product-id&apos;s
            <input className={fieldClass} value={productIds} onChange={(event) => onProducts(event.target.value)} />
          </label>
          <label className="text-[11px] text-wf-600">
            Merk-id&apos;s
            <input className={fieldClass} value={brandIds} onChange={(event) => onBrands(event.target.value)} />
          </label>
          <label className="text-[11px] text-wf-600">
            Categorie-id&apos;s
            <input className={fieldClass} value={categoryIds} onChange={(event) => onCategories(event.target.value)} />
          </label>
        </div>
      ) : (
        <p className="mt-2 text-[11px] text-wf-600">
          Voor consumenten geldt alleen de nieuwsbriefinschrijving en de gekozen taal.
        </p>
      )}
      {note ? <p className="mt-2 text-[11px] text-wf-800">{note}</p> : null}
    </div>
  )
}
