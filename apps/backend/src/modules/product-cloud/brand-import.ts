/**
 * Admin brand/manufacturer import.
 * Reuses the seller column matcher, then applies brand mode:
 * no commercial fields, no offers, explicit language confirmation.
 */

import { IMPORT_FIELDS } from "./import-columns"
import {
  canonicalFieldFromHeader,
  headerMatchKey,
  normalizeHeader,
} from "./import-table"
import { isValidGtin, normalizeGtinDigits } from "./gtin-validation"
import {
  isActiveProductCloudLanguage,
  normalizeLanguageCode,
} from "./languages"
import { type ImportCategoryCatalogEntry } from "./import-category"

export const BRAND_COMMERCIAL_FIELDS = [
  "regular_price",
  "promo_price",
  "stock",
  "sku",
  "delivery_days",
  "shipping_profile_id",
  "shipping_cost",
  "extra_delivery_cost",
  "sales_status",
  "region",
] as const

const COMMERCIAL = new Set<string>(BRAND_COMMERCIAL_FIELDS)

/** Brand import does not map, validate, or store these columns. */
const BRAND_EXCLUDED = new Set(["variant_type", "variant_value", "gpsr_manufacturer_name"])

function excludedColumnMessage(field: string): string {
  if (field === "variant_type" || field === "variant_value") {
    return "Varianttype en variantwaarde worden niet geïmporteerd."
  }
  return "Een aparte fabrikantnaam wordt niet geïmporteerd. Gebruik de kolom Fabrikant."
}

function withoutExcluded(link: BrandColumnLink): BrandColumnLink {
  if (!link.field || !BRAND_EXCLUDED.has(link.field)) return link
  return {
    ...link,
    field: null,
    label: "Niet gekoppeld",
    confidence: "unmapped",
    language_code: null,
    imported: false,
    message: excludedColumnMessage(link.field),
  }
}

const MULTILINGUAL = new Set([
  "title",
  "short_description",
  "description",
  "usps",
  "specifications",
])

const LIST_FIELDS = new Set(["extra_image_urls", "specifications"])

/** Existing document types. These import targets are URL columns, not new product fields. */
export const BRAND_DOCUMENT_FIELDS: Record<
  string,
  { label: string; document_type: string; aliases: string[] }
> = {
  manual_url: {
    label: "Handleiding",
    document_type: "Handleiding",
    aliases: ["handleiding", "manual", "manual url", "handleiding url", "bedienungsanleitung"],
  },
  ce_certificate_url: {
    label: "CE-certificaat",
    document_type: "CE-certificaat",
    aliases: ["ce certificaat", "ce certificate", "ce-certificaat", "ce url"],
  },
  safety_sheet_url: {
    label: "Veiligheidsinformatieblad",
    document_type: "Veiligheidsinformatieblad",
    aliases: ["veiligheidsinformatieblad", "safety data sheet", "sds"],
  },
  conformity_url: {
    label: "Conformiteitsverklaring",
    document_type: "Conformiteitsverklaring",
    aliases: ["conformiteitsverklaring", "declaration of conformity"],
  },
  warranty_url: {
    label: "Garantiebewijs",
    document_type: "Garantiebewijs",
    aliases: ["garantiebewijs", "warranty"],
  },
}

const BRAND_EXTRA_ALIASES: Record<string, string[]> = {
  title: ["artikelnaam", "artikelname", "produktname", "item name", "producttitel"],
  description: ["produktbeschreibung", "item description", "lange beschrijving"],
  brand: ["marke", "brand name"],
  manufacturer: ["hersteller"],
  category: ["produktkategorie", "product category", "warengruppe"],
  subcategory: ["subcategorie", "subcategory", "ondercategorie", "sub category"],
  mpn: ["article number", "item no", "item number", "herstellernummer", "artikelnr"],
  primary_image_url: ["product image", "afbeelding", "bild", "image url", "productfoto"],
  extra_image_urls: ["extra afbeeldingen", "additional images", "gallery", "afbeelding 2", "afbeelding 3"],
  gpsr_manufacturer_name: ["gpsr fabrikantnaam", "gpsr-fabrikantnaam"],
}

const LANG_MARKS: Array<{ re: RegExp; code: string }> = [
  { re: /\((nl|nederlands|dutch)\)/i, code: "nl" },
  { re: /\((de|duits|deutsch|german)\)/i, code: "de" },
  { re: /\((en|engels|english)\)/i, code: "en" },
  { re: /\((fr|frans|french|francais|français)\)/i, code: "fr" },
  { re: /\b(nederlands|dutch)\b/i, code: "nl" },
  { re: /\b(deutsch|german|duits)\b/i, code: "de" },
  { re: /\b(english|engels)\b/i, code: "en" },
  { re: /\b(francais|français|french|frans)\b/i, code: "fr" },
]

const STOPWORDS: Record<string, string[]> = {
  nl: ["de", "het", "een", "van", "voor", "met", "en", "niet", "ook"],
  de: ["der", "die", "das", "und", "mit", "für", "nicht", "ein", "eine"],
  en: ["the", "and", "with", "for", "from", "this", "that"],
  fr: ["le", "la", "les", "des", "une", "pour", "avec", "dans"],
}

const FIELD_LABELS = new Map(IMPORT_FIELDS.map((f) => [f.column, f.nl_name]))

export type BrandLinkConfidence = "certain" | "review" | "unmapped" | "commercial"

export type BrandColumnLink = {
  id: string
  field: string | null
  label: string
  source: string
  sample: string
  confidence: BrandLinkConfidence
  language_code: string | null
  imported: boolean
  message: string | null
}

export type BrandTextSlot = {
  field: "title" | "short_description" | "description" | "usps" | "specifications"
  language_code: string
  value: string
}

export type BrandMediaSlot = {
  role: "primary" | "extra" | "document" | "evidence"
  url: string
  document_type: string | null
  media_type: "Hoofdafbeelding" | "Overige afbeelding" | null
}

/** Existing Made-in-Europe evidence store. Not a new product column. */
export const BRAND_EVIDENCE_FIELDS: Record<string, { label: string; aliases: string[] }> = {
  eu_production_evidence_url: {
    label: "EuropMade-bewijs / bewijs van EU-productie",
    aliases: [
      "europmade-bewijs / bewijs van eu-productie",
      "europmade bewijs",
      "bewijs van eu-productie",
      "bewijs eu productie",
      "made in europe bewijs",
      "eu productie bewijs",
      "herkomstbewijs",
    ],
  },
}

export type ExistingProductHit = {
  product_id: string
  publication_status: string | null
  title: string | null
  description: string | null
  gtin: string | null
  mpn: string | null
  translations: Array<{ field_name: string; language_code: string; value: string }>
}

