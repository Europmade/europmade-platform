import { getStorefrontLocaleFromCookies } from "../../_lib/i18n/get-storefront-locale"
import {
  resolveListingProducts,
  resolvePdpDetail,
} from "../../_lib/storefront-catalog"
import { ProductPreviewClient } from "../../_components/product/product-preview-client"
import {
  fetchStoreCmsBanners,
  fetchStoreCmsProductTemplate,
} from "../../_lib/cms/fetch-store-cms"

export default async function ProductTemplatePreviewPage() {
  const locale = await getStorefrontLocaleFromCookies()
  const [{ products }, templateCms, banners] = await Promise.all([
    resolveListingProducts({ locale }),
    fetchStoreCmsProductTemplate(),
    fetchStoreCmsBanners(),
  ])
  const first = products[0]
  const resolved = first
    ? await resolvePdpDetail(first.slug, locale)
    : null

  const templateDocument =
    templateCms?.product?.published && templateCms.product.document
      ? templateCms.product.document
      : templateCms?.product?.document ?? null

  return (
    <ProductPreviewClient
      initialDetail={resolved?.detail ?? null}
      templateDocument={templateDocument}
      banners={banners}
    />
  )
}
