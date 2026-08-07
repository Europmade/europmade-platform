/**
 * Homepage hero content — CMS-klaar (frontend-only tot admin/CMS beschikbaar is).
 * Prefer `resolveHomepageCms(locale).hero` on the homepage.
 */

export type HomepageHeroCta = {
  label: string
  href: string
}

export type HomepageHeroImage = {
  src?: string
  alt: string
  captionTitle?: string
  captionBody?: string
}

export type HomepageHeroContent = {
  headline: string
  subtitle: string
  primaryCta: HomepageHeroCta
  secondaryCta: HomepageHeroCta
  image: HomepageHeroImage
  trustItems: readonly string[]
  backgroundGradient?: string
}

/** Temporary NL fallback if CMS resolve is unavailable. */
export const DEFAULT_HOMEPAGE_HERO: HomepageHeroContent = {
  headline: "De grootste marketplace voor Europese producten.",
  subtitle:
    "Koop rechtstreeks bij Europese producenten én officiële retailers. Vergelijk prijzen, ontdek Verified™ merken en houd waarde, innovatie en werkgelegenheid binnen Europa.",
  primaryCta: {
    label: "Bekijk producten",
    href: "/categorie",
  },
  secondaryCta: {
    label: "Word verkoper",
    href: "/partner-onboarding",
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
