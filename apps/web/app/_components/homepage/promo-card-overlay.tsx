import { cardShowsButton, heroCtaInlineStyle, type CampaignCardStyle } from "@europmade/utils"

/**
 * Title, logo, description and optional button over a campaign or brand image.
 * The button is not a link: the parent card is the only anchor.
 */
export function PromoCardOverlay({
  card,
  title,
  description,
  ctaLabel,
}: {
  card: CampaignCardStyle
  title: string
  description?: string
  ctaLabel?: string
}) {
  const justify =
    card.horizontal === "right"
      ? "justify-end"
      : card.horizontal === "center"
        ? "justify-center"
        : "justify-start"
  const items =
    card.vertical === "top"
      ? "items-start"
      : card.vertical === "bottom"
        ? "items-end"
        : "items-center"
  const cross =
    card.textAlign === "center"
      ? "items-center"
      : card.textAlign === "right"
        ? "items-end"
        : "items-start"
  const logoShift =
    card.textAlign === "center" ? "mx-auto" : card.textAlign === "right" ? "ml-auto" : ""
  const cloud =
    card.overlay === "light"
      ? "rgba(255,255,255,0.82)"
      : card.overlay === "dark"
        ? "rgba(15,23,42,0.55)"
        : null
  const showButton = cardShowsButton(card, ctaLabel)

  return (
    <div className={`pointer-events-none absolute inset-0 z-[1] flex p-2.5 tablet:p-3 ${justify} ${items}`}>
      <div
        className={`relative flex max-w-[86%] flex-col gap-1 tablet:max-w-[74%] ${cross}`}
        style={{ textAlign: card.textAlign }}
      >
        {cloud ? (
          <div
            className="absolute -inset-x-2.5 -inset-y-2 rounded-2xl"
            style={{ background: cloud }}
            aria-hidden
          />
        ) : null}
        {card.logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={card.logo}
            alt=""
            className={`relative h-auto max-w-full object-contain ${logoShift}`}
            style={{ width: card.logoWidth, maxHeight: "38%" }}
          />
        ) : null}
        {title ? (
          <h3
            className="relative line-clamp-2 text-[14px] font-bold leading-tight tracking-tight"
            style={{ color: card.titleColor }}
          >
            {title}
          </h3>
        ) : null}
        {description ? (
          <p
            className="relative line-clamp-2 text-[11.5px] leading-snug"
            style={{ color: card.descriptionColor }}
          >
            {description}
          </p>
        ) : null}
        {showButton ? (
          <span
            className="relative mt-1 inline-flex h-8 w-fit items-center justify-center px-3 text-[12px] font-semibold"
            style={heroCtaInlineStyle(card.cta)}
          >
            {ctaLabel}
          </span>
        ) : null}
      </div>
    </div>
  )
}
