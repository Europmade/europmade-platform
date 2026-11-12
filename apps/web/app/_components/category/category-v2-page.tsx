"use client"

import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react"
import Link from "next/link"
import type {
  CategoryAdPositionKey,
  CategoryCmsAdPosition,
  CategoryCmsBlock,
  CategoryCmsDocumentV2,
  CategoryCmsImageFrame,
  CategoryCmsLocalized,
  CategoryCmsPresentation,
  CategoryCmsProfile,
  CategoryListingQuery,
  CategoryProductRelation,
  CategoryV2FilterSelection,
  CategoryV2Sort,
} from "@europmade/utils"
import {
  adviceItemCta,
  applyCategoryV2FacetCounts,
  buildCategoryV2Facets,
  categoryListingQueryIsEmpty,
  categoryV2FilterAttributes,
  categoryBrandHref,
  categoryCmsLocalizedHasText,
  categoryCmsOptionalLink,
  categorySlugFromHref,
  choiceAssistantMatches,
  comparisonSpecRows,
  consumerFaqItems,
  explainCategorySpecs,
  factualCategoryComparison,
  orderedComparisonProducts,
  representativeCategoryImage,
  restoreGenericCategoryCopy,
  selectCategoryBrands,
  selectRelatedCategoryProducts,
  visibleFaqItems,
  paginateCategoryV2Products,
  planChoiceAssistant,
  getCategoryAdvice,
  productMatchesCategoryV2Filters,
  selectionFromListingQuery,
  categoryTilePublicPath,
  level1CategoryTileRows,
  orderSubcategoriesWithAggregateFirst,
  selectCategoryShelf,
  readCategoryAdPositions,
  selectCategoryAdSource,
  sortCategoryV2Products,
} from "@europmade/utils"
import type { StorefrontLocale } from "../../_lib/i18n/locales"
import { pickLocalized } from "../../_lib/i18n/locales"
import { t } from "../../_lib/i18n/messages"
import type { ListingProduct } from "../../_lib/listing-products"
import { ProductCarouselCard } from "../product/product-carousel"
import type { ProductCloudStoreAttribute } from "../../_lib/product-cloud-store"
import type { LiveAdSlot } from "../../_lib/advertising-live-slots"
import { CTA_LABELS_NL } from "../../_lib/advertising-public"
import type { StoreCmsBanner } from "../../_lib/cms/fetch-store-cms"
import type { StorefrontAdCreative } from "../../_lib/storefront-ads"
import { AdSlot } from "../homepage/ad-slot"
import { PublicStorefrontChrome } from "../marketplace/public-storefront-chrome"
import { categoryAtmosphere, categoryHeroFocus } from "./category-atmosphere"
import { CategoryPlacementBanner } from "./category-placement-banner"

type ListingSelection = {
  token: number
  selection: Record<string, CategoryV2FilterSelection>
}

export type CategoryV2Ads = {
  campaign: LiveAdSlot | null
  banners: StoreCmsBanner[]
}

export type CategoryV2Crumb = { href: string; label: string }
export type CategoryV2Child = {
  slug: string
  name: string
  /** Rolled-up Product Cloud links, including descendants and the temporary test catalog. */
  productCount: number
  /** Sellable offers in this group, counted from the products on the page. */
  sellableCount?: number
  /** Temporary test-catalog products in this group. They are not for sale. */
  testCount?: number
  /**
   * Stored scene for this slug. Null means no file. Omit it to try the public path.
   */
  imageUrl?: string | null
}

type Props = {
  document: CategoryCmsDocumentV2
  locale: StorefrontLocale
  categoryName: string
  breadcrumbs: CategoryV2Crumb[]
  children: CategoryV2Child[]
  products: ListingProduct[]
  /** Sellable products reached by a stored Product Cloud relation. */
  relatedProducts?: ListingProduct[]
  productRelations?: CategoryProductRelation[]
  /** Filterbare Product Cloud-attributen van deze categorie. */
  filterAttributes?: ProductCloudStoreAttribute[]
  /** Live category campaign and published banners. Empty positions stay hidden. */
  ads?: CategoryV2Ads
  /** Admin preview shows empty editorial slots. Advertenties without a live result stay hidden. */
  preview?: boolean
  /** `f`, `min` and `max` from the category URL. Applied once, only when the facet exists. */
  listingQuery?: CategoryListingQuery
}

function text(value: CategoryCmsLocalized | undefined, locale: StorefrontLocale): string {
  if (!value) return ""
  return (value[locale] || value.nl || "").trim()
}

const PRODUCT_FRAME: CategoryCmsImageFrame = { ratio: "4:3", fit: "contain" }

function imageSources(products: ListingProduct[]) {
  return products.map((product) => ({
    slug: product.slug,
    title: product.title,
    imageUrl: product.imageUrl,
    imageUrls: product.imageUrls,
    categorySlugs: product.categorySlugs,
    testCatalog: product.testCatalog === true,
  }))
}

function euros(cents: number): string {
  if (!Number.isFinite(cents) || cents <= 0) return ""
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(cents / 100)
}

function styleOf(presentation: CategoryCmsPresentation | undefined): CSSProperties {
  if (!presentation) return {}
  const padding = presentation.padding === "lg" ? "2rem" : presentation.padding === "sm" ? "0.75rem" : undefined
  return {
    backgroundColor: presentation.background_color || undefined,
    color: presentation.text_color || undefined,
    textAlign: presentation.align,
    padding,
    borderRadius: presentation.radius === "none" ? 0 : presentation.radius === "lg" ? "1rem" : undefined,
  }
}

function columnsOf(presentation: CategoryCmsPresentation | undefined, fallback: number): number {
  const value = presentation?.columns
  if (value === 2 || value === 3 || value === 4) return value
  return fallback
}

function aspectRatio(ratio: CategoryCmsImageFrame["ratio"] | undefined): string | undefined {
  if (ratio === "16:9") return "16 / 9"
  if (ratio === "4:3") return "4 / 3"
  if (ratio === "1:1") return "1 / 1"
  if (ratio === "3:2") return "3 / 2"
  return undefined
}

function PhotoBox({
  url,
  alt,
  frame,
  className,
}: {
  url: string
  alt: string
  frame?: CategoryCmsImageFrame
  className?: string
}) {
  const ratio = aspectRatio(frame?.ratio)
  const fit = frame?.fit ?? "cover"
  const position = `${frame?.position_x ?? "center"} ${frame?.position_y ?? "center"}`
  const framed = Boolean(ratio)
  return (
    <div
      className={`overflow-hidden rounded-xl bg-slate-100 ${framed ? "relative" : ""} ${className ?? ""}`}
      style={framed ? { aspectRatio: ratio } : undefined}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt={alt}
        className={framed ? "absolute inset-0 h-full w-full" : "h-auto max-h-80 w-full"}
        style={{ objectFit: fit, objectPosition: position }}
      />
    </div>
  )
}

function FramedPhoto({
  url,
  mobileUrl,
  alt,
  mobileAlt,
  frame,
  mobileFrame,
  caption,
}: {
  url?: string | null
  mobileUrl?: string | null
  alt: string
  mobileAlt?: string
  frame?: CategoryCmsImageFrame
  mobileFrame?: CategoryCmsImageFrame
  caption?: string
}) {
  const desktop = url || mobileUrl || ""
  const mobile = mobileUrl || url || ""
  if (!desktop) return null
  const split = mobile !== desktop
  return (
    <figure>
      {split ? (
        <PhotoBox url={mobile} alt={mobileAlt || alt} frame={mobileFrame ?? frame} className="md:hidden" />
      ) : null}
      <PhotoBox url={desktop} alt={alt} frame={frame} className={split ? "hidden md:block" : undefined} />
      {caption ? <figcaption className="mt-1 text-xs text-slate-500">{caption}</figcaption> : null}
    </figure>
  )
}


function Empty({ preview, label }: { preview?: boolean; label: string }) {
  if (!preview) return null
  return (
    <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-4 text-sm text-slate-500">
      {label}
    </p>
  )
}

function Section({
  id,
  children,
  presentation,
  className = "",
  backgroundColor,
}: {
  id: string
  children: ReactNode
  presentation?: CategoryCmsPresentation
  className?: string
  backgroundColor?: string
}) {
  return (
    <section
      id={id}
      data-cms-section={id}
      className={`scroll-mt-6 min-w-0 px-4 py-5 sm:px-6 ${className}`.trim()}
      style={{ ...styleOf(presentation), ...(backgroundColor ? { backgroundColor } : {}) }}
    >
      {children}
    </section>
  )
}

