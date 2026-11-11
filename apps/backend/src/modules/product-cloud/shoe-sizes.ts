/**
 * EU shoe size is a product specification. UK comes from the fixed table.
 * Existing Maat rows stay in the database and are not migrated here.
 * EU is the stored size. UK is a display lookup. Missing pairs stay empty.
 * There is no formula and no rounding.
 */

export type ShoeAudience = "dames" | "heren" | "kinderen"

export const CLOTHING_SIZE_LABELS = ["XS", "S", "M", "L", "XL"] as const

/**
 * Only these pairs exist. EU 41 is 7.5 for women and 7 for men on purpose.
 * A size that is absent here has no UK equivalent.
 */
export const EU_TO_UK: Record<ShoeAudience, Readonly<Record<string, string>>> = {
  dames: {
    "35": "2.5",
    "36": "3.5",
    "37": "4",
    "38": "5",
    "39": "6",
    "40": "6.5",
    "41": "7.5",
    "42": "8",
  },
  heren: {
    "39": "6",
    "40": "6.5",
    "41": "7",
    "42": "8",
    "43": "9",
    "44": "9.5",
    "45": "10.5",
    "46": "11",
    "47": "12",
  },
  kinderen: {
    "20": "4",
    "21": "4.5",
    "22": "5",
    "23": "6",
    "24": "7",
    "25": "7.5",
    "26": "8.5",
    "27": "9",
    "28": "10",
    "29": "11",
    "30": "11.5",
    "31": "12.5",
    "32": "13",
    "33": "1",
    "34": "2",
  },
}

export type ShoeSizeOption = { eu: string; uk: string | null }

export function isShoeCategoryName(name: string): boolean {
  return /schoen|shoe|sneaker|boot|laars|sandal|sandaal/.test(name.toLowerCase())
}

export function isShoeProduct(categoryNames: string[]): boolean {
  return categoryNames.some((name) => isShoeCategoryName(name))
}

export function resolveShoeAudience(categoryNames: string[]): ShoeAudience | null {
  const hay = categoryNames.join(" ").toLowerCase()
  if (!isShoeProduct(categoryNames)) return null
  if (/kinder|child|kids|junior/.test(hay)) return "kinderen"
  if (/dame|women|vrouw/.test(hay)) return "dames"
  if (/heren|\bmen\b|\bman\b/.test(hay)) return "heren"
  return null
}

export function isClothingSizeLabel(raw: string): boolean {
  const key = raw.trim().toUpperCase()
  return (CLOTHING_SIZE_LABELS as readonly string[]).includes(key)
}

/** EU token only. "40.0" is not "40". "40,5" is "40.5" and still needs a table row. */
export function canonicalEuToken(raw: string): string | null {
  const text = raw
    .trim()
    .replace(/\s+/g, " ")
    .replace(/^eu[\s-]*/i, "")
    .replace(",", ".")
  if (!/^\d{1,2}(\.\d)?$/.test(text)) return null
  return text
}

export function ukSizeForEu(
  audience: ShoeAudience | null,
  eu: string
): string | null {
  const token = canonicalEuToken(eu)
  if (!token || !audience) return null
  return EU_TO_UK[audience][token] ?? null
}

function sortEu(values: string[]): string[] {
  return [...values].sort((a, b) => Number(a) - Number(b))
}

export function euSizesForAudience(audience: ShoeAudience): string[] {
  return sortEu(Object.keys(EU_TO_UK[audience]))
}

export function allRecordedEuSizes(): string[] {
  const values = new Set<string>()
  for (const audience of Object.keys(EU_TO_UK) as ShoeAudience[]) {
    for (const eu of Object.keys(EU_TO_UK[audience])) values.add(eu)
  }
  return sortEu([...values])
}

