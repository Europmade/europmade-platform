import {
  collectCategoryCmsAssetIds,
  resolveCategoryCmsAssetUrls,
  resolveMediaUrl,
} from "@europmade/utils"
import { CMS_MODULE } from "../../modules/cms"
import type CmsModuleService from "../../modules/cms/service"

type Scope = { resolve: (key: string) => unknown }

type CategoryPdShape = {
  draft?: { document?: unknown } | null
  published?: { document?: unknown } | null
}

async function assetUrlMap(scope: Scope, documents: unknown[], origin: string) {
  const ids = [...new Set(documents.flatMap((document) => collectCategoryCmsAssetIds(document)))]
  if (!ids.length) return new Map<string, string>()
  const cms = scope.resolve(CMS_MODULE) as CmsModuleService
  const rows = (await cms.listCmsAssets({ id: ids }, { take: ids.length })) as Array<{
    id?: string
    storage_reference?: string | null
  }>
  const urls = new Map<string, string>()
  for (const row of rows) {
    if (!row.id) continue
    const url = resolveMediaUrl(row.storage_reference ?? null, origin)
    if (url) urls.set(row.id, url)
  }
  return urls
}

/** Refresh response copies only. The stored draft and published JSON stay untouched. */
export async function withResolvedCategoryMedia<T extends CategoryPdShape>(
  scope: Scope | undefined,
  category: T,
  origin: string
): Promise<T> {
  if (!scope) return category
  try {
    const urls = await assetUrlMap(scope, [category.draft?.document, category.published?.document], origin)
    if (!urls.size) return category
    return {
      ...category,
      draft:
        category.draft && category.draft.document
          ? { ...category.draft, document: resolveCategoryCmsAssetUrls(category.draft.document, urls) }
          : category.draft,
      published:
        category.published && category.published.document
          ? {
              ...category.published,
              document: resolveCategoryCmsAssetUrls(category.published.document, urls),
            }
          : category.published,
    }
  } catch {
    return category
  }
}

export async function withResolvedStoreDocument<T>(
  scope: Scope,
  document: T,
  origin: string
): Promise<T> {
  try {
    const urls = await assetUrlMap(scope, [document], origin)
    if (!urls.size) return document
    return resolveCategoryCmsAssetUrls(document, urls)
  } catch {
    return document
  }
}
