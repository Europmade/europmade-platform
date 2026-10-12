/**
 * Eén HTML-nieuwsbrief voor preview en de latere verzendlaag.
 * Huisstijl gelijk aan de website: systeemletter, #151515 en #f2f2f2.
 * Alleen aangeleverde catalogusfeiten. Geen verzending.
 */

export type NewsletterCard = {
  id: string
  name: string
  brand: string
  text: string
  imageUrl: string
  href: string
  priceLabel: string
  commissionLabel: string
}

export type NewsletterBrandBlock = {
  name: string
  text: string
  imageUrl: string
  href: string
}

export type NewsletterOfferBanner = {
  title: string
  text: string
  href: string
}

export type NewsletterStory = {
  title: string
  text: string
}

export type NewsletterEmailModel = {
  preheader: string
  headline: string
  intro: string[]
  stories: NewsletterStory[]
  cards: NewsletterCard[]
  brand: NewsletterBrandBlock | null
  offer: NewsletterOfferBanner | null
  ctaLabel: string
  ctaUrl: string
  unsubscribeUrl: string
  locale: string
  audience: "consumers" | "affiliates" | "sellers" | "prospects"
  /** Bereikbaar websitelogo. Zonder bestand gebruikt de header het woordmerk van de site. */
  logoUrl?: string
  requireProducts: boolean
  requireBrand: boolean
  requireOffer: boolean
  requireCommission: boolean
}

export type NewsletterEmailResult = {
  html: string
  problems: string[]
  warnings: string[]
}

/** Zelfde stack als de website (`packages/config/tailwind-preset.ts`). */
const FONT = "-apple-system, 'Segoe UI', Roboto, Arial, sans-serif"

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
}

function usableLink(value: string): boolean {
  const href = value.trim()
  if (!href || href === "#") return false
  if (href.startsWith("/") && !href.startsWith("//")) return true
  return /^https?:\/\//i.test(href)
}

function usableImage(value: string): boolean {
  return usableLink(value)
}