export function shoeSizeOptions(categoryNames: string[]): {
  audience: ShoeAudience | null
  options: ShoeSizeOption[]
} {
  const audience = resolveShoeAudience(categoryNames)
  if (!isShoeProduct(categoryNames)) return { audience: null, options: [] }
  const sizes = audience ? euSizesForAudience(audience) : allRecordedEuSizes()
  return {
    audience,
    options: sizes.map((eu) => ({ eu, uk: ukSizeForEu(audience, eu) })),
  }
}

export function shoeSizeLabel(eu: string, uk: string | null): string {
  return uk ? `EU ${eu} · UK ${uk}` : `EU ${eu}`
}

/**
 * Same EU number in every language. UK is appended only when the table has that pair.
 */
export function presentEuSize(
  raw: string,
  categoryNames: string[]
): { eu: string; uk: string | null; label: string } | null {
  if (!isShoeProduct(categoryNames)) return null
  const eu = canonicalEuToken(raw)
  if (!eu) return null
  const known = allRecordedEuSizes().includes(eu)
  if (!known) return { eu, uk: null, label: `EU ${eu}` }
  const uk = ukSizeForEu(resolveShoeAudience(categoryNames), eu)
  return { eu, uk, label: shoeSizeLabel(eu, uk) }
}

export function presentVariantSize(input: {
  variantType: string
  variantValue: string
  categoryNames: string[]
}): string {
  const fallback = `${input.variantType}: ${input.variantValue}`
  if (!isShoeProduct(input.categoryNames)) return fallback
  if (input.variantType === "Maat") {
    const shown = presentEuSize(input.variantValue, input.categoryNames)
    return shown?.label || fallback
  }
  if (input.variantType !== "Uitvoering") return fallback
  const audience = resolveShoeAudience(input.categoryNames)
  const parts = input.variantValue.split(/\s*\/\s*/)
  let changed = false
  const next = parts.map((part) => {
    const eu = canonicalEuToken(part)
    if (!eu || !allRecordedEuSizes().includes(eu)) return part
    changed = true
    return shoeSizeLabel(eu, ukSizeForEu(audience, eu))
  })
  return changed ? next.join(" / ") : fallback
}

export function applyShoeMaatToAxes(
  axes: Array<{ axis: string; value: string }>,
  categoryNames: string[]
):
  | { ok: true; axes: Array<{ axis: string; value: string }> }
  | { ok: false; message: string } {
  if (!isShoeProduct(categoryNames)) return { ok: true, axes }
  const next: Array<{ axis: string; value: string }> = []
  for (const row of axes) {
    if (row.axis !== "Maat") {
      next.push(row)
      continue
    }
    const stored = canonicalizeShoeMaat(row.value, categoryNames)
    if (!stored.ok) return stored
    next.push({ axis: row.axis, value: "value" in stored ? stored.value : row.value })
  }
  return { ok: true, axes: next }
}

export function canonicalizeShoeMaat(
  raw: string,
  categoryNames: string[]
): { ok: true; value: string } | { ok: false; message: string } | { ok: true; unchanged: true } {
  if (!isShoeProduct(categoryNames)) return { ok: true, unchanged: true }
  if (isClothingSizeLabel(raw)) {
    return {
      ok: false,
      message: "Kledingmaten XS, S, M, L en XL zijn geen schoenmaten. Kies een EU-maat.",
    }
  }
  const eu = canonicalEuToken(raw)
  if (!eu) {
    return {
      ok: false,
      message: "Vul een EU-maat in. Een UK-maat wordt niet als invoer opgeslagen.",
    }
  }
  const audience = resolveShoeAudience(categoryNames)
  const allowed = audience ? euSizesForAudience(audience) : allRecordedEuSizes()
  if (!allowed.includes(eu)) {
    return {
      ok: false,
      message: audience
        ? `EU ${eu} staat niet in de maattabel voor ${audience}. Er wordt geen UK-maat geschat.`
        : `EU ${eu} staat niet in de maattabel. Er wordt geen UK-maat geschat.`,
    }
  }
  return { ok: true, value: eu }
}
