import { getStorefrontLocaleFromCookies } from "../../_lib/i18n/get-storefront-locale"
import type { StorefrontLocale } from "../../_lib/i18n/locales"
import { getStorefrontMarketFromRequest } from "../../_lib/i18n/get-storefront-market"
import { fetchStoreCmsHomepage } from "../../_lib/cms/fetch-store-cms"
import { resolveHomepageCms } from "../../_lib/cms/resolve-homepage"
import { HOMEPAGE_CMS_MOCK } from "../../_lib/cms/homepage-cms"
import { resolveListingProducts } from "../../_lib/storefront-catalog"
import type { EuMarketCode } from "@europmade/types"
import {
  catalogDestinationFromHref,
  commercialBannerAllowed,
  parseBrandCardPresentation,
  parseCmsTheme,
} from "@europmade/utils"
import { HomepageView } from "./homepage-view"
import {
  mapApiBanners,
  resolveHomepageBannerOverrides,
} from "./homepage-shared"
import { mergePaidHomepageBanners } from "../../_lib/cms/merge-paid-banners"
import { fetchAdPreview, fetchLiveAdSlots } from "../../_lib/advertising-live-slots"
import { fetchStoreCmsTheme } from "../../_lib/cms/fetch-store-theme"
import { pickHomepageRailProducts } from "../../_lib/cms/homepage-product-rails"
import { mergeHomepageBrandSpotlights } from "../../_lib/homepage-brand-spotlights"
import { fetchStorefrontCategories } from "../../_lib/product-cloud-store"
import { bindHomepageCategoriesToProductCloud } from "../../_lib/cms/bind-homepage-categories"
import { getCatalogBrand, getCatalogProduct } from "../../_lib/catalog-api"
import type { StorefrontAdCreative } from "../../_lib/storefront-ads"
import type { ResolvedPartnerSpotlight } from "../../_lib/cms/resolve-homepage"

export async function Homepage({
  marketOverride,
  adPreviewId,
}: {
  marketOverride?: EuMarketCode | null
  adPreviewId?: string | null
} = {}) {
  const locale = await getStorefrontLocaleFromCookies()
  const market = marketOverride ?? (await getStorefrontMarketFromRequest())
  const remote = await fetchStoreCmsHomepage(market)
  const paid = await fetchLiveAdSlots("homepage", market)
  const themeRow = await fetchStoreCmsTheme()

  const cmsPublished = Boolean(
    remote?.homepage?.published && remote.homepage.document
  )
  const document = cmsPublished
    ? remote!.homepage!.document
    : HOMEPAGE_CMS_MOCK

  const libraryBanners =
    cmsPublished && remote?.banners != null
      ? mapApiBanners(remote.banners)
      : []

  const bannerOverrides = cmsPublished
    ? resolveHomepageBannerOverrides({
        documentBanners: document.banners,
        libraryBanners,
      })
    : null

  const cms = resolveHomepageCms(locale, document, new Date(), {
    visitorMarket: market,
    bannerOverrides,
    seo: remote?.homepage
      ? {
          title: remote.homepage.seo_title,
          description: remote.homepage.seo_description,
          canonical: remote.homepage.seo_canonical,
          ogTitle: remote.homepage.og_title,
          ogDescription: remote.homepage.og_description,
        }
      : undefined,
  })
  cms.banners = mergePaidHomepageBanners(cms.banners, paid, locale)
  let adPreviewNotice: string | null = null
  if (adPreviewId) {
    const preview = await fetchAdPreview(adPreviewId, "homepage", market)
    if (preview.slot) {
      cms.banners = mergePaidHomepageBanners(cms.banners, [preview.slot], locale)
      adPreviewNotice = preview.publicNow
        ? "Preview. Deze goedgekeurde banner is op dit moment ook publiek zichtbaar. De boeking is niet gewijzigd."
        : "Preview. Dit is geen publieke zichtbaarheid en wijzigt de boeking, de periode en de betaling niet."
    } else {
      adPreviewNotice =
        "Preview niet beschikbaar. Een banner die niet is goedgekeurd wordt niet getoond."
    }
  }

  const pcCategories = await fetchStorefrontCategories(locale)
  cms.categories = bindHomepageCategoriesToProductCloud(
    cms.categories,
    pcCategories
  )

  const { products } = await resolveListingProducts({ locale, market })
  cms.banners = await bannersForMarket(cms.banners, market, locale)
  const pool = products
  const featuredSection = cms.sections.featured
  const newestSection = cms.sections.newest
  const bestSection = cms.sections.best_sellers

  const featuredProducts = pickHomepageRailProducts(pool, featuredSection, "offers", 12)
  const newest = pickHomepageRailProducts(pool, newestSection, "newest", 12)
  const bestSold = pickHomepageRailProducts(pool, bestSection, "offers", 12)
  const catalogBrands: ResolvedPartnerSpotlight[] = []
  for (const row of cms.partners.items) {
    const slug = row.slug?.trim()
    if (!slug) continue
    try {
      const page = await getCatalogBrand(slug, { locale })
      const brand = page.brand
      catalogBrands.push({
        slug,
        name: brand.name || "",
        country: "",
        rating: 0,
        productCount: 0,
        description: (brand.market_intro || brand.intro || "").trim(),
        image: brand.hero_image_url || brand.story_image_url || null,
        logo: brand.logo_url || null,
        ...parseBrandCardPresentation({}),
        backgroundKey: "light" as const,
      })
    } catch {
      // The CMS card stays, without catalog images.
    }
  }
  cms.partners.items = mergeHomepageBrandSpotlights(
    cms.partners.items,
    catalogBrands,
    12
  )

  const theme = themeRow?.theme?.published
    ? parseCmsTheme(themeRow.theme.document)
    : null

  return (
    <HomepageView
      cms={cms}
      featuredProducts={featuredProducts}
      newest={newest}
      bestSold={bestSold}
      locale={locale}
      adPreviewNotice={adPreviewNotice}
      preview={
        theme
          ? {
              selectedId: "",
              interactive: false,
              honestEmpty: false,
              theme,
            }
          : undefined
      }
    />
  )
}

async function bannersForMarket(
  banners: StorefrontAdCreative[],
  market: EuMarketCode,
  locale: StorefrontLocale
): Promise<StorefrontAdCreative[]> {
  const visible: StorefrontAdCreative[] = []
  for (const banner of banners) {
    if (banner.previewOnly) {
      visible.push(banner)
      continue
    }
    const destination = catalogDestinationFromHref(banner.href)
    let orderableCount: number | null = null
    const productIds = banner.productIds ?? []
    if (productIds.length > 0) {
      const listed = await resolveListingProducts({
        ids: productIds,
        market,
        locale,
        limit: productIds.length,
      })
      orderableCount = listed.products.length
    } else if (destination.kind === "product") {
      try {
        const detail = await getCatalogProduct(destination.id, market, {
          cache: "no-store",
        })
        const inStock = detail.offers.some(
          (offer) => Number(offer.quantity_available) > 0
        )
        orderableCount = detail.availability === "orderable" || inStock ? 1 : 0
      } catch {
        orderableCount = 0
      }
    } else if (destination.kind === "category") {
      const listed = await resolveListingProducts({
        categorySlug: destination.slug,
        market,
        locale,
        limit: 1,
      })
      orderableCount = listed.products.length
    }
    if (
      commercialBannerAllowed({
        informative: destination.kind === "informational",
        orderableCount,
      })
    ) {
      visible.push(banner)
    }
  }
  return visible
}
