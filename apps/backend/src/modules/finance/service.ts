import { MedusaService } from "@medusajs/framework/utils"
import Commission from "./models/commission"

/** Finance-module — start met G.6 commission (S3-07-03 / EPIC-08). */
class FinanceModuleService extends MedusaService({
  Commission,
}) {}

export default FinanceModuleService
