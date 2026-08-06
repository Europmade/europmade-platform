/**
 * Homepage hero content — CMS-klaar (frontend-only tot admin/CMS beschikbaar is).
 * Later: vervang DEFAULT_HOMEPAGE_HERO door API/CMS-response met dezelfde shape.
 */

import { HOMEPAGE_HERO_TRUST } from "./homepage-content"

export type HomepageHeroCta = {
  label: string
  href: string
}

export type HomepageHeroImage = {
  /** Optionele URL; zonder src toont de UI een premium placeholder. */
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
}

/** Redactionele default — 1:1 vervangbaar door CMS-payload. */
export const DEFAULT_HOMEPAGE_HERO: HomepageHeroContent = {
  headline: "Ontdek Europese producten, rechtstreeks van de makers",
  subtitle:
    "Koop rechtstreeks bij Europese producenten en officiële merken. Transparant, duurzaam en zonder tussenhandel.",
  primaryCta: {
    label: "Bekijk producten",
    href: "/categorie",
  },
  secondaryCta: {
    label: "Word verkoper",
    href: "/partner-onboarding",
  },
  image: {
    alt: "Europese makers en producten",
    captionTitle: "Made in Europe · Verified™ herkomst",
    captionBody: "Rechtstreeks van producenten op EuropMade",
  },
  trustItems: HOMEPAGE_HERO_TRUST,
}
