import Link from "next/link"
import {
  heroCtaInlineStyle,
  heroTrustColor,
  HOMEPAGE_CONTENT_GUTTER,
  isHeroWhiteColor,
  legacyHeroCtaStyle,
  parseHeroTextStyle,
} from "@europmade/utils"
import {
  DEFAULT_HOMEPAGE_HERO,
  type HomepageHeroContent,
} from "../../_lib/homepage-hero-content"
import { productMockupSrc } from "../../_lib/product-mockup"

type HomepageHeroProps = {
  content?: HomepageHeroContent & { backgroundGradient?: string }
  /** CMS preview: empty media instead of the decorative composition. */
  honestEmpty?: boolean
}

/**
 * Premium homepage hero — CMS content + European marketplace composition.
 */
export function HomepageHero({
  content = DEFAULT_HOMEPAGE_HERO,
  honestEmpty = false,
}: HomepageHeroProps) {
  const {
    headline,
    subtitle,
    primaryCta,
    secondaryCta,
    image,
    trustItems,
    backgroundGradient,
    backgroundImage,
    textColor = "black",
    buttonColor = "black",
    titleColor,
    subtitleColor,
    imageFit = "cover",
    imagePosition = "50% 50%",
    productBanner,
  } = content as HomepageHeroContent & { backgroundGradient?: string }

  const bg =
    backgroundGradient ??
    "linear-gradient(165deg, #ffffff 0%, #f7f8fa 42%, #f2f3f5 100%)"
  const resolvedTitle = titleColor ?? parseHeroTextStyle(undefined, textColor, "title")
  const resolvedSubtitle =
    subtitleColor ?? parseHeroTextStyle(undefined, textColor, "subtitle")
  const lightText = isHeroWhiteColor(resolvedTitle.color)
  const primaryStyle =
    primaryCta.style ?? legacyHeroCtaStyle("primary", buttonColor)
  const secondaryStyle =
    secondaryCta.style ?? legacyHeroCtaStyle("secondary", buttonColor)
  const trustColor = heroTrustColor(resolvedTitle)
  const showProduct = productBanner ? productBanner.visible : true
  const productImage = productBanner?.image || image.src
  const backgroundFit = imageFit === "contain" ? "contain" : "cover"
  const productFit = productBanner?.imageFit === "cover" ? "cover" : "contain"

  if (!headline && !showProduct) return null

  return (
    <section className={`border-b border-wf-100 pb-1 pt-3 tablet:pb-1.5 tablet:pt-3.5 ${HOMEPAGE_CONTENT_GUTTER}`}>
      <div className="grid items-stretch gap-2.5 tablet:grid-cols-2 tablet:gap-3">
        {headline ? (
          <article className="relative grid w-full overflow-hidden rounded-2xl border border-wf-200">
            <div className="col-start-1 row-start-1 aspect-[2.85/1]" aria-hidden />
            <div className="absolute inset-0" style={{ background: bg }} aria-hidden />
            {backgroundImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={backgroundImage}
                alt=""
                className="absolute inset-0 h-full w-full"
                style={{ objectFit: backgroundFit, objectPosition: imagePosition }}
              />
            ) : null}
            {backgroundImage && lightText ? (
              <div
                className="absolute inset-0"
                aria-hidden
                style={{
                  background:
                    "linear-gradient(90deg, rgba(15,23,42,0.62) 0%, rgba(15,23,42,0.28) 70%, rgba(15,23,42,0.12) 100%)",
                }}
              />
            ) : null}
            <div className="relative z-[1] col-start-1 row-start-1 flex h-full flex-col justify-center p-3.5 tablet:p-4">
              <h1
                data-hero-title=""
                className="max-w-[22rem] text-[22px] font-bold leading-[1.12] tracking-tight tablet:text-[24px] desktop:text-[26px]"
                style={{ color: resolvedTitle.color }}
              >
                {headline}
              </h1>
              {subtitle ? (
                <p
                  data-hero-subtitle=""
                  className="mt-1.5 line-clamp-2 max-w-[24rem] text-[12.5px] leading-snug"
                  style={{ color: resolvedSubtitle.color }}
                >
                  {subtitle}
                </p>
              ) : null}
              <div className="mt-2.5 flex flex-wrap gap-2">
                {primaryCta.label ? (
                  <Link
                    href={primaryCta.href}
                    data-hero-cta="1"
                    className="inline-flex h-8 items-center justify-center px-3.5 text-[12.5px] font-semibold"
                    style={heroCtaInlineStyle(primaryStyle)}
                  >
                    {primaryCta.label}
                  </Link>
                ) : null}
                {secondaryCta.label ? (
                  <Link
                    href={secondaryCta.href}
                    data-hero-cta="2"
                    className="inline-flex h-8 items-center justify-center px-3.5 text-[12.5px] font-semibold"
                    style={heroCtaInlineStyle(secondaryStyle)}
                  >
                    {secondaryCta.label}
                  </Link>
                ) : null}
              </div>
              {trustItems.length > 0 ? (
                <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1" aria-label="Trust">
                  {trustItems.map((item) => (
                    <li key={item} className="text-[12px]" style={{ color: trustColor }}>
                      {item}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </article>
        ) : null}

        {showProduct ? (
          <article
            className="relative grid w-full overflow-hidden rounded-2xl border border-wf-200"
            style={{
              background: productBanner?.background || "#f3f5f8",
            }}
          >
            <div className="col-start-1 row-start-1 aspect-[2.85/1]" aria-hidden />
            {productImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={productImage}
                alt={image.alt}
                className="absolute inset-0 h-full w-full"
                style={{
                  objectFit: productFit,
                  objectPosition: productBanner?.imagePosition || "center",
                }}
              />
            ) : honestEmpty ? (
              <div className="relative z-[1] col-start-1 row-start-1 flex items-center justify-center text-[13px] text-wf-500">
                Geen content ingesteld
              </div>
            ) : (
              <div className="relative col-start-1 row-start-1">
                <HeroProductComposition />
              </div>
            )}
            {productBanner?.title ? (
              <div className="relative z-[1] col-start-1 row-start-1 flex h-full flex-col justify-end p-4">
                <p
                  className={`text-[22px] font-bold leading-tight ${
                    productBanner.textColor === "white" ? "text-white" : "text-wf-900"
                  }`}
                >
                  {productBanner.title}
                </p>
                {productBanner.subtitle ? (
                  <p
                    className={`mt-1 text-[13px] ${
                      productBanner.textColor === "white" ? "text-white/90" : "text-wf-600"
                    }`}
                  >
                    {productBanner.subtitle}
                  </p>
                ) : null}
                {productBanner.ctaLabel && productBanner.href ? (
                  <Link
                    href={productBanner.href}
                    className={`mt-3 inline-flex h-9 w-fit items-center rounded-lg px-3.5 text-[12.5px] font-semibold ${
                      productBanner.buttonColor === "white"
                        ? "bg-white text-wf-900"
                        : "bg-wf-900 text-white"
                    }`}
                  >
                    {productBanner.ctaLabel}
                  </Link>
                ) : null}
              </div>
            ) : null}
            {!productBanner?.title && (image.captionTitle || image.captionBody) ? (
              <div className="absolute bottom-3 left-3 right-3 rounded-xl border border-white/80 bg-white/90 px-3 py-2">
                {image.captionTitle ? (
                  <p className="text-[12px] font-semibold text-wf-800">{image.captionTitle}</p>
                ) : null}
                {image.captionBody ? (
                  <p className="mt-0.5 text-[11px] text-wf-600">{image.captionBody}</p>
                ) : null}
              </div>
            ) : null}
          </article>
        ) : null}
      </div>
    </section>
  )
}

/**
 * Launch-ready composition: kitchen appliance, packaging, floating cards, Verified™.
 * Structured for CMS hero-image injection — no stock photo, calm whitespace.
 */
function HeroProductComposition() {
  return (
    <div className="absolute inset-0" aria-hidden>
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(152deg, #fbfbfc 0%, #f3f5f8 48%, #e9eef4 100%)",
        }}
      />
      <div
        className="absolute inset-x-[12%] bottom-[6%] h-[18%] rounded-[100%] opacity-40"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(15,23,42,0.08), transparent 70%)",
        }}
      />

      {/* Elegant packaging */}
      <div className="absolute left-[6%] top-[14%] h-[54%] w-[24%] rounded-lg border border-wf-200/90 bg-white shadow-[0_16px_36px_rgba(15,23,42,0.08)]">
        <div className="absolute inset-x-[14%] top-[12%] h-[11%] rounded-sm bg-gradient-to-r from-wf-200/90 to-wf-100" />
        <div className="absolute inset-x-[18%] top-[32%] h-[6%] rounded-sm bg-wf-100" />
        <div className="absolute inset-x-[18%] top-[44%] h-[6%] rounded-sm bg-wf-100" />
        <div className="absolute inset-[58%_16%_12%] rounded-md bg-gradient-to-b from-[#f6f7f9] to-[#e8ecf2]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={productMockupSrc("hero-pack", "cookware")}
            alt=""
            className="h-full w-full object-contain p-1 drop-shadow-[0_6px_14px_rgba(15,23,42,0.1)]"
            decoding="async"
          />
        </div>
      </div>

      {/* Primary: premium coffee machine */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={productMockupSrc("hero-coffee", "coffee")}
        alt=""
        className="absolute bottom-[10%] left-[26%] h-[72%] w-auto max-w-[36%] object-contain drop-shadow-[0_20px_40px_rgba(15,23,42,0.14)]"
        decoding="async"
      />

      {/* Floating card — headphones */}
      <div className="absolute right-[7%] top-[10%] w-[36%] rotate-[2.5deg] rounded-xl border border-wf-200/90 bg-white/96 p-1.5 shadow-[0_14px_30px_rgba(15,23,42,0.1)] backdrop-blur-sm">
        <div className="mb-1.5 flex aspect-[5/3.6] items-center justify-center rounded-lg bg-[#f5f6f8]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={productMockupSrc("hero-headphones", "headphones")}
            alt=""
            className="h-[92%] w-auto object-contain drop-shadow-[0_8px_16px_rgba(15,23,42,0.1)]"
            loading="lazy"
            decoding="async"
          />
        </div>
        <div className="h-1.5 w-[70%] rounded bg-wf-200" />
        <div className="mt-1 flex items-center justify-between gap-1">
          <div className="h-1.5 w-[36%] rounded bg-wf-100" />
          <span className="text-[8px] font-bold text-wf-700">Verified™</span>
        </div>
      </div>

      {/* Floating card — watch */}
      <div className="absolute bottom-[9%] right-[5%] w-[30%] -rotate-[2.5deg] rounded-xl border border-wf-200/90 bg-white/96 p-1.5 shadow-[0_12px_26px_rgba(15,23,42,0.09)]">
        <div className="mb-1 flex aspect-square items-center justify-center rounded-lg bg-[#f5f6f8]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={productMockupSrc("hero-watch", "watch")}
            alt=""
            className="h-[90%] w-auto object-contain drop-shadow-[0_8px_16px_rgba(15,23,42,0.1)]"
            loading="lazy"
            decoding="async"
          />
        </div>
        <div className="h-1 w-[64%] rounded bg-wf-200" />
      </div>

      {/* Soft secondary product — vacuum peek */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={productMockupSrc("hero-vacuum", "vacuum")}
        alt=""
        className="absolute bottom-[14%] left-[48%] h-[38%] w-auto max-w-[18%] object-contain opacity-90 drop-shadow-[0_10px_20px_rgba(15,23,42,0.12)]"
        loading="lazy"
        decoding="async"
      />

      {/* Verified™ badge */}
      <div className="absolute left-[44%] top-[8%] z-[2] flex items-center gap-1.5 rounded-full border border-wf-300/90 bg-white px-2.5 py-1 shadow-[0_8px_22px_rgba(15,23,42,0.1)]">
        <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-wf-900 text-[8px] font-bold text-white">
          ✓
        </span>
        <span className="text-[10px] font-semibold tracking-wide text-wf-800">
          Verified™
        </span>
      </div>
    </div>
  )
}