export type BrandPreviewIssue = {
  row: number
  field: string
  message: string
  blocking: boolean
}

export type BrandPreview = {
  mode: "brand"
  headers: string[]
  links: BrandColumnLink[]
  unknown_columns: string[]
  commercial_columns: string[]
  conflicts: string[]
  language: {
    suggested: string | null
    needs_confirmation: boolean
    confirmed: boolean
    reason: string
  }
  column_languages: Record<string, string>
  profile_applied: boolean
  profile_review_required: boolean
  profile_reason: string | null
  preview: Array<{
    row: number
    status: "new" | "existing" | "error"
    title: string
    ean: string
    texts: BrandTextSlot[]
    issues: BrandPreviewIssue[]
    match: { product_id: string; publication_status: string | null } | null
  }>
  summary: {
    rows: number
    new_products: number
    existing_products: number
    error_rows: number
    duplicates: number
  }
  commit_allowed: boolean
  creates_offers: false
  target_fields: BrandImportTarget[]
  brand_proposals: BrandNameProposal[]
  category_proposals: BrandCategoryProposal[]
}

export type BrandImportTarget = {
  field: string
  label: string
  group: "Productinformatie" | "Media" | "Compliance" | "Categorie"
}

export type BrandNameProposal = {
  name: string
  status: "create" | "ambiguous"
  candidates: Array<{ id: string; name: string }>
}

export type BrandCategoryChoice = {
  kind: "category" | "subcategory"
  raw: string
  action: "create" | "link" | "skip"
  name?: string
  parent_name?: string
  id?: string
}

export type BrandCategoryProposal = {
  kind: "category" | "subcategory"
  raw: string
  status: "create" | "confirm" | "needs_parent"
  parent_name: string | null
  candidates: Array<{ id: string; name: string }>
  message: string
}

export type SavedBrandProfile = {
  source_key: string
  header_signature: string[]
  mapping: Record<string, string | null>
  column_languages: Record<string, string | null>
}

export function headerSignature(headers: string[]): string[] {
  return [...headers]
    .map((h) => headerMatchKey(h))
    .filter(Boolean)
    .sort()
}

export function profileCanAutoApply(
  profile: SavedBrandProfile | null | undefined,
  headers: string[]
): { ok: boolean; reason: string } {
  if (!profile) return { ok: false, reason: "Geen opgeslagen profiel." }
  const current = headerSignature(headers)
  const saved = [...profile.header_signature].map((h) => headerMatchKey(h)).filter(Boolean).sort()
  if (current.join("|") !== saved.join("|")) {
    return {
      ok: false,
      reason: "De kolommen wijken af van het opgeslagen profiel. Controleer de koppeling.",
    }
  }
  return { ok: true, reason: "Kolommen komen overeen met het opgeslagen profiel." }
}

function fieldLabel(field: string | null): string {
  if (!field) return "Niet gekoppeld"
  if (COMMERCIAL.has(field)) {
    const row = IMPORT_FIELDS.find((f) => f.column === field)
    return row ? `${row.nl_name} (niet geïmporteerd)` : `${field} (niet geïmporteerd)`
  }
  if (BRAND_DOCUMENT_FIELDS[field]) return BRAND_DOCUMENT_FIELDS[field].label
  return FIELD_LABELS.get(field) || field
}

function stripLanguage(header: string): { text: string; language: string | null } {
  let text = header
  let language: string | null = null
  for (const mark of LANG_MARKS) {
    if (mark.re.test(text)) {
      language = mark.code
      text = text.replace(mark.re, " ")
      break
    }
  }
  return { text: text.replace(/\s+/g, " ").trim(), language }
}

function extraField(header: string): { field: string; strict: boolean } | null {
  const key = headerMatchKey(header)
  if (!key) return null
  for (const [field, meta] of Object.entries(BRAND_DOCUMENT_FIELDS)) {
    if (meta.aliases.some((a) => headerMatchKey(a) === key)) return { field, strict: true }
  }
  for (const [field, meta] of Object.entries(BRAND_EVIDENCE_FIELDS)) {
    if (meta.aliases.some((a) => headerMatchKey(a) === key)) return { field, strict: true }
  }
  for (const [field, aliases] of Object.entries(BRAND_EXTRA_ALIASES)) {
    if (aliases.some((a) => headerMatchKey(a) === key)) return { field, strict: true }
    const loose = aliases.find(
      (a) => {
        const n = headerMatchKey(a)
        return n.length >= 5 && (key.startsWith(`${n} `) || n.startsWith(`${key} `))
      }
    )
    if (loose) return { field, strict: false }
  }
  return null
}

function sampleFor(headers: string[], rows: string[][], source: string): string {
  const idx = headers.indexOf(source)
  if (idx < 0) return ""
  for (const row of rows) {
    const value = String(row[idx] ?? "").trim()
    if (value) return value.slice(0, 80)
  }
  return ""
}

function classifyHeader(
  header: string,
  sample: string
): { field: string; language: string | null; confidence: BrandLinkConfidence; message: string | null } | null {
  const { text, language } = stripLanguage(header)
  const imageNo = text.match(/^(?:afbeelding|image|bild)\s*(\d+)$/i)
  if (imageNo) {
    const n = Number(imageNo[1])
    return {
      field: n <= 1 ? "primary_image_url" : "extra_image_urls",
      language: null,
      confidence: "certain",
      message: n <= 1 ? null : "Extra afbeelding. Meerdere extra's worden samengevoegd.",
    }
  }
  const strict = canonicalFieldFromHeader(text, "strict")
  const loose = strict ? null : canonicalFieldFromHeader(text, "loose")
  let field = strict || loose
  let confidence: BrandLinkConfidence = strict ? "certain" : "review"
  let message: string | null = loose ? "Losse naammatch. Controleer deze koppeling." : null

  if (!field) {
    const extra = extraField(text)
    if (extra) {
      field = extra.field
      confidence = extra.strict ? "certain" : "review"
      if (!extra.strict) message = "Mogelijke koppeling op basis van de kolomnaam. Controleer."
    }
  }

  const key = headerMatchKey(text)
  if (key === "item description" || key === "omschrijving artikel") {
    const long = sample.length > 80 || sample.includes(".")
    field = long ? "description" : "title"
    confidence = "review"
    message = long
      ? "Voorbeeld lijkt een beschrijving. Bevestig of dit de productbeschrijving is."
      : "Voorbeeld lijkt een productnaam. Bevestig of dit de productnaam is."
  }

  if (!field) return null

  if (MULTILINGUAL.has(field)) {
    const sampleKey = headerMatchKey(sample)
    if (
      ["ja", "nee", "yes", "no", "true", "false"].includes(sampleKey) ||
      /\bbeschikbaar\b|\bavailable\b/i.test(text)
    ) {
      return null
    }
  }

  if (field === "sku" || key === "artikelnummer" || key === "artnr") {
    return {
      field: "mpn",
      language,
      confidence: "review",
      message:
        "Artikelnummer wordt niet als seller-SKU geïmporteerd. Bevestig of dit het fabrikantnummer (MPN) is.",
    }
  }

  if (COMMERCIAL.has(field)) {
    return {
      field,
      language: null,
      confidence: "commercial",
      message: "Commerciële kolom. Wordt niet geïmporteerd en wijzigt geen offer.",
    }
  }

  return { field, language, confidence, message }
}

