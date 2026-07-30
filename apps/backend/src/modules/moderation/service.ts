import { MedusaService } from "@medusajs/framework/utils"
import ModerationCase from "./models/moderation-case"

/** Moderation-module — Blueprint `11-medusa-architecture.md` §3 (B.13). */
class ModerationModuleService extends MedusaService({
  ModerationCase,
}) {}

export default ModerationModuleService