export function CategoryV2Page({
  document,
  locale,
  categoryName,
  breadcrumbs,
  children,
  products,
  relatedProducts,
  productRelations,
  filterAttributes,
  ads,
  preview = false,
  listingQuery,
}: Props) {
  const slug = categorySlugFromHref(breadcrumbs.at(-1)?.href ?? "")
  const presentation = useMemo(() => {
    if (!slug) return document
    const parent = breadcrumbs.length > 1 ? breadcrumbs[breadcrumbs.length - 2]?.label ?? null : null
    const brands = [...new Set(products.map((product) => product.brand.trim()).filter(Boolean))].sort((left, right) =>
      left.localeCompare(right, "nl")
    )
    const context = {
      slug,
      name: categoryName,
      parentName: parent,
      children: children.map((child) => ({ slug: child.slug, name: child.name })),
      profile: document.profile,
      productCount: products.length,
      brands,
      filterNames: (filterAttributes ?? []).filter((attribute) => attribute.is_filterable).map((attribute) => attribute.name.trim()).filter(Boolean),
      distinguishedFrom: null,
    }
    const restored = restoreGenericCategoryCopy(document, context).document
    if (restored.blocks.some((block) => block.type === "faq")) return restored
    const questions = consumerFaqItems(context)
    if (questions.length === 0) return restored
    const nlOnly = (value: string): CategoryCmsLocalized => ({ nl: value, en: "", de: "", fr: "" })
    const faqBlock = {
      id: `display-faq-${slug}`,
      type: "faq" as const,
      visible: true,
      title: nlOnly(`Veelgestelde vragen over ${categoryName}`),
      items: questions.map((item) => ({
        id: item.id,
        question: nlOnly(item.question),
        answer: nlOnly(item.answer),
      })),
    }
    const whyIndex = restored.blocks.findIndex((block) => block.type === "why_europmade")
    const blocks = [...restored.blocks]
    blocks.splice(whyIndex >= 0 ? whyIndex + 1 : blocks.length, 0, faqBlock)
    return { ...restored, blocks }
  }, [breadcrumbs, categoryName, children, document, filterAttributes, products, slug])
  useEffect(() => {
    const raw = window.location.hash.replace(/^#/, "")
    if (!raw) return
    const id = decodeURIComponent(raw)
    let cancelled = false
    const scroll = () => {
      if (cancelled) return
      window.document.getElementById(id)?.scrollIntoView({ block: "start" })
    }
    scroll()
    const timers = [250, 800].map((delay) => window.setTimeout(scroll, delay))
    return () => {
      cancelled = true
      timers.forEach((timer) => window.clearTimeout(timer))
    }
  }, [slug])
  const profile = presentation.profile
  const blocks = presentation.blocks.filter((block) => block.visible !== false)
  const h1 = text(presentation.seo?.h1, locale) || categoryName
  const [listingSelection, setListingSelection] = useState<ListingSelection | null>(null)
  function applyListingSelection(selection: Record<string, CategoryV2FilterSelection>) {
    setListingSelection((current) => ({ token: (current?.token ?? 0) + 1, selection }))
  }

  return (
    <PublicStorefrontChrome locale={locale}>
      <nav aria-label="Broodkruimels" className="px-4 pt-3 text-xs text-slate-500 sm:px-6">
        <ol className="flex flex-wrap gap-1">
          <li><Link href="/" className="hover:underline">Home</Link></li>
          {breadcrumbs.map((crumb) => (
            <li key={crumb.href} className="flex gap-1">
              <span aria-hidden>/</span>
              <Link href={crumb.href} prefetch={false} className="hover:underline">{crumb.label}</Link>
            </li>
          ))}
        </ol>
      </nav>
      {renderBlocks({
        blocks,
        profile,
        locale,
        categoryName,
        h1,
        children,
        products,
        relatedProducts: relatedProducts ?? [],
        productRelations: productRelations ?? [],
        filterAttributes: filterAttributes ?? [],
        preview,
        ads: ads ?? { campaign: null, banners: [] },
        pageBlocks: presentation.blocks,
        slug: slug ?? "",
        listingSelection,
        listingQuery,
        onApplyListing: applyListingSelection,
      })}
    </PublicStorefrontChrome>
  )
}

function renderBlocks(input: {
  blocks: CategoryCmsBlock[]
  profile: CategoryCmsProfile
  locale: StorefrontLocale
  categoryName: string
  h1: string
  children: CategoryV2Child[]
  products: ListingProduct[]
  relatedProducts: ListingProduct[]
  productRelations: CategoryProductRelation[]
  filterAttributes: ProductCloudStoreAttribute[]
  preview: boolean
  ads: CategoryV2Ads
  pageBlocks: CategoryCmsBlock[]
  slug: string
  listingSelection: ListingSelection | null
  listingQuery?: CategoryListingQuery
  onApplyListing: (selection: Record<string, CategoryV2FilterSelection>) => void
}) {
  const gridBlock = input.blocks.find((block) => block.type === "product_grid")
  const nodes: ReactNode[] = []
  const adBlock = input.blocks.find((block) => block.type === "ad_slot")
  const positions =
    adBlock?.type === "ad_slot" ? readCategoryAdPositions(adBlock) : []
  const hasUsp = input.blocks.some((block) => block.type === "usp_bar")

  function bands(anchor: CategoryAdPositionKey): ReactNode[] {
    if (!adBlock || adBlock.type !== "ad_slot") return []
    return positions
      .filter((position) => position.position === anchor)
      .map((position) => (
        <CategoryAd
          key={position.id}
          sectionId={adBlock.id}
          position={position}
          presentation={adBlock.presentation}
          campaign={input.ads.campaign}
          banners={input.ads.banners}
          locale={input.locale}
        />
      ))
  }

  function after(block: CategoryCmsBlock) {
    if (block.type === "usp_bar" || (block.type === "hero" && !hasUsp)) {
      nodes.push(
        <CategoryPlacementBanner
          key="category-placement-banner"
          campaign={input.ads.campaign}
          products={input.products}
          categoryName={input.categoryName}
          slug={input.slug}
          preview={input.preview}
        />
      )
    }
    if (block.type === "subcategory_tiles" || block.type === "product_group_tiles") {
      nodes.push(...bands("between_content"))
    }
    if (block.type === "product_carousel" || block.type === "product_grid") {
      nodes.push(...bands("below_product_grid"))
    }
  }

  for (let index = 0; index < input.blocks.length; index += 1) {
    const block = input.blocks[index]!
    if (block.type === "filters" && gridBlock?.type === "product_grid") {
      nodes.push(...bands("above_product_grid"))
      nodes.push(
        <ListingRow
          key={`${block.id}-${gridBlock.id}`}
          filters={block}
          grid={gridBlock}
          locale={input.locale}
          products={input.products}
          filterAttributes={input.filterAttributes}
          preview={input.preview}
          listingSelection={input.listingSelection}
          listingQuery={input.listingQuery}
        />
      )
      nodes.push(...bands("below_product_grid"))
      continue
    }
    if (block.type === "product_grid" && input.blocks.some((item) => item.type === "filters")) {
      continue
    }
    if (block.type === "product_carousel" || block.type === "product_grid") {
      nodes.push(...bands("above_product_grid"))
    }
    nodes.push(
      <BlockView
        key={block.id}
        block={block}
        locale={input.locale}
        categoryName={input.categoryName}
        h1={input.h1}
        children={input.children}
        products={input.products}
        relatedProducts={input.relatedProducts}
        productRelations={input.productRelations}
        filterAttributes={input.filterAttributes}
        preview={input.preview}
        profile={input.profile}
        pageBlocks={input.pageBlocks}
        slug={input.slug}
        onApplyListing={input.onApplyListing}
      />
    )
    after(block)
  }
  return nodes
}

function BlockView(props: {
  block: CategoryCmsBlock
  locale: StorefrontLocale
  categoryName: string
  h1: string
  children: CategoryV2Child[]
  products: ListingProduct[]
  relatedProducts: ListingProduct[]
  productRelations: CategoryProductRelation[]
  filterAttributes?: ProductCloudStoreAttribute[]
  preview: boolean
  profile: CategoryCmsProfile
  pageBlocks: CategoryCmsBlock[]
  slug: string
  onApplyListing: (selection: Record<string, CategoryV2FilterSelection>) => void
}) {
  const { block, locale, preview } = props
  if (block.type === "hero") {
    return <Hero block={block} locale={locale} h1={props.h1} preview={preview} slug={props.slug} profile={props.profile} />
  }
  if (block.type === "usp_bar") return <Usps block={block} locale={locale} preview={preview} slug={props.slug} profile={props.profile} />
  if (block.type === "ad_slot") return null
  if (block.type === "subcategory_tiles" || block.type === "product_group_tiles") {
    return (
      <Tiles
        block={block}
        locale={locale}
        categoryName={props.categoryName}
        children={props.children}
        products={props.products}
        preview={preview}
        profile={props.profile}
        slug={props.slug}
      />
    )
  }
  if (block.type === "product_carousel" || block.type === "product_grid") {
    return <Products block={block} locale={locale} categoryName={props.categoryName} categorySlug={props.slug} products={props.products} preview={preview} filterAttributes={props.filterAttributes} />
  }
  if (block.type === "brand_overview") {
    return (
      <Brands
        block={block}
        locale={locale}
        categoryName={props.categoryName}
        products={props.products}
        preview={preview}
      />
    )
  }
  if (block.type === "why_europmade" || block.type === "intro" || block.type === "seo_content") {
    return <Story block={block} locale={locale} preview={preview} slug={props.slug} />
  }
  if (block.type === "choice_assistant_cta") {
    return (
      <Choice
        block={block}
        locale={locale}
        preview={preview}
        products={props.products}
        filterAttributes={props.filterAttributes}
        onApplyListing={props.onApplyListing}
        slug={props.slug}
      />
    )
  }
  if (block.type === "phase_navigation") {
    return <PhaseNav block={block} locale={locale} pageBlocks={props.pageBlocks} preview={preview} />
  }
  if (block.type === "shortcuts") {
    return (
      <Shortcuts
        block={block}
        locale={locale}
        products={props.products}
        preview={preview}
        onApplyListing={props.onApplyListing}
      />
    )
  }
  if (block.type === "featured_product") {
    return <Featured block={block} locale={locale} products={props.products} preview={preview} />
  }
  if (block.type === "inspiration") return <Inspiration block={block} locale={locale} preview={preview} />
  if (block.type === "maintenance") return <Maintenance block={block} locale={locale} preview={preview} />
  if (block.type === "brand_story") {
    return <BrandStory block={block} locale={locale} products={props.products} preview={preview} />
  }
  if (block.type === "advice_compare") {
    return <Advice block={block} locale={locale} preview={preview} children={props.children} slug={props.slug} />
  }
  if (block.type === "product_comparison") {
    return (
      <Compare
        block={block}
        locale={locale}
        products={props.products}
        filterAttributes={props.filterAttributes}
        preview={preview}
      />
    )
  }
  if (block.type === "buying_guide") {
    return <Guide block={block} locale={locale} preview={preview} slug={props.slug} />
  }
  if (block.type === "filters") return <FiltersOnly block={block} locale={locale} preview={preview} />
  if (block.type === "faq") return <Faq block={block} locale={locale} preview={preview} />
  if (block.type === "spec_explain") {
    return <SpecExplain block={block} locale={locale} preview={preview} definitions={props.filterAttributes ?? []} />
  }
  if (block.type === "related_products") {
    return (
      <Related
        block={block}
        locale={locale}
        preview={preview}
        sourceProducts={props.products}
        relatedProducts={props.relatedProducts}
        relations={props.productRelations}
      />
    )
  }
  return null
}

function Hero({
  block,
  locale,
  h1,
  preview,
  slug,
  profile,
}: {
  block: Extract<CategoryCmsBlock, { type: "hero" }>
  locale: StorefrontLocale
  h1: string
  preview: boolean
  slug: string
  profile: CategoryCmsProfile
}) {
  if (!block.hero_visible) return null
  const title = text(block.title, locale) || h1
  const subtitle = text(block.subtitle, locale)
  const intro = text(block.intro, locale)
  const primary = text(block.primary_cta_label, locale)
  const secondary = text(block.secondary_cta_label, locale)
  const imageRight = block.presentation?.image_position !== "left"
  const solid = block.presentation?.button_style !== "outline"
  const storedImage = Boolean(block.image_url || block.mobile_image_url)
  const scene = storedImage ? null : categoryAtmosphere(slug, "hero")
  const bannerSrc = storedImage ? block.image_url || block.mobile_image_url : scene?.src
  const bannerAlt = storedImage ? text(block.image_alt, locale) || title : scene?.alt ?? ""
  if ((slug === "huishouden" || slug === "was-droog" || profile === "level_3") && bannerSrc) {
    const showArrow = Boolean(primary && solid && !/[→>]/.test(primary))
    return (
      <Section id={block.id} presentation={block.presentation}>
        <div className="[container-type:inline-size]">
        <div className="overflow-hidden rounded-3xl bg-white min-[834px]:h-[calc((100cqw-22px)/5.7)]">
          <div className="grid h-full items-stretch lg:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)]">
            <div className={`flex min-w-0 flex-col justify-center px-6 py-4 sm:px-8 min-[834px]:py-2 lg:px-10 ${imageRight ? "" : "lg:order-2"}`}>
              <h1 className="text-4xl font-bold leading-[1.12] tracking-tight text-[#1e2a4a] sm:text-[2.75rem]">{title}</h1>
              {subtitle ? <p className="mt-3 text-lg leading-7 text-slate-600">{subtitle}</p> : null}
              {intro ? <p className="mt-1.5 max-w-[28rem] text-[15px] leading-6 text-slate-600">{intro}</p> : <Empty preview={preview} label="Nog geen introductie." />}
              <div className="mt-2 flex flex-wrap items-center gap-3">
                {primary ? (
                  <Link href={block.primary_cta_href || "#ontdek"} prefetch={false} className={solid ? "inline-flex items-center gap-2 rounded-full bg-[#2c9a14] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#248212]" : "inline-flex items-center rounded-full border border-[#2c9a14] bg-white px-5 py-2.5 text-sm font-semibold text-[#2c9a14]"}>
                    {primary}
                    {showArrow ? <span aria-hidden="true">→</span> : null}
                  </Link>
                ) : <Empty preview={preview} label="Nog geen primaire knop." />}
                {secondary ? (
                  <Link href={block.secondary_cta_href || "#keuzehulp"} prefetch={false} className="inline-flex items-center rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-[#1e2a4a] shadow-[inset_0_0_0_1px_#d5dbe3]">
                    {secondary}
                  </Link>
                ) : null}
              </div>
            </div>
            <div className={`relative min-h-[12rem] min-[834px]:min-h-0 ${imageRight ? "" : "lg:order-1"}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={bannerSrc}
                alt={bannerAlt}
                className={`absolute inset-0 h-full w-full ${slug === "wasdrogers" || slug === "was-droogcombinaties" ? "object-contain" : "object-cover"}`}
                style={{ objectPosition: storedImage ? "center" : slug === "was-droog" ? "46% 62%" : categoryHeroFocus(slug) ?? scene?.position ?? "center" }}
              />
              <div aria-hidden className={`pointer-events-none absolute inset-y-0 w-28 from-white to-transparent ${imageRight ? "left-0 bg-gradient-to-r" : "right-0 bg-gradient-to-l"}`} />
            </div>
          </div>
        </div>
        </div>
      </Section>
    )
  }
  return (
    <Section id={block.id} presentation={block.presentation}>
      <div className="grid min-w-0 items-center gap-8 overflow-hidden rounded-3xl bg-white lg:grid-cols-2">
        <div className={`flex min-w-0 flex-col justify-center py-2 lg:py-4 ${imageRight ? "" : "lg:order-2"}`}>
          <h1 className="text-4xl font-bold tracking-tight text-[#16315c] sm:text-5xl">{title}</h1>
          {subtitle ? <p className="mt-3 text-lg leading-7 text-slate-600">{subtitle}</p> : null}
          {intro ? <p className="mt-3 max-w-lg text-base leading-7 text-slate-600">{intro}</p> : <Empty preview={preview} label="Nog geen introductie." />}
          <div className="mt-6 flex flex-wrap gap-3">
            {primary ? (
              <Link href={block.primary_cta_href || "#ontdek"} prefetch={false} className={solid ? "rounded-full bg-[#1f8a4c] px-5 py-3 text-sm font-semibold text-white hover:bg-[#187a41]" : "rounded-full border border-[#1f8a4c] bg-white px-5 py-3 text-sm font-semibold text-[#1f8a4c]"}>
                {primary}
              </Link>
            ) : <Empty preview={preview} label="Nog geen primaire knop." />}
            {secondary ? (
              <Link href={block.secondary_cta_href || "#keuzehulp"} prefetch={false} className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-[#16315c]">
                {secondary}
              </Link>
            ) : null}
          </div>
        </div>
        <div className={`relative min-h-72 overflow-hidden rounded-3xl bg-slate-100 lg:min-h-[22rem] ${imageRight ? "" : "lg:order-1"}`}>
          {storedImage ? (
            <FramedPhoto
              url={block.image_url}
              mobileUrl={block.mobile_image_url}
              alt={text(block.image_alt, locale) || title}
              mobileAlt={text(block.mobile_image_alt, locale)}
              frame={block.image_frame ?? { ratio: "16:9", fit: "cover" }}
              mobileFrame={block.mobile_image_frame ?? block.image_frame ?? { ratio: "16:9", fit: "cover" }}
            />
          ) : scene ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={scene.src} alt={scene.alt} className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: scene.position }} />
          ) : null}
        </div>
      </div>
    </Section>
  )
}

function UspIcon({ title }: { title: string }) {
  const key = title.toLowerCase()
  const d = key.includes("geluid")
    ? "M4 10v4M8 7v10M12 4v16M16 8v8M20 11v2"
    : key.includes("toeren")
      ? "M12 5a7 7 0 1 0 7 7M12 12l4-3"
      : key.includes("energie") || key.includes("verbruik")
        ? "M13 3 6 13h5l-1 8 8-12h-6z"
        : key.includes("vul") || key.includes("capaciteit") || key.includes("couvert") || key.includes("gewicht")
          ? "M5 8h14l-1 12H6zM9 8V5h6v3"
          : key.includes("nis") || key.includes("breedte") || key.includes("maat") || key.includes("ruimte") || key.includes("aanrecht")
            ? "M4 4h16v16H4zM4 10h16M10 4v16"
            : key.includes("warm") || key.includes("droog") || key.includes("condens")
              ? "M8 4c2 3 2 5 0 8s-2 5 0 8M12 4c2 3 2 5 0 8s-2 5 0 8M16 4c2 3 2 5 0 8"
              : key.includes("aansluit")
                ? "M9 4v7a3 3 0 0 0 6 0V4M12 14v6"
                : key.includes("inbouw") || key.includes("front") || key.includes("ombouw") || key.includes("plaats") || key.includes("los of")
                  ? "M4 20V8l8-4 8 4v12M9 20v-6h6v6"
                  : "M5 12l4 4 10-10"
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  )
}

type EditorialUspIcon = "leaf" | "shield" | "truck" | "headset" | "pair" | "drum" | "heat" | "sound"

type EditorialUsp = {
  id: string
  title: string
  body: string
  icon: EditorialUspIcon
}

const HUISHOUDEN_USP_BAR: readonly EditorialUsp[] = [
  { id: "productie", title: "Europese productie", body: "Betrouwbaar en innovatief", icon: "leaf" },
  { id: "kwaliteit", title: "Hoge kwaliteit", body: "Lange levensduur", icon: "shield" },
  { id: "levering", title: "Snelle levering", body: "In heel Europa", icon: "truck" },
  { id: "service", title: "Service & garantie", body: "Van Europese verkopers", icon: "headset" },
]

const WAS_DROOG_USP_BAR: readonly EditorialUsp[] = [
  { id: "los", title: "Los of in één apparaat", body: "Twee apparaten of één combinatie", icon: "pair" },
  { id: "vul", title: "Vulgewicht", body: "Stem de kilo's op elkaar af", icon: "drum" },
  { id: "techniek", title: "Warmtepomp of condens", body: "Alleen als het model dat vermeldt", icon: "heat" },
  { id: "geluid", title: "Geluid in huis", body: "Lager decibelgetal is stiller", icon: "sound" },
]

function editorialUspBar(slug: string): readonly EditorialUsp[] | null {
  if (slug === "huishouden") return HUISHOUDEN_USP_BAR
  if (slug === "was-droog") return WAS_DROOG_USP_BAR
  return null
}

function UspLineIcon({ name }: { name: EditorialUspIcon }) {
  const paths: Record<EditorialUspIcon, string> = {
    leaf: "M5 19c8 0 14-8 14-14-6 0-14 6-14 14zM9.5 15.5c2.2-2.2 5.2-4 8.5-5",
    shield: "M12 3.5 18.5 6v5.2c0 4.2-2.7 7-6.5 8.8-3.8-1.8-6.5-4.6-6.5-8.8V6zM9 12.2l1.8 1.8 3.7-3.8",
    truck: "M3 7.5h10.5V16H3zM13.5 10.5H18l2.5 2.8V16h-7zM6.5 18.2a1.4 1.4 0 1 0 0.1 0M17.2 18.2a1.4 1.4 0 1 0 0.1 0",
    headset: "M5 13.5a7 7 0 0 1 14 0M5 13.5V17a2 2 0 0 0 2 2h1.2v-5.5H5zM19 13.5V17a2 2 0 0 1-2 2h-1.2v-5.5H19zM12 19.2v1.6",
    pair: "M4 8h6v10H4zM14 6h6v12h-6z",
    drum: "M7 8h10v9a5 5 0 0 1-10 0zM7 8a5 2.2 0 0 1 10 0",
    heat: "M8 5c2 2.4 2 4.2 0 6.6S6 16 8 19M12 5c2 2.4 2 4.2 0 6.6S10 16 12 19M16 5c2 2.4 2 4.2 0 6.6S14 16 16 19",
    sound: "M5 10v4h3l4 3V7L8 10zM16 9.5a3 3 0 0 1 0 5M18.2 7.5a6 6 0 0 1 0 9",
  }
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7 shrink-0 text-[#1f8a4c]" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={paths[name]} />
    </svg>
  )
}

function UspBarItem({ title, body, icon }: { title: string; body: string; icon: EditorialUspIcon }) {
  const singleLine = body.length <= 42
  return (
    <li className="flex shrink-0 items-center gap-2.5">
      <UspLineIcon name={icon} />
      <span>
        <span className="block whitespace-nowrap text-sm font-semibold leading-4 text-[#16315c]">{title}</span>
        <span className={`block text-xs leading-4 text-slate-500 ${singleLine ? "whitespace-nowrap" : "max-w-[16rem] whitespace-normal"}`}>{body}</span>
      </span>
    </li>
  )
}

function uspIconFor(title: string): EditorialUspIcon {
  const key = title.toLowerCase()
  if (key.includes("geluid")) return "sound"
  if (key.includes("energie") || key.includes("water") || key.includes("label")) return "leaf"
  if (key.includes("vul") || key.includes("couvert") || key.includes("gewicht") || key.includes("toer")) return "drum"
  if (key.includes("warm") || key.includes("droog") || key.includes("condens")) return "heat"
  if (key.includes("nis") || key.includes("breed") || key.includes("deur") || key.includes("apparaat") || key.includes("plaats")) return "pair"
  return "shield"
}

function CompactUspBar({
  id,
  presentation,
  items,
}: {
  id: string
  presentation?: CategoryCmsPresentation
  items: readonly EditorialUsp[]
}) {
  const row = (clone: boolean) => (
    <ul className={`flex shrink-0 items-center gap-8 pr-8 ${clone ? "" : "md:grid md:w-full md:grid-cols-4 md:gap-4 md:pr-0"}`} {...(clone ? { "data-usp-clone": "true", "aria-hidden": true } : {})}>
      {items.map((item) => (
        <UspBarItem key={`${item.id}${clone ? "-clone" : ""}`} title={item.title} body={item.body} icon={item.icon} />
      ))}
    </ul>
  )
  return (
    <Section id={id} presentation={presentation} className="bg-[#f3f6f4]" backgroundColor="#f3f6f4">
      <div className="em-usp-marquee-wrap md:hidden">
        <div className="em-usp-marquee">
          {row(false)}
          {row(true)}
        </div>
      </div>
      <div className="hidden md:block">{row(false)}</div>
    </Section>
  )
}

function Usps({
  block,
  locale,
  preview,
  slug,
  profile,
}: {
  block: Extract<CategoryCmsBlock, { type: "usp_bar" }>
  locale: StorefrontLocale
  preview: boolean
  slug: string
  profile: CategoryCmsProfile
}) {
  const editorialUsps = editorialUspBar(slug)
  if (editorialUsps) {
    return <CompactUspBar id={block.id} presentation={block.presentation} items={editorialUsps} />
  }
  if (profile === "level_3") {
    const items = block.slots.flatMap((slot) => {
      const title = text(slot.title, locale)
      const body = text(slot.body, locale)
      if (!title) return []
      return [{ id: slot.id, title, body, icon: uspIconFor(title) }]
    }).slice(0, 4)
    if (items.length > 0) {
      return <CompactUspBar id={block.id} presentation={block.presentation} items={items} />
    }
  }
  return (
    <Section id={block.id} presentation={block.presentation}>
      <ul className="grid items-start gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {block.slots.map((slot, index) => {
          const title = text(slot.title, locale)
          const body = text(slot.body, locale)
          if (!title && !body && !preview) return null
          return (
            <li key={slot.id} className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#e7f6ee] text-[#1f8a4c]" aria-hidden>
                <UspIcon title={title} />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold leading-5 text-[#16315c]">{title || (preview ? `USP ${index + 1}` : "")}</span>
                {body ? <span className="mt-0.5 block text-xs leading-5 text-slate-500">{body}</span> : null}
              </span>
            </li>
          )
        })}
      </ul>
    </Section>
  )
}

function campaignCreative(slot: LiveAdSlot): StorefrontAdCreative {
  const presentation = slot.banner_presentation
  return {
    id: String(slot.id),
    position: 1,
    location: "category",
    title: slot.headline || slot.name,
    headline: slot.headline || slot.name,
    description: slot.subline || "",
    ctaLabel: CTA_LABELS_NL[slot.cta_key] || "Bekijk",
    href: slot.destination_url || "/",
    linkType: "external",
    imageSrc: slot.image_url || "",
    imageAlt: slot.headline || slot.name,
    imageFit: "cover",
    imagePosition: presentation
      ? `${presentation.imagePositionX}% ${presentation.imagePositionY}%`
      : "50% 50%",
    textColor: presentation?.textColor,
    buttonColor: presentation?.textColor,
    logoSrc: slot.logo_url,
    designKey: slot.design_key,
    overlayAlign: presentation?.overlayAlign,
    logoScale: presentation?.logoScale,
    productIds: slot.product_ids ?? [],
    status: "Actief",
    source: "seller",
  }
}

function bannerLinkType(value: string): StorefrontAdCreative["linkType"] {
  if (
    value === "product" ||
    value === "category" ||
    value === "partner" ||
    value === "collection" ||
    value === "external"
  ) {
    return value
  }
  return "external"
}

function bannerCreative(banner: StoreCmsBanner, locale: StorefrontLocale): StorefrontAdCreative {
  const title = pickLocalized(banner.title, locale)
  const presentation = banner.presentation
  return {
    id: banner.id,
    position: 1,
    location: "category",
    title,
    headline: title,
    description: pickLocalized(banner.subtitle, locale),
    ctaLabel: pickLocalized(banner.cta_label, locale),
    href: banner.destination_url || "/",
    linkType: bannerLinkType(banner.link_type),
    imageSrc: banner.image_url || "",
    imageAlt: pickLocalized(banner.image_alt, locale) || title,
    background: banner.background || undefined,
    imageFit: presentation?.fit === "contain" ? "contain" : "cover",
    imagePosition:
      presentation?.positionX != null && presentation.positionY != null
        ? `${presentation.positionX}% ${presentation.positionY}%`
        : "50% 50%",
    imageScale: presentation?.scale,
    textColor: presentation?.textColor,
    buttonColor: presentation?.buttonColor,
    logoSrc: banner.logo_url,
    status: "Actief",
    source: "platform",
  }
}

function creativeForPosition(
  position: CategoryCmsAdPosition,
  campaign: LiveAdSlot | null,
  banners: StoreCmsBanner[],
  locale: StorefrontLocale
): StorefrontAdCreative | null {
  const banner = position.banner_id
    ? banners.find((row) => row.id === position.banner_id) ?? null
    : null
  const source = selectCategoryAdSource(position, Boolean(campaign), Boolean(banner))
  if (source === "campaign" && campaign) return campaignCreative(campaign)
  if (source === "banner" && banner) return bannerCreative(banner, locale)
  return null
}

function CategoryAd({
  sectionId,
  position,
  presentation,
  campaign,
  banners,
  locale,
}: {
  sectionId: string
  position: CategoryCmsAdPosition
  presentation?: CategoryCmsPresentation
  campaign: LiveAdSlot | null
  banners: StoreCmsBanner[]
  locale: StorefrontLocale
}) {
  const creative = creativeForPosition(position, campaign, banners, locale)
  if (!creative) return null
  const label = creative.source === "seller" ? "Gesponsord" : "Advertentie"
  return (
    <section data-cms-section={sectionId} className="px-4 py-4 sm:px-6" style={styleOf(presentation)}>
      {creative.source === "seller" ? (
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      ) : null}
      <AdSlot position={1} location="category" creative={creative} locale={locale} adLabel={label} flush />
    </section>
  )
}

function rankedCategoryChildren(
  block: Extract<CategoryCmsBlock, { type: "subcategory_tiles" | "product_group_tiles" }>,
  children: CategoryV2Child[],
  locale: StorefrontLocale
): CategoryV2Child[] {
  const wanted = new Set(block.include_slugs)
  const pool = wanted.size ? children.filter((child) => wanted.has(child.slug)) : children
  const ranked = wanted.size
    ? pool
    : [...pool].sort(
        (left, right) =>
          right.productCount - left.productCount || left.name.localeCompare(right.name, locale)
      )
  return ranked.slice(0, block.max_items || 12)
}

function Tiles({
  block,
  locale,
  categoryName,
  children,
  products,
  preview,
  profile,
  slug,
}: {
  block: Extract<CategoryCmsBlock, { type: "subcategory_tiles" | "product_group_tiles" }>
  locale: StorefrontLocale
  categoryName: string
  children: CategoryV2Child[]
  products: ListingProduct[]
  preview: boolean
  profile: CategoryCmsProfile
  slug: string
}) {
  const heading = text(block.title, locale) || (block.type === "subcategory_tiles"
    ? `Ontdek onze categorieën binnen ${categoryName}`
    : "Ontdek de productgroepen")
  const level1Grid = profile === "level_1" && block.type === "subcategory_tiles"
  const lifestyleGroups = slug === "was-droog" && block.type === "product_group_tiles"
  if (level1Grid || lifestyleGroups) {
    const ordered = level1Grid ? children : orderSubcategoriesWithAggregateFirst(rankedCategoryChildren(block, children, locale))
    return (
      <Section id={block.id} presentation={block.presentation}>
        <h2 className="text-xl font-bold text-[#16315c]">{heading}</h2>
        {ordered.length === 0 ? <div className="mt-3"><Empty preview={preview} label="Geen onderliggende categorieën in Product Cloud." /></div> : (
          <Level1TileGrid block={block} children={ordered} />
        )}
      </Section>
    )
  }
  const rows = rankedCategoryChildren(block, children, locale)
  const cols = columnsOf(block.presentation, 4)
  return (
    <Section id={block.id} presentation={block.presentation}>
      <h2 className="text-xl font-bold text-[#16315c]">{heading}</h2>
      {rows.length === 0 ? <div className="mt-3"><Empty preview={preview} label="Geen onderliggende categorieën in Product Cloud." /></div> : (
        <ul className={`mt-3 grid items-stretch gap-3 ${cols === 2 ? "grid-cols-2" : cols === 3 ? "grid-cols-2 lg:grid-cols-3" : "grid-cols-2 lg:grid-cols-4"}`}>
          {rows.map((child) => {
            const image = block.tile_images?.find((row) => row.slug === child.slug)?.image
            const fallback = image?.url
              ? null
              : representativeCategoryImage(imageSources(products), child.slug)
            const scene = image?.url || fallback?.imageUrl ? null : categoryAtmosphere(child.slug, "hero")
            const imageUrl = image?.url || fallback?.imageUrl || scene?.src
            const fit = image?.frame?.fit ?? (scene ? "cover" : "contain")
            return (
            <li key={child.slug} className="min-w-0">
              <Link href={`/categorie/${child.slug}`} prefetch={false} className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                <span className="relative mb-3 block aspect-[4/3] overflow-hidden rounded-xl bg-slate-50">
                  {imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={imageUrl} alt="" className={`absolute inset-0 h-full w-full ${fit === "cover" ? "object-cover" : "object-contain p-3"}`} style={{ objectFit: fit }} />
                  ) : null}
                </span>
                <span className="block text-sm font-semibold leading-5 text-[#16315c]">{child.name}</span>
                <span className="mt-0.5 block text-xs text-slate-500">{tileCountLabel(child, locale)}</span>
              </Link>
            </li>
            )
          })}
        </ul>
      )}
    </Section>
  )
}

function Level1TileGrid({
  block,
  children,
}: {
  block: Extract<CategoryCmsBlock, { type: "subcategory_tiles" | "product_group_tiles" }>
  children: CategoryV2Child[]
}) {
  const sizes = level1CategoryTileRows(children.length)
  const rows: CategoryV2Child[][] = []
  let cursor = 0
  for (const size of sizes) {
    rows.push(children.slice(cursor, cursor + size))
    cursor += size
  }
  return (
    <>
      <ul className="mt-3 grid grid-cols-2 gap-2 tablet:grid-cols-3 desktop:hidden">
        {children.map((child) => (
          <li key={child.slug} className="min-w-0">
            <Level1Tile block={block} child={child} />
          </li>
        ))}
      </ul>
      <div className="mt-3 hidden flex-col gap-2.5 desktop:flex">
        {rows.map((row) => (
          <ul
            key={row.map((child) => child.slug).join("-")}
            className="grid gap-2.5"
            style={{ gridTemplateColumns: `repeat(${row.length}, minmax(0, 1fr))` }}
          >
            {row.map((child) => (
              <li key={child.slug} className="min-w-0">
                <Level1Tile block={block} child={child} />
              </li>
            ))}
          </ul>
        ))}
      </div>
    </>
  )
}

function Level1Tile({
  block,
  child,
}: {
  block: Extract<CategoryCmsBlock, { type: "subcategory_tiles" | "product_group_tiles" }>
  child: CategoryV2Child
}) {
  const cmsUrl = block.tile_images?.find((row) => row.slug === child.slug)?.image?.url
  const [missing, setMissing] = useState(false)
  const automatic = child.imageUrl === undefined && !missing ? categoryTilePublicPath(child.slug) : null
  const imageUrl = cmsUrl || child.imageUrl || automatic
  return (
    <Link href={`/categorie/${child.slug}`} prefetch={false} className="flex h-full flex-col rounded-xl border border-slate-200 bg-white p-1.5 shadow-sm">
      <span className="relative block aspect-[1.75/1] overflow-hidden rounded-lg bg-[#f4f6f8]">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover object-center"
            decoding="async"
            onError={() => {
              if (!cmsUrl && !child.imageUrl) setMissing(true)
            }}
          />
        ) : null}
      </span>
      <span className="mt-1 flex items-start justify-between gap-1 px-0.5 pb-0.5">
        <span className="min-w-0 text-[13px] font-bold leading-4 text-[#16315c]">{child.name}</span>
        <span aria-hidden className="shrink-0 text-sm leading-4 text-slate-400">→</span>
      </span>
    </Link>
  )
}

function Products({
  block,
  locale,
  categoryName,
  categorySlug,
  products,
  preview,
  filterAttributes,
}: {
  block: Extract<CategoryCmsBlock, { type: "product_carousel" | "product_grid" }>
  locale: StorefrontLocale
  categoryName: string
  categorySlug: string
  products: ListingProduct[]
  preview: boolean
  filterAttributes?: ProductCloudStoreAttribute[]
}) {
  const cmsTitle = text(block.title, locale)
  if (block.type === "product_carousel") {
    const shelf = selectCategoryShelf(products, categorySlug, 15)
    if (shelf.length === 0 && !preview) return null
    const heading = cmsTitle || popularProductsHeading(locale)
    return (
      <Section id={block.id} presentation={block.presentation}>
        <h2 className="text-xl font-bold text-[#16315c]">{heading}</h2>
        {shelf.length === 0 ? <div className="mt-3"><Empty preview={preview} label="Geen producten met een aanbod in deze categorie." /></div> : (
          <HorizontalStrip prevLabel={t("prevProducts", locale)} nextLabel={t("nextProducts", locale)}>
            {shelf.map((product) => (
              <li
                key={product.slug}
                className="w-[calc((100%-0.5rem)/2)] shrink-0 snap-start tablet:w-[calc((100%-1rem)/3)] desktop:w-[calc((100%-2.5rem)/6)]"
              >
                <ProductCarouselCard product={product} layout="grid" locale={locale} />
              </li>
            ))}
          </HorizontalStrip>
        )}
      </Section>
    )
  }
  const heading = cmsTitle || defaultProductHeading(block.type, categoryName, locale)
  const rows = sortCategoryV2Products(products, block.sort).slice(0, block.limit || 4)
  const cols = columnsOf(block.presentation, block.type === "product_grid" ? 3 : 4)
  return (
    <Section id={block.id} presentation={block.presentation}>
      <h2 className="text-xl font-bold text-[#16315c]">{heading}</h2>
      {rows.length === 0 ? <div className="mt-3"><Empty preview label="Geen producten met een aanbod in deze categorie." /></div> : (
        <ul className={`mt-4 grid items-stretch gap-3 ${cols === 2 ? "sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-3"} ${cols === 4 ? "xl:grid-cols-4" : ""}`}>
          {rows.map((product) => (
            <li key={product.slug} className="min-w-0">
              <ProductCarouselCard product={product} layout="grid" locale={locale} />
            </li>
          ))}
        </ul>
      )}
    </Section>
  )
}

function popularProductsHeading(locale: StorefrontLocale): string {
  if (locale === "en") return "Popular products"
  if (locale === "de") return "Beliebte Produkte"
  if (locale === "fr") return "Produits populaires"
  return "Populaire producten"
}

function brandScrollLabel(direction: "prev" | "next", locale: StorefrontLocale): string {
  if (direction === "prev") {
    if (locale === "en") return "Previous brands"
    if (locale === "de") return "Vorherige Marken"
    if (locale === "fr") return "Marques précédentes"
    return "Vorige merken"
  }
  if (locale === "en") return "Next brands"
  if (locale === "de") return "Nächste Marken"
  if (locale === "fr") return "Marques suivantes"
  return "Volgende merken"
}

function HorizontalStrip({
  prevLabel,
  nextLabel,
  children,
}: {
  prevLabel: string
  nextLabel: string
  children: ReactNode
}) {
  const scroller = useRef<HTMLUListElement>(null)
  const [edges, setEdges] = useState({ left: false, right: false })

  function sync() {
    const node = scroller.current
    if (!node) return
    const max = node.scrollWidth - node.clientWidth
    setEdges({ left: node.scrollLeft > 4, right: max - node.scrollLeft > 4 })
  }

  useEffect(() => {
    const node = scroller.current
    if (!node) return
    sync()
    const observer = new ResizeObserver(() => sync())
    observer.observe(node)
    return () => observer.disconnect()
  }, [children])

  function move(direction: number) {
    const node = scroller.current
    if (!node) return
    node.scrollBy({ left: direction * Math.max(node.clientWidth * 0.8, 180), behavior: "smooth" })
  }

  return (
    <div className="relative mt-4">
      {edges.left ? (
        <button
          type="button"
          className="absolute left-0 top-1/2 z-10 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-lg text-[#16315c] shadow-sm tablet:flex"
          aria-label={prevLabel}
          onClick={() => move(-1)}
        >
          <span aria-hidden>‹</span>
        </button>
      ) : null}
      {edges.right ? (
        <button
          type="button"
          className="absolute right-0 top-1/2 z-10 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-lg text-[#16315c] shadow-sm tablet:flex"
          aria-label={nextLabel}
          onClick={() => move(1)}
        >
          <span aria-hidden>›</span>
        </button>
      ) : null}
      <ul
        ref={scroller}
        onScroll={sync}
        className="flex snap-x snap-mandatory items-stretch gap-2 overflow-x-auto scroll-smooth pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </ul>
    </div>
  )
}

function defaultProductHeading(
  type: "product_carousel" | "product_grid",
  categoryName: string,
  locale: StorefrontLocale
): string {
  if (type === "product_carousel") {
    if (locale === "en") return `Popular in ${categoryName}`
    if (locale === "de") return `Beliebt in ${categoryName}`
    if (locale === "fr") return `Populaire dans ${categoryName}`
    return `Populair in ${categoryName}`
  }
  return categoryName || "Producten"
}

function defaultBrandHeading(categoryName: string, locale: StorefrontLocale): string {
  if (locale === "en") return `European brands in ${categoryName}`
  if (locale === "de") return `Europäische Marken in ${categoryName}`
  if (locale === "fr") return `Marques européennes dans ${categoryName}`
  return `Europese merken in ${categoryName}`
}

function brandCountLabel(count: number, locale: StorefrontLocale): string {
  if (locale === "en") return count === 1 ? "1 product" : `${count} products`
  if (locale === "de") return count === 1 ? "1 Produkt" : `${count} Produkte`
  if (locale === "fr") return count === 1 ? "1 produit" : `${count} produits`
  return count === 1 ? "1 product" : `${count} producten`
}

function availabilityLabel(
  sellable: number,
  testCount: number,
  grouped: number | null,
  locale: StorefrontLocale
): string {
  const shown = sellable + testCount
  if (shown > 0) return brandCountLabel(shown, locale)
  if (grouped != null && grouped > 0) return brandCountLabel(grouped, locale)
  return brandCountLabel(0, locale)
}

function tileCountLabel(child: CategoryV2Child, locale: StorefrontLocale): string {
  if (child.sellableCount == null && child.testCount == null) {
    return brandCountLabel(child.productCount, locale)
  }
  return availabilityLabel(child.sellableCount ?? 0, child.testCount ?? 0, child.productCount, locale)
}

function Brands({
  block,
  locale,
  categoryName,
  products,
  preview,
}: {
  block: Extract<CategoryCmsBlock, { type: "brand_overview" }>
  locale: StorefrontLocale
  categoryName: string
  products: ListingProduct[]
  preview: boolean
}) {
  const requested = Number.isFinite(block.max_items) && block.max_items > 0 ? Math.floor(block.max_items) : 15
  const cards = selectCategoryBrands(
    products.map((product) => ({
      id: product.slug,
      brandId: product.brandId,
      brandName: product.brand,
      brandSlug: product.brandSlug,
      logoUrl: product.brandLogoUrl || localBrandLogo(product.brandSlug, product.brand),
      brandPagePublished: product.brandPagePublished,
    })),
    Math.min(15, requested)
  )
  const heading = text(block.title, locale) || defaultBrandHeading(categoryName, locale)
  if (cards.length === 0 && !preview) return null
  return (
    <Section id={block.id} presentation={block.presentation}>
      <h2 className="text-xl font-bold text-[#16315c]">{heading}</h2>
      {cards.length === 0 ? <div className="mt-3"><Empty preview={preview} label="Geen merken in deze categorie." /></div> : (
        <HorizontalStrip prevLabel={brandScrollLabel("prev", locale)} nextLabel={brandScrollLabel("next", locale)}>
          {cards.map((brand) => {
            const body = brand.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={brand.logoUrl} alt={brand.name} className="mx-auto h-20 w-full object-contain" />
            ) : (
              <p className="break-words text-base font-semibold text-[#16315c]">{brand.name}</p>
            )
            return (
              <li
                key={brand.id}
                className="flex h-28 w-[calc((100%-0.5rem)/2)] shrink-0 snap-start flex-col justify-center rounded-xl border border-slate-200 bg-white px-4 py-3 text-center tablet:w-[calc((100%-1rem)/3)] desktop:w-[calc((100%-2rem)/5)]"
              >
                {brand.href ? (
                  <Link href={brand.href} className="block min-w-0">{body}</Link>
                ) : body}
              </li>
            )
          })}
        </HorizontalStrip>
      )}
    </Section>
  )
}

function AtmosphereBanner({
  slug,
  slot,
  title,
  body,
  lines,
  ctaHref,
  ctaLabel,
  layout = "overlay",
  imageFirst = false,
}: {
  slug: string
  slot: "hero" | "why" | "know" | "advice"
  title: string
  body?: string
  lines?: string[]
  ctaHref?: string
  ctaLabel?: string
  layout?: "overlay" | "split"
  imageFirst?: boolean
}) {
  const scene = categoryAtmosphere(slug, slot)
  if (layout === "split") {
    return (
      <div className="grid overflow-hidden rounded-2xl border border-slate-200 bg-white md:grid-cols-2">
        <div className={`flex flex-col justify-center p-6 sm:p-8 ${imageFirst ? "md:order-2" : ""}`}>
          <h2 className="text-2xl font-bold tracking-tight text-[#16315c]">{title}</h2>
          {body ? <p className="mt-2 max-w-lg text-sm leading-6 text-slate-600">{body}</p> : null}
          {lines && lines.length > 0 ? (
            <ul className="mt-3 max-w-lg space-y-2 text-sm leading-6 text-slate-600">
              {lines.map((line) => (
                <li key={line} className="flex gap-2">
                  <span className="mt-0.5 text-[#1f8a4c]" aria-hidden><UspIcon title={line} /></span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          ) : null}
          {ctaHref && ctaLabel ? (
            <Link href={ctaHref} prefetch={false} className="mt-4 inline-flex w-fit rounded-full bg-[#1f8a4c] px-4 py-2 text-sm font-semibold text-white">
              {ctaLabel}
            </Link>
          ) : null}
        </div>
        <div className={`relative min-h-56 bg-[#16315c] md:min-h-[18rem] ${imageFirst ? "md:order-1" : ""}`}>
          {scene ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={scene.src} alt={scene.alt} className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: scene.position }} />
          ) : null}
        </div>
      </div>
    )
  }
  const alignRight = scene?.align === "right"
  const scrim = alignRight
    ? "linear-gradient(270deg, rgba(22,49,92,0.94) 0%, rgba(22,49,92,0.82) 38%, rgba(22,49,92,0.42) 64%, rgba(22,49,92,0.1) 100%)"
    : "linear-gradient(105deg, rgba(22,49,92,0.94) 0%, rgba(22,49,92,0.82) 36%, rgba(22,49,92,0.4) 62%, rgba(22,49,92,0.1) 100%)"
  return (
    <div className="relative isolate min-h-[18rem] overflow-hidden rounded-2xl bg-[#16315c] md:min-h-[23rem]">
      {scene ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={scene.src}
          alt={scene.alt}
          className="absolute inset-0 h-full w-full object-cover"
          style={{ objectPosition: scene.position }}
        />
      ) : null}
      <div
        className="absolute inset-0"
        aria-hidden
        style={{
          background: `${scrim}, linear-gradient(to top, rgba(22,49,92,0.78) 0%, rgba(22,49,92,0.15) 48%, rgba(22,49,92,0) 70%)`,
        }}
      />
      <div
        className={`relative z-10 flex min-h-[18rem] max-w-xl flex-col justify-end px-5 py-6 text-white md:min-h-[23rem] md:justify-center md:px-8 md:py-8 ${
          alignRight ? "md:ml-auto md:items-end md:text-right" : "md:items-start"
        }`}
      >
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h2>
        {body ? <p className="mt-2 max-w-lg text-sm leading-6 text-white/90">{body}</p> : null}
        {lines && lines.length > 0 ? (
          <ul className="mt-3 max-w-lg space-y-2 text-sm leading-6 text-white/90">
            {lines.map((line) => (
              <li key={line} className={`flex gap-2 ${alignRight ? "md:flex-row-reverse md:text-right" : ""}`}>
                <span className="mt-0.5 text-[#b7ebc9]" aria-hidden><UspIcon title={line} /></span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
        ) : null}
        {ctaHref && ctaLabel ? (
          <Link href={ctaHref} prefetch={false} className="mt-4 inline-flex w-fit rounded-full bg-[#1f8a4c] px-4 py-2 text-sm font-semibold text-white">
            {ctaLabel}
          </Link>
        ) : null}
      </div>
    </div>
  )
}

function localBrandLogo(slug: string | null | undefined, name: string | null | undefined): string {
  const key = `${slug || ""} ${name || ""}`.trim().toLowerCase()
  if (key.includes("miele")) return "/brands/miele.svg"
  return ""
}

const WHY_POINTS = [
  "Alleen in Europa geproduceerd.",
  "Transparante herkomst.",
  "Europese merken en verkopers.",
]

function CompactWhy({ slug }: { slug: string }) {
  const scene = categoryAtmosphere(slug, "why")
  return (
    <div className="grid overflow-hidden rounded-2xl border border-slate-200 bg-white md:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)]">
      <div className="relative h-36 bg-[#16315c] md:h-auto md:min-h-[168px]">
        {scene ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={scene.src} alt={scene.alt} className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: scene.position }} />
        ) : null}
      </div>
      <div className="flex flex-col justify-center px-4 py-4 sm:px-5">
        <h2 className="text-lg font-bold text-[#16315c]">Waarom EuropMade?</h2>
        <p className="mt-1 max-w-xl text-sm leading-5 text-slate-600">
          EuropMade is een marketplace voor aanbod van Europese bedrijven. Herkomst en verkoper staan bij het product wanneer ze in het dossier zijn vastgelegd.
        </p>
        <ul className="mt-2 space-y-1 text-sm text-slate-700">
          {WHY_POINTS.map((point) => (
            <li key={point} className="flex items-start gap-2">
              <svg viewBox="0 0 16 16" className="mt-0.5 h-4 w-4 shrink-0 text-[#1f8a4c]" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M3.5 8.5 6.5 11.5 12.5 4.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>{point}</span>
            </li>
          ))}
        </ul>
        <Link href="/waarom-kopen" prefetch={false} className="mt-3 inline-flex w-fit rounded-full bg-[#1f8a4c] px-4 py-2 text-sm font-semibold text-white">
          Ons verhaal
        </Link>
      </div>
    </div>
  )
}

