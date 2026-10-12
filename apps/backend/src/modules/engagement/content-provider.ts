/**
 * Engagement-contentgeneratie.
 *
 * Eén servicegrens. De admin roept alleen `generateEngagementContent` aan.
 * Standaardprovider `local` blijft in-proces en gebruikt alleen het verzoek
 * plus meegegeven catalogusfeiten. Geen cloud-LLM.
 * De provider keurt, activeert en verzendt niets.
 *
 * Een nieuwsbrief gebruikt dezelfde blokmarkeringen als de admin-opbouw.
 */

export type ContentKind = "newsletter" | "email" | "follow_up"
export type ContentLength = "kort" | "normaal" | "uitgebreid"

export type CatalogFact = {
  id?: string
  title: string
  description: string
  image_url: string | null
  commission_note?: string | null
}

export type ContentRequest = {
  kind: ContentKind
  idea: string
  goal: string
  tone: string
  language: string
  length: ContentLength
  products: CatalogFact[]
}

export type ContentDraft = {
  subject: string
  preheader: string
  body: string
  cta_label: string
  cta_url: string
}

export class ContentProviderError extends Error {
  constructor(message = "Het AI-concept kon niet worden gemaakt. Probeer het opnieuw.") {
    super(message)
    this.name = "ContentProviderError"
  }
}

export interface EngagementContentProvider {
  readonly id: string
  generate(input: ContentRequest): Promise<ContentDraft>
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
}

function clean(value: string, max: number): string {
  return value.replace(/\s+/g, " ").trim().slice(0, max)
}

export function isTechnicalCatalogText(value: string): boolean {
  const text = value.replace(/\s+/g, " ").trim()
  if (!text) return false
  if (/\be2e\b/i.test(text)) return true
  if (/^beschrijving(?:\s*\.{2,}|\s*$)/i.test(text)) return true
  if (/^description(?:\s*\.{2,}|\s*$)/i.test(text)) return true
  if (/\bp1ux|\bp1final\b/i.test(text)) return true
  return false
}

export function draftProductSummary(description: string): string {
  const source = description.replace(/\s+/g, " ").trim()
  if (!source || isTechnicalCatalogText(source)) return ""
  const sentences = source.split(/(?<=[.!?])\s+/).filter((part) => part.trim())
  const short = (sentences.slice(0, 2).join(" ") || source).trim()
  return short.length > 180 ? `${short.slice(0, 177).trim()}…` : short
}

export function presentableCatalogFacts(products: CatalogFact[]): CatalogFact[] {
  return products.flatMap((product) => {
    const title = clean(product.title, 160)
    if (!title || isTechnicalCatalogText(title)) return []
    const description = clean(product.description, 280)
    return [
      {
        title,
        description: description && !isTechnicalCatalogText(description) ? description : "",
        image_url: product.image_url,
        commission_note: product.commission_note?.trim() || null,
      },
    ]
  })
}

function wantsProducts(input: ContentRequest): boolean {
  return /product|merk|aanbod|nieuw/i.test(`${input.idea} ${input.goal}`)
}

function ctaLabel(kind: ContentKind): string {
  if (kind === "newsletter") return "Bekijk het aanbod"
  if (kind === "follow_up") return "Bekijk EuropMade"
  return "Lees verder"
}

function paragraph(value: string): string {
  return `<p>${escapeHtml(value)}</p>`
}

function cta(label: string): string {
  return `<p style="text-align: center"><a data-em-cta="1" href="https://europmade.eu">${escapeHtml(label)}</a></p>`
}

function newsletterBody(
  input: ContentRequest,
  idea: string,
  goal: string,
  products: CatalogFact[]
): string {
  const blocks: string[] = ["<!--em-hero-->", `<h2>${escapeHtml(idea)}</h2>`, paragraph(goal)]
  if (input.length !== "kort") {
    blocks.push(
      "<!--em-story-->",
      "<h3>Wat u in deze nieuwsbrief vindt</h3>",
      paragraph(goal)
    )
  }
  const take = input.length === "kort" ? 1 : products.length
  for (const product of products.slice(0, take)) {
    blocks.push("<!--em-product-->")
    if (product.image_url) {
      blocks.push(
        `<img src="${escapeHtml(product.image_url)}" alt="${escapeHtml(product.title)}" />`
      )
    }
    blocks.push(`<h3>${escapeHtml(product.title)}</h3>`)
    if (product.description) blocks.push(paragraph(product.description))
    if (product.commission_note) blocks.push(paragraph(product.commission_note))
    blocks.push(cta("Bekijk product"))
  }
  return blocks.join("")
}

function letterBody(idea: string, goal: string, products: CatalogFact[], label: string): string {
  const blocks = [paragraph(idea), paragraph(goal)]
  for (const product of products.slice(0, 3)) {
    const line = [product.title, product.description, product.commission_note]
      .filter(Boolean)
      .join(". ")
      .replace(/\.\./g, ".")
    blocks.push(paragraph(line))
  }
  blocks.push(cta(label))
  return blocks.join("")
}

export class LocalContentProvider implements EngagementContentProvider {
  readonly id = "local"

  async generate(input: ContentRequest): Promise<ContentDraft> {
    const idea = clean(input.idea, 140)
    const goal = clean(input.goal, 280)
    if (!idea || !goal) {
      throw new ContentProviderError("Vul een onderwerp en een doel in.")
    }
    const products = wantsProducts(input) ? presentableCatalogFacts(input.products) : []
    const label = ctaLabel(input.kind)
    const body =
      input.kind === "newsletter"
        ? newsletterBody(input, idea, goal, products)
        : letterBody(idea, goal, products, label)
    return {
      subject: idea,
      preheader: goal,
      body,
      cta_label: label,
      cta_url: "https://europmade.eu",
    }
  }
}

export class UnavailableContentProvider implements EngagementContentProvider {
  readonly id = "none"

  async generate(): Promise<ContentDraft> {
    throw new ContentProviderError()
  }
}

export function createContentProviderFromEnv(
  env: NodeJS.ProcessEnv = process.env
): EngagementContentProvider {
  const raw = (env.ENGAGEMENT_AI_PROVIDER ?? "local").trim().toLowerCase()
  if (raw === "none") return new UnavailableContentProvider()
  if (raw === "local" || raw === "") return new LocalContentProvider()
  return new UnavailableContentProvider()
}

export async function generateEngagementContent(
  input: ContentRequest,
  provider: EngagementContentProvider = createContentProviderFromEnv()
): Promise<ContentDraft> {
  return provider.generate(input)
}
