import { MedusaService } from "@medusajs/framework/utils"
import ProductOrigin from "./models/product-origin"

/** Verification-module — Blueprint `11-medusa-architecture.md` §3 (B.14). */
class VerificationModuleService extends MedusaService({
  ProductOrigin,
}) {}

export default VerificationModuleService
