import Link from "next/link"
import {
  DEFAULT_HOMEPAGE_HERO,
  type HomepageHeroContent,
} from "../../_lib/homepage-hero-content"
import { productMockupSrc } from "../../_lib/product-mockup"

type HomepageHeroProps = {
  content?: HomepageHeroContent & { backgroundGradient?: string }
}

/**
 * Premium homepage hero — CMS content + European marketplace composition.
 */
export function HomepageHero({ content = DEFAULT_HOMEPAGE_HERO }: HomepageHeroProps) {
  const {
    headline,
    subtitle,
    primaryCta,
    secondaryCta,
    image,
    trustItems,
    backgroundGradient,
  } = content as HomepageHeroContent & { backgroundGradient?: string }

  const bg =
    backgroundGradient ??
    "linear-gradient(165deg, #ffffff 0%, #f7f8fa 42%, #f2f3f5 100%)"

  if (!headline) return null

  return (
    <section className="relative overflow-hidden border-b border-wf-100">
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
        style={{ background: bg }}
      />
      <div
        className="pointer-events-none absolute -right-12 top-[-18%] h-[110%] w-[48%] opacity-[0.18]"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse at 42% 48%, rgba(70,110,180,0.32) 0%, transparent 68%)",
        }}
      />

      <div className="relative px-4 pb-3.5 pt-3.5 tablet:px-8 tablet:pb-4 tablet:pt-4">
        <div className="grid items-center gap-4 desktop:grid-cols-[1.05fr_0.95fr] desktop:gap-5">
          <div className="min-w-0">
            <h1 className="max-w-[36rem] text-[22px] font-bold leading-[1.12] tracking-tight text-wf-900 tablet:text-[27px] desktop:text-[30px]">
              {headline}
            </h1>
            <p className="mt-2 max-w-[34rem] text-[12.5px] leading-snug text-wf-600 line-clamp-3 tablet:text-[13px]">
              {subtitle}
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                href={primaryCta.href}
                className="inline-flex h-9 items-center justify-center rounded-xl bg-wf-900 px-3.5 text-[12.5px] font-semibold text-white transition hover:bg-black"
              >
                {primaryCta.label}
              </Link>
              <Link
                href={secondaryCta.href}
                className="inline-flex h-9 items-center justify-center rounded-xl border border-wf-300 bg-white/90 px-3.5 text-[12.5px] font-semibold text-wf-800 backdrop-blur-sm transition hover:border-wf-500 hover:bg-white"
              >
                {secondaryCta.label}
              </Link>
            </div>

            <ul
              className="mt-3 grid grid-cols-1 gap-1 mobile:grid-cols-2"
              aria-label="Trust"
            >
              {trustItems.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-1.5 text-[11.5px] text-wf-700"
                >
                  <span
                    className="mt-0.5 inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-wf-900 text-[9px] font-bold text-white"
                    aria-hidden
                  >
                    ✓
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <HomepageHeroMedia image={image} />
        </div>
      </div>
    </section>
  )
}

function HomepageHeroMedia({
  image,
}: {
  image: HomepageHeroContent["image"]
}) {
  return (
    <div
      className="relative aspect-[16/10] overflow-hidden rounded-2xl border border-wf-200/70 shadow-[0_10px_32px_rgba(15,23,42,0.06)] desktop:aspect-auto desktop:min-h-[176px] desktop:max-h-[216px]"
      role="img"
      aria-label={image.alt}
    >
      {image.src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={image.src}
          alt={image.alt}
          className="h-full w-full object-cover"
          decoding="async"
        />
      ) : (
        <HeroProductComposition />
      )}
      {image.captionTitle || image.captionBody ? (
        <div className="absolute bottom-2.5 left-2.5 right-2.5 rounded-xl border border-white/80 bg-white/88 px-2.5 py-1.5 shadow-sm backdrop-blur-sm">
          {image.captionTitle ? (
            <p className="text-[10.5px] font-semibold text-wf-800">
              {image.captionTitle}
            </p>
          ) : null}
          {image.captionBody ? (
            <p className="mt-0.5 text-[10px] text-wf-600">{image.captionBody}</p>
          ) : null}
        </div>
      ) : null}
    </div>
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
