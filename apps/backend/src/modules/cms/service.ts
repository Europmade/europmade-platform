import { MedusaService } from "@medusajs/framework/utils"
import {
  CmsHomepage,
  CmsBanner,
  CmsPage,
  CmsAsset,
  CmsCategory,
  CmsProduct,
  AdCampaign,
  AdCampaignWeek,
  AdPricing,
  CommercialNavRank,
  CommercialNavVisit,
  CommercialNavIcon,
} from "./models"

class CmsModuleService extends MedusaService({
  CmsHomepage,
  CmsBanner,
  CmsPage,
  CmsAsset,
  CmsCategory,
  CmsProduct,
  AdCampaign,
  AdCampaignWeek,
  AdPricing,
  CommercialNavRank,
  CommercialNavVisit,
  CommercialNavIcon,
}) {}

export default CmsModuleService
