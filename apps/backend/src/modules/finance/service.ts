import { MedusaService } from "@medusajs/framework/utils"
import Commission from "./models/commission"
import Invoice from "./models/invoice"
import Payout from "./models/payout"
import SellerInvoice from "./models/seller-invoice"
import SellerInvoiceLine from "./models/seller-invoice-line"
import SellerSettlement from "./models/seller-settlement"

/** Finance-module — G.6–G.8 (S3-08-01), P2.17 seller invoicing, G3 settlement. */
class FinanceModuleService extends MedusaService({
  Commission,
  Invoice,
  Payout,
  SellerInvoice,
  SellerInvoiceLine,
  SellerSettlement,
}) {}

export default FinanceModuleService
