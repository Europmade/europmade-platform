import { CATEGORY_PRODUCT_RELATION_TYPES } from "@europmade/utils"
import type ProductCloudModuleService from "../../../modules/product-cloud/service"

export type StoredProductRelation = {
  from_product_id: string
  to_product_id: string
  relation_type: string
}

const RELATION_TYPES = new Set<string>(CATEGORY_PRODUCT_RELATION_TYPES)
const MAX_SOURCES = 64
const RELATIONS_PER_SOURCE = 40

/**
 * Stored Product Cloud links from the given products.
 * Unknown relation types and soft-deleted rows are left out.
 */
export async function listStoredProductRelations(
  productCloud: ProductCloudModuleService,
  fromIds: string[]
): Promise<StoredProductRelation[]> {
  const sources: string[] = []
  const seenSources = new Set<string>()
  for (const raw of fromIds) {
    const id = raw.trim()
    if (!id || seenSources.has(id) || sources.length >= MAX_SOURCES) continue
    seenSources.add(id)
    sources.push(id)
  }
  const relations: StoredProductRelation[] = []
  const seen = new Set<string>()
  for (const fromId of sources) {
    const rows = await productCloud.listProductRelations(
      { from_product_id: fromId },
      { take: RELATIONS_PER_SOURCE }
    )
    for (const row of rows) {
      const relation = row as {
        from_product_id?: string | null
        to_product_id?: string | null
        relation_type?: string | null
        deleted_at?: string | null
      }
      if (relation.deleted_at) continue
      const toId = relation.to_product_id?.trim() ?? ""
      const type = relation.relation_type?.trim() ?? ""
      if (!toId || !RELATION_TYPES.has(type) || fromId === toId) continue
      const key = `${fromId}\0${toId}\0${type}`
      if (seen.has(key)) continue
      seen.add(key)
      relations.push({ from_product_id: fromId, to_product_id: toId, relation_type: type })
    }
  }
  return relations
}
