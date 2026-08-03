import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { ProductDetailPage } from "../../_components/product/product-detail"
import { LISTING_PRODUCTS } from "../../_lib/listing-products"
import { getPdpDetail } from "../../_lib/pdp-seed"

type ProductPageProps = {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  return LISTING_PRODUCTS.map((p) => ({ slug: p.slug }))
}

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { slug } = await params
  const detail = getPdpDetail(slug)
  if (!detail) return { title: "Product niet gevonden — EuropMade" }
  return {
    title: `${detail.fullTitle} — EuropMade`,
    description: detail.intro,
    alternates: { canonical: `/product/${detail.slug}` },
    openGraph: {
      title: `${detail.fullTitle} — EuropMade`,
      description: detail.intro,
      locale: "nl_NL",
      type: "website",
    },
    robots: { index: true, follow: true },
  }
}

/**
 * Product Detail Page — sprint-1a/01-productpagina-buybox-*.html
 */
export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params
  const detail = getPdpDetail(slug)
  if (!detail) notFound()
  return <ProductDetailPage detail={detail} />
}
