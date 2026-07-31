import { MedusaService } from "@medusajs/framework/utils"
import Commission from "./models/commission"
import Invoice from "./models/invoice"
import Payout from "./models/payout"

/** Finance-module — G.6–G.8 (S3-08-01). */
class FinanceModuleService extends MedusaService({
  Commission,
  Invoice,
  Payout,
}) {}

export default FinanceModuleService
