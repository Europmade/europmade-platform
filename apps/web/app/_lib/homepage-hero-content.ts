/**
 * Homepage hero content — CMS-klaar (frontend-only tot admin/CMS beschikbaar is).
 * Prefer `resolveHomepageCms(locale).hero` on the homepage.
 */

import type { HeroCtaStyle, HeroTextStyle } from "@europmade/utils"

export type HomepageHeroCta = {
  label: string
  href: string
  style?: HeroCtaStyle
}

export type HomepageHeroImage = {
  src?: string
  alt: string
  captionTitle?: string
  captionBody?: string
}

export type HomepageBannerTone = "white" | "black"
export type HomepageBannerFit = "cover" | "contain"

export type HomepageProductBanner = {
  visible: boolean
  title: string
  subtitle: string
  ctaLabel: string
  href: string
  image?: string
  background: string
  textColor: HomepageBannerTone
  buttonColor: HomepageBannerTone
  imageFit: HomepageBannerFit
  imagePosition: string
}

export type HomepageHeroContent = {
  headline: string
  subtitle: string
  primaryCta: HomepageHeroCta
  secondaryCta: HomepageHeroCta
  image: HomepageHeroImage
  trustItems: readonly string[]
  backgroundGradient?: string
  backgroundImage?: string
  textColor?: HomepageBannerTone
  buttonColor?: HomepageBannerTone
  titleColor?: HeroTextStyle
  subtitleColor?: HeroTextStyle
  imageFit?: HomepageBannerFit
  imagePosition?: string
  productBanner?: HomepageProductBanner | null
}

/** Temporary NL fallback if CMS resolve is unavailable. */
export const DEFAULT_HOMEPAGE_HERO: HomepageHeroContent = {
  headline: "De grootste marketplace voor Europese producten.",
  subtitle:
    "Koop rechtstreeks bij Europese producenten én officiële retailers. Vergelijk prijzen, ontdek Verified™ merken en houd waarde, innovatie en werkgelegenheid binnen Europa.",
  primaryCta: {
    label: "Waarom EuropMade?",
    href: "/waarom-kopen",
  },
  secondaryCta: {
    label: "Word verkoper",
    href: "/waarom-verkopen",
  },
  image: {
    alt: "Europese producten, verpakking en Verified™ marketplace",
    captionTitle: "Verified™ · Made in Europe",
    captionBody: "Producenten én officiële retailers",
  },
  trustItems: [
    "Geproduceerd in Europa",
    "Geverifieerde productinformatie",
    "Vergelijk meerdere aanbieders",
    "Veilig betalen",
  ],
  backgroundGradient:
    "linear-gradient(165deg, #ffffff 0%, #f7f8fa 42%, #f2f3f5 100%)",
}
