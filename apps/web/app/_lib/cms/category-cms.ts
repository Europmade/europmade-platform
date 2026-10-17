/**
 * Category page CMS mock — Admin/AI editable shape (frontend-only until CMS live).
 * Filter schemas are per-category (AI decides later); never a global hardcoded set.
 */

import { L, type LocalizedString } from "../i18n/locales"
import { findMarketplaceCategory } from "../marketplace-categories"
import { manufacturerLogoSrc } from "../product-mockup"
import type { CmsPublishMeta } from "./publish"

export type CategoryAiHooks = {
  /** How content was produced — AI pipeline fills offline. */
  contentSource: "cms" | "ai-generated" | "hybrid"
  /** ISO timestamp of last AI generation (null = not generated). */
  lastGeneratedAt?: string | null
  /** Prompt/template version for reproducible regeneration. */
  generationPromptVersion?: string | null
  generatedBy?: string | null
  generationStatus?:
    | "pending"
    | "generating"
    | "ready"
    | "failed"
    | "stale"
    | null
  published?: boolean
  /** Hook ids AI services may call (prebuilt, no runtime AI on page load). */
  hooks: {
    generateIntro: boolean
    generateFaq: boolean
    generateSeo: boolean
    generateBuyGuide: boolean
    generateTranslations: boolean
    suggestFilters: boolean
    suggestRelatedCategories: boolean
    suggestRelatedBrands: boolean
    suggestRelatedProducers: boolean
    suggestInternalLinks: boolean
    suggestDynamicBlocks: boolean
  }
}

export type CategoryBannerPriority = "paid" | "campaign" | "default"

export type CategoryBannerCms = CmsPublishMeta & {
  id: string
  priority: CategoryBannerPriority
  title: LocalizedString
  subtitle: LocalizedString
  ctaLabel: LocalizedString
  destinationUrl: string
  linkType: "product" | "category" | "partner" | "collection" | "external"
  image?: string | null
  imageAlt: LocalizedString
  background: string
  /** Partner / manufacturer logo (CMS). */
  logo?: string | null
  /** Optional production country label beside product visual. */
  productionCountry?: LocalizedString | null
  /** Show small Verified™ badge on banner (CMS toggle). */
  showVerifiedBadge?: boolean
  activeFrom?: string | null
  activeTo?: string | null
  presentation?: {
    fit?: "cover" | "contain"
    positionX?: number
    positionY?: number
    scale?: number
    textColor?: "white" | "black"
    buttonColor?: "white" | "black"
  } | null
}

export type CategoryFilterControlCms = {
  attributeKey: string
  visible: boolean
  label: LocalizedString
  sortOrder: number
}

export type CategoryFilterOptionCms = {
  id: string
  label: LocalizedString
  /** Match value against product attributes/keywords until Product Cloud facets exist. */
  value: string
  sortOrder: number
  visible: boolean
}

export type CategoryFilterGroupCms = CmsPublishMeta & {
  id: string
  /** Stable attribute key — AI/Product Cloud facet id later. */
  attributeKey: string
  label: LocalizedString
  type: "checkbox" | "boolean" | "range"
  options: CategoryFilterOptionCms[]
}

export type CategoryCountryCms = CmsPublishMeta & {
  id: string
  countryCode: string
  label: LocalizedString
}

export type CategoryFaqCms = CmsPublishMeta & {
  id: string
  question: LocalizedString
  answer: LocalizedString
}

export type CategoryUspCms = {
  id: string
  title: LocalizedString
  body: LocalizedString
}

export type CategoryDynamicBlockKey =
  | "popular_brands"
  | "new_producers"
  | "most_sustainable"
  | "made_in_country"
  | "best_rated"
  | "biggest_discount"

export type CategoryDynamicBlockCms = CmsPublishMeta & {
  id: string
  key: CategoryDynamicBlockKey
  title: LocalizedString
  subtitle: LocalizedString
  /** Optional country code for made_in_country blocks. */
  countryCode?: string | null
  image?: string | null
}

export type CategorySeoCms = {
  title: LocalizedString
  metaDescription: LocalizedString
  h1: LocalizedString
  intro: LocalizedString
  /** JSON-LD type hint for CollectionPage / FAQPage. */
  structuredDataType: "CollectionPage"
}

