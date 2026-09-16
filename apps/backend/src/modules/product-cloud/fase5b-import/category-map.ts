import { readFileSync } from "node:fs"

export type CategoryMappingEntry = {
  category_id: string
  category_name: string
  slug: string
  reason?: string
}

export type CategoryMappingFile = {
  version: string
  exact_main_categories: Record<string, CategoryMappingEntry>
  main_defaults: Record<string, CategoryMappingEntry & { reason?: string }>
  subcategory_rules: Array<
    CategoryMappingEntry & {
      claude_main: string
      claude_sub: string
      reason: string
    }
  >
}

export function loadCategoryMappingFile(path: string): CategoryMappingFile {
  const raw = readFileSync(path, "utf8")
  return JSON.parse(raw) as CategoryMappingFile
}

function norm(value: string): string {
  return value.trim().toLowerCase()
}

export function resolveCategoryMapping(
  mapping: CategoryMappingFile,
  claudeMain: string,
  claudeSub: string
): CategoryMappingEntry & { reason: string } {
  const main = claudeMain.trim()
  const sub = claudeSub.trim()

  const exact = mapping.exact_main_categories[main]
  if (exact) {
    return { ...exact, reason: "Exacte hoofdcategorie-match" }
  }

  const specific = mapping.subcategory_rules.find(
    (r) => norm(r.claude_main) === norm(main) && norm(r.claude_sub) === norm(sub)
  )
  if (specific) return specific

  const wildcard = mapping.subcategory_rules.find(
    (r) => norm(r.claude_main) === norm(main) && r.claude_sub === "*"
  )
  if (wildcard) return wildcard

  const mainDefault = mapping.main_defaults[main]
  if (mainDefault) return mainDefault

  throw new Error(
    `Geen categorie-mapping voor hoofdcategorie '${main}' subcategorie '${sub}'`
  )
}

export function listRequiredCategoryIds(mapping: CategoryMappingFile): string[] {
  const ids = new Set<string>()
  for (const e of Object.values(mapping.exact_main_categories)) ids.add(e.category_id)
  for (const e of Object.values(mapping.main_defaults)) ids.add(e.category_id)
  for (const r of mapping.subcategory_rules) ids.add(r.category_id)
  return [...ids]
}
