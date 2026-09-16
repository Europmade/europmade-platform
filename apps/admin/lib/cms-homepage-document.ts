import { emptyLocalized, type LocalizedCms } from "./cms-admin-api"
import type { CmsI18nMeta } from "./cms-i18n"

export const HOMEPAGE_SECTION_KEYS = [
  "intro",
  "categories",
  "campaigns",
  "featured",
  "banner",
  "partners",
  "why",
  "seller_cta",
  "editorial",
  "newest",
  "best_sellers",
  "faq",
  "newsletter",
] as const

export type HomepageSectionKey = (typeof HOMEPAGE_SECTION_KEYS)[number]

export const SECTION_LABELS: Record<HomepageSectionKey, string> = {
  intro: "Introductietekst",
  categories: "Categorieën",
  campaigns: "Campagnes",
  featured: "Uitgelichte producten",
  banner: "Banner",
  partners: "Uitgelichte merken",
  why: "Made in Europe / USP",
  seller_cta: "Seller CTA",
  editorial: "Editorial",
  newest: "Nieuw binnen",
  best_sellers: "Best verkocht",
  faq: "FAQ",
  newsletter: "Nieuwsbrief",
}

export type HomepageSectionDoc = {
  id: string
  key: HomepageSectionKey
  visible: boolean
  sortOrder: number
  title: LocalizedCms
  subtitle: LocalizedCms
  image?: string | null
  body?: LocalizedCms
  href?: string
  productIds?: string[]
  limit?: number
  sortMode?:
    | "offers"
    | "newest"
    | "rating"
    | "price_asc"
    | "price_desc"
    | "random"
  /** Changes when user re-selects "random" so shuffle updates. */
  sortSeed?: number
  /** When false, hide section-level image even if `image` is set (e.g. Made in Europe). */
  showImage?: boolean
}

export type HomepagePartnerDoc = {
  id: string
  slug: string
  visible: boolean
  sortOrder: number
  title: LocalizedCms
  subtitle: LocalizedCms
  image?: string | null
  logo?: string | null
  backgroundKey: "light" | "dark" | "green" | "beige" | "earth"
  country: LocalizedCms
  rating: number
  productCount: number
}

export type HomepageHeroDoc = {
  id: string
  visible: boolean
  sortOrder: number
  title: LocalizedCms
  subtitle: LocalizedCms
  cta1: { label: LocalizedCms; href: string }
  cta2: { label: LocalizedCms; href: string }
  heroImage?: string | null
  heroImageAlt: LocalizedCms
  backgroundGradient: string
  trustBullets: LocalizedCms[]
  captionTitle?: LocalizedCms
  captionBody?: LocalizedCms
}

export type HomepageWhyItemDoc = {
  id: string
  visible: boolean
  sortOrder: number
  title: LocalizedCms
  subtitle: LocalizedCms
  image?: string | null
}

export type HomepageCmsDoc = {
  hero: HomepageHeroDoc
  campaigns: unknown[]
  banners: unknown[]
  sections: HomepageSectionDoc[]
  categories: Array<{
    id: string
    slug: string
    categoryId?: string | null
    visible: boolean
    sortOrder: number
    title: LocalizedCms
    subtitle?: LocalizedCms
    image?: string | null
  }>
  whyItems: HomepageWhyItemDoc[]
  newsletter: {
    id: string
    visible: boolean
    sortOrder: number
    title: LocalizedCms
    subtitle: LocalizedCms
    placeholder: LocalizedCms
    submitLabel: LocalizedCms
    invalidEmail: LocalizedCms
    successMessage: LocalizedCms
    image?: string | null
  }
  partnerSpotlight: HomepagePartnerDoc[]
  faqItems?: HomepageWhyItemDoc[]
  _i18n?: CmsI18nMeta
}

