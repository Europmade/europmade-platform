import { MedusaService } from "@medusajs/framework/utils"
import ProductOrigin from "./models/product-origin"
import ProductOriginEvidence from "./models/product-origin-evidence"
import ProductOriginStatusEvent from "./models/product-origin-status-event"

/** Verification-module — Blueprint `11-medusa-architecture.md` §3 (B.14) + P2.1 evidence. */
class VerificationModuleService extends MedusaService({
  ProductOrigin,
  ProductOriginEvidence,
  ProductOriginStatusEvent,
}) {}

export default VerificationModuleService
