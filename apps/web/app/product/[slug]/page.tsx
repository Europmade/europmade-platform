import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { ProductDetailPage } from "../../_components/product/product-detail"
import { resolvePdpDetail } from "../../_lib/storefront-catalog"

type ProductPageProps = {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { slug } = await params
  const resolved = await resolvePdpDetail(slug)
  if (!resolved) return { title: "Product niet gevonden — EuropMade" }
  const { detail } = resolved
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
 * Product Detail Page — Product Cloud / Buy Box wanneer beschikbaar, anders seed.
 */
export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params
  const resolved = await resolvePdpDetail(slug)
  if (!resolved) notFound()
  return <ProductDetailPage detail={resolved.detail} />
}