function loc(value: unknown): LocalizedCms {
  if (!value || typeof value !== "object") return emptyLocalized()
  const v = value as Record<string, unknown>
  return {
    nl: typeof v.nl === "string" ? v.nl : "",
    en: typeof v.en === "string" ? v.en : "",
    de: typeof v.de === "string" ? v.de : "",
    fr: typeof v.fr === "string" ? v.fr : "",
  }
}

function isSectionKey(value: string): value is HomepageSectionKey {
  return (HOMEPAGE_SECTION_KEYS as readonly string[]).includes(value)
}

export function defaultHero(): HomepageHeroDoc {
  return {
    id: "hero_main",
    visible: true,
    sortOrder: 0,
    title: {
      nl: "De grootste marketplace voor Europese producten.",
      en: "Europe’s marketplace for European-made products.",
      de: "Der Marktplatz für europäische Produkte.",
      fr: "La marketplace des produits européens.",
    },
    subtitle: {
      nl: "Koop rechtstreeks bij Europese producenten én officiële retailers.",
      en: "Buy directly from European producers and official retailers.",
      de: "Kaufen Sie direkt bei europäischen Produzenten und offiziellen Händlern.",
      fr: "Achetez directement auprès de producteurs européens et de détaillants officiels.",
    },
    cta1: {
      label: {
        nl: "Waarom EuropMade?",
        en: "Why EuropMade?",
        de: "Warum EuropMade?",
        fr: "Pourquoi EuropMade ?",
      },
      href: "/waarom-kopen",
    },
    cta2: {
      label: {
        nl: "Word verkoper",
        en: "Become a seller",
        de: "Verkäufer werden",
        fr: "Devenir vendeur",
      },
      href: "/waarom-verkopen",
    },
    heroImage: null,
    heroImageAlt: {
      nl: "Europese producten",
      en: "European products",
      de: "Europäische Produkte",
      fr: "Produits européens",
    },
    backgroundGradient:
      "linear-gradient(165deg, #ffffff 0%, #f7f8fa 42%, #f2f3f5 100%)",
    trustBullets: [
      {
        nl: "Geproduceerd in Europa",
        en: "Made in Europe",
        de: "Hergestellt in Europa",
        fr: "Fabriqué en Europe",
      },
    ],
  }
}

export function defaultSections(): HomepageSectionDoc[] {
  const defs: Array<[HomepageSectionKey, number, string, string]> = [
    ["categories", 10, "Populaire categorieën", ""],
    ["campaigns", 20, "Acties & thema’s", ""],
    ["featured", 30, "Uitgelicht deze week", "Best beoordeeld — nooit gesponsord."],
    ["banner", 35, "Banner", ""],
    ["partners", 40, "Populaire Europese merken", ""],
    ["why", 50, "Waarom kiezen voor EuropMade?", ""],
    ["newest", 60, "Nieuw binnen", ""],
    ["best_sellers", 70, "Best verkocht", ""],
    ["banner", 75, "Banner", ""],
    ["newsletter", 80, "Blijf op de hoogte", ""],
  ]
  return defs.map(([key, sortOrder, nl, sub], i) => ({
    id: `sec_${key}_${i}`,
    key,
    visible: true,
    sortOrder,
    title: { nl, en: nl, de: nl, fr: nl },
    subtitle: { nl: sub, en: sub, de: sub, fr: sub },
    image: null,
    body: emptyLocalized(),
    href: key === "seller_cta" ? "/waarom-verkopen" : "",
  }))
}

export function createSection(key: HomepageSectionKey): HomepageSectionDoc {
  const title = SECTION_LABELS[key]
  const isProductRail =
    key === "featured" || key === "newest" || key === "best_sellers"
  return {
    id: `sec_${key}_${Date.now()}`,
    key,
    visible: true,
    sortOrder: 90,
    title: { nl: title, en: title, de: title, fr: title },
    subtitle: emptyLocalized(),
    image: null,
    body: emptyLocalized(),
    href: key === "seller_cta" ? "/waarom-verkopen" : "",
    productIds: [],
    limit: isProductRail ? 12 : undefined,
    sortMode: isProductRail
      ? key === "newest"
        ? "newest"
        : key === "best_sellers"
          ? "offers"
          : "offers"
      : undefined,
    showImage: true,
  }
}