function scoreLanguage(headers: string[], rows: string[][]): { code: string | null; needs: boolean; reason: string } {
  const scores: Record<string, number> = { nl: 0, de: 0, en: 0, fr: 0 }
  for (const header of headers) {
    const { language, text } = stripLanguage(header)
    if (language) scores[language] += 3
    const key = headerMatchKey(text)
    if (/(productnaam|beschrijving|merk|categorie|fabrikant)/.test(key)) scores.nl += 2
    if (/(artikelname|produktname|beschreibung|marke|hersteller|kategorie)/.test(key)) scores.de += 2
    if (/(product name|description|brand|category|manufacturer)/.test(key)) scores.en += 2
    if (/(nom du produit|description|marque|catégorie)/.test(key)) scores.fr += 2
  }
  const blob = rows
    .slice(0, 5)
    .flat()
    .join(" ")
    .toLowerCase()
  const tokens = blob.split(/[^\p{L}]+/u).filter((t) => t.length > 1)
  for (const token of tokens) {
    for (const [code, words] of Object.entries(STOPWORDS)) {
      if (words.includes(token)) scores[code] += 1
    }
  }
  const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1])
  const [top, second] = ranked
  if (!top || top[1] < 2) {
    return {
      code: null,
      needs: true,
      reason: "De taal is niet betrouwbaar herkend. Kies de taal van de brongegevens.",
    }
  }
  if (second && top[1] - second[1] < 2) {
    return {
      code: top[0],
      needs: true,
      reason: `Meerdere talen zijn mogelijk (${top[0]} en ${second[0]}). Bevestig de brontaal.`,
    }
  }
  return {
    code: top[0],
    needs: false,
    reason: `Voorgestelde brontaal: ${top[0]}.`,
  }
}

export function buildBrandLinks(input: {
  headers: string[]
  rows: string[][]
  manual?: Record<string, string | null>
  column_languages?: Record<string, string | null>
  manual_links?: BrandColumnLink[]
  profile?: SavedBrandProfile | null
}): {
  links: BrandColumnLink[]
  conflicts: string[]
  profile_applied: boolean
  profile_review_required: boolean
  profile_reason: string | null
  unknown_columns: string[]
  commercial_columns: string[]
} {
  const profileDecision = profileCanAutoApply(input.profile, input.headers)
  const manual = input.manual || {}
  const hasManual = Object.keys(manual).length > 0 || Boolean(input.manual_links?.length)
  const conflicts: string[] = []
  if (input.manual_links?.length) {
    const manualLinks = input.manual_links.map((link) =>
      withoutExcluded({
        ...link,
        imported: Boolean(link.field) && link.confidence !== "commercial" && link.imported !== false && !BRAND_EXCLUDED.has(link.field),
        confidence: link.confidence === "commercial" ? ("commercial" as const) : link.field ? ("certain" as const) : ("unmapped" as const),
      })
    )
    const seen = new Map<string, string>()
    for (const link of manualLinks) {
      if (!link.imported || !link.field || LIST_FIELDS.has(link.field)) continue
      const key = `${link.field}:${link.language_code || ""}`
      const prev = seen.get(key)
      if (prev && prev !== link.source) {
        conflicts.push(
          `${fieldLabel(link.field)} wordt door '${prev}' en '${link.source}' gevuld. Kies één kolom.`
        )
      } else seen.set(key, link.source)
    }
    return {
      links: manualLinks,
      conflicts,
      profile_applied: false,
      profile_review_required: false,
      profile_reason: input.profile ? profileDecision.reason : null,
      unknown_columns: manualLinks.filter((l) => !l.imported).map((l) => l.source),
      commercial_columns: manualLinks.filter((l) => l.confidence === "commercial").map((l) => l.source),
    }
  }
  const useProfile = profileDecision.ok && !hasManual
  const assigned = new Set<string>()
  const links: BrandColumnLink[] = []

  const fieldLangKey = (field: string, language: string | null) =>
    `${field}:${language || ""}`

  const taken = new Set<string>()

  if (useProfile && input.profile) {
    for (const [field, source] of Object.entries(input.profile.mapping)) {
      if (!source) continue
      if (!input.headers.includes(source)) continue
      const language = input.profile.column_languages?.[field] || null
      const commercial = COMMERCIAL.has(field)
      const excluded = BRAND_EXCLUDED.has(field)
      links.push(withoutExcluded({
        id: fieldLangKey(field, language),
        field,
        label: fieldLabel(field),
        source,
        sample: sampleFor(input.headers, input.rows, source),
        confidence: commercial ? "commercial" : "certain",
        language_code: commercial || excluded ? null : language,
        imported: !commercial && !excluded,
        message: commercial
          ? "Commerciële kolom. Wordt niet geïmporteerd en wijzigt geen offer."
          : excluded
            ? excludedColumnMessage(field)
            : null,
      }))
      assigned.add(source)
      if (!commercial) taken.add(fieldLangKey(field, language))
    }
  } else {
    for (const header of input.headers) {
      const sample = sampleFor(input.headers, input.rows, header)
      const found = classifyHeader(header, sample)
      if (!found) continue
      const key = fieldLangKey(found.field, found.language)
      if (!COMMERCIAL.has(found.field) && taken.has(key) && !LIST_FIELDS.has(found.field)) {
        const soft = found.confidence === "review"
        if (!soft) {
          conflicts.push(
            `Kolommen botsen op ${fieldLabel(found.field)}${found.language ? ` (${found.language})` : ""}. Kies één bronkolom.`
          )
        }
        links.push({
          id: `conflict:${header}`,
          field: null,
          label: "Niet gekoppeld",
          source: header,
          sample,
          confidence: "unmapped",
          language_code: null,
          imported: false,
          message: soft
            ? found.message || "Niet automatisch gekoppeld. Het doelveld heeft al een kolom."
            : "Niet gekoppeld, omdat het doelveld al een bronkolom heeft.",
        })
        assigned.add(header)
        continue
      }
      const excluded = BRAND_EXCLUDED.has(found.field)
      if (!excluded) taken.add(key)
      links.push(withoutExcluded({
        id: `${found.field}:${header}`,
        field: found.field,
        label: fieldLabel(found.field),
        source: header,
        sample,
        confidence: found.confidence,
        language_code: found.language,
        imported: found.confidence !== "commercial" && !excluded,
        message: excluded ? excludedColumnMessage(found.field) : found.message,
      }))
      assigned.add(header)
    }
  }

  for (const [field, source] of Object.entries(manual)) {
    const existing = links.find((l) => l.field === field && l.imported)
    if (!source) {
      if (existing) {
        existing.imported = false
        existing.field = null
        existing.confidence = "unmapped"
        existing.label = "Niet gekoppeld"
        existing.message = "Handmatig niet gekoppeld."
      }
      continue
    }
    if (!input.headers.includes(source)) continue
    const language =
      input.column_languages?.[field] ||
      existing?.language_code ||
      stripLanguage(source).language
    if (existing) {
      existing.source = source
      existing.sample = sampleFor(input.headers, input.rows, source)
      existing.confidence = "certain"
      existing.language_code = COMMERCIAL.has(field) ? null : language
      existing.imported = !COMMERCIAL.has(field) && !BRAND_EXCLUDED.has(field)
      existing.message = COMMERCIAL.has(field)
        ? "Commerciële kolom. Wordt niet geïmporteerd en wijzigt geen offer."
        : BRAND_EXCLUDED.has(field)
          ? excludedColumnMessage(field)
          : "Handmatig bevestigd."
      if (BRAND_EXCLUDED.has(field)) Object.assign(existing, withoutExcluded(existing))
      assigned.add(source)
    } else {
      links.push(withoutExcluded({
        id: `${field}:${source}`,
        field,
        label: fieldLabel(field),
        source,
        sample: sampleFor(input.headers, input.rows, source),
        confidence: COMMERCIAL.has(field) ? "commercial" : "certain",
        language_code: COMMERCIAL.has(field) ? null : language,
        imported: !COMMERCIAL.has(field) && !BRAND_EXCLUDED.has(field),
        message: COMMERCIAL.has(field)
          ? "Commerciële kolom. Wordt niet geïmporteerd en wijzigt geen offer."
          : BRAND_EXCLUDED.has(field)
            ? excludedColumnMessage(field)
            : "Handmatig bevestigd.",
      }))
      assigned.add(source)
    }
  }

  for (const link of links) {
    const override = input.column_languages?.[link.field || ""]
    if (override && link.imported && link.field && MULTILINGUAL.has(link.field)) {
      const code = normalizeLanguageCode(override)
      if (isActiveProductCloudLanguage(code)) link.language_code = code
    }
  }

  const seen = new Map<string, string>()
  for (const link of links) {
    if (!link.imported || !link.field) continue
    if (LIST_FIELDS.has(link.field)) continue
    const key = fieldLangKey(link.field, link.language_code)
    const prev = seen.get(key)
    if (prev && prev !== link.source) {
      conflicts.push(
        `${fieldLabel(link.field)} wordt door '${prev}' en '${link.source}' gevuld. Kies één kolom.`
      )
    } else {
      seen.set(key, link.source)
    }
  }

  const unknown = input.headers.filter((h) => h.trim() && !assigned.has(h))
  for (const header of unknown) {
    links.push({
      id: `unknown:${header}`,
      field: null,
      label: "Niet gekoppeld",
      source: header,
      sample: sampleFor(input.headers, input.rows, header),
      confidence: "unmapped",
      language_code: null,
      imported: false,
      message: "Geen passend EuropMade-veld. Deze kolom wordt genegeerd.",
    })
  }

  return {
    links,
    conflicts,
    profile_applied: useProfile,
    profile_review_required: Boolean(input.profile) && !profileDecision.ok && !hasManual,
    profile_reason: input.profile ? profileDecision.reason : null,
    unknown_columns: unknown,
    commercial_columns: links.filter((l) => l.confidence === "commercial").map((l) => l.source),
  }
}