export function composeNewsletterEmail(model: NewsletterEmailModel): NewsletterEmailResult {
  const problems: string[] = []
  const warnings: string[] = []
  const headline = model.headline.trim()
  const intro = model.intro.map((line) => line.trim()).filter(Boolean)
  const ctaLabel = model.ctaLabel.trim()
  const ctaUrl = model.ctaUrl.trim()
  const unsubscribe = model.unsubscribeUrl.trim()
  if (!headline) problems.push("De nieuwsbrief heeft geen kop.")
  if (intro.length === 0) problems.push("De nieuwsbrief heeft geen introductie.")
  if (!ctaLabel || !usableLink(ctaUrl)) problems.push("De nieuwsbrief heeft geen geldige knop.")
  if (!unsubscribe.includes("/nieuwsbrief/uitschrijven/")) {
    problems.push("De uitschrijflink ontbreekt.")
  }
  if (model.requireProducts && model.cards.length === 0) {
    problems.push("Er is geen gepubliceerd product om te tonen.")
  }
  if (model.requireBrand && !model.brand?.name.trim()) {
    problems.push("Er is geen gepubliceerd merk om te tonen.")
  }
  if (model.requireOffer && !model.offer) {
    problems.push("Er is geen geldige actie om te tonen.")
  }
  for (const card of model.cards) {
    if (!card.name.trim() || !usableLink(card.href)) {
      problems.push("Een productkaart mist een naam of een geldige link.")
    }
    if (!usableImage(card.imageUrl)) {
      problems.push(`Het product '${card.name.trim() || "zonder naam"}' heeft geen afbeelding.`)
    }
    if (model.requireCommission && !card.commissionLabel.trim()) {
      problems.push(`Voor '${card.name.trim() || "dit product"}' is geen commissie berekend.`)
    }
  }
  if (model.brand && !usableImage(model.brand.imageUrl)) {
    warnings.push("Dit merk heeft geen logo of merkafbeelding. De naam wordt wel getoond.")
  }
  const logoUrl = model.logoUrl?.trim() ?? ""
  if (!usableImage(logoUrl)) {
    warnings.push("Er is geen bereikbaar websitelogo. De header gebruikt het woordmerk van de website.")
  }
  if (model.requireProducts && model.cards.length > 0 && !model.cards.some((card) => usableImage(card.imageUrl))) {
    warnings.push("Er is geen hero-afbeelding beschikbaar.")
  }

  const hero = model.cards.find((card) => usableImage(card.imageUrl))?.imageUrl
    || (model.brand && usableImage(model.brand.imageUrl) ? model.brand.imageUrl : "")
  const english = model.locale.toLowerCase() === "en"
  const footerNote =
    model.audience === "affiliates"
      ? english
        ? "You receive this because you are an EuropMade affiliate partner."
        : "Je ontvangt dit omdat je affiliatepartner bent bij EuropMade."
      : model.audience === "prospects"
        ? english
          ? "You receive this because we contacted you about selling on EuropMade."
          : "Je ontvangt dit omdat we je hebben benaderd over verkopen via EuropMade."
        : english
          ? "You receive this newsletter because you subscribed to EuropMade."
          : "Je ontvangt deze nieuwsbrief omdat je je hebt ingeschreven bij EuropMade."
  const unsub = english ? "Unsubscribe" : "Uitschrijven"
  const cards = model.cards.filter((card) => card.name.trim() && usableImage(card.imageUrl) && usableLink(card.href))
  const cardHtml = cards
    .map((card) => {
      const meta = [card.brand.trim(), card.priceLabel.trim()].filter(Boolean).join(" · ")
      const commission = card.commissionLabel.trim()
        ? `<p style="margin:8px 0 0;font-family:${FONT};font-size:12px;line-height:1.4;color:#666666;">${escapeHtml(
            english ? `Commission: ${card.commissionLabel.trim()}` : `Commissie: ${card.commissionLabel.trim()}`
          )}</p>`
        : ""
      return `<tr><td style="padding:0 0 16px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #e4e4e4;background:#ffffff;">
          <tr><td><img src="${escapeHtml(card.imageUrl)}" alt="${escapeHtml(card.name)}" width="568" style="display:block;width:100%;max-width:568px;height:auto;border:0;" /></td></tr>
          <tr><td style="padding:16px 18px 18px;font-family:${FONT};">
            ${meta ? `<p style="margin:0 0 6px;font-size:12px;line-height:1.4;color:#666666;">${escapeHtml(meta)}</p>` : ""}
            <h3 style="margin:0;font-size:16px;line-height:1.3;font-weight:700;color:#151515;">${escapeHtml(card.name)}</h3>
            ${card.text.trim() ? `<p style="margin:8px 0 0;font-size:14px;line-height:1.5;color:#2c2c2c;">${escapeHtml(card.text.trim())}</p>` : ""}
            ${commission}
            <p style="margin:14px 0 0;"><a href="${escapeHtml(card.href)}" style="color:#151515;font-size:14px;font-weight:700;">${escapeHtml(english ? "View product" : "Bekijk dit product")}</a></p>
          </td></tr>
        </table>
      </td></tr>`
    })
    .join("")
  const brand = model.brand?.name.trim()
    ? `<tr><td style="padding:8px 24px 8px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
          <tr>
            ${
              usableImage(model.brand.imageUrl)
                ? `<td width="96" valign="top" style="padding-right:16px;"><img src="${escapeHtml(model.brand.imageUrl)}" alt="${escapeHtml(model.brand.name)}" width="96" style="display:block;width:96px;height:auto;border:0;" /></td>`
                : ""
            }
            <td valign="top">
              <p style="margin:0;font-family:${FONT};font-size:12px;line-height:1.4;color:#666666;">${english ? "Brand" : "Merk"}</p>
              <h3 style="margin:4px 0 0;font-family:${FONT};font-size:16px;font-weight:700;color:#151515;">${escapeHtml(model.brand.name.trim())}</h3>
              ${model.brand.text.trim() ? `<p style="margin:8px 0 0;font-family:${FONT};font-size:14px;line-height:1.5;color:#2c2c2c;">${escapeHtml(model.brand.text.trim())}</p>` : ""}
              ${usableLink(model.brand.href) ? `<p style="margin:10px 0 0;font-family:${FONT};"><a href="${escapeHtml(model.brand.href)}" style="color:#151515;font-weight:700;">${english ? "View brand" : "Bekijk het merk"}</a></p>` : ""}
            </td>
          </tr>
        </table>
      </td></tr>`
    : ""
  const offer = model.offer
    ? `<tr><td style="padding:8px 24px 8px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#151515;">
          <tr><td style="padding:18px 20px;font-family:${FONT};">
            <p style="margin:0;font-size:12px;line-height:1.4;color:#cccccc;">${english ? "Current offer" : "Geldige actie"}</p>
            <h3 style="margin:6px 0 0;font-size:18px;line-height:1.3;font-weight:700;color:#ffffff;">${escapeHtml(model.offer.title)}</h3>
            <p style="margin:8px 0 0;font-size:14px;line-height:1.5;color:#f2f2f2;">${escapeHtml(model.offer.text)}</p>
            ${usableLink(model.offer.href) ? `<p style="margin:12px 0 0;"><a href="${escapeHtml(model.offer.href)}" style="color:#ffffff;font-weight:700;">${english ? "View the offer" : "Bekijk de actie"}</a></p>` : ""}
          </td></tr>
        </table>
      </td></tr>`
    : ""
  const stories = model.stories
    .filter((story) => story.title.trim() || story.text.trim())
    .map(
      (story) => `<tr><td style="padding:4px 24px 8px;">
        ${story.title.trim() ? `<h3 style="margin:0;font-family:${FONT};font-size:16px;font-weight:700;color:#151515;">${escapeHtml(story.title.trim())}</h3>` : ""}
        ${story.text.trim() ? `<p style="margin:6px 0 0;font-family:${FONT};font-size:14px;line-height:1.5;color:#2c2c2c;">${escapeHtml(story.text.trim())}</p>` : ""}
      </td></tr>`
    )
    .join("")
  const wordmark = `<p style="margin:0;font-family:${FONT};font-size:17px;line-height:1.2;font-weight:700;letter-spacing:-0.02em;color:#151515;">Europ<span style="color:#4a4a4a;">Made</span></p>`
  const headerMark = usableImage(logoUrl)
    ? `<img src="${escapeHtml(logoUrl)}" alt="EuropMade" width="150" style="display:block;width:150px;max-width:150px;height:auto;border:0;" />`
    : wordmark
  const html = `<!DOCTYPE html><html lang="${escapeHtml(model.locale || "nl")}"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" />
<style>@media only screen and (max-width:480px){ .em-wrap{ width:100% !important; } .em-pad{ padding-left:16px !important; padding-right:16px !important; } }</style>
</head><body style="margin:0;padding:0;background:#f2f2f2;">
<div style="display:none;max-height:0;overflow:hidden;">${escapeHtml(model.preheader)}</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f2f2f2;"><tr><td align="center" style="padding:24px 12px;">
<table role="presentation" class="em-wrap" width="600" cellspacing="0" cellpadding="0" style="width:600px;max-width:600px;background:#ffffff;">
<tr><td class="em-pad" style="padding:18px 24px;border-bottom:1px solid #cccccc;background:#ffffff;">
${headerMark}
</td></tr>
${hero ? `<tr><td><img src="${escapeHtml(hero)}" alt="${escapeHtml(headline)}" width="600" style="display:block;width:100%;max-width:600px;height:auto;border:0;" /></td></tr>` : ""}
<tr><td class="em-pad" style="padding:28px 24px 8px;font-family:${FONT};">
<h1 style="margin:0;font-size:24px;line-height:1.25;font-weight:700;color:#151515;">${escapeHtml(headline)}</h1>
${intro.map((line) => `<p style="margin:14px 0 0;font-family:${FONT};font-size:15px;line-height:1.55;color:#2c2c2c;">${escapeHtml(line)}</p>`).join("")}
</td></tr>
${stories}
${brand}
${offer}
${cardHtml ? `<tr><td class="em-pad" style="padding:8px 16px 8px;">${`<table role="presentation" width="100%" cellspacing="0" cellpadding="0">${cardHtml}</table>`}</td></tr>` : ""}
${
  ctaLabel && usableLink(ctaUrl)
    ? `<tr><td align="center" style="padding:12px 24px 28px;"><a href="${escapeHtml(ctaUrl)}" style="display:inline-block;background:#151515;color:#ffffff;font-family:${FONT};font-size:14px;font-weight:700;line-height:1.2;text-decoration:none;padding:12px 18px;border-radius:5px;">${escapeHtml(ctaLabel)}</a></td></tr>`
    : ""
}
<tr><td class="em-pad" style="padding:18px 24px 22px;border-top:1px solid #e4e4e4;font-family:${FONT};">
${wordmark}
<p style="margin:10px 0 0;font-size:12px;line-height:1.5;color:#666666;">${escapeHtml(footerNote)}</p>
<p style="margin:8px 0 0;"><a href="${escapeHtml(unsubscribe)}" style="font-size:12px;color:#151515;font-weight:700;">${unsub}</a></p>
<p style="margin:10px 0 0;font-size:11px;color:#8a8a8a;">© EuropMade</p>
</td></tr>
</table></td></tr></table></body></html>`
  return { html, problems, warnings }
}