export type CategoryCmsDocument = CmsPublishMeta & {
  id: string
  slug: string
  title: LocalizedString
  seo: CategorySeoCms
  /** Stats shown in hero — precomputed offline / CMS; AI can refresh later. */
  stats: {
    productCount: number
    producerCount: number
    retailerCount: number
    productionCountryCount: number
  }
  banners: CategoryBannerCms[]
  filterGroups: CategoryFilterGroupCms[]
  filterControls?: CategoryFilterControlCms[]
  countries: CategoryCountryCms[]
  relatedCategorySlugs: string[]
  faq: CategoryFaqCms[]
  usps?: CategoryUspCms[]
  dynamicBlocks: CategoryDynamicBlockCms[]
  /** Hide category from nav/index when product count below threshold (architecture). */
  hideWhenProductCountBelow?: number | null
  /** CMS presentation for Product Cloud listing (not product data). */
  listingPresentation?: {
    title: LocalizedString
    sort: "relevance" | "newest" | "price_asc" | "price_desc"
    limit: number
  }
  ai: CategoryAiHooks
}

const DEFAULT_AI: CategoryAiHooks = {
  contentSource: "cms",
  lastGeneratedAt: null,
  generationPromptVersion: "category-content-v4",
  generatedBy: null,
  generationStatus: "pending",
  published: false,
  hooks: {
    generateIntro: true,
    generateFaq: true,
    generateSeo: true,
    generateBuyGuide: true,
    generateTranslations: true,
    suggestFilters: true,
    suggestRelatedCategories: true,
    suggestRelatedBrands: true,
    suggestRelatedProducers: true,
    suggestInternalLinks: true,
    suggestDynamicBlocks: true,
  },
}

const DEFAULT_COUNTRIES: CategoryCountryCms[] = [
  {
    id: "c_nl",
    countryCode: "NL",
    label: L("Nederland", "Netherlands", "Niederlande", "Pays-Bas"),
    visible: true,
    sortOrder: 10,
  },
  {
    id: "c_de",
    countryCode: "DE",
    label: L("Duitsland", "Germany", "Deutschland", "Allemagne"),
    visible: true,
    sortOrder: 20,
  },
  {
    id: "c_fr",
    countryCode: "FR",
    label: L("Frankrijk", "France", "Frankreich", "France"),
    visible: true,
    sortOrder: 30,
  },
  {
    id: "c_be",
    countryCode: "BE",
    label: L("België", "Belgium", "Belgien", "Belgique"),
    visible: true,
    sortOrder: 40,
  },
  {
    id: "c_it",
    countryCode: "IT",
    label: L("Italië", "Italy", "Italien", "Italie"),
    visible: true,
    sortOrder: 50,
  },
  {
    id: "c_es",
    countryCode: "ES",
    label: L("Spanje", "Spain", "Spanien", "Espagne"),
    visible: true,
    sortOrder: 60,
  },
]

function defaultBanner(slug: string, label: LocalizedString): CategoryBannerCms {
  return {
    id: `ban_default_${slug}`,
    priority: "default",
    visible: true,
    sortOrder: 100,
    publishAt: null,
    expiresAt: null,
    activeFrom: null,
    activeTo: null,
    title: L(
      `Ontdek ${pickNl(label)}`,
      `Discover ${pickEn(label)}`,
      `Entdecken Sie ${pickDe(label)}`,
      `Découvrez ${pickFr(label)}`
    ),
    subtitle: L(
      "Europese makers en officiële retailers — Verified™ waar beschikbaar.",
      "European makers and official retailers — Verified™ where available.",
      "Europäische Hersteller und offizielle Händler — Verified™ wo verfügbar.",
      "Fabricants européens et détaillants officiels — Verified™ si disponible."
    ),
    ctaLabel: L("Bekijk aanbod", "Browse offers", "Angebot ansehen", "Voir l’offre"),
    destinationUrl: `/categorie/${slug}`,
    linkType: "category",
    image: null,
    imageAlt: label,
    background:
      "linear-gradient(135deg, #f5f6f8 0%, #e8ebf0 50%, #dde3ea 100%)",
    logo: manufacturerLogoSrc("verdetech"),
    productionCountry: L("Duitsland", "Germany", "Deutschland", "Allemagne"),
    showVerifiedBadge: true,
  }
}

