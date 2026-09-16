import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { PublicStorefrontChrome } from "../../_components/marketplace/public-storefront-chrome"
import { getStorefrontLocaleFromCookies } from "../../_lib/i18n/get-storefront-locale"
import { fetchPublicSellerShop } from "../../_lib/advertising-public"

type PageProps = {
  params: Promise<{ sellerSlug: string }>
}

const RESERVED = new Set([
  "products",
  "marketing",
  "orders",
  "brands",
  "settings",
  "account",
  "made-in-europe",
  "finance",
  "returns",
  "messages",
  "onboarding",
  "dashboard",
])

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { sellerSlug } = await params
  if (RESERVED.has(sellerSlug)) {
    return { title: "Seller — EuropMade" }
  }
  const data = await fetchPublicSellerShop(sellerSlug)
  if (!data) return { title: "Verkoper niet gevonden — EuropMade" }
  return {
    title: `${data.seller.name} — Verkoper — EuropMade`,
    description: `Ontdek producten van ${data.seller.name} op EuropMade.`,
  }
}

export default async function PublicSellerShopPage({ params }: PageProps) {
  const { sellerSlug } = await params
  if (RESERVED.has(sellerSlug)) notFound()

  const locale = await getStorefrontLocaleFromCookies()
  const data = await fetchPublicSellerShop(sellerSlug)
  if (!data) notFound()

  return (
    <PublicStorefrontChrome locale={locale}>
      <div className="px-4 py-8 tablet:px-8">
        <h1 className="text-2xl font-bold tracking-tight text-wf-900">
          {data.seller.name}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-wf-600">
          Ontdek de producten van deze verkoper op EuropMade.
        </p>

        {data.products.length === 0 ? (
          <p className="mt-8 text-sm text-wf-500">
            Momenteel geen openbare producten.
          </p>
        ) : (
          <div className="mt-8 grid grid-cols-2 gap-3 tablet:grid-cols-3 desktop:grid-cols-4">
            {data.products.map((p) => (
              <Link
                key={p.id}
                href={p.href}
                className="overflow-hidden rounded-lg border border-wf-200 bg-white transition hover:border-wf-400"
              >
                <div className="aspect-square overflow-hidden bg-wf-50">
                  {p.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.image_url}
                      alt=""
                      className="h-full w-full object-contain p-2"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-wf-400">
                      —
                    </div>
                  )}
                </div>
                <div className="p-2.5 text-sm font-medium text-wf-900 line-clamp-2">
                  {p.title || p.id}
                </div>
              </Link>
            ))}
          </div>
        )}

        <div className="mt-10 text-sm text-wf-500">
          <Link href="/" className="hover:underline">
            ← EuropMade
          </Link>
        </div>
      </div>
    </PublicStorefrontChrome>
  )
}
