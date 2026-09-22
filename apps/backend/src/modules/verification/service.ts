import { MedusaService } from "@medusajs/framework/utils"
import EuropeanOwnershipClaim from "./models/european-ownership-claim"
import EuropeanOwnershipStatusEvent from "./models/european-ownership-status-event"
import ProductOrigin from "./models/product-origin"
import ProductOriginEvidence from "./models/product-origin-evidence"
import ProductOriginStatusEvent from "./models/product-origin-status-event"

/** Verification-module — Blueprint `11-medusa-architecture.md` §3 (B.14) + P2.1 evidence + ADR-0044. */
class VerificationModuleService extends MedusaService({
  ProductOrigin,
  ProductOriginEvidence,
  ProductOriginStatusEvent,
  EuropeanOwnershipClaim,
  EuropeanOwnershipStatusEvent,
}) {}

export default VerificationModuleService
