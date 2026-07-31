import AiSupportModuleService from "./service"
import { Module } from "@medusajs/framework/utils"

export const AI_SUPPORT_MODULE = "aiSupport"

export default Module(AI_SUPPORT_MODULE, {
  service: AiSupportModuleService,
})
