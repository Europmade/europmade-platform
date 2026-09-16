/**
 * Compose Product Cloud variant_type + variant_value from one or more axes.
 * Storage remains single type/value (no second product model).
 */
export const VARIANT_AXIS_OPTIONS = [
  "Kleur",
  "Maat",
  "Inhoud",
  "Vermogen",
  "Spanning",
  "Materiaal",
  "Uitvoering",
  "Bundel",
] as const

export type VariantAxis = (typeof VARIANT_AXIS_OPTIONS)[number]

export function isVariantAxis(value: string): value is VariantAxis {
  return (VARIANT_AXIS_OPTIONS as readonly string[]).includes(value)
}

export function composeVariantFromAxes(
  axes: Array<{ axis: string; value: string }>
): { variant_type: VariantAxis; variant_value: string } {
  const cleaned = axes
    .map((a) => ({
      axis: a.axis.trim(),
      value: a.value.trim(),
    }))
    .filter((a) => a.axis && a.value)

  if (cleaned.length === 0) {
    throw new Error("Selecteer minstens één as met een waarde.")
  }

  for (const row of cleaned) {
    if (!isVariantAxis(row.axis)) {
      throw new Error(`Ongeldige variantas: ${row.axis}`)
    }
  }

  if (cleaned.length === 1) {
    return {
      variant_type: cleaned[0].axis as VariantAxis,
      variant_value: cleaned[0].value,
    }
  }

  return {
    variant_type: "Uitvoering",
    variant_value: cleaned.map((a) => a.value).join(" / "),
  }
}

/**
 * Category → suggested variant axes (heuristic; seller confirms).
 */
export function suggestVariantAxesForCategory(categoryName: string): string[] {
  const n = categoryName.toLowerCase()
  if (/kleding|fashion|apparel|shirt|jas|broek|t-shirt|tshirt/.test(n)) {
    return ["Kleur", "Maat", "Uitvoering"]
  }
  if (/schoen|shoe|sneaker|boot/.test(n)) {
    return ["Kleur", "Maat"]
  }
  if (/stofzuiger|robotstofzuiger|vacuum/.test(n)) {
    return ["Kleur", "Uitvoering", "Bundel"]
  }
  if (/robotmaaier|maaier|lawn/.test(n)) {
    return ["Uitvoering", "Vermogen", "Inhoud"]
  }
  if (/elektronica|phone|tablet|laptop|computer|tv|capaciteit|opslag/.test(n)) {
    return ["Kleur", "Inhoud", "Uitvoering"]
  }
  if (/meubel|stoel|tafel|kast|tuin/.test(n)) {
    return ["Kleur", "Materiaal", "Uitvoering"]
  }
  return ["Uitvoering", "Kleur"]
}