/** Editorial product-count hints for related category cards (CMS/AI later). */
export const RELATED_CATEGORY_COUNT_HINTS: Record<string, number> = {
  verlichting: 324,
  huishouden: 842,
  kantoor: 218,
  outdoor: 412,
  "plant-bloem": 186,
  "klus-gereedschap": 290,
  "tassen-accessoires": 156,
  "juwelen-horloges": 98,
  keuken: 540,
  slaapkamer: 210,
  mode: 620,
  schoenen: 380,
  sport: 275,
  wonen: 468,
  voeding: 312,
  duurzaam: 144,
  cadeaus: 198,
  elektronica: 710,
  tuin: 390,
}

function pickNl(l: LocalizedString) {
  return l.nl
}
function pickEn(l: LocalizedString) {
  return l.en
}
function pickDe(l: LocalizedString) {
  return l.de
}
function pickFr(l: LocalizedString) {
  return l.fr
}

/** Example AI/CMS filter schemas — per category, never global. */
function opt(
  id: string,
  label: LocalizedString,
  value: string,
  sortOrder: number
): CategoryFilterOptionCms {
  return { id, label, value, sortOrder, visible: true }
}

function group(
  id: string,
  attributeKey: string,
  label: LocalizedString,
  sortOrder: number,
  options: CategoryFilterOptionCms[]
): CategoryFilterGroupCms {
  return {
    id,
    attributeKey,
    label,
    type: "checkbox",
    visible: true,
    sortOrder,
    options,
  }
}

const ELECTRONICA_FILTERS: CategoryFilterGroupCms[] = [
  group("fg_brand", "brand", L("Merk", "Brand", "Marke", "Marque"), 10, [
    opt("brand_a", L("VerdeTech", "VerdeTech", "VerdeTech", "VerdeTech"), "verdetech", 10),
    opt("brand_b", L("Nordic Audio", "Nordic Audio", "Nordic Audio", "Nordic Audio"), "nordic", 20),
  ]),
  group("fg_type", "product_type", L("Producttype", "Product type", "Produkttyp", "Type de produit"), 20, [
    opt("type_headphones", L("Koptelefoons", "Headphones", "Kopfhörer", "Casques"), "koptelefoon", 10),
    opt("type_laptop", L("Laptops", "Laptops", "Laptops", "Ordinateurs portables"), "laptop", 20),
    opt("type_lamp", L("Verlichting", "Lighting", "Beleuchtung", "Éclairage"), "lamp", 30),
  ]),
  group("fg_wireless", "wireless", L("Draadloos", "Wireless", "Kabellos", "Sans fil"), 30, [
    opt("wireless_yes", L("Ja", "Yes", "Ja", "Oui"), "draadloos", 10),
  ]),
  group("fg_bt", "bluetooth", L("Bluetooth", "Bluetooth", "Bluetooth", "Bluetooth"), 40, [
    opt("bt_yes", L("Bluetooth", "Bluetooth", "Bluetooth", "Bluetooth"), "bluetooth", 10),
  ]),
  group("fg_usbc", "usb_c", L("USB-C", "USB-C", "USB-C", "USB-C"), 50, [
    opt("usbc_yes", L("USB-C", "USB-C", "USB-C", "USB-C"), "usb-c", 10),
  ]),
  group("fg_energy", "energy_class", L("Energieklasse", "Energy class", "Energieklasse", "Classe énergétique"), 60, [
    opt("energy_a", L("A", "A", "A", "A"), "energie A", 10),
    opt("energy_b", L("B", "B", "B", "B"), "energie B", 20),
  ]),
  group("fg_color", "color", L("Kleur", "Color", "Farbe", "Couleur"), 70, [
    opt("color_black", L("Zwart", "Black", "Schwarz", "Noir"), "zwart", 10),
    opt("color_silver", L("Zilver", "Silver", "Silber", "Argent"), "zilver", 20),
  ]),
  group("fg_price", "price_band", L("Prijs", "Price", "Preis", "Prix"), 80, [
    opt("price_0_100", L("Tot €100", "Up to €100", "Bis €100", "Jusqu’à €100"), "€", 10),
    opt("price_100_300", L("€100 – €300", "€100 – €300", "€100 – €300", "€100 – €300"), "€", 20),
  ]),
]

