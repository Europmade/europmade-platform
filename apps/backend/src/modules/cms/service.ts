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
}) {}

export default CmsModuleService
