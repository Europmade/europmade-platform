import { getStorefrontLocaleFromCookies } from "../../_lib/i18n/get-storefront-locale"
import { resolveListingProducts, resolvePdpDetail } from "../../_lib/storefront-catalog"
import { ProductPreviewClient } from "../../_components/product/product-preview-client"

export default async function ProductTemplatePreviewPage() {
  const locale = await getStorefrontLocaleFromCookies()
  const { products } = await resolveListingProducts({ locale })
  const first = products[0]
  const resolved = first
    ? await resolvePdpDetail(first.slug, locale)
    : null
  return <ProductPreviewClient initialDetail={resolved?.detail ?? null} />
}
