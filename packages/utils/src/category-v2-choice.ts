/**
 * Interactive category choice helper.
 * Questions come from Product Cloud attributes that already have values
 * on at least two sellable products. Missing data stays a message.
 */

export type ChoiceAssistantProduct = {
  slug: string
  title: string
  priceCents: number
  offerCount: number
  specs?: Array<{ code: string; value: string }>
  previewStatus?: "concept"
}

export type ChoiceAssistantAttribute = {
  code: string
  name: string
  dataType?: string | null
  comparable?: boolean
}

export type ChoiceAssistantOption = {
  value: string
  label: string
  count: number
}

export type ChoiceAssistantQuestion = {
  code: string
  label: string
  options: ChoiceAssistantOption[]
}

export type ChoiceAssistantPlan = {
  ready: boolean
  message: string | null
  questions: ChoiceAssistantQuestion[]
  /** Preview catalog may use Concept products. The storefront stays sellable-only. */
  source: "sellable" | "preview_catalog" | null
}

const INSUFFICIENT =
  "Er is nog te weinig productinformatie voor een keuzehulp. Er wordt geen advies gegeven."

function norm(value: string): string {
  return value.trim().toLocaleLowerCase("nl")
}

function numericAttribute(dataType: string | null | undefined): boolean {
  const value = (dataType ?? "").trim().toLocaleLowerCase("nl")
  return value === "numeriek" || value === "number" || value === "numeric"
}

function sellableProducts(products: ChoiceAssistantProduct[]): ChoiceAssistantProduct[] {
  return products.filter(
    (product) =>
      product.offerCount > 0 &&
      Number.isFinite(product.priceCents) &&
      product.priceCents > 0 &&
      product.title.trim().length > 0
  )
}

function isSellable(product: ChoiceAssistantProduct): boolean {
  return (
    product.offerCount > 0 &&
    Number.isFinite(product.priceCents) &&
    product.priceCents > 0 &&
    product.title.trim().length > 0
  )
}

/** Preview only: a stored specification is enough. A missing price does not qualify a product as sellable. */
function productsWithStoredSpecs(products: ChoiceAssistantProduct[]): ChoiceAssistantProduct[] {
  return products.filter(
    (product) =>
      product.title.trim().length > 0 &&
      (product.specs ?? []).some((spec) => spec.code.trim() && spec.value.trim())
  )
}

function questionFor(
  attribute: ChoiceAssistantAttribute,
  products: ChoiceAssistantProduct[]
): ChoiceAssistantQuestion | null {
  const code = attribute.code.trim()
  if (!code || numericAttribute(attribute.dataType)) return null
  const key = norm(code)
  const values = new Map<string, ChoiceAssistantOption>()
  let productsWithValue = 0
  for (const product of products) {
    const seen = new Set<string>()
    for (const spec of product.specs ?? []) {
      if (norm(spec.code) !== key) continue
      const label = spec.value.trim()
      const value = norm(label)
      if (!value || seen.has(value)) continue
      seen.add(value)
      const current = values.get(value)
      if (current) current.count += 1
      else values.set(value, { value, label, count: 1 })
    }
    if (seen.size > 0) productsWithValue += 1
  }
  if (productsWithValue < 2 || values.size < 2) return null
  return {
    code,
    label: attribute.name.trim() || code,
    options: [...values.values()].sort((a, b) => a.label.localeCompare(b.label, "nl")),
  }
}

export function planChoiceAssistant(input: {
  products: ChoiceAssistantProduct[]
  attributes: ChoiceAssistantAttribute[]
  questionCodes?: string[]
  mode?: "storefront" | "preview_catalog"
}): ChoiceAssistantPlan {
  const previewCatalog = input.mode === "preview_catalog"
  const products = previewCatalog
    ? productsWithStoredSpecs(input.products)
    : sellableProducts(input.products)
  const requested = (input.questionCodes ?? []).map((code) => code.trim()).filter(Boolean)
  const byCode = new Map(
    input.attributes
      .filter((attribute) => attribute.code.trim())
      .map((attribute) => [norm(attribute.code), attribute])
  )
  const source =
    requested.length > 0
      ? requested
          .map((code) => byCode.get(norm(code)))
          .filter((attribute): attribute is ChoiceAssistantAttribute => Boolean(attribute))
      : input.attributes.filter(
          (attribute) => attribute.comparable !== false && attribute.code.trim()
        )
  const questions: ChoiceAssistantQuestion[] = []
  for (const attribute of source) {
    const question = questionFor(attribute, products)
    if (!question) continue
    questions.push(question)
    if (questions.length >= 3) break
  }
  if (questions.length === 0) {
    return { ready: false, message: INSUFFICIENT, questions: [], source: null }
  }
  const usesConcept = previewCatalog && products.some((product) => !isSellable(product))
  return {
    ready: true,
    message: null,
    questions,
    source: usesConcept ? "preview_catalog" : "sellable",
  }
}

export function choiceAssistantMatches(
  products: ChoiceAssistantProduct[],
  answers: Record<string, string | undefined>,
  mode: "storefront" | "preview_catalog" = "storefront"
): ChoiceAssistantProduct[] {
  const selected = Object.entries(answers).filter((entry): entry is [string, string] =>
    Boolean(entry[1]?.trim())
  )
  const pool = mode === "preview_catalog" ? productsWithStoredSpecs(products) : sellableProducts(products)
  return pool.filter((product) =>
    selected.every(([code, value]) =>
      (product.specs ?? []).some(
        (spec) => norm(spec.code) === norm(code) && norm(spec.value) === norm(value)
      )
    )
  )
}