const WONEN_FILTERS: CategoryFilterGroupCms[] = [
  group("fg_mat", "material", L("Materiaal", "Material", "Material", "Matière"), 10, [
    opt("mat_wood", L("Hout", "Wood", "Holz", "Bois"), "hout", 10),
    opt("mat_metal", L("Metaal", "Metal", "Metall", "Métal"), "metaal", 20),
    opt("mat_textile", L("Textiel", "Textile", "Textil", "Textile"), "textiel", 30),
  ]),
  group("fg_color_w", "color", L("Kleur", "Color", "Farbe", "Couleur"), 20, [
    opt("c_beige", L("Beige", "Beige", "Beige", "Beige"), "beige", 10),
    opt("c_white", L("Wit", "White", "Weiß", "Blanc"), "wit", 20),
  ]),
  group("fg_brand_w", "brand", L("Merk", "Brand", "Marke", "Marque"), 30, [
    opt("brand_atelier", L("Atelier Rossi", "Atelier Rossi", "Atelier Rossi", "Atelier Rossi"), "atelier", 10),
  ]),
  group("fg_inout", "indoor_outdoor", L("Binnen/Buiten", "Indoor/Outdoor", "Innen/Außen", "Intérieur/Extérieur"), 40, [
    opt("indoor", L("Binnen", "Indoor", "Innen", "Intérieur"), "binnen", 10),
    opt("outdoor", L("Buiten", "Outdoor", "Außen", "Extérieur"), "buiten", 20),
  ]),
  group("fg_price_w", "price_band", L("Prijs", "Price", "Preis", "Prix"), 50, [
    opt("pw_low", L("Tot €100", "Up to €100", "Bis €100", "Jusqu’à €100"), "€", 10),
    opt("pw_mid", L("€100 – €300", "€100 – €300", "€100 – €300", "€100 – €300"), "€", 20),
  ]),
]

const MODE_FILTERS: CategoryFilterGroupCms[] = [
  group("fg_size_m", "size", L("Maat", "Size", "Größe", "Taille"), 10, [
    opt("s_s", L("S", "S", "S", "S"), "s", 10),
    opt("s_m", L("M", "M", "M", "M"), "m", 20),
    opt("s_l", L("L", "L", "L", "L"), "l", 30),
  ]),
  group("fg_color_m", "color", L("Kleur", "Color", "Farbe", "Couleur"), 20, [
    opt("cm_navy", L("Navy", "Navy", "Navy", "Navy"), "navy", 10),
    opt("cm_black", L("Zwart", "Black", "Schwarz", "Noir"), "zwart", 20),
  ]),
  group("fg_mat_m", "material", L("Materiaal", "Material", "Material", "Matière"), 30, [
    opt("mm_wool", L("Wol", "Wool", "Wolle", "Laine"), "wol", 10),
    opt("mm_cotton", L("Katoen", "Cotton", "Baumwolle", "Coton"), "katoen", 20),
  ]),
  group("fg_gender", "gender", L("Geslacht", "Gender", "Geschlecht", "Genre"), 40, [
    opt("g_uni", L("Unisex", "Unisex", "Unisex", "Unisexe"), "unisex", 10),
    opt("g_women", L("Dames", "Women", "Damen", "Femmes"), "dames", 20),
    opt("g_men", L("Heren", "Men", "Herren", "Hommes"), "heren", 30),
  ]),
  group("fg_brand_m", "brand", L("Merk", "Brand", "Marke", "Marque"), 50, [
    opt("bm_wolf", L("Wolfabriek B.", "Wolfabriek B.", "Wolfabriek B.", "Wolfabriek B."), "wolf", 10),
  ]),
]

const VOEDING_FILTERS: CategoryFilterGroupCms[] = [
  group("fg_bio", "organic", L("Biologisch", "Organic", "Bio", "Bio"), 10, [
    opt("bio_yes", L("Biologisch", "Organic", "Bio", "Bio"), "biologisch", 10),
  ]),
  group("fg_vegan", "vegan", L("Vegan", "Vegan", "Vegan", "Végan"), 20, [
    opt("vegan_yes", L("Vegan", "Vegan", "Vegan", "Végan"), "vegan", 10),
  ]),
  group("fg_gf", "gluten_free", L("Glutenvrij", "Gluten-free", "Glutenfrei", "Sans gluten"), 30, [
    opt("gf_yes", L("Glutenvrij", "Gluten-free", "Glutenfrei", "Sans gluten"), "glutenvrij", 10),
  ]),
  group("fg_origin", "origin_country", L("Land van productie", "Country of origin", "Herkunftsland", "Pays d’origine"), 40, [
    opt("o_it", L("Italië", "Italy", "Italien", "Italie"), "IT", 10),
    opt("o_fr", L("Frankrijk", "France", "Frankreich", "France"), "FR", 20),
    opt("o_nl", L("Nederland", "Netherlands", "Niederlande", "Pays-Bas"), "NL", 30),
  ]),
  group("fg_brand_f", "brand", L("Merk", "Brand", "Marke", "Marque"), 50, [
    opt("bf_local", L("Lokale makers", "Local makers", "Lokale Hersteller", "Producteurs locaux"), "lokaal", 10),
  ]),
]

