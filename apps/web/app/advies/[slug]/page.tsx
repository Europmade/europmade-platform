import type { Metadata } from "next"
import { notFound } from "next/navigation"
import {
  buildCategoryV2Facets,
  categoryV2FilterAttributes,
  expandCategorySlugsWithDescendants,
  getCategoryAdvice,
  resolveAdviceSelections,
  testCatalogProductInCategory,
} from "@europmade/utils"
import { CategoryAdviceView } from "../../_components/category/category-advice-view"
import { getStorefrontLocaleFromCookies } from "../../_lib/i18n/get-storefront-locale"
import { fetchProductCloudCategoryBySlug, fetchStorefrontCategories } from "../../_lib/product-cloud-store"
import { catalogCategoryFilterForSlug } from "../../_lib/storefront-category"
import {
  mergeTestCatalogProducts,
  resolveAllCategoryProducts,
  resolveTestCatalogProducts,
} from "../../_lib/storefront-catalog"

type AdvicePageProps = {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: AdvicePageProps): Promise<Metadata> {
  const { slug } = await params
  const advice = getCategoryAdvice(slug)
  if (!advice) return { title: "Keuzehulp — EuropMade" }
  return {
    title: `${advice.metaTitle} — EuropMade`,
    description: advice.metaDescription,
    alternates: { canonical: advice.path },
  }
}

export default async function AdvicePage({ params }: AdvicePageProps) {
  const { slug } = await params
  const advice = getCategoryAdvice(slug)
  if (!advice) notFound()
  const locale = await getStorefrontLocaleFromCookies()
  const selections = resolveAdviceSelections(advice, await facetsFor(slug, locale))
  const category = await fetchProductCloudCategoryBySlug(slug, locale)
  return (
    <CategoryAdviceView
      advice={advice}
      locale={locale}
      categoryName={category?.name?.trim() || "Wasmachines"}
      categoryHref={`/categorie/${advice.slug}`}
      selections={selections}
    />
  )
}

async function facetsFor(
  slug: string,
  locale: Awaited<ReturnType<typeof getStorefrontLocaleFromCookies>>
) {
  try {
    const productCloud = await fetchProductCloudCategoryBySlug(slug, locale)
    const tree = await fetchStorefrontCategories(locale)
    const base = catalogCategoryFilterForSlug(slug)
    const categorySlug = tree ? expandCategorySlugsWithDescendants(base, tree) : base
    const [{ products: published }, testCatalog] = await Promise.all([
      resolveAllCategoryProducts({ categorySlug, locale }),
      resolveTestCatalogProducts(locale),
    ])
    const products = mergeTestCatalogProducts(
      published,
      testCatalog.filter((product) => testCatalogProductInCategory(product.categorySlugs, categorySlug))
    )
    const attributes = categoryV2FilterAttributes(
      (productCloud?.attributes ?? [])
        .filter((attribute) => attribute.code?.trim())
        .map((attribute) => ({
          code: attribute.code as string,
          name: attribute.name,
          dataType: attribute.data_type,
          filterable: attribute.is_filterable,
        })),
      products
    )
    return buildCategoryV2Facets(attributes, products, [])
  } catch {
    return []
  }
}
