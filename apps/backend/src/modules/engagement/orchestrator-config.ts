/**
 * Vaste P0-05-koppeling program_type → één programma en één sequence.
 * Geen tabel en geen automatische keuze uit de database.
 */
import { PROGRAM_TYPES, type ProgramType } from "./sequence-rules"

export type OrchestratorProgramSelection = {
  program_id: string
  sequence_id: string
}

export type OrchestratorConfig = Partial<
  Record<ProgramType, OrchestratorProgramSelection>
>

const ENV_KEY: Record<ProgramType, string> = {
  acquisition: "ENGAGEMENT_ACQUISITION",
  onboarding: "ENGAGEMENT_ONBOARDING",
  lifecycle: "ENGAGEMENT_LIFECYCLE",
  newsletter: "ENGAGEMENT_NEWSLETTER",
  campaign: "ENGAGEMENT_CAMPAIGN",
  operational: "ENGAGEMENT_OPERATIONAL",
}

export function readOrchestratorConfig(
  env: Record<string, string | undefined> = process.env
): OrchestratorConfig {
  const config: OrchestratorConfig = {}
  for (const programType of PROGRAM_TYPES) {
    const prefix = ENV_KEY[programType]
    const program_id = env[`${prefix}_PROGRAM_ID`]?.trim() || ""
    const sequence_id = env[`${prefix}_SEQUENCE_ID`]?.trim() || ""
    if (program_id && sequence_id) {
      config[programType] = { program_id, sequence_id }
    }
  }
  return config
}

export function selectProgram(
  config: OrchestratorConfig,
  programType: ProgramType
): OrchestratorProgramSelection | null {
  return config[programType] ?? null
}
