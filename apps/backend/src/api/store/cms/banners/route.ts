import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { normalizeMarketCode } from "@europmade/types"
import { requestBackendOrigin } from "../../../request-backend-origin"
import { CMS_MODULE } from "../../../../modules/cms"
import type CmsModuleService from "../../../../modules/cms/service"
import { bannerIsLive, serializeBanner } from "../../../cms/serialize"

/**
 * GET /store/cms/banners?market=BE&location=homepage
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const cms = req.scope.resolve(CMS_MODULE) as CmsModuleService
  const marketRaw =
    typeof req.query?.market === "string" ? req.query.market : ""
  const visitorMarket = normalizeMarketCode(marketRaw)
  const location =
    typeof req.query?.location === "string" ? req.query.location.trim() : ""

  const filters: Record<string, unknown> = { published: true }
  if (location) filters.location = location

  const banners = await cms.listCmsBanners(filters, {
    order: { sort_order: "ASC" },
    take: 100,
  })

  res.status(200).json({
    market: visitorMarket,
    banners: banners
      .filter((b) =>
        bannerIsLive(
          b as unknown as {
            published: boolean
            visible: boolean
            publish_at?: Date | string | null
            expires_at?: Date | string | null
            market_scope: string
            markets: unknown
          },
          visitorMarket
        )
      )
      .map((b) =>
        serializeBanner(
          b as unknown as Record<string, unknown>,
          requestBackendOrigin(req)
        )
      ),
  })
}
