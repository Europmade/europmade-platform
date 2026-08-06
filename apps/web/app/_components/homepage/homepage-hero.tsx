import Link from "next/link"
import {
  DEFAULT_HOMEPAGE_HERO,
  type HomepageHeroContent,
} from "../../_lib/homepage-hero-content"

type HomepageHeroProps = {
  /** CMS-/admin-payload; default = redactionele content. */
  content?: HomepageHeroContent
}

/**
 * Premium homepage hero — content gescheiden van layout (CMS-klaar).
 * Geen tweede zoekbalk; header-zoek is voldoende.
 */
export function HomepageHero({ content = DEFAULT_HOMEPAGE_HERO }: HomepageHeroProps) {
  const { headline, subtitle, primaryCta, secondaryCta, image, trustItems } =
    content

  return (
    <section className="border-b border-wf-100 px-4 pb-5 pt-5 tablet:px-8 tablet:pb-6 tablet:pt-6">
      <div className="grid items-center gap-5 desktop:grid-cols-[1.05fr_0.95fr] desktop:gap-7">
        <div className="min-w-0">
          <h1 className="max-w-[34rem] text-[24px] font-bold leading-[1.15] tracking-tight text-wf-900 tablet:text-[30px] desktop:text-[34px]">
            {headline}
          </h1>
          <p className="mt-2.5 max-w-[32rem] text-[13px] leading-relaxed text-wf-600 tablet:text-[14px]">
            {subtitle}
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href={primaryCta.href}
              className="inline-flex h-10 items-center justify-center rounded-xl bg-wf-900 px-4 text-[13px] font-semibold text-white transition hover:bg-black"
            >
              {primaryCta.label}
            </Link>
            <Link
              href={secondaryCta.href}
              className="inline-flex h-10 items-center justify-center rounded-xl border border-wf-300 bg-white px-4 text-[13px] font-semibold text-wf-800 transition hover:border-wf-500 hover:bg-wf-50"
            >
              {secondaryCta.label}
            </Link>
          </div>

          <ul
            className="mt-4 grid grid-cols-1 gap-1.5 mobile:grid-cols-2"
            aria-label="Vertrouwenssignalen"
          >
            {trustItems.map((item) => (
              <li
                key={item}
                className="flex items-start gap-1.5 text-[12px] text-wf-700"
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
      className="relative aspect-[5/3] overflow-hidden rounded-2xl border border-wf-200 shadow-sm desktop:aspect-auto desktop:min-h-[200px] desktop:max-h-[240px]"
      role="img"
      aria-label={image.alt}
      style={
        image.src
          ? undefined
          : {
              background:
                "linear-gradient(145deg, #f4f4f5 0%, #e4e4e7 42%, #d4d4d8 100%)",
            }
      }
    >
      {image.src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={image.src}
          alt={image.alt}
          className="h-full w-full object-cover"
        />
      ) : (
        <div
          className="absolute inset-0 opacity-80"
          style={{
            background:
              "radial-gradient(ellipse at 30% 20%, rgba(255,255,255,0.9), transparent 55%), radial-gradient(ellipse at 80% 70%, rgba(24,24,27,0.08), transparent 50%)",
          }}
          aria-hidden
        />
      )}
      {image.captionTitle || image.captionBody ? (
        <div className="absolute bottom-3 left-3 right-3 rounded-xl border border-white/70 bg-white/80 px-3 py-2 backdrop-blur-sm">
          {image.captionTitle ? (
            <p className="text-[11px] font-semibold text-wf-800">
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
