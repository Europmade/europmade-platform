/**
 * CMS content store — in-memory mock until Admin CMS / Medusa module persists to DB.
 * Page load only reads; writes happen via generate jobs / admin actions.
 */

import type { AiContentDocument, AiContentEntityType } from "../types"

const globalStore = globalThis as typeof globalThis & {
  __emAiContentStore?: Map<string, AiContentDocument>
}

function store(): Map<string, AiContentDocument> {
  if (!globalStore.__emAiContentStore) {
    globalStore.__emAiContentStore = new Map()
  }
  return globalStore.__emAiContentStore
}

function key(entityType: AiContentEntityType, entityId: string): string {
  return `${entityType}:${entityId}`
}

export function getAiContentDocument(
  entityType: AiContentEntityType,
  entityId: string
): AiContentDocument | null {
  return store().get(key(entityType, entityId)) ?? null
}

export function upsertAiContentDocument(doc: AiContentDocument): AiContentDocument {
  store().set(key(doc.entityType, doc.entityId), doc)
  return doc
}

export function listAiContentDocuments(
  entityType?: AiContentEntityType
): AiContentDocument[] {
  const all = [...store().values()]
  return entityType ? all.filter((d) => d.entityType === entityType) : all
}

export function publishAiContentDocument(
  entityType: AiContentEntityType,
  entityId: string
): AiContentDocument | null {
  const doc = getAiContentDocument(entityType, entityId)
  if (!doc) return null
  const next = { ...doc, published: true }
  return upsertAiContentDocument(next)
}

export function markAiContentStale(
  entityType: AiContentEntityType,
  entityId: string
): void {
  const doc = getAiContentDocument(entityType, entityId)
  if (!doc) return
  upsertAiContentDocument({ ...doc, generationStatus: "stale" })
}
