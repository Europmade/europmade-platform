import {
  HOMEPAGE_CATEGORIES,
} from "../../_lib/homepage-content"
import {
  resolveFeaturedProducts,
  resolveListingProducts,
} from "../../_lib/storefront-catalog"
import { PublicHeader } from "../marketplace/public-header"
import { SiteFooter } from "../marketplace/site-footer"
import { HomepageProducerGrid } from "../marketplace/partner-card"
import { AdSlot } from "./ad-slot"
import { HomepageCarousel } from "./homepage-carousel"
import { HomepageCategoryGrid } from "./homepage-category-grid"
import { HomepageHero } from "./homepage-hero"
import { HomepageProductGrid } from "./homepage-product-grid"
import { HomepageWhySection } from "./homepage-why"
import { NewsletterForm } from "./newsletter-form"
import { DEFAULT_HOMEPAGE_HERO } from "../../_lib/homepage-hero-content"

/**
 * Homepage V2 — gecomprimeerde premium marketplace-layout.
 */
export async function Homepage() {
  const [{ products }, featuredProducts] = await Promise.all([
    resolveListingProducts(),
    resolveFeaturedProducts(8),
  ])

  const newest = products.slice(0, 12)
  const bestSold = [...products]
    .sort((a, b) => b.offerCount - a.offerCount || b.rating - a.rating)
    .slice(0, 12)

  return (
    <div className="min-h-screen bg-wf-100 text-wf-800">
      <div className="mx-auto max-w-[1160px] border border-wf-200 bg-white shadow-sm">
        <PublicHeader />

        <HomepageHero content={DEFAULT_HOMEPAGE_HERO} />

        <section className="px-4 py-6 tablet:px-8 tablet:py-7">
          <h2 className="mb-3 text-base font-bold text-wf-900 tablet:text-lg">
            Populaire categorieën
          </h2>
          <HomepageCategoryGrid categories={HOMEPAGE_CATEGORIES} />
        </section>

        <section className="px-4 py-6 tablet:px-8 tablet:py-7">
          <h2 className="mb-0.5 text-base font-bold text-wf-900 tablet:text-lg">
            Uitgelicht deze week
          </h2>
          <p className="mb-3 text-[12.5px] text-wf-600">
            Best beoordeeld en meest gekozen — nooit gesponsord.
          </p>
          <HomepageProductGrid products={featuredProducts} />
        </section>

        <div className="py-1.5 tablet:py-2">
          <AdSlot position={1} compact />
        </div>

        <section className="px-4 py-6 tablet:px-8 tablet:py-7">
          <h2 className="mb-0.5 text-base font-bold text-wf-900 tablet:text-lg">
            Populaire Europese producenten
          </h2>
          <p className="mb-3 text-[12.5px] text-wf-600">
            Ontdek makers en merken met geverifieerde herkomst.
          </p>
          <HomepageProducerGrid />
        </section>

        <HomepageWhySection />

        <section className="px-4 py-4 tablet:px-8 tablet:py-5">
          <HomepageCarousel
            title="Nieuw binnen"
            subtitle="Recent toegevoegd aan de EuropMade marketplace."
            products={newest}
          />
        </section>

        <section className="px-4 py-4 tablet:px-8 tablet:py-5">
          <HomepageCarousel
            title="Best verkocht"
            subtitle="Populair bij klanten op basis van aanbieders en beoordelingen."
            products={bestSold}
          />
        </section>

        <div className="py-1.5 tablet:py-2">
          <AdSlot position={2} compact />
        </div>

        <section className="border-t border-wf-100 px-4 py-6 tablet:px-8">
          <div className="mx-auto max-w-lg text-center">
            <h2 className="mb-1.5 text-base font-bold text-wf-900 tablet:text-lg">
              Blijf op de hoogte
            </h2>
            <p className="mb-3 text-[12.5px] text-wf-600">
              Nieuwe Europese merken en producten, direct in je inbox.
            </p>
            <NewsletterForm />
          </div>
        </section>

        <SiteFooter />
      </div>
    </div>
  )
}
