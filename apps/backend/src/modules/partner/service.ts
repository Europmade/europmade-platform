import { MedusaService } from "@medusajs/framework/utils"
import Company from "./models/company"
import Seller from "./models/seller"
import Brand from "./models/brand"
import BrandMarketContent from "./models/brand-market-content"
import Manufacturer from "./models/manufacturer"
import ProductionFacility from "./models/production-facility"
import BrandOwnershipClaim from "./models/brand-ownership-claim"

/**
 * Partner-module — Blueprint `11-medusa-architecture.md` §3:
 * "company, seller, brand, distributor_authorization, manufacturer
 * (Deel A.2-A.6)". `distributor_authorization` (A.5) is in dit ticket
 * bewust nog niet opgenomen — zie het implementatierapport van S3-02-01
 * voor de reden (harde, nog niet bestaande FK naar `document`, Deel B.15).
 */
class PartnerModuleService extends MedusaService({
  Company,
  Seller,
  Brand,
  BrandMarketContent,
  Manufacturer,
  ProductionFacility,
  BrandOwnershipClaim,
}) {}

export default PartnerModuleService
