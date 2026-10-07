"use client"

import type { ReactNode } from "react"
import { t } from "../../_lib/i18n/messages"
import type { StorefrontLocale } from "../../_lib/i18n/locales"
import type { ListingProduct } from "../../_lib/listing-products"
import type { ResolvedHomepage } from "../../_lib/cms/resolve-homepage"
import type { StorefrontAdCreative } from "../../_lib/storefront-ads"
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
import { CmsSectionFrame } from "../cms/cms-section-frame"
import { CmsThemeStyle } from "../cms/cms-theme-style"
import type { CmsThemeDocument } from "@europmade/utils"
import {
  HOMEPAGE_AD_WRAP,
  HOMEPAGE_SECTION_CLASS,
  withLegacyBanners,
} from "./homepage-shared"

export function HomepageView({
  cms,
  featuredProducts,
  newest,
  bestSold,
  locale,
  preview,
}: {
  cms: ResolvedHomepage
  featuredProducts: ListingProduct[]
  newest: ListingProduct[]
  bestSold: ListingProduct[]
  locale: StorefrontLocale
  preview?: {
    selectedId: string
    interactive: boolean
    honestEmpty: boolean
    theme: CmsThemeDocument | null
    onSelect?: (id: string) => void
  }
}) {
  const banner1 =
    cms.banners.find((b) => b.position === 1 && b.location === "homepage") ??
    null
  const banner2 =
    cms.banners.find((b) => b.position === 2 && b.location === "homepage") ??
    null
  const ordered = withLegacyBanners(cms.orderedSections)
  const selectedId = preview?.selectedId
  const interactive = Boolean(preview?.interactive)

  function select(id: string) {
    preview?.onSelect?.(id)
  }

  return (
    <div
      className={`em-cms-theme bg-wf-100 text-wf-800 ${
        interactive ? "cms-preview-interactive" : "min-h-screen"
      }`}
      onClick={
        interactive
          ? (e) => {
              const el = (e.target as HTMLElement).closest("[data-cms-section]")
              if (el instanceof HTMLElement && el.dataset.cmsSection) {
                select(el.dataset.cmsSection)
              }
            }
          : undefined
      }
    >
      <CmsThemeStyle theme={preview?.theme ?? null} />
      <div className="em-cms-frame mx-auto max-w-[1160px] border border-wf-200 bg-white shadow-sm">
        <CmsSectionFrame
          id="chrome_header"
          selected={selectedId === "chrome_header"}
          interactive={interactive}
        >
          <PublicHeader
            locale={locale}
            logoSrc={preview?.theme?.header?.logo ?? undefined}
            backgroundColor={preview?.theme?.header?.backgroundColor ?? undefined}
            loadThemeChrome={!preview?.theme}
          />
        </CmsSectionFrame>

        {cms.hero.headline ? (
          <CmsSectionFrame
            id="hero"
            selected={selectedId === "hero"}
            interactive={interactive}
          >
            <HomepageHero
              content={cms.hero}
              honestEmpty={preview?.honestEmpty}
            />
          </CmsSectionFrame>
        ) : null}

        {ordered.map((section) => {
          const frame = (node: ReactNode) => (
            <CmsSectionFrame
              key={section.id}
              id={section.id}
              selected={selectedId === section.id}
              interactive={interactive}
            >
              {node}
            </CmsSectionFrame>
          )

          if (section.key === "categories") {
            return frame(
              <section className={HOMEPAGE_SECTION_CLASS}>
                <h2 className="mb-2 text-base font-bold text-wf-900 tablet:text-lg">
                  {section.title}
                </h2>
                {cms.categories.length === 0 && preview?.honestEmpty ? (
                  <p className="text-[13px] text-wf-500">Geen content ingesteld</p>
                ) : (
                  <HomepageCategoryGrid
                    categories={cms.categories}
                    productsSuffix={t("productsSuffix", locale)}
                  />
                )}
              </section>
            )
          }
          if (section.key === "campaigns") {
            return frame(
              <section className={HOMEPAGE_SECTION_CLASS}>
                {cms.campaigns.length === 0 && preview?.honestEmpty ? (
                  <>
                    <h2 className="mb-2 text-base font-bold text-wf-900">
                      {section.title}
                    </h2>
                    <p className="text-[13px] text-wf-500">Geen content ingesteld</p>
                  </>
                ) : (
                  <HomepageCampaignSlider
                    campaigns={cms.campaigns}
                    title={section.title}
                    prevLabel={t("prevCampaigns", locale)}
                    nextLabel={t("nextCampaigns", locale)}
                  />
                )}
              </section>
            )
          }
          if (section.key === "featured") {
            return frame(
              <section className={HOMEPAGE_SECTION_CLASS}>
                {featuredProducts.length === 0 ? (
                  <>
                    <h2 className="mb-2 text-base font-bold text-wf-900">
                      {section.title}
                    </h2>
                    {section.subtitle ? (
                      <p className="mb-2 text-[12px] text-wf-600">
                        {section.subtitle}
                      </p>
                    ) : null}
                    <p className="text-[13px] text-wf-500">
                      Geen Product Cloud-producten beschikbaar
                    </p>
                  </>
                ) : (
                  <HomepageCarousel
                    title={section.title}
                    subtitle={section.subtitle}
                    products={featuredProducts}
                    locale={locale}
                    hideWhenEmpty={false}
                  />
                )}
              </section>
            )
          }
          if (section.key === "banner") {
            const pos =
              ordered.filter((s) => s.key === "banner").findIndex((s) => s.id === section.id) ===
              0
                ? 1
                : 2
            const creative: StorefrontAdCreative | null =
              pos === 1 ? banner1 : banner2
            return frame(
              <div className={HOMEPAGE_AD_WRAP}>
                <AdSlot
                  position={pos}
                  creative={creative}
                  locale={locale}
                  adLabel={t("advertisement", locale)}
                  productKind={pos === 1 ? "garden" : "coffee"}
                />
              </div>
            )
          }
          if (section.key === "partners") {
            return frame(
              <section className={HOMEPAGE_SECTION_CLASS}>
                <h2 className="mb-0.5 text-base font-bold text-wf-900 tablet:text-lg">
                  {section.title}
                </h2>
                {section.subtitle ? (
                  <p className="mb-2 text-[12px] text-wf-600">
                    {section.subtitle}
                  </p>
                ) : null}
                {cms.partners.items.length === 0 ? (
                  <p className="text-[13px] text-wf-500">Geen content ingesteld</p>
                ) : (
                  <HomepageProducerGrid
                    partners={cms.partners.items}
                    viewLabel={t("viewBrand", locale)}
                    productsSuffix={t("productsSuffix", locale)}
                  />
                )}
              </section>
            )
          }
          if (section.key === "why") {
            return frame(
              <HomepageWhySection
                title={cms.why.title || section.title}
                subtitle={cms.why.subtitle || section.subtitle}
                image={cms.why.image}
                items={cms.why.items}
                honestEmpty={preview?.honestEmpty}
              />
            )
          }
          if (section.key === "newest") {
            return frame(
              <section className={HOMEPAGE_SECTION_CLASS}>
                {newest.length === 0 ? (
                  <>
                    <h2 className="mb-2 text-base font-bold text-wf-900">
                      {section.title}
                    </h2>
                    {section.subtitle ? (
                      <p className="mb-2 text-[12px] text-wf-600">
                        {section.subtitle}
                      </p>
                    ) : null}
                    <p className="text-[13px] text-wf-500">
                      Geen Product Cloud-producten beschikbaar
                    </p>
                  </>
                ) : (
                  <HomepageCarousel
                    title={section.title}
                    subtitle={section.subtitle}
                    products={newest}
                    locale={locale}
                    hideWhenEmpty={false}
                  />
                )}
              </section>
            )
          }
          if (section.key === "best_sellers") {
            return frame(
              <section className={HOMEPAGE_SECTION_CLASS}>
                {bestSold.length === 0 ? (
                  <>
                    <h2 className="mb-2 text-base font-bold text-wf-900">
                      {section.title}
                    </h2>
                    {section.subtitle ? (
                      <p className="mb-2 text-[12px] text-wf-600">
                        {section.subtitle}
                      </p>
                    ) : null}
                    <p className="text-[13px] text-wf-500">
                      Geen Product Cloud-producten beschikbaar
                    </p>
                  </>
                ) : (
                  <HomepageCarousel
                    title={section.title}
                    subtitle={section.subtitle}
                    products={bestSold}
                    locale={locale}
                    hideWhenEmpty={false}
                  />
                )}
              </section>
            )
          }
          if (section.key === "newsletter") {
            return frame(
              <section className="border-t border-wf-100 px-4 py-3.5 tablet:px-8 tablet:py-4">
                <div
                  className={`grid w-full gap-4 ${
                    cms.newsletter.image
                      ? "tablet:grid-cols-[minmax(220px,320px)_minmax(0,1fr)] tablet:items-stretch"
                      : "max-w-2xl"
                  }`}
                >
                  {cms.newsletter.image ? (
                    <div className="aspect-[5/4] w-full overflow-hidden rounded-xl bg-wf-100 tablet:aspect-auto tablet:min-h-[220px]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={cms.newsletter.image}
                        alt=""
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    </div>
                  ) : null}
                  <div className="flex flex-col justify-center text-left">
                    <h2 className="mb-1 text-base font-bold text-wf-900 tablet:text-lg">
                      {cms.newsletter.title || section.title}
                    </h2>
                    <p className="mb-3 text-[12px] leading-relaxed text-wf-600">
                      {cms.newsletter.subtitle || section.subtitle}
                    </p>
                    <NewsletterForm
                      placeholder={cms.newsletter.placeholder}
                      submitLabel={cms.newsletter.submitLabel}
                      invalidEmail={cms.newsletter.invalidEmail}
                      locale={locale}
                    />
                  </div>
                </div>
              </section>
            )
          }
          if (section.key === "seller_cta") {
            return frame(
              <section className={`${HOMEPAGE_SECTION_CLASS} text-center`}>
                <h2 className="text-base font-bold text-wf-900 tablet:text-lg">
                  {section.title}
                </h2>
                {section.subtitle ? (
                  <p className="mx-auto mt-1 max-w-lg text-[12px] text-wf-600">
                    {section.subtitle}
                  </p>
                ) : null}
                <a
                  href={section.href || "/waarom-verkopen"}
                  className="mt-3 inline-flex h-9 items-center rounded-xl bg-wf-900 px-3.5 text-[12.5px] font-semibold text-white"
                >
                  {section.body || section.title}
                </a>
              </section>
            )
          }
          if (section.key === "faq") {
            return frame(
              <section className={HOMEPAGE_SECTION_CLASS}>
                <h2 className="mb-2 text-base font-bold text-wf-900 tablet:text-lg">
                  {section.title}
                </h2>
                {cms.faqItems.length === 0 && preview?.honestEmpty ? (
                  <p className="text-[13px] text-wf-500">Geen content ingesteld</p>
                ) : (
                  <ul className="space-y-2">
                    {cms.faqItems.map((item) => (
                      <li key={item.id}>
                        <p className="text-sm font-semibold text-wf-900">
                          {item.title}
                        </p>
                        <p className="text-[12px] text-wf-600">{item.body}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )
          }
          return frame(
            <section className={HOMEPAGE_SECTION_CLASS}>
              <h2 className="text-base font-bold text-wf-900 tablet:text-lg">
                {section.title}
              </h2>
              {section.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={section.image}
                  alt=""
                  className="mt-2 max-h-48 w-full rounded-lg object-cover"
                />
              ) : null}
              {section.subtitle || section.body ? (
                <p className="mt-2 max-w-2xl whitespace-pre-wrap text-[13px] leading-relaxed text-wf-700">
                  {section.body || section.subtitle}
                </p>
              ) : preview?.honestEmpty ? (
                <p className="mt-2 text-[13px] text-wf-500">Geen content ingesteld</p>
              ) : null}
            </section>
          )
        })}

        <CmsSectionFrame
          id="chrome_footer"
          selected={selectedId === "chrome_footer"}
          interactive={interactive}
        >
          <SiteFooter locale={locale} />
        </CmsSectionFrame>
      </div>
    </div>
  )
}
