/**
 * Koppelt een startmoment aan actieve automatiseringen.
 * Schrijft geen rijen en verzendt niets.
 */
import { isScheduleDue } from "./automation-start"
import type { AutomationOccurrence } from "./automation-occurrences"
import { addDelayMinutes, pickFirstStep, type OrchestratorStep } from "./orchestrator-rules"

export type DispatchProgram = {
  id: string
  activation_status?: string | null
  start_mode?: string | null
  start_trigger?: string | null
  audience?: string | null
  program_type?: string | null
  selection_criteria?: unknown
  scheduled_at?: string | null
  schedule_timezone?: string | null
  sequences?: Array<{
    id: string
    steps?: Array<{ id: string; step_order?: number; delay_minutes?: number }>
  }>
}

export type EnrollCall = {
  program_id: string
  sequence_id: string
  sequence_step_id: string
  trigger_key: string
  entry_source: string
  next_step_at: Date
  seller_id?: string
  consumer_id?: string
  affiliate_id?: string
}

function isActive(program: DispatchProgram): boolean {
  return program.activation_status !== "concept"
}

function firstStep(program: DispatchProgram): { sequence_id: string; step: OrchestratorStep } | null {
  const sequence =
    (program.sequences ?? []).find((item) => (item.steps ?? []).length > 0) ??
    program.sequences?.[0]
  if (!sequence) return null
  const step = pickFirstStep((sequence.steps ?? []) as OrchestratorStep[])
  if (!step) return null
  return { sequence_id: sequence.id, step }
}

export function planOccurrenceEnrollments(input: {
  programs: DispatchProgram[]
  occurrences: AutomationOccurrence[]
  now: Date
}): EnrollCall[] {
  const calls: EnrollCall[] = []
  for (const occurrence of input.occurrences) {
    if (occurrence.broadcast) continue
    const programs = input.programs.filter(
      (program) =>
        isActive(program) &&
        program.start_mode !== "scheduled" &&
        program.start_trigger === occurrence.trigger
    )
    for (const program of programs) {
      const first = firstStep(program)
      if (!first) continue
      calls.push({
        program_id: program.id,
        sequence_id: first.sequence_id,
        sequence_step_id: first.step.id,
        trigger_key: occurrence.occurrence_key,
        entry_source: occurrence.trigger,
        next_step_at: addDelayMinutes(input.now, Number(first.step.delay_minutes)),
        seller_id: occurrence.seller_id,
        consumer_id: occurrence.consumer_id,
        affiliate_id: occurrence.affiliate_id,
      })
    }
  }
  return calls
}

export type ScheduledRecipient = {
  audience: "sellers" | "consumers" | "affiliates"
  seller_id?: string
  consumer_id?: string
  affiliate_id?: string
}

export function planScheduledEnrollments(input: {
  programs: DispatchProgram[]
  recipients: ScheduledRecipient[]
  now: Date
}): EnrollCall[] {
  const calls: EnrollCall[] = []
  for (const program of input.programs) {
    if (!isActive(program) || program.start_mode !== "scheduled") continue
    if (!isScheduleDue(program.scheduled_at, program.schedule_timezone, input.now)) continue
    const audience = program.audience
    if (audience !== "sellers" && audience !== "consumers" && audience !== "affiliates") continue
    const first = firstStep(program)
    if (!first) continue
    for (const recipient of input.recipients) {
      if (recipient.audience !== audience) continue
      const subject = recipient.seller_id || recipient.consumer_id || recipient.affiliate_id
      if (!subject) continue
      calls.push({
        program_id: program.id,
        sequence_id: first.sequence_id,
        sequence_step_id: first.step.id,
        trigger_key: `scheduled:${program.id}:${subject}`,
        entry_source: "scheduled",
        next_step_at: addDelayMinutes(input.now, Number(first.step.delay_minutes)),
        seller_id: recipient.seller_id,
        consumer_id: recipient.consumer_id,
        affiliate_id: recipient.affiliate_id,
      })
    }
  }
  return calls
}

export function dedupeEnrollCalls(calls: EnrollCall[]): EnrollCall[] {
  const seen = new Set<string>()
  const rows: EnrollCall[] = []
  for (const call of calls) {
    const subject = call.seller_id || call.consumer_id || call.affiliate_id || ""
    const token = `${call.program_id}:${call.trigger_key}:${subject}`
    if (seen.has(token)) continue
    seen.add(token)
    rows.push(call)
  }
  return rows
}
