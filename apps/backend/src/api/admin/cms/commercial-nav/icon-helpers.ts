import {
  COMMERCIAL_NAV_GROUPS,
  isCommercialNavKey,
  persistMediaReference,
  pickCommercialNavLabel,
} from "@europmade/utils"
import type CmsModuleService from "../../../../modules/cms/service"

export type CommercialNavIconRow = {
  id: string
  category_key: string
  storage_reference: string
}

function iconService(cms: CmsModuleService) {
  const service = cms as CmsModuleService & {
    listCommercialNavIcons?: Function
    listCmsCommercialNavIcons?: Function
    createCommercialNavIcons?: Function
    createCmsCommercialNavIcons?: Function
    updateCommercialNavIcons?: Function
    updateCmsCommercialNavIcons?: Function
    deleteCommercialNavIcons?: Function
    deleteCmsCommercialNavIcons?: Function
  }
  return {
    list:
      service.listCommercialNavIcons?.bind(cms) ??
      service.listCmsCommercialNavIcons?.bind(cms),
    create:
      service.createCommercialNavIcons?.bind(cms) ??
      service.createCmsCommercialNavIcons?.bind(cms),
    update:
      service.updateCommercialNavIcons?.bind(cms) ??
      service.updateCmsCommercialNavIcons?.bind(cms),
    remove:
      service.deleteCommercialNavIcons?.bind(cms) ??
      service.deleteCmsCommercialNavIcons?.bind(cms),
  }
}

export async function listCommercialNavIconRows(
  cms: CmsModuleService
): Promise<CommercialNavIconRow[]> {
  const { list } = iconService(cms)
  if (!list) return []
  try {
    const rows = (await list({}, { take: 50 })) as CommercialNavIconRow[]
    return Array.isArray(rows) ? rows : []
  } catch {
    return []
  }
}

export async function upsertCommercialNavIcon(
  cms: CmsModuleService,
  categoryKey: string,
  storageReference: string
): Promise<CommercialNavIconRow> {
  const { list, create, update } = iconService(cms)
  if (!list || !create || !update) {
    throw new Error("CMS commercial nav icons are not available.")
  }
  const existing = ((await list(
    { category_key: categoryKey },
    { take: 1 }
  )) as CommercialNavIconRow[])[0]
  if (existing?.id) {
    const updated = (await update({
      id: existing.id,
      storage_reference: storageReference,
    })) as CommercialNavIconRow | CommercialNavIconRow[]
    return Array.isArray(updated) ? updated[0]! : updated
  }
  const created = (await create({
    category_key: categoryKey,
    storage_reference: storageReference,
  })) as CommercialNavIconRow | CommercialNavIconRow[]
  return Array.isArray(created) ? created[0]! : created
}

export async function deleteCommercialNavIcon(
  cms: CmsModuleService,
  categoryKey: string
): Promise<boolean> {
  const { list, remove } = iconService(cms)
  if (!list || !remove) return false
  const existing = ((await list(
    { category_key: categoryKey },
    { take: 1 }
  )) as CommercialNavIconRow[])[0]
  if (!existing?.id) return false
  await remove(existing.id)
  return true
}

export function serializeCommercialNavIconCatalog(
  rows: CommercialNavIconRow[],
  resolveUrl: (ref: string | null) => string | null
) {
  const byKey = new Map(
    rows
      .filter((row) => isCommercialNavKey(row.category_key))
      .map((row) => [row.category_key, row])
  )
  return COMMERCIAL_NAV_GROUPS.map((group) => {
    const row = byKey.get(group.key)
    const ref = persistMediaReference(row?.storage_reference ?? null)
    return {
      key: group.key,
      slug: group.key,
      name: pickCommercialNavLabel(group, "nl"),
      icon_url: resolveUrl(ref),
      storage_reference: ref,
      has_icon: Boolean(ref),
    }
  })
}
