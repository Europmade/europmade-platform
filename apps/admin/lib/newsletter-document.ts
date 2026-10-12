/**
 * Nieuwsbrief als opbouw, opgeslagen in het bestaande berichtveld.
 * Geen extra tabel. De preview leest dezelfde markeringen.
 */

export type NewsletterStory = {
  title: string
  text: string
}

export type NewsletterProduct = {
  name: string
  text: string
  imageUrl: string
  linkLabel: string
  linkUrl: string
}

export type NewsletterDocument = {
  imageUrl: string
  headline: string
  intro: string
  stories: NewsletterStory[]
  products: NewsletterProduct[]
}

const HERO = "<!--em-hero-->"
const STORY = "<!--em-story-->"
const PRODUCT = "<!--em-product-->"

export function emptyNewsletter(): NewsletterDocument {
  return {
    imageUrl: "",
    headline: "",
    intro: "",
    stories: [],
    products: [],
  }
}

export function isTechnicalLabel(value: string): boolean {
  const text = value.replace(/\s+/g, " ").trim()
  if (!text) return false
  if (/\be2e\b/i.test(text)) return true
  if (/^beschrijving(?:\s*\.{2,}|\s*$)/i.test(text)) return true
  if (/^description(?:\s*\.{2,}|\s*$)/i.test(text)) return true
  if (/\bp1ux|\bp1final\b/i.test(text)) return true
  if (/er is geen product/i.test(text)) return true
  return false
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
}

function decode(value: string): string {
  return value
    .replace(/<[^>]+>/g, "")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&gt;", ">")
    .replaceAll("&lt;", "<")
    .replaceAll("&amp;", "&")
    .replace(/\s+/g, " ")
    .trim()
}

function tagAttr(html: string, tag: string, name: string): string {
  const match = html.match(new RegExp(`<${tag}\\b[^>]*\\b${name}="([^"]*)"`, "i"))
  return match?.[1] ? decode(match[1]) : ""
}

