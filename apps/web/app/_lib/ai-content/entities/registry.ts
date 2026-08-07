/**
 * Entity adapters — category live; Sprint 4 entities registered as stubs.
 */

import type { AiContentEntityType } from "../types"

export type AiEntityAdapter = {
  entityType: AiContentEntityType
  /** Whether generation pipeline is wired for this entity. */
  enabled: boolean
  /** Canonical CMS path hint. */
  cmsCollection: string
}

export const AI_ENTITY_ADAPTERS: Record<AiContentEntityType, AiEntityAdapter> = {
  category: {
    entityType: "category",
    enabled: true,
    cmsCollection: "category_ai_content",
  },
  brand: {
    entityType: "brand",
    enabled: false,
    cmsCollection: "brand_ai_content",
  },
  producer: {
    entityType: "producer",
    enabled: false,
    cmsCollection: "producer_ai_content",
  },
  collection: {
    entityType: "collection",
    enabled: false,
    cmsCollection: "collection_ai_content",
  },
  campaign: {
    entityType: "campaign",
    enabled: false,
    cmsCollection: "campaign_ai_content",
  },
  landing: {
    entityType: "landing",
    enabled: false,
    cmsCollection: "landing_ai_content",
  },
  search: {
    entityType: "search",
    enabled: false,
    cmsCollection: "search_ai_content",
  },
  seller: {
    entityType: "seller",
    enabled: false,
    cmsCollection: "seller_ai_content",
  },
}

export function assertEntityEnabled(entityType: AiContentEntityType): void {
  const adapter = AI_ENTITY_ADAPTERS[entityType]
  if (!adapter?.enabled) {
    throw new Error(
      `AI Content Engine: entity "${entityType}" is registered for Sprint 4 but not enabled yet.`
    )
  }
}