const TUIN_FILTERS: CategoryFilterGroupCms[] = [
  group("fg_type_t", "type", L("Type", "Type", "Typ", "Type"), 10, [
    opt("tt_tool", L("Gereedschap", "Tools", "Werkzeug", "Outils"), "gereedschap", 10),
    opt("tt_furniture", L("Tuinmeubels", "Garden furniture", "Gartenmöbel", "Mobilier de jardin"), "meubel", 20),
    opt("tt_mower", L("Maaiers", "Mowers", "Mäher", "Tondeuses"), "maaier", 30),
  ]),
  group("fg_mat_t", "material", L("Materiaal", "Material", "Material", "Matière"), 20, [
    opt("mt_wood", L("Hout", "Wood", "Holz", "Bois"), "hout", 10),
    opt("mt_metal", L("Metaal", "Metal", "Metall", "Métal"), "metaal", 20),
  ]),
  group("fg_electric", "electric", L("Elektrisch", "Electric", "Elektrisch", "Électrique"), 30, [
    opt("el_yes", L("Elektrisch", "Electric", "Elektrisch", "Électrique"), "elektrisch", 10),
  ]),
  group("fg_battery", "battery", L("Accu", "Battery", "Akku", "Batterie"), 40, [
    opt("bat_yes", L("Accu", "Battery", "Akku", "Batterie"), "accu", 10),
  ]),
  group("fg_brand_t", "brand", L("Merk", "Brand", "Marke", "Marque"), 50, [
    opt("bt_verde", L("VerdeTech", "VerdeTech", "VerdeTech", "VerdeTech"), "verdetech", 10),
  ]),
]

const SCHOENEN_FILTERS: CategoryFilterGroupCms[] = [
  group("fg_size", "size", L("Maat", "Size", "Größe", "Pointure"), 10, [
    opt("size_40", L("40", "40", "40", "40"), "40", 10),
    opt("size_42", L("42", "42", "42", "42"), "42", 20),
    opt("size_44", L("44", "44", "44", "44"), "44", 30),
  ]),
  group("fg_material", "material", L("Materiaal", "Material", "Material", "Matière"), 20, [
    opt("mat_leather", L("Leer", "Leather", "Leder", "Cuir"), "leer", 10),
    opt("mat_textile", L("Textiel", "Textile", "Textil", "Textile"), "textiel", 20),
  ]),
]

