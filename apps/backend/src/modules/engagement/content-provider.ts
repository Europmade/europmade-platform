/**
 * Engagement-contentgeneratie.
 *
 * Eén servicegrens. De admin roept alleen `generateEngagementContent` aan.
 * Standaardprovider `local` blijft in-proces en gebruikt alleen het verzoek
 * plus meegegeven catalogusfeiten. Geen cloud-LLM: dat blijft een latere
 * provider achter dezelfde grens, na een aparte providerbeslissing.
 * De provider keurt, activeert en verzendt niets.
 */

export type ContentKind = "newsletter" | "email" | "follow_up"
export type ContentLength = "kort" | "normaal" | "uitgebreid"

export type CatalogFact = {
  title: string
  description: string
  image_url: string | null
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

function wantsProducts(input: ContentRequest): boolean {
  return /product|merk|aanbod|nieuw/i.test(`${input.idea} ${input.goal}`)
}

export class LocalContentProvider implements EngagementContentProvider {
  readonly id = "local"

  async generate(input: ContentRequest): Promise<ContentDraft> {
    const idea = clean(input.idea, 140)
    const goal = clean(input.goal, 280)
    if (!idea || !goal) {
      throw new ContentProviderError("Vul een onderwerp en een doel in.")
    }
    const subject = idea
    const preheader = goal
    const blocks: string[] = [
      `<h2>${escapeHtml(idea)}</h2>`,
      `<p>${escapeHtml(goal)}</p>`,
    ]
    if (wantsProducts(input)) {
      if (input.products.length === 0) {
        blocks.push("<p>Er is geen productinformatie beschikbaar voor dit onderwerp.</p>")
      } else {
        const take = input.length === "kort" ? 1 : input.products.length
        for (const product of input.products.slice(0, take)) {
          const title = clean(product.title, 160)
          if (!title) continue
          blocks.push(`<h3>${escapeHtml(title)}</h3>`)
          const description = clean(product.description, 400)
          if (description) blocks.push(`<p>${escapeHtml(description)}</p>`)
          if (product.image_url) {
            blocks.push(
              `<p><img src="${escapeHtml(product.image_url)}" alt="${escapeHtml(title)}"></p>`
            )
          } else {
            blocks.push("<p>Er is geen productafbeelding beschikbaar.</p>")
          }
        }
      }
    }
    if (input.length !== "kort") {
      blocks.push(
        "<p>Dit is een concept. Een medewerker van EuropMade beoordeelt de tekst voordat die ergens wordt gebruikt.</p>"
      )
    }
    blocks.push(
      `<p style="text-align: center"><a data-em-cta="1" href="https://europmade.eu">${escapeHtml(
        input.kind === "follow_up" ? "Bekijk EuropMade" : "Bekijk aanbod"
      )}</a></p>`
    )
    return {
      subject,
      preheader,
      body: blocks.join(""),
      cta_label: input.kind === "follow_up" ? "Bekijk EuropMade" : "Bekijk aanbod",
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
