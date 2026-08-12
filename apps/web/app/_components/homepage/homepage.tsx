import { getStorefrontLocaleFromCookies } from "../../_lib/i18n/get-storefront-locale"
import { resolveHomepageCms } from "../../_lib/cms/resolve-homepage"
import { t } from "../../_lib/i18n/messages"
import { LISTING_PRODUCTS } from "../../_lib/listing-products"
import {
  resolveListingProducts,
} from "../../_lib/storefront-catalog"
import { PublicHeader } from "../marketplace/public-header"
import { SiteFooter } from "../marketplace/site-footer"
import { HomepageProducerGrid } from "../marketplace/partner-card"
import { AdSlot } from "./ad-slot"
import { HomepageCampaignSlider } from "./homepage-campaign-slider"
import { HomepageCarousel } from "./homepage-carousel"
import { HomepageCategoryGrid } from "./homepage-category-grid"
import { HomepageHero } from "./homepage-hero"
import { HomepageWhySection } from "./homepage-why"
import { NewsletterForm } from "./newsletter-form"

/** Consistente verticale ritmiek (lichte homepage). */
const SECTION = "px-4 py-3.5 tablet:px-8 tablet:py-4"
const AD_WRAP = "py-1 tablet:py-1.5"

export async function Homepage() {
  const locale = await getStorefrontLocaleFromCookies()
  const cms = resolveHomepageCms(locale)

  const { products } = await resolveListingProducts({ locale })
  const featuredFromApi =
    products.length > 0
      ? [...products]
          .sort((a, b) => b.offerCount - a.offerCount || b.rating - a.rating)
          .slice(0, 12)
      : []

  // Frontend seed-fallback wanneer catalogus tijdelijk leeg is (geen backend-wijziging).
  const pool = products.length > 0 ? products : LISTING_PRODUCTS
  const featuredProducts =
    featuredFromApi.length > 0
      ? featuredFromApi
      : [...pool]
          .sort((a, b) => b.offerCount - a.offerCount || b.rating - a.rating)
          .slice(0, 12)
  const newest = pool.slice(0, 12)
  const bestSold = [...pool]
    .sort((a, b) => b.offerCount - a.offerCount || b.rating - a.rating)
    .slice(0, 12)

  const banner1 =
    cms.banners.find((b) => b.position === 1 && b.location === "homepage") ??
    null
  const banner2 =
    cms.banners.find((b) => b.position === 2 && b.location === "homepage") ??
    null

  const sec = cms.sections

  return (
    <div className="min-h-screen bg-wf-100 text-wf-800">
      <div className="mx-auto max-w-[1160px] border border-wf-200 bg-white shadow-sm">
        <PublicHeader locale={locale} />

        <HomepageHero content={cms.hero} />

        {sec.categories ? (
          <section className={SECTION}>
            <h2 className="mb-2 text-base font-bold text-wf-900 tablet:text-lg">
              {sec.categories.title}
            </h2>
            <HomepageCategoryGrid
              categories={cms.categories}
              productsSuffix={t("productsSuffix", locale)}
            />
          </section>
        ) : null}

        {sec.campaigns ? (
          <section className={SECTION}>
            <HomepageCampaignSlider
              campaigns={cms.campaigns}
              title={sec.campaigns.title}
              prevLabel={t("prevCampaigns", locale)}
              nextLabel={t("nextCampaigns", locale)}
            />
          </section>
        ) : null}

        {sec.featured ? (
          <section className={SECTION}>
            <HomepageCarousel
              title={sec.featured.title}
              subtitle={sec.featured.subtitle}
              products={featuredProducts}
              locale={locale}
            />
          </section>
        ) : null}

        <div className={AD_WRAP}>
          <AdSlot
            position={1}
            creative={banner1}
            locale={locale}
            adLabel={t("advertisement", locale)}
            productKind="garden"
          />
        </div>

        {sec.partners ? (
          <section className={SECTION}>
            <h2 className="mb-0.5 text-base font-bold text-wf-900 tablet:text-lg">
              {sec.partners.title}
            </h2>
            {sec.partners.subtitle ? (
              <p className="mb-2 text-[12px] text-wf-600">
                {sec.partners.subtitle}
              </p>
            ) : null}
            <HomepageProducerGrid
              partners={cms.partners.items}
              viewLabel={t("viewBrand", locale)}
              productsSuffix={t("productsSuffix", locale)}
            />
          </section>
        ) : null}

        {sec.why ? (
          <HomepageWhySection
            title={cms.why.title}
            subtitle={cms.why.subtitle}
            items={cms.why.items}
          />
        ) : null}

        {sec.newest ? (
          <section className={SECTION}>
            <HomepageCarousel
              title={sec.newest.title}
              subtitle={sec.newest.subtitle}
              products={newest}
              locale={locale}
            />
          </section>
        ) : null}

        {sec.best_sellers ? (
          <section className={SECTION}>
            <HomepageCarousel
              title={sec.best_sellers.title}
              subtitle={sec.best_sellers.subtitle}
              products={bestSold}
              locale={locale}
            />
          </section>
        ) : null}

        <div className={AD_WRAP}>
          <AdSlot
            position={2}
            creative={banner2}
            locale={locale}
            adLabel={t("advertisement", locale)}
            productKind="coffee"
          />
        </div>

        {sec.newsletter ? (
          <section className="border-t border-wf-100 px-4 py-3.5 tablet:px-8 tablet:py-4">
            <div className="mx-auto max-w-lg text-center">
              <h2 className="mb-1 text-base font-bold text-wf-900 tablet:text-lg">
                {cms.newsletter.title}
              </h2>
              <p className="mb-2 text-[12px] text-wf-600">
                {cms.newsletter.subtitle}
              </p>
              <NewsletterForm
                placeholder={cms.newsletter.placeholder}
                submitLabel={cms.newsletter.submitLabel}
                invalidEmail={cms.newsletter.invalidEmail}
                successMessage={cms.newsletter.successMessage}
              />
            </div>
          </section>
        ) : null}

        <SiteFooter locale={locale} />
      </div>
    </div>
  )
}
