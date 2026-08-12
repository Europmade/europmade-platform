import { redirect, notFound } from "next/navigation"
import { slugifyForBrand } from "../../_lib/brand-slug"
import { getStorefrontLocaleFromCookies } from "../../_lib/i18n/get-storefront-locale"
import {
  resolveBrandPage,
  resolveProducerPage,
} from "../../_lib/storefront-catalog"

type ProducentPageProps = {
  params: Promise<{ slug: string }>
}

/**
 * Legacy producent-URL → canonieke merkpagina (Sprint 6).
 */
export default async function ProducentPage({ params }: ProducentPageProps) {
  const { slug } = await params
  const locale = await getStorefrontLocaleFromCookies()

  const brandDirect = await resolveBrandPage(slug, locale)
  if (brandDirect) {
    redirect(`/merk/${brandDirect.brand.slug}`)
  }

  const producer = await resolveProducerPage(slug, locale)
  if (producer && producer.products.length > 0) {
    const brandSlug = slugifyForBrand(producer.products[0]!.brand)
    redirect(`/merk/${brandSlug}`)
  }

  notFound()
}
