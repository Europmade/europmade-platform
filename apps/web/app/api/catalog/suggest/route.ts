import { resolveMediaUrl } from "@europmade/utils"
import {
  CatalogApiError,
  listCatalogProducts,
} from "../../../_lib/catalog-api"
import { getPageBackendOrigin } from "../../../_lib/page-backend-origin"

/**
 * Same-origin zoeksuggesties — hergebruikt GET /store/catalog/products?q=.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const q = (searchParams.get("q") ?? "").trim()
  if (q.length < 2) {
    return Response.json({ products: [] })
  }
  const limitRaw = Number(searchParams.get("limit") ?? 6)
  const limit = Number.isFinite(limitRaw)
    ? Math.min(8, Math.max(1, limitRaw))
    : 6
  try {
    const res = await listCatalogProducts({
      q,
      limit,
      offset: 0,
      region_code: searchParams.get("region_code") || "NL",
      signal: req.signal,
    })
    const origin = await getPageBackendOrigin()
    const products = res.products
      .filter((p) => p.offer_count > 0 && (p.from_price ?? 0) > 0)
      .slice(0, limit)
      .map((item) => ({
        id: item.id,
        title: item.title,
        brand: item.brand_name ?? "",
        imageUrl: resolveMediaUrl(item.image_url ?? null, origin),
      }))
    return Response.json({ products })
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return new Response(null, { status: 499 })
    }
    if (err instanceof CatalogApiError) {
      return Response.json({ products: [] }, { status: 200 })
    }
    throw err
  }
}
