import { MedusaService } from "@medusajs/framework/utils"
import AiMetadata from "./models/ai-metadata"

/**
 * AI-ondersteuningsservice — G. F.1 (S3-09-01).
 * Medusa pluralize behandelt "Metadata" als uncountable → create/listAiMetadata (geen …s).
 */
class AiSupportModuleService extends MedusaService({
  AiMetadata,
}) {}

export type AiMetadataRecord = {
  id: string
  recommendation_type: string
  confidence_score: number
  explanation: string | null
  subject_type: string
  subject_id: string
  created_at: string | Date
  updated_at?: string | Date
}

/** Runtime-API van MedusaService voor AiMetadata (uncountable). */
export type AiSupportServiceApi = AiSupportModuleService & {
  createAiMetadata: (
    data: {
      recommendation_type: string
      confidence_score: number
      explanation: string | null
      subject_type: string
      subject_id: string
    }
  ) => Promise<AiMetadataRecord>
  retrieveAiMetadata: (id: string) => Promise<AiMetadataRecord>
  listAiMetadata: (
    filters?: { subject_type?: string; subject_id?: string },
    config?: { take?: number; order?: Record<string, "ASC" | "DESC"> }
  ) => Promise<AiMetadataRecord[]>
}

export default AiSupportModuleService
