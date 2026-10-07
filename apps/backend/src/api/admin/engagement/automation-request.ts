import type { MedusaContainer } from "@medusajs/framework/types"
import { MedusaError } from "@medusajs/framework/utils"
import { assertNoStepContent } from "../../../modules/engagement/sequence-rules"
import type EngagementModuleService from "../../../modules/engagement/service"
import { loadEngagementPrograms } from "./admin-engagement-query"
import { cmsService } from "./cms-request"

export function guardStepContent(body: Record<string, unknown>): void {
  try {
    assertNoStepContent(body)
  } catch (err) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      err instanceof Error ? err.message : String(err)
    )
  }
}

export function intField(
  body: Record<string, unknown>,
  key: string,
  label: string,
  required: boolean
): number | undefined {
  if (!(key in body) || body[key] === undefined) {
    if (required) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `${label} is verplicht.`
      )
    }
    return undefined
  }
  const raw = body[key]
  const value =
    typeof raw === "number"
      ? raw
      : typeof raw === "string" && raw.trim() !== ""
        ? Number(raw)
        : Number.NaN
  if (!Number.isInteger(value)) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `${label} moet een geheel getal zijn.`
    )
  }
  return value
}

export async function requireSequenceOnProgram(
  service: EngagementModuleService,
  programId: string,
  sequenceId: string
) {
  const sequence = (await service.retrieveEngagementSequence(sequenceId)) as {
    id: string
    program_id: string
  }
  if (sequence.program_id !== programId) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Sequence hoort niet bij dit LifecycleProgram."
    )
  }
  return sequence
}

export async function requireStepOnSequence(
  service: EngagementModuleService,
  sequenceId: string,
  stepId: string
) {
  const step = (await service.retrieveEngagementSequenceStep(stepId)) as {
    id: string
    sequence_id: string
  }
  if (step.sequence_id !== sequenceId) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "SequenceStep hoort niet bij deze sequence."
    )
  }
  return step
}

export async function respondPrograms(scope: MedusaContainer) {
  return loadEngagementPrograms(scope)
}

export function programsService(scope: MedusaContainer) {
  return cmsService(scope)
}
