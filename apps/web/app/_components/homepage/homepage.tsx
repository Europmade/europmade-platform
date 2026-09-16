import { getStorefrontLocaleFromCookies } from "../../_lib/i18n/get-storefront-locale"
import { getStorefrontMarketFromRequest } from "../../_lib/i18n/get-storefront-market"
import { fetchStoreCmsHomepage } from "../../_lib/cms/fetch-store-cms"
import { resolveHomepageCms } from "../../_lib/cms/resolve-homepage"
import { HOMEPAGE_CMS_MOCK } from "../../_lib/cms/homepage-cms"
import { resolveListingProducts } from "../../_lib/storefront-catalog"
import type { EuMarketCode } from "@europmade/types"
import { parseCmsTheme } from "@europmade/utils"
import { HomepageView } from "./homepage-view"
import {
  mapApiBanners,
  resolveHomepageBannerOverrides,
} from "./homepage-shared"
import { mergePaidHomepageBanners } from "../../_lib/cms/merge-paid-banners"
import { fetchLiveAdSlots } from "../../_lib/advertising-live-slots"
import { fetchStoreCmsTheme } from "../../_lib/cms/fetch-store-theme"
import { pickHomepageRailProducts } from "../../_lib/cms/homepage-product-rails"
import {
  liveBrandSpotlightsFromProducts,
  mergeHomepageBrandSpotlights,
} from "../../_lib/homepage-brand-spotlights"
import { fetchStorefrontCategories } from "../../_lib/product-cloud-store"
import { bindHomepageCategoriesToProductCloud } from "../../_lib/cms/bind-homepage-categories"
import { listCatalogPublishedBrands } from "../../_lib/catalog-api"

export async function Homepage({
  marketOverride,
}: {
  marketOverride?: EuMarketCode | null
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

  const pcCategories = await fetchStorefrontCategories(locale)
  cms.categories = bindHomepageCategoriesToProductCloud(
    cms.categories,
    pcCategories
  )

  const { products } = await resolveListingProducts({ locale })
  const pool = products
  const featuredSection = cms.sections.featured
  const newestSection = cms.sections.newest
  const bestSection = cms.sections.best_sellers

  const featuredProducts = pickHomepageRailProducts(
    pool,
    featuredSection,
    "offers",
    12
  )
  const newest = pickHomepageRailProducts(pool, newestSection, "newest", 12)
  const bestSold = pickHomepageRailProducts(pool, bestSection, "offers", 12)
  cms.partners.items = mergeHomepageBrandSpotlights(
    cms.partners.items,
    liveBrandSpotlightsFromProducts(pool, 8),
    6
  )
  try {
    const published = await listCatalogPublishedBrands()
    const slugs = new Set(published.brands.map((b) => b.slug))
    cms.partners.items = cms.partners.items.filter((row) => slugs.has(row.slug))
  } catch {
    cms.partners.items = []
  }

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
