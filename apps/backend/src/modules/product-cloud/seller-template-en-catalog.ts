/**
 * Central English display catalog for the single Seller Excel template.
 * NL source names remain the import reverse-lookup key.
 */

import { existsSync, readFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

type Entry = { nl: string; en: string; id?: string; slug?: string }

let cached: {
  enToNl: Map<string, string>
  nlToEn: Map<string, string>
  categories: Entry[]
  specs: Entry[]
} | null = null

function resolveData(fileName: string): string | null {
  const moduleDir = path.dirname(fileURLToPath(import.meta.url))
  const candidates = [
    path.join(moduleDir, "data", fileName),
    path.join(process.cwd(), "src/modules/product-cloud/data", fileName),
    path.join(
      process.cwd(),
      "apps/backend/src/modules/product-cloud/data",
      fileName
    ),
  ]
  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate
  }
  return null
}

function norm(value: string): string {
  return String(value || "")
    .replace(/[\u00a0\u1680\u2000-\u200b\u202f\u205f\u3000]/g, " ")
    .replace(/[\r\n\t]+/g, " ")
    .replace(/&/g, " en ")
    .replace(/[_./]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
}

function load() {
  if (cached) return cached
  const enToNl = new Map<string, string>()
  const nlToEn = new Map<string, string>()
  const categories: Entry[] = []
  const specs: Entry[] = []

  const add = (nl: string, en: string, extra?: Partial<Entry>) => {
    if (!nl || !en) return
    const entry = { nl, en, ...extra }
    if (extra?.id || extra?.slug) categories.push(entry)
    else specs.push(entry)
    nlToEn.set(nl, en)
    enToNl.set(norm(en), nl)
    enToNl.set(norm(nl), nl)
  }

  const catPath = resolveData("seller-template-en-categories.json")
  if (catPath) {
    const parsed = JSON.parse(readFileSync(catPath, "utf8")) as {
      entries?: Entry[]
    }
    for (const e of parsed.entries || []) {
      add(e.nl, e.en, { id: e.id, slug: e.slug })
    }
  }
  const specPath = resolveData("seller-template-en-specs.json")
  if (specPath) {
    const parsed = JSON.parse(readFileSync(specPath, "utf8")) as {
      entries?: Entry[]
    }
    for (const e of parsed.entries || []) add(e.nl, e.en)
  }
  const uiPath = resolveData("seller-template-en-ui.json")
  if (uiPath) {
    const parsed = JSON.parse(readFileSync(uiPath, "utf8")) as {
      entries?: Entry[]
    }
    for (const e of parsed.entries || []) add(e.nl, e.en)
  }

  cached = { enToNl, nlToEn, categories, specs }
  return cached
}

/** Map a visible English (or NL) template label back to NL source name. */
export function resolveNlFromSellerTemplateLabel(raw: string): string {
  const value = String(raw || "").trim()
  if (!value) return ""
  return load().enToNl.get(norm(value)) || value
}

export function translateSellerTemplateLabelToEn(nl: string): string {
  const value = String(nl || "").trim()
  if (!value) return ""
  return load().nlToEn.get(value) || value
}

export function sellerTemplateEnCategoryCount(): number {
  return load().categories.length
}

export function sellerTemplateEnSpecCount(): number {
  return load().specs.length
}