function cell(headers: string[], row: string[], source: string): string {
  const idx = headers.indexOf(source)
  if (idx < 0) return ""
  return String(row[idx] ?? "").trim()
}

function readTexts(
  headers: string[],
  row: string[],
  links: BrandColumnLink[],
  sourceLanguage: string
): BrandTextSlot[] {
  const slots: BrandTextSlot[] = []
  for (const link of links) {
    if (!link.imported || !link.field || !MULTILINGUAL.has(link.field)) continue
    const value = cell(headers, row, link.source)
    if (!value) continue
    const language = link.language_code || sourceLanguage
    slots.push({
      field: link.field as BrandTextSlot["field"],
      language_code: language,
      value,
    })
  }
  return slots
}

function readValue(
  headers: string[],
  row: string[],
  links: BrandColumnLink[],
  field: string
): string {
  const parts: string[] = []
  for (const link of links) {
    if (!link.imported || link.field !== field) continue
    const value = cell(headers, row, link.source)
    if (value) parts.push(value)
  }
  if (LIST_FIELDS.has(field)) return parts.join("|")
  return parts[0] || ""
}

export function assessImportUrl(raw: string): { ok: boolean; message: string } {
  const value = raw.trim()
  if (!value) return { ok: true, message: "" }
  if (value.startsWith("/static/")) return { ok: true, message: "" }
  let url: URL
  try {
    url = new URL(value)
  } catch {
    return { ok: false, message: "Geen geldige URL." }
  }
  if (url.protocol !== "https:") {
    return { ok: false, message: "Alleen https-URL's kunnen worden opgehaald." }
  }
  if (url.username || url.password) {
    return { ok: false, message: "URL's met inloggegevens zijn niet toegestaan." }
  }
  const host = url.hostname.toLowerCase()
  if (
    host === "localhost" ||
    host.endsWith(".local") ||
    host === "0.0.0.0" ||
    /^127\./.test(host) ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(host)
  ) {
    return { ok: false, message: "Interne of lokale URL's zijn niet toegestaan." }
  }
  return { ok: true, message: "" }
}