function tagText(html: string, tag: string): string {
  const match = html.match(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)</${tag}>`, "i"))
  return match?.[1] ? decode(match[1]) : ""
}

function plainParagraphs(html: string): string[] {
  const withoutLinks = html.replace(/<a\b[^>]*>[\s\S]*?<\/a>/gi, "")
  return [...withoutLinks.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)]
    .map((match) => decode(match[1] ?? ""))
    .filter(Boolean)
}

function paragraphsOf(value: string): string[] {
  return value
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean)
}

export function parseNewsletter(html: string): NewsletterDocument {
  const source = html || ""
  if (!source.includes(HERO) && !source.includes(STORY) && !source.includes(PRODUCT)) {
    return {
      imageUrl: tagAttr(source, "img", "src"),
      headline: tagText(source, "h2") || tagText(source, "h1"),
      intro: plainParagraphs(source).join("\n\n"),
      stories: [],
      products: [],
    }
  }
  const doc = emptyNewsletter()
  const parts = source.split(/<!--em-(hero|story|product)-->/i)
  for (let index = 1; index < parts.length; index += 2) {
    const kind = (parts[index] ?? "").toLowerCase()
    const block = parts[index + 1] ?? ""
    if (kind === "hero") {
      doc.imageUrl = tagAttr(block, "img", "src")
      doc.headline = tagText(block, "h2")
      doc.intro = plainParagraphs(block).join("\n\n")
    } else if (kind === "story") {
      doc.stories.push({
        title: tagText(block, "h3") || tagText(block, "h2"),
        text: plainParagraphs(block).join("\n\n"),
      })
    } else if (kind === "product") {
      const link = block.match(/<a\b[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/i)
      doc.products.push({
        name: tagText(block, "h3"),
        text: plainParagraphs(block).join("\n\n"),
        imageUrl: tagAttr(block, "img", "src"),
        linkLabel: link?.[2] ? decode(link[2]) : "",
        linkUrl: link?.[1] ? decode(link[1]) : "",
      })
    }
  }
  return doc
}

export function serializeNewsletter(doc: NewsletterDocument): string {
  const blocks: string[] = [HERO]
  if (doc.imageUrl.trim()) {
    blocks.push(
      `<img src="${escapeHtml(doc.imageUrl.trim())}" alt="${escapeHtml(doc.headline.trim())}" />`
    )
  }
  blocks.push(`<h2>${escapeHtml(doc.headline.trim())}</h2>`)
  for (const paragraph of paragraphsOf(doc.intro)) {
    blocks.push(`<p>${escapeHtml(paragraph)}</p>`)
  }
  for (const story of doc.stories) {
    blocks.push(STORY)
    blocks.push(`<h3>${escapeHtml(story.title.trim())}</h3>`)
    for (const paragraph of paragraphsOf(story.text)) {
      blocks.push(`<p>${escapeHtml(paragraph)}</p>`)
    }
  }
  for (const product of doc.products) {
    blocks.push(PRODUCT)
    if (product.imageUrl.trim()) {
      blocks.push(
        `<img src="${escapeHtml(product.imageUrl.trim())}" alt="${escapeHtml(product.name.trim())}" />`
      )
    }
    blocks.push(`<h3>${escapeHtml(product.name.trim())}</h3>`)
    for (const paragraph of paragraphsOf(product.text)) {
      blocks.push(`<p>${escapeHtml(paragraph)}</p>`)
    }
    if (product.linkLabel.trim() && product.linkUrl.trim()) {
      blocks.push(
        `<p style="text-align:center"><a data-em-cta="1" href="${escapeHtml(product.linkUrl.trim())}" style="display:inline-block;padding:10px 18px;border-radius:4px;background:#171717;color:#ffffff;font-weight:600;text-decoration:none;">${escapeHtml(product.linkLabel.trim())}</a></p>`
      )
    }
  }
  return blocks.join("")
}

export function isRichMessage(html: string): boolean {
  return /<!--em-(layout:rich|hero|block:|product|story)/.test(html || "")
}

export type MessageBlock =
  | { kind: "hero"; imageUrl: string; headline: string; text: string }
  | { kind: "heading"; text: string }
  | { kind: "text"; text: string }
  | { kind: "image"; imageUrl: string; alt: string }
  | { kind: "product"; productId: string; name: string; text: string; imageUrl: string; linkLabel: string; linkUrl: string; commissionLabel?: string }
  | {
      kind: "product_group"
      title: string
      products: Array<{
        productId: string
        name: string
        text: string
        imageUrl: string
        linkLabel: string
        linkUrl: string
        commissionLabel?: string
      }>
    }
  | { kind: "cta"; label: string; url: string }
  | { kind: "link"; label: string; url: string }
  | { kind: "divider" }
  | { kind: "split"; text: string; imageUrl: string }

function productFromHtml(block: string) {
  const link = block.match(/<a\b[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/i)
  const id = block.match(/data-em-product="([^"]*)"/i)
  const commission = block.match(/data-em-commission="1">([^<]*)<\/p>/i)
  const withoutCommission = block.replace(/<p\b[^>]*data-em-commission="1"[^>]*>[\s\S]*?<\/p>/gi, "")
  return {
    productId: id?.[1] ? decode(id[1]) : "",
    name: tagText(block, "h3"),
    text: plainParagraphs(withoutCommission).join("\n\n"),
    imageUrl: tagAttr(block, "img", "src"),
    linkLabel: link?.[2] ? decode(link[2]) : "",
    linkUrl: link?.[1] ? decode(link[1]) : "",
    commissionLabel: commission?.[1]?.replace(/^Commissie:\s*/i, "").trim() ?? "",
  }
}

export function parseMessageBlocks(html: string): MessageBlock[] {
  const source = html || ""
  if (source.includes("<!--em-block:")) {
    const parts = source.split(/<!--em-block:([a-z_]+)-->/i)
    const blocks: MessageBlock[] = []
    for (let index = 1; index < parts.length; index += 2) {
      const kind = (parts[index] ?? "").toLowerCase()
      const block = parts[index + 1] ?? ""
      if (kind === "hero") {
        blocks.push({
          kind: "hero",
          imageUrl: tagAttr(block, "img", "src"),
          headline: tagText(block, "h2"),
          text: plainParagraphs(block).join("\n\n"),
        })
      } else if (kind === "heading") {
        blocks.push({ kind: "heading", text: tagText(block, "h2") || tagText(block, "h3") })
      } else if (kind === "text") {
        blocks.push({ kind: "text", text: plainParagraphs(block).join("\n\n") })
      } else if (kind === "image") {
        blocks.push({
          kind: "image",
          imageUrl: tagAttr(block, "img", "src"),
          alt: tagAttr(block, "img", "alt"),
        })
      } else if (kind === "product") {
        blocks.push({ kind: "product", ...productFromHtml(block) })
      } else if (kind === "products") {
        const items = block.split("<!--em-item-->").slice(1)
        blocks.push({
          kind: "product_group",
          title: tagText(block.split("<!--em-item-->")[0] ?? "", "h2"),
          products: items.map(productFromHtml).filter((item) => item.name || item.productId),
        })
      } else if (kind === "cta" || kind === "link") {
        const link = block.match(/<a\b[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/i)
        blocks.push({
          kind,
          label: link?.[2] ? decode(link[2]) : "",
          url: link?.[1] ? decode(link[1]) : "",
        })
      } else if (kind === "divider") {
        blocks.push({ kind: "divider" })
      } else if (kind === "split") {
        blocks.push({
          kind: "split",
          text: plainParagraphs(block).join("\n\n"),
          imageUrl: tagAttr(block, "img", "src"),
        })
      }
    }
    return blocks
  }
  if (!isRichMessage(source)) return []
  const doc = parseNewsletter(source)
  const blocks: MessageBlock[] = []
  if (doc.headline || doc.intro || doc.imageUrl) {
    blocks.push({
      kind: "hero",
      imageUrl: doc.imageUrl,
      headline: doc.headline,
      text: doc.intro,
    })
  }
  for (const story of doc.stories) {
    if (story.title) blocks.push({ kind: "heading", text: story.title })
    if (story.text) blocks.push({ kind: "text", text: story.text })
  }
  for (const product of doc.products) {
    blocks.push({
      kind: "product",
      productId: "",
      name: product.name,
      text: product.text,
      imageUrl: product.imageUrl,
      linkLabel: product.linkLabel,
      linkUrl: product.linkUrl,
    })
  }
  return blocks
}

function productHtml(product: {
  productId: string
  name: string
  text: string
  imageUrl: string
  linkLabel: string
  linkUrl: string
  commissionLabel?: string
}): string {
  const parts: string[] = []
  if (product.imageUrl.trim()) {
    parts.push(
      `<img src="${escapeHtml(product.imageUrl.trim())}" alt="${escapeHtml(product.name.trim())}"${
        product.productId.trim()
          ? ` data-em-product="${escapeHtml(product.productId.trim())}"`
          : ""
      } />`
    )
  } else if (product.productId.trim()) {
    parts.push(`<p data-em-product="${escapeHtml(product.productId.trim())}"></p>`)
  }
  parts.push(`<h3>${escapeHtml(product.name.trim())}</h3>`)
  for (const paragraph of paragraphsOf(product.text)) {
    parts.push(`<p>${escapeHtml(paragraph)}</p>`)
  }
  if (product.commissionLabel?.trim()) {
    parts.push(
      `<p data-em-commission="1">Commissie: ${escapeHtml(product.commissionLabel.trim())}</p>`
    )
  }
  if (product.linkLabel.trim() && product.linkUrl.trim()) {
    parts.push(
      `<p style="text-align:center"><a data-em-cta="1" href="${escapeHtml(product.linkUrl.trim())}" style="display:inline-block;padding:10px 18px;border-radius:4px;background:#171717;color:#ffffff;font-weight:600;text-decoration:none;">${escapeHtml(product.linkLabel.trim())}</a></p>`
    )
  }
  return parts.join("")
}

export function serializeMessageBlocks(blocks: MessageBlock[]): string {
  const parts = ["<!--em-layout:rich-->"]
  for (const block of blocks) {
    if (block.kind === "hero") {
      parts.push("<!--em-block:hero-->", "<!--em-hero-->")
      if (block.imageUrl.trim()) {
        parts.push(
          `<img src="${escapeHtml(block.imageUrl.trim())}" alt="${escapeHtml(block.headline.trim())}" />`
        )
      }
      parts.push(`<h2>${escapeHtml(block.headline.trim())}</h2>`)
      for (const paragraph of paragraphsOf(block.text)) parts.push(`<p>${escapeHtml(paragraph)}</p>`)
    } else if (block.kind === "heading") {
      parts.push("<!--em-block:heading-->", `<h2>${escapeHtml(block.text.trim())}</h2>`)
    } else if (block.kind === "text") {
      parts.push("<!--em-block:text-->")
      for (const paragraph of paragraphsOf(block.text)) parts.push(`<p>${escapeHtml(paragraph)}</p>`)
    } else if (block.kind === "image") {
      parts.push("<!--em-block:image-->")
      if (block.imageUrl.trim()) {
        parts.push(
          `<img src="${escapeHtml(block.imageUrl.trim())}" alt="${escapeHtml(block.alt.trim())}" />`
        )
      }
    } else if (block.kind === "product") {
      parts.push("<!--em-block:product-->", "<!--em-product-->", productHtml(block))
    } else if (block.kind === "product_group") {
      parts.push("<!--em-block:products-->", `<h2>${escapeHtml(block.title.trim())}</h2>`)
      for (const product of block.products) {
        parts.push("<!--em-item-->", productHtml(product))
      }
    } else if (block.kind === "cta" || block.kind === "link") {
      parts.push(
        `<!--em-block:${block.kind}-->`,
        `<p style="text-align: center"><a${block.kind === "cta" ? ' data-em-cta="1"' : ""} href="${escapeHtml(block.url.trim())}">${escapeHtml(block.label.trim())}</a></p>`
      )
    } else if (block.kind === "divider") {
      parts.push("<!--em-block:divider-->", "<hr />")
    } else if (block.kind === "split") {
      parts.push("<!--em-block:split-->")
      if (block.imageUrl.trim()) {
        parts.push(`<img src="${escapeHtml(block.imageUrl.trim())}" alt="" />`)
      }
      for (const paragraph of paragraphsOf(block.text)) parts.push(`<p>${escapeHtml(paragraph)}</p>`)
    }
  }
  return parts.join("")
}

export function visibleBlocks(blocks: MessageBlock[]): MessageBlock[] {
  return blocks.flatMap((block) => {
    if (block.kind === "product") {
      if (!block.name.trim() || isTechnicalLabel(block.name) || isTechnicalLabel(block.text)) {
        return []
      }
    }
    if (block.kind === "product_group") {
      const products = block.products.filter(
        (product) =>
          product.name.trim() &&
          !isTechnicalLabel(product.name) &&
          !isTechnicalLabel(product.text)
      )
      if (products.length === 0 && !block.title.trim()) return []
      return [{ ...block, products }]
    }
    return [block]
  })
}