function Story({
  block,
  locale,
  preview,
  slug,
}: {
  block: Extract<CategoryCmsBlock, { type: "why_europmade" | "intro" | "seo_content" }>
  locale: StorefrontLocale
  preview: boolean
  slug: string
}) {
  if (block.type === "why_europmade") {
    return (
      <Section id={block.id} presentation={block.presentation}>
        <CompactWhy slug={slug} />
      </Section>
    )
  }
  const title =
    block.type === "intro"
      ? "Goed om te weten"
      : text(block.title, locale) || "Goed om te weten"
  const body = text(block.body, locale)
  const lines = body.split("\n").map((line) => line.trim()).filter(Boolean)
  if (!body && !preview) return null
  if (block.type === "intro") {
    return (
      <Section id={block.id} presentation={block.presentation}>
        <AtmosphereBanner
          slug={slug}
          slot="know"
          layout="split"
          title={title}
          lines={lines}
        />
        {lines.length === 0 ? <div className="mt-3"><Empty preview={preview} label="Nog geen tekst." /></div> : null}
      </Section>
    )
  }
  return (
    <Section id={block.id} presentation={block.presentation}>
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-xl font-bold text-[#16315c]">{title}</h2>
        {body ? <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-700">{body}</p> : <Empty preview={preview} label="Nog geen tekst. Europese herkomst wordt niet ingevuld zonder Product Cloud-feit." />}
      </div>
    </Section>
  )
}

function Choice({
  block,
  locale,
  preview,
  products,
  filterAttributes,
  onApplyListing,
  slug,
}: {
  block: Extract<CategoryCmsBlock, { type: "choice_assistant_cta" }>
  locale: StorefrontLocale
  preview: boolean
  products: ListingProduct[]
  filterAttributes?: ProductCloudStoreAttribute[]
  onApplyListing: (selection: Record<string, CategoryV2FilterSelection>) => void
  slug: string
}) {
  const title = text(block.title, locale)
  const body = text(block.body, locale)
  const cta = text(block.cta_label, locale)
  const editorialHref = categoryCmsOptionalLink(block.cta_label, block.href)
  const previewCatalog = preview && products.some((product) => product.previewStatus === "concept")
  const choiceMode = previewCatalog ? "preview_catalog" : "storefront"
  const plan = planChoiceAssistant({
    products,
    attributes: (filterAttributes ?? [])
      .filter((attribute) => attribute.code?.trim())
      .map((attribute) => ({
        code: attribute.code as string,
        name: attribute.name,
        dataType: attribute.data_type,
        comparable: attribute.is_comparable,
      })),
    questionCodes: block.question_codes,
    mode: choiceMode,
  })
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const matches = plan.ready ? choiceAssistantMatches(products, answers, choiceMode) : []
  const answered = plan.questions.every((question) => answers[question.code])
  if (!title && !body && !plan.ready && !preview) return null
  const scene = categoryAtmosphere(slug, "choice") ?? categoryAtmosphere(slug, "advice")
  const editorialLeadsElsewhere = Boolean(editorialHref && !editorialHref.startsWith("#"))
  return (
    <Section id={block.id} presentation={block.presentation}>
      <div className="grid overflow-hidden rounded-2xl border border-[#d7eadf] bg-[#f4fbf7] md:grid-cols-[1.15fr_0.85fr]">
        <div className="p-5 sm:p-6">
          <h2 className="text-lg font-bold text-[#16315c]">{title || "Keuzehulp"}</h2>
          {body ? <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">{body}</p> : preview ? <Empty preview label="Nog geen keuzehulptekst." /> : null}
          {plan.message && !editorialLeadsElsewhere ? <p className="mt-2 text-sm leading-6 text-slate-600">{plan.message}</p> : null}
          {plan.source === "preview_catalog" ? (
            <p className="mt-2 text-sm text-slate-600">{t("conceptChoiceNotice", locale)}</p>
          ) : null}
          {cta && editorialHref && (!plan.ready || editorialLeadsElsewhere) ? (
            <Link href={editorialHref} prefetch={false} className="mt-4 inline-flex shrink-0 justify-center rounded-full bg-[#1f8a4c] px-4 py-2.5 text-sm font-semibold text-white">{cta}</Link>
          ) : null}
        </div>
        <div className="relative min-h-48 bg-[#16315c]">
          {scene ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={scene.src} alt="" className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: scene.position }} />
          ) : null}
        </div>
      </div>
      {plan.ready ? (
        <div className="mt-4 space-y-4">
          {plan.questions.map((question, index) => (
            <fieldset key={question.code} className={index === step ? "block" : "hidden md:block"}>
              <legend className="text-sm font-semibold text-[#16315c]">{index + 1}. {question.label}</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {question.options.map((option) => {
                  const selected = answers[question.code] === option.value
                  return (
                    <button
                      key={option.value}
                      type="button"
                      className={`rounded-full border px-3 py-1.5 text-sm ${selected ? "border-[#1f8a4c] bg-[#e7f6ee] text-[#16315c]" : "border-slate-300 bg-white text-slate-700"}`}
                      onClick={() => {
                        setAnswers((current) => ({ ...current, [question.code]: option.value }))
                        setStep(Math.min(plan.questions.length - 1, index + 1))
                      }}
                    >
                      {option.label} ({option.count})
                    </button>
                  )
                })}
              </div>
            </fieldset>
          ))}
          {answered && matches.length === 0 ? (
            <p className="text-sm text-slate-600">Geen product in dit assortiment past bij deze antwoorden.</p>
          ) : null}
          {answered && matches.length > 0 ? (
            <div>
              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {matches.slice(0, 3).map((product) => {
                  const concept = product.previewStatus === "concept" || product.offerCount <= 0 || product.priceCents <= 0
                  return (
                    <li key={product.slug} className="min-w-0">
                      {concept ? (
                        <div className="block rounded-xl border border-slate-200 bg-white p-3 text-sm font-semibold text-[#16315c]">
                          <span className="mb-1 block text-[11px] font-semibold text-slate-500">{t("conceptProduct", locale)}</span>
                          {product.title}
                          <span className="mt-1 block text-xs font-normal text-slate-500">{t("conceptPriceMissing", locale)}</span>
                        </div>
                      ) : (
                        <ProductCarouselCard product={product} layout="grid" locale={locale} />
                      )}
                    </li>
                  )
                })}
              </ul>
              <button
                type="button"
                className="mt-3 rounded-full bg-[#1f8a4c] px-4 py-2 text-sm font-semibold text-white"
                onClick={() =>
                  onApplyListing(
                    Object.fromEntries(
                      plan.questions
                        .filter((question) => answers[question.code])
                        .map((question) => [question.code, { values: [answers[question.code]!] }])
                    )
                  )
                }
              >
                Toon {matches.length} passende producten
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
      {block.cards && block.cards.length > 0 ? (
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {block.cards.map((card) => (
            <li key={card.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              {card.image?.url ? (
                <FramedPhoto url={card.image.url} alt={text(card.image.alt, locale) || text(card.label, locale)} frame={card.image.frame ?? { ratio: "1:1", fit: "cover" }} />
              ) : null}
              <p className="px-3 py-2 text-sm font-semibold text-[#16315c]">{text(card.label, locale)}</p>
            </li>
          ))}
        </ul>
      ) : null}
    </Section>
  )
}

function PhaseNav({
  block,
  locale,
  pageBlocks,
  preview,
}: {
  block: Extract<CategoryCmsBlock, { type: "phase_navigation" }>
  locale: StorefrontLocale
  pageBlocks: CategoryCmsBlock[]
  preview: boolean
}) {
  const phases = block.phases.flatMap((phase) => {
    const label = text(phase.label, locale)
    const target = pageBlocks.find((item) => item.type === phase.anchor_block_type && item.visible !== false)
    if (!label || !target) return []
    return [{ id: phase.id, label, href: `#${target.id}` }]
  })
  if (phases.length === 0) {
    return preview ? <Section id={block.id}><Empty preview label="Fasebalk heeft nog geen labels met een bestaand blok." /></Section> : null
  }
  return (
    <Section id={block.id} presentation={block.presentation}>
      <ol className="sticky top-0 z-10 flex gap-2 overflow-x-auto rounded-full bg-white/95 p-1 text-sm">
        {phases.map((phase, index) => (
          <li key={phase.id}>
            <a href={phase.href} className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[#16315c] hover:bg-[#e7f6ee]">
              <span className="font-semibold text-[#1f8a4c]">{index + 1}</span>
              {phase.label}
            </a>
          </li>
        ))}
      </ol>
    </Section>
  )
}

function Shortcuts({
  block,
  locale,
  products,
  preview,
  onApplyListing,
}: {
  block: Extract<CategoryCmsBlock, { type: "shortcuts" }>
  locale: StorefrontLocale
  products: ListingProduct[]
  preview: boolean
  onApplyListing: (selection: Record<string, CategoryV2FilterSelection>) => void
}) {
  const items = block.items.flatMap((item) => {
    const label = text(item.label, locale)
    if (!label) return []
    const specCode = item.spec_code.trim()
    const specValue = item.spec_value.trim()
    if (specCode && specValue) {
      const live = products.some(
        (product) =>
          product.offerCount > 0 &&
          product.priceCents > 0 &&
          (product.specs ?? []).some(
            (spec) => spec.code.trim().toLowerCase() === specCode.toLowerCase() && spec.value.trim().toLowerCase() === specValue.toLowerCase()
          )
      )
      if (!live) return []
      return [{ id: item.id, label, specCode, specValue, href: "" }]
    }
    const slug = item.category_slug.trim()
    if (!slug) return []
    return [{ id: item.id, label, specCode: "", specValue: "", href: `/categorie/${slug}` }]
  })
  if (items.length === 0) {
    return preview ? <Section id={block.id}><Empty preview label="Snelkoppelingen verschijnen alleen bij een bestaande categorie of een specificatie met verkoopbaar aanbod." /></Section> : null
  }
  return (
    <Section id={block.id} presentation={block.presentation}>
      {text(block.title, locale) ? <h2 className="mb-2 text-sm font-bold text-[#16315c]">{text(block.title, locale)}</h2> : null}
      <ul className="flex gap-2 overflow-x-auto">
        {items.map((item) => (
          <li key={item.id}>
            {item.href ? (
              <Link href={item.href} prefetch={false} className="inline-block rounded-full border border-slate-300 px-3 py-1.5 text-sm text-[#16315c]">{item.label}</Link>
            ) : (
              <button
                type="button"
                className="rounded-full border border-slate-300 px-3 py-1.5 text-sm text-[#16315c]"
                onClick={() => onApplyListing({ [item.specCode]: { values: [item.specValue] } })}
              >
                {item.label}
              </button>
            )}
          </li>
        ))}
      </ul>
    </Section>
  )
}

function Featured({
  block,
  locale,
  products,
  preview,
}: {
  block: Extract<CategoryCmsBlock, { type: "featured_product" }>
  locale: StorefrontLocale
  products: ListingProduct[]
  preview: boolean
}) {
  const product = products.find(
    (item) => item.slug === block.product_id.trim() && item.offerCount > 0 && item.priceCents > 0
  )
  const motivation = text(block.motivation, locale)
  if (!product) {
    return preview ? <Section id={block.id}><Empty preview label="Het uitgelichte product zit niet in het verkoopbare aanbod." /></Section> : null
  }
  return (
    <Section id={block.id} presentation={block.presentation}>
      <h2 className="text-lg font-bold text-[#16315c]">{text(block.title, locale) || "Uitgelicht"}</h2>
      {motivation ? <p className="mt-1 max-w-sm text-xs text-slate-600">{motivation}</p> : null}
      <div className="mt-3 max-w-[220px]">
        <ProductCarouselCard product={product} layout="grid" locale={locale} />
      </div>
    </Section>
  )
}

function Inspiration({
  block,
  locale,
  preview,
}: {
  block: Extract<CategoryCmsBlock, { type: "inspiration" }>
  locale: StorefrontLocale
  preview: boolean
}) {
  const items = block.items.filter((item) => text(item.title, locale) && item.href.trim())
  if (items.length === 0) {
    return preview ? <Section id={block.id}><Empty preview label="Inspiratiekaarten hebben een titel en een bestaande link nodig." /></Section> : null
  }
  return (
    <Section id={block.id} presentation={block.presentation}>
      {text(block.title, locale) ? <h2 className="text-xl font-bold text-[#16315c]">{text(block.title, locale)}</h2> : null}
      <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <li key={item.id}>
            <Link href={item.href} className="block overflow-hidden rounded-xl border border-slate-200 bg-white">
              {item.image?.url ? (
                <FramedPhoto url={item.image.url} alt={text(item.image.alt, locale) || text(item.title, locale)} frame={item.image.frame ?? { ratio: "16:9", fit: "cover" }} />
              ) : null}
              <span className="block px-3 py-2">
                <span className="block text-sm font-semibold text-[#16315c]">{text(item.title, locale)}</span>
                {categoryCmsLocalizedHasText(item.summary) ? <span className="mt-1 block text-xs text-slate-600">{text(item.summary, locale)}</span> : null}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </Section>
  )
}

function Maintenance({
  block,
  locale,
  preview,
}: {
  block: Extract<CategoryCmsBlock, { type: "maintenance" }>
  locale: StorefrontLocale
  preview: boolean
}) {
  const steps = block.steps.filter((step) => text(step.frequency, locale) || text(step.body, locale))
  if (steps.length === 0) {
    return preview ? <Section id={block.id}><Empty preview label="Onderhoudsstappen zijn nog leeg." /></Section> : null
  }
  return (
    <Section id={block.id} presentation={block.presentation}>
      <h2 className="text-xl font-bold text-[#16315c]">{text(block.title, locale) || "Onderhoud"}</h2>
      <ol className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((step) => (
          <li key={step.id} className="rounded-xl border border-slate-200 bg-white p-3">
            <p className="text-sm font-semibold text-[#1f8a4c]">{text(step.frequency, locale)}</p>
            {text(step.body, locale) ? <p className="mt-1 text-sm text-slate-700">{text(step.body, locale)}</p> : null}
          </li>
        ))}
      </ol>
    </Section>
  )
}

function BrandStory({
  block,
  locale,
  products,
  preview,
}: {
  block: Extract<CategoryCmsBlock, { type: "brand_story" }>
  locale: StorefrontLocale
  products: ListingProduct[]
  preview: boolean
}) {
  const title = text(block.title, locale)
  const body = text(block.body, locale)
  const slug = block.brand_slug?.trim().toLowerCase() ?? ""
  const brand = products.find((product) => product.brandSlug?.trim().toLowerCase() === slug)
  const href = categoryBrandHref(slug, brand?.brandPagePublished)
  if (!title && !body) {
    return preview ? <Section id={block.id}><Empty preview label="Merkverhaal is nog leeg." /></Section> : null
  }
  return (
    <Section id={block.id} presentation={block.presentation}>
      <h2 className="text-xl font-bold text-[#16315c]">{title || "Merkverhaal"}</h2>
      {body ? <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-700">{body}</p> : null}
      {href && brand ? (
        <Link href={href} className="mt-3 inline-block text-sm font-semibold text-[#1f8a4c]">{brand.brand}</Link>
      ) : null}
    </Section>
  )
}

const READ_ADVICE: Record<StorefrontLocale, string> = {
  nl: "Lees het advies",
  en: "Read the advice",
  de: "Ratschlag lesen",
  fr: "Lire le conseil",
}

function adviceHasContent(
  item: Extract<CategoryCmsBlock, { type: "advice_compare" }>["items"][number],
  locale: StorefrontLocale
): boolean {
  return Boolean(
    text(item.label, locale) ||
      text(item.summary, locale) ||
      text(item.body, locale) ||
      item.image?.url ||
      adviceItemCta(item)
  )
}

function ContentLink({
  href,
  className,
  children,
}: {
  href: string
  className: string
  children: ReactNode
}) {
  if (/^https?:\/\//i.test(href)) {
    return (
      <a href={href} className={className} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    )
  }
  if (href.startsWith("#")) {
    return (
      <a href={href} className={className}>
        {children}
      </a>
    )
  }
  return (
    <Link href={href} prefetch={false} className={className}>
      {children}
    </Link>
  )
}

function Advice({
  block,
  locale,
  preview,
  children,
  slug,
}: {
  block: Extract<CategoryCmsBlock, { type: "advice_compare" }>
  locale: StorefrontLocale
  preview: boolean
  children: CategoryV2Child[]
  slug: string
}) {
  const title = text(block.title, locale)
  const rank = new Map(children.map((child) => [child.slug, child.productCount]))
  const visible = block.items
    .filter((item) => adviceHasContent(item, locale))
    .sort((left, right) => {
      const leftSlug = categorySlugFromHref(left.href) ?? ""
      const rightSlug = categorySlugFromHref(right.href) ?? ""
      return (rank.get(rightSlug) ?? 0) - (rank.get(leftSlug) ?? 0) || leftSlug.localeCompare(rightSlug, locale)
    })
  if (visible.length === 0 && !preview) return null
  return (
    <Section id={block.id} presentation={block.presentation}>
      {visible.length === 0 ? (
        <div>
          {title ? <h2 className="text-xl font-bold text-[#16315c]">{title}</h2> : null}
          <div className="mt-3">
            <Empty preview={preview} label="Nog geen advieskaarten." />
          </div>
        </div>
      ) : (
        <div>
          {title ? <h2 className="mb-3 text-xl font-bold text-[#16315c]">{title}</h2> : null}
          <div className="grid items-stretch gap-4 lg:grid-cols-[1.05fr_0.95fr]">
            <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white">
              {visible.map((item) => {
                const summary = text(item.summary, locale)
                const label = text(item.label, locale)
                const cta = adviceItemCta(item)
                const href = cta?.href || item.href
                return (
                  <li key={item.id}>
                    <ContentLink href={href} className="flex gap-3 px-4 py-3 hover:bg-slate-50">
                      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#e7f6ee] text-[#1f8a4c]">
                        <UspIcon title={label} />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-[#16315c]">{label}</span>
                        {summary ? <span className="mt-0.5 block text-sm leading-6 text-slate-600">{summary}</span> : null}
                      </span>
                    </ContentLink>
                  </li>
                )
              })}
            </ul>
            {(() => {
              const feature = visible[0]
              const scene = categoryAtmosphere(slug, "advice")
              if (!feature) return null
              const cta = adviceItemCta(feature)
              const href = cta?.href || feature.href
              return (
                <ContentLink href={href} className="relative block min-h-72 overflow-hidden rounded-2xl bg-[#16315c]">
                  {scene ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={scene.src} alt="" className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: scene.position }} />
                  ) : null}
                  <span className="absolute inset-0 bg-gradient-to-t from-[#16315c] via-[#16315c]/35 to-transparent" />
                  <span className="absolute inset-x-0 bottom-0 p-5 text-white">
                    <span className="block text-lg font-bold">{text(feature.label, locale)}</span>
                    {text(feature.summary, locale) ? <span className="mt-1 block text-sm leading-6 text-white/90">{text(feature.summary, locale)}</span> : null}
                    <span className="mt-3 inline-flex rounded-full bg-[#1f8a4c] px-4 py-2 text-sm font-semibold">{text(feature.cta_label, locale) || "Vergelijk"}</span>
                  </span>
                </ContentLink>
              )
            })()}
          </div>
        </div>
      )}
    </Section>
  )
}

function Compare({
  block,
  locale,
  products,
  filterAttributes,
  preview,
}: {
  block: Extract<CategoryCmsBlock, { type: "product_comparison" }>
  locale: StorefrontLocale
  products: ListingProduct[]
  filterAttributes?: ProductCloudStoreAttribute[]
  preview: boolean
}) {
  const title = text(block.title, locale) || "Vergelijk"
  const comparable = products.map((product) => ({ ...product, id: product.slug }))
  const storedSelection = block.product_ids.some((id) => id.trim())
  const factual = storedSelection
    ? null
    : factualCategoryComparison(
        comparable,
        (filterAttributes ?? []).map((attribute) => ({
          code: attribute.code ?? "",
          name: attribute.name,
          dataType: attribute.data_type,
          unit: attribute.unit,
          comparable: attribute.is_comparable,
        }))
      )
  const selected = storedSelection
    ? orderedComparisonProducts(comparable, block.product_ids)
    : factual?.products ?? []
  const specCodes = storedSelection || block.spec_codes.some((code) => code.trim())
    ? block.spec_codes
    : factual?.specCodes ?? []
  if (selected.length === 0) {
    if (!preview) return null
    const label = block.product_ids.some((id) => id.trim())
      ? "De geselecteerde producten horen niet bij het aanbod van deze categorie."
      : "Selecteer producten voor deze vergelijking."
    return (
      <Section id={block.id} presentation={block.presentation}>
        <h2 className="text-xl font-bold text-[#16315c]">{title}</h2>
        <div className="mt-3"><Empty preview label={label} /></div>
      </Section>
    )
  }
  const rows = comparisonSpecRows(
    specCodes,
    (filterAttributes ?? []).map((attribute) => ({
      code: attribute.code ?? "",
      name: attribute.name,
      dataType: attribute.data_type,
      unit: attribute.unit,
      comparable: attribute.is_comparable,
    })),
    selected
  ).filter((row) => storedSelection || row.values.filter((value) => value != null).length >= 2)
  if (!storedSelection && rows.length === 0) {
    if (!preview) return null
    return (
      <Section id={block.id} presentation={block.presentation}>
        <h2 className="text-xl font-bold text-[#16315c]">{title}</h2>
        <div className="mt-3"><Empty preview label="Selecteer producten voor deze vergelijking." /></div>
      </Section>
    )
  }
  return (
    <Section id={block.id} presentation={block.presentation}>
      <h2 className="text-xl font-bold text-[#16315c]">{title}</h2>
      <div className="mt-4 grid min-w-0">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[32rem] border-collapse text-sm">
          <thead>
            <tr>
              <th className="border-b border-slate-200 px-3 py-2" />
              {selected.map((product) => {
                const price = euros(product.priceCents)
                return (
                  <th key={product.id} className="border-b border-slate-200 px-3 py-3 text-left align-bottom font-semibold text-[#16315c]">
                    {product.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={product.imageUrl} alt="" className="mb-2 h-16 w-16 object-contain" />
                    ) : null}
                    <span className="block">{product.title}</span>
                    {product.brand.trim() ? <span className="mt-1 block text-xs font-normal text-slate-500">{product.brand}</span> : null}
                    {product.previewStatus === "concept" && !price ? (
                      <span className="mt-1 block text-[11px] font-normal text-slate-500">{t("conceptProduct", locale)}</span>
                    ) : null}
                    {price ? <span className="mt-1 block text-sm">{price}</span> : null}
                  </th>
                )
              })}
            </tr>
          </thead>
          {rows.length > 0 ? (
            <tbody>
              {rows.map((row) => (
                <tr key={row.code}>
                  <th className="border-b border-slate-100 px-3 py-2 text-left font-medium text-slate-700">
                    {row.label}
                    {row.unit ? <span className="font-normal text-slate-500"> ({row.unit})</span> : null}
                  </th>
                  {row.values.map((value, index) => (
                    <td key={`${row.code}-${selected[index]?.id ?? index}`} className="border-b border-slate-100 px-3 py-2 text-slate-700">
                      {value ?? "—"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          ) : null}
        </table>
        </div>
      </div>
      {preview && specCodes.length === 0 ? (
        <p className="mt-2 text-xs text-slate-500">Geen specificaties geselecteerd.</p>
      ) : null}
      {preview && specCodes.some((code) => code.trim()) && rows.length === 0 ? (
        <p className="mt-2 text-xs text-slate-500">De geselecteerde specificaties zijn niet geschikt voor vergelijking in deze categorie.</p>
      ) : null}
    </Section>
  )
}

const FAQ_HEADING: Record<StorefrontLocale, string> = {
  nl: "Veelgestelde vragen",
  en: "Frequently asked questions",
  de: "Häufige Fragen",
  fr: "Questions fréquentes",
}

const TIP_LABEL: Record<StorefrontLocale, string> = {
  nl: "Tip",
  en: "Tip",
  de: "Hinweis",
  fr: "Conseil",
}

function guideSectionHasContent(
  section: Extract<CategoryCmsBlock, { type: "buying_guide" }>["sections"][number],
  locale: StorefrontLocale
): boolean {
  const bullets = (section.bullets ?? []).some((bullet) => text(bullet, locale))
  const subheads = (section.subheadings ?? []).some(
    (sub) => text(sub.heading, locale) || text(sub.body, locale)
  )
  return Boolean(
    text(section.heading, locale) ||
      text(section.intro, locale) ||
      text(section.body, locale) ||
      bullets ||
      subheads ||
      text(section.tip, locale) ||
      section.image?.url ||
      categoryCmsOptionalLink(section.link_label, section.link_href) ||
      categoryCmsOptionalLink(section.cta_label, section.cta_href)
  )
}

function Guide({
  block,
  locale,
  preview,
  slug,
}: {
  block: Extract<CategoryCmsBlock, { type: "buying_guide" }>
  locale: StorefrontLocale
  preview: boolean
  slug: string
}) {
  const advice = getCategoryAdvice(slug)
  const replacedHeadings = new Set(advice?.replacesGuideHeadings ?? [])
  const title = text(block.title, locale)
  const intro = text(block.intro, locale)
  const closingHref = categoryCmsOptionalLink(block.closing_cta_label, block.closing_cta_href)
  const closingLabel = closingHref ? text(block.closing_cta_label, locale) : ""
  const faqs = block.faq.filter((item) => text(item.question, locale))
  const filled = block.sections.some((section) => guideSectionHasContent(section, locale))
  if (!advice && !title && !intro && !filled && faqs.length === 0 && !closingLabel && !preview) return null
  const solid = block.presentation?.button_style !== "outline"
  const buttonClass = solid
    ? "inline-flex rounded-full bg-[#1f8a4c] px-4 py-2 text-sm font-semibold text-white"
    : "inline-flex rounded-full border border-[#1f8a4c] px-4 py-2 text-sm font-semibold text-[#1f8a4c]"
  return (
    <Section id={block.id} presentation={block.presentation}>
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        {advice ? (
          <div>
            <h2 className="text-xl font-bold text-[#16315c]">{advice.referralTitle}</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{advice.referralIntro}</p>
            <Link href={advice.path} className={`${buttonClass} mt-4`}>
              {advice.referralCta}
            </Link>
          </div>
        ) : (
          <>
            {title ? <h2 className="text-xl font-bold text-[#16315c]">{title}</h2> : null}
            {intro ? <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{intro}</p> : null}
          </>
        )}
        {!filled && faqs.length === 0 && !intro && !closingLabel ? (
          <div className="mt-3">
            <Empty preview={preview} label="Nog geen koopgids." />
          </div>
        ) : (
          <div className="mt-4 space-y-6">
            {block.sections.map((section) => {
              if (!guideSectionHasContent(section, locale)) {
                return preview ? <Empty key={section.id} preview label="Lege koopgidssectie." /> : null
              }
              const heading = text(section.heading, locale)
              if (advice && heading && replacedHeadings.has(heading)) return null
              const sectionIntro = text(section.intro, locale)
              const body = text(section.body, locale)
              const tip = text(section.tip, locale)
              const bullets = (section.bullets ?? []).map((bullet) => text(bullet, locale)).filter(Boolean)
              const linkHref = categoryCmsOptionalLink(section.link_label, section.link_href)
              const linkLabel = linkHref ? text(section.link_label, locale) : ""
              const ctaHref = categoryCmsOptionalLink(section.cta_label, section.cta_href)
              const ctaLabel = ctaHref ? text(section.cta_label, locale) : ""
              return (
                <article key={section.id} className="space-y-2 border-t border-slate-100 pt-4 first:border-t-0 first:pt-0">
                  {heading ? <h3 className="text-lg font-semibold text-[#16315c]">{heading}</h3> : null}
                  {sectionIntro ? <p className="text-sm leading-6 text-slate-600">{sectionIntro}</p> : null}
                  {section.image?.url ? (
                    <FramedPhoto
                      url={section.image.url}
                      alt={text(section.image.alt, locale) || heading}
                      frame={section.image.frame}
                      caption={text(section.image.caption, locale)}
                    />
                  ) : null}
                  {body ? <p className="text-sm leading-6 text-slate-600">{body}</p> : null}
                  {(section.subheadings ?? []).map((sub) => {
                    const subHeading = text(sub.heading, locale)
                    const subBody = text(sub.body, locale)
                    if (!subHeading && !subBody) return null
                    return (
                      <div key={sub.id}>
                        {subHeading ? <h4 className="font-semibold text-[#16315c]">{subHeading}</h4> : null}
                        {subBody ? <p className="text-sm leading-6 text-slate-600">{subBody}</p> : null}
                      </div>
                    )
                  })}
                  {bullets.length > 0 ? (
                    <ul className="space-y-1 text-sm leading-6 text-slate-700">
                      {bullets.map((bullet, index) => (
                        <li key={`${section.id}-${index}`} className="flex gap-2">
                          <span aria-hidden className="text-[#1f8a4c]">✓</span>
                          <span>{bullet}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {tip ? (
                    <aside className="rounded-xl border border-[#d7eadf] bg-[#f4fbf7] p-3 text-sm leading-6 text-slate-700">
                      <p className="text-xs font-semibold uppercase tracking-wide text-[#1f8a4c]">{TIP_LABEL[locale]}</p>
                      <p className="mt-1">{tip}</p>
                    </aside>
                  ) : null}
                  {linkHref && linkLabel ? (
                    <ContentLink href={linkHref} className="inline-block text-sm font-semibold text-[#1f8a4c]">
                      {linkLabel}
                    </ContentLink>
                  ) : null}
                  {ctaHref && ctaLabel ? (
                    <div>
                      <ContentLink href={ctaHref} className={buttonClass}>
                        {ctaLabel}
                      </ContentLink>
                    </div>
                  ) : null}
                </article>
              )
            })}
            {faqs.length > 0 ? (
              <div>
                <h3 className="text-lg font-semibold text-[#16315c]">{FAQ_HEADING[locale]}</h3>
                <div className="mt-2 divide-y divide-slate-200">
                  {faqs.map((item) => (
                    <details key={item.id} className="py-2">
                      <summary className="cursor-pointer font-semibold text-[#16315c]">
                        {text(item.question, locale)}
                      </summary>
                      {text(item.answer, locale) ? (
                        <p className="mt-1 text-sm leading-6 text-slate-600">{text(item.answer, locale)}</p>
                      ) : null}
                    </details>
                  ))}
                </div>
              </div>
            ) : null}
            {closingHref && closingLabel ? (
              <ContentLink href={closingHref} className={buttonClass}>
                {closingLabel}
              </ContentLink>
            ) : null}
          </div>
        )}
      </div>
    </Section>
  )
}

const FAQ_HEADING_BLOCK: Record<StorefrontLocale, string> = {
  nl: "Veelgestelde vragen",
  en: "Frequently asked questions",
  de: "Häufige Fragen",
  fr: "Questions fréquentes",
}

const SPEC_HEADING: Record<StorefrontLocale, string> = {
  nl: "Specificaties uitgelegd",
  en: "Specifications explained",
  de: "Spezifikationen erklärt",
  fr: "Spécifications expliquées",
}

const RELATED_HEADING: Record<StorefrontLocale, string> = {
  nl: "Gerelateerde producten",
  en: "Related products",
  de: "Zugehörige Produkte",
  fr: "Produits associés",
}

function Faq({
  block,
  locale,
  preview,
}: {
  block: Extract<CategoryCmsBlock, { type: "faq" }>
  locale: StorefrontLocale
  preview: boolean
}) {
  const items = visibleFaqItems(block.items, locale)
  if (items.length === 0 && !preview) return null
  const heading = text(block.title, locale) || FAQ_HEADING_BLOCK[locale]
  const schema = items
    .filter((item) => item.answer)
    .map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    }))
  return (
    <Section id={block.id} presentation={block.presentation}>
      <h2 className="text-xl font-bold text-[#16315c]">{heading}</h2>
      {items.length === 0 ? (
        <div className="mt-3">
          <Empty preview={preview} label="Nog geen vragen. Er worden geen vragen toegevoegd." />
        </div>
      ) : (
        <div className="mt-3 divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white px-4">
          {items.map((item) => (
            <details key={item.id} className="group py-2.5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-[#16315c] [&::-webkit-details-marker]:hidden">
                <span className="min-w-0">{item.question}</span>
                <svg viewBox="0 0 16 16" className="h-4 w-4 shrink-0 text-[#1f8a4c] group-open:hidden" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                  <path d="M8 3.5v9M3.5 8h9" strokeLinecap="round" />
                </svg>
                <svg viewBox="0 0 16 16" className="hidden h-4 w-4 shrink-0 text-[#1f8a4c] group-open:block" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                  <path d="M3.5 8h9" strokeLinecap="round" />
                </svg>
              </summary>
              {item.answer ? <p className="mt-2 text-sm leading-6 text-slate-600">{item.answer}</p> : null}
            </details>
          ))}
        </div>
      )}
      {schema.length > 0 ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "FAQPage",
              mainEntity: schema,
            }).replace(/</g, "\\u003c"),
          }}
        />
      ) : null}
    </Section>
  )
}

function SpecExplain({
  block,
  locale,
  preview,
  definitions,
}: {
  block: Extract<CategoryCmsBlock, { type: "spec_explain" }>
  locale: StorefrontLocale
  preview: boolean
  definitions: ProductCloudStoreAttribute[]
}) {
  const views = explainCategorySpecs(
    block.items.map((item) => ({
      id: item.id,
      specCode: item.spec_code,
      title: text(item.title, locale),
      body: text(item.body, locale),
    })),
    definitions.flatMap((definition) => {
      const code = definition.code?.trim() || ""
      if (!code) return []
      return [
        {
          code,
          name: definition.name,
          dataType: definition.data_type,
          unit: definition.unit,
          optionValues: definition.option_values,
        },
      ]
    })
  )
  if (views.length === 0 && !preview) return null
  const heading = text(block.title, locale) || SPEC_HEADING[locale]
  return (
    <Section id={block.id} presentation={block.presentation}>
      <h2 className="text-xl font-bold text-[#16315c]">{heading}</h2>
      {views.length === 0 ? (
        <div className="mt-3">
          <Empty preview={preview} label="Nog geen specificatie-uitleg." />
        </div>
      ) : (
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {views.map((item) => (
            <li key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4">
              {item.title ? <h3 className="font-semibold text-[#16315c]">{item.title}</h3> : null}
              {item.recognized ? (
                <p className="mt-1 text-xs text-slate-500">
                  {[item.label, item.dataType, item.unit].filter(Boolean).join(" · ")}
                </p>
              ) : preview ? (
                <p className="mt-1 text-xs text-slate-500">Deze specificatiecode staat niet bij de attribuutdefinities.</p>
              ) : null}
              {item.body ? <p className="mt-2 text-sm leading-6 text-slate-600">{item.body}</p> : null}
              {item.optionValues.length > 0 ? (
                <ul className="mt-3 flex flex-wrap gap-1">
                  {item.optionValues.map((value) => (
                    <li key={value} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                      {value}
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </Section>
  )
}

function Related({
  block,
  locale,
  preview,
  sourceProducts,
  relatedProducts,
  relations,
}: {
  block: Extract<CategoryCmsBlock, { type: "related_products" }>
  locale: StorefrontLocale
  preview: boolean
  sourceProducts: ListingProduct[]
  relatedProducts: ListingProduct[]
  relations: CategoryProductRelation[]
}) {
  const rows = selectRelatedCategoryProducts(
    sourceProducts.map((product) => product.slug),
    relations,
    relatedProducts.map((product) => ({ ...product, id: product.slug })),
    block.limit
  )
  if (rows.length === 0 && !preview) return null
  const heading = text(block.title, locale) || RELATED_HEADING[locale]
  const columns = columnsOf(block.presentation, 4)
  const grid = columns === 2 ? "sm:grid-cols-2" : columns === 3 ? "sm:grid-cols-2 lg:grid-cols-3" : "sm:grid-cols-2 lg:grid-cols-4"
  return (
    <Section id={block.id} presentation={block.presentation}>
      <h2 className="text-xl font-bold text-[#16315c]">{heading}</h2>
      {rows.length === 0 ? (
        <div className="mt-3">
          <Empty preview={preview} label="Er zijn nog geen productrelaties in Product Cloud. Dit blok blijft verborgen op de storefront." />
        </div>
      ) : (
        <ul className={`mt-4 grid gap-3 ${grid}`}>
          {rows.map((product) => (
            <li key={product.id} className="min-w-0">
              <ProductCarouselCard product={product} layout="grid" locale={locale} />
            </li>
          ))}
        </ul>
      )}
    </Section>
  )
}

function FiltersOnly({
  block,
  locale,
  preview,
}: {
  block: Extract<CategoryCmsBlock, { type: "filters" }>
  locale: StorefrontLocale
  preview: boolean
}) {
  const controls = block.controls.filter((control) => control.visible)
  return (
    <Section id={block.id} presentation={block.presentation}>
      <h2 className="text-sm font-bold text-[#16315c]">Filters</h2>
      {controls.length === 0 ? <Empty preview={preview} label="Geen filterdefinities geselecteerd." /> : (
        <ul className="mt-2 space-y-1 text-sm text-slate-600">
          {controls.map((control) => <li key={control.attributeKey}>{text(control.label, locale) || control.attributeKey}</li>)}
        </ul>
      )}
    </Section>
  )
}

const SORT_LABEL: Record<StorefrontLocale, Record<CategoryV2Sort, string>> = {
  nl: { relevance: "Relevantie", newest: "Nieuwste", price_asc: "Prijs oplopend", price_desc: "Prijs aflopend" },
  en: { relevance: "Relevance", newest: "Newest", price_asc: "Price: low to high", price_desc: "Price: high to low" },
  de: { relevance: "Relevanz", newest: "Neueste", price_asc: "Preis aufsteigend", price_desc: "Preis absteigend" },
  fr: { relevance: "Pertinence", newest: "Plus récents", price_asc: "Prix croissant", price_desc: "Prix décroissant" },
}

function ListingRow({
  filters,
  grid,
  locale,
  products,
  filterAttributes,
  preview,
  listingSelection,
  listingQuery,
}: {
  filters: Extract<CategoryCmsBlock, { type: "filters" }>
  grid: Extract<CategoryCmsBlock, { type: "product_grid" }>
  locale: StorefrontLocale
  products: ListingProduct[]
  filterAttributes: ProductCloudStoreAttribute[]
  preview: boolean
  listingSelection: ListingSelection | null
  listingQuery?: CategoryListingQuery
}) {
  const newestAvailable = products.some((product) => Boolean(product.publishedAt))
  const sortChoices: CategoryV2Sort[] = newestAvailable
    ? ["relevance", "newest", "price_asc", "price_desc"]
    : ["relevance", "price_asc", "price_desc"]
  const initialSort = sortChoices.includes(grid.sort) ? grid.sort : "relevance"
  const [sort, setSort] = useState<CategoryV2Sort>(initialSort)
  const [page, setPage] = useState(1)
  const [selection, setSelection] = useState<Record<string, CategoryV2FilterSelection>>({})
  const queryApplied = useRef(false)
  useEffect(() => {
    if (!listingSelection) return
    setSelection(listingSelection.selection)
    setPage(1)
  }, [listingSelection])
  const facets = useMemo(() => {
    const built = buildCategoryV2Facets(
      categoryV2FilterAttributes(
        filterAttributes
          .filter((attribute) => attribute.code?.trim())
          .map((attribute) => ({
            code: attribute.code as string,
            name: attribute.name,
            dataType: attribute.data_type,
            filterable: attribute.is_filterable,
          })),
        products
      ),
      products,
      filters.controls.map((control) => ({
        attributeKey: control.attributeKey,
        visible: control.visible !== false,
        label: text(control.label, locale),
        sortOrder: Number(control.sortOrder) || 0,
      }))
    )
    return applyCategoryV2FacetCounts(built, products, selection)
  }, [filterAttributes, filters.controls, locale, products, selection])
  useEffect(() => {
    if (queryApplied.current || listingSelection) return
    if (!listingQuery || categoryListingQueryIsEmpty(listingQuery)) return
    if (facets.length === 0) return
    queryApplied.current = true
    const next = selectionFromListingQuery(facets, listingQuery)
    if (Object.keys(next).length === 0) return
    setSelection(next)
    setPage(1)
  }, [facets, listingQuery, listingSelection])
  const activeSort = sortChoices.includes(sort) ? sort : "relevance"
  const filtered = useMemo(() => {
    const matched = products.filter((product) =>
      productMatchesCategoryV2Filters(product, facets, selection)
    )
    return sortCategoryV2Products(matched, activeSort)
  }, [activeSort, facets, products, selection])
  const pageSize = Math.max(1, grid.limit || 24)
  const paged = paginateCategoryV2Products(filtered, page, pageSize)
  const cols = columnsOf(grid.presentation, 3)
  const heading = text(grid.title, locale)

  function chooseSort(next: CategoryV2Sort) {
    setSort(next)
    setPage(1)
  }

  function facetIsActive(key: string): boolean {
    const chosen = selection[key]
    if (!chosen) return false
    if ((chosen.values ?? []).some((value) => value.trim())) return true
    return (chosen.min != null && Number.isFinite(chosen.min)) || (chosen.max != null && Number.isFinite(chosen.max))
  }

  function clearFacet(key: string) {
    setSelection((current) => {
      const next = { ...current }
      delete next[key]
      return next
    })
    setPage(1)
  }

  function clearAllFilters() {
    setSelection({})
    setPage(1)
  }

  const activeChips = facets.flatMap((facet) => {
    const chosen = selection[facet.attributeKey]
    if (!chosen) return []
    if (facet.type === "checkbox") {
      return (chosen.values ?? []).map((value) => {
        const option = facet.options.find((item) => item.value === value)
        return { key: `${facet.attributeKey}:${value}`, facet: facet.attributeKey, value, label: `${facet.label}: ${option?.label ?? value}` }
      })
    }
    if (!facetIsActive(facet.attributeKey)) return []
    const min = chosen.min != null ? String(chosen.min) : ""
    const max = chosen.max != null ? String(chosen.max) : ""
    return [{ key: facet.attributeKey, facet: facet.attributeKey, value: "", label: `${facet.label}: ${min || "…"}–${max || "…"}` }]
  })
  const filtersActive = activeChips.length > 0

  const emptyFilters =
    locale === "en"
      ? "No filled specifications to filter on yet."
      : locale === "de"
        ? "Noch keine ausgefüllten Angaben zum Filtern."
        : locale === "fr"
          ? "Pas encore de caractéristiques renseignées pour filtrer."
          : "Er zijn nog geen ingevulde specificaties om op te filteren."
  void preview
  const emptyProducts =
    locale === "en"
      ? "No products with an offer in this category."
      : locale === "de"
        ? "Keine Produkte mit einem Angebot in dieser Kategorie."
        : locale === "fr"
          ? "Aucun produit avec une offre dans cette catégorie."
          : "Geen producten met een aanbod in deze categorie."
  const noMatches =
    locale === "en"
      ? "No products match these filters."
      : locale === "de"
        ? "Keine Produkte für diese Filter."
        : locale === "fr"
          ? "Aucun produit pour ces filtres."
          : "Geen producten met deze filters."
  const clearAllLabel =
    locale === "en" ? "Clear all filters" : locale === "de" ? "Alle Filter löschen" : locale === "fr" ? "Effacer les filtres" : "Wis alle filters"
  const clearOneLabel =
    locale === "en" ? "Clear" : locale === "de" ? "Löschen" : locale === "fr" ? "Effacer" : "Wis"
  return (
    <section id={filters.id} className="grid gap-4 px-4 py-4 sm:px-6 lg:grid-cols-[16rem_1fr]">
      <aside data-cms-section={filters.id} className="rounded-xl border border-slate-200 bg-white p-4" style={styleOf(filters.presentation)}>
        <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-bold text-[#16315c]">Filters</h2>
              {filtersActive ? (
                <button type="button" className="text-xs font-semibold text-[#1f8a4c]" onClick={clearAllFilters}>
                  {clearAllLabel}
                </button>
              ) : null}
            </div>
            {facets.length === 0 ? (
              <p className="text-sm leading-6 text-slate-500">{emptyFilters}</p>
            ) : null}
            {facets.map((facet) => (
              <fieldset key={facet.attributeKey} className="space-y-1">
                <legend className="flex w-full items-center justify-between gap-2 text-sm font-semibold text-[#16315c]">
                  <span>{facet.label}</span>
                  {facetIsActive(facet.attributeKey) ? (
                    <button type="button" className="text-xs font-semibold text-[#1f8a4c]" onClick={() => clearFacet(facet.attributeKey)}>
                      {clearOneLabel}
                    </button>
                  ) : null}
                </legend>
                {facet.type === "range" ? (
                  <div className="flex gap-2">
                    <input
                      type="number"
                      inputMode="decimal"
                      aria-label={`${facet.label} minimum`}
                      placeholder={facet.min != null ? String(facet.min) : ""}
                      className="w-full rounded-lg border border-slate-200 px-2 py-1 text-sm"
                      value={selection[facet.attributeKey]?.min ?? ""}
                      onChange={(event) => {
                        const raw = event.target.value
                        setSelection((current) => ({
                          ...current,
                          [facet.attributeKey]: {
                            ...current[facet.attributeKey],
                            min: raw === "" ? null : Number(raw),
                          },
                        }))
                        setPage(1)
                      }}
                    />
                    <input
                      type="number"
                      inputMode="decimal"
                      aria-label={`${facet.label} maximum`}
                      placeholder={facet.max != null ? String(facet.max) : ""}
                      className="w-full rounded-lg border border-slate-200 px-2 py-1 text-sm"
                      value={selection[facet.attributeKey]?.max ?? ""}
                      onChange={(event) => {
                        const raw = event.target.value
                        setSelection((current) => ({
                          ...current,
                          [facet.attributeKey]: {
                            ...current[facet.attributeKey],
                            max: raw === "" ? null : Number(raw),
                          },
                        }))
                        setPage(1)
                      }}
                    />
                  </div>
                ) : (
                  facet.options.map((option) => {
                    const checked = (selection[facet.attributeKey]?.values ?? []).includes(option.value)
                    return (
                      <label key={option.value} className="flex items-center gap-2 text-sm text-slate-700">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            setSelection((current) => {
                              const values = new Set(current[facet.attributeKey]?.values ?? [])
                              if (values.has(option.value)) values.delete(option.value)
                              else values.add(option.value)
                              return {
                                ...current,
                                [facet.attributeKey]: { ...current[facet.attributeKey], values: [...values] },
                              }
                            })
                            setPage(1)
                          }}
                        />
                        <span>{option.label}</span>
                        <span className="text-xs text-slate-400">{option.count}</span>
                      </label>
                    )
                  })
                )}
              </fieldset>
            ))}
          </div>
      </aside>
      <div id={grid.id} data-cms-section={grid.id} style={styleOf(grid.presentation)}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          {heading ? <h2 className="text-xl font-bold text-[#16315c]">{heading}</h2> : <span />}
          <label className="text-sm text-slate-600">
            <span className="sr-only">{SORT_LABEL[locale].relevance}</span>
            <select
              className="rounded-lg border border-slate-200 bg-white px-2 py-1"
              value={sortChoices.includes(sort) ? sort : "relevance"}
              onChange={(event) => chooseSort(event.target.value as CategoryV2Sort)}
            >
              {sortChoices.map((choice) => (
                <option key={choice} value={choice}>{SORT_LABEL[locale][choice]}</option>
              ))}
            </select>
          </label>
        </div>
        {activeChips.length > 0 ? (
          <ul className="mt-3 flex flex-wrap gap-2">
            {activeChips.map((chip) => (
              <li key={chip.key}>
                <button
                  type="button"
                  className="rounded-full border border-slate-200 bg-white px-2 py-1 text-xs text-[#16315c]"
                  onClick={() => {
                    if (!chip.value) {
                      clearFacet(chip.facet)
                      return
                    }
                    setSelection((current) => {
                      const values = (current[chip.facet]?.values ?? []).filter((value) => value !== chip.value)
                      return { ...current, [chip.facet]: { ...current[chip.facet], values } }
                    })
                    setPage(1)
                  }}
                >
                  {chip.label} <span aria-hidden>×</span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        <p className="mt-1 text-xs text-slate-500">{filtered.length}</p>
        {paged.items.length === 0 ? (
          <p className="mt-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-4 text-sm text-slate-500" role="status">
            {filtersActive ? noMatches : emptyProducts}
            {filtersActive ? (
              <button type="button" className="mt-2 block text-xs font-semibold text-[#1f8a4c]" onClick={clearAllFilters}>
                {clearAllLabel}
              </button>
            ) : null}
          </p>
        ) : (
          <ul className={`mt-4 grid items-stretch gap-3 ${cols === 2 ? "sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-3"} ${cols === 4 ? "xl:grid-cols-4" : ""}`}>
            {paged.items.map((product) => (
              <li key={product.slug} className="min-w-0">
              <ProductCarouselCard product={product} layout="grid" locale={locale} />
            </li>
            ))}
          </ul>
        )}
        {paged.pages > 1 ? (
          <div className="mt-4 flex items-center gap-2 text-sm">
            <button type="button" className="rounded-lg border border-slate-200 px-2 py-1 disabled:opacity-40" disabled={paged.page <= 1} onClick={() => setPage(paged.page - 1)}>
              {locale === "en" ? "Previous" : locale === "de" ? "Zurück" : locale === "fr" ? "Précédent" : "Vorige"}
            </button>
            <span>{paged.page} / {paged.pages}</span>
            <button type="button" className="rounded-lg border border-slate-200 px-2 py-1 disabled:opacity-40" disabled={paged.page >= paged.pages} onClick={() => setPage(paged.page + 1)}>
              {locale === "en" ? "Next" : locale === "de" ? "Weiter" : locale === "fr" ? "Suivant" : "Volgende"}
            </button>
          </div>
        ) : null}
      </div>
    </section>
  )
}