export function normalizeBrandKey(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

export type BrandNameMatch =
  | { status: "exact"; brand: { id: string; name: string } }
  | { status: "ambiguous"; candidates: Array<{ id: string; name: string }> }
  | { status: "create"; name: string }

export function matchBrandName(
  raw: string,
  brands: Array<{ id: string; name: string }>
): BrandNameMatch {
  const name = raw.replace(/\s+/g, " ").trim()
  const key = normalizeBrandKey(name)
  if (!key) return { status: "create", name }
  const exact = brands.filter((b) => normalizeBrandKey(b.name) === key)
  if (exact.length === 1) return { status: "exact", brand: exact[0] }
  if (exact.length > 1) return { status: "ambiguous", candidates: exact }
  const near = brands.filter((b) => {
    const n = normalizeBrandKey(b.name)
    if (!n || n === key || n.length < 4 || key.length < 4) return false
    return n.includes(key) || key.includes(n)
  })
  if (near.length) return { status: "ambiguous", candidates: near }
  return { status: "create", name }
}

const MEDIA_TARGETS = new Set([
  "primary_image_url",
  "extra_image_urls",
  "video_url",
  ...Object.keys(BRAND_DOCUMENT_FIELDS),
])

const COMPLIANCE_TARGETS = new Set([
  "production_country",
  "production_location",
  "ce_marking",
  "app_required",
  "collects_data",
  "product_languages",
  "manual_languages",
])

export function brandImportTargets(): BrandImportTarget[] {
  const rows: BrandImportTarget[] = IMPORT_FIELDS.filter(
    (f) => !COMMERCIAL.has(f.column) && !BRAND_EXCLUDED.has(f.column)
  ).map(
    (f) => ({
      field: f.column,
      label: f.column === "gpsr_manufacturer_name" ? "GPSR-fabrikantnaam" : f.nl_name,
      group: MEDIA_TARGETS.has(f.column)
        ? "Media"
        : f.column === "category" || COMPLIANCE_TARGETS.has(f.column) || f.column.startsWith("gpsr_")
          ? f.column === "category"
            ? "Categorie"
            : "Compliance"
          : "Productinformatie",
    })
  )
  rows.push({ field: "subcategory", label: "Subcategorie", group: "Categorie" })
  for (const [field, meta] of Object.entries(BRAND_EVIDENCE_FIELDS)) {
    rows.push({ field, label: meta.label, group: "Compliance" })
  }
  for (const [field, meta] of Object.entries(BRAND_DOCUMENT_FIELDS)) {
    if (!rows.some((row) => row.field === field)) {
      rows.push({ field, label: meta.label, group: "Media" })
    }
  }
  return rows
}

type BrandCategoryCatalogEntry = ImportCategoryCatalogEntry & { parent_id?: string | null }

function categoryChoiceFor(
  choices: BrandCategoryChoice[] | undefined,
  kind: "category" | "subcategory",
  raw: string
) {
  const key = normalizeBrandKey(raw)
  return (choices || []).find(
    (choice) => choice.kind === kind && normalizeBrandKey(choice.raw) === key
  )
}

export function planCategoryPlacement(
  categoryRaw: string,
  subcategoryRaw: string,
  catalog: BrandCategoryCatalogEntry[],
  choices: BrandCategoryChoice[] = []
): { issues: BrandPreviewIssue[]; proposals: BrandCategoryProposal[] } {
  const issues: BrandPreviewIssue[] = []
  const proposals: BrandCategoryProposal[] = []
  const category = categoryRaw.replace(/\s+/g, " ").trim()
  const subcategory = subcategoryRaw.replace(/\s+/g, " ").trim()
  const hasHierarchy = catalog.some((row) => row.parent_id != null)
  const named = (raw: string, parentId?: string | null) => {
    const key = normalizeBrandKey(raw)
    return catalog.filter((row) => {
      if (normalizeBrandKey(row.name) !== key) return false
      if (!hasHierarchy || parentId === undefined) return true
      return (row.parent_id || null) === parentId
    })
  }

  if (!category) {
    issues.push({
      row: 0,
      field: "category",
      message: "Categorie ontbreekt. Het product kan zonder categorie worden aangemaakt.",
      blocking: false,
    })
  } else if (catalog.length) {
    const roots = hasHierarchy ? named(category, null) : named(category)
    const choice = categoryChoiceFor(choices, "category", category)
    if (roots.length === 1 && choice?.action !== "create") {
      /* exact category */
    } else if (choice?.action === "skip" || choice?.action === "link" || choice?.action === "create") {
      issues.push({
        row: 0,
        field: "category",
        message:
          choice.action === "create"
            ? `Categorie '${choice.name || category}' wordt aangemaakt na bevestiging.`
            : `Categorie '${category}' is bevestigd.`,
        blocking: false,
      })
    } else if (roots.length > 1) {
      proposals.push({
        kind: "category",
        raw: category,
        status: "confirm",
        parent_name: null,
        candidates: roots.map((row) => ({ id: row.id, name: row.name })),
        message: `Categorie '${category}' komt meer dan eens voor. Bevestig de juiste.`,
      })
      issues.push({
        row: 0,
        field: "category",
        message: `Categorie '${category}' komt meer dan eens voor. Bevestig de juiste. De import wordt hierdoor niet geblokkeerd.`,
        blocking: false,
      })
    } else if (!roots.length) {
      proposals.push({
        kind: "category",
        raw: category,
        status: "create",
        parent_name: null,
        candidates: [],
        message: `Categorie '${category}' bestaat nog niet.`,
      })
      issues.push({
        row: 0,
        field: "category",
        message: `Categorie '${category}' bestaat nog niet. Bevestig de naam om hem toe te voegen, of sla hem over. Dit blokkeert de import niet.`,
        blocking: false,
      })
    }
  }

  if (subcategory) {
    const parent = category || null
    const parentHits = category && catalog.length ? (hasHierarchy ? named(category, null) : named(category)) : []
    const parentId = parentHits.length === 1 ? parentHits[0].id : null
    const children =
      catalog.length && parentId && hasHierarchy
        ? named(subcategory, parentId)
        : catalog.length && !hasHierarchy
          ? named(subcategory)
          : []
    const choice = categoryChoiceFor(choices, "subcategory", subcategory)
    if (!parent) {
      proposals.push({
        kind: "subcategory",
        raw: subcategory,
        status: "needs_parent",
        parent_name: null,
        candidates: [],
        message: `Subcategorie '${subcategory}' heeft nog geen hoofdcategorie.`,
      })
      issues.push({
        row: 0,
        field: "subcategory",
        message: `Subcategorie '${subcategory}': kies of voeg eerst een hoofdcategorie toe. Dit blokkeert de import niet.`,
        blocking: false,
      })
    } else if (choice?.action === "create" || choice?.action === "link" || choice?.action === "skip") {
      issues.push({
        row: 0,
        field: "subcategory",
        message:
          choice.action === "create"
            ? `Subcategorie '${choice.name || subcategory}' wordt onder '${choice.parent_name || parent}' aangemaakt na bevestiging.`
            : `Subcategorie '${subcategory}' is bevestigd.`,
        blocking: false,
      })
    } else if (children.length === 1 && normalizeBrandKey(children[0].name) === normalizeBrandKey(subcategory)) {
      /* linked */
    } else if (children.length > 1) {
      proposals.push({
        kind: "subcategory",
        raw: subcategory,
        status: "confirm",
        parent_name: parent,
        candidates: children.map((row) => ({ id: row.id, name: row.name })),
        message: `Subcategorie '${subcategory}' komt meer dan eens voor onder '${parent}'.`,
      })
      issues.push({
        row: 0,
        field: "subcategory",
        message: `Subcategorie '${subcategory}' komt meer dan eens voor. Bevestig de juiste. Dit blokkeert de import niet.`,
        blocking: false,
      })
    } else {
      proposals.push({
        kind: "subcategory",
        raw: subcategory,
        status: parentHits.length === 1 || !catalog.length ? "create" : "needs_parent",
        parent_name: parent,
        candidates: [],
        message: `Subcategorie '${subcategory}' bestaat nog niet onder '${parent}'.`,
      })
      issues.push({
        row: 0,
        field: "subcategory",
        message: `Subcategorie '${subcategory}' bestaat nog niet onder '${parent}'. Bevestig de naam om hem toe te voegen. Dit blokkeert de import niet.`,
        blocking: false,
      })
    }
  }

  return { issues, proposals }
}

export function previewBrandImport(input: {
  headers: string[]
  rows: string[][]
  manual?: Record<string, string | null>
  column_languages?: Record<string, string | null>
  manual_links?: BrandColumnLink[]
  source_language_code?: string | null
  language_confirmed?: boolean
  mapping_confirmed?: boolean
  profile?: SavedBrandProfile | null
  categories?: Array<ImportCategoryCatalogEntry & { parent_id?: string | null }>
  known_brands?: Array<{ id: string; name: string }>
  brand_choices?: Record<string, { action: "use"; id: string } | { action: "create"; name: string }>
  category_choices?: BrandCategoryChoice[]
  existing?: ExistingProductHit[]
}): BrandPreview {
  const built = buildBrandLinks(input)
  const detected = scoreLanguage(input.headers, input.rows)
  const requested = normalizeLanguageCode(input.source_language_code || "")
  const suggested =
    requested && isActiveProductCloudLanguage(requested) ? requested : detected.code
  const confirmed = Boolean(
    input.language_confirmed && requested && isActiveProductCloudLanguage(requested)
  )
  const needs =
    !suggested ||
    !isActiveProductCloudLanguage(suggested) ||
    (detected.needs && !confirmed)
  const sourceLanguage = (confirmed ? requested : suggested) || ""

  const byGtin = new Map<string, ExistingProductHit>()
  const byMpn = new Map<string, ExistingProductHit>()
  for (const hit of input.existing || []) {
    if (hit.gtin) byGtin.set(normalizeGtinDigits(hit.gtin), hit)
    if (hit.mpn) byMpn.set(hit.mpn.trim().toLowerCase(), hit)
  }
  const seenEan = new Set<string>()
  const brandProposals: BrandNameProposal[] = []
  const categoryProposals: BrandCategoryProposal[] = []
  const seenBrand = new Set<string>()
  const seenCategory = new Set<string>()
  const preview: BrandPreview["preview"] = []

  input.rows.forEach((row, index) => {
    const excelRow = index + 2
    const issues: BrandPreviewIssue[] = []
    const eanRaw = readValue(input.headers, row, built.links, "ean")
    const ean = eanRaw ? normalizeGtinDigits(eanRaw) : ""
    const mpn = readValue(input.headers, row, built.links, "mpn")
    const texts = sourceLanguage
      ? readTexts(input.headers, row, built.links, sourceLanguage)
      : []
    const title =
      texts.find((t) => t.field === "title" && t.language_code === sourceLanguage)?.value ||
      texts.find((t) => t.field === "title")?.value ||
      ""
    const brand = readValue(input.headers, row, built.links, "brand")
    const category = readValue(input.headers, row, built.links, "category")
    const subcategory = readValue(input.headers, row, built.links, "subcategory")
    if (ean && !isValidGtin(ean)) {
      issues.push({
        row: excelRow,
        field: "ean",
        message: `Rij ${excelRow}, EAN/GTIN: ongeldig (lengte of checksum).`,
        blocking: true,
      })
    }
    if (ean && seenEan.has(ean)) {
      issues.push({
        row: excelRow,
        field: "ean",
        message: `Rij ${excelRow}, EAN/GTIN: komt vaker voor in dit bestand.`,
        blocking: true,
      })
    }
    if (ean) seenEan.add(ean)
    const hit =
      (ean && isValidGtin(ean) ? byGtin.get(ean) : undefined) ||
      (!ean && mpn ? byMpn.get(mpn.toLowerCase()) : undefined) ||
      null
    if (!hit) {
      if (!title) {
        issues.push({
          row: excelRow,
          field: "title",
          message: `Rij ${excelRow}, productnaam: verplicht bij een nieuw product.`,
          blocking: true,
        })
      }
      if (!brand) {
        issues.push({
          row: excelRow,
          field: "brand",
          message: `Rij ${excelRow}, merk: verplicht bij een nieuw product.`,
          blocking: true,
        })
      } else {
        const choice = input.brand_choices?.[normalizeBrandKey(brand)]
        const match = matchBrandName(brand, input.known_brands || [])
        const key = normalizeBrandKey(choice?.action === "create" ? choice.name : brand)
        if (choice?.action === "use" || (match.status === "exact" && choice?.action !== "create")) {
          /* unique existing brand */
        } else if (choice?.action === "create" || match.status === "create") {
          const createName = choice?.action === "create" ? choice.name : match.status === "create" ? match.name : brand
          issues.push({
            row: excelRow,
            field: "brand",
            message: `Rij ${excelRow}, merk '${createName}': nieuw merk wordt aangemaakt. Het is niet automatisch geverifieerd.`,
            blocking: false,
          })
          if (!seenBrand.has(key)) {
            seenBrand.add(key)
            brandProposals.push({ name: createName, status: "create", candidates: [] })
          }
        } else if (match.status === "ambiguous") {
          issues.push({
            row: excelRow,
            field: "brand",
            message: `Rij ${excelRow}, merk '${brand}': komt overeen met ${match.candidates.map((c) => c.name).join(", ")}. Bevestig welk merk, of maak een nieuw merk.`,
            blocking: true,
          })
          if (!seenBrand.has(key)) {
            seenBrand.add(key)
            brandProposals.push({
              name: brand,
              status: "ambiguous",
              candidates: match.candidates,
            })
          }
        }
      }
      if (input.categories) {
        const placement = planCategoryPlacement(
          category,
          subcategory,
          input.categories,
          input.category_choices
        )
        for (const issue of placement.issues) {
          issues.push({ ...issue, row: excelRow, message: `Rij ${excelRow}, ${issue.message}` })
        }
        for (const proposal of placement.proposals) {
          const key = `${proposal.kind}:${normalizeBrandKey(proposal.raw)}`
          if (seenCategory.has(key)) continue
          seenCategory.add(key)
          categoryProposals.push(proposal)
        }
      }
      if (!ean && !mpn) {
        issues.push({
          row: excelRow,
          field: "identifier",
          message: `Rij ${excelRow}: vul EAN/GTIN of MPN in. Seller-SKU telt niet als productidentiteit.`,
          blocking: true,
        })
      }
    }
    for (const link of built.links) {
      if (!link.imported || !link.field) continue
      const value = cell(input.headers, row, link.source)
      if (!value) continue
      if (
        link.field === "primary_image_url" ||
        link.field === "extra_image_urls" ||
        link.field.endsWith("_url")
      ) {
        const parts = value.split(/[|;]/).map((p) => p.trim()).filter(Boolean)
        for (const part of parts) {
          const checked = assessImportUrl(part)
          if (!checked.ok) {
            issues.push({
              row: excelRow,
              field: link.field,
              message: `Rij ${excelRow}, ${link.label}: ${checked.message}`,
              blocking: true,
            })
          }
        }
      }
    }
    const images = collectBrandImageSlots(input.headers, row, built.links)
    if (images.overflow.length) {
      issues.push({
        row: excelRow,
        field: "extra_image_urls",
        message: `Rij ${excelRow}: maximaal ${BRAND_IMAGE_LIMIT} afbeeldingen, waarvan één hoofdafbeelding. Niet meegenomen: ${images.overflow.join(", ")}.`,
        blocking: true,
      })
    }
    const blocking = issues.some((i) => i.blocking)
    preview.push({
      row: excelRow,
      status: blocking ? "error" : hit ? "existing" : "new",
      title,
      ean,
      texts,
      issues,
      match: hit
        ? { product_id: hit.product_id, publication_status: hit.publication_status }
        : null,
    })
  })

  const errorRows = preview.filter((p) => p.status === "error").length
  const reviewOpen = built.links.some((l) => l.confidence === "review" && l.imported)
  const languageBlocks = needs && !confirmed
  const commitAllowed =
    errorRows === 0 &&
    built.conflicts.length === 0 &&
    !languageBlocks &&
    !built.profile_review_required &&
    preview.length > 0 &&
    Boolean(sourceLanguage) &&
    (!reviewOpen || Boolean(input.mapping_confirmed))

  return {
    mode: "brand",
    headers: input.headers,
    links: built.links,
    unknown_columns: built.unknown_columns,
    commercial_columns: built.commercial_columns,
    conflicts: built.conflicts,
    language: {
      suggested,
      needs_confirmation: needs && !confirmed,
      confirmed,
      reason: detected.reason,
    },
    column_languages: Object.fromEntries(
      built.links
        .filter((l) => l.imported && l.language_code && l.field)
        .map((l) => [l.id, l.language_code as string])
    ),
    profile_applied: built.profile_applied,
    profile_review_required: built.profile_review_required,
    profile_reason: built.profile_reason,
    preview,
    summary: {
      rows: preview.length,
      new_products: preview.filter((p) => p.status === "new").length,
      existing_products: preview.filter((p) => p.status === "existing").length,
      error_rows: errorRows,
      duplicates: preview.filter((p) => p.match).length,
    },
    commit_allowed: commitAllowed,
    creates_offers: false,
    target_fields: brandImportTargets(),
    brand_proposals: brandProposals,
    category_proposals: categoryProposals,
  }
}

export type BrandCommitAction =
  | {
      type: "create"
      row: number
      title: string
      description: string
      source_language_code: string
      brand_name: string
      manufacturer: string
      category: string
      subcategory: string
      ean: string
      mpn: string
      texts: BrandTextSlot[]
      media: BrandMediaSlot[]
      attributes: Record<string, string>
    }
  | {
      type: "proposal"
      row: number
      product_id: string
      changes: Array<{ field: string; language_code: string; current_value: string; proposed_value: string }>
    }
  | {
      type: "add_translations"
      row: number
      product_id: string
      texts: BrandTextSlot[]
    }

export function planBrandCommit(
  preview: BrandPreview,
  input: {
    headers: string[]
    rows: string[][]
    existing?: ExistingProductHit[]
    mapping_confirmed?: boolean
  }
): { blocked: boolean; reason: string | null; actions: BrandCommitAction[]; creates_offers: false } {
  if (!preview.commit_allowed || !input.mapping_confirmed) {
    return {
      blocked: true,
      reason: preview.commit_allowed
        ? "Bevestig de kolomkoppeling en de taal voordat je importeert."
        : "Import geblokkeerd. Los de fouten op. Er is niets weggeschreven.",
      actions: [],
      creates_offers: false,
    }
  }
  if (preview.summary.error_rows > 0 || preview.conflicts.length) {
    return {
      blocked: true,
      reason: "Import geblokkeerd door fouten in het bestand. Er is niets weggeschreven.",
      actions: [],
      creates_offers: false,
    }
  }
  const sourceLanguage = preview.language.confirmed
    ? preview.language.suggested || ""
    : preview.language.suggested || ""
  const byGtin = new Map<string, ExistingProductHit>()
  const byMpn = new Map<string, ExistingProductHit>()
  for (const hit of input.existing || []) {
    if (hit.gtin) byGtin.set(normalizeGtinDigits(hit.gtin), hit)
    if (hit.mpn) byMpn.set(hit.mpn.trim().toLowerCase(), hit)
  }
  const actions: BrandCommitAction[] = []
  input.rows.forEach((row, index) => {
    const view = preview.preview[index]
    if (!view || view.status === "error") return
    const ean = view.ean
    const mpn = readValue(input.headers, row, preview.links, "mpn")
    const hit =
      (ean ? byGtin.get(ean) : undefined) ||
      (!ean && mpn ? byMpn.get(mpn.toLowerCase()) : undefined)
    const texts = view.texts
    if (!hit) {
      const description = composeSourceDescription(texts, sourceLanguage)
      const title =
        texts.find((t) => t.field === "title" && t.language_code === sourceLanguage)?.value ||
        texts.find((t) => t.field === "title")?.value ||
        ""
      actions.push({
        type: "create",
        row: view.row,
        title,
        description,
        source_language_code: sourceLanguage,
        brand_name: readValue(input.headers, row, preview.links, "brand"),
        manufacturer: readValue(input.headers, row, preview.links, "manufacturer"),
        category: readValue(input.headers, row, preview.links, "category"),
        subcategory: readValue(input.headers, row, preview.links, "subcategory"),
        ean,
        mpn,
        texts,
        media: mediaSlots(input.headers, row, preview.links),
        attributes: attributeValues(input.headers, row, preview.links),
      })
      return
    }
    const existingKeys = new Set(
      hit.translations.map((t) => `${t.field_name}:${t.language_code}`)
    )
    if (hit.title) existingKeys.add(`title:${sourceLanguage}`)
    if (hit.description) existingKeys.add(`description:${sourceLanguage}`)
    const proposals: Array<{
      field: string
      language_code: string
      current_value: string
      proposed_value: string
    }> = []
    const additions: BrandTextSlot[] = []
    for (const text of texts) {
      const key = `${text.field}:${text.language_code}`
      const current =
        hit.translations.find(
          (t) => t.field_name === text.field && t.language_code === text.language_code
        )?.value ||
        (text.field === "title" && text.language_code === sourceLanguage ? hit.title : null) ||
        (text.field === "description" && text.language_code === sourceLanguage
          ? hit.description
          : null) ||
        ""
      if (!current) {
        additions.push(text)
        continue
      }
      if (current.trim() === text.value.trim()) continue
      proposals.push({
        field: text.field,
        language_code: text.language_code,
        current_value: current,
        proposed_value: text.value,
      })
    }
    if (proposals.length) {
      actions.push({ type: "proposal", row: view.row, product_id: hit.product_id, changes: proposals })
    }
    if (additions.length) {
      actions.push({
        type: "add_translations",
        row: view.row,
        product_id: hit.product_id,
        texts: additions,
      })
    }
  })
  return { blocked: false, reason: null, actions, creates_offers: false }
}

function composeSourceDescription(texts: BrandTextSlot[], sourceLanguage: string): string {
  const pick = (field: BrandTextSlot["field"]) =>
    texts.find((t) => t.field === field && t.language_code === sourceLanguage)?.value || ""
  return [pick("short_description"), pick("description"), pick("usps"), pick("specifications")]
    .filter(Boolean)
    .join("\n\n")
}

export const BRAND_IMAGE_LIMIT = 10

function imageParts(value: string): string[] {
  return value.split(/[|;]/).map((part) => part.trim()).filter(Boolean)
}

/** One primary image plus up to nine extras, in column order, without duplicate URLs. */
export function collectBrandImageSlots(
  headers: string[],
  row: string[],
  links: BrandColumnLink[]
): { slots: BrandMediaSlot[]; overflow: string[] } {
  const seen = new Set<string>()
  const slots: BrandMediaSlot[] = []
  const add = (url: string, role: "primary" | "extra") => {
    if (!url || seen.has(url)) return
    seen.add(url)
    slots.push({
      role,
      url,
      document_type: null,
      media_type: role === "primary" ? "Hoofdafbeelding" : "Overige afbeelding",
    })
  }
  const primary = imageParts(readValue(headers, row, links, "primary_image_url"))[0]
  if (primary) add(primary, "primary")
  for (const link of links) {
    if (!link.imported || link.field !== "extra_image_urls") continue
    for (const url of imageParts(cell(headers, row, link.source))) add(url, "extra")
  }
  return {
    slots: slots.slice(0, BRAND_IMAGE_LIMIT),
    overflow: slots.slice(BRAND_IMAGE_LIMIT).map((slot) => slot.url),
  }
}

function mediaSlots(headers: string[], row: string[], links: BrandColumnLink[]): BrandMediaSlot[] {
  const slots: BrandMediaSlot[] = [...collectBrandImageSlots(headers, row, links).slots]
  for (const [field, meta] of Object.entries(BRAND_DOCUMENT_FIELDS)) {
    const url = readValue(headers, row, links, field)
    if (!url) continue
    slots.push({
      role: "document",
      url,
      document_type: meta.document_type,
      media_type: null,
    })
  }
  for (const field of Object.keys(BRAND_EVIDENCE_FIELDS)) {
    const url = readValue(headers, row, links, field)
    if (!url) continue
    slots.push({
      role: "evidence",
      url,
      document_type: null,
      media_type: null,
    })
  }
  return slots
}

const PRODUCTION_COUNTRY_NAMES: Record<string, string> = {
  nederland: "NL",
  netherlands: "NL",
  holland: "NL",
  belgie: "BE",
  belgium: "BE",
  duitsland: "DE",
  germany: "DE",
  deutschland: "DE",
  frankrijk: "FR",
  france: "FR",
  oostenrijk: "AT",
  austria: "AT",
  osterreich: "AT",
  italie: "IT",
  italy: "IT",
  spanje: "ES",
  spain: "ES",
  polen: "PL",
  poland: "PL",
}

export function normalizeProductionCountry(raw: string): string {
  const trimmed = raw.trim()
  if (/^[A-Za-z]{2}$/.test(trimmed)) return trimmed.toUpperCase()
  return PRODUCTION_COUNTRY_NAMES[normalizeBrandKey(trimmed)] || trimmed
}

function attributeValues(
  headers: string[],
  row: string[],
  links: BrandColumnLink[]
): Record<string, string> {
  const skip = new Set([
    ...MULTILINGUAL,
    ...COMMERCIAL,
    "ean",
    "mpn",
    "brand",
    "manufacturer",
    "category",
    "variant_type",
    "variant_value",
    "gpsr_manufacturer_name",
    "subcategory",
    "eu_production_evidence_url",
    "primary_image_url",
    "extra_image_urls",
    "video_url",
    ...Object.keys(BRAND_DOCUMENT_FIELDS),
  ])
  const out: Record<string, string> = {}
  for (const link of links) {
    if (!link.imported || !link.field || skip.has(link.field)) continue
    const value = cell(headers, row, link.source)
    if (value) {
      out[link.field] =
        link.field === "production_country" ? normalizeProductionCountry(value) : value
    }
  }
  return out
}

/** Removes category rows created in the current write, newest first. */
export async function undoCreatedCategoryIds(
  ids: string[],
  remove: (id: string) => Promise<void>
): Promise<void> {
  for (const id of [...ids].reverse()) {
    await remove(id).catch(() => undefined)
  }
}

export function assertBrandPlanHasNoOffers(actions: BrandCommitAction[]): void {
  for (const action of actions) {
    if ((action as { type: string }).type === "offer") {
      throw new Error("Een merkimport mag geen offer aanmaken.")
    }
    const json = JSON.stringify(action)
    if (/"regular_price"|"seller_sku"|"quantity_available"/.test(json)) {
      throw new Error("Een merkimport mag geen commerciële offergegevens bevatten.")
    }
  }
}
