/**
 * Central NL/EN/DE/FR display labels for Seller import templates.
 * Stable keys are category slugs / NL source names; technical IDs stay unchanged.
 */

import { existsSync, readFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import type { TemplateLocale } from "./import-template-i18n"

function normalizeDisplayKey(value: string): string {
  return String(value || "")
    .replace(/[\u00a0\u1680\u2000-\u200b\u202f\u205f\u3000]/g, " ")
    .replace(/[\r\n\t]+/g, " ")
    .replace(/&/g, " en ")
    .replace(/[_./]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
}

export type DisplayI18nEntry = {
  slug?: string
  nl: string
  en: string
  de: string
  fr: string
}

type CatalogFile = {
  version?: number
  entries?: DisplayI18nEntry[]
}

let cached: {
  byNl: Map<string, DisplayI18nEntry>
  /** normalizeCategoryKey(any locale label) → NL source name */
  toNl: Map<string, string>
} | null = null

function resolveCatalogPath(): string | null {
  const fileName = "import-template-display-i18n.json"
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

function loadCatalog() {
  if (cached) return cached
  const byNl = new Map<string, DisplayI18nEntry>()
  const toNl = new Map<string, string>()
  const filePath = resolveCatalogPath()
  if (filePath) {
    try {
      const parsed = JSON.parse(readFileSync(filePath, "utf8")) as CatalogFile
      for (const entry of parsed.entries || []) {
        if (!entry?.nl) continue
        byNl.set(entry.nl, entry)
        for (const loc of ["nl", "en", "de", "fr"] as const) {
          const label = String(entry[loc] || "").trim()
          if (!label) continue
          toNl.set(normalizeDisplayKey(label), entry.nl)
        }
      }
    } catch {
      /* keep empty maps */
    }
  }
  cached = { byNl, toNl }
  return cached
}

export function translateImportDisplayName(
  nlName: string,
  locale: TemplateLocale
): string {
  const raw = String(nlName || "").trim()
  if (!raw || locale === "nl") return raw
  const hit = loadCatalog().byNl.get(raw)
  if (!hit) return raw
  return hit[locale] || hit.en || hit.nl || raw
}

/** Map a visible template label (any supported locale) back to NL source name. */
export function resolveNlDisplayName(raw: string): string {
  const value = String(raw || "").trim()
  if (!value) return ""
  const key = normalizeDisplayKey(value)
  return loadCatalog().toNl.get(key) || value
}

/**
 * Longest-first NL→locale replacements for XLSX sheet XML text nodes.
 * Skips tiny tokens to avoid mangling formulas/defined names.
 */
export function buildDisplayReplacementPairs(
  locale: TemplateLocale
): Array<[string, string]> {
  if (locale === "nl") return []
  const pairs: Array<[string, string]> = []
  for (const entry of loadCatalog().byNl.values()) {
    const to = entry[locale] || entry.en || entry.nl
    if (!to || to === entry.nl) continue
    if (entry.nl.length < 3) continue
    pairs.push([entry.nl, to])
  }
  pairs.sort((a, b) => b[0].length - a[0].length)
  return pairs
}