function buildCategoryDoc(input: {
  slug: string
  title: LocalizedString
  related: string[]
  filterGroups?: CategoryFilterGroupCms[]
  paidBanner?: boolean
}): CategoryCmsDocument {
  const { slug, title, related, filterGroups = [], paidBanner } = input
  const banners: CategoryBannerCms[] = []
  if (paidBanner) {
    banners.push({
      id: `ban_paid_${slug}`,
      priority: "paid",
      visible: true,
      sortOrder: 10,
      publishAt: "2025-01-01T00:00:00.000Z",
      expiresAt: null,
      activeFrom: "2025-01-01T00:00:00.000Z",
      activeTo: null,
      title: L(
        "Partner spotlight in deze categorie",
        "Partner spotlight in this category",
        "Partner-Spotlight in dieser Kategorie",
        "Coup de projecteur dans cette catégorie"
      ),
      subtitle: L(
        "Premium Europese makers — vergelijk Verified™ aanbieders.",
        "Premium European makers — compare Verified™ sellers.",
        "Premium europäische Hersteller — vergleichen Sie Verified™-Anbieter.",
        "Fabricants européens premium — comparez les vendeurs Verified™."
      ),
      ctaLabel: L("Bekijk campagne", "View campaign", "Kampagne ansehen", "Voir la campagne"),
      destinationUrl: `/categorie/${slug}`,
      linkType: "category",
      image: null,
      imageAlt: title,
      background:
        "linear-gradient(135deg, #f3f6fb 0%, #e4ebf6 45%, #d4e0f0 100%)",
      logo: manufacturerLogoSrc("verdetech"),
      productionCountry: L("Nederland", "Netherlands", "Niederlande", "Pays-Bas"),
      showVerifiedBadge: true,
    })
  }
  banners.push({
    id: `ban_campaign_${slug}`,
    priority: "campaign",
    visible: true,
    sortOrder: 50,
    publishAt: null,
    expiresAt: null,
    title: L(
      "EuropMade campagne",
      "EuropMade campaign",
      "EuropMade-Kampagne",
      "Campagne EuropMade"
    ),
    subtitle: L(
      "Seizoensselectie van Europese producten in deze categorie.",
      "Seasonal selection of European products in this category.",
      "Saisonale Auswahl europäischer Produkte in dieser Kategorie.",
      "Sélection saisonnière de produits européens dans cette catégorie."
    ),
    ctaLabel: L("Ontdek meer", "Discover more", "Mehr entdecken", "En savoir plus"),
    destinationUrl: `/categorie/${slug}`,
    linkType: "collection",
    image: null,
    imageAlt: title,
    background:
      "linear-gradient(135deg, #f4f7f2 0%, #e6efe4 45%, #d8e8d6 100%)",
    logo: manufacturerLogoSrc("atelier"),
    productionCountry: L("Italië", "Italy", "Italien", "Italie"),
    showVerifiedBadge: true,
  })
  banners.push(defaultBanner(slug, title))

  return {
    id: `cat_${slug}`,
    slug,
    visible: true,
    sortOrder: 0,
    publishAt: null,
    expiresAt: null,
    hideWhenProductCountBelow: null,
    title,
    seo: {
      title: L(
        `${pickNl(title)} kopen | EuropMade`,
        `Buy ${pickEn(title)} | EuropMade`,
        `${pickDe(title)} kaufen | EuropMade`,
        `Acheter ${pickFr(title)} | EuropMade`
      ),
      metaDescription: L(
        `Koop ${pickNl(title)} van Europese producenten en officiële retailers op EuropMade. Vergelijk Verified™ aanbiedingen.`,
        `Shop ${pickEn(title)} from European producers and official retailers on EuropMade. Compare Verified™ offers.`,
        `Kaufen Sie ${pickDe(title)} von europäischen Produzenten und offiziellen Händlern auf EuropMade.`,
        `Achetez ${pickFr(title)} auprès de producteurs européens et détaillants officiels sur EuropMade.`
      ),
      h1: title,
      intro: L(
        `Ontdek ${pickNl(title)} met Europese herkomst. Vergelijk producenten en retailers, kies Verified™ waar beschikbaar, en houd waarde binnen Europa.`,
        `Discover ${pickEn(title)} with European origin. Compare producers and retailers, choose Verified™ where available, and keep value in Europe.`,
        `Entdecken Sie ${pickDe(title)} mit europäischer Herkunft. Vergleichen Sie Produzenten und Händler und wählen Sie Verified™ wo verfügbar.`,
        `Découvrez ${pickFr(title)} d’origine européenne. Comparez producteurs et détaillants, choisissez Verified™ si disponible.`
      ),
      structuredDataType: "CollectionPage",
    },
    stats: {
      productCount: 0,
      producerCount: 0,
      retailerCount: 0,
      productionCountryCount: 0,
    },
    banners,
    filterGroups,
    countries: DEFAULT_COUNTRIES,
    relatedCategorySlugs: related,
    faq: [
      {
        id: `faq_1_${slug}`,
        visible: true,
        sortOrder: 10,
        question: L(
          `Wat betekent Verified™ bij ${pickNl(title)}?`,
          `What does Verified™ mean for ${pickEn(title)}?`,
          `Was bedeutet Verified™ bei ${pickDe(title)}?`,
          `Que signifie Verified™ pour ${pickFr(title)} ?`
        ),
        answer: L(
          "Verified™ betekent dat productinformatie en herkomst zijn gecontroleerd volgens EuropMade-criteria.",
          "Verified™ means product information and origin are checked against EuropMade criteria.",
          "Verified™ bedeutet, dass Produktinformationen und Herkunft nach EuropMade-Kriterien geprüft wurden.",
          "Verified™ signifie que les informations produit et l’origine sont contrôlées selon les critères EuropMade."
        ),
      },
      {
        id: `faq_2_${slug}`,
        visible: true,
        sortOrder: 20,
        question: L(
          "Kan ik meerdere aanbieders vergelijken?",
          "Can I compare multiple sellers?",
          "Kann ich mehrere Anbieter vergleichen?",
          "Puis-je comparer plusieurs vendeurs ?"
        ),
        answer: L(
          "Ja. Op de productpagina zie je alle officiële aanbieders en kies je de beste totale aanbieding.",
          "Yes. On the product page you see all official sellers and choose the best total offer.",
          "Ja. Auf der Produktseite sehen Sie alle offiziellen Anbieter und wählen das beste Gesamtangebot.",
          "Oui. Sur la page produit, vous voyez tous les vendeurs officiels et choisissez la meilleure offre totale."
        ),
      },
    ],
    dynamicBlocks: [
      {
        id: `db_rated_${slug}`,
        key: "best_rated",
        visible: true,
        sortOrder: 10,
        title: L(
          "Best beoordeeld",
          "Best rated",
          "Am besten bewertet",
          "Mieux notés"
        ),
        subtitle: L(
          "Hoogste klantbeoordelingen in deze categorie.",
          "Highest customer ratings in this category.",
          "Höchste Kundenbewertungen in dieser Kategorie.",
          "Meilleures notes clients dans cette catégorie."
        ),
      },
      {
        id: `db_discount_${slug}`,
        key: "biggest_discount",
        visible: false,
        sortOrder: 20,
        title: L(
          "Meeste korting",
          "Biggest discounts",
          "Größte Rabatte",
          "Plus grandes remises"
        ),
        subtitle: L("", "", "", ""),
      },
    ],
    ai: DEFAULT_AI,
  }
}

