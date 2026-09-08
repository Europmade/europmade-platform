import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { EU_MARKET_CODES, normalizeMarketCode } from "@europmade/types"
import { requestBackendOrigin } from "../../../request-backend-origin"
import { CMS_MODULE } from "../../../../modules/cms"
import type CmsModuleService from "../../../../modules/cms/service"
import {
  bannerIsLive,
  serializeBanner,
  serializeHomepage,
} from "../../../cms/serialize"

/**
 * GET /store/cms/homepage?market=NL
 * Alleen gepubliceerde homepage + live banners voor visitorMarket.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const cms = req.scope.resolve(CMS_MODULE) as CmsModuleService
  const marketRaw =
    typeof req.query?.market === "string" ? req.query.market : ""
  const visitorMarket = normalizeMarketCode(marketRaw)

  const homes = await cms.listCmsHomepages(
    { document_key: "default", published: true },
    { take: 1 }
  )
  const home = homes[0] ?? null

  const banners = await cms.listCmsBanners(
    { published: true },
    { order: { sort_order: "ASC" }, take: 100 }
  )
  const liveBanners = banners
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
    )

  res.status(200).json({
    market: visitorMarket,
    markets: EU_MARKET_CODES,
    homepage: home
      ? serializeHomepage(
          home as unknown as Record<string, unknown>,
          requestBackendOrigin(req)
        )
      : null,
    banners: liveBanners,
  })
}
