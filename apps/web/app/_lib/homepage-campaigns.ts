/**
 * Homepage-campagnes — CMS-klaar (frontend placeholder tot admin/CMS live is).
 * Prefer `resolveHomepageCms(locale).campaigns` on the homepage.
 */

import type { CampaignCardStyle } from "@europmade/utils"

export type HomepageCampaign = {
  id: string
  slug: string
  title: string
  description: string
  ctaLabel: string
  href: string
  /** Optionele afbeelding-URL; zonder src: premium gradient-placeholder. */
  imageSrc?: string
  imageAlt: string
  /** Hue-seed voor placeholder. */
  accentHue: number
  card?: CampaignCardStyle
}

/** Temporary NL fallback — mirrored from CMS mock. */
export const DEFAULT_HOMEPAGE_CAMPAIGNS: HomepageCampaign[] = [
  {
    id: "camp_back_to_school",
    slug: "back-to-school",
    title: "Back to School",
    description:
      "Europese schoolspullen, tassen en elektronica — klaar voor het nieuwe jaar.",
    ctaLabel: "Shop nu",
    href: "/acties/back-to-school",
    imageAlt: "Back to School campagne",
    accentHue: 210,
  },
  {
    id: "camp_zomerdeals",
    slug: "zomerdeals",
    title: "Zomerdeals",
    description:
      "Tuin, outdoor en keukenware met Europese herkomst — tijdelijke kortingen.",
    ctaLabel: "Shop nu",
    href: "/acties/zomerdeals",
    imageAlt: "Zomerdeals campagne",
    accentHue: 42,
  },
  {
    id: "camp_black_friday",
    slug: "black-friday",
    title: "Black Friday",
    description:
      "De beste totale aanbiedingen van Europese makers — nooit gesponsorde Buy Box.",
    ctaLabel: "Shop nu",
    href: "/acties/black-friday",
    imageAlt: "Black Friday campagne",
    accentHue: 0,
  },
  {
    id: "camp_weekend",
    slug: "weekend-deals",
    title: "Weekend Deals",
    description:
      "Elk weekend geselecteerde deals van producenten en officiële retailers.",
    ctaLabel: "Shop nu",
    href: "/acties/weekend-deals",
    imageAlt: "Weekend Deals campagne",
    accentHue: 160,
  },
  {
    id: "camp_kerst",
    slug: "kerstcadeaus",
    title: "Kerstcadeaus",
    description:
      "Duurzame cadeaus met Verified™ herkomst — voor elk budget en elke leeftijd.",
    ctaLabel: "Shop nu",
    href: "/acties/kerstcadeaus",
    imageAlt: "Kerstcadeaus campagne",
    accentHue: 350,
  },
  {
    id: "camp_nieuwe_merken",
    slug: "nieuwe-europese-merken",
    title: "Nieuwe Europese merken",
    description:
      "Ontdek recent aangesloten producenten en merken uit heel Europa.",
    ctaLabel: "Shop nu",
    href: "/acties/nieuwe-merken",
    imageAlt: "Nieuwe Europese merken campagne",
    accentHue: 280,
  },
]