export function emptyHomepageDocument(): HomepageCmsDoc {
  return {
    hero: defaultHero(),
    campaigns: [],
    banners: [],
    sections: defaultSections(),
    categories: [],
    whyItems: [],
    newsletter: {
      id: "newsletter",
      visible: true,
      sortOrder: 0,
      title: emptyLocalized(),
      subtitle: emptyLocalized(),
      placeholder: emptyLocalized(),
      submitLabel: emptyLocalized(),
      invalidEmail: emptyLocalized(),
      successMessage: emptyLocalized(),
    },
    partnerSpotlight: [],
    faqItems: [],
    _i18n: {},
  }
}

export function normalizeHomepageDocument(raw: unknown): HomepageCmsDoc {
  const base = emptyHomepageDocument()
  if (!raw || typeof raw !== "object") return base
  const d = raw as Record<string, unknown>
  const heroIn = d.hero && typeof d.hero === "object" ? (d.hero as Record<string, unknown>) : {}
  const cta1 = (heroIn.cta1 as Record<string, unknown> | undefined) ?? {}
  const cta2 = (heroIn.cta2 as Record<string, unknown> | undefined) ?? {}
  const sectionsRaw = Array.isArray(d.sections) ? d.sections : []
  const sections: HomepageSectionDoc[] =
    sectionsRaw.length > 0
      ? sectionsRaw.map((item, i) => {
          const s = (item ?? {}) as Record<string, unknown>
          const key = isSectionKey(String(s.key ?? ""))
            ? (s.key as HomepageSectionKey)
            : "editorial"
          return {
            id: typeof s.id === "string" ? s.id : `sec_${i}`,
            key,
            visible: s.visible !== false,
            sortOrder: Number(s.sortOrder ?? i * 10) || 0,
            title: loc(s.title),
            subtitle: loc(s.subtitle),
            image: typeof s.image === "string" ? s.image : null,
            body: loc(s.body),
            href: typeof s.href === "string" ? s.href : "",
            productIds: Array.isArray(s.productIds)
              ? s.productIds.map(String).filter(Boolean)
              : [],
            limit: Number.isFinite(Number(s.limit))
              ? Math.min(48, Math.max(1, Number(s.limit)))
              : undefined,
            sortMode:
              s.sortMode === "newest" ||
              s.sortMode === "rating" ||
              s.sortMode === "offers" ||
              s.sortMode === "price_asc" ||
              s.sortMode === "price_desc" ||
              s.sortMode === "random"
                ? s.sortMode
                : undefined,
            sortSeed: Number.isFinite(Number(s.sortSeed))
              ? Number(s.sortSeed)
              : undefined,
            showImage: s.showImage !== false,
          }
        })
      : base.sections

  const whyItems = Array.isArray(d.whyItems)
    ? d.whyItems.map((item, i) => {
        const w = (item ?? {}) as Record<string, unknown>
        return {
          id: typeof w.id === "string" ? w.id : `why_${i}`,
          visible: w.visible !== false,
          sortOrder: Number(w.sortOrder ?? i * 10) || 0,
          title: loc(w.title),
          subtitle: loc(w.subtitle),
          image: typeof w.image === "string" ? w.image : null,
        }
      })
    : []

  const faqItems = Array.isArray(d.faqItems)
    ? d.faqItems.map((item, i) => {
        const w = (item ?? {}) as Record<string, unknown>
        return {
          id: typeof w.id === "string" ? w.id : `faq_${i}`,
          visible: w.visible !== false,
          sortOrder: Number(w.sortOrder ?? i * 10) || 0,
          title: loc(w.title),
          subtitle: loc(w.subtitle),
          image: null,
        }
      })
    : []

  const categories = Array.isArray(d.categories)
    ? d.categories.map((item, i) => {
        const c = (item ?? {}) as Record<string, unknown>
        return {
          id: typeof c.id === "string" ? c.id : `cat_${i}`,
          slug: typeof c.slug === "string" ? c.slug : "",
          categoryId:
            typeof c.categoryId === "string"
              ? c.categoryId
              : typeof c.category_id === "string"
                ? c.category_id
                : null,
          visible: c.visible !== false,
          sortOrder: Number(c.sortOrder ?? i * 10) || 0,
          title: loc(c.title),
          subtitle: loc(c.subtitle),
          image: typeof c.image === "string" ? c.image : null,
        }
      })
    : []

  const news = (d.newsletter as Record<string, unknown> | undefined) ?? {}

  const partners: HomepagePartnerDoc[] = Array.isArray(d.partnerSpotlight)
    ? d.partnerSpotlight.map((item, i) => {
        const p = (item ?? {}) as Record<string, unknown>
        const bg = p.backgroundKey
        return {
          id: typeof p.id === "string" ? p.id : `partner_${i}`,
          slug: typeof p.slug === "string" ? p.slug : "",
          visible: p.visible !== false,
          sortOrder: Number(p.sortOrder ?? i * 10) || 0,
          title: loc(p.title),
          subtitle: loc(p.subtitle),
          image: typeof p.image === "string" ? p.image : null,
          logo: typeof p.logo === "string" ? p.logo : null,
          backgroundKey:
            bg === "dark" ||
            bg === "green" ||
            bg === "beige" ||
            bg === "earth" ||
            bg === "light"
              ? bg
              : "light",
          country: loc(p.country),
          rating: Number(p.rating ?? 0) || 0,
          productCount: Number(p.productCount ?? 0) || 0,
        }
      })
    : []

  return {
    hero: {
      ...base.hero,
      id: typeof heroIn.id === "string" ? heroIn.id : "hero_main",
      visible: heroIn.visible !== false,
      title: loc(heroIn.title) ,
      subtitle: loc(heroIn.subtitle),
      cta1: {
        label: loc(cta1.label),
        href: typeof cta1.href === "string" ? cta1.href : "/waarom-kopen",
      },
      cta2: {
        label: loc(cta2.label),
        href: typeof cta2.href === "string" ? cta2.href : "/waarom-verkopen",
      },
      heroImage: typeof heroIn.heroImage === "string" ? heroIn.heroImage : null,
      heroImageAlt: loc(heroIn.heroImageAlt),
      backgroundGradient:
        typeof heroIn.backgroundGradient === "string"
          ? heroIn.backgroundGradient
          : base.hero.backgroundGradient,
      trustBullets: Array.isArray(heroIn.trustBullets)
        ? heroIn.trustBullets.map((b) => loc(b))
        : base.hero.trustBullets,
      captionTitle: heroIn.captionTitle ? loc(heroIn.captionTitle) : undefined,
      captionBody: heroIn.captionBody ? loc(heroIn.captionBody) : undefined,
    },
    campaigns: Array.isArray(d.campaigns) ? d.campaigns : [],
    banners: Array.isArray(d.banners) ? d.banners : [],
    sections,
    categories,
    whyItems,
    newsletter: {
      ...base.newsletter,
      title: loc(news.title),
      subtitle: loc(news.subtitle),
      placeholder: loc(news.placeholder),
      submitLabel: loc(news.submitLabel),
      invalidEmail: loc(news.invalidEmail),
      successMessage: loc(news.successMessage),
      image: typeof news.image === "string" ? news.image : null,
    },
    partnerSpotlight: partners,
    faqItems,
    _i18n:
      d._i18n && typeof d._i18n === "object"
        ? (d._i18n as CmsI18nMeta)
        : {},
  }
}

export function pickLoc(value: LocalizedCms, locale: keyof LocalizedCms): string {
  return value[locale] || value.nl || ""
}
