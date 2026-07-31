import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import {
  MedusaError,
  Modules,
} from "@medusajs/framework/utils"
import type { MedusaContainer } from "@medusajs/framework/types"
import { AI_SUPPORT_MODULE } from "../../modules/ai-support"
import type { AiSupportServiceApi } from "../../modules/ai-support/service"
import { MODERATION_MODULE } from "../../modules/moderation"
import type ModerationModuleService from "../../modules/moderation/service"
import { PRODUCT_CLOUD_MODULE } from "../../modules/product-cloud"
import type ProductCloudModuleService from "../../modules/product-cloud/service"
import { VERIFICATION_MODULE } from "../../modules/verification"
import type VerificationModuleService from "../../modules/verification/service"
import {
  assertAdvisoryOnly,
  buildAdvisoryRecommendation,
} from "./advisor"

export type GenerateRecommendationInput = {
  subject_type:
    | "moderation_case"
    | "claim"
    | "match_candidate"
    | "product_origin"
  subject_id: string
  /** Forceer nieuwe rij ook als er al één bestaat (default: hergebruik). */
  force?: boolean
}

export type AiMetadataView = {
  id: string
  recommendation_type: string
  confidence_score: number
  explanation: string | null
  subject_type: string
  subject_id: string
  created_at: string | Date
}

async function loadSubjectContext(
  container: MedusaContainer,
  subject_type: GenerateRecommendationInput["subject_type"],
  subject_id: string
): Promise<{
  signal_code: string | null
  case_type: string | null
  queue: string | null
  existing_ai_metadata_id: string | null
  attach: (aiMetadataId: string) => Promise<void>
}> {
  if (subject_type === "moderation_case") {
    const moderation = container.resolve(
      MODERATION_MODULE
    ) as ModerationModuleService
    const row = await moderation.retrieveModerationCase(subject_id)
    return {
      signal_code: row.signal_code,
      case_type: row.case_type,
      queue:
        row.case_type === "Fraude-signaal"
          ? "fraude"
          : row.case_type === "Hoog-risico wijziging"
            ? "hoog-risico"
            : "meldingen",
      existing_ai_metadata_id: row.ai_metadata_id,
      attach: async (aiMetadataId: string) => {
        await moderation.updateModerationCases({
          id: row.id,
          ai_metadata_id: aiMetadataId,
        })
      },
    }
  }

  if (subject_type === "claim") {
    const pc = container.resolve(
      PRODUCT_CLOUD_MODULE
    ) as ProductCloudModuleService
    const row = await pc.retrieveClaim(subject_id)
    return {
      signal_code: null,
      case_type: null,
      queue: "claims",
      existing_ai_metadata_id: row.ai_metadata_id,
      attach: async (aiMetadataId: string) => {
        await pc.updateClaims({ id: row.id, ai_metadata_id: aiMetadataId })
      },
    }
  }

  if (subject_type === "match_candidate") {
    const pc = container.resolve(
      PRODUCT_CLOUD_MODULE
    ) as ProductCloudModuleService
    const row = await pc.retrieveMatchCandidate(subject_id)
    return {
      signal_code: null,
      case_type: null,
      queue: "matching",
      existing_ai_metadata_id: row.ai_metadata_id,
      attach: async (aiMetadataId: string) => {
        await pc.updateMatchCandidates({
          id: row.id,
          ai_metadata_id: aiMetadataId,
        })
      },
    }
  }

  const verification = container.resolve(
    VERIFICATION_MODULE
  ) as VerificationModuleService
  const row = await verification.retrieveProductOrigin(subject_id)
  return {
    signal_code: null,
    case_type: null,
    queue: "disputes",
    existing_ai_metadata_id: row.ai_metadata_id,
    attach: async (aiMetadataId: string) => {
      await verification.updateProductOrigins({
        id: row.id,
        ai_metadata_id: aiMetadataId,
      })
    },
  }
}

/**
 * S3-09-01 — genereer AIMetadata (advies + score), koppel aan subject.
 */
export async function executeGenerateAiRecommendation(
  container: MedusaContainer,
  input: GenerateRecommendationInput
): Promise<{ ai_metadata: AiMetadataView; created: boolean }> {
  const ai = container.resolve(AI_SUPPORT_MODULE) as AiSupportServiceApi
  const eventBus = container.resolve(Modules.EVENT_BUS)

  const ctx = await loadSubjectContext(
    container,
    input.subject_type,
    input.subject_id
  )

  if (ctx.existing_ai_metadata_id && !input.force) {
    try {
      const existing = await ai.retrieveAiMetadata(ctx.existing_ai_metadata_id)
      return {
        ai_metadata: {
          id: existing.id,
          recommendation_type: existing.recommendation_type,
          confidence_score: Number(existing.confidence_score),
          explanation: existing.explanation,
          subject_type: existing.subject_type,
          subject_id: existing.subject_id,
          created_at: existing.created_at,
        },
        created: false,
      }
    } catch {
      // regenerate if dangling ref
    }
  }

  const advice = buildAdvisoryRecommendation({
    subject_type: input.subject_type,
    signal_code: ctx.signal_code,
    case_type: ctx.case_type,
    queue: ctx.queue,
  })
  assertAdvisoryOnly(advice.explanation)

  if (
    !(
      Number.isFinite(advice.confidence_score) &&
      advice.confidence_score > 0 &&
      advice.confidence_score <= 1
    )
  ) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "AI-aanbeveling vereist een geldige betrouwbaarheidsscore (0–1)."
    )
  }

  const created = await ai.createAiMetadata({
    recommendation_type: advice.recommendation_type,
    confidence_score: advice.confidence_score,
    explanation: advice.explanation,
    subject_type: input.subject_type,
    subject_id: input.subject_id,
  })

  await ctx.attach(created.id)

  await eventBus.emit({
    name: "AIRecommendationGenerated",
    data: {
      ai_metadata_id: created.id,
      subject_type: input.subject_type,
      subject_id: input.subject_id,
      recommendation_type: advice.recommendation_type,
      confidence_score: advice.confidence_score,
      entity_type: "ai_metadata",
      entity_id: created.id,
    },
  })

  return {
    ai_metadata: {
      id: created.id,
      recommendation_type: created.recommendation_type,
      confidence_score: Number(created.confidence_score),
      explanation: created.explanation,
      subject_type: created.subject_type,
      subject_id: created.subject_id,
      created_at: created.created_at,
    },
    created: true,
  }
}

export async function executeGetAiMetadataForSubject(
  container: MedusaContainer,
  subject_type: string,
  subject_id: string
): Promise<AiMetadataView | null> {
  const ai = container.resolve(AI_SUPPORT_MODULE) as AiSupportServiceApi
  const rows = await ai.listAiMetadata(
    { subject_type, subject_id },
    { take: 1, order: { created_at: "DESC" } }
  )
  const row = rows[0]
  if (!row) return null
  return {
    id: row.id,
    recommendation_type: row.recommendation_type,
    confidence_score: Number(row.confidence_score),
    explanation: row.explanation,
    subject_type: row.subject_type,
    subject_id: row.subject_id,
    created_at: row.created_at,
  }
}

const generateStep = createStep(
  "generate-ai-recommendation",
  async (input: GenerateRecommendationInput, { container }) => {
    return new StepResponse(
      await executeGenerateAiRecommendation(container, input)
    )
  }
)

export const generateAiRecommendationWorkflow = createWorkflow(
  "generate-ai-recommendation",
  (input: GenerateRecommendationInput) => {
    return new WorkflowResponse(generateStep(input))
  }
)