/**
 * CMS registry — filter schemas are per-category mockdata (AI/CMS fills later).
 */
export const CATEGORY_CMS_BY_SLUG: Record<string, CategoryCmsDocument> = {
  tuin: buildCategoryDoc({
    slug: "tuin",
    title: L("Tuin", "Garden", "Garten", "Jardin"),
    related: ["outdoor", "plant-bloem", "klus-gereedschap"],
    filterGroups: TUIN_FILTERS,
    paidBanner: true,
  }),
  elektronica: buildCategoryDoc({
    slug: "elektronica",
    title: L("Elektronica", "Electronics", "Elektronik", "Électronique"),
    related: ["kantoor", "verlichting", "huishouden"],
    filterGroups: ELECTRONICA_FILTERS,
    paidBanner: true,
  }),
  mode: buildCategoryDoc({
    slug: "mode",
    title: L("Mode", "Fashion", "Mode", "Mode"),
    related: ["schoenen", "tassen-accessoires", "juwelen-horloges"],
    filterGroups: MODE_FILTERS,
  }),
  wonen: buildCategoryDoc({
    slug: "wonen",
    title: L("Wonen", "Home", "Wohnen", "Maison"),
    related: ["keuken", "verlichting", "slaapkamer"],
    filterGroups: WONEN_FILTERS,
  }),
  sport: buildCategoryDoc({
    slug: "sport",
    title: L("Sport", "Sports", "Sport", "Sport"),
    related: ["outdoor", "mode", "schoenen"],
  }),
  voeding: buildCategoryDoc({
    slug: "voeding",
    title: L("Voeding", "Food", "Lebensmittel", "Alimentation"),
    related: ["keuken", "duurzaam", "cadeaus"],
    filterGroups: VOEDING_FILTERS,
  }),
  keuken: buildCategoryDoc({
    slug: "keuken",
    title: L("Keuken", "Kitchen", "Küche", "Cuisine"),
    related: ["wonen", "voeding", "huishouden"],
  }),
  schoenen: buildCategoryDoc({
    slug: "schoenen",
    title: L("Schoenen", "Shoes", "Schuhe", "Chaussures"),
    related: ["mode", "sport", "tassen-accessoires"],
    filterGroups: SCHOENEN_FILTERS,
  }),
}

/** Fallback CMS document for any taxonomy slug not explicitly overridden. */
export function getCategoryCmsDocument(slug: string): CategoryCmsDocument {
  if (CATEGORY_CMS_BY_SLUG[slug]) return CATEGORY_CMS_BY_SLUG[slug]!
  const cat = findMarketplaceCategory(slug)
  const label = cat?.label ?? slug
  return buildCategoryDoc({
    slug,
    title: L(label, label, label, label),
    related: [],
  })
}
